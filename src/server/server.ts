import { Elysia, t } from 'elysia';
import { Config } from '@/config/config.ts';
import { type Logger } from 'pino';
import type { IEventService } from '@/services/event.service.ts';
import * as path from 'node:path';
import type { IDocumentService } from '@/services/document.service.ts';
import { findUserByToken } from '@/utils/users.utils.ts';
import { type IUser, USER_ROLES } from '@/types.ts';

export interface IServer {
  /**
   * Starts the server on the host and port specified in the configuration.
   */
  start(): void;
}

export interface IServerConstructor {
  new(config: Config, logger: Logger): IServer;
}

export interface IServerParams {
  config: Config
  eventService: IEventService
  documentService: IDocumentService
  logger: Logger
}

/**
 * The Server class manages the Elysia instance.
 * It's responsible for defining routes, setting up WebSockets,
 * and starting the HTTP server.
 */
export class Server {
  private readonly _app: Elysia;
  private readonly _config: Config;
  private readonly _logger: Logger;
  private readonly _eventService: IEventService;
  private readonly _documentService: IDocumentService;
  
  constructor(params: IServerParams) {
    this._config = params.config;
    this._logger = params.logger.child({context: 'Server'});
    this._eventService = params.eventService;
    this._documentService = params.documentService;
    this._app = new Elysia();
    
    this.setupRoutes();
  }
  
  /**
   * Sets up the routes for the REST API and WebSocket.
   */
  private setupRoutes(): void {
    const indexPath = path.join(import.meta.dir, '../../public/index.html');
    const docsPath = path.join(import.meta.dir, '../../public/docs.html');
    
    this._app.get('/', () => {
      this._logger.info({ path: indexPath }, 'Serving index.html');
      return Bun.file(indexPath);
    });
    
    this._app.get('/docs', () => {
      this._logger.info({ path: docsPath }, 'Serving docs.html');
      return Bun.file(docsPath);
    });
    
    
    // Requirement: REST endpoint to post events: POST /events (with tenant header)
    // Requirement: Simple Auth: Use tenant ID in header/query param [cite: 25]
    this._app.post('/events', ({body, headers}) => {
      const tenantId = headers['x-tenant-id'];
      if (!tenantId) {
        this._logger.warn('Request to /events missing x-tenant-id header');
        return new Response('x-tenant-id header is required', {status: 400});
      }
      
      const newEvent = this._eventService.createAndStoreEvent(tenantId, body.message);
      
      // Requirement: WebSocket broadcasts events only to same-tenant connections
      // We use the tenantId as the topic to publish to.
      this._app.server?.publish(tenantId, JSON.stringify(newEvent));
      
      this._logger.info({eventId: newEvent.id, tenantId}, 'Event broadcasted to WebSocket topic');
      
      return newEvent;
    }, {
      // Add basic validation for the incoming body
      body: t.Object({
        message: t.String({minLength: 1})
      })
    });
    
    const authMiddleware = new Elysia({ name: 'auth' })
      .derive(({ headers, set }) => {
        const authHeader = headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          set.status = 401;
          return { user: null };
        }
        const token = authHeader.substring(7);
        const user = findUserByToken(token);
        
        if (!user) {
          set.status = 401;
          return { user: null };
        }
        
        return { user };
      })
      .onBeforeHandle(({ user, set }) => {
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
      });
    
    const usersGroup = new Elysia({ prefix: '/users'})
      .derive(({ headers }) => {
        const authHeader = headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { user: null };
        }
        const token = authHeader.substring(7);
        const user = findUserByToken(token);
        return { user: user as IUser | null };
      })
      .onBeforeHandle(({ user, set }) => {
        if (!user) {
          set.status = 401;
          return "Unauthorized";
        }
      })
      .get('/me', ({ user }) => {
        return user;
      });
    
    this._app.use(usersGroup);
    
    const documentsGroup = new Elysia({ prefix: '/documents' })
      .derive(({ headers }) => {
        const authHeader = headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { user: null };
        }
        const token = authHeader.substring(7);
        const user = findUserByToken(token);
        
        return { user: user as IUser | null };
      })
      .onBeforeHandle(({ user, set }) => {
        if (!user) {
          set.status = 401;
          return "Unauthorized";
        }
      })
      // POST /documents - Upload file
      .post('/', async ({ body, user, set }) => {
        const { file, access_level } = body;
        
        if (!file || !(file instanceof File)) {
          set.status = 400;
          return { error: 'File upload is missing or invalid.' };
        }
        
        try {
          return await this._documentService.uploadDocument(file, user!, access_level);
        } catch (e: any) {
          this._logger.error(e, 'File upload failed');
          set.status = 500;
          return { error: 'Could not process file upload.' };
        }
        
      }, {
        body: t.Object({
          file: t.File(),
          access_level: t.Enum({
            tenant: 'tenant',
            private: 'private'
          }, { default: 'private' })
        })
      })
      // GET /documents - List user's accessible documents
      .get('/', ({ user }) => {
        return this._documentService.getAccessibleDocumentsForUser(user!);
      })
      // GET /documents/:id - Download specific document
      .get('/:id', ({ params, user, set }) => {
        const result = this._documentService.findDocumentForUser(params.id, user!);
        if (!result) {
          set.status = 404;
          return { error: 'Document not found or access denied.'};
        }
        return Bun.file(result.filePath);
      })
      // DELETE /documents/:id - Delete document (admin only)
      .delete('/:id', async ({ params, user, set }) => {
        if (user!.role !== USER_ROLES.ADMIN) {
          set.status = 403;
          return { error: 'Forbidden: Only admins can delete documents.' };
        }
        const success = await this._documentService.deleteDocumentById(params.id, user!);
        if (!success) {
          set.status = 404;
          return { error: 'Document not found or deletion failed.' };
        }
        set.status = 204;
      });
    
    this._app.use(documentsGroup);
    
    // Requirement: WebSocket server that handles connections with tenant authentication
    this._app.ws('/ws', {
      // Use query parameter for tenant authentication as allowed [cite: 25]
      query: t.Object({
        tenantId: t.String({minLength: 1})
      }),
      open: (ws) => {
        const tenantId = ws.data.query.tenantId;
        this._logger.info({wsId: ws.id, tenantId}, 'WebSocket connection opened, subscribing to tenant topic');
        // Subscribe the client to a topic named after their tenantId.
        // This is the core of the tenant isolation logic.
        ws.subscribe(tenantId);
      },
      close: (ws) => {
        const tenantId = ws.data.query.tenantId;
        this._logger.info({wsId: ws.id, tenantId}, 'WebSocket connection closed');
        // Elysia handles unsubscription automatically on close.
      },
    });
    
    this._logger.info('🚀 Routes configured with business logic');
  }
  
  /**
   * Starts the server on the host and port specified in the configuration.
   */
  public start(): void {
    this._app.listen({
      port: this._config.port,
      hostname: this._config.hostname,
    }, (server) => {
      this._logger.info(
        `🔥 Server is running and listening on http://${ server.hostname }:${ server.port }`
      );
    });
  }
}
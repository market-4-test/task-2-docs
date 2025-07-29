import { Elysia, t } from 'elysia';
import { Config } from '@/config/config.ts';
import { type Logger } from 'pino';
import type { IEventService } from "@/services/event.service.ts";
import * as path from "node:path";

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
  
  constructor(params: IServerParams) {
    this._config = params.config;
    this._logger = params.logger.child({context: 'Server'});
    this._eventService = params.eventService;
    this._app = new Elysia();
    
    this.setupRoutes();
  }
  
  /**
   * Sets up the routes for the REST API and WebSocket.
   */
  private setupRoutes(): void {
    const indexPath = path.join(import.meta.dir, '../../public/index.html');
    
    this._app.get('/', () => {
      this._logger.info({ path: indexPath }, 'Serving index.html');
      return Bun.file(indexPath);
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
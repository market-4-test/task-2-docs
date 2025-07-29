import { type Logger } from 'pino';
import { type IDocument, type IUser, USER_ROLES } from '@/types.ts';
import * as path from 'node:path';
import fs from 'node:fs/promises';

export interface IDocumentService {
  uploadDocument(file: File, user: IUser, accessLevel: 'tenant' | 'private'): Promise<IDocument>;
  getAccessibleDocumentsForUser(user: IUser): IDocument[];
  findDocumentForUser(id: string, user: IUser): { doc: IDocument, filePath: string } | null;
  deleteDocumentById(id: string, user: IUser): Promise<boolean>;
}

/**
 * Service to handle business logic for documents.
 * Manages in-memory metadata and filesystem storage.
 */
export class DocumentService implements IDocumentService {
  private readonly storage: Map<string, IDocument> = new Map();
  private readonly logger: Logger;
  private readonly uploadsDir = path.join(import.meta.dir, '../../uploads');
  
  constructor(logger: Logger) {
    this.logger = logger.child({ context: 'DocumentService' });
    this.initUploadsDir();
    this.logger.info('DocumentService initialized');
  }
  
  private async initUploadsDir() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      this.logger.info(`Uploads directory ensured at: ${this.uploadsDir}`);
    } catch (error) {
      this.logger.error(error, 'Failed to create uploads directory');
    }
  }
  
  private getTenantPath(tenantId: string): string {
    return path.join(this.uploadsDir, tenantId);
  }
  
  public async uploadDocument(file: File, user: IUser, accessLevel: 'tenant' | 'private'): Promise<IDocument> {
    const tenantPath = this.getTenantPath(user.tenant_id);
    await fs.mkdir(tenantPath, { recursive: true });
    
    // ИЗМЕНЕНИЕ: Создаем новую запись документа с уникальным ID
    const docId = crypto.randomUUID();
    const fileExtension = path.extname(file.name);
    const storageFilename = `${docId}${fileExtension}`;
    const filePath = path.join(tenantPath, storageFilename);
    
    // Безопасность: Проверка уже не так критична из-за UUID, но оставляем как доп. уровень
    if (path.dirname(filePath) !== tenantPath) {
      throw new Error('Invalid filename causing path traversal.');
    }
    
    await Bun.write(filePath, file);
    
    const newDocument: IDocument = {
      id: docId,
      tenant_id: user.tenant_id,
      filename: file.name, // Сохраняем оригинальное имя
      storage_filename: storageFilename, // Сохраняем имя для хранилища
      uploaded_by: user.id,
      upload_date: new Date().toISOString(),
      access_level: accessLevel,
    };
    
    this.storage.set(newDocument.id, newDocument);
    this.logger.info({ docId: newDocument.id, tenantId: user.tenant_id, user: user.id }, 'New document uploaded and metadata stored');
    return newDocument;
  }
  
  public getAccessibleDocumentsForUser(user: IUser): IDocument[] {
    const allDocs = Array.from(this.storage.values());
    
    return allDocs.filter(doc => {
      if (doc.tenant_id !== user.tenant_id) {
        return false;
      }
      if (user.role === USER_ROLES.ADMIN) {
        return true;
      }
      if (doc.access_level === 'tenant') {
        return true;
      }
      if (doc.access_level === 'private' && doc.uploaded_by === user.id) {
        return true;
      }
      return false;
    });
  }
  
  public findDocumentForUser(id: string, user: IUser): { doc: IDocument, filePath: string } | null {
    const doc = this.storage.get(id);
    if (!doc) {
      return null;
    }
    
    const accessibleDocs = this.getAccessibleDocumentsForUser(user);
    if (!accessibleDocs.some(d => d.id === id)) {
      return null;
    }
    
    // ИЗМЕНЕНИЕ: Используем storage_filename для пути к файлу
    const filePath = path.join(this.getTenantPath(doc.tenant_id), doc.storage_filename);
    return { doc, filePath };
  }
  
  public async deleteDocumentById(id: string, user: IUser): Promise<boolean> {
    if (user.role !== USER_ROLES.ADMIN) {
      this.logger.warn({ userId: user.id, docId: id }, 'Non-admin user attempted to delete a document');
      return false;
    }
    
    const docData = this.findDocumentForUser(id, user);
    if (!docData) {
      return false;
    }
    
    try {
      await fs.unlink(docData.filePath);
      this.storage.delete(id);
      this.logger.info({ docId: id, tenantId: user.tenant_id }, 'Document deleted successfully by admin');
      return true;
    } catch (error) {
      this.logger.error({ error, docId: id }, 'Failed to delete document file');
      return false;
    }
  }
}
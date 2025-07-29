import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from 'bun:test';
import { DocumentService } from './document.service';
import { USERS } from '@/constants/users.constants.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from 'pino';

mock.module('node:fs/promises', () => ({
  default: {
    mkdir: mock(() => Promise.resolve()),
    unlink: mock(() => Promise.resolve()),
  },
}));

const mockLogger = {
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
  child: mock(() => mockLogger),
} as unknown as Logger;

describe('DocumentService', () => {
  let documentService: DocumentService;
  const adminUser = USERS['token_admin_a'];
  const regularUser = USERS['token_user_a'];
  const otherTenantAdmin = USERS['token_admin_b'];
  const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
  
  let bunWriteSpy: any;
  beforeEach(() => {
    documentService = new DocumentService(mockLogger);
    // Заменяем Bun.write на пустую мок-функцию
    bunWriteSpy = spyOn(Bun, 'write').mockImplementation(() => Promise.resolve(0));
  });
  
  afterEach(() => {
    bunWriteSpy.mockRestore();
  });
  
  
  it('should upload a document successfully', async () => {
    const newDoc = await documentService.uploadDocument(testFile, adminUser, 'private');
    
    expect(newDoc).toBeDefined();
    expect(newDoc.filename).toBe('test.txt');
    expect(newDoc.tenant_id).toBe(adminUser.tenant_id);
    expect(newDoc.uploaded_by).toBe(adminUser.id);
    expect(newDoc.access_level).toBe('private');
    expect(newDoc.storage_filename).toContain(newDoc.id);
    
    const fsMock = fs as any;
    
    const tenantPath = path.join(import.meta.dir, '../../uploads', adminUser.tenant_id);
    const expectedFilePath = path.join(tenantPath, newDoc.storage_filename);
    
    expect(fsMock.mkdir).toHaveBeenCalledWith(tenantPath, { recursive: true });
    // Теперь проверка будет работать, так как мы шпионим за Bun.write
    expect(Bun.write).toHaveBeenCalledWith(expectedFilePath, testFile);
  });
  
  describe('Document Access Control', () => {
    let docPrivate: Awaited<ReturnType<DocumentService['uploadDocument']>>;
    let docTenant: Awaited<ReturnType<DocumentService['uploadDocument']>>;
    
    beforeEach(async () => {
      docPrivate = await documentService.uploadDocument(testFile, regularUser, 'private');
      docTenant = await documentService.uploadDocument(testFile, regularUser, 'tenant');
    });
    
    it('user should see their own private and tenant documents', () => {
      const docs = documentService.getAccessibleDocumentsForUser(regularUser);
      expect(docs).toHaveLength(2);
      expect(docs.map(d => d.id)).toContain(docPrivate.id);
      expect(docs.map(d => d.id)).toContain(docTenant.id);
    });
    
    it('admin should see all documents in their tenant', () => {
      const docs = documentService.getAccessibleDocumentsForUser(adminUser);
      expect(docs).toHaveLength(2);
    });
    
    it('user from another tenant should not see any documents', () => {
      const docs = documentService.getAccessibleDocumentsForUser(otherTenantAdmin);
      expect(docs).toHaveLength(0);
    });
    
    it('should not allow non-admin to delete a document', async () => {
      const result = await documentService.deleteDocumentById(docTenant.id, regularUser);
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
    
    it('should allow admin to delete a document', async () => {
      const fsMock = fs as any;
      const result = await documentService.deleteDocumentById(docTenant.id, adminUser);
      expect(result).toBe(true);
      expect(fsMock.unlink).toHaveBeenCalled();
    });
  });
});
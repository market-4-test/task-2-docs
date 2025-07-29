// src/server/server.test.ts

import { describe, it, expect, mock } from 'bun:test';
import { Elysia } from 'elysia';
import { Server } from './server';
import { Config } from '@/config/config';
import pino from 'pino';

// Мокаем сервисы, чтобы контролировать их поведение в тестах
const mockEventService = {
  createAndStoreEvent: mock((tenantId, message) => ({
    id: 'mock-event-id',
    tenant_id: tenantId,
    message,
    timestamp: new Date().toISOString(),
  })),
};

const mockDocumentService = {
};


// Создаем "тестовый" сервер
const testApp = new Elysia()
  .use(new Server({
    config: new Config(),
    logger: pino({ level: 'silent' }),
    eventService: mockEventService as any,
    documentService: mockDocumentService as any,
  })._app);


describe('Server API', () => {
  describe('Document Endpoints Auth', () => {
    it('should return 401 for /documents without token', async () => {
      const req = new Request('http://localhost/documents');
      const res = await testApp.handle(req);
      expect(res.status).toBe(401);
    });
    
    it('should return 401 for /documents with invalid token', async () => {
      const req = new Request('http://localhost/documents', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      const res = await testApp.handle(req);
      expect(res.status).toBe(401);
    });
    
    it('should return 200 for /users/me with a valid token', async () => {
      const req = new Request('http://localhost/users/me', {
        headers: { 'Authorization': 'Bearer token_admin_a' }
      });
      const res = await testApp.handle(req);
      expect(res.status).toBe(200);
      const user = await res.json();
      expect(user.id).toBe('admin_a');
    });
  });
});
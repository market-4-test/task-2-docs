import { type Logger } from 'pino';
import { type IEvent } from '@/types';

export interface IEventService {
  /**
   * Creates a new event and stores it in the in-memory storage.
   * @param {string} tenantId - The ID of the tenant.
   * @param {string} message - The event message.
   * @returns {IEvent} The created event object.
   */
  createAndStoreEvent(tenantId: string, message: string): IEvent;
}

/**
 * Service to handle the business logic for events.
 * It manages an in-memory storage for events, scoped by tenant.
 */
export class EventService implements IEventService {
  // Requirement: Simple in-memory event storage per tenant
  private readonly storage: Map<string, IEvent[]> = new Map();
  private readonly logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger.child({ context: 'EventService' });
    this.logger.info('EventService initialized');
  }
  
  /**
   * Creates a new event and stores it in the in-memory storage.
   * @param {string} tenantId - The ID of the tenant.
   * @param {string} message - The event message.
   * @returns {Event} The created event object.
   */
  public createAndStoreEvent(tenantId: string, message: string): IEvent {
    const newEvent: IEvent = {
      // Requirement: Event data model [cite: 16-21]
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      message: message,
      timestamp: new Date().toISOString(),
    };
    
    if (!this.storage.has(tenantId)) {
      this.storage.set(tenantId, []);
    }
    
    this.storage.get(tenantId)?.push(newEvent);
    
    this.logger.info({ eventId: newEvent.id, tenantId }, 'New event created and stored');
    return newEvent;
  }
}
// As per the data model requirement [cite: 15]
export interface IEvent {
  id: string;
  tenant_id: string;
  message: string;
  timestamp: string;
}
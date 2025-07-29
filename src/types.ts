// As per the data model requirement [cite: 15]
export interface IEvent {
  id: string;
  tenant_id: string;
  message: string;
  timestamp: string;
}


export enum USER_ROLES {
  ADMIN = 'admin',
  USER = 'user',
}

// Based on pre-configured test data
export interface IUser {
  id: string;
  tenant_id: string;
  role: USER_ROLES;
  token: string;
}

// Based on data model for Task 2
export interface IDocument {
  id: string;
  tenant_id: string;
  filename: string;
  storage_filename: string
  uploaded_by: string;
  upload_date: string;
  access_level: 'tenant' | 'private';
}
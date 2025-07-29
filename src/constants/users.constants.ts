import { type IUser, USER_ROLES } from '@/types.ts';

export const USERS: Record<string, IUser> = {
  "token_admin_a": { id: "admin_a", tenant_id: "company_a", role: USER_ROLES.ADMIN, token: "token_admin_a" },
  "token_user_a": { id: "user_a", tenant_id: "company_a", role: USER_ROLES.USER, token: "token_user_a" },
  "token_admin_b": { id: "admin_b", tenant_id: "company_b", role: USER_ROLES.ADMIN, token: "token_admin_b" }
};
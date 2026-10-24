export type UserRole = 'customer' | 'technician' | 'admin';
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
}

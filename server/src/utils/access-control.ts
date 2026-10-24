import type { UserRole } from '../models/user.model.js';

export function canAccessTicket(
  role: UserRole,
  userId: string,
  ticket: { reporterId: string; assignedToId?: string | null; organizationId?: string | null },
  organizationId: string | null,
): boolean {
  if (role === 'customer') return ticket.reporterId === userId;
  if (role === 'technician') return ticket.assignedToId === userId;
  return !organizationId || ticket.organizationId === organizationId;
}

const transitions: Record<string, string[]> = {
  Assigned: ['Accepted'],
  Accepted: ['In Progress', 'Blocked'],
  'In Progress': ['Blocked', 'Resolved'],
  Blocked: ['In Progress', 'Resolved'],
};
export function canTechnicianTransition(from: string, to: string): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function isEligibleTechnician(
  technician: {
    role: string;
    active: boolean;
    available: boolean;
    organizationId?: string | null;
    department?: string | null;
  } | null,
  organizationId: string | null,
  reportDepartment?: string | null,
): boolean {
  return Boolean(
    technician &&
    technician.role === 'technician' &&
    technician.active &&
    technician.available &&
    technician.organizationId === organizationId &&
    (!reportDepartment || technician.department === reportDepartment),
  );
}

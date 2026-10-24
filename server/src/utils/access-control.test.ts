import { describe, expect, it } from 'vitest';
import {
  canAccessTicket,
  canTechnicianTransition,
  isEligibleTechnician,
} from './access-control.js';

describe('access control', () => {
  const ticket = { reporterId: 'customer-1', assignedToId: 'tech-1', organizationId: 'org-1' };
  it('enforces report ownership and organization isolation', () => {
    expect(canAccessTicket('customer', 'customer-1', ticket, null)).toBe(true);
    expect(canAccessTicket('customer', 'customer-2', ticket, null)).toBe(false);
    expect(canAccessTicket('technician', 'tech-2', ticket, null)).toBe(false);
    expect(canAccessTicket('admin', 'admin-1', ticket, 'org-1')).toBe(true);
    expect(canAccessTicket('admin', 'admin-1', ticket, 'org-2')).toBe(false);
  });
  it('allows only valid technician status transitions', () => {
    expect(canTechnicianTransition('Assigned', 'Accepted')).toBe(true);
    expect(canTechnicianTransition('Assigned', 'Resolved')).toBe(false);
    expect(canTechnicianTransition('Resolved', 'In Progress')).toBe(false);
  });
  it('rejects unauthorized technician assignments', () => {
    expect(
      isEligibleTechnician(
        {
          role: 'technician',
          active: true,
          available: true,
          organizationId: 'org-1',
          department: 'IT',
        },
        'org-1',
        'IT',
      ),
    ).toBe(true);
    expect(
      isEligibleTechnician(
        {
          role: 'technician',
          active: false,
          available: true,
          organizationId: 'org-1',
          department: 'IT',
        },
        'org-1',
        'IT',
      ),
    ).toBe(false);
    expect(
      isEligibleTechnician(
        {
          role: 'technician',
          active: true,
          available: true,
          organizationId: 'org-2',
          department: 'IT',
        },
        'org-1',
        'IT',
      ),
    ).toBe(false);
  });
});

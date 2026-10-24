import type { Response } from 'express';
import { Ticket } from '../models/ticket.model.js';
import { User } from '../models/user.model.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';

async function ticketSummary(filter: Record<string, unknown>) {
  const [total, newTickets, assigned, inProgress, resolved, highPriority] = await Promise.all([
    Ticket.countDocuments(filter),
    Ticket.countDocuments({ ...filter, status: 'New' }),
    Ticket.countDocuments({ ...filter, status: 'Assigned' }),
    Ticket.countDocuments({ ...filter, status: 'In Progress' }),
    Ticket.countDocuments({ ...filter, status: 'Resolved' }),
    Ticket.countDocuments({ ...filter, priority: { $in: ['High', 'Critical'] } }),
  ]);
  return { total, newTickets, assigned, inProgress, resolved, highPriority };
}

export async function customerDashboard(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  response.json({
    success: true,
    data: { summary: await ticketSummary({ reporter: request.user!.id }) },
  });
}

export async function technicianDashboard(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  response.json({
    success: true,
    data: { summary: await ticketSummary({ assignedTo: request.user!.id }) },
  });
}

export async function adminDashboard(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  const scope = request.user!.organizationId
    ? { organizationId: request.user!.organizationId }
    : {};
  const [summary, usersByRole] = await Promise.all([
    ticketSummary(scope),
    User.aggregate([{ $match: scope }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
  ]);
  const users = Object.fromEntries(usersByRole.map((entry) => [entry._id, entry.count]));
  response.json({ success: true, data: { summary, users } });
}

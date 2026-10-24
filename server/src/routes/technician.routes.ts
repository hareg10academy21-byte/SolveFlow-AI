import { Router } from 'express';
import { z } from 'zod';
import { Ticket } from '../models/ticket.model.js';
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import { canTechnicianTransition } from '../utils/access-control.js';
import { assistTechnician } from '../services/ai.service.js';

const router = Router();
const updateSchema = z
  .object({
    status: z.enum(['Accepted', 'In Progress', 'Blocked', 'Resolved']),
    note: z.string().trim().min(3).max(1200),
    resolutionNotes: z.string().trim().min(5).max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'Resolved' && !value.resolutionNotes)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resolutionNotes'],
        message: 'Resolution details are required.',
      });
  });
const ticketNumberSchema = z.string().regex(/^SF-\d{4}-\d{4,}$/);
router.use(requireAuth, requireRole('technician'));
router.get('/assignments', async (request: AuthenticatedRequest, response) => {
  const tickets = await Ticket.find({ assignedTo: request.user!.id })
    .sort({ updatedAt: -1 })
    .populate('reporter', 'name')
    .lean();
  response.json({ success: true, data: tickets });
});
router.get('/history', async (request: AuthenticatedRequest, response) => {
  const tickets = await Ticket.find({
    assignedTo: request.user!.id,
    status: { $in: ['Resolved', 'Closed'] },
  })
    .sort({ updatedAt: -1 })
    .lean();
  response.json({ success: true, data: tickets });
});
router.get('/assignments/:ticketNumber', async (request: AuthenticatedRequest, response) => {
  if (!ticketNumberSchema.safeParse(request.params.ticketNumber).success) {
    response.status(400).json({ success: false, message: 'Invalid report identifier.' });
    return;
  }
  const ticket = await Ticket.findOne({
    ticketNumber: request.params.ticketNumber,
    assignedTo: request.user!.id,
  })
    .populate('reporter', 'name')
    .lean();
  if (!ticket) {
    response.status(404).json({ success: false, message: 'Assigned report not found.' });
    return;
  }
  response.json({ success: true, data: ticket });
});
router.patch('/assignments/:ticketNumber', async (request: AuthenticatedRequest, response) => {
  if (!ticketNumberSchema.safeParse(request.params.ticketNumber).success) {
    response.status(400).json({ success: false, message: 'Invalid report identifier.' });
    return;
  }
  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      success: false,
      message: 'Please review the update.',
      errors: parsed.error.flatten(),
    });
    return;
  }
  const ticket = await Ticket.findOne({
    ticketNumber: request.params.ticketNumber,
    assignedTo: request.user!.id,
  });
  if (!ticket) {
    response.status(404).json({ success: false, message: 'Assigned report not found.' });
    return;
  }
  if (!canTechnicianTransition(ticket.status, parsed.data.status)) {
    response.status(409).json({
      success: false,
      message: `A report in ${ticket.status} cannot move to ${parsed.data.status}.`,
    });
    return;
  }
  ticket.status = parsed.data.status;
  if (parsed.data.resolutionNotes) ticket.resolutionNotes = parsed.data.resolutionNotes;
  ticket.activity.push({
    kind: parsed.data.status === 'Resolved' ? 'status' : 'progress',
    message: parsed.data.note,
    author: request.user!.id,
    status: parsed.data.status,
    visibleToCustomer: true,
  });
  await ticket.save();
  response.json({ success: true, data: ticket });
});
router.post(
  '/assignments/:ticketNumber/assistant',
  async (request: AuthenticatedRequest, response) => {
    if (!ticketNumberSchema.safeParse(request.params.ticketNumber).success) {
      response.status(400).json({ success: false, message: 'Invalid report identifier.' });
      return;
    }
    const ticket = await Ticket.findOne({
      ticketNumber: request.params.ticketNumber,
      assignedTo: request.user!.id,
    }).lean();
    if (!ticket) {
      response.status(404).json({ success: false, message: 'Assigned report not found.' });
      return;
    }
    const assistance = await assistTechnician({
      title: ticket.title,
      description: ticket.description,
      location: ticket.location,
      department: ticket.department ?? undefined,
      reportedRisk: ticket.reportedRisk,
    });
    if (!assistance) {
      response
        .status(503)
        .json({ success: false, message: 'AI assistance is currently unavailable.' });
      return;
    }
    response.json({ success: true, data: assistance });
  },
);
export default router;

import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Ticket } from '../models/ticket.model.js';
import { User } from '../models/user.model.js';
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import { isEligibleTechnician } from '../utils/access-control.js';
import { analyzeReport } from '../services/ai.service.js';

const router = Router();
const reviewSchema = z
  .object({
    category: z
      .enum(['Plumbing', 'Electrical', 'Facilities', 'Internet', 'Safety', 'Other'])
      .optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    status: z.enum(['New', 'Closed']).optional(),
    resolutionNotes: z.string().trim().min(5).max(2000).nullable().optional(),
    note: z.string().trim().min(3).max(1200).optional(),
    visibleToCustomer: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
const assignmentSchema = z.object({
  technicianId: z.string().trim().min(1),
  note: z.string().trim().max(600).optional(),
});
const ticketNumberSchema = z.string().regex(/^SF-\d{4}-\d{4,}$/);
router.use(requireAuth, requireRole('admin'));
router.get('/reports', async (request: AuthenticatedRequest, response) => {
  const query = String(request.query.q ?? '').trim();
  const status = String(request.query.status ?? '').trim();
  const priority = String(request.query.priority ?? '').trim();
  const department = String(request.query.department ?? '').trim();
  const sort = String(request.query.sort ?? 'updatedAt');
  const filter: Record<string, unknown> = {};
  if (request.user!.organizationId) filter.organizationId = request.user!.organizationId;
  if (query)
    filter.$or = [
      { title: { $regex: query, $options: 'i' } },
      { location: { $regex: query, $options: 'i' } },
      { ticketNumber: { $regex: query, $options: 'i' } },
    ];
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (department) filter.department = department;
  const reports = await Ticket.find(filter)
    .sort({ [sort === 'createdAt' ? 'createdAt' : 'updatedAt']: -1 })
    .populate('reporter', 'name email')
    .populate('assignedTo', 'name department skills available active')
    .lean();
  response.json({ success: true, data: reports });
});
router.get('/technicians', async (request: AuthenticatedRequest, response) => {
  const department = String(request.query.department ?? '').trim();
  const skills = String(request.query.skills ?? '')
    .split(',')
    .filter(Boolean);
  const filter: Record<string, unknown> = {
    role: 'technician',
    active: true,
    available: true,
    organizationId: request.user!.organizationId ?? null,
  };
  if (department) filter.department = department;
  if (skills.length) filter.skills = { $in: skills };
  const technicians = await User.find(filter)
    .select('name email department skills available active')
    .lean();
  response.json({
    success: true,
    data: technicians,
    message: technicians.length
      ? undefined
      : 'No eligible available technician records were found. Update technician department, skills, or availability before assigning work.',
  });
});
router.get(
  '/reports/:ticketNumber/ai-suggestions',
  async (request: AuthenticatedRequest, response) => {
    if (!ticketNumberSchema.safeParse(request.params.ticketNumber).success) {
      response.status(400).json({ success: false, message: 'Invalid report identifier.' });
      return;
    }
    const ticket = await Ticket.findOne({
      ticketNumber: request.params.ticketNumber,
      organizationId: request.user!.organizationId ?? null,
    })
      .select('aiAnalysis reportedRisk priority')
      .lean();
    if (!ticket) {
      response.status(404).json({ success: false, message: 'Report not found.' });
      return;
    }
    const analysis = ticket.aiAnalysis ?? { suggestedTechnicianIds: [] };
    const candidates = await User.find({
      _id: { $in: analysis.suggestedTechnicianIds ?? [] },
      role: 'technician',
      active: true,
      available: true,
      organizationId: request.user!.organizationId ?? null,
    })
      .select('name department skills available')
      .lean();
    response.json({
      success: true,
      data: { analysis, candidates, reportedRisk: ticket.reportedRisk, priority: ticket.priority },
    });
  },
);
router.post('/reports/:ticketNumber/reanalyze', async (request: AuthenticatedRequest, response) => {
  if (!ticketNumberSchema.safeParse(request.params.ticketNumber).success) {
    response.status(400).json({ success: false, message: 'Invalid report identifier.' });
    return;
  }
  const organizationId = request.user!.organizationId ?? null;
  const ticket = await Ticket.findOne({
    ticketNumber: request.params.ticketNumber,
    organizationId,
  });
  if (!ticket) {
    response.status(404).json({ success: false, message: 'Report not found.' });
    return;
  }
  const technicians = await User.find({
    role: 'technician',
    organizationId,
    active: true,
    available: true,
    ...(ticket.department ? { department: ticket.department } : {}),
  })
    .select('department skills available')
    .lean();
  const analysis = await analyzeReport(
    {
      title: ticket.title,
      description: ticket.description,
      location: ticket.location,
      department: ticket.department ?? undefined,
      reportedRisk: ticket.reportedRisk,
    },
    {
      possibleDuplicates: [],
      technicians: technicians.map((item) => ({
        id: item._id.toString(),
        department: item.department,
        skills: item.skills,
        available: item.available,
      })),
    },
  );
  if (analysis.status !== 'Completed') {
    response.status(503).json({
      success: false,
      message:
        'OpenAI analysis is unavailable. Confirm OPENAI_API_KEY and model access, then try again.',
    });
    return;
  }
  ticket.aiAnalysis = {
    ...analysis,
    analyzedAt: new Date(),
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
  };
  ticket.category = analysis.suggestedCategory;
  ticket.priority = analysis.suggestedPriority;
  await ticket.save();
  response.json({ success: true, data: ticket.aiAnalysis });
});
router.patch('/reports/:ticketNumber/review', async (request: AuthenticatedRequest, response) => {
  if (!ticketNumberSchema.safeParse(request.params.ticketNumber).success) {
    response.status(400).json({ success: false, message: 'Invalid report identifier.' });
    return;
  }
  const parsed = reviewSchema.safeParse(request.body);
  if (!parsed.success) {
    response
      .status(400)
      .json({ success: false, message: 'Invalid manager review.', errors: parsed.error.flatten() });
    return;
  }
  const { note, visibleToCustomer, ...changes } = parsed.data;
  const ticket = await Ticket.findOneAndUpdate(
    {
      ticketNumber: request.params.ticketNumber,
      organizationId: request.user!.organizationId ?? null,
    },
    {
      $set: changes,
      $push: {
        activity: {
          kind: 'comment',
          message: note ?? 'Manager reviewed this report.',
          author: request.user!.id,
          visibleToCustomer: Boolean(visibleToCustomer),
        },
      },
    },
    { new: true },
  );
  if (!ticket) {
    response.status(404).json({ success: false, message: 'Report not found.' });
    return;
  }
  response.json({ success: true, data: ticket });
});
router.post(
  '/reports/:ticketNumber/assignments',
  async (request: AuthenticatedRequest, response) => {
    if (!ticketNumberSchema.safeParse(request.params.ticketNumber).success) {
      response.status(400).json({ success: false, message: 'Invalid report identifier.' });
      return;
    }
    const parsed = assignmentSchema.safeParse(request.body);
    if (!parsed.success || !isValidObjectId(parsed.success ? parsed.data.technicianId : '')) {
      response.status(400).json({ success: false, message: 'Choose a valid technician.' });
      return;
    }
    const ticket = await Ticket.findOne({
      ticketNumber: request.params.ticketNumber,
      organizationId: request.user!.organizationId ?? null,
    });
    if (!ticket) {
      response.status(404).json({ success: false, message: 'Report not found.' });
      return;
    }
    if (['Resolved', 'Closed'].includes(ticket.status)) {
      response
        .status(409)
        .json({ success: false, message: 'Resolved or closed reports cannot be assigned.' });
      return;
    }
    const technician = await User.findOne({
      _id: parsed.data.technicianId,
      role: 'technician',
      organizationId: request.user!.organizationId ?? null,
      active: true,
      available: true,
    });
    if (
      !technician ||
      !isEligibleTechnician(
        {
          role: technician.role,
          active: technician.active,
          available: technician.available,
          organizationId: technician.organizationId?.toString() ?? null,
          department: technician.department,
        },
        request.user!.organizationId,
        ticket.department,
      )
    ) {
      response.status(400).json({
        success: false,
        message: 'This technician is not eligible for the report department or is unavailable.',
      });
      return;
    }
    const previousTechnician = ticket.assignedTo;
    ticket.assignedTo = technician._id;
    ticket.status = 'Assigned';
    ticket.assignmentHistory.push({
      previousTechnician,
      technician: technician._id,
      assignedBy: request.user!.id,
      assignedAt: new Date(),
      note: parsed.data.note ?? null,
    });
    ticket.activity.push({
      kind: 'assignment',
      message: previousTechnician
        ? 'Assignment was updated by a manager.'
        : 'A manager assigned this report to a technician.',
      author: request.user!.id,
      status: 'Assigned',
      visibleToCustomer: true,
    });
    await ticket.save();
    response.json({
      success: true,
      message: 'Assignment saved. No notification was sent.',
      data: ticket,
    });
  },
);
export default router;

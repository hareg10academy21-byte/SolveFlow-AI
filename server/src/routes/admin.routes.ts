import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AuditLog } from '../models/audit-log.model.js';
import { Department } from '../models/department.model.js';
import { User, userRoles } from '../models/user.model.js';
import { Ticket } from '../models/ticket.model.js';
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from '../middleware/auth.middleware.js';

const router = Router();
const userUpdate = z
  .object({
    role: z.enum(userRoles).optional(),
    active: z.boolean().optional(),
    department: z.string().trim().max(120).nullable().optional(),
    skills: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    available: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0);
const departmentSchema = z.object({ name: z.string().trim().min(2).max(120) });
const technicianRegistrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  department: z.string().trim().min(2).max(120),
  skills: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
});

function authorizedScope(request: AuthenticatedRequest) {
  return request.user!.organizationId ? { organizationId: request.user!.organizationId } : {};
}

router.use(requireAuth, requireRole('admin'));
router.post('/technicians', async (request: AuthenticatedRequest, response) => {
  const parsed = technicianRegistrationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      success: false,
      message: 'Please provide valid technician details.',
      errors: parsed.error.flatten(),
    });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  if (await User.exists({ email })) {
    response
      .status(409)
      .json({ success: false, message: 'An account with that email already exists.' });
    return;
  }
  const technician = await User.create({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    role: 'technician',
    organizationId: request.user!.organizationId ?? null,
    department: parsed.data.department,
    skills: parsed.data.skills,
    available: true,
    active: true,
  });
  await AuditLog.create({
    actor: request.user!.id,
    action: 'TECHNICIAN_CREATED',
    targetUser: technician._id,
    organizationId: request.user!.organizationId ?? null,
    details: { department: technician.department, skills: technician.skills },
  });
  response.status(201).json({
    success: true,
    data: {
      id: technician._id,
      name: technician.name,
      email: technician.email,
      role: technician.role,
      department: technician.department,
      skills: technician.skills,
    },
  });
});
router.get('/users', async (request: AuthenticatedRequest, response) => {
  const users = await User.find(authorizedScope(request))
    .select('name email role active department skills available createdAt')
    .sort({ createdAt: -1 })
    .lean();
  response.json({ success: true, data: users });
});

router.patch('/users/:id', async (request: AuthenticatedRequest, response) => {
  if (!isValidObjectId(request.params.id)) {
    response.status(400).json({ success: false, message: 'Invalid user identifier.' });
    return;
  }
  const parsed = userUpdate.safeParse(request.body);
  if (!parsed.success) {
    response
      .status(400)
      .json({ success: false, message: 'Invalid user update.', errors: parsed.error.flatten() });
    return;
  }
  const editingSelf = request.params.id === request.user!.id;
  if (editingSelf && parsed.data.role && parsed.data.role !== 'admin') {
    response.status(400).json({
      success: false,
      message: 'Administrators cannot remove their own administrative role.',
    });
    return;
  }
  if (editingSelf && parsed.data.active === false) {
    response
      .status(400)
      .json({ success: false, message: 'Administrators cannot deactivate their own account.' });
    return;
  }

  const sessionChange = parsed.data.role !== undefined || parsed.data.active !== undefined;
  const user = await User.findOneAndUpdate(
    { _id: request.params.id, ...authorizedScope(request) },
    { $set: parsed.data, ...(sessionChange ? { $inc: { sessionVersion: 1 } } : {}) },
    { new: true },
  ).select('name email role active department skills available');
  if (!user) {
    response
      .status(404)
      .json({ success: false, message: 'User not found in your authorized scope.' });
    return;
  }
  await AuditLog.create({
    actor: request.user!.id,
    action: 'USER_UPDATED',
    targetUser: user._id,
    organizationId: request.user!.organizationId ?? null,
    details: parsed.data,
  });
  response.json({ success: true, data: user });
});

router.get('/statistics', async (request: AuthenticatedRequest, response) => {
  const scope = authorizedScope(request);
  const [users, activeUsers, reports, openReports] = await Promise.all([
    User.countDocuments(scope),
    User.countDocuments({ ...scope, active: true }),
    Ticket.countDocuments(scope),
    Ticket.countDocuments({ ...scope, status: { $nin: ['Resolved', 'Closed'] } }),
  ]);
  response.json({ success: true, data: { users, activeUsers, reports, openReports } });
});

router.get('/departments', async (request: AuthenticatedRequest, response) => {
  if (!request.user!.organizationId) {
    response.json({ success: true, data: [] });
    return;
  }
  const departments = await Department.find({ organizationId: request.user!.organizationId })
    .sort({ name: 1 })
    .lean();
  response.json({ success: true, data: departments });
});
router.post('/departments', async (request: AuthenticatedRequest, response) => {
  const parsed = departmentSchema.safeParse(request.body);
  if (!parsed.success || !request.user!.organizationId) {
    response
      .status(400)
      .json({ success: false, message: 'A valid department name and organization are required.' });
    return;
  }
  try {
    const department = await Department.create({
      organizationId: request.user!.organizationId,
      name: parsed.data.name,
    });
    await AuditLog.create({
      actor: request.user!.id,
      action: 'DEPARTMENT_CREATED',
      organizationId: request.user!.organizationId,
      details: { name: department.name },
    });
    response.status(201).json({ success: true, data: department });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      response.status(409).json({ success: false, message: 'That department already exists.' });
      return;
    }
    throw error;
  }
});

router.get('/audit-log', async (request: AuthenticatedRequest, response) => {
  const entries = await AuditLog.find(authorizedScope(request))
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('actor', 'name email')
    .populate('targetUser', 'name email')
    .lean();
  response.json({ success: true, data: entries });
});
export default router;

import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { User, type UserDocument } from '../models/user.model.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { clearSessionCookie, setSessionCookie } from '../utils/auth.js';

const password = z.string().min(10, 'Password must contain at least 10 characters.').max(128);
const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password,
  role: z.literal('customer').default('customer'),
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const profileSchema = z.object({ name: z.string().trim().min(2).max(80) });
const adminSetupSchema = registrationSchema.extend({
  role: z.literal('admin'),
});

function publicUser(user: UserDocument & { _id: { toString(): string } }) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId?.toString() ?? null,
  };
}
function sessionUser(user: UserDocument & { _id: { toString(): string }; sessionVersion: number }) {
  return { sub: user._id.toString(), role: user.role, sessionVersion: user.sessionVersion };
}

export async function register(request: Request, response: Response): Promise<void> {
  const parsed = registrationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      success: false,
      message: 'Please review your registration details.',
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
  const user = await User.create({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    role: parsed.data.role,
  });
  setSessionCookie(response, sessionUser(user));
  response.status(201).json({ success: true, data: publicUser(user) });
}

export async function login(request: Request, response: Response): Promise<void> {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ success: false, message: 'Enter a valid email and password.' });
    return;
  }
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select(
    '+passwordHash +sessionVersion',
  );
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    response.status(401).json({ success: false, message: 'Email or password is incorrect.' });
    return;
  }
  if (!user.active) {
    response.status(403).json({ success: false, message: 'This account has been deactivated.' });
    return;
  }
  setSessionCookie(response, sessionUser(user));
  response.json({ success: true, data: publicUser(user) });
}

export async function currentUser(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  response.json({ success: true, data: request.user });
}
export async function updateProfile(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  const parsed = profileSchema.safeParse(request.body);
  if (!parsed.success) {
    response
      .status(400)
      .json({ success: false, message: 'Enter a valid name.', errors: parsed.error.flatten() });
    return;
  }
  const user = await User.findByIdAndUpdate(
    request.user?.id,
    { name: parsed.data.name },
    { new: true },
  );
  if (!user) {
    response.status(404).json({ success: false, message: 'User not found.' });
    return;
  }
  response.json({ success: true, data: publicUser(user) });
}

export async function logout(request: AuthenticatedRequest, response: Response): Promise<void> {
  await User.findByIdAndUpdate(request.user?.id, { $inc: { sessionVersion: 1 } });
  clearSessionCookie(response);
  response.json({ success: true });
}

export async function setupAdmin(request: Request, response: Response): Promise<void> {
  const setupSecret = request.get('x-admin-setup-secret');
  if (!process.env.ADMIN_SETUP_SECRET || setupSecret !== process.env.ADMIN_SETUP_SECRET) {
    response
      .status(403)
      .json({ success: false, message: 'Restricted administrator setup is required.' });
    return;
  }
  if (await User.exists({ role: 'admin' })) {
    response.status(409).json({ success: false, message: 'An administrator already exists.' });
    return;
  }
  const parsed = adminSetupSchema.safeParse(request.body);
  if (!parsed.success) {
    response
      .status(400)
      .json({ success: false, message: 'Invalid setup details.', errors: parsed.error.flatten() });
    return;
  }
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    role: parsed.data.role,
  });
  response.status(201).json({ success: true, data: publicUser(user) });
}

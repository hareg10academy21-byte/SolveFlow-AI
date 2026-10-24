import type { NextFunction, Request, Response } from 'express';
import { User, type UserRole } from '../models/user.model.js';
import { readSessionCookie, verifySession } from '../utils/auth.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organizationId: string | null;
    sessionVersion: number;
  };
}

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = readSessionCookie(request.cookies);
    if (!token) {
      response.status(401).json({ success: false, message: 'Authentication is required.' });
      return;
    }
    const payload = verifySession(token);
    const user = await User.findById(payload.sub).select('+sessionVersion').lean();
    if (!user || !user.active || user.sessionVersion !== payload.sessionVersion) {
      response
        .status(401)
        .json({ success: false, message: 'Your session has expired. Please sign in again.' });
      return;
    }
    request.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId?.toString() ?? null,
      sessionVersion: user.sessionVersion,
    };
    next();
  } catch {
    response.status(401).json({ success: false, message: 'Your session is invalid or expired.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    if (!request.user) {
      response.status(401).json({ success: false, message: 'Authentication is required.' });
      return;
    }
    if (!roles.includes(request.user.role)) {
      response
        .status(403)
        .json({ success: false, message: 'You do not have permission for this action.' });
      return;
    }
    next();
  };
}

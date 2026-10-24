import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { SignOptions } from 'jsonwebtoken';
import type { UserRole } from '../models/user.model.js';

const cookieName = 'solveflow_session';
const csrfCookieName = 'solveflow_csrf';

export interface SessionPayload {
  sub: string;
  role: UserRole;
  sessionVersion: number;
}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.includes('replace-with')) {
    throw new Error('JWT_SECRET must be set to a unique value of at least 32 characters.');
  }
  return secret;
}

function cookieOptions(httpOnly: boolean) {
  const secure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
  const sameSite = process.env.COOKIE_SAME_SITE === 'none' ? ('none' as const) : ('lax' as const);
  return { httpOnly, secure, sameSite, path: '/' };
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, jwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'],
    issuer: 'solveflow-ai',
    audience: 'solveflow-ai-web',
  });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, jwtSecret(), {
    issuer: 'solveflow-ai',
    audience: 'solveflow-ai-web',
  }) as SessionPayload;
}

export function setSessionCookie(response: Response, payload: SessionPayload): void {
  response.cookie(cookieName, signSession(payload), {
    ...cookieOptions(true),
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(cookieName, cookieOptions(true));
}
export function setCsrfCookie(response: Response, token: string): void {
  response.cookie(csrfCookieName, token, { ...cookieOptions(false), maxAge: 8 * 60 * 60 * 1000 });
}
export function readSessionCookie(cookies: Record<string, string | undefined>): string | undefined {
  return cookies[cookieName];
}
export const csrfCookie = csrfCookieName;

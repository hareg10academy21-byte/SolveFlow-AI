import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { csrfCookie, setCsrfCookie } from '../utils/auth.js';

function matches(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueCsrfToken(_request: Request, response: Response): void {
  const token = randomBytes(32).toString('hex');
  setCsrfCookie(response, token);
  response.json({ success: true, data: { csrfToken: token } });
}

export function protectCsrf(request: Request, response: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    next();
    return;
  }
  const cookieToken = request.cookies[csrfCookie];
  const headerToken = request.get('x-csrf-token');
  if (!cookieToken || !headerToken || !matches(cookieToken, headerToken)) {
    response.status(403).json({ success: false, message: 'Invalid CSRF token.' });
    return;
  }
  next();
}

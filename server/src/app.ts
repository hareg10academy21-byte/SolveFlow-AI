import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import { getHealth } from './controllers/health.controller.js';
import { issueCsrfToken, protectCsrf } from './middleware/csrf.middleware.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import managerRoutes from './routes/manager.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import technicianRoutes from './routes/technician.routes.js';

const app = express();
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
  }),
);
app.disable('x-powered-by');
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(process.env.UPLOAD_DIRECTORY ?? 'uploads'));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

app.get('/api/health', getHealth);
app.get('/api/v1/health', getHealth);
app.get('/api/v1/auth/csrf', issueCsrfToken);
app.use(protectCsrf);
app.use('/api/v1/auth', authRateLimit, authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/technician', technicianRoutes);
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (response.headersSent) return;
  const status =
    (error as { status?: number; statusCode?: number }).status ??
    (error as { statusCode?: number }).statusCode;
  response.status(status && status >= 400 && status < 500 ? status : 500).json({
    success: false,
    message:
      status && status >= 400 && status < 500
        ? 'Request could not be processed.'
        : 'An unexpected server error occurred.',
  });
});

export default app;

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import {
  addCustomerInformation,
  createDatabaseTicket,
  createDatabaseTicketSchema,
  listDatabaseTickets,
  updateDatabaseTicket,
  updateDatabaseTicketSchema,
} from '../services/database-ticket.service.js';
import { uploadImage } from '../middleware/upload.middleware.js';
import { z } from 'zod';

const router = Router();
const ticketNumberSchema = z.string().regex(/^SF-\d{4}-\d{4,}$/, 'Invalid report identifier.');
const analysisRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many report analysis requests. Please try again later.',
  },
});

router.use(requireAuth);

router.get('/', async (request: AuthenticatedRequest, response) =>
  response.json({ success: true, data: await listDatabaseTickets(request.user!) }),
);

router.post(
  '/',
  requireRole('customer'),
  analysisRateLimit,
  uploadImage.single('image'),
  async (request: AuthenticatedRequest, response) => {
    const parsed = createDatabaseTicketSchema.safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json({
        success: false,
        message: 'Please review the highlighted fields.',
        errors: parsed.error.flatten(),
      });
    const image = request.file
      ? {
          url: `/uploads/${request.file.filename}`,
          mimeType: request.file.mimetype,
          originalName: request.file.originalname,
        }
      : undefined;
    const ticket = await createDatabaseTicket(parsed.data, request.user!, image);
    return response.status(201).json({
      success: true,
      message:
        ticket.aiAnalysis.status === 'Completed'
          ? 'Problem reported successfully. AI suggestions are ready for administrator review.'
          : 'Problem reported successfully. AI analysis is currently unavailable; an administrator can review it manually.',
      data: ticket,
    });
  },
);

router.post('/:id/information', async (request: AuthenticatedRequest, response) => {
  if (!ticketNumberSchema.safeParse(request.params.id).success)
    return response.status(400).json({ success: false, message: 'Invalid report identifier.' });
  const parsed = z.object({ message: z.string().trim().min(3).max(1200) }).safeParse(request.body);
  if (!parsed.success)
    return response.status(400).json({
      success: false,
      message: 'Please enter additional information.',
      errors: parsed.error.flatten(),
    });
  const ticket = await addCustomerInformation(
    String(request.params.id),
    parsed.data.message,
    request.user!,
  );
  if (!ticket) return response.status(404).json({ success: false, message: 'Ticket not found.' });
  return response.status(201).json({ success: true, data: ticket });
});

router.patch('/:id', async (request: AuthenticatedRequest, response) => {
  if (!ticketNumberSchema.safeParse(request.params.id).success)
    return response.status(400).json({ success: false, message: 'Invalid report identifier.' });
  const parsed = updateDatabaseTicketSchema.safeParse(request.body);
  if (!parsed.success)
    return response.status(400).json({
      success: false,
      message: 'Unable to update ticket.',
      errors: parsed.error.flatten(),
    });
  try {
    const ticket = await updateDatabaseTicket(
      String(request.params.id),
      parsed.data,
      request.user!,
    );
    if (!ticket) return response.status(404).json({ success: false, message: 'Ticket not found.' });
    return response.json({ success: true, message: 'Ticket updated.', data: ticket });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN')
      return response
        .status(403)
        .json({ success: false, message: 'You do not have permission for this change.' });
    if (error instanceof Error && error.message === 'RESOLUTION_REQUIRED')
      return response.status(400).json({
        success: false,
        message: 'Resolution notes are required before resolving a ticket.',
      });
    throw error;
  }
});

export default router;

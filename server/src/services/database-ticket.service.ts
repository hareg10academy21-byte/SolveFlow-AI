import { z } from 'zod';
import { Ticket } from '../models/ticket.model.js';
import { User } from '../models/user.model.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { analyzeReport, type AiContext } from './ai.service.js';
import {
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
  type Ticket as TicketDto,
} from '../types/ticket.js';

export const createDatabaseTicketSchema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(2000),
  location: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(120).optional(),
  reportedRisk: z.enum(ticketPriorities).default('Medium'),
});
export const updateDatabaseTicketSchema = z.object({
  category: z.enum(ticketCategories).optional(),
  priority: z.enum(ticketPriorities).optional(),
  status: z.enum(ticketStatuses).optional(),
  resolutionNotes: z.string().trim().min(5).max(2000).nullable().optional(),
});

async function aiContext(
  input: z.infer<typeof createDatabaseTicketSchema>,
  user: Viewer,
): Promise<AiContext> {
  const titleTerm = input.title
    .split(/\s+/)
    .find((term) => term.length >= 3)
    ?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const duplicateScope: Record<string, unknown> =
    user.role === 'customer'
      ? { reporter: user.id }
      : user.organizationId
        ? { organizationId: user.organizationId }
        : { _id: null };
  const duplicateQuery = titleTerm
    ? { ...duplicateScope, title: { $regex: titleTerm, $options: 'i' } }
    : duplicateScope;
  const [duplicates, technicians] = await Promise.all([
    Ticket.find(duplicateQuery)
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('ticketNumber title location department')
      .lean(),
    User.find({
      role: 'technician',
      organizationId: user.organizationId ?? null,
      active: true,
      available: true,
      ...(input.department ? { department: input.department } : {}),
    })
      .select('department skills available')
      .lean(),
  ]);
  return {
    possibleDuplicates: duplicates.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      location: ticket.location,
      department: ticket.department,
    })),
    technicians: technicians.map((technician) => ({
      id: technician._id.toString(),
      department: technician.department,
      skills: technician.skills,
      available: technician.available,
    })),
  };
}
type Viewer = NonNullable<AuthenticatedRequest['user']>;
type StoredTicket = Omit<
  TicketDto,
  'id' | 'reporter' | 'assignedTo' | 'createdAt' | 'updatedAt' | 'activity'
> & {
  ticketNumber: string;
  reporter?: { name: string };
  assignedTo?: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
  activity: {
    message: string;
    author?: { name: string };
    createdAt: Date;
    visibleToCustomer: boolean;
  }[];
};
function toDto(ticket: unknown): TicketDto {
  const value = ticket as StoredTicket;
  // Assignment and cross-report suggestions are internal manager-only data.
  const aiAnalysis = {
    ...value.aiAnalysis,
    possibleDuplicateTicketNumbers: [],
    suggestedTechnicianIds: [],
  };
  return {
    id: value.ticketNumber,
    title: value.title,
    description: value.description,
    location: value.location,
    department: value.department,
    image: value.image,
    reporter: value.reporter?.name ?? 'Unknown reporter',
    assignedTo: value.assignedTo?.name ?? null,
    category: value.category,
    reportedRisk: value.reportedRisk,
    priority: value.priority,
    status: value.status,
    aiAnalysis,
    resolutionNotes: value.resolutionNotes,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
    activity: value.activity
      .filter((entry) => entry.visibleToCustomer)
      .map((entry) => ({
        message: entry.message,
        author: entry.author?.name ?? 'System',
        createdAt: entry.createdAt.toISOString(),
      })),
  };
}
async function hydrate(query: {
  populate: (
    path: string,
    fields: string,
  ) => {
    populate: (
      path: string,
      fields: string,
    ) => { populate: (path: string, fields: string) => Promise<unknown> };
  };
}) {
  return query
    .populate('reporter', 'name')
    .populate('assignedTo', 'name')
    .populate('activity.author', 'name');
}
export async function listDatabaseTickets(user: Viewer): Promise<TicketDto[]> {
  const filter =
    user.role === 'customer'
      ? { reporter: user.id }
      : user.role === 'technician'
        ? { assignedTo: user.id }
        : user.organizationId
          ? { organizationId: user.organizationId }
          : {};
  return (((await hydrate(Ticket.find(filter).sort({ updatedAt: -1 }))) as unknown[]) ?? []).map(
    toDto,
  );
}
export async function createDatabaseTicket(
  input: z.infer<typeof createDatabaseTicketSchema>,
  user: Viewer,
  image?: { url: string; mimeType: string; originalName: string },
): Promise<TicketDto> {
  const count = await Ticket.countDocuments();
  const ticketNumber = `SF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  const aiAnalysis = await analyzeReport(
    {
      title: input.title,
      description: input.description,
      location: input.location,
      department: input.department,
      reportedRisk: input.reportedRisk,
    },
    await aiContext(input, user),
  );
  const ticket = await Ticket.create({
    ...input,
    ticketNumber,
    reporter: user.id,
    organizationId: user.organizationId,
    image: image ?? undefined,
    activity: [
      {
        kind: 'status',
        message: 'Report submitted.',
        author: user.id,
        status: 'New',
        visibleToCustomer: true,
      },
    ],
    category: aiAnalysis.suggestedCategory,
    priority: aiAnalysis.suggestedPriority,
    reportedRisk: input.reportedRisk,
    aiAnalysis: {
      ...aiAnalysis,
      analyzedAt: aiAnalysis.status === 'Completed' ? new Date() : null,
      model:
        aiAnalysis.status === 'Completed' ? (process.env.OPENAI_MODEL ?? 'gpt-4.1-mini') : null,
    },
  });
  return toDto(await hydrate(Ticket.findById(ticket._id)));
}
export async function addCustomerInformation(
  ticketNumber: string,
  message: string,
  user: Viewer,
): Promise<TicketDto | null> {
  const ticket = (await hydrate(Ticket.findOne({ ticketNumber }))) as {
    reporter: { _id: { toString(): string } };
    activity: { push: (entry: unknown) => void };
    save: () => Promise<unknown>;
    _id: unknown;
  } | null;
  if (!ticket || ticket.reporter._id.toString() !== user.id) return null;
  ticket.activity.push({ kind: 'comment', message, author: user.id, visibleToCustomer: true });
  await ticket.save();
  return toDto(await hydrate(Ticket.findById(ticket._id)));
}
export async function updateDatabaseTicket(
  ticketNumber: string,
  input: z.infer<typeof updateDatabaseTicketSchema>,
  user: Viewer,
): Promise<TicketDto | null> {
  const ticket = (await hydrate(Ticket.findOne({ ticketNumber }))) as {
    reporter: { _id: { toString(): string } };
    assignedTo?: { _id: { toString(): string } } | null;
    resolutionNotes: string | null;
    save: () => Promise<unknown>;
    _id: unknown;
  } | null;
  if (!ticket) return null;
  const owns = ticket.reporter._id.toString() === user.id;
  const assigned = ticket.assignedTo?._id.toString() === user.id;
  if (user.role === 'customer' || user.role === 'technician') {
    if ((user.role === 'customer' && !owns) || (user.role === 'technician' && !assigned))
      return null;
    throw new Error('FORBIDDEN');
  }
  if (
    user.organizationId &&
    (ticket as { organizationId?: { toString(): string } | null }).organizationId?.toString() !==
      user.organizationId
  )
    return null;
  if (input.status === 'Resolved' && !(input.resolutionNotes ?? ticket.resolutionNotes))
    throw new Error('RESOLUTION_REQUIRED');
  Object.assign(ticket, input);
  await ticket.save();
  return toDto(await hydrate(Ticket.findById(ticket._id)));
}

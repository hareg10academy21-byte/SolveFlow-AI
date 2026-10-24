import { z } from 'zod';
import {
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
  type AiAnalysis,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
} from '../types/ticket.js';

export const createTicketSchema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(2000),
  location: z.string().trim().min(2).max(160),
  reporter: z.string().trim().min(2).max(80).optional(),
});

export const updateTicketSchema = z
  .object({
    assignedTo: z.string().trim().min(2).max(80).nullable().optional(),
    category: z.enum(ticketCategories).optional(),
    priority: z.enum(ticketPriorities).optional(),
    status: z.enum(ticketStatuses).optional(),
    resolutionNotes: z.string().trim().min(5).max(2000).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'Resolved' && !value.resolutionNotes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Resolution notes are required before resolving a ticket.',
        path: ['resolutionNotes'],
      });
    }
  });

const now = new Date();
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

let tickets: Ticket[] = [
  createSeed(
    'SF-2026-0004',
    'Water pooling near Room 204',
    'Water is leaking beside the west stairwell.',
    'Block B, Room 204',
    'Critical',
    'Plumbing',
    'New',
    null,
    18,
  ),
  createSeed(
    'SF-2026-0003',
    'Internet outage on second floor',
    'Students cannot connect to the campus Wi-Fi.',
    'Library, Floor 2',
    'High',
    'Internet',
    'In Progress',
    'Mekdes A.',
    75,
  ),
  createSeed(
    'SF-2026-0002',
    'Flickering corridor lights',
    'Three lights are flickering after sunset.',
    'Administration, Floor 1',
    'Medium',
    'Electrical',
    'Assigned',
    'Dawit K.',
    260,
  ),
  createSeed(
    'SF-2026-0001',
    'Damaged desk in study area',
    'A desk leg is loose and needs repair.',
    'Library, Study Hall',
    'Low',
    'Facilities',
    'Resolved',
    'Mekdes A.',
    930,
    'Tightened the loose leg and checked adjacent desks.',
  ),
];

function createSeed(
  id: string,
  title: string,
  description: string,
  location: string,
  priority: TicketPriority,
  category: TicketCategory,
  status: Ticket['status'],
  assignedTo: string | null,
  ageMinutes: number,
  resolutionNotes: string | null = null,
): Ticket {
  return {
    id,
    title,
    description,
    location,
    reporter: 'Alex Morgan',
    assignedTo,
    category,
    reportedRisk: priority,
    priority,
    status,
    aiAnalysis: buildAiAnalysis(title, description, category, priority),
    resolutionNotes,
    createdAt: minutesAgo(ageMinutes),
    updatedAt: minutesAgo(Math.max(2, ageMinutes - 12)),
  };
}

function buildAiAnalysis(
  title: string,
  description: string,
  category?: TicketCategory,
  priority?: TicketPriority,
): AiAnalysis {
  const text = `${title} ${description}`.toLowerCase();
  const detectedCategory: TicketCategory =
    category ??
    (text.includes('water') || text.includes('leak')
      ? 'Plumbing'
      : text.includes('light') || text.includes('electric')
        ? 'Electrical'
        : text.includes('internet') || text.includes('wifi')
          ? 'Internet'
          : 'Facilities');
  const detectedPriority: TicketPriority =
    priority ??
    (text.includes('fire') || text.includes('danger') || text.includes('leak') ? 'High' : 'Medium');
  return {
    summary: `${title.trim().replace(/\.$/, '')}.`,
    suggestedCategory: detectedCategory,
    suggestedPriority: detectedPriority,
    priorityExplanation: 'This legacy local suggestion is retained only for compatibility.',
    reportedRiskComparison:
      'No separate customer risk assessment is stored for this legacy record.',
    missingInformation: ['Is there an immediate safety risk or access issue?'],
    suggestedAction:
      detectedPriority === 'High' || detectedPriority === 'Critical'
        ? 'Arrange an urgent inspection and secure the area.'
        : 'Assign a technician for inspection.',
    possibleDuplicateTicketNumbers: [],
    suggestedTechnicianIds: [],
    status: 'Completed',
  };
}

export function listTickets(): Ticket[] {
  return [...tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getTicket(id: string): Ticket | undefined {
  return tickets.find((ticket) => ticket.id === id);
}

export function createTicket(input: z.infer<typeof createTicketSchema>): Ticket {
  const number = String(tickets.length + 1).padStart(4, '0');
  const createdAt = new Date().toISOString();
  const aiAnalysis = buildAiAnalysis(input.title, input.description);
  const ticket: Ticket = {
    id: `SF-2026-${number}`,
    title: input.title,
    description: input.description,
    location: input.location,
    reporter: input.reporter ?? 'Alex Morgan',
    assignedTo: null,
    category: aiAnalysis.suggestedCategory,
    reportedRisk: 'Medium',
    priority: aiAnalysis.suggestedPriority,
    status: 'New',
    aiAnalysis,
    resolutionNotes: null,
    createdAt,
    updatedAt: createdAt,
  };
  tickets = [ticket, ...tickets];
  return ticket;
}

export function updateTicket(
  id: string,
  input: z.infer<typeof updateTicketSchema>,
): Ticket | undefined {
  const ticket = getTicket(id);
  if (!ticket) return undefined;
  Object.assign(ticket, input, { updatedAt: new Date().toISOString() });
  return ticket;
}

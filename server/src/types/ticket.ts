export const ticketStatuses = [
  'New',
  'Assigned',
  'Accepted',
  'In Progress',
  'Blocked',
  'Resolved',
  'Closed',
] as const;
export const ticketPriorities = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ticketCategories = [
  'Plumbing',
  'Electrical',
  'Facilities',
  'Internet',
  'Safety',
  'Other',
] as const;

export type TicketStatus = (typeof ticketStatuses)[number];
export type TicketPriority = (typeof ticketPriorities)[number];
export type TicketCategory = (typeof ticketCategories)[number];

export interface AiAnalysis {
  summary: string;
  suggestedCategory: TicketCategory;
  suggestedPriority: TicketPriority;
  priorityExplanation: string;
  reportedRiskComparison: string;
  missingInformation: string[];
  suggestedAction: string;
  possibleDuplicateTicketNumbers: string[];
  suggestedTechnicianIds: string[];
  status: 'Completed' | 'Pending' | 'Failed';
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  location: string;
  department?: string | null;
  image?: { url: string; mimeType: string; originalName: string } | null;
  reporter: string;
  assignedTo: string | null;
  category: TicketCategory;
  reportedRisk: TicketPriority;
  priority: TicketPriority;
  status: TicketStatus;
  aiAnalysis: AiAnalysis;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  activity?: { message: string; author: string; createdAt: string }[];
}

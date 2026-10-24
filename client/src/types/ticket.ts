export type TicketStatus =
  'New' | 'Assigned' | 'Accepted' | 'In Progress' | 'Blocked' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory =
  'Plumbing' | 'Electrical' | 'Facilities' | 'Internet' | 'Safety' | 'Other';

export interface AiAnalysis {
  summary: string;
  suggestedCategory: TicketCategory;
  suggestedPriority: TicketPriority;
  priorityExplanation: string;
  reportedRiskComparison: string;
  missingInformation: string[];
  suggestedAction: string;
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

export interface TicketPayload {
  title: string;
  description: string;
  location: string;
  reportedRisk?: TicketPriority;
  reporter?: string;
}

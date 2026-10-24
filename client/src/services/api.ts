import { api } from './auth';
import type { Ticket, TicketPayload, TicketStatus } from '../types/ticket';

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
export async function fetchTickets() {
  return (await api.get<ApiResponse<Ticket[]>>('/tickets')).data.data;
}
export async function createTicket(payload: TicketPayload) {
  return (await api.post<ApiResponse<Ticket>>('/tickets', payload)).data.data;
}
export async function createCustomerReport(
  payload: TicketPayload & { department?: string; image?: File },
) {
  const form = new FormData();
  form.set('title', payload.title);
  form.set('description', payload.description);
  form.set('location', payload.location);
  if (payload.reportedRisk) form.set('reportedRisk', payload.reportedRisk);
  if (payload.department) form.set('department', payload.department);
  if (payload.image) form.set('image', payload.image);
  return (await api.post<ApiResponse<Ticket>>('/tickets', form)).data.data;
}
export async function addTicketInformation(id: string, message: string) {
  return (await api.post<ApiResponse<Ticket>>(`/tickets/${id}/information`, { message })).data.data;
}
export async function updateTicket(
  id: string,
  payload: Partial<Pick<Ticket, 'assignedTo' | 'category' | 'priority' | 'resolutionNotes'>> & {
    status?: TicketStatus;
  },
) {
  return (await api.patch<ApiResponse<Ticket>>(`/tickets/${id}`, payload)).data.data;
}

import { ArrowUpRight, MapPin, UserPlus, UserRound } from 'lucide-react';
import type { Ticket } from '../types/ticket';
import { StatusBadge } from './StatusBadge';
function timeSince(date: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60_000));
  return minutes < 60
    ? `${minutes}m ago`
    : minutes < 1440
      ? `${Math.round(minutes / 60)}h ago`
      : `${Math.round(minutes / 1440)}d ago`;
}
export function TicketCard({
  ticket,
  onOpen,
  assignmentLink,
}: {
  ticket: Ticket;
  onOpen: (ticket: Ticket) => void;
  assignmentLink?: string;
}) {
  return (
    <article className="group w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <button onClick={() => onOpen(ticket)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400">
              {ticket.id} · {timeSince(ticket.updatedAt)}
            </p>
            <h3 className="mt-1 font-bold text-slate-800 group-hover:text-indigo-700">
              {ticket.title}
            </h3>
          </div>
          <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-500" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge value={ticket.priority} />
          <StatusBadge value={ticket.status} />
        </div>
        <div className="mt-4 space-y-1.5 text-xs font-medium text-slate-500">
          <p className="flex items-center gap-2">
            <MapPin size={14} />
            {ticket.location}
          </p>
          <p className="flex items-center gap-2">
            <UserRound size={14} />
            {ticket.assignedTo ?? 'Unassigned'}
          </p>
        </div>
      </button>
      {assignmentLink && !['Resolved', 'Closed'].includes(ticket.status) && (
        <a
          href={assignmentLink}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-indigo-700"
        >
          <UserPlus size={16} />
          Assign technician
        </a>
      )}
    </article>
  );
}

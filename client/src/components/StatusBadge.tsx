import type { TicketPriority, TicketStatus } from '../types/ticket';
const styles: Record<TicketStatus | TicketPriority, string> = {
  New: 'bg-sky-50 text-sky-700 ring-sky-100',
  Assigned: 'bg-violet-50 text-violet-700 ring-violet-100',
  Accepted: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  'In Progress': 'bg-amber-50 text-amber-700 ring-amber-100',
  Blocked: 'bg-rose-50 text-rose-700 ring-rose-100',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Closed: 'bg-slate-100 text-slate-600 ring-slate-200',
  Low: 'bg-slate-100 text-slate-600 ring-slate-200',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-100',
  High: 'bg-orange-50 text-orange-700 ring-orange-100',
  Critical: 'bg-rose-50 text-rose-700 ring-rose-100',
};
export function StatusBadge({ value }: { value: TicketStatus | TicketPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${styles[value]}`}
    >
      {value}
    </span>
  );
}

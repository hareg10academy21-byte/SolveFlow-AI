import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ClipboardList,
  LoaderCircle,
  Plus,
  RefreshCw,
  LogOut,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchTickets } from '../services/api';
import { api } from '../services/auth';
import type { AuthUser } from '../types/auth';
import type { Ticket } from '../types/ticket';
import { TicketCard } from './TicketCard';
import { AdminManagement } from './AdminManagement';
import { ManagerAssignment } from './ManagerAssignment';
import { useAuth } from '../contexts/AuthContext';
import { TechnicianWorkQueue } from './TechnicianWorkQueue';

interface Summary {
  total: number;
  newTickets: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  highPriority: number;
}
interface DashboardData {
  summary: Summary;
  users?: Record<string, number>;
}
const roleCopy = {
  customer: {
    eyebrow: 'My requests',
    title: 'Track the issues you reported.',
    detail: 'Submit a clear report and follow each update through resolution.',
  },
  technician: {
    eyebrow: 'My work queue',
    title: 'Focus on the work assigned to you.',
    detail: 'Review requests, update progress, and record completed work.',
  },
  admin: {
    eyebrow: 'System administration',
    title: 'Monitor the SolveFlow workspace.',
    detail: 'Review real platform activity and user distribution.',
  },
} as const;

export function RoleDashboard({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const copy = roleCopy[user.role];
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, ticketData] = await Promise.all([
        api.get<{ data: DashboardData }>(`/dashboard/${user.role}`),
        fetchTickets(),
      ]);
      setData(dashboard.data.data);
      setTickets(ticketData);
    } catch {
      setError('We could not load your dashboard. Refresh the page or try again shortly.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [user.role]);
  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8fc]">
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-indigo-600" size={30} />
          <p className="mt-3 text-sm font-semibold text-slate-500">Loading your workspace…</p>
        </div>
      </main>
    );
  if (error)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8fc] p-5">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200">
          <AlertCircle className="mx-auto text-rose-500" size={34} />
          <h1 className="mt-4 text-xl font-extrabold">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </main>
    );
  const summary = data!.summary;
  const cards = [
    {
      label: 'Total tickets',
      value: summary.total,
      icon: <ClipboardList />,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: user.role === 'technician' ? 'Ready to start' : 'New tickets',
      value: summary.newTickets,
      icon: <Wrench />,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'In progress',
      value: summary.inProgress,
      icon: <RefreshCw />,
      color: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Resolved',
      value: summary.resolved,
      icon: <ShieldCheck />,
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];
  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-10">
        <Link
          to={`/dashboard/${user.role}`}
          className="flex items-center gap-2 font-extrabold text-slate-900"
        >
          SolveFlow <span className="text-indigo-600">AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-slate-800">{user.name}</p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            {user.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </div>
          <button
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700"
            title="Sign out securely"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
              {copy.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">{copy.detail}</p>
          </div>
          {user.role === 'customer' && (
            <button
              onClick={() => navigate('/dashboard/customer/report')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200"
            >
              <Plus size={18} />
              Report a problem
            </button>
          )}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${card.color}`}>
                {card.icon}
              </div>
              <p className="mt-5 text-3xl font-extrabold">{card.value}</p>
              <p className="mt-1 text-sm text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>
        {user.role === 'admin' && (
          <>
            <div className="mt-7 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <UserRound className="text-indigo-600" size={19} />
                <h2 className="font-extrabold">Users by role</h2>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(data!.users ?? {}).map(([role, count]) => (
                  <div key={role} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-2xl font-extrabold">{count}</p>
                    <p className="mt-1 text-sm capitalize text-slate-500">{role}s</p>
                  </div>
                ))}
                {Object.keys(data!.users ?? {}).length === 0 && (
                  <p className="col-span-full text-sm text-slate-500">
                    No user records are available yet.
                  </p>
                )}
              </div>
            </div>
            <AdminManagement />
            <ManagerAssignment />
          </>
        )}
        {user.role === 'technician' && <TechnicianWorkQueue />}
        <div className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-extrabold">
                {user.role === 'technician' ? 'Assigned tickets' : 'Recent tickets'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Live records from your authorized workspace.
              </p>
            </div>
            <button
              onClick={() => void load()}
              className="rounded-xl bg-white p-2.5 text-slate-500 shadow-sm"
            >
              <RefreshCw size={17} />
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {tickets.length ? (
              tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onOpen={() => undefined}
                  assignmentLink={user.role === 'admin' ? '#assign-reports' : undefined}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <ClipboardList className="mx-auto text-slate-300" size={32} />
                <h3 className="mt-4 font-extrabold text-slate-700">No tickets yet</h3>
                <p className="mt-1 text-sm text-slate-500">
                  When authorized records exist, they will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

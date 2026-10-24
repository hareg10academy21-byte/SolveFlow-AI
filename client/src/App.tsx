import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import {
  Bell,
  Bot,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Menu,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react';
import { StatusBadge } from './components/StatusBadge';
import { TicketCard } from './components/TicketCard';
import { AuthScreen } from './components/AuthScreen';
import { RoleDashboard } from './components/RoleDashboard';
import { CustomerReportPage } from './components/CustomerReportPage';
import { useAuth } from './contexts/AuthContext';
import { createTicket, fetchTickets, updateTicket } from './services/api';
import type { Ticket, TicketPayload, TicketStatus } from './types/ticket';
import type { AuthUser } from './types/auth';

type View = 'dashboard' | 'report' | 'detail';
const people = ['Mekdes A.', 'Dawit K.', 'Selam T.'];

export function Workspace({ user }: { user: AuthUser }) {
  const { logout, updateProfile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    void (async () => {
      try {
        setTickets(await fetchTickets());
      } catch {
        setNotice('The API is unavailable. Start the project with npm run dev.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const open = (ticket: Ticket) => {
    setSelected(ticket);
    setView('detail');
    setMenu(false);
  };
  const filtered = useMemo(
    () =>
      tickets.filter((ticket) =>
        `${ticket.id} ${ticket.title} ${ticket.location}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [tickets, query],
  );
  const report = async (data: TicketPayload) => {
    setSaving(true);
    try {
      const ticket = await createTicket(data);
      setTickets((old) => [ticket, ...old]);
      open(ticket);
      setNotice(`${ticket.id} was created. AI suggestions are ready for review.`);
    } catch {
      setNotice('We could not save the report. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const save = async (data: Parameters<typeof updateTicket>[1]) => {
    if (!selected) return;
    setSaving(true);
    try {
      const ticket = await updateTicket(selected.id, data);
      setSelected(ticket);
      setTickets((old) => old.map((item) => (item.id === ticket.id ? ticket : item)));
      setNotice('Ticket updated successfully.');
    } catch {
      setNotice('Add resolution notes before resolving this ticket.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white p-5 transition-transform lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
            <Sparkles size={21} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold">
              SolveFlow <span className="text-indigo-600">AI</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Resolve with clarity
            </p>
          </div>
        </div>
        <nav className="mt-10 space-y-1">
          <Nav
            icon={<LayoutDashboard />}
            active={view === 'dashboard'}
            label="Overview"
            onClick={() => {
              setView('dashboard');
              setMenu(false);
            }}
          />
          <Nav
            icon={<Plus />}
            active={view === 'report'}
            label="Report a problem"
            onClick={() => {
              setView('report');
              setMenu(false);
            }}
          />
          <Nav icon={<ClipboardList />} label="All tickets" onClick={() => setView('dashboard')} />
          <Nav
            icon={<UsersRound />}
            label="Team"
            onClick={() => setNotice('Team management is coming next.')}
          />
        </nav>
        <div className="mt-auto border-t border-slate-100 pt-4">
          <Nav
            icon={<Settings />}
            label="Settings"
            onClick={() => setNotice('Settings are not configured yet.')}
          />
        </div>
      </aside>
      {menu && (
        <button
          aria-label="Close menu"
          onClick={() => setMenu(false)}
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
        />
      )}
      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-[#f7f8fc]/90 px-5 backdrop-blur lg:px-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenu(true)} className="rounded-xl p-2 lg:hidden">
              <Menu />
            </button>
            <div>
              <p className="text-sm text-slate-500">Operations workspace</p>
              <p className="font-bold">{user.name}'s workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-xl bg-white p-2.5 text-slate-500 shadow-sm">
              <Bell size={19} />
              <i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white" />
            </button>
            <span className="hidden text-sm font-bold text-slate-700 sm:block">{user.name}</span>
            <button
              onClick={() => setProfileOpen(true)}
              title="Open profile"
              className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white"
            >
              {user.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </button>
          </div>
        </header>
        <section className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
          {notice && (
            <div className="mb-6 flex justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
              <span>{notice}</span>
              <button onClick={() => setNotice(null)}>
                <X size={17} />
              </button>
            </div>
          )}
          {view === 'dashboard' && (
            <Dashboard
              tickets={filtered}
              all={tickets}
              query={query}
              loading={loading}
              onQuery={setQuery}
              onOpen={open}
              onReport={() => setView('report')}
            />
          )}
          {view === 'report' && (
            <Report saving={saving} onCancel={() => setView('dashboard')} onSubmit={report} />
          )}
          {view === 'detail' && selected && (
            <Detail
              ticket={selected}
              saving={saving}
              onBack={() => setView('dashboard')}
              onSave={save}
            />
          )}
        </section>
        {profileOpen && (
          <ProfileDialog
            user={user}
            onClose={() => setProfileOpen(false)}
            onSave={updateProfile}
            onLogout={logout}
          />
        )}
      </main>
    </div>
  );
}

function ProfileDialog({
  user,
  onClose,
  onSave,
  onLogout,
}: {
  user: AuthUser;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch {
      setError('Your profile could not be updated.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-indigo-600">
              Your profile
            </p>
            <h2 className="mt-1 text-2xl font-extrabold">Account settings</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500">
            <X />
          </button>
        </div>
        <p className="mt-5 text-sm text-slate-500">
          {user.email} · <span className="capitalize">{user.role}</span>
        </p>
        <label className="mt-6 block text-sm font-bold text-slate-700">
          Display name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input mt-2"
          />
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
        <div className="mt-7 flex gap-3">
          <button
            onClick={() => void onLogout()}
            className="rounded-xl px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50"
          >
            Sign out
          </button>
          <button
            disabled={saving}
            onClick={() => void save()}
            className="ml-auto rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950">
        <LoaderCircle className="animate-spin text-white" size={30} />
      </main>
    );
  if (!user) return <AuthScreen />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard/:role" element={<DashboardRoute user={user} />} />
        <Route
          path="/dashboard/customer/report"
          element={
            user.role === 'customer' ? (
              <CustomerReportPage />
            ) : (
              <Navigate replace to={`/dashboard/${user.role}`} />
            )
          }
        />
        <Route path="*" element={<Navigate replace to={`/dashboard/${user.role}`} />} />
      </Routes>
    </BrowserRouter>
  );
}

function DashboardRoute({ user }: { user: AuthUser }) {
  const { role } = useParams();
  return role === user.role ? (
    <RoleDashboard user={user} />
  ) : (
    <Navigate replace to={`/dashboard/${user.role}`} />
  );
}

function Nav({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
    >
      {icon}
      {label}
    </button>
  );
}
function Dashboard({
  tickets,
  all,
  query,
  loading,
  onQuery,
  onOpen,
  onReport,
}: {
  tickets: Ticket[];
  all: Ticket[];
  query: string;
  loading: boolean;
  onQuery: (v: string) => void;
  onOpen: (t: Ticket) => void;
  onReport: () => void;
}) {
  const stats = [
    {
      l: 'Open tickets',
      v: all.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length,
      i: <ClipboardList />,
      c: 'bg-indigo-50 text-indigo-600',
    },
    {
      l: 'Needs attention',
      v: all.filter((t) => ['High', 'Critical'].includes(t.priority)).length,
      i: <Bot />,
      c: 'bg-rose-50 text-rose-600',
    },
    {
      l: 'In progress',
      v: all.filter((t) => t.status === 'In Progress').length,
      i: <Wrench />,
      c: 'bg-amber-50 text-amber-600',
    },
    {
      l: 'Resolved today',
      v: all.filter((t) => t.status === 'Resolved').length,
      i: <CheckCircle2 />,
      c: 'bg-emerald-50 text-emerald-600',
    },
  ];
  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
            Live overview
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Keep every problem moving.
          </h2>
          <p className="mt-2 text-slate-500">
            Review reports, direct your team, and close the loop.
          </p>
        </div>
        <button
          onClick={onReport}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
        >
          <Plus size={19} />
          Report a problem
        </button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.c}`}>{s.i}</div>
            <p className="mt-5 text-3xl font-extrabold">{s.v}</p>
            <p className="mt-1 text-sm text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-extrabold">Priority queue</h2>
              <p className="text-sm text-slate-500">The work that needs a decision next.</p>
            </div>
            <label className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Search tickets"
                className="input pl-10 sm:w-52"
              />
            </label>
          </div>
          <div className="grid gap-3">
            {loading ? (
              <div className="grid h-48 place-items-center rounded-2xl bg-white">
                <LoaderCircle className="animate-spin text-slate-400" />
              </div>
            ) : (
              tickets.map((t) => <TicketCard key={t.id} ticket={t} onOpen={onOpen} />)
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-200">
          <div className="flex items-center gap-2 text-indigo-300">
            <Bot size={19} />
            <span className="text-sm font-bold">AI workflow assistant</span>
          </div>
          <h2 className="mt-4 text-2xl font-extrabold leading-tight">
            Turn reports into clear next steps.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Every report gets a suggested category, priority, and action. Managers always make the
            final decision.
          </p>
          <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm text-slate-200">
            <p>01 · Capture the report</p>
            <p>02 · Review suggestions</p>
            <p>03 · Assign and resolve</p>
          </div>
        </div>
      </div>
    </>
  );
}
function Report({
  saving,
  onCancel,
  onSubmit,
}: {
  saving: boolean;
  onCancel: () => void;
  onSubmit: (p: TicketPayload) => Promise<void>;
}) {
  const [data, setData] = useState<TicketPayload>({
    title: '',
    description: '',
    location: '',
    reporter: 'Alex Morgan',
  });
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (data.title.length < 4 || data.description.length < 10 || data.location.length < 2) {
      setError('Add a clear title, location, and short description.');
      return;
    }
    await onSubmit(data);
  };
  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onCancel} className="mb-6 text-sm font-bold text-slate-500">
        ← Back to overview
      </button>
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60">
        <div className="bg-gradient-to-r from-indigo-700 to-violet-700 p-8 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-200">
            New report
          </p>
          <h2 className="mt-2 text-3xl font-extrabold">What needs attention?</h2>
          <p className="mt-2 text-indigo-100">
            Describe the issue in your own words. AI suggestions will be prepared for review.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-6 p-8">
          <Field label="Problem title">
            <input
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="e.g. Water pooling near Room 204"
              className="input"
            />
          </Field>
          <Field label="Location">
            <div className="relative">
              <MapPin
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={data.location}
                onChange={(e) => setData({ ...data, location: e.target.value })}
                placeholder="Building, floor, room, or landmark"
                className="input pl-10"
              />
            </div>
          </Field>
          <Field label="Describe the problem">
            <textarea
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              rows={5}
              placeholder="Include what you noticed and any safety concern..."
              className="input resize-none"
            />
          </Field>
          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-5 py-3 font-bold text-slate-500"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
              Submit report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-slate-800">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
function Detail({
  ticket,
  saving,
  onBack,
  onSave,
}: {
  ticket: Ticket;
  saving: boolean;
  onBack: () => void;
  onSave: (p: Parameters<typeof updateTicket>[1]) => Promise<void>;
}) {
  const [assignee, setAssignee] = useState(ticket.assignedTo ?? '');
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [notes, setNotes] = useState(ticket.resolutionNotes ?? '');
  return (
    <div>
      <button onClick={onBack} className="mb-6 text-sm font-bold text-slate-500">
        ← Back to queue
      </button>
      <div className="grid gap-7 xl:grid-cols-[1fr_360px]">
        <article className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-indigo-600">{ticket.id}</p>
              <h2 className="mt-2 text-3xl font-extrabold">{ticket.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={16} />
                {ticket.location}
              </p>
            </div>
            <div className="flex gap-2">
              <StatusBadge value={ticket.priority} />
              <StatusBadge value={ticket.status} />
            </div>
          </div>
          <section className="mt-8 border-t border-slate-100 pt-7">
            <h3 className="font-extrabold">Original report</h3>
            <p className="mt-3 leading-7 text-slate-600">{ticket.description}</p>
          </section>
          <section className="mt-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
            <div className="flex items-center gap-2 font-extrabold text-indigo-900">
              <Sparkles size={18} className="text-indigo-600" />
              AI analysis{' '}
              <span className="ml-auto rounded-full bg-white px-2.5 py-1 text-xs text-indigo-600">
                Suggestion only
              </span>
            </div>
            <p className="mt-4 font-bold text-slate-800">{ticket.aiAnalysis.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Suggested category
                </p>
                <p className="mt-1 font-bold text-slate-700">
                  {ticket.aiAnalysis.suggestedCategory}
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Suggested action
                </p>
                <p className="mt-1 font-bold text-slate-700">{ticket.aiAnalysis.suggestedAction}</p>
              </div>
            </div>
          </section>
        </article>
        <aside className="h-fit rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="font-extrabold">Manager review</h3>
          <p className="mt-2 text-sm text-slate-500">
            Confirm ownership and keep the workflow moving.
          </p>
          <div className="mt-6 space-y-5">
            <Field label="Assigned technician">
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="input"
              >
                <option value="">Unassigned</option>
                {people.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className="input"
              >
                {(['New', 'Assigned', 'In Progress', 'Resolved', 'Closed'] as TicketStatus[]).map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Resolution notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="input resize-none"
                placeholder="What was done?"
              />
            </Field>
            <button
              disabled={saving}
              onClick={() =>
                void onSave({
                  assignedTo: assignee || null,
                  status,
                  resolutionNotes: notes || null,
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              Save changes
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

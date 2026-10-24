import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, LoaderCircle, MapPin, RefreshCw, Send } from 'lucide-react';
import { api } from '../services/auth';

interface Assignment {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  location: string;
  department?: string | null;
  status: 'Assigned' | 'Accepted' | 'In Progress' | 'Blocked' | 'Resolved' | 'Closed';
  priority: string;
  assignmentHistory?: { assignedAt: string }[];
}

const nextStatuses: Record<string, string[]> = {
  Assigned: ['Accepted'],
  Accepted: ['In Progress', 'Blocked'],
  'In Progress': ['Blocked', 'Resolved'],
  Blocked: ['In Progress', 'Resolved'],
};

export function TechnicianWorkQueue() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [assistance, setAssistance] = useState<{
    ticketNumber: string;
    summary: string;
    safetyChecks: string[];
    suggestedSteps: string[];
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get<{ data: Assignment[] }>('/technician/assignments');
      setAssignments(result.data.data);
    } catch {
      setError('Your assigned work could not be loaded. Refresh and try again.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const openUpdate = (assignment: Assignment) => {
    setActive(assignment.ticketNumber);
    setStatus(nextStatuses[assignment.status]?.[0] ?? '');
    setNote('');
    setResolutionNotes('');
    setError('');
  };
  const submit = async (assignment: Assignment) => {
    if (
      !status ||
      note.trim().length < 3 ||
      (status === 'Resolved' && resolutionNotes.trim().length < 5)
    ) {
      setError(
        'Choose an allowed status, add a progress note, and include resolution details when resolving.',
      );
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/technician/assignments/${assignment.ticketNumber}`, {
        status,
        note: note.trim(),
        ...(status === 'Resolved' ? { resolutionNotes: resolutionNotes.trim() } : {}),
      });
      setActive(null);
      await load();
    } catch {
      setError(
        'The update could not be saved. This report may have changed or the status transition is not allowed.',
      );
    } finally {
      setSaving(false);
    }
  };
  const getAssistance = async (assignment: Assignment) => {
    setError('');
    try {
      const result = await api.post<{ data: Omit<NonNullable<typeof assistance>, 'ticketNumber'> }>(
        `/technician/assignments/${assignment.ticketNumber}/assistant`,
      );
      setAssistance({ ticketNumber: assignment.ticketNumber, ...result.data.data });
    } catch {
      setError(
        'AI work assistance is currently unavailable. You can still update this report normally.',
      );
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="text-indigo-600" size={20} />
            <h2 className="text-xl font-extrabold">My work queue</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Only reports assigned to you appear here. Record each verified progress update.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-xl bg-slate-50 p-2.5 text-slate-500"
          aria-label="Refresh work queue"
        >
          <RefreshCw size={17} />
        </button>
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      {loading ? (
        <div className="grid h-40 place-items-center">
          <LoaderCircle className="animate-spin text-indigo-600" />
        </div>
      ) : assignments.length ? (
        <div className="mt-5 grid gap-4">
          {assignments.map((assignment) => (
            <article key={assignment._id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-indigo-600">
                    {assignment.ticketNumber} · {assignment.priority} priority
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold">{assignment.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{assignment.description}</p>
                  <p className="mt-3 flex items-center gap-1 text-sm text-slate-500">
                    <MapPin size={15} />
                    {assignment.location}
                    {assignment.department ? ` · ${assignment.department}` : ''}
                  </p>
                </div>
                <span className="h-fit rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
                  {assignment.status}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => void getAssistance(assignment)}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700"
                >
                  AI work assistant
                </button>
                {nextStatuses[assignment.status]?.length ? (
                  <div className="mt-5">
                    {active === assignment.ticketNumber ? (
                      <div className="grid gap-3 rounded-xl bg-slate-50 p-4">
                        <select
                          value={status}
                          onChange={(event) => setStatus(event.target.value)}
                          className="input"
                        >
                          {nextStatuses[assignment.status].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                        <textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          rows={3}
                          className="input resize-none"
                          placeholder="Describe the work completed or the blockage..."
                        />
                        {status === 'Resolved' && (
                          <textarea
                            value={resolutionNotes}
                            onChange={(event) => setResolutionNotes(event.target.value)}
                            rows={3}
                            className="input resize-none"
                            placeholder="Resolution details required..."
                          />
                        )}
                        <div className="flex gap-3">
                          <button
                            onClick={() => void submit(assignment)}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                          >
                            {saving ? (
                              <LoaderCircle className="animate-spin" size={16} />
                            ) : (
                              <Send size={16} />
                            )}{' '}
                            Save update
                          </button>
                          <button
                            onClick={() => setActive(null)}
                            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openUpdate(assignment)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
                      >
                        <CheckCircle2 size={16} />
                        Update progress
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">
                    This report is complete and has no further technician status transitions.
                  </p>
                )}
              </div>
              {assistance?.ticketNumber === assignment.ticketNumber && (
                <div className="mt-4 rounded-xl bg-indigo-50 p-4">
                  <p className="font-bold">AI work guidance</p>
                  <p className="mt-2 text-sm text-slate-700">{assistance.summary}</p>
                  <p className="mt-3 text-sm font-bold">Safety checks</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                    {assistance.safetyChecks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm font-bold">Suggested steps</p>
                  <ol className="mt-1 list-decimal pl-5 text-sm text-slate-700">
                    {assistance.suggestedSteps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <ClipboardList className="mx-auto text-slate-300" size={32} />
          <h3 className="mt-4 font-extrabold text-slate-700">No work assigned yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            When a manager assigns a real report to you, it will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

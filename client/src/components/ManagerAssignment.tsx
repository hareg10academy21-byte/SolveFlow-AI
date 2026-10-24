import { useEffect, useState } from 'react';
import { LoaderCircle, UserPlus } from 'lucide-react';
import { api } from '../services/auth';

interface Report {
  ticketNumber: string;
  title: string;
  department?: string | null;
  status: string;
  reportedRisk: string;
  priority: string;
  assignedTo?: { name: string } | null;
}
interface Technician {
  _id: string;
  name: string;
  department?: string | null;
  skills: string[];
}
interface AiSuggestion {
  analysis: {
    summary: string;
    suggestedPriority: string;
    priorityExplanation: string;
    reportedRiskComparison: string;
    suggestedAction: string;
  };
  candidates: Technician[];
  reportedRisk: string;
  priority: string;
}

export function ManagerAssignment() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [technicianId, setTechnicianId] = useState('');
  const [finalPriority, setFinalPriority] = useState('Medium');
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadReports = async () => {
    try {
      const result = await api.get<{ data: Report[] }>('/manager/reports');
      setReports(result.data.data);
    } catch {
      setMessage('Reports could not be loaded.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadReports();
  }, []);
  const choose = async (report: Report) => {
    setSelected(report);
    setTechnicianId('');
    setFinalPriority(report.priority);
    setSuggestion(null);
    setMessage('');
    try {
      const [result, aiResult] = await Promise.all([
        api.get<{ data: Technician[]; message?: string }>('/manager/technicians', {
          params: report.department ? { department: report.department } : {},
        }),
        api.get<{ data: AiSuggestion }>(`/manager/reports/${report.ticketNumber}/ai-suggestions`),
      ]);
      setTechnicians(result.data.data);
      setSuggestion(aiResult.data.data);
      setFinalPriority(aiResult.data.data.priority);
      setSelected({ ...report, priority: aiResult.data.data.priority });
      if (!result.data.data.length)
        setMessage(result.data.message ?? 'No eligible technicians are available.');
    } catch {
      setMessage('Eligible technicians could not be loaded.');
    }
  };
  const assign = async () => {
    if (!selected || !technicianId) return;
    setSaving(true);
    try {
      await api.post(`/manager/reports/${selected.ticketNumber}/assignments`, { technicianId });
      setMessage('Assignment saved. No notification was sent.');
      await loadReports();
    } catch {
      setMessage('The assignment could not be saved. Recheck technician eligibility.');
    } finally {
      setSaving(false);
    }
  };
  const reanalyze = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage('');
    try {
      await api.post(`/manager/reports/${selected.ticketNumber}/reanalyze`);
      setMessage('AI analysis completed. Review the refreshed suggestions below.');
      await choose(selected);
    } catch {
      setMessage(
        'AI analysis could not be completed. Confirm the backend is running and OpenAI is configured.',
      );
    } finally {
      setSaving(false);
    }
  };
  const savePriority = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage('');
    try {
      await api.patch(`/manager/reports/${selected.ticketNumber}/review`, {
        priority: finalPriority,
        note: `Administrator set the final priority to ${finalPriority}.`,
        visibleToCustomer: true,
      });
      setMessage('Final priority saved. The customer can see this update.');
      await loadReports();
      setSelected({ ...selected, priority: finalPriority });
    } catch {
      setMessage('The final priority could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      id="assign-reports"
      className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <UserPlus className="text-indigo-600" size={20} />
        <h2 className="text-xl font-extrabold">Assign reports</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Choose a report, then confirm an eligible available technician.
      </p>
      {message && (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          {message}
        </p>
      )}
      {loading ? (
        <div className="grid h-28 place-items-center">
          <LoaderCircle className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {reports
            .filter((report) => !['Resolved', 'Closed'].includes(report.status))
            .map((report) => (
              <button
                key={report.ticketNumber}
                onClick={() => void choose(report)}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-300"
              >
                <span>
                  <b>{report.ticketNumber}</b>
                  <span className="ml-2">{report.title}</span>
                  <small className="ml-2 text-slate-500">
                    {report.department ?? 'No department'}
                  </small>
                </span>
                <span className="text-sm text-slate-500">
                  {report.assignedTo?.name ?? 'Unassigned'}
                </span>
              </button>
            ))}
        </div>
      )}
      {selected && (
        <div className="mt-5 rounded-xl bg-indigo-50 p-4">
          <p className="font-bold">Assign {selected.ticketNumber}</p>
          <button
            disabled={saving}
            onClick={() => void reanalyze()}
            className="mt-3 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Analyzing…' : 'Re-analyze with AI'}
          </button>
          {suggestion && (
            <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                AI review · {suggestion.analysis.suggestedPriority}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Customer risk</p>
                  <p className="mt-1 font-extrabold text-slate-800">{suggestion.reportedRisk}</p>
                </div>
                <div className="rounded-lg bg-indigo-50 p-3">
                  <p className="text-xs font-bold uppercase text-indigo-600">AI recommendation</p>
                  <p className="mt-1 font-extrabold text-indigo-800">
                    {suggestion.analysis.suggestedPriority}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs font-bold uppercase text-amber-700">
                    Current final priority
                  </p>
                  <p className="mt-1 font-extrabold text-amber-900">{suggestion.priority}</p>
                </div>
              </div>
              <p className="mt-1 font-bold text-slate-800">{suggestion.analysis.summary}</p>
              <p className="mt-2 text-sm text-slate-600">
                {suggestion.analysis.priorityExplanation}
              </p>
              <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <b>AI comparison:</b> {suggestion.analysis.reportedRiskComparison}
              </p>
              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 sm:flex-row sm:items-end">
                <label className="flex-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                  Administrator final priority
                  <select
                    className="input mt-1 bg-white normal-case text-slate-800"
                    value={finalPriority}
                    onChange={(event) => setFinalPriority(event.target.value)}
                  >
                    {['Low', 'Medium', 'High', 'Critical'].map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={saving || finalPriority === suggestion.priority}
                  onClick={() => void savePriority()}
                  className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  Save final priority
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Suggested action: {suggestion.analysis.suggestedAction}
              </p>
              {suggestion.candidates.length ? (
                <div className="mt-3">
                  <p className="text-sm font-bold">Recommended technicians</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestion.candidates.map((candidate) => (
                      <button
                        key={candidate._id}
                        onClick={() => setTechnicianId(candidate._id)}
                        className={`rounded-lg px-3 py-2 text-sm font-bold ${technicianId === candidate._id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}
                      >
                        {candidate.name} · {candidate.skills.join(', ')}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  AI found no eligible registered technician candidate.
                </p>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              className="input"
              value={technicianId}
              onChange={(event) => setTechnicianId(event.target.value)}
            >
              <option value="">Select an eligible technician</option>
              {technicians.map((technician) => (
                <option key={technician._id} value={technician._id}>
                  {technician.name} — {technician.department ?? 'No department'}
                  {technician.skills.length ? ` (${technician.skills.join(', ')})` : ''}
                </option>
              ))}
            </select>
            <button
              disabled={!technicianId || saving}
              onClick={() => void assign()}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Confirm assignment'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

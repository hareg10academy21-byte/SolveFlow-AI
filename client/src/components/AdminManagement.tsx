import { useEffect, useState } from 'react';
import { Activity, LoaderCircle, RefreshCw, Save, UsersRound } from 'lucide-react';
import { api } from '../services/auth';
import type { UserRole } from '../types/auth';
import { TechnicianRegistration } from './TechnicianRegistration';

interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  department: string | null;
  skills: string[];
  available: boolean;
}
interface AuditEntry {
  _id: string;
  action: string;
  createdAt: string;
  actor?: { name: string };
  targetUser?: { name: string };
}

export function AdminManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [userResult, auditResult] = await Promise.all([
        api.get<{ data: ManagedUser[] }>('/admin/users'),
        api.get<{ data: AuditEntry[] }>('/admin/audit-log'),
      ]);
      setUsers(userResult.data.data);
      setAudit(auditResult.data.data);
    } catch {
      setError('User management data could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateLocal = (id: string, change: Partial<ManagedUser>) => {
    setUsers((current) => current.map((user) => (user._id === id ? { ...user, ...change } : user)));
  };

  const saveUser = async (user: ManagedUser) => {
    setSaving(user._id);
    setNotice('');
    try {
      const result = await api.patch<{ data: ManagedUser }>(`/admin/users/${user._id}`, {
        role: user.role,
        active: user.active,
        department: user.department?.trim() || null,
        skills: user.skills,
        available: user.available,
      });
      updateLocal(user._id, result.data.data);
      setNotice(`Saved changes for ${user.name}.`);
      const auditResult = await api.get<{ data: AuditEntry[] }>('/admin/audit-log');
      setAudit(auditResult.data.data);
    } catch {
      setError(`Changes for ${user.name} were not saved. Check your permissions and try again.`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="text-indigo-600" size={20} />
              <h2 className="text-xl font-extrabold">User and technician management</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Changes apply only to records in your authorized workspace.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="rounded-xl bg-slate-50 p-2.5 text-slate-500"
            aria-label="Refresh users"
          >
            <RefreshCw size={17} />
          </button>
        </div>
        {notice && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}
        {loading ? (
          <div className="grid h-48 place-items-center">
            <LoaderCircle className="animate-spin text-indigo-600" />
          </div>
        ) : users.length ? (
          <div className="mt-5 space-y-4">
            {users.map((user) => (
              <article key={user._id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-800">{user.name}</h3>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={user.active}
                      onChange={(event) => updateLocal(user._id, { active: event.target.checked })}
                    />{' '}
                    Active
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Role
                    <select
                      className="input mt-1"
                      value={user.role}
                      onChange={(event) =>
                        updateLocal(user._id, { role: event.target.value as UserRole })
                      }
                    >
                      {(['customer', 'technician', 'admin'] as UserRole[]).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Department
                    <input
                      className="input mt-1"
                      value={user.department ?? ''}
                      onChange={(event) =>
                        updateLocal(user._id, { department: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">
                    Skills (comma-separated)
                    <input
                      className="input mt-1"
                      value={user.skills.join(', ')}
                      onChange={(event) =>
                        updateLocal(user._id, {
                          skills: event.target.value
                            .split(',')
                            .map((skill) => skill.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={user.available}
                      onChange={(event) =>
                        updateLocal(user._id, { available: event.target.checked })
                      }
                    />{' '}
                    Available for assignment
                  </label>
                  <button
                    disabled={saving === user._id}
                    onClick={() => void saveUser(user)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {saving === user._id ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}{' '}
                    Save
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            There are no user records in your authorized workspace yet.
          </p>
        )}
        <TechnicianRegistration onCreated={load} />
      </div>
      <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity className="text-indigo-600" size={19} />
          <h2 className="font-extrabold">Audit log</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">Recent administrative changes.</p>
        <div className="mt-5 space-y-4">
          {audit.length ? (
            audit.slice(0, 10).map((entry) => (
              <div key={entry._id} className="border-l-2 border-indigo-200 pl-3">
                <p className="text-sm font-bold text-slate-700">
                  {entry.action.replaceAll('_', ' ')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {entry.actor?.name ?? 'Administrator'} updated{' '}
                  {entry.targetUser?.name ?? 'a user'}
                </p>
                <time className="mt-1 block text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No administrative actions are recorded yet.</p>
          )}
        </div>
      </aside>
    </section>
  );
}

import { useState, type FormEvent } from 'react';
import { LoaderCircle, UserPlus } from 'lucide-react';
import { api } from '../services/auth';

export function TechnicianRegistration({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [skills, setSkills] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const skillList = skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
    if (password.length < 10 || !department.trim() || !skillList.length) {
      setMessage('Use a 10-character password and provide department and at least one skill.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/technicians', {
        name,
        email,
        password,
        department: department.trim(),
        skills: skillList,
      });
      setName('');
      setEmail('');
      setPassword('');
      setDepartment('');
      setSkills('');
      setMessage('Technician account created. Share the credentials securely.');
      await onCreated();
    } catch (cause: unknown) {
      const text =
        typeof cause === 'object' && cause && 'response' in cause
          ? (cause as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setMessage(text ?? 'Technician account could not be created.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
      <div className="flex items-center gap-2">
        <UserPlus className="text-indigo-600" size={19} />
        <h2 className="font-extrabold">Register technician</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Only administrators can create technician accounts and define their assignment skills.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full name"
        />
        <input
          className="input"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
        />
        <input
          className="input"
          required
          type="password"
          minLength={10}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Temporary password"
        />
        <input
          className="input"
          required
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          placeholder="Department, e.g. Facilities"
        />
        <input
          className="input sm:col-span-2"
          required
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          placeholder="Skills, comma-separated: lighting, electrical"
        />
        <button
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? <LoaderCircle className="animate-spin" size={16} /> : <UserPlus size={16} />}
          Create technician
        </button>
      </form>
      {message && <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
    </section>
  );
}

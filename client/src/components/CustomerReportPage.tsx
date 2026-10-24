import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoaderCircle, Paperclip, Send } from 'lucide-react';
import { createCustomerReport } from '../services/api';
import type { TicketPriority } from '../types/ticket';

export function CustomerReportPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [reportedRisk, setReportedRisk] = useState<TicketPriority>('Medium');
  const [image, setImage] = useState<File>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (title.trim().length < 4 || description.trim().length < 10 || location.trim().length < 2) {
      setError('Add a clear title, location, and description.');
      return;
    }
    if (image && !['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
      setError('Attach a JPEG, PNG, or WebP image.');
      return;
    }
    if (image && image.size > 5 * 1024 * 1024) {
      setError('Image files must be 5 MB or smaller.');
      return;
    }
    setSaving(true);
    try {
      await createCustomerReport({ title, description, location, department, reportedRisk, image });
      navigate('/dashboard/customer');
    } catch {
      setError('We could not submit the report. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="min-h-screen bg-[#f7f8fc] p-5 sm:p-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/dashboard/customer" className="text-sm font-bold text-slate-500">
          ← Back to my dashboard
        </Link>
        <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200">
          <div className="bg-gradient-to-r from-indigo-700 to-violet-700 p-8 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-200">
              New report
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">Tell us what needs attention.</h1>
          </div>
          <form onSubmit={submit} className="space-y-5 p-8">
            <label className="block text-sm font-bold">
              Problem title
              <input
                className="input mt-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm font-bold">
              Location
              <input
                className="input mt-2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Building, floor, room, or landmark"
              />
            </label>
            <label className="block text-sm font-bold">
              Department (optional)
              <input
                className="input mt-2"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </label>
            <label className="block text-sm font-bold">
              Your perceived urgency
              <select
                className="input mt-2"
                value={reportedRisk}
                onChange={(e) => setReportedRisk(e.target.value as TicketPriority)}
              >
                <option value="Low">Low — small issue, no immediate impact</option>
                <option value="Medium">Medium — needs attention soon</option>
                <option value="High">High — disrupting work or service</option>
                <option value="Critical">Critical — immediate safety or major outage</option>
              </select>
              <span className="mt-1 block text-xs font-medium text-slate-500">
                This helps the administrator understand your concern. AI and an administrator set
                the final priority.
              </span>
            </label>
            <label className="block text-sm font-bold">
              Description
              <textarea
                className="input mt-2 resize-none"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block text-sm font-bold">
              Image attachment (optional)
              <span className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm font-medium text-slate-500">
                <Paperclip size={17} />
                {image?.name ?? 'JPEG, PNG, or WebP up to 5 MB'}
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setImage(e.target.files?.[0])}
                />
              </span>
            </label>
            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {error}
              </p>
            )}
            <button
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
              Submit report
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

import { useState, type FormEvent } from 'react';
import { ArrowRight, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 10) {
      setError('Use a password with at least 10 characters.');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password, 'customer');
    } catch (cause: unknown) {
      const message =
        typeof cause === 'object' && cause && 'response' in cause
          ? (cause as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      const networkFailure =
        typeof cause === 'object' && cause && 'code' in cause
          ? (cause as { code?: string }).code === 'ERR_NETWORK'
          : false;
      setError(
        message ??
          (networkFailure
            ? 'The API server is unavailable. Configure server/.env and start MongoDB, then restart npm run dev.'
            : 'We could not complete that request. Please try again.'),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="grid min-h-screen bg-slate-950 p-5 lg:grid-cols-2">
      <section className="hidden flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <Sparkles />
          </div>
          <p className="text-xl font-extrabold">SolveFlow AI</p>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-200">
            A clearer way to resolve work
          </p>
          <h1 className="mt-4 max-w-lg text-5xl font-extrabold leading-tight">
            Every problem has an owner, a next step, and an outcome.
          </h1>
          <p className="mt-6 max-w-md leading-7 text-indigo-100">
            Report issues, review AI suggestions, and keep your team moving with one shared
            workflow.
          </p>
        </div>
        <p className="text-sm text-indigo-200">Secure, role-aware operations workspace</p>
      </section>
      <section className="flex items-center justify-center bg-white lg:bg-transparent">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl shadow-slate-950/15 sm:p-10">
          <div className="lg:hidden">
            <p className="text-xl font-extrabold">
              SolveFlow <span className="text-indigo-600">AI</span>
            </p>
          </div>
          <p className="mt-7 text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            {mode === 'login' ? 'Sign in to your workspace' : 'Start reporting with clarity'}
          </h2>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'register' && (
              <>
                <label className="block text-sm font-bold text-slate-700">
                  Full name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    className="input mt-2"
                    placeholder="Your name"
                  />
                </label>
                <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
                  Customer account registration. Technician and administrator accounts are created
                  only by an administrator.
                </p>
              </>
            )}
            <label className="block text-sm font-bold text-slate-700">
              Email address
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                className="input mt-2"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                minLength={10}
                className="input mt-2"
                placeholder="At least 10 characters"
              />
            </label>
            {error && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </p>
            )}
            <button
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} />
              )}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="mt-6 w-full text-sm font-semibold text-slate-500 hover:text-indigo-700"
          >
            {mode === 'login'
              ? 'New to SolveFlow AI? Create an account'
              : 'Already have an account? Sign in'}
          </button>
          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} />
            Your session is protected with secure cookies.
          </p>
        </div>
      </section>
    </main>
  );
}

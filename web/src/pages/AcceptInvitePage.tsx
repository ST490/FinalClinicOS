import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">{label}</label>
    {children}
  </div>
);

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { acceptInvite } = useAuth();

  const [form, setForm] = useState({
    token: '',
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';
    setForm(prev => ({
      ...prev,
      token,
      email,
    }));
  }, [searchParams]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!form.password) {
      setError('Please choose a password.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await acceptInvite({
        token: form.token,
        name: form.name,
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to set password and accept invitation. Please verify details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none";
  const disabledInputCls = "w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-sidebar text-text-muted cursor-not-allowed outline-none opacity-80";

  return (
    <div className="min-h-screen flex bg-surface-sidebar font-sans w-full">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md space-y-7">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/lockup/lockup-horizontal-light.png" alt="CareMe Logo" className="h-9 object-contain" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Finish setting up your account</h2>
            <p className="text-sm text-text-secondary">Create a password and specify your name to complete onboarding</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3.5 bg-success-500/10 border border-success-500/20 rounded-lg text-success-600 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" /><span>Account configured! Logging you in...</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Email Address">
              <input type="email" value={form.email} disabled className={disabledInputCls} />
            </Field>

            <Field label="Invitation Token (Temporary Password)">
              <input type="text" value={form.token} disabled className={disabledInputCls} />
            </Field>

            <Field label="Your Full Name">
              <input type="text" value={form.name} onChange={update('name')} placeholder="Dr. Sarah Chen" className={inputCls} required />
            </Field>

            <Field label="Choose Password (min 8 chars)">
              <input type="password" value={form.password} onChange={update('password')} placeholder="••••••••" className={inputCls} required />
            </Field>

            <Field label="Confirm Password">
              <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="••••••••" className={inputCls} required />
            </Field>

            <button type="submit" disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configuring Account…</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Set Password & Sign In</span>
                </>
              )}
            </button>

            <div className="pt-3 text-center border-t border-border">
              <span className="text-xs text-text-muted">Need help? </span>
              <Link to="/login" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                Go back to login
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Right: Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 text-white relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="relative max-w-lg px-8 text-center space-y-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-lg">
            <img src="/mark/mark-white-outlined.png" className="w-8 h-8 object-contain" alt="CareMe" />
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-extrabold tracking-tight">Welcome to Careme</h3>
            <p className="text-base text-primary-200/90 leading-relaxed font-light">
              You've been added to your organization branch. Once you choose a password, you can access your dashboard instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

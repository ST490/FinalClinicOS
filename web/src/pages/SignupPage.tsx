import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert, UserPlus } from 'lucide-react';

const COUNTRIES = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SG', label: 'Singapore' },
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">{label}</label>
    {children}
  </div>
);

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
    name: '',
    orgName: '',
    country: 'IN',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password || !form.name || !form.orgName) {
      setError('Fill in email, password, your name, and the clinic name.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        name: form.name,
        orgName: form.orgName,
        country: form.country,
      });
      // Fresh signup → master has no clinic yet → onboarding (Phase 2 wires this properly)
      navigate('/');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Sign up failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none";

  return (
    <div className="min-h-screen flex bg-surface-sidebar font-sans w-full">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md space-y-7">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/lockup/lockup-horizontal-light.png" alt="CareMe Logo" className="h-9 object-contain" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Create your clinic account</h2>
            <p className="text-sm text-text-secondary">You'll become the org owner — invite staff after signup</p>
         </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" /><span>{error}</span>
           </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Clinic / Organization Name">
              <input type="text" value={form.orgName} onChange={update('orgName')} placeholder="Apex Medical Group"
                className={inputCls} />
           </Field>

            <Field label="Your Name">
              <input type="text" value={form.name} onChange={update('name')} placeholder="Dr. Aris Thorne"
                className={inputCls} />
           </Field>

            <Field label="Email Address">
              <input type="email" value={form.email} onChange={update('email')} placeholder="you@clinic.com"
                className={inputCls} />
           </Field>

            <Field label="Phone (optional)">
              <input type="tel" value={form.phone} onChange={update('phone')} placeholder="+91 90000 00001"
                className={inputCls} />
           </Field>

            <Field label="Country">
              <select value={form.country} onChange={update('country')} className={inputCls}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
             </select>
           </Field>

            <Field label="Password (min 8 chars)">
              <input type="password" value={form.password} onChange={update('password')} placeholder="••••••••"
                className={inputCls} />
           </Field>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
           </button>

            <div className="pt-3 text-center border-t border-border">
              <span className="text-xs text-text-muted">Already have an account?</span>
              <Link to="/login" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                Sign in
             </Link>
           </div>
         </form>
       </div>
     </div>

      {/* Right: Brand panel — same as login */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 text-white relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="relative max-w-lg px-8 text-center space-y-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-lg">
            <img src="/mark/mark-white-outlined.png" className="w-8 h-8 object-contain" alt="CareMe" />
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-extrabold tracking-tight">Start your clinic in minutes</h3>
            <p className="text-base text-primary-200/90 leading-relaxed font-light">
              One signup creates your organization, your first clinic, and your master account — no sales calls, no setup fees.
           </p>
         </div>
       </div>
     </div>
   </div>
  );
}

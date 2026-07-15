import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Loader2, CheckCircle2, ShieldAlert, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Real API Login ──
  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res && res.isInviteLogin) {
        navigate(`/accept-invite?token=${res.inviteToken}&email=${res.email}`);
        return;
      }
      navigate('/');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Check your credentials and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-sidebar font-sans w-full">
      {/* Left: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md space-y-7">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-text-primary tracking-tight">Care<span className="text-primary-600">me</span></span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Welcome back</h2>
            <p className="text-sm text-text-secondary">Sign in to your Careme account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRealLogin}>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
              <strong>Tip</strong> Use the credentials from your seeded database
              (e.g. <code className="bg-blue-100 px-1 rounded">doctor@apexmedical.com</code> /
              <code className="bg-blue-100 px-1 rounded">password123</code>)
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@clinic.com"
                className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {/* Sign Up CTA */}
            <div className="pt-3 text-center border-t border-border">
              <span className="text-xs text-text-muted">Don't have an account</span>
              <Link
                to="/signup"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 mt-2"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create your clinic account
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
            <Stethoscope className="w-8 h-8 text-primary-400" />
         </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-extrabold tracking-tight">Enterprise Multi-Tenant Careme</h3>
            <p className="text-base text-primary-200/90 leading-relaxed font-light">
              Empower your clinic chains, doctors, pharmacists, and front desk operators with a unified, role-based ecosystem.
           </p>
         </div>
          <div className="grid grid-cols-2 gap-4 pt-4 text-left">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-primary-400 mb-2" />
              <p className="text-xs text-primary-300 font-semibold uppercase tracking-wider">Deployments</p><p className="text-xl font-bold">10,000+ Clinics</p>
           </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-primary-400 mb-2" />
              <p className="text-xs text-primary-300 font-semibold uppercase tracking-wider">Compliance</p><p className="text-xl font-bold">HIPAA & GDPR</p>
           </div>
         </div>
       </div>
     </div>
   </div>
  );
}

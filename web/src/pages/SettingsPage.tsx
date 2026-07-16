import { useEffect, useState, type FormEvent } from 'react';
import { User, Shield, LogOut, Building2, Check, Loader2, Sun, Moon, Monitor, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authApi, type UserProfile } from '../lib/auth';

export default function SettingsPage() {
  const { user, clinic, clinics, switchClinic, refreshClinics } = useAuth();
  const { mode, setMode } = useTheme();

  const canManageClinics = user?.role === 'MASTER' || user?.role === 'SUB_MASTER';

  // Clinic management (MASTER + branch manager only — no delete)
  const [newClinicName, setNewClinicName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const handleAddClinic = async (e: FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim()) return;
    setIsAdding(true);
    setAddError('');
    try {
      await authApi.createClinic({ name: newClinicName.trim() });
      setNewClinicName('');
      await refreshClinics();
    } catch (err: any) {
      setAddError(err?.response?.data?.error?.message || err.message || 'Failed to add clinic');
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setEditError('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSavingEdit(true);
    setEditError('');
    try {
      await authApi.updateClinic(id, { name: editName.trim() });
      setEditingId(null);
      await refreshClinics();
    } catch (err: any) {
      setEditError(err?.response?.data?.error?.message || err.message || 'Failed to rename clinic');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 2FA setup flow
  const [twoFA, setTwoFA] = useState<{ qrCodeUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [twoFABusy, setTwoFABusy] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFADone, setTwoFADone] = useState(false);

  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutDone, setLogoutDone] = useState(false);

  useEffect(() => {
    let active = true;
    authApi.me()
      .then((p) => { if (active) setProfile(p); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const startSetup2FA = async () => {
    setTwoFAError('');
    setTwoFABusy(true);
    try {
      const res = await authApi.setup2FA();
      setTwoFA({ qrCodeUrl: res.qrCodeUrl });
    } catch {
      setTwoFAError('Could not start 2FA setup. Try again.');
    } finally {
      setTwoFABusy(false);
    }
  };

  const confirm2FA = async () => {
    setTwoFAError('');
    setTwoFABusy(true);
    try {
      await authApi.verify2FA(code.trim());
      setTwoFADone(true);
      setTwoFA(null);
      setCode('');
      setProfile((p) => (p ? { ...p, twoFactorEnabled: true } : p));
    } catch {
      setTwoFAError('Invalid code. Check your authenticator app and try again.');
    } finally {
      setTwoFABusy(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Log out of all other devices? You will stay signed in here.')) return;
    setLogoutBusy(true);
    try {
      await authApi.logoutAll();
      setLogoutDone(true);
    } catch {
      // non-fatal
    } finally {
      setLogoutBusy(false);
    }
  };

  const twoFactorEnabled = profile?.twoFactorEnabled ?? false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your profile, security, and active clinic.</p>
      </div>

      {/* Profile */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-text-secondary" />
          <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
        </div>
        {loading ? (
          <p className="text-sm text-text-muted">Loading profile…</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-text-muted">Name</dt>
              <dd className="text-text-primary font-medium mt-0.5">{profile?.name || user?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd className="text-text-primary font-medium mt-0.5">{profile?.email || user?.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Phone</dt>
              <dd className="text-text-primary font-medium mt-0.5">{profile?.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Role</dt>
              <dd className="text-text-primary font-medium mt-0.5">
                {profile?.isOrgOwner ? 'Organization Owner' : (user?.roleLabel || '—')}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {/* Appearance */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Moon className="w-5 h-5 text-text-secondary" />
          <h2 className="text-lg font-semibold text-text-primary">Appearance</h2>
        </div>
        <p className="text-sm text-text-secondary mb-3">Choose how the dashboard looks.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { value: 'light', label: 'Light', icon: Sun, hint: 'Always light' },
            { value: 'dark', label: 'Dark', icon: Moon, hint: 'Always dark' },
            { value: 'system', label: 'System', icon: Monitor, hint: 'Match OS' },
            { value: 'night', label: 'Auto at night', icon: Clock, hint: 'Dark 7pm–7am' },
          ] as const).map((opt) => {
            const active = mode === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  active
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-border bg-surface-card hover:border-primary-300'
                }`}
              >
                <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                  active ? 'text-primary-700' : 'text-text-primary'
                }`}>
                  <Icon className="w-4 h-4" /> {opt.label}
                </span>
                <span className="text-[11px] text-text-muted">{opt.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active clinic */}
      {clinics.length > 0 && (
        <section className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Active clinic</h2>
          </div>
          <p className="text-sm text-text-secondary mb-3">Switch which clinic you are currently working in.</p>
          <select
            value={clinic?.id ?? ''}
            onChange={(e) => {
              const next = clinics.find((c) => c.id === e.target.value) ?? null;
              switchClinic(next);
            }}
            className="w-full sm:w-80 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary"
          >
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </section>
      )}

      {/* Clinics — MASTER + branch manager only (create/update, no delete) */}
      {canManageClinics && (
        <section className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Clinics</h2>
          </div>
          <p className="text-sm text-text-secondary mb-4">Add a clinic or rename an existing one.</p>

          <ul className="space-y-2 mb-4">
            {clinics.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                {editingId === c.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary"
                    />
                    <button
                      onClick={() => handleSaveEdit(c.id)}
                      disabled={isSavingEdit}
                      className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {isSavingEdit ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 rounded-lg border border-border text-sm text-text-primary hover:bg-surface"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-text-primary">{c.name}</span>
                    <button
                      onClick={() => startEdit(c.id, c.name)}
                      className="px-3 py-2 rounded-lg border border-border text-sm text-text-primary hover:bg-surface"
                    >
                      Rename
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {editError && <p className="text-sm text-red-600 mb-3">{editError}</p>}

          <form onSubmit={handleAddClinic} className="flex items-center gap-2">
            <input
              value={newClinicName}
              onChange={(e) => setNewClinicName(e.target.value)}
              placeholder="New clinic name"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary"
            />
            <button
              type="submit"
              disabled={isAdding || !newClinicName.trim()}
              className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {isAdding ? 'Adding…' : 'Add clinic'}
            </button>
          </form>
          {addError && <p className="text-sm text-red-600 mt-3">{addError}</p>}
        </section>
      )}

      {/* Security */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-text-secondary" />
          <h2 className="text-lg font-semibold text-text-primary">Security</h2>
        </div>

        {/* 2FA */}
        <div className="border-b border-border pb-5 mb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Two-factor authentication</p>
              <p className="text-sm text-text-secondary mt-0.5">
                {twoFactorEnabled || twoFADone
                  ? 'Enabled — your account is protected with an authenticator app.'
                  : 'Add an extra layer of security using an authenticator app.'}
              </p>
            </div>
            {twoFactorEnabled || twoFADone ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 shrink-0">
                <Check className="w-4 h-4" /> Enabled
              </span>
            ) : (
              !twoFA && (
                <button
                  onClick={startSetup2FA}
                  disabled={twoFABusy}
                  className="shrink-0 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {twoFABusy ? 'Starting…' : 'Enable 2FA'}
                </button>
              )
            )}
          </div>

          {twoFA && !twoFADone && (
            <div className="mt-4 flex flex-col items-start gap-3">
              <p className="text-sm text-text-secondary">
                Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
              </p>
              <img src={twoFA.qrCodeUrl} alt="2FA QR code" className="w-40 h-40 rounded-lg border border-border" />
              <div className="flex items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="w-32 px-3 py-2 rounded-lg border border-border bg-surface text-sm tracking-widest text-text-primary"
                />
                <button
                  onClick={confirm2FA}
                  disabled={twoFABusy || code.trim().length < 6}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {twoFABusy ? 'Verifying…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {twoFAError && <p className="text-sm text-red-600 mt-3">{twoFAError}</p>}
        </div>

        {/* Sessions */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Active sessions</p>
            <p className="text-sm text-text-secondary mt-0.5">
              Sign out of every other device where you are logged in.
            </p>
          </div>
          {logoutDone ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 shrink-0">
              <Check className="w-4 h-4" /> Done
            </span>
          ) : (
            <button
              onClick={handleLogoutAll}
              disabled={logoutBusy}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-surface disabled:opacity-50"
            >
              {logoutBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Log out all devices
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

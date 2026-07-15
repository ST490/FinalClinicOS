import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ShieldAlert } from 'lucide-react';

const DEMO_USERS = [
  { role: 'MASTER',       email: 'master@apexmedical.com',    name: 'Dr. Aris Thorne (CEO)',         color: 'from-amber-500 to-orange-600' },
  { role: 'SUB_MASTER',   email: 'submaster@apexmedical.com', name: 'Dr. Emily Chen (Manager)',      color: 'from-blue-500 to-indigo-600' },
  { role: 'DOCTOR',       email: 'doctor@apexmedical.com',    name: 'Dr. Eleanor Vance (Doctor)',    color: 'from-teal-500 to-emerald-600' },
  { role: 'NURSE',        email: 'nurse@apexmedical.com',     name: 'Nurse Sarah L. (Nurse)',       color: 'from-purple-500 to-indigo-600' },
  { role: 'PHARMACIST',   email: 'pharmacist@apexmedical.com',name: 'Dr. Evelyn Reed (Pharmacist)', color: 'from-pink-500 to-rose-600' },
  { role: 'RECEPTIONIST', email: 'receptionist@apexmedical.com',name: 'Sarah J. (Front Desk)',       color: 'from-sky-400 to-blue-500' },
  { role: 'HR',           email: 'hr@apexmedical.com',        name: 'Sarah Jenkins (HR Manager)',    color: 'from-violet-500 to-purple-600' },
] as const;

export default function DemoSwitcher() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSwitch = async (email: string) => {
    setIsSwitching(email);
    setError('');
    try {
      await login(email, 'password123');
      navigate('/');
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      setError('Switch failed. Is database seeded?');
    } finally {
      setIsSwitching(null);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-3 font-sans">
      {/* Popover list */}
      {isOpen && (
        <div className="w-80 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-2xl animate-fade-in transition-all">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary-500 animate-pulse" />
              <span className="text-sm font-bold text-slate-800">Demo Accounts Switcher</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-2 p-2 bg-danger/10 border border-danger/20 rounded-lg text-danger text-[11px] flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {DEMO_USERS.map((u) => {
              const active = isSwitching === u.email;
              return (
                <button
                  key={u.email}
                  onClick={() => handleSwitch(u.email)}
                  disabled={!!isSwitching}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-left bg-slate-50 hover:bg-primary-50/50 hover:scale-[1.01] transition-all border border-slate-100 hover:border-primary-100 group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${u.color} flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:shadow-md transition-shadow shrink-0`}>
                      {u.role.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  {active && (
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer font-semibold text-xs`}
      >
        {isOpen ? (
          <>
            <X className="w-4 h-4" />
            <span>Close Switcher</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Demo Switcher</span>
          </>
        )}
      </button>
    </div>
  );
}

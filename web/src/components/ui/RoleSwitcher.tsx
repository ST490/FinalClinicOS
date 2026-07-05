import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Shield } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { roleLabels } from '../../mockData';
import type { UserRole } from '../../types';

const roles: UserRole[] = [
  'MASTER',
  'SUB_MASTER',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'RECEPTIONIST',
  'HR',
];

const roleColors: Record<UserRole, string> = {
  MASTER: 'bg-purple-100 text-purple-700',
  SUB_MASTER: 'bg-blue-100 text-blue-700',
  DOCTOR: 'bg-teal-100 text-teal-700',
  NURSE: 'bg-pink-100 text-pink-700',
  PHARMACIST: 'bg-amber-100 text-amber-700',
  RECEPTIONIST: 'bg-indigo-100 text-indigo-700',
  HR: 'bg-emerald-100 text-emerald-700',
};

export default function RoleSwitcher() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg
          transition-all duration-200 hover:opacity-80
          ${roleColors[role]}
        `}
      >
        <Shield className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{roleLabels[role]}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-surface-card rounded-xl border border-border shadow-lg py-1.5 animate-scale-in z-50">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-widest">
            Switch Role (Demo)
          </p>
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                setOpen(false);
              }}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
                transition-colors hover:bg-surface
                ${role === r ? 'text-primary-700 font-medium bg-primary-50/50' : 'text-text-primary'}
              `}
            >
              <span className={`w-2 h-2 rounded-full ${role === r ? 'bg-primary-500' : 'bg-text-muted/30'}`} />
              {roleLabels[r]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

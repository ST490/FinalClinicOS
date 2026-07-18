import { useLocation, Link } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { navigationByRole } from '../../lib/constants';
import {
  LayoutDashboard, BarChart3, Building2, CreditCard, Users, Package,
  FileBarChart, Settings, UserRound, CalendarDays, Receipt, Palette,
  FileText, Pill, HeartPulse, Bell, AlertTriangle, ShoppingCart,
  UserPlus, ListOrdered, UserCheck, X, Truck,
  FolderOpen, ClipboardList, PersonStanding, CalendarCheck, Banknote,
  CalendarOff, Shield, ClipboardCheck, Clock, LogOut,
  ShieldCheck, Network, UserSearch,
  type LucideIcon,
} from 'lucide-react';

// Map icon name strings to actual Lucide components
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, BarChart3, Building2, CreditCard, Users, Package,
  FileBarChart, Settings, UserRound, CalendarDays, Receipt, Palette,
  FileText, Pill, HeartPulse, Bell, AlertTriangle, ShoppingCart,
  UserPlus, ListOrdered, UserCheck, Truck, FolderOpen, ClipboardList,
  PersonStanding, CalendarCheck, Banknote, CalendarOff, Shield,
  ClipboardCheck, Clock, ShieldCheck, Network, UserSearch,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { role, logout } = useRole();
  const { user: authUser, organization } = useAuth();
  const location = useLocation();
  const navItems = navigationByRole[role];
  const userName = authUser?.name ?? 'User';
  const userRoleLabel = authUser?.roleLabel ?? role;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[260px] bg-surface-sidebar
          border-r border-border flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ boxShadow: 'var(--shadow-sidebar)' }}
      >
        {/* Logo / Brand */}
        <div className="h-16 px-5 border-b border-border-light flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group overflow-hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow shrink-0">
              <img src="/mark/mark-white-outlined.png" className="w-4 h-4 object-contain" alt="" />
            </div>
            <img src="/wordmark/wordmark-standard.png" className="h-5 w-auto dark:hidden" alt="CareMe" />
            <img src="/wordmark/wordmark-allwhite.png" className="h-5 w-auto hidden dark:block" alt="CareMe" />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-surface text-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="stagger-children space-y-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Icon className="sidebar-icon w-[18px] h-[18px] shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`
                        text-xs font-semibold px-2 py-0.5 rounded-full
                        ${item.badge === 'Active'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-danger/10 text-danger'
                        }
                      `}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="px-4 py-4 border-t border-border-light flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{userName}</p>
              <p className="text-xs text-text-muted truncate">{userRoleLabel}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-danger hover:bg-red-50/50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px] text-text-muted group-hover:text-danger" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

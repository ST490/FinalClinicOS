import { useLocation, Link } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import { navigationByRole, usersByRole } from '../../mockData';
import {
  LayoutDashboard, BarChart3, Building2, CreditCard, Users, Package,
  FileBarChart, Settings, UserRound, CalendarDays, Receipt, Palette,
  FileText, Pill, HeartPulse, Bell, AlertTriangle, ShoppingCart,
  UserPlus, ListOrdered, UserCheck, X, Stethoscope, Truck,
  FolderOpen, ClipboardList, PersonStanding, CalendarCheck, Banknote,
  CalendarOff, Shield, ClipboardCheck, Clock, LogOut,
  type LucideIcon,
} from 'lucide-react';

// Map icon name strings to actual Lucide components
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, BarChart3, Building2, CreditCard, Users, Package,
  FileBarChart, Settings, UserRound, CalendarDays, Receipt, Palette,
  FileText, Pill, HeartPulse, Bell, AlertTriangle, ShoppingCart,
  UserPlus, ListOrdered, UserCheck, Truck, FolderOpen, ClipboardList,
  PersonStanding, CalendarCheck, Banknote, CalendarOff, Shield,
  ClipboardCheck, Clock,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { role, logout } = useRole();
  const location = useLocation();
  const navItems = navigationByRole[role];
  const user = usersByRole[role];

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
        <div className="flex items-center justify-between px-5 py-5 border-b border-border-light">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Stethoscope className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-text-primary tracking-tight">
              Clinic<span className="text-primary-600">OS</span>
            </span>
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
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
              <p className="text-xs text-text-muted truncate">{user.roleLabel}</p>
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

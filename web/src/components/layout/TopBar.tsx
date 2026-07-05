import { Search, Bell, Menu } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { usersByRole, mockOrganization } from '../../mockData';
import RoleSwitcher from '../ui/RoleSwitcher';

interface TopBarProps {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const { role } = useRole();
  const user = usersByRole[role];

  return (
    <header className="sticky top-0 z-30 bg-surface-card/80 backdrop-blur-md border-b border-border h-16 flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-surface text-text-secondary transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Org name */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm lg:text-base font-semibold text-text-primary truncate">
          {mockOrganization.name}
        </h2>
      </div>

      {/* Role Switcher (demo) */}
      <RoleSwitcher />

      {/* Search */}
      <div className="hidden md:flex items-center bg-surface rounded-lg border border-border px-3 py-1.5 gap-2 w-56 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-400 transition-all">
        <Search className="w-4 h-4 text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
        />
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-lg hover:bg-surface text-text-secondary transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-surface-card" />
      </button>

      {/* User */}
      <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-border">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
          {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div className="hidden lg:block">
          <p className="text-sm font-medium text-text-primary leading-tight">{user.name}</p>
          <p className="text-xs text-text-muted">{user.roleLabel}</p>
        </div>
      </div>
    </header>
  );
}

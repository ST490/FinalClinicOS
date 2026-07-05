/**
 * RoleContext — reads the current user from localStorage (set by AuthContext)
 * and exposes role/auth state to all components via useRole().
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserRole } from '../types';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

function getStoredRole(): UserRole {
  try {
    const stored = localStorage.getItem('mockUser');
    if (stored) {
      const user = JSON.parse(stored);
      return (user.role as UserRole) || 'MASTER';
    }
  } catch {}
  return 'MASTER';
}

function getStoredAuth(): boolean {
  try {
    return !!localStorage.getItem('mockUser');
  } catch {
    return false;
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(getStoredRole);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getStoredAuth);

  // Sync with storage changes (e.g. login/logout from AuthContext)
  useEffect(() => {
    const handler = () => {
      setRoleState(getStoredRole());
      setIsAuthenticated(getStoredAuth());
    };
    window.addEventListener('storage', handler);
    // Also poll every 500ms for same-tab changes
    const interval = setInterval(handler, 500);
    return () => {
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, []);

  const setRole = (r: UserRole) => {
    try {
      const stored = localStorage.getItem('mockUser');
      if (stored) {
        const user = JSON.parse(stored);
        user.role = r;
        localStorage.setItem('mockUser', JSON.stringify(user));
      }
    } catch {}
    setRoleState(r);
  };

  const login = () => setIsAuthenticated(true);
  const logout = () => {
    localStorage.removeItem('mockUser');
    setIsAuthenticated(false);
    setRoleState('MASTER');
  };

  return (
    <RoleContext.Provider value={{ role, setRole, isAuthenticated, login, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
}

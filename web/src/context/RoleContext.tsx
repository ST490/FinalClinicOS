/**
 * RoleContext — reads role from AuthContext and exposes it via useRole().
 * Kept for backward compatibility with all components that already use useRole().
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { UserRole } from '../types';
import { useAuth } from './AuthContext';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const role = auth.user?.role ?? 'MASTER';

  const setRole = (r: UserRole) => {
    auth.switchRole(r);
  };

  const logout = () => {
    auth.logout();
  };

  // login() is a no-op here — actual login happens via AuthContext
  const login = () => {};

  return (
    <RoleContext.Provider value={{
      role,
      setRole,
      isAuthenticated: auth.isAuthenticated,
      login,
      logout,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
}

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User, Clinic, UserRole } from '../types';
import { mockClinics } from '../mockData';

interface AuthContextType {
  user: User | null;
  clinic: Clinic | null;
  clinics: Clinic[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginMock: (user: { id: string; name: string; email: string; role: UserRole; roleLabel: string }) => void;
  logout: () => void;
  switchClinic: (clinic: Clinic) => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Restore mock session from localStorage
    try {
      const stored = localStorage.getItem('mockUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [clinic, setClinic] = useState<Clinic | null>(mockClinics[0] ?? null);
  const [clinics] = useState<Clinic[]>(mockClinics);

  const loginMock = (userData: { id: string; name: string; email: string; role: UserRole; roleLabel: string }) => {
    const newUser: User = { ...userData };
    localStorage.setItem('mockUser', JSON.stringify(newUser));
    setUser(newUser);
    setClinic(mockClinics[0] ?? null);
  };

  const login = async (_email: string, _password: string) => {
    // Kept for API compatibility — actual login goes through loginMock
    throw new Error('Use loginMock for demo mode');
  };

  const logout = () => {
    localStorage.removeItem('mockUser');
    setUser(null);
    setClinic(null);
  };

  const switchClinic = (c: Clinic) => setClinic(c);
  const switchRole = (role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role };
    localStorage.setItem('mockUser', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{
      user,
      clinic,
      clinics,
      isAuthenticated: !!user,
      isLoading: false,
      login,
      loginMock,
      logout,
      switchClinic,
      switchRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
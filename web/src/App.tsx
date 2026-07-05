import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';
import LoginPage from './pages/LoginPage';
import AppointmentsPage from './pages/AppointmentsPage';
import InventoryPage from './pages/InventoryPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import DuesPage from './pages/DuesPage';
import ReportsPage from './pages/ReportsPage';
import WhitelabelPage from './pages/WhitelabelPage';
import PublicLandingPage from './pages/PublicLandingPage';
import PatientsPage from './pages/PatientsPage';
import { useAuth } from './context/AuthContext';

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><span>Loading...</span></div>;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/public-landing" element={<PublicLandingPage />} />
      <Route element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analytics" element={<PlaceholderPage />} />
        <Route path="/clinics" element={<PlaceholderPage />} />
        <Route path="/billing" element={<DuesPage />} />
        <Route path="/staff" element={<PlaceholderPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<PlaceholderPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/whitelabel" element={<WhitelabelPage />} />
        <Route path="/schedule" element={<AppointmentsPage />} />
        <Route path="/calendar" element={<AppointmentsPage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/clinical-notes" element={<PlaceholderPage />} />
        <Route path="/drugs" element={<PlaceholderPage />} />
        <Route path="/patient-queue" element={<PlaceholderPage />} />
        <Route path="/vitals" element={<PlaceholderPage />} />
        <Route path="/reminders" element={<PlaceholderPage />} />
        <Route path="/patient-records" element={<PlaceholderPage />} />
        <Route path="/incoming-stock" element={<PlaceholderPage />} />
        <Route path="/dispensing" element={<PlaceholderPage />} />
        <Route path="/intake" element={<PatientsPage />} />
        <Route path="/walkins" element={<PatientsPage />} />
        <Route path="/dues" element={<DuesPage />} />
        <Route path="/waitlist" element={<PlaceholderPage />} />
        <Route path="/wait-times" element={<PlaceholderPage />} />
        <Route path="/staff-directory" element={<PlaceholderPage />} />
        <Route path="/attendance" element={<PlaceholderPage />} />
        <Route path="/payroll" element={<PlaceholderPage />} />
        <Route path="/leave-requests" element={<PlaceholderPage />} />
        <Route path="/onboarding" element={<PlaceholderPage />} />
        <Route path="/role-assignments" element={<PlaceholderPage />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoleProvider>
          <AuthenticatedApp />
        </RoleProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
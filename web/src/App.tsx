import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AppointmentsPage from './pages/AppointmentsPage';
import DispensingPage from './pages/DispensingPage';
import InventoryPage from './pages/InventoryPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import DuesPage from './pages/DuesPage';
import ReportsPage from './pages/ReportsPage';
import WhitelabelPage from './pages/WhitelabelPage';
import PublicLandingPage from './pages/PublicLandingPage';
import PatientsPage from './pages/PatientsPage';
import StaffPage from './pages/StaffPage';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import StaffDirectoryPage from './pages/StaffDirectoryPage';
import PayrollPage from './pages/PayrollPage';
import SchedulingPage from './pages/SchedulingPage';
import OnboardingPage from './pages/OnboardingPage';
import RoleAssignmentsPage from './pages/RoleAssignmentsPage';
import HrReportsPage from './pages/HrReportsPage';
import CredentialsPage from './pages/CredentialsPage';
import MyHrPage from './pages/MyHrPage';
import EmployeeProfilePage from './pages/EmployeeProfilePage';
import OrgChartPage from './pages/OrgChartPage';
import { useAuth } from './context/AuthContext';
import DemoSwitcher from './components/ui/DemoSwitcher';
import AcceptInvitePage from './pages/AcceptInvitePage';
import { SHOW_DEMO_SWITCHER } from './mockData';

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-sidebar font-sans w-full">
        <div className="flex flex-col items-center space-y-4">
          <img src="/mark/mark-transparent.png" alt="CareMe" className="w-12 h-12 object-contain animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-secondary tracking-wider uppercase">Loading CareMe</span>
            <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route path="/accept-invite" element={isAuthenticated ? <Navigate to="/" replace /> : <AcceptInvitePage />} />
      <Route path="/public-landing" element={<PublicLandingPage />} />
      <Route element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analytics" element={<PlaceholderPage />} />
        <Route path="/billing" element={<DuesPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/whitelabel" element={<WhitelabelPage />} />
        <Route path="/schedule" element={<SchedulingPage />} />
        <Route path="/calendar" element={<AppointmentsPage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/clinical-notes" element={<PlaceholderPage />} />
        <Route path="/drugs" element={<PlaceholderPage />} />
        <Route path="/patient-queue" element={<PlaceholderPage />} />
        <Route path="/vitals" element={<PlaceholderPage />} />
        <Route path="/reminders" element={<PlaceholderPage />} />
        <Route path="/patient-records" element={<PlaceholderPage />} />
        <Route path="/incoming-stock" element={<PlaceholderPage />} />
        <Route path="/dispensing" element={<DispensingPage />} />
        <Route path="/intake" element={<PatientsPage />} />
        <Route path="/walkins" element={<PatientsPage />} />
        <Route path="/dues" element={<DuesPage />} />
        <Route path="/waitlist" element={<PlaceholderPage />} />
        <Route path="/wait-times" element={<PlaceholderPage />} />
        <Route path="/staff-directory" element={<StaffDirectoryPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/leave-requests" element={<LeavePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/role-assignments" element={<RoleAssignmentsPage />} />
        <Route path="/hr-reports" element={<HrReportsPage />} />
        <Route path="/credentials" element={<CredentialsPage />} />
        <Route path="/my-hr" element={<MyHrPage />} />
        <Route path="/employee/:userId" element={<EmployeeProfilePage />} />
        <Route path="/org-chart" element={<OrgChartPage />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Route>
    </Routes>
  );
}

function DemoSwitcherGate() {
  const { email } = useAuth();
  return email === 'kane@gmail.com' ? <DemoSwitcher /> : null;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <RoleProvider>
            <AuthenticatedApp />
            {SHOW_DEMO_SWITCHER && <DemoSwitcherGate />}
          </RoleProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
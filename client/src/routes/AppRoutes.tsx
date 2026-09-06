import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore, { PlatformRole } from '../store/authStore';
import useThemeStore, { applyThemeToDOM } from '../store/themeStore';
import api, { setIsRestoringSession } from '../services/api';
import { Loader2 } from 'lucide-react';

// Helper to retry dynamic imports when a new Vercel build invalidates cached asset hashes
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const hasReloaded = sessionStorage.getItem('chunk_reload_retry');
    try {
      const component = await componentImport();
      sessionStorage.removeItem('chunk_reload_retry');
      return component;
    } catch (error: any) {
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_retry', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
const DashboardLayout = lazyWithRetry(() => import('../layouts/DashboardLayout'));
const Login           = lazyWithRetry(() => import('../pages/Login').then(m => ({ default: m.Login })));
const Register        = lazyWithRetry(() => import('../pages/Register').then(m => ({ default: m.Register })));
const Dashboard       = lazyWithRetry(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Unauthorized    = lazyWithRetry(() => import('../pages/Unauthorized').then(m => ({ default: m.Unauthorized })));
const Leads           = lazyWithRetry(() => import('../pages/Leads').then(m => ({ default: m.Leads })));
const Teams           = lazyWithRetry(() => import('../pages/Teams').then(m => ({ default: m.Teams })));
const ActivityLogs    = lazyWithRetry(() => import('../pages/ActivityLogs').then(m => ({ default: m.ActivityLogs })));
const Deals           = lazyWithRetry(() => import('../pages/Deals').then(m => ({ default: m.Deals })));
const AiAssistant     = lazyWithRetry(() => import('../pages/AiAssistant').then(m => ({ default: m.AiAssistant })));
const TasksPage       = lazyWithRetry(() => import('../pages/TasksPage').then(m => ({ default: m.TasksPage })));
const CalendarPage    = lazyWithRetry(() => import('../pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ReportsPage     = lazyWithRetry(() => import('../pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ProfilePage     = lazyWithRetry(() => import('../pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const Landing         = lazyWithRetry(() => import('../pages/Landing').then(m => ({ default: m.Landing })));
const SuperAdminDashboard = lazyWithRetry(() => import('../pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const UserManagement  = lazyWithRetry(() => import('../pages/UserManagement').then(m => ({ default: m.UserManagement })));
const ForgotPassword  = lazyWithRetry(() => import('../pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const VerifyOTP        = lazyWithRetry(() => import('../pages/VerifyOTP').then(m => ({ default: m.VerifyOTP })));
const ResetPassword   = lazyWithRetry(() => import('../pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const PricingPage     = lazyWithRetry(() => import('../pages/PricingPage').then(m => ({ default: m.PricingPage })));
const PaymentSuccessPage = lazyWithRetry(() => import('../pages/PaymentSuccessPage').then(m => ({ default: m.PaymentSuccessPage })));
const SelectCompany   = lazyWithRetry(() => import('../pages/SelectCompany').then(m => ({ default: m.SelectCompany })));
const CompanySettings = lazyWithRetry(() => import('../pages/CompanySettings').then(m => ({ default: m.CompanySettings })));

// ─── New Join Code System Pages ───────────────────────────────────────────────
const JoinCompanyPage   = lazyWithRetry(() => import('../pages/JoinCompanyPage').then(m => ({ default: m.JoinCompanyPage })));
const PendingApprovalPage = lazyWithRetry(() => import('../pages/PendingApprovalPage').then(m => ({ default: m.PendingApprovalPage })));
const RejectedPage      = lazyWithRetry(() => import('../pages/RejectedPage').then(m => ({ default: m.RejectedPage })));

// ─── Shared Full-Screen Loading Spinner ───────────────────────────────────────
const PageLoadingSpinner = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-bg gap-3">
    <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
    <p className="text-sm font-medium text-brand-textSecondary">Loading...</p>
  </div>
);

// ─── Route Guards ─────────────────────────────────────────────────────────────

/**
 * Requires authentication and ACTIVE status with a company.
 * Redirects based on accountStatus state machine.
 */
const ProtectedRoute = () => {
  const { isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center h-screen bg-brand-bg gap-3">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="text-sm font-medium text-brand-textSecondary">Restoring session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // State machine redirects for non-active users
  const status = user?.accountStatus;
  if (status === 'REJECTED') return <Navigate to="/rejected" replace />;
  if (status === 'PENDING_COMPANY') return <Navigate to="/join-company" replace />;
  if (status === 'PENDING_APPROVAL' || status === 'PENDING') return <Navigate to="/pending-approval" replace />;

  return <Outlet />;
};

/** For Login & Register pages — redirects authenticated users to correct destination */
const GuestRoute = () => {
  const { isLoading, user } = useAuthStore();
  if (isLoading) return <PageLoadingSpinner />;
  if (!user) return <Outlet />;

  // Route authenticated users to correct page based on state
  const status = user?.accountStatus;
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin') return <Navigate to="/super-admin" replace />;
  if (status === 'REJECTED') return <Navigate to="/rejected" replace />;
  if (status === 'PENDING_COMPANY') return <Navigate to="/join-company" replace />;
  if (status === 'PENDING_APPROVAL' || status === 'PENDING') return <Navigate to="/pending-approval" replace />;
  if (user?.companyStatus === 'PENDING') return <Navigate to="/pending-approval" replace />;
  return <Navigate to="/dashboard" replace />;
};

/** RBAC guard — normalizes roles and checks access */
interface RoleGuardProps {
  allowedRoles: (PlatformRole | string)[];
}

const normalizeRole = (r: string): string => {
  if (r === 'SuperAdmin') return 'SUPER_ADMIN';
  if (r === 'Admin') return 'COMPANY_OWNER';
  if (r === 'SalesManager') return 'SALES_MANAGER';
  if (r === 'SalesRep') return 'SALES_REPRESENTATIVE';
  return r;
};

const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  const userRoleNorm = normalizeRole(user.role);
  if (userRoleNorm === 'SUPER_ADMIN') return <Outlet />;

  const allowedNorm = allowedRoles.map(normalizeRole);

  return allowedNorm.includes(userRoleNorm) ? <Outlet /> : <Navigate to="/unauthorized" replace />;
};

/**
 * Route guard for Join System status pages (/join-company, /pending-approval, /rejected).
 * Requires authenticated user session; unauthenticated users are sent to /login.
 */
const JoinSystemRoute = () => {
  const { isLoading, user } = useAuthStore();
  if (isLoading) return <PageLoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const PUBLIC_LIGHT_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-otp',
];

/**
 * Ensures public Landing and Auth (Login/Register/Recovery) pages are NEVER affected by Dark Mode,
 * while restoring the user's selected theme on all other application routes.
 */
const ThemeRouteSynchronizer = () => {
  const location = useLocation();
  const { theme } = useThemeStore();

  useEffect(() => {
    const isPublicLightPage = PUBLIC_LIGHT_ROUTES.includes(location.pathname);
    if (isPublicLightPage) {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } else {
      applyThemeToDOM(theme);
    }
  }, [location.pathname, theme]);

  return null;
};

// ─── App Routes ───────────────────────────────────────────────────────────────

export const AppRoutes = () => {
  const { login, logout, setLoading, isLoading } = useAuthStore();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const restoreSession = async () => {
      setIsRestoringSession(true);
      try {
        const refreshRes = await api.post('/auth/refresh', {}, { timeout: 8000 });
        const { accessToken, user, success } = refreshRes.data;

        if (success && accessToken && user) {
          login(accessToken, user);
          if (import.meta.env.DEV) {
            console.log('[AuthRestore] Session restored for:', user?.email);
          }
        } else {
          logout();
        }
      } catch {
        // Expected when no session exists (401) — silently redirect to login
        logout();
      } finally {
        setIsRestoringSession(false);
        setLoading(false);
      }
    };

    restoreSession();
  }, [login, logout, setLoading]);

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <>
      <ThemeRouteSynchronizer />
      <Suspense fallback={<PageLoadingSpinner />}>
        <Routes>
        {/* Public Landing & Pricing */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/select-company" element={<SelectCompany />} />

        {/* Join Code System — protected for authenticated users */}
        <Route element={<JoinSystemRoute />}>
          <Route path="/join-company" element={<JoinCompanyPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/rejected" element={<RejectedPage />} />
        </Route>

        {/* Guest Only */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Protected Routes — ACTIVE users with companyId only */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

            {/* All authenticated users */}
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/profile"      element={<ProfilePage />} />
            <Route path="/leads"        element={<Leads />} />
            <Route path="/deals"        element={<Deals />} />
            <Route path="/ai-assistant" element={<AiAssistant />} />
            <Route path="/tasks"        element={<TasksPage />} />
            <Route path="/calendar"     element={<CalendarPage />} />

            {/* Company Owner & SuperAdmin */}
            <Route element={<RoleGuard allowedRoles={['COMPANY_OWNER', 'SUPER_ADMIN', 'Admin', 'SuperAdmin']} />}>
              <Route path="/company-settings" element={<CompanySettings />} />
            </Route>

            {/* SuperAdmin Only */}
            <Route element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'SuperAdmin']} />}>
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
            </Route>

            {/* Admin & SuperAdmin */}
            <Route element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin']} />}>
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/teams"      element={<Teams />} />
              <Route path="/activities" element={<ActivityLogs />} />
              <Route path="/admin-settings" element={
                <div className="p-6 bg-white rounded-xl border border-brand-border smooth-shadow">
                  <h1 className="text-xl font-bold text-brand-textPrimary">SuperAdmin & Admin Control Hub</h1>
                  <p className="text-sm text-brand-textSecondary mt-2">
                    This interface handles administrative updates, RBAC mappings, and log settings.
                  </p>
                  <div className="mt-4 p-4 rounded-lg bg-yellow-50 border border-yellow-100 text-yellow-800 text-xs">
                    <strong>Access Logged:</strong> System audit record generated for your current account session.
                  </div>
                </div>
              } />
            </Route>

            {/* Manager, Owner, SuperAdmin */}
            <Route element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'COMPANY_OWNER', 'SALES_MANAGER', 'SuperAdmin', 'Admin', 'SalesManager']} />}>
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </>
  );
};

export default AppRoutes;

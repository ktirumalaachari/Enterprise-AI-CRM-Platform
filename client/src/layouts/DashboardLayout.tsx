import React, { useState, useMemo, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CircleUser,
  GitFork,
  Handshake,
  Sparkles,
  ListTodo,
  CalendarDays,
  BarChart3,
  Users2,
  ScrollText,
  Settings2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Menu,
  ShieldCheck,
  CreditCard,
  Building2,
} from 'lucide-react';
import useAuthStore, { PlatformRole } from '../store/authStore';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import NotificationBell from '../components/notifications/NotificationBell';
import { Logo } from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: (PlatformRole | string)[]; // undefined = visible to all authenticated users
}

const normalizeRole = (r: string): string => {
  if (r === 'SuperAdmin') return 'SUPER_ADMIN';
  if (r === 'Admin') return 'COMPANY_OWNER';
  if (r === 'SalesManager') return 'SALES_MANAGER';
  if (r === 'SalesRep') return 'SALES_REPRESENTATIVE';
  return r;
};

// Full ordered navigation manifest
const NAV_MANIFEST: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Pricing & Plans', path: '/pricing', icon: CreditCard },
  { label: 'Company Settings', path: '/company-settings', icon: Building2, roles: ['COMPANY_OWNER', 'SUPER_ADMIN', 'Admin', 'SuperAdmin'] },
  { label: 'SuperAdmin Hub', path: '/super-admin', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'SuperAdmin'] },
  { label: 'User Management', path: '/user-management', icon: Users2, roles: ['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin'] },
  { label: 'My Profile', path: '/profile', icon: CircleUser },
  { label: 'Leads Pipeline', path: '/leads', icon: GitFork },
  { label: 'Deals Tracker', path: '/deals', icon: Handshake },
  { label: 'AI Copilot', path: '/ai-assistant', icon: Sparkles },
  { label: 'Tasks Manager', path: '/tasks', icon: ListTodo },
  { label: 'Sales Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Executive Reports', path: '/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'COMPANY_OWNER', 'SALES_MANAGER', 'SuperAdmin', 'Admin', 'SalesManager'] },
  { label: 'Team Manager', path: '/teams', icon: Users2, roles: ['SUPER_ADMIN', 'COMPANY_OWNER', 'SALES_MANAGER', 'SuperAdmin', 'Admin', 'SalesManager'] },
  { label: 'Audit Logs', path: '/activities', icon: ScrollText, roles: ['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin'] },
];

export const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { success } = useToast();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filter nav items by current user's role (SUPER_ADMIN sees all items)
  const navItems = useMemo(() => {
    if (!user) return NAV_MANIFEST.filter(item => !item.roles);
    const userRoleNorm = normalizeRole(user.role);
    if (userRoleNorm === 'SUPER_ADMIN') return NAV_MANIFEST;
    return NAV_MANIFEST.filter(item => {
      if (!item.roles) return true;
      const normalizedAllowed = item.roles.map(normalizeRole);
      return normalizedAllowed.includes(userRoleNorm);
    });
  }, [user?.role]);

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore API errors on logout
    } finally {
      logout();
      success('Logged out successfully.');
      window.location.href = '/login';
    }
  }, [logout, success]);

  const getPageTitle = useCallback(() => {
    const active = navItems.find(item => item.path === location.pathname);
    return active ? active.label : 'Dashboard';
  }, [navItems, location.pathname]);

  const avatarSrc = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=1D4ED8&color=fff`;

  const renderNavLinks = (onItemClick?: () => void) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.path;

      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={onItemClick}
          className={`flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all group relative cursor-pointer ${
            isSidebarCollapsed ? 'justify-center px-0' : 'px-3'
          } ${
            isActive
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-blue-600 dark:text-white'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 hover:text-blue-600 dark:hover:text-white'
          }`}
          title={isSidebarCollapsed ? item.label : undefined}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
              isActive ? 'text-white' : 'text-slate-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-white'
            }`}
          />
          {!isSidebarCollapsed && (
            <span className="truncate leading-none">{item.label}</span>
          )}
        </Link>
      );
    });

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-white overflow-hidden">
      {/* ── Desktop / Tablet Sidebar ────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col bg-white dark:bg-[#121212] border-r border-slate-200 dark:border-zinc-800 transition-all duration-300 relative z-30 flex-shrink-0 ${
          isSidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-zinc-800 overflow-hidden flex-shrink-0">
          <Logo size="sm" showText={!isSidebarCollapsed} />
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(prev => !prev)}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3.5 top-20 z-40 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-1.5 rounded-full text-slate-600 dark:text-zinc-300 hover:text-blue-600 hover:border-blue-300 shadow-md transition-all active:scale-95 cursor-pointer"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Nav Links */}
        <nav className="flex-1 px-2.5 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
          {renderNavLinks()}
        </nav>

        {/* User Footer */}
        <div className={`p-2.5 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-2 flex-shrink-0 ${isSidebarCollapsed ? 'items-center' : ''}`}>
          <Link
            to="/profile"
            className={`flex items-center gap-3 overflow-hidden rounded-xl transition-all cursor-pointer ${
              isSidebarCollapsed ? 'justify-center p-1 w-full' : 'p-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80'
            }`}
            title={isSidebarCollapsed ? user?.name : undefined}
          >
            <img
              src={avatarSrc}
              alt={user?.name || 'User avatar'}
              referrerPolicy="no-referrer"
              className="w-9 h-9 min-w-[36px] min-h-[36px] aspect-square rounded-full border border-slate-200 dark:border-zinc-700 object-cover flex-shrink-0"
            />
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate leading-snug hover:text-blue-600 transition-colors">
                  {user?.name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{user?.role}</span>
                {user?.companyName && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate">{user.companyName}</span>
                )}
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? 'Sign Out' : undefined}
            className={`flex items-center gap-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-colors w-full cursor-pointer ${
              isSidebarCollapsed ? 'justify-center px-0' : 'px-3'
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Drawer ────────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 bg-white dark:bg-[#121212] border-r border-slate-200 dark:border-zinc-800 w-64 z-50 flex flex-col transition-transform duration-300 md:hidden
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-zinc-800 flex-shrink-0">
          <Logo size="sm" showText={true} />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close mobile menu"
            className="text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors p-1"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
          {renderNavLinks(() => setIsMobileMenuOpen(false))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-3 flex-shrink-0">
          {/* Theme Toggle row in Mobile Drawer */}
          <div className="flex items-center justify-between px-1 py-1 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Theme</span>
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-3">
            <img
              src={avatarSrc}
              alt={user?.name || 'User avatar'}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-zinc-700 object-cover"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate leading-snug">{user?.name}</span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{user?.role}</span>
              {user?.companyName && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate">{user.companyName}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-colors w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Workspace ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* iOS Glassmorphism Header Navbar — Fully Responsive across Tablet & Mobile */}
        <header className="h-16 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-zinc-800/60 px-3 sm:px-6 flex items-center justify-between z-20 flex-shrink-0 transition-all duration-200 shadow-2xs gap-2">
          {/* Left: Drawer trigger + Page Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile menu"
              className="md:hidden text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-zinc-800 border border-blue-200/60 dark:border-zinc-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs flex-shrink-0">
                {React.createElement(
                  navItems.find(item => item.path === location.pathname)?.icon || LayoutDashboard,
                  { className: 'w-4 h-4' }
                )}
              </div>
              <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 dark:text-white tracking-tight whitespace-nowrap truncate">
                {getPageTitle()}
              </h2>
            </div>
          </div>

          {/* Right: Actions & Workspace Pill */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Quick Search — Desktop only to prevent tablet crowding */}
            <div className="relative hidden lg:block flex-shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Quick search..."
                className="pl-8 pr-3.5 py-1.5 bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-32 xl:w-44 transition-all"
              />
            </div>

            {/* Notification Bell */}
            <div className="flex-shrink-0">
              <NotificationBell />
            </div>

            {/* Dark / Light Mode Toggle Button */}
            <div className="hidden sm:flex items-center flex-shrink-0">
              <ThemeToggle />
            </div>

            {/* Workspace Pill — Perfectly fitted for Tablet & Mobile viewports */}
            <div className="hidden md:flex items-center gap-1.5 bg-blue-50/80 dark:bg-zinc-800/90 border border-blue-200/70 dark:border-zinc-700 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold text-blue-700 dark:text-zinc-200 shadow-2xs flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse flex-shrink-0" />
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="truncate max-w-[85px] sm:max-w-[120px] lg:max-w-[180px]">
                {user?.companyName || 'Enterprise CRM'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/70 dark:bg-[#090D16] scrollbar-hide transition-colors duration-200"
          style={{ padding: '20px' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

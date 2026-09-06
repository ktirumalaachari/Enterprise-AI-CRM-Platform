import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Eye,
  CreditCard,
  Package as PackageIcon,
  Layers,
  Sparkles,
  Bot,
  Database,
  Activity,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import api from '../services/api';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

import PackageManagement from '../components/superadmin/PackageManagement';
import CompanySubscriptionTable from '../components/superadmin/CompanySubscriptionTable';
import UserSubscriptionTable from '../components/superadmin/UserSubscriptionTable';
import RbacPermissionConsole from '../components/admin/RbacPermissionConsole';

interface CompanyStats {
  totalCompanies: number;
  pendingCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  rejectedCompanies: number;
  trialCompanies: number;
  premiumCompanies: number;
}

interface CompanyItem {
  id: string;
  companyName: string;
  businessEmail: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  rejectionReason?: string;
  owner?: {
    name: string;
    email: string;
    phone?: string;
  };
  subscription: {
    plan: string;
    status: string;
    startDate?: string;
    endDate?: string;
  };
  userCounts: {
    totalUsers: number;
    salesManagers: number;
    salesReps: number;
  };
  crmCounts: {
    totalLeads: number;
    totalCustomers: number;
    totalDeals: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const SuperAdminDashboard = () => {
  const { success, error } = useToast();
  const [activeMainTab, setActiveMainTab] = useState<
    'companies' | 'packages' | 'subscriptions' | 'users' | 'audit' | 'rbac'
  >('companies');

  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected company modal details
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<string>('overview');

  // Rejection modal
  const [rejectingCompanyId, setRejectingCompanyId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const fetchCompanyData = async (showFullLoading = false) => {
    if (showFullLoading || companies.length === 0) {
      setIsLoading(true);
    }
    try {
      const res = await api.get('/companies', {
        params: { status: statusFilter, search: searchQuery },
      });
      setStats(res.data.stats);
      setCompanies(res.data.companies || []);
    } catch (err: any) {
      error('Failed to load company management data');
    } finally {
      setIsLoading(false);
    }
  };

  // Instant In-Memory Search Filtering (0ms Latency, Zero Flickering)
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.companyName?.toLowerCase().includes(q) ||
        c.businessEmail?.toLowerCase().includes(q) ||
        c.owner?.name?.toLowerCase().includes(q) ||
        c.owner?.email?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  useEffect(() => {
    if (activeMainTab === 'companies') {
      const timer = setTimeout(() => {
        fetchCompanyData(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [statusFilter, searchQuery, activeMainTab]);

  const handleUpdateStatus = async (id: string, newStatus: string, reason?: string) => {
    // Optimistically update local state immediately so table does NOT flicker or show loading spinner
    setCompanies((prev) =>
      prev.map((c) => (c.id === id || (c as any)._id === id ? { ...c, status: newStatus as any } : c))
    );
    if (companyDetail && (companyDetail.company.id === id || (companyDetail.company as any)._id === id)) {
      setCompanyDetail((prev: any) =>
        prev ? { ...prev, company: { ...prev.company, status: newStatus } } : null
      );
    }
    success(`Company status updated to ${newStatus}`);

    try {
      await api.patch(`/companies/${id}/status`, { status: newStatus, rejectionReason: reason });
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update status');
      fetchCompanyData();
    }
  };

  const openCompanyDetail = async (id: string) => {
    setSelectedCompanyId(id);
    setIsDetailLoading(true);
    try {
      const res = await api.get(`/companies/${id}`);
      setCompanyDetail(res.data);
    } catch (err: any) {
      error('Failed to fetch company details');
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-900/50">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 backdrop-blur-md">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">Super Admin Platform Control Center</h1>
          </div>
          <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl">
            Full governance: tenant approval, subscription package management, AI feature entitlements, user mapping, and live diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchCompanyData(true)} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Control Center
          </Button>
        </div>
      </div>

      {/* Main Navigation Tabs: 2x2 Grid on Mobile (Row 1: 2 tabs, Row 2: 2 tabs) */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/80 dark:bg-[#121212] border border-slate-200/80 dark:border-zinc-800 rounded-2xl md:hidden">
        <button
          type="button"
          onClick={() => setActiveMainTab('companies')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'companies'
              ? 'bg-white text-blue-600 dark:bg-zinc-800 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-zinc-700'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 size={15} />
          <span className="truncate">Companies Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('packages')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'packages'
              ? 'bg-white text-blue-600 dark:bg-zinc-800 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-zinc-700'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PackageIcon size={15} />
          <span className="truncate">Packages</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('subscriptions')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'subscriptions'
              ? 'bg-white text-blue-600 dark:bg-zinc-800 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-zinc-700'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard size={15} />
          <span className="truncate">Subscriptions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('users')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'users'
              ? 'bg-white text-blue-600 dark:bg-zinc-800 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-zinc-700'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users size={15} />
          <span className="truncate">User Mapping</span>
        </button>
      </div>

      {/* Main Navigation Tabs: Desktop Horizontal Strip */}
      <div className="hidden md:flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-[#121212] dark:border dark:border-zinc-800 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveMainTab('companies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'companies'
              ? 'bg-white text-blue-600 dark:bg-zinc-800 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white dark:hover:bg-zinc-800/50'
          }`}
        >
          <Building2 size={16} />
          <span>Companies Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('packages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'packages'
              ? 'bg-white text-blue-600 dark:bg-zinc-800 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white dark:hover:bg-zinc-800/50'
          }`}
        >
          <PackageIcon size={16} />
          <span>Package Management</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('subscriptions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'subscriptions'
              ? 'bg-white text-blue-600 dark:bg-zinc-800 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white dark:hover:bg-zinc-800/50'
          }`}
        >
          <CreditCard size={16} />
          <span>Company Subscriptions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'users'
              ? 'bg-white text-blue-600 dark:bg-zinc-800 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white dark:hover:bg-zinc-800/50'
          }`}
        >
          <Users size={16} />
          <span>User &amp; Subscription Mapping</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('rbac')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'rbac'
              ? 'bg-white text-blue-600 dark:bg-zinc-800 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white dark:hover:bg-zinc-800/50'
          }`}
        >
          <ShieldCheck size={16} />
          <span>RBAC Console</span>
        </button>
      </div>

      {/* TAB 1: COMPANIES HUB */}
      {activeMainTab === 'companies' && (
        <div className="space-y-6">
          {/* Company Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            <Card className="bg-white dark:bg-[#121212] border-slate-200 dark:border-zinc-800 shadow-xs">
              <CardBody className="p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Total</p>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{stats?.totalCompanies || 0}</h3>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500">Companies</p>
              </CardBody>
            </Card>

            <Card className="bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 shadow-xs">
              <CardBody className="p-3 text-center">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Pending</p>
                <h3 className="text-xl font-extrabold text-amber-900 dark:text-amber-300 mt-1">{stats?.pendingCompanies || 0}</h3>
                <p className="text-[10px] text-amber-600 dark:text-amber-500">Review Required</p>
              </CardBody>
            </Card>

            <Card className="bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 shadow-xs">
              <CardBody className="p-3 text-center">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Active</p>
                <h3 className="text-xl font-extrabold text-emerald-900 dark:text-emerald-300 mt-1">{stats?.activeCompanies || 0}</h3>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Approved</p>
              </CardBody>
            </Card>

            <Card className="bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 shadow-xs">
              <CardBody className="p-3 text-center">
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Suspended</p>
                <h3 className="text-xl font-extrabold text-rose-900 dark:text-rose-300 mt-1">{stats?.suspendedCompanies || 0}</h3>
                <p className="text-[10px] text-rose-600 dark:text-rose-500">Locked</p>
              </CardBody>
            </Card>

            <Card className="bg-slate-100 dark:bg-zinc-800/60 border-slate-300 dark:border-zinc-700 shadow-xs">
              <CardBody className="p-3 text-center">
                <p className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase">Rejected</p>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-zinc-200 mt-1">{stats?.rejectedCompanies || 0}</h3>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Denied</p>
              </CardBody>
            </Card>

            <Card className="bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 shadow-xs">
              <CardBody className="p-3 text-center">
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Trial</p>
                <h3 className="text-xl font-extrabold text-blue-900 dark:text-blue-300 mt-1">{stats?.trialCompanies || 0}</h3>
                <p className="text-[10px] text-blue-600 dark:text-blue-500">Free Tier</p>
              </CardBody>
            </Card>

            <Card className="bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 shadow-xs">
              <CardBody className="p-3 text-center">
                <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">Premium</p>
                <h3 className="text-xl font-extrabold text-purple-900 dark:text-purple-300 mt-1">{stats?.premiumCompanies || 0}</h3>
                <p className="text-[10px] text-purple-600 dark:text-purple-500">Paid Tier</p>
              </CardBody>
            </Card>
          </div>

          {/* Company Table */}
          <Card className="bg-white dark:bg-[#121212] border-slate-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Company Management</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Approve registrations, manage status, and inspect company subscriptions.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 dark:bg-zinc-800 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 dark:hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardBody className="p-0">
              <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#18181B] flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search company name, email, or industry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="overflow-x-auto w-full scrollbar-thin">
                <table className="w-full min-w-[750px] text-left text-xs text-slate-700 dark:text-zinc-300">
                  <thead className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100 dark:border-zinc-800">
                    <tr>
                      <th className="p-3.5 font-bold">Company Name</th>
                      <th className="p-3.5 font-bold">Owner Details</th>
                      <th className="p-3.5 font-bold">Industry</th>
                      <th className="p-3.5 font-bold">Status</th>
                      <th className="p-3.5 font-bold">Subscription</th>
                      <th className="p-3.5 font-bold text-center">Team (Mgr/Rep)</th>
                      <th className="p-3.5 font-bold text-center">CRM Stats</th>
                      <th className="p-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-zinc-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                          Loading company directory...
                        </td>
                      </tr>
                    ) : filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-zinc-500 italic">
                          No companies match the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((comp) => (
                        <tr
                          key={comp.id}
                          onClick={() => {
                            if (window.innerWidth < 768) openCompanyDetail(comp.id);
                          }}
                          className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">{comp.companyName}</div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">ID: {comp.id.slice(-8)}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-slate-800 dark:text-zinc-200">{comp.owner?.name || 'Owner N/A'}</div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400">{comp.owner?.email || comp.businessEmail}</div>
                          </td>

                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] font-semibold">
                              {comp.industry || 'Technology'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                comp.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800'
                                  : comp.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-800 animate-pulse'
                                  : comp.status === 'SUSPENDED'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 dark:border dark:border-rose-800'
                                  : 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {comp.status === 'ACTIVE' && <CheckCircle2 size={12} />}
                              {comp.status === 'PENDING' && <Clock size={12} />}
                              {comp.status === 'SUSPENDED' && <XCircle size={12} />}
                              {comp.status === 'REJECTED' && <XCircle size={12} />}
                              <span>{comp.status}</span>
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-slate-800 dark:text-zinc-200 uppercase text-[11px]">
                              {comp.subscription?.plan || 'trial'}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 capitalize">
                              Status: {comp.subscription?.status || 'active'}
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="font-bold text-slate-800 dark:text-zinc-200">{comp.userCounts?.totalUsers || 0} users</div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500">
                              {comp.userCounts?.salesManagers || 0} Mgr • {comp.userCounts?.salesReps || 0} Rep
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="text-[11px] text-slate-700 dark:text-zinc-300 font-semibold">
                              {comp.crmCounts?.totalLeads || 0} Leads • {comp.crmCounts?.totalDeals || 0} Deals
                            </div>
                          </td>

                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => openCompanyDetail(comp.id)}
                              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                              title="View Company Details"
                            >
                              <Eye size={14} />
                            </button>

                            {comp.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(comp.id, 'ACTIVE')}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectingCompanyId(comp.id)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {comp.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(comp.id, 'SUSPENDED')}
                                className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}

                            {comp.status === 'SUSPENDED' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(comp.id, 'ACTIVE')}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB 2: PACKAGE MANAGEMENT */}
      {activeMainTab === 'packages' && <PackageManagement />}

      {/* TAB 3: COMPANY SUBSCRIPTIONS */}
      {activeMainTab === 'subscriptions' && <CompanySubscriptionTable />}

      {/* TAB 4: USER SUBSCRIPTION MAPPING */}
      {activeMainTab === 'users' && <UserSubscriptionTable />}

      {/* TAB 5: RBAC PERMISSION CONSOLE */}
      {activeMainTab === 'rbac' && <RbacPermissionConsole />}

      {/* Company Detail Inspection Modal */}
      {selectedCompanyId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] min-h-[480px] shadow-2xl flex flex-col overflow-hidden relative">
            {/* Top iOS Sheet Drag Pill Bar — Tap to Close Modal */}
            <button
              type="button"
              onClick={() => setSelectedCompanyId(null)}
              title="Tap to Close Modal"
              className="w-14 h-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-zinc-600 dark:hover:bg-zinc-500 rounded-full mx-auto mt-2.5 mb-1 cursor-pointer transition-colors block"
            />

            {/* Header: Seamless Light/Dark Theme */}
            <div className="px-4 sm:px-5 pb-3 bg-white dark:bg-[#121212] border-b border-slate-100 dark:border-zinc-800/80">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-0.5">Company Workspace Inspection</span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{companyDetail?.company?.companyName || 'Company Inspection'}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                <span>ID: <span className="font-mono text-[11px] text-slate-700 dark:text-zinc-300">{selectedCompanyId}</span></span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <span>Status:</span>
                  <strong className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black border ${
                    companyDetail?.company?.status?.toLowerCase() === 'active'
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                      : companyDetail?.company?.status?.toLowerCase() === 'suspended'
                      ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
                      : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
                  }`}>
                    {companyDetail?.company?.status || 'UNKNOWN'}
                  </strong>
                </span>
              </div>
            </div>

            {/* 7-Tab Bar (Fully Responsive Horizontal Scroll Bar with Touch Panning) */}
            <div className="flex items-center gap-1.5 p-2 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto no-scrollbar scrollbar-none touch-pan-x shrink-0 select-none flex-nowrap">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'users', label: 'Users' },
                { id: 'leads', label: 'Leads' },
                { id: 'customers', label: 'Customers' },
                { id: 'deals', label: 'Deals' },
                { id: 'ai', label: 'AI Usage' },
                { id: 'subscription', label: 'Subscription' },
              ].map((tb) => (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setActiveModalTab(tb.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all cursor-pointer select-none ${
                    activeModalTab === tb.id
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>

            {/* Modal Body Content (Fully Responsive Mobile & Desktop Layouts) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs min-h-[340px] flex-1">
              {isDetailLoading ? (
                <div className="p-12 text-center text-slate-400 dark:text-zinc-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                  Fetching company records...
                </div>
              ) : (
                <>
                  {activeModalTab === 'overview' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-2 text-slate-800 dark:text-zinc-200 border border-slate-100 dark:border-zinc-800">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-200/60 dark:border-zinc-700 pb-1.5">Company Metadata</h4>
                        <div><strong>Email:</strong> {companyDetail?.company?.businessEmail}</div>
                        <div><strong>Phone:</strong> {companyDetail?.company?.phone || 'N/A'}</div>
                        <div><strong>Industry:</strong> {companyDetail?.company?.industry || 'N/A'}</div>
                        <div><strong>Company Size:</strong> {companyDetail?.company?.companySize || 'N/A'}</div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-2 text-slate-800 dark:text-zinc-200 border border-slate-100 dark:border-zinc-800">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-200/60 dark:border-zinc-700 pb-1.5">Company Owner</h4>
                        <div><strong>Owner Name:</strong> {companyDetail?.company?.owner?.name || 'N/A'}</div>
                        <div><strong>Owner Email:</strong> {companyDetail?.company?.owner?.email || 'N/A'}</div>
                      </div>
                    </div>
                  )}

                  {activeModalTab === 'users' && (
                    <div className="overflow-x-auto w-full scrollbar-thin rounded-xl border border-slate-100 dark:border-zinc-800">
                      <table className="w-full min-w-[500px] text-left text-slate-700 dark:text-zinc-300">
                        <thead className="bg-slate-100 dark:bg-zinc-800 font-bold uppercase text-[10px] text-slate-500 dark:text-zinc-400">
                          <tr>
                            <th className="p-2.5">Name</th>
                            <th className="p-2.5">Email</th>
                            <th className="p-2.5">Role</th>
                            <th className="p-2.5">Inherited Plan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {companyDetail?.users?.map((u: any) => (
                            <tr key={u.id}>
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white">{u.name}</td>
                              <td className="p-2.5">{u.email}</td>
                              <td className="p-2.5 font-semibold text-blue-600 dark:text-blue-400">{u.role}</td>
                              <td className="p-2.5 font-bold uppercase">{companyDetail?.company?.subscription?.plan}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeModalTab === 'subscription' && (
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-2.5 text-slate-800 dark:text-zinc-200 border border-slate-100 dark:border-zinc-800">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-200/60 dark:border-zinc-700 pb-1.5">Active Company Subscription</h4>
                      <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-zinc-800"><span>Package Plan:</span><strong className="uppercase text-blue-600 dark:text-blue-400">{companyDetail?.company?.subscription?.plan}</strong></div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-zinc-800"><span>Status:</span><strong className="capitalize text-emerald-600 dark:text-emerald-400">{companyDetail?.company?.subscription?.status}</strong></div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-zinc-800"><span>Billing Cycle:</span><strong className="capitalize">{companyDetail?.company?.subscription?.billingCycle || 'monthly'}</strong></div>
                      <div className="flex justify-between py-1"><span>AI Credit Usage:</span><strong>{companyDetail?.company?.subscription?.currentAiUsage || 0} Queries</strong></div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;

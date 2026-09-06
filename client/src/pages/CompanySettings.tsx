import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Building2,
  Users,
  Key,
  CreditCard,
  Check,
  RefreshCw,
  Copy,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  UserX,
  Clock,
  Eye,
  EyeOff,
  ZapOff,
  Sparkles,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { TableSkeletonLoader, CardSkeletonLoader } from '../components/ui/LoadingState';

export type JoinRequestFilterTab = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JoinRequestItem {
  id: string;
  userId?: any;
  email: string;
  name?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  isNew?: boolean; // For real-time visual highlight
}

export const CompanySettings = () => {
  const { user } = useAuthStore();
  const { success, error, info } = useToast();

  const [company, setCompany] = useState<any | null>(null);
  const [allJoinRequests, setAllJoinRequests] = useState<JoinRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<JoinRequestFilterTab>('ALL');

  // Edit Company Profile State
  const [companyName, setCompanyName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('Technology');
  const [companySize, setCompanySize] = useState('1-10');
  const [website, setWebsite] = useState('');
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);

  // Join Code State
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isDeactivatingCode, setIsDeactivatingCode] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);

  // Join Request actions
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const eventSourceRef = useRef<EventSource | null>(null);

  /**
   * Fetch company profile and join requests
   */
  const fetchCompanySettings = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const [compRes, jrRes] = await Promise.all([
        api.get('/companies/my-company'),
        api.get('/join-requests'),
      ]);

      const comp = compRes.data.company;
      setCompany(comp);
      setCompanyName(comp.companyName || '');
      setBusinessEmail(comp.businessEmail || '');
      setPhone(comp.phone || '');
      setIndustry(comp.industry || 'Technology');
      setCompanySize(comp.companySize || '1-10');
      setWebsite(comp.website || '');

      setAllJoinRequests(jrRes.data.joinRequests || []);
    } catch (err: any) {
      if (isInitial) {
        error(err.response?.data?.message || 'Failed to load company settings');
      }
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [error]);

  /**
   * Refresh join requests list quietly
   */
  const refreshJoinRequests = useCallback(async () => {
    try {
      const jrRes = await api.get('/join-requests');
      setAllJoinRequests(jrRes.data.joinRequests || []);
    } catch {
      // Silently fail in background
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCompanySettings(true);
  }, [fetchCompanySettings]);

  /**
   * Real-Time Synchronization via Server-Sent Events (SSE) + Fallback
   */
  useEffect(() => {
    const companyId = user?.companyId;
    if (!companyId) return;

    // Connect to SSE stream
    try {
      const es = new EventSource('/api/join-requests/events', { withCredentials: true });
      eventSourceRef.current = es;

      es.addEventListener('join_request_created', (event: MessageEvent) => {
        try {
          const newJr: JoinRequestItem = JSON.parse(event.data);
          setAllJoinRequests((prev) => {
            // Avoid duplicates
            if (prev.some((item) => item.id === newJr.id)) return prev;
            return [{ ...newJr, isNew: true }, ...prev];
          });
          info(`New Team Join Request received from ${newJr.name || newJr.email}!`);
        } catch (e) {
          console.error('[SSE] Failed to parse join_request_created:', e);
        }
      });

      es.addEventListener('join_request_updated', (event: MessageEvent) => {
        try {
          const updatedJr: JoinRequestItem = JSON.parse(event.data);
          setAllJoinRequests((prev) =>
            prev.map((item) =>
              item.id === updatedJr.id
                ? { ...item, ...updatedJr, isNew: false }
                : item
            )
          );
        } catch (e) {
          console.error('[SSE] Failed to parse join_request_updated:', e);
        }
      });

      es.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch (e) {
      console.warn('[SSE] EventSource unavailable, falling back to smart polling');
    }

    // Smart background fallback polling every 15s
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshJoinRequests();
      }
    }, 15000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      clearInterval(pollInterval);
    };
  }, [user?.companyId, info, refreshJoinRequests]);

  /**
   * Counts for tabs
   */
  const counts = useMemo(() => {
    const all = allJoinRequests.length;
    const pending = allJoinRequests.filter((jr) => jr.status === 'PENDING').length;
    const approved = allJoinRequests.filter((jr) => jr.status === 'APPROVED').length;
    const rejected = allJoinRequests.filter((jr) => jr.status === 'REJECTED').length;
    return { all, pending, approved, rejected };
  }, [allJoinRequests]);

  /**
   * Filtered requests for the selected tab
   */
  const displayedRequests = useMemo(() => {
    if (activeTab === 'ALL') return allJoinRequests;
    return allJoinRequests.filter((jr) => jr.status === activeTab);
  }, [allJoinRequests, activeTab]);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCompany(true);
    try {
      await api.put('/companies/my-company', {
        companyName,
        businessEmail,
        phone,
        industry,
        companySize,
        website,
      });
      success('Company details updated successfully!');
      fetchCompanySettings(false);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update company');
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  const handleGenerateJoinCode = async () => {
    setIsGeneratingCode(true);
    try {
      const res = await api.post('/companies/join-code/generate');
      success(res.data.message || 'New join code generated!');
      setCompany((prev: any) => ({
        ...prev,
        joinCode: res.data.joinCode,
        joinCodeActive: res.data.joinCodeActive,
        joinCodeGeneratedAt: res.data.joinCodeGeneratedAt,
      }));
      setShowJoinCode(true);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to generate join code');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleDeactivateJoinCode = async () => {
    setIsDeactivatingCode(true);
    try {
      const res = await api.post('/companies/join-code/deactivate');
      success(res.data.message || 'Join code deactivated.');
      setCompany((prev: any) => ({ ...prev, joinCodeActive: false }));
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to deactivate join code');
    } finally {
      setIsDeactivatingCode(false);
    }
  };

  const copyJoinCode = () => {
    if (company?.joinCode) {
      navigator.clipboard.writeText(company.joinCode);
      success('Join code copied to clipboard!');
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await api.post(`/join-requests/${id}/approve`);
      success(res.data.message || 'Join request approved!');
      // Optimistic instant state update
      setAllJoinRequests((prev) =>
        prev.map((jr) => (jr.id === id ? { ...jr, status: 'APPROVED', reviewedAt: new Date().toISOString() } : jr))
      );
      await refreshJoinRequests();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setRejectingId(id);
    try {
      const res = await api.post(`/join-requests/${id}/reject`, { reason: rejectReason });
      success(res.data.message || 'Join request rejected.');
      setConfirmRejectId(null);
      setRejectReason('');
      // Optimistic instant state update
      setAllJoinRequests((prev) =>
        prev.map((jr) =>
          jr.id === id
            ? { ...jr, status: 'REJECTED', reviewedAt: new Date().toISOString(), rejectionReason: rejectReason || 'Not specified' }
            : jr
        )
      );
      await refreshJoinRequests();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setRejectingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
        <div className="h-28 bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeletonLoader className="lg:col-span-2" count={1} />
          <CardSkeletonLoader count={1} />
        </div>
        <TableSkeletonLoader rows={5} columns={5} />
      </div>
    );
  }

  // Exact Sequence: All, Pending, Approved, Rejected
  const tabs = [
    { key: 'ALL', label: 'All', count: counts.all },
    { key: 'PENDING', label: 'Pending', count: counts.pending },
    { key: 'APPROVED', label: 'Approved', count: counts.approved },
    { key: 'REJECTED', label: 'Rejected', count: counts.rejected },
  ] as const;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12 transition-colors duration-200">
      {/* ── Header Banner (Clean Enterprise White / Dark Style) ── */}
      <div className="bg-white dark:bg-[#121212] border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 dark:bg-zinc-800/80 border border-blue-100 dark:border-zinc-700 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {company?.companyName || 'Enterprise'} Workspace
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-zinc-700">
                {company?.status || 'ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Manage company profile, team join codes, and real-time employee join requests.
            </p>
          </div>
        </div>

        {/* Real-time Indicator & Status Summary */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px]">Real-Time Sync Active</span>
          </div>

          {counts.pending > 0 && (
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-zinc-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-zinc-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {counts.pending} Pending
            </span>
          )}
        </div>
      </div>

      {/* ── Row 1: Profile & Subscription ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Company Profile Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
              Company Profile &amp; Business Information
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Business Email</label>
                  <input
                    type="email"
                    required
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="Technology">Technology &amp; Software</option>
                    <option value="Finance">Finance &amp; Banking</option>
                    <option value="Healthcare">Healthcare &amp; Pharma</option>
                    <option value="E-commerce">E-commerce &amp; Retail</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Other">Other Industry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="1-10">1-10 Employees</option>
                    <option value="11-50">11-50 Employees</option>
                    <option value="51-200">51-200 Employees</option>
                    <option value="201-500">201-500 Employees</option>
                    <option value="500+">500+ Employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingCompany}>
                  <Check className="w-4 h-4 mr-1.5" />
                  Save Company Changes
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Right: Subscription & Quotas */}
        <Card>
          <CardHeader>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard size={18} className="text-blue-600 dark:text-blue-400" />
              Subscription &amp; Limits
            </h2>
          </CardHeader>
          <CardBody className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Current Plan</span>
                <span className="px-2.5 py-0.5 rounded-full font-extrabold uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                  {company?.subscription?.plan || 'trial'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Subscription Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                  {company?.subscription?.status || 'active'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Usage Quotas
              </h4>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Max Workspace Users:</span>
                <strong className="text-slate-900 dark:text-slate-100">{company?.subscription?.usageLimits?.maxUsers || 50}</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>AI Query Quota:</span>
                <strong className="text-slate-900 dark:text-slate-100">{company?.subscription?.usageLimits?.aiQueryLimit || 5000}</strong>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Row 2: Company Join Code ── */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Key size={18} className="text-blue-600 dark:text-blue-400" />
              Company Join Code
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Share this code with employees. When they submit it on the Join Company page, their request will appear below in real time.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Code Display */}
            <div className="flex-1">
              {company?.joinCode ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                      company.joinCodeActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="font-mono text-xl font-black tracking-[0.3em] text-slate-900 dark:text-white">
                      {showJoinCode ? company.joinCode : '•'.repeat(company.joinCode.length)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowJoinCode((p) => !p)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                      title={showJoinCode ? 'Hide code' : 'Show code'}
                    >
                      {showJoinCode ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {company.joinCodeActive ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Inactive
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle size={15} />
                  No join code generated yet. Click &quot;Generate&quot; to create one.
                </div>
              )}

              {company?.joinCodeGeneratedAt && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                  Generated: {new Date(company.joinCodeGeneratedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {company?.joinCode && company?.joinCodeActive && (
                <button
                  type="button"
                  onClick={copyJoinCode}
                  id="copy-join-code-btn"
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Copy size={13} />
                  Copy Code
                </button>
              )}

              <button
                type="button"
                onClick={handleGenerateJoinCode}
                disabled={isGeneratingCode}
                id="generate-join-code-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw size={13} className={isGeneratingCode ? 'animate-spin' : ''} />
                {company?.joinCode ? 'Regenerate' : 'Generate'} Code
              </button>

              {company?.joinCode && company?.joinCodeActive && (
                <button
                  type="button"
                  onClick={handleDeactivateJoinCode}
                  disabled={isDeactivatingCode}
                  id="deactivate-join-code-btn"
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ZapOff size={13} />
                  Deactivate
                </button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Row 3: Team Join Requests (Correct Sequence: All, Pending, Approved, Rejected) ── */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users size={18} className="text-blue-600 dark:text-blue-400" />
              Team Join Requests
              {counts.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  {counts.pending} pending
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review and approve employees who submit your company join code. Updates appear instantly.
            </p>
          </div>

          {/* ── EXACT SEQUENCE TABS: All, Pending, Approved, Rejected ── */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap
                    ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {displayedRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3 text-center">
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500">
                <Inbox className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                  {activeTab === 'PENDING'
                    ? 'No pending join requests'
                    : activeTab === 'APPROVED'
                    ? 'No approved join requests'
                    : activeTab === 'REJECTED'
                    ? 'No rejected join requests'
                    : 'No team join requests yet'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm">
                  Share your active join code with team members so they can join your company workspace.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 pl-5">Applicant</th>
                      <th className="p-3.5">Email Address</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Requested Date</th>
                      <th className="p-3.5 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {displayedRequests.map((jr) => (
                      <tr
                        key={jr.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          jr.isNew ? 'bg-blue-50/40 dark:bg-blue-950/20 animate-pulse-slow' : ''
                        }`}
                      >
                        <td className="p-3.5 pl-5 font-bold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center text-[10px] uppercase">
                              {(jr.name || jr.email).charAt(0)}
                            </div>
                            <span>{jr.name || 'Unnamed Employee'}</span>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {jr.email}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border inline-flex items-center gap-1 ${
                              jr.status === 'PENDING'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                : jr.status === 'APPROVED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {jr.status === 'PENDING' ? (
                              <>
                                <Clock size={10} /> Pending
                              </>
                            ) : jr.status === 'APPROVED' ? (
                              <>
                                <CheckCircle2 size={10} /> Approved
                              </>
                            ) : (
                              <>
                                <AlertCircle size={10} /> Rejected
                              </>
                            )}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          {jr.requestedAt ? new Date(jr.requestedAt).toLocaleDateString() : '—'}
                        </td>

                        <td className="p-3.5 pr-5 text-right space-x-1.5">
                          {jr.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(jr.id)}
                                disabled={approvingId === jr.id || rejectingId === jr.id}
                                id={`approve-btn-${jr.id}`}
                                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 border border-emerald-200 dark:border-emerald-800"
                                title="Approve Join Request"
                              >
                                {approvingId === jr.id ? (
                                  <RefreshCw size={11} className="animate-spin" />
                                ) : (
                                  <UserCheck size={12} />
                                )}
                                Approve
                              </button>

                              {confirmRejectId === jr.id ? (
                                <div className="inline-flex items-center gap-1.5 mt-1">
                                  <input
                                    type="text"
                                    placeholder="Reason (optional)"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="px-2.5 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-36 outline-none focus:border-red-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleReject(jr.id)}
                                    disabled={rejectingId === jr.id || approvingId === jr.id}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    {rejectingId === jr.id ? <RefreshCw size={11} className="animate-spin" /> : 'Confirm'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setConfirmRejectId(null); setRejectReason(''); }}
                                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRejectId(jr.id)}
                                  id={`reject-btn-${jr.id}`}
                                  disabled={approvingId === jr.id || rejectingId === jr.id}
                                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                                  title="Reject Join Request"
                                >
                                  <UserX size={12} />
                                  Reject
                                </button>
                              )}
                            </>
                          )}

                          {jr.status !== 'PENDING' && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                              {jr.status === 'APPROVED' ? 'Approved' : `Rejected: ${jr.rejectionReason || 'N/A'}`}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Adaptive Cards View (<640px) */}
              <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {displayedRequests.map((jr) => (
                  <div
                    key={`mobile-${jr.id}`}
                    className={`p-4 space-y-3 ${
                      jr.isNew ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center text-xs uppercase shrink-0">
                          {(jr.name || jr.email).charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {jr.name || 'Unnamed Employee'}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {jr.email}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                          jr.status === 'PENDING'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : jr.status === 'APPROVED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {jr.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      Requested: {jr.requestedAt ? new Date(jr.requestedAt).toLocaleDateString() : '—'}
                    </div>

                    {jr.status === 'PENDING' && (
                      <div className="pt-1 flex flex-col gap-2">
                        {confirmRejectId === jr.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Reason (optional)"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleReject(jr.id)}
                                disabled={rejectingId === jr.id}
                                className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold"
                              >
                                Confirm Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => { setConfirmRejectId(null); setRejectReason(''); }}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(jr.id)}
                              disabled={approvingId === jr.id}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                            >
                              {approvingId === jr.id ? <RefreshCw size={12} className="animate-spin" /> : <UserCheck size={14} />}
                              Approve Access
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRejectId(jr.id)}
                              className="flex-1 py-2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                            >
                              <UserX size={14} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {jr.status !== 'PENDING' && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                        {jr.status === 'APPROVED' ? 'Approved for workspace access' : `Rejection Reason: ${jr.rejectionReason || 'None'}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default CompanySettings;

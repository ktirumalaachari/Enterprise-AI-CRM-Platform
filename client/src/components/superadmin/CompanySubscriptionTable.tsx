import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  ArrowUpRight,
  Edit,
  DollarSign,
  Users,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export interface CompanySubscriptionItem {
  id: string;
  companyName: string;
  businessEmail: string;
  owner?: {
    name: string;
    email: string;
    phone?: string;
  };
  subscription: {
    plan: string;
    status: string;
    billingCycle: string;
    amountPaid: number;
    startDate?: string;
    endDate?: string;
    renewalDate?: string;
    autoRenew: boolean;
    currentAiUsage: number;
    aiQueryLimit: number;
    aiUsagePercentage: number;
    limits: {
      maxUsers: number;
      currentUsers: number;
      usersPercentage: number;
      maxLeads: number;
      currentLeads: number;
      leadsPercentage: number;
      currentCustomers: number;
      currentDeals: number;
    };
  };
  createdAt: string;
}

export const CompanySubscriptionTable = () => {
  const { success, error } = useToast();
  const [subscriptions, setSubscriptions] = useState<CompanySubscriptionItem[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubDetail, setSelectedSubDetail] = useState<any | null>(null);

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manual Edit Subscription Modal State
  const [selectedComp, setSelectedComp] = useState<CompanySubscriptionItem | null>(null);
  const [newPlan, setNewPlan] = useState('Professional');
  const [newStatus, setNewStatus] = useState('active');
  const [newCycle, setNewCycle] = useState('monthly');
  const [newAmount, setNewAmount] = useState(2499);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubscriptions = async (showFullLoading = false) => {
    if (showFullLoading || subscriptions.length === 0) {
      setIsLoading(true);
    }
    try {
      const res = await api.get('/companies/subscriptions', {
        params: { status: statusFilter, search: searchQuery },
      });
      setSubscriptions(res.data.subscriptions || []);
      setStats(res.data.stats || null);
    } catch (err: any) {
      error('Failed to load company subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  // Instant In-Memory Search Filtering (0ms Latency, Zero Flickering)
  const filteredSubscriptions = useMemo(() => {
    if (!searchQuery.trim()) return subscriptions;
    const q = searchQuery.toLowerCase();
    return subscriptions.filter(
      (comp) =>
        comp.companyName?.toLowerCase().includes(q) ||
        comp.businessEmail?.toLowerCase().includes(q) ||
        comp.owner?.name?.toLowerCase().includes(q) ||
        comp.owner?.email?.toLowerCase().includes(q) ||
        comp.subscription?.plan?.toLowerCase().includes(q)
    );
  }, [subscriptions, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscriptions(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [statusFilter, searchQuery]);

  const handleOpenEdit = (comp: CompanySubscriptionItem) => {
    setSelectedComp(comp);
    setNewPlan(comp.subscription.plan);
    setNewStatus(comp.subscription.status);
    setNewCycle(comp.subscription.billingCycle || 'monthly');
    setNewAmount(comp.subscription.amountPaid || 0);
  };

  const handleSaveManualSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp) return;
    setIsSaving(true);

    // Optimistically update local subscriptions array
    setSubscriptions((prev) =>
      prev.map((item) =>
        item.id === selectedComp.id
          ? {
              ...item,
              subscription: {
                ...item.subscription,
                plan: newPlan,
                status: newStatus,
                billingCycle: newCycle,
                amountPaid: newAmount,
              },
            }
          : item
      )
    );
    success(`Subscription for ${selectedComp.companyName} updated to ${newPlan}`);
    setSelectedComp(null);

    try {
      await api.post(`/companies/${selectedComp.id}/subscription`, {
        plan: newPlan,
        status: newStatus,
        billingCycle: newCycle,
        amountPaid: newAmount,
      });
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update subscription');
      fetchSubscriptions();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Expiry & Lifecycle Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <Card className="bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50">
          <CardBody className="p-3 text-center">
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Active Plans</p>
            <h3 className="text-xl font-extrabold text-emerald-900 dark:text-emerald-300 mt-0.5">{stats?.totalActive || 0}</h3>
          </CardBody>
        </Card>

        <Card className="bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50">
          <CardBody className="p-3 text-center">
            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Trial Plans</p>
            <h3 className="text-xl font-extrabold text-blue-900 dark:text-blue-300 mt-0.5">{stats?.totalTrial || 0}</h3>
          </CardBody>
        </Card>

        <Card className="bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50">
          <CardBody className="p-3 text-center">
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Expiring Soon (7d)</p>
            <h3 className="text-xl font-extrabold text-amber-900 dark:text-amber-300 mt-0.5">{stats?.expiringSoon || 0}</h3>
          </CardBody>
        </Card>

        <Card className="bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50">
          <CardBody className="p-3 text-center">
            <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Expired</p>
            <h3 className="text-xl font-extrabold text-rose-900 dark:text-rose-300 mt-0.5">{stats?.totalExpired || 0}</h3>
          </CardBody>
        </Card>

        <Card className="bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 col-span-2 sm:col-span-1">
          <CardBody className="p-3 text-center">
            <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">Payment Pending</p>
            <h3 className="text-xl font-extrabold text-purple-900 dark:text-purple-300 mt-0.5">{stats?.paymentPending || 0}</h3>
          </CardBody>
        </Card>
      </div>

      {/* Main Subscriptions Table Card */}
      <Card className="bg-white dark:bg-[#121212] border-slate-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Company Subscriptions Directory</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Monitor company plan status, usage percentages, renewal dates, and billing limits.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchSubscriptions(true)} className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <RefreshCw size={14} className="mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {/* Filter & Search Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#18181B] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search company name, owner, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED', 'PAYMENT_PENDING'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-slate-900 dark:bg-zinc-800 text-white'
                      : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[750px] text-left text-xs text-slate-700 dark:text-zinc-300">
              <thead className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="p-3.5">Company &amp; Owner</th>
                  <th className="p-3.5">Package Plan</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Billing &amp; End Date</th>
                  <th className="p-3.5 text-center">User Quota</th>
                  <th className="p-3.5 text-center">AI Credits Quota</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                      Loading company subscriptions...
                    </td>
                  </tr>
                ) : filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-zinc-500 italic">
                      No subscriptions match the filter.
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((comp) => {
                    const sub = comp.subscription;
                    return (
                      <tr
                        key={comp.id}
                        onClick={() => {
                          if (window.innerWidth < 768) setSelectedSubDetail(comp);
                        }}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      >
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{comp.companyName}</div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400">{comp.owner?.name || 'Owner'} ({comp.businessEmail})</div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase text-xs">
                            {sub.plan}
                          </span>
                          <div className="text-[10px] text-slate-400 dark:text-zinc-500 capitalize">
                            Cycle: {sub.billingCycle} • ₹{sub.amountPaid.toLocaleString()}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              sub.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800'
                                : sub.status === 'trial'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 dark:border dark:border-blue-800'
                                : sub.status === 'expired'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 dark:border dark:border-rose-800'
                                : 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
                            {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Auto Renew: {sub.autoRenew ? 'On' : 'Off'}
                          </div>
                        </td>

                        <td className="p-3.5 text-center min-w-[130px]">
                          <div className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
                            {sub.limits.currentUsers} / {sub.limits.maxUsers} Users
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${sub.limits.usersPercentage}%` }}
                            />
                          </div>
                        </td>

                        <td className="p-3.5 text-center min-w-[130px]">
                          <div className="font-bold text-indigo-700 dark:text-indigo-400 text-[11px]">
                            {sub.currentAiUsage} / {sub.aiQueryLimit} Credits
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full"
                              style={{ width: `${sub.aiUsagePercentage}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-semibold">{sub.aiUsagePercentage}% used</span>
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(comp)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-white font-bold text-[11px] rounded-lg border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
                          >
                            Manage Plan
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Edit Company Subscription Modal */}
      {selectedComp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Override Subscription: {selectedComp.companyName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedComp(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualSubscription} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Target Package Plan</label>
                <input
                  type="text"
                  required
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  placeholder="e.g. Starter, Professional, Premium"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Billing Cycle</label>
                  <select
                    value={newCycle}
                    onChange={(e) => setNewCycle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-zinc-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setSelectedComp(null)} className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSaving}>
                  Update Subscription
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Subscription Detail Popup Modal (Mobile Devices Only — Premium iOS Card Sheet) */}
      {selectedSubDetail && (
        <div className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-[9999]">
          <div className="bg-white dark:bg-[#121212] rounded-3xl max-w-lg w-full border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col animate-in slide-in-from-bottom-5 duration-200">
            {/* Top iOS Sheet Drag Pill Bar — Tap to Close Modal */}
            <button
              type="button"
              onClick={() => setSelectedSubDetail(null)}
              title="Tap to Close Modal"
              className="w-14 h-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-zinc-600 dark:hover:bg-zinc-500 rounded-full mx-auto mt-2.5 mb-1 cursor-pointer transition-colors block"
            />

            {/* Seamless Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-zinc-800/80">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-0.5">Subscription Overview</span>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight truncate">{selectedSubDetail.companyName}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">Owner: {selectedSubDetail.owner?.name || 'Company Owner'} ({selectedSubDetail.businessEmail})</p>
            </div>

            {/* Modal Content — Vertically Stacked */}
            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-zinc-900/70 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                <div className="flex flex-col">
                  <span className="text-slate-400 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Subscription Status</span>
                  <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase border self-start ${
                    selectedSubDetail.subscription.status?.toLowerCase() === 'active'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                      : selectedSubDetail.subscription.status?.toLowerCase() === 'suspended' || selectedSubDetail.subscription.status?.toLowerCase() === 'cancelled'
                      ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                  }`}>
                    {selectedSubDetail.subscription.status}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Plan Name</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs uppercase block mt-1">
                    {selectedSubDetail.subscription.plan}
                  </span>
                </div>
              </div>

              {/* Data Properties — Vertically Stacked List */}
              <div className="space-y-3 bg-slate-50/70 dark:bg-zinc-900/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/60 flex flex-col">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Billing Cycle &amp; Amount</span>
                  <span className="font-extrabold text-slate-900 dark:text-zinc-100 text-xs mt-0.5">
                    {selectedSubDetail.subscription.billingCycle} • ₹{selectedSubDetail.subscription.amountPaid?.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">User Seat Allocation</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-xs mt-0.5">
                    {selectedSubDetail.subscription.limits?.currentUsers} / {selectedSubDetail.subscription.limits?.maxUsers} Users
                  </span>
                </div>

                <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">AI Credit Usage</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-xs mt-0.5">
                    {selectedSubDetail.subscription.limits?.currentAiUsage?.toLocaleString()} / {selectedSubDetail.subscription.limits?.maxAiLimit?.toLocaleString()} Credits
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="primary" size="sm" onClick={() => { handleOpenEdit(selectedSubDetail); setSelectedSubDetail(null); }} className="rounded-xl px-4 w-full sm:w-auto">
                  Edit Subscription
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySubscriptionTable;

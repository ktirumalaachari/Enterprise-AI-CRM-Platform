import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Users, 
  DollarSign, 
  Briefcase, 
  Percent, 
  Send, 
  Server,
  Lock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  X,
  Edit3,
  Sparkles,
  Clock,
  CreditCard,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

const defaultMonthlyData: any[] = [];

const COLORS = ['#2563EB', '#6366F1', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444'];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  const [endpointResponse, setEndpointResponse] = useState<any>(null);
  const [loadingEndpoint, setLoadingEndpoint] = useState<string | null>(null);

  // KPI Management Modal State
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [isKpiUpdating, setIsKpiUpdating] = useState(false);
  const [kpiForm, setKpiForm] = useState({
    closedRevenue: '',
    activePipeline: '',
    winRate: '',
    avgDealSize: '',
  });

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const response = await api.get('/deals/analytics');
      setAnalytics(response.data.analytics);
      if (response.data.analytics) {
        setKpiForm({
          closedRevenue: String(response.data.analytics.totalClosedRevenue || 0),
          activePipeline: String(response.data.analytics.activePipelineValue || 0),
          winRate: String(response.data.analytics.winRate || 0),
          avgDealSize: String(response.data.analytics.avgDealSize || 0),
        });
      }
    } catch (err) {
      console.warn('Failed to load real-time analytics');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleUpdateKpis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsKpiUpdating(true);
    try {
      await api.put('/reports/kpis', kpiForm);
      success('KPI metrics updated successfully!');
      setIsKpiModalOpen(false);
      fetchAnalytics();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update KPI values.');
    } finally {
      setIsKpiUpdating(false);
    }
  };

  const testEndpoint = async (url: string, title: string) => {
    setLoadingEndpoint(title);
    setEndpointResponse(null);
    try {
      const res = await api.get(url);
      setEndpointResponse({
        status: res.status,
        statusText: res.statusText,
        data: res.data,
      });
      success(`Successfully fetched ${title}!`);
    } catch (err: any) {
      const errRes = err.response;
      setEndpointResponse({
        status: errRes?.status || 500,
        statusText: errRes?.statusText || 'Error',
        data: errRes?.data || { message: err.message },
      });
      error(`Unauthorized: Access denied for ${title}.`);
    } finally {
      setLoadingEndpoint(null);
    }
  };

  const kpis = [
    { 
      title: 'Closed Revenue', 
      value: `$${(analytics?.totalClosedRevenue || 0).toLocaleString()}`, 
      change: '+0%', 
      desc: 'vs target', 
      icon: DollarSign, 
      color: 'text-emerald-600 bg-emerald-50' 
    },
    { 
      title: 'Active Pipeline', 
      value: `$${(analytics?.activePipelineValue || 0).toLocaleString()}`, 
      change: '+0%', 
      desc: 'open deals', 
      icon: Briefcase, 
      color: 'text-blue-600 bg-blue-50' 
    },
    { 
      title: 'Win Rate', 
      value: `${analytics?.winRate !== undefined ? analytics.winRate : 0}%`, 
      change: '+0%', 
      desc: 'conversion ratio', 
      icon: Percent, 
      color: 'text-indigo-600 bg-indigo-50' 
    },
    { 
      title: 'Avg Deal Size', 
      value: `$${(analytics?.avgDealSize || 0).toLocaleString()}`, 
      change: '+0%', 
      desc: 'per won deal', 
      icon: TrendingUp, 
      color: 'text-purple-600 bg-purple-50' 
    },
  ];

  // Pie chart data structure for stages
  const pieData = analytics?.stageBreakdown
    ? Object.keys(analytics.stageBreakdown).map((key) => ({
        name: key,
        value: analytics.stageBreakdown[key].count || 0,
      })).filter((d) => d.value > 0)
    : [];

  const chartMonthlyData = analytics?.monthlyData && analytics.monthlyData.length > 0
    ? analytics.monthlyData
    : defaultMonthlyData;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto min-w-0 w-full overflow-hidden">
      {/* Welcome & Role Banner */}
      <div className="bg-white dark:bg-[#121212] border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 smooth-shadow flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-colors">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Executive Dashboard &amp; Analytics</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Role: <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{user?.role}</span> | Real-time revenue insights &amp; sales performance.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(user?.role === 'SuperAdmin' || user?.role === 'Admin') && (
            <Button variant="primary" size="sm" onClick={() => setIsKpiModalOpen(true)} className="text-xs sm:text-xs">
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Manage KPI Values</span>
              <span className="sm:hidden">Manage KPI</span>
            </Button>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 px-2.5 sm:px-3 py-1.5 rounded-xl w-fit">
            <Server className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">MongoDB Cloud Connection: <strong className="text-green-600 dark:text-green-400 font-semibold">Active</strong></span>
            <span className="sm:hidden"><strong className="text-green-600 dark:text-green-400 font-semibold">MongoDB Active</strong></span>
          </div>
        </div>
      </div>

      {/* Subscription Status Banner */}
      {(() => {
        const sub = user?.subscription;
        const status = sub?.status || 'trial';
        const planName = sub?.plan ? sub.plan.toUpperCase() : 'FREE TRIAL';
        const daysRemaining = sub?.daysRemaining ?? 14;
        const aiAccess = sub?.aiAccess !== false;

        if (status === 'expired' || !aiAccess) {
          return (
            <div className="bg-red-50/80 dark:bg-zinc-900/90 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs transition-colors">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Free Trial Expired</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 uppercase">AI Features Locked</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                    Your 14-day free trial has ended. Upgrade your plan now to unlock AI Chat, Email Generator, and Meeting Summaries.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all flex-shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Upgrade Plan Now <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        if (status === 'active') {
          return (
            <div className="bg-blue-50/80 dark:bg-[#121212] border border-blue-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs transition-colors">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{planName} Plan Active</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-zinc-700 uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> AI Enabled
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                    {daysRemaining > 0 ? `${daysRemaining} days remaining in your subscription period.` : 'Active Subscription'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" /> View Plans
              </button>
            </div>
          );
        }

        // Trial Active Default
        const trialText =
          daysRemaining <= 1
            ? 'Trial ends tomorrow'
            : daysRemaining === 2
            ? '2 days remaining'
            : `${daysRemaining} days remaining`;

        return (
          <div className="bg-slate-100 dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">14-Day Free Trial</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-zinc-800 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-zinc-700 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {trialText}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-zinc-800 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-zinc-700 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> AI Features Enabled
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                  Enjoy full access to all generative AI sales tools during your trial period.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/pricing')}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all flex-shrink-0 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" /> View Plans
            </button>
          </div>
        );
      })()}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} hoverable>
              <CardBody className="flex items-center justify-between p-4 sm:p-5">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-xs font-semibold text-brand-textSecondary truncate">{kpi.title}</span>
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-brand-textPrimary truncate break-words">{kpi.value}</span>
                  <span className="text-[10px] font-medium text-brand-textSecondary truncate">
                    <strong className="text-emerald-600 mr-1">{kpi.change}</strong>
                    {kpi.desc}
                  </span>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${kpi.color} ml-2`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0 w-full overflow-hidden">
        {/* Revenue Trends Chart */}
        <Card className="lg:col-span-2 min-w-0 w-full overflow-hidden">
          <CardHeader>
            <div>
              <h3 className="text-sm font-bold text-brand-textPrimary">Revenue & Acquisition Trends</h3>
              <p className="text-[10px] text-brand-textSecondary mt-0.5">Monthly revenue trajectory ($ USD)</p>
            </div>
          </CardHeader>
          <CardBody className="h-72 min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Stage Distribution Donut Chart */}
        <Card className="min-w-0 w-full overflow-hidden">
          <CardHeader>
            <div>
              <h3 className="text-sm font-bold text-brand-textPrimary">Pipeline Distribution</h3>
              <p className="text-[10px] text-brand-textSecondary mt-0.5">Deals count by stage</p>
            </div>
          </CardHeader>
          <CardBody className="h-72 min-w-0 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] mt-2">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-semibold text-slate-700">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Leaderboard & RBAC Console Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0 w-full overflow-hidden">
        {/* Leaderboard */}
        <Card className="min-w-0 w-full overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-brand-textPrimary">Sales Rep Leaderboard</h3>
                <p className="text-[10px] text-brand-textSecondary mt-0.5">Top performers by closed revenue</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {!analytics?.leaderboard || analytics.leaderboard.length === 0 ? (
              <div className="text-center py-6 text-xs italic text-slate-400">
                Create deals and assign sales representatives to populate leaderboard rankings.
              </div>
            ) : (
              analytics.leaderboard.slice(0, 5).map((rep: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 rounded-xl gap-2 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{rep.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{rep.dealsCount} Deals managed</span>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    ${rep.wonValue.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* RBAC Console */}
        <Card className="flex flex-col min-w-0 w-full overflow-hidden">
          <CardHeader>
            <div>
              <h3 className="text-sm font-bold text-brand-textPrimary">RBAC Permission Console</h3>
              <p className="text-[10px] text-brand-textSecondary mt-0.5">Validate API endpoint clearances in real-time</p>
            </div>
          </CardHeader>
          <CardBody className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => testEndpoint('/deals', 'Deals Catalog')}
                isLoading={loadingEndpoint === 'Deals Catalog'}
              >
                Deals (All)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => testEndpoint('/users/pipeline-settings', 'Pipeline Settings')}
                isLoading={loadingEndpoint === 'Pipeline Settings'}
              >
                Settings (Manager+)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => testEndpoint('/users/admin-dashboard', 'Admin Logs')}
                isLoading={loadingEndpoint === 'Admin Logs'}
              >
                Admin (Admin Only)
              </Button>
            </div>

            <div className="flex-1 min-h-[120px] bg-slate-950 text-slate-200 rounded-lg p-3 font-mono text-[10px] overflow-auto border border-slate-900">
              {endpointResponse ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1">
                    {endpointResponse.status === 200 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-slate-400">Status:</span>
                    <span className={endpointResponse.status === 200 ? 'text-green-500' : 'text-red-500'}>
                      {endpointResponse.status} {endpointResponse.statusText}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap mt-1">{JSON.stringify(endpointResponse.data, null, 2)}</pre>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 italic text-center px-4">
                  Trigger an endpoint test above to verify role access response
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Modal: Manage KPIs */}
      <AnimatePresence>
        {isKpiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsKpiModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full overflow-hidden smooth-shadow border border-brand-border z-50"
            >
              <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-brand-textPrimary text-sm">Manage Executive KPI Metrics</h3>
                <button onClick={() => setIsKpiModalOpen(false)} className="text-brand-textSecondary hover:text-brand-textPrimary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateKpis}>
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Closed Revenue ($ USD)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 500000"
                      value={kpiForm.closedRevenue}
                      onChange={(e) => setKpiForm({ ...kpiForm, closedRevenue: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Active Pipeline ($ USD)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 1200000"
                      value={kpiForm.activePipeline}
                      onChange={(e) => setKpiForm({ ...kpiForm, activePipeline: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Win Rate (%)</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="e.g. 64.5"
                      value={kpiForm.winRate}
                      onChange={(e) => setKpiForm({ ...kpiForm, winRate: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Avg Deal Size ($ USD)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 15000"
                      value={kpiForm.avgDealSize}
                      onChange={(e) => setKpiForm({ ...kpiForm, avgDealSize: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-slate-200 rounded-xl outline-none focus:border-brand-primary font-medium"
                      required
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-brand-border bg-slate-50/50 flex items-center justify-end gap-2.5">
                  <Button type="button" variant="outline" onClick={() => setIsKpiModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isKpiUpdating}>Save KPI Changes</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  XCircle,
  Play,
  Search,
  RefreshCw,
  Zap,
  Info,
  Building2,
  Users2,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export interface RbacPermissionEntry {
  id: string;
  module: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description: string;
  allowedRoles: ('SuperAdmin' | 'Admin' | 'SalesManager' | 'SalesRep')[];
}

const normalizeRoleKey = (r: string): string => {
  if (r === 'SuperAdmin' || r === 'SUPER_ADMIN') return 'SuperAdmin';
  if (r === 'Admin' || r === 'COMPANY_OWNER') return 'Admin';
  if (r === 'SalesManager' || r === 'SALES_MANAGER') return 'SalesManager';
  if (r === 'SalesRep' || r === 'SALES_REPRESENTATIVE') return 'SalesRep';
  return r;
};

export const RbacPermissionConsole: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { success, error, info } = useToast();

  const [permissions, setPermissions] = useState<RbacPermissionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [testingEndpointId, setTestingEndpointId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    endpointId: string;
    status: number;
    allowed: boolean;
    message: string;
  } | null>(null);

  const activeRoleKey = currentUser ? normalizeRoleKey(currentUser.role) : 'SalesRep';

  const fetchRbacMatrix = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/rbac/matrix');
      if (res.data?.permissions) {
        setPermissions(res.data.permissions);
      }
    } catch (err: any) {
      error('Failed to load real-time RBAC permissions matrix.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRbacMatrix();
  }, []);

  const modulesList = useMemo(() => {
    const mods = Array.from(new Set(permissions.map((p) => p.module)));
    return ['ALL', ...mods];
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesModule = selectedModule === 'ALL' || p.module === selectedModule;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.endpoint.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.method.toLowerCase().includes(q);
      return matchesModule && matchesSearch;
    });
  }, [permissions, selectedModule, searchQuery]);

  const handleTestAccess = async (entry: RbacPermissionEntry) => {
    setTestingEndpointId(entry.id);
    setTestResult(null);
    try {
      const res = await api.post('/rbac/test-access', { endpointId: entry.id });
      setTestResult({
        endpointId: entry.id,
        status: res.data.status || 200,
        allowed: res.data.allowed,
        message: res.data.message,
      });
      success(`[200 OK] Access Granted for your role (${currentUser?.role}) to ${entry.method} ${entry.endpoint}`);
    } catch (err: any) {
      const resData = err.response?.data;
      setTestResult({
        endpointId: entry.id,
        status: err.response?.status || 403,
        allowed: false,
        message: resData?.message || `403 Forbidden: Role ${currentUser?.role} is not authorized.`,
      });
      info(`[403 Forbidden] Backend enforced: Access denied for role (${currentUser?.role})`);
    } finally {
      setTestingEndpointId(null);
    }
  };

  const getMethodBadgeStyle = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
      case 'POST':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800';
      case 'PUT':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
      case 'PATCH':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const rolesHeader: { key: 'SuperAdmin' | 'Admin' | 'SalesManager' | 'SalesRep'; label: string; badgeBg: string }[] = [
    { key: 'SuperAdmin', label: 'Super Admin', badgeBg: 'bg-purple-500' },
    { key: 'Admin', label: 'Company Owner', badgeBg: 'bg-blue-500' },
    { key: 'SalesManager', label: 'Sales Manager', badgeBg: 'bg-amber-500' },
    { key: 'SalesRep', label: 'Sales Rep', badgeBg: 'bg-emerald-500' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Console Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl backdrop-blur-md text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-extrabold tracking-tight">RBAC Permission & API Security Console</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Real-time backend role-based API access control catalog. All endpoints enforce strict authorization middleware on the server. Unauthorized requests return <code className="bg-rose-950/60 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800/60 text-[11px] font-mono">403 Forbidden</code>.
          </p>
        </div>

        {/* Current Active Role Badge */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-3 rounded-2xl z-10 flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Your Active Role</span>
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              {currentUser?.role || 'Guest'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Live Search */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Module Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide w-full md:w-auto">
            {modulesList.map((mod) => (
              <button
                key={mod}
                onClick={() => setSelectedModule(mod)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedModule === mod
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {mod === 'ALL' ? 'All Modules' : mod}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 flex-shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search endpoint or method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </CardBody>
      </Card>

      {/* Live Endpoint Authorization Test Result Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg transition-all animate-fadeIn ${
            testResult.allowed
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {testResult.allowed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <div>
              <p className="font-bold text-sm">
                HTTP {testResult.status} {testResult.allowed ? 'Access Granted' : '403 Forbidden'}
              </p>
              <p className="opacity-90 font-mono text-[11px] mt-0.5">{testResult.message}</p>
            </div>
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="text-xs font-bold underline opacity-75 hover:opacity-100 self-end sm:self-center cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* RBAC Permission Matrix Table */}
      <Card>
        <CardHeader className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Real-Time API Endpoint Matrix ({filteredPermissions.length} Endpoints)
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRbacMatrix} className="gap-1 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Matrix
          </Button>
        </CardHeader>

        <CardBody className="p-0 overflow-x-auto scrollbar-hide">
          {isLoading ? (
            <div className="p-10 text-center text-xs text-slate-400 dark:text-zinc-500 italic flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              Verifying backend role policies...
            </div>
          ) : filteredPermissions.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
              No API endpoints match the current module or search query.
            </div>
          ) : (
            <table className="w-full min-w-[850px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-[#18181B] border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">API Endpoint &amp; Action</th>
                  {rolesHeader.map((role) => {
                    const isMyRole = activeRoleKey === role.key;
                    return (
                      <th key={role.key} className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${role.badgeBg}`} />
                            {role.label}
                          </span>
                          {isMyRole && (
                            <span className="text-[9px] bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded-full lowercase tracking-normal">
                              you
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="p-3.5 text-right">Test Backend API</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                {filteredPermissions.map((entry) => {
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Endpoint Details */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black rounded-lg border font-mono ${getMethodBadgeStyle(
                                entry.method
                              )}`}
                            >
                              {entry.method}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                              {entry.endpoint}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                            {entry.description}
                          </p>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                            Module: {entry.module}
                          </span>
                        </div>
                      </td>

                      {/* 4 Role Permission Columns */}
                      {rolesHeader.map((role) => {
                        const isAllowed = entry.allowedRoles.includes(role.key);
                        const isUserCurrentRole = activeRoleKey === role.key;

                        return (
                          <td key={role.key} className="p-3.5 text-center align-middle">
                            <div className="flex justify-center">
                              {isAllowed ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                    isUserCurrentRole
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  Allowed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60 opacity-80">
                                  <XCircle className="w-3 h-3 text-rose-500 flex-shrink-0" />
                                  403 Denied
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Test Authorization Button */}
                      <td className="p-3.5 text-right align-middle">
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={testingEndpointId === entry.id}
                          onClick={() => handleTestAccess(entry)}
                          className="gap-1.5 rounded-xl text-xs font-bold hover:border-blue-400 hover:text-blue-600"
                        >
                          <Play className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          Test Access
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default RbacPermissionConsole;

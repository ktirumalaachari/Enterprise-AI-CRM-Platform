import React, { useEffect, useState } from 'react';
import { Clock, LogOut, RefreshCw, CheckCircle2, Building2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';

export const PendingApprovalPage = () => {
  const { user, logout, login, setAccountStatus } = useAuthStore();
  const navigate = useNavigate();
  const { success, error, info } = useToast();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [joinRequest, setJoinRequest] = useState<{
    status: string;
    companyName?: string;
    requestedAt?: string;
    rejectionReason?: string;
  } | null>(null);

  const checkStatus = async (isManual = false) => {
    if (isManual) setChecking(true);
    try {
      // 1. Fetch latest join request status
      const res = await api.get('/join-requests/my');
      const jr = res.data.joinRequest;
      setJoinRequest(jr);
      setLastChecked(new Date());

      // 2. Refresh session to sync accountStatus from User model
      let currentStatus = jr?.status;
      try {
        const refreshRes = await api.post('/auth/refresh', {});
        if (refreshRes.data.accessToken && refreshRes.data.user) {
          login(refreshRes.data.accessToken, refreshRes.data.user);
          if (refreshRes.data.user.accountStatus === 'ACTIVE') {
            currentStatus = 'APPROVED';
          } else if (refreshRes.data.user.accountStatus === 'REJECTED') {
            currentStatus = 'REJECTED';
          }
        }
      } catch {
        // Silently handle refresh errors
      }

      if (currentStatus === 'APPROVED') {
        success('🎉 Your join request was approved! Redirecting to CRM Dashboard...');
        setAccountStatus('ACTIVE');
        navigate('/dashboard', { replace: true });
      } else if (currentStatus === 'REJECTED') {
        error('Your join request was declined by the company admin.');
        setAccountStatus('REJECTED');
        navigate('/rejected', { replace: true });
      } else if (isManual) {
        info('Request is currently under review by your Company Admin. Please check back shortly.');
      }
    } catch (err: any) {
      if (isManual) {
        error('Failed to check approval status. Please try again.');
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus(false);
    // Auto-poll approval status every 10 seconds for live background updates
    const interval = setInterval(() => {
      checkStatus(false);
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_16px_rgba(0,0,0,0.06),_0_24px_64px_rgba(0,0,0,0.12),_0_2px_4px_rgba(0,0,0,0.04)] border border-slate-200/90 p-6 sm:p-8 text-center space-y-5">
        
        {/* Status Badge & Icon */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
            <Clock size={12} className="text-amber-600" />
            <span>Awaiting Admin Approval</span>
          </div>

          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-center mx-auto text-amber-600 shadow-sm">
            <Clock className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Request Submitted
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
              {user?.name && <span className="text-slate-800 font-semibold">Hi {user.name.split(' ')[0]}, </span>}
              your request to join
              {joinRequest?.companyName ? (
                <span className="text-amber-700 font-bold"> {joinRequest.companyName} </span>
              ) : (
                ' the company '
              )}
              is pending review.
            </p>
          </div>
        </div>

        {/* Company Details Box */}
        {joinRequest?.companyName && (
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-left flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Company</p>
                <p className="text-xs sm:text-sm font-bold text-slate-900">{joinRequest.companyName}</p>
              </div>
            </div>
            {joinRequest.requestedAt && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Requested</p>
                <p className="text-xs font-semibold text-slate-600">{new Date(joinRequest.requestedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        )}

        {/* Workflow Progress Steps */}
        <div className="space-y-2.5 text-left p-3.5 bg-slate-50/60 border border-slate-200/60 rounded-xl">
          {[
            { label: 'Account Created', done: true },
            { label: 'Join Code Submitted', done: true },
            { label: 'Admin Review', done: false, active: true },
            { label: 'CRM Access Granted', done: false },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.done
                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-600'
                    : step.active
                    ? 'bg-amber-100 border border-amber-300 text-amber-600'
                    : 'bg-slate-100 border border-slate-200 text-slate-400'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : step.active ? (
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>
              <span
                className={`text-xs font-semibold ${
                  step.done
                    ? 'text-emerald-700'
                    : step.active
                    ? 'text-amber-800'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* User Account Banner */}
        {user?.email && (
          <p className="text-xs text-slate-400 font-medium">
            Signed in as: <span className="text-slate-700 font-semibold">{user.email}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => checkStatus(true)}
            disabled={checking}
            id="pending-check-status-btn"
            className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking Status...' : 'Check Approval Status'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            id="pending-logout-btn"
            className="flex-1 py-2.5 px-4 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Status Indicator & Live Last Checked Timestamp */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>
            {lastChecked
              ? `Last checked: ${lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Auto-checking status in background...'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalPage;


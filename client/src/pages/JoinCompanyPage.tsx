import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, LogOut, Building2, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export const JoinCompanyPage = () => {
  const navigate = useNavigate();
  const { user, logout, setAccountStatus } = useAuthStore();

  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Please enter your company join code.');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const res = await api.post('/join-requests', { joinCode: trimmedCode });
      setSuccess(res.data.message || 'Join request submitted. Awaiting Admin approval.');

      // Update account status in store
      setAccountStatus('PENDING_APPROVAL');

      // Redirect after short delay
      setTimeout(() => {
        navigate('/pending-approval', { replace: true });
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit join request. Please check your code.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_16px_rgba(0,0,0,0.06),_0_24px_64px_rgba(0,0,0,0.12),_0_2px_4px_rgba(0,0,0,0.04)] border border-slate-200/90 p-6 sm:p-8 space-y-6">
        
        {/* Header & Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] font-bold text-blue-600">
            <Building2 size={12} className="text-blue-600" />
            <span>CORPORATE WORKSPACE</span>
          </div>

          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-600/20 mx-auto">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Join Your Company
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {user?.name ? `Welcome, ${user.name.split(' ')[0]}!` : 'Welcome!'} Enter the join code shared by your Company Admin.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <KeyRound className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            Ask your Company Admin for the 8-character join code. After entering it, your request will be reviewed before access is granted.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Company Join Code
            </label>
            <div className="relative">
              <input
                id="join-code-input"
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="e.g. A3KX7BPN"
                maxLength={20}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-4 py-2.5 sm:py-3 bg-[#f8fafc] border border-slate-200/90 rounded-xl text-slate-800 placeholder:text-slate-400 text-xs sm:text-sm font-mono tracking-[0.2em] uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !joinCode.trim()}
            id="join-company-submit-btn"
            className="w-full py-2.5 sm:py-3 px-4 bg-brand-primary hover:bg-brand-secondary text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-brand-primary/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                Submit Join Request
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer & Sign Out */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={handleLogout}
            id="join-company-logout-btn"
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinCompanyPage;


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Lock,
  User as UserIcon,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';

export const AcceptInvitationPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { success, error } = useToast();

  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<{
    email: string;
    role: string;
    companyName: string;
    companyStatus: string;
    expiresAt: string;
  } | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerificationError('Missing invitation token link.');
      setIsVerifying(false);
      return;
    }

    const verifyToken = async () => {
      setIsVerifying(true);
      try {
        const res = await api.get(`/invitations/verify/${token}`);
        if (res.data.success && res.data.invitation) {
          setInvitationInfo(res.data.invitation);
        } else {
          setVerificationError(res.data.message || 'Invalid or expired invitation token.');
        }
      } catch (err: any) {
        setVerificationError(err.response?.data?.message || 'Invalid or expired invitation token link.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!fullName.trim()) {
      error('Please enter your full name.');
      return;
    }

    if (!password) {
      error('Please enter a password.');
      return;
    }

    if (password.length > 8) {
      error('Password cannot exceed 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      error('Password and Confirm Password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/invitations/accept', {
        token,
        name: fullName,
        password,
      });

      if (res.data?.accessToken && res.data?.user) {
        login(res.data.accessToken, res.data.user);
        success(`Welcome to ${res.data.user.companyName || 'your workspace'}!`);
        navigate('/dashboard', { replace: true });
      } else {
        success('Account created successfully! Please sign in.');
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to accept invitation.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (r?: string) => {
    if (r === 'SALES_MANAGER') return 'Sales Manager';
    if (r === 'SALES_REPRESENTATIVE') return 'Sales Representative';
    return r || 'Team Member';
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] gap-3">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Verifying team invitation link...</p>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 border border-rose-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Invitation Link Invalid</h2>
          <p className="text-xs text-slate-500">{verificationError}</p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-5 my-8">
        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] font-bold text-blue-600 shadow-2xs">
            <Sparkles size={11} className="animate-pulse" />
            <span>OFFICIAL INVITATION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Accept Team Invitation
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Complete your profile to join <strong>{invitationInfo?.companyName}</strong>.
          </p>
        </div>

        {/* Read-only Invitation Overview Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Workspace:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Building2 size={13} className="text-blue-600" />
              {invitationInfo?.companyName}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Assigned Email:</span>
            <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 border border-slate-200 rounded text-[11px]">
              {invitationInfo?.email}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Assigned Role:</span>
            <span className="font-extrabold text-blue-600 uppercase text-[10px] bg-blue-100/60 px-2 py-0.5 rounded">
              {getRoleLabel(invitationInfo?.role)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <UserIcon size={15} />
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address (Read-only)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail size={15} />
              </span>
              <input
                type="email"
                disabled
                value={invitationInfo?.email || ''}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password (Max 8 Chars) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  maxLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Pass123#"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirm Password *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  maxLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Pass123#"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining Workspace...</span>
                </>
              ) : (
                <>
                  <span>Join Workspace &amp; Continue</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 font-bold hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;

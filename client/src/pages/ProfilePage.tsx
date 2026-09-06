import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  Phone,
  Building,
  Briefcase,
  Shield,
  ShieldCheck,
  Key,
  Smartphone,
  LogOut,
  Camera,
  Trash2,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Lock,
  X,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Zap,
  Star,
  TrendingUp,
} from 'lucide-react';
import useAuthStore, { UserSession } from '../store/authStore';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface ProfileDetails {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  phone: string;
  company: string;
  jobTitle: string;
  isVerified: boolean;
  googleId: string | null;
  isGoogleConnected: boolean;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
}

interface SecurityDetails {
  twoFactorEnabled: boolean;
  activeSessions: number;
  authProvider: string;
}

interface SubscriptionInfo {
  plan: string;
  planDisplayName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  daysRemaining: number;
  aiQueryLimit: number;
  currentAiUsage: number;
  aiCreditsRemaining: number;
  aiCreditUsagePercent: number;
  aiFeaturesEnabled: boolean;
  billingCycle: string | null;
  amountPaid: number | null;
}

// ─── Skeleton Loader Components ───────────────────────────────────────────────

const SkeletonLine = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
);

const ProfileSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Left Card */}
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col items-center gap-4">
      <SkeletonLine className="w-24 h-24 !rounded-full" />
      <SkeletonLine className="w-32 h-4" />
      <SkeletonLine className="w-24 h-3" />
      <div className="w-full space-y-3 pt-4 border-t border-slate-100">
        <SkeletonLine className="w-full h-4" />
        <SkeletonLine className="w-full h-4" />
        <SkeletonLine className="w-full h-4" />
      </div>
    </div>
    {/* Right Column */}
    <div className="lg:col-span-2 flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <SkeletonLine className="w-48 h-5" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonLine className="w-24 h-3" />
              <SkeletonLine className="w-full h-9" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <SkeletonLine className="w-48 h-5" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonLine key={i} className="w-full h-14" />
        ))}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, logout } = useAuthStore();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [security, setSecurity] = useState<SecurityDetails | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  // Form state
  const [formData, setFormData] = useState({ name: '', phone: '', company: '', jobTitle: '' });

  // Avatar modal
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Email modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<'request' | 'verify'>('request');
  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isRequestingEmail, setIsRequestingEmail] = useState(false);

  // Logout all
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Delete Account modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getInitials = useCallback((nameStr: string) => {
    if (!nameStr) return 'CR';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return nameStr.substring(0, 2).toUpperCase();
  }, []);

  const avatarDisplay = useMemo(() => {
    if (profile?.avatar) return profile.avatar;
    return null;
  }, [profile?.avatar]);

  // ─── API: Fetch Profile ──────────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile');
      const pData = res.data.data?.user ?? res.data.user;
      const sData = res.data.data?.security ?? res.data.security;
      const subData = res.data.data?.subscription ?? res.data.subscription ?? null;

      // Derive hasPassword by attempting a separate select (or use authProvider)
      const derived: ProfileDetails = {
        ...pData,
        hasPassword: sData?.authProvider === 'Email/Password',
      };

      setProfile(derived);
      setSecurity(sData);
      setSubscription(subData);
      setFormData({
        name: pData.name || '',
        phone: pData.phone || '',
        company: pData.company || '',
        jobTitle: pData.jobTitle || '',
      });
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ─── API: Update Profile ─────────────────────────────────────────────────────

  const handleUpdateProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/profile', formData);
      const updatedUser = res.data.data ?? res.data.user;
      setProfile(prev => prev ? { ...prev, ...updatedUser } : null);
      if (user) {
        login(useAuthStore.getState().accessToken || '', { ...user, name: updatedUser.name } as UserSession);
      }
      success('Profile updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }, [formData, user, login, success, error]);

  // ─── Avatar: File Validation ─────────────────────────────────────────────────

  const validateAndPreviewFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      error('Image size exceeds 5 MB. Please select a smaller file.');
      return;
    }
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      error('Unsupported format. Please use JPG, PNG, or WEBP.');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }, [error]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndPreviewFile(file);
  }, [validateAndPreviewFile]);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndPreviewFile(file);
  }, [validateAndPreviewFile]);

  // ─── API: Upload Avatar (multipart FormData) ──────────────────────────────────

  const handleUploadAvatar = useCallback(async () => {
    if (!selectedFile) return;
    try {
      setIsUploadingAvatar(true);
      setUploadProgress(0);

      const formDataObj = new FormData();
      formDataObj.append('avatar', selectedFile);

      const res = await api.post('/profile/upload-avatar', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(pct);
          }
        },
      });

      const newAvatar = res.data.data?.avatar ?? res.data.avatar;
      setProfile(prev => prev ? { ...prev, avatar: newAvatar } : null);
      if (user) login(useAuthStore.getState().accessToken || '', { ...user, avatar: newAvatar });

      success('Profile picture updated successfully!');
      setIsAvatarModalOpen(false);
      setPreviewAvatar(null);
      setSelectedFile(null);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to upload picture. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(0);
    }
  }, [selectedFile, user, login, success, error]);

  // ─── API: Remove Avatar ───────────────────────────────────────────────────────

  const handleRemoveAvatar = useCallback(async () => {
    try {
      setIsUploadingAvatar(true);
      await api.delete('/profile/avatar');
      setProfile(prev => prev ? { ...prev, avatar: '' } : null);
      if (user) login(useAuthStore.getState().accessToken || '', { ...user, avatar: '' });
      success('Profile picture removed.');
      setIsAvatarModalOpen(false);
      setPreviewAvatar(null);
      setSelectedFile(null);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to remove picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [user, login, success, error]);

  // ─── API: Change Password ─────────────────────────────────────────────────────

  const handleChangePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    try {
      setIsChangingPassword(true);
      await api.put('/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      success('Password updated successfully!');
      setIsPasswordModalOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  }, [passwordData, success]);

  // ─── API: Request Email Change ────────────────────────────────────────────────

  const handleRequestEmailChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    try {
      setIsRequestingEmail(true);
      const res = await api.post('/profile/request-email-change', {
        newEmail,
        password: currentPasswordForEmail || undefined,
      });
      success(res.data.message || 'Verification code sent!');
      setEmailStep('verify');
    } catch (err: any) {
      setEmailError(err.response?.data?.message || 'Failed to send verification email.');
    } finally {
      setIsRequestingEmail(false);
    }
  }, [newEmail, currentPasswordForEmail, success]);

  // ─── API: Verify Email OTP ────────────────────────────────────────────────────

  const handleVerifyEmailOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    // Client-side validation: must be exactly 6 digits
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setEmailError('Please enter a valid 6-digit verification code.');
      return;
    }

    try {
      setIsRequestingEmail(true);
      // Always send OTP as a trimmed string
      const res = await api.put('/profile/verify-email-change', { otp: otpCode.trim() });
      const updatedUser = res.data.data?.user ?? res.data.user;

      setProfile(prev => prev ? { ...prev, email: updatedUser.email } : null);
      if (user) login(useAuthStore.getState().accessToken || '', { ...user, email: updatedUser.email });

      success('Email updated successfully!');
      setIsEmailModalOpen(false);
      setEmailStep('request');
      setNewEmail('');
      setCurrentPasswordForEmail('');
      setOtpCode('');
    } catch (err: any) {
      setEmailError(err.response?.data?.message || 'Failed to verify code. Please try again.');
    } finally {
      setIsRequestingEmail(false);
    }
  }, [otpCode, user, login, success]);

  // ─── API: Logout All Devices ──────────────────────────────────────────────────

  const handleLogoutAll = useCallback(async () => {
    try {
      setIsLoggingOutAll(true);
      await api.post('/profile/logout-all');
      success('Logged out from all active sessions.');
      setSecurity(prev => prev ? { ...prev, activeSessions: 1 } : null);
    } catch {
      error('Failed to terminate sessions.');
    } finally {
      setIsLoggingOutAll(false);
    }
  }, [success, error]);

  // ─── API: Delete Account ──────────────────────────────────────────────────────

  const handleDeleteAccount = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deletion.');
      return;
    }
    try {
      setIsDeletingAccount(true);
      await api.delete('/profile/account', {
        data: {
          confirmText: 'DELETE',
          password: deletePassword || undefined,
        },
      });
      success('Your account has been permanently deleted.');
      logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  }, [deleteConfirmText, deletePassword, logout, navigate, success]);

  // ─── Render: Loading Skeleton ─────────────────────────────────────────────────

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#F8FAFC] p-3 sm:p-6 max-w-5xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
          <SkeletonLine className="w-16 h-8" />
          <div className="space-y-2">
            <SkeletonLine className="w-56 h-5" />
            <SkeletonLine className="w-80 h-3" />
          </div>
        </div>
        <ProfileSkeleton />
      </motion.div>
    );
  }

  // ─── Render: Main Page ────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] p-0 sm:p-6 text-slate-800 dark:text-zinc-100 font-sans max-w-full sm:max-w-5xl mx-auto selection:bg-blue-500 selection:text-white"
    >
      {/* ── Page Header: Back Button (Hidden on Mobile) ──────────────────────────── */}
      <div className="hidden sm:block mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left Column: Avatar & Overview ─────────────────────────────────── */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#121212] rounded-none sm:rounded-2xl border-0 sm:border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-6 shadow-none sm:shadow-xs flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-20 sm:h-24 bg-gradient-to-r from-blue-600 to-indigo-600 pointer-events-none" />

            {/* Avatar */}
            <div className="relative mt-6 sm:mt-8 mb-3 sm:mb-4">
              {avatarDisplay ? (
                <img
                  src={avatarDisplay}
                  alt={profile?.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full border-4 border-white dark:border-zinc-800 shadow-md object-cover"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full border-4 border-white dark:border-zinc-800 shadow-md bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl tracking-widest">
                  {getInitials(profile?.name || '')}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute bottom-0 right-0 p-1.5 sm:p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-2 border-white dark:border-zinc-800 transition-all transform hover:scale-110 cursor-pointer"
                title="Manage Profile Photo"
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate px-2">{profile?.name}</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium mb-2 sm:mb-3 truncate px-2">{profile?.email}</p>

            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 mb-3 sm:mb-4">
              <span className="px-2 py-0.5 sm:px-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] sm:text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Verified
              </span>
              {profile?.isGoogleConnected ? (
                <span className="px-2 py-0.5 sm:px-2.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Google Linked
                </span>
              ) : (
                <span className="px-2 py-0.5 sm:px-2.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-[10px] sm:text-[11px] font-medium">
                  Standard Password
                </span>
              )}
            </div>

            <div className="w-full pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-2.5 text-xs text-slate-600 dark:text-zinc-400 text-left">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500"><Calendar className="w-3.5 h-3.5" /> Member Since</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-200">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500"><Clock className="w-3.5 h-3.5" /> Last Active</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-200">
                  {profile?.lastLogin
                    ? new Date(profile.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just Now'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500"><Smartphone className="w-3.5 h-3.5" /> Active Sessions</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                  {security?.activeSessions || 1} Device{(security?.activeSessions || 1) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Personal Information Card */}
          <div className="bg-white dark:bg-[#121212] rounded-none sm:rounded-2xl border-0 sm:border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-6 shadow-none sm:shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Personal &amp; Professional Information
              </h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    placeholder="Your full name"
                    required
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Email (read-only + change button) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Email Address <span className="text-slate-400 dark:text-zinc-500 font-normal">(Read-only)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={profile?.email || ''}
                      readOnly
                      disabled
                      className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-500 dark:text-zinc-400 cursor-not-allowed font-medium"
                    />
                    <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Phone Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    placeholder="+1 (555) 000-0000"
                  />
                  <Phone className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Company */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Company Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    placeholder="Acme CRM Global"
                  />
                  <Building className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Job Title</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={e => setFormData(p => ({ ...p, jobTitle: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    placeholder="Senior Sales Executive"
                  />
                  <Briefcase className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Role (read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Assigned RBAC Role</label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile?.role || ''}
                    readOnly
                    disabled
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-500 dark:text-zinc-400 cursor-not-allowed font-medium"
                  />
                  <Shield className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="sm:col-span-2 pt-2 flex justify-end">
                <Button
                  type="submit"
                  isLoading={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Account Security Card */}
          <div className="bg-white dark:bg-[#121212] rounded-none sm:rounded-2xl border-0 sm:border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-6 shadow-none sm:shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Account Security &amp; Credentials
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {/* Change Password */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"><Key className="w-5 h-5" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Account Password</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {profile?.hasPassword ? 'Password-based authentication active' : 'Signed in via Google OAuth'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  disabled={!profile?.hasPassword}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Change Password
                </button>
              </div>

              {/* Google Auth Status */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Google Authentication</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {profile?.isGoogleConnected ? 'Google account linked successfully' : 'Not linked to Google'}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${profile?.isGoogleConnected ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 dark:border dark:border-emerald-800' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                  {profile?.isGoogleConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* 2FA UI-Ready Placeholder */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0"><Smartphone className="w-5 h-5" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">Add an extra layer of security via OTP authenticator apps.</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-bold w-fit shrink-0">UI Ready</span>
              </div>

              {/* Logout All Devices */}
              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0"><LogOut className="w-5 h-5" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Sessions</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">Sign out of all mobile &amp; desktop browser sessions.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutAll}
                  disabled={isLoggingOutAll}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto shrink-0"
                >
                  {isLoggingOutAll ? 'Revoking...' : 'Logout All Devices'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Subscription & AI Credits Card ───────────────────────────── */}
          {subscription && (
            <div className="bg-white dark:bg-[#121212] rounded-none sm:rounded-2xl border-0 sm:border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-6 shadow-none sm:shadow-xs overflow-hidden relative">
              {/* Decorative top gradient bar */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500" />

              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                  Subscription &amp; AI Credits
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  subscription.status === 'active'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : subscription.status === 'trial'
                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}>
                  {subscription.status === 'trial' ? '14-Day Trial' : subscription.status}
                </span>
              </div>

              {/* Plan Name Row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Current Plan</p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                    AI CRM{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">
                      {(subscription.planDisplayName || '').replace('AI CRM', '').trim() || subscription.plan}
                    </span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/40">
                  <Star className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                </div>
              </div>

              {/* Date grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Plan Started
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                    {subscription.startDate
                      ? new Date(subscription.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {subscription.status === 'trial' ? 'Trial Ends' : 'Renews On'}
                  </p>
                  <p className={`text-xs font-bold ${
                    subscription.daysRemaining <= 3
                      ? 'text-red-600 dark:text-red-400'
                      : subscription.daysRemaining <= 7
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-800 dark:text-zinc-100'
                  }`}>
                    {subscription.endDate
                      ? new Date(subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                    {subscription.daysRemaining > 0 && (
                      <span className="ml-1.5 text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                        ({subscription.daysRemaining}d left)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* AI Credits Progress */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    AI Credits Used This Month
                  </p>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                    {subscription.currentAiUsage.toLocaleString()}
                    <span className="text-slate-400 dark:text-zinc-500 font-normal"> / {subscription.aiQueryLimit.toLocaleString()}</span>
                  </p>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      subscription.aiCreditUsagePercent >= 90
                        ? 'bg-gradient-to-r from-red-500 to-rose-500'
                        : subscription.aiCreditUsagePercent >= 70
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-blue-500 to-violet-500'
                    }`}
                    style={{ width: `${subscription.aiCreditUsagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">{subscription.aiCreditUsagePercent}% used</span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {subscription.aiCreditsRemaining.toLocaleString()} remaining
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone: Delete Account — hidden for SuperAdmin */}
          {profile?.role !== 'SuperAdmin' && (
            <div className="bg-white dark:bg-[#121212] rounded-2xl border border-red-200 dark:border-rose-900/40 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-100 dark:border-rose-900/30">
                <h3 className="text-base font-bold text-red-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </h3>
              </div>
              <div className="p-4 rounded-xl bg-red-50 dark:bg-rose-950/20 border border-red-200 dark:border-rose-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-red-800 dark:text-rose-300">Delete Account Permanently</h4>
                  <p className="text-[11px] text-red-600 dark:text-rose-400 mt-0.5">
                    This will permanently delete your account, all data, sessions, and uploads. This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ════ AVATAR MODAL ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121212] rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-zinc-800 shadow-xl relative"
            >
              <button
                type="button"
                onClick={() => { setIsAvatarModalOpen(false); setPreviewAvatar(null); setSelectedFile(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Manage Profile Photo</h3>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 mb-4 transition-all cursor-pointer
                  ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60'}
                `}
              >
                {/* Preview or Initials */}
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-400 mb-3 flex items-center justify-center bg-slate-100 dark:bg-zinc-800">
                  {previewAvatar ? (
                    <img src={previewAvatar} alt="Preview" className="w-full h-full object-cover" />
                  ) : profile?.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-600 dark:text-zinc-300">{getInitials(profile?.name || '')}</span>
                  )}
                </div>

                {!selectedFile && (
                  <>
                    <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                      {isDragOver ? 'Drop your image here' : 'Drag & drop or click to select'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Supported: JPG, PNG, WEBP · Max 5 MB</p>
                  </>
                )}
                {selectedFile && (
                  <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200 text-center">{selectedFile.name}</p>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
              />

              {/* Upload Progress */}
              {isUploadingAvatar && uploadProgress > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Select Image
                </button>

                {profile?.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="px-3 py-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>

              {selectedFile && (
                <div className="mt-3">
                  <Button
                    type="button"
                    onClick={handleUploadAvatar}
                    isLoading={isUploadingAvatar}
                    className="w-full bg-blue-600 text-white text-xs font-bold"
                  >
                    Save Photo
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════ CHANGE PASSWORD MODAL ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121212] rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-zinc-800 shadow-xl relative"
            >
              <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Change Password
              </h3>
              {passwordError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{passwordError}</span>
                </div>
              )}
              <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field, i) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      {['Current Password', 'New Password', 'Confirm New Password'][i]}
                    </label>
                    <input
                      type="password"
                      value={passwordData[field]}
                      onChange={e => setPasswordData(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                ))}
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer">Cancel</button>
                  <Button type="submit" isLoading={isChangingPassword} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold">Update Password</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════ CHANGE EMAIL MODAL ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121212] rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-zinc-800 shadow-xl relative"
            >
              <button type="button" onClick={() => { setIsEmailModalOpen(false); setEmailStep('request'); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Change Email Address
              </h3>
              {emailError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{emailError}</span>
                </div>
              )}

              {emailStep === 'request' ? (
                <form onSubmit={handleRequestEmailChange} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">New Email Address</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="newname@company.com"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                  {profile?.hasPassword && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Current Password (Security Check)</label>
                      <input
                        type="password"
                        value={currentPasswordForEmail}
                        onChange={e => setCurrentPasswordForEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        required
                      />
                    </div>
                  )}
                  <div className="pt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setIsEmailModalOpen(false)} className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer">Cancel</button>
                    <Button type="submit" isLoading={isRequestingEmail} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold">Send OTP Code</Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-zinc-300">
                    A 6-digit code was sent to <strong className="text-slate-900 dark:text-white">{newEmail}</strong>. Enter it below to verify.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">6-Digit OTP Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-center text-xl font-mono font-bold tracking-[0.5em] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setEmailStep('request')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Resend Code
                    </button>
                    <Button type="submit" isLoading={isRequestingEmail} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold">
                      Verify &amp; Update
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════ DELETE ACCOUNT MODAL — hidden for SuperAdmin ══════════════════════════════════════════════ */}
      {profile?.role !== 'SuperAdmin' && (
        <AnimatePresence>
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-[#121212] rounded-2xl p-6 max-w-md w-full border border-red-200 dark:border-rose-900/40 shadow-xl relative"
              >
                <button
                  type="button"
                  onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmText(''); setDeletePassword(''); setDeleteError(''); }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-red-100 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-red-800 dark:text-rose-300">Delete Account Permanently</h3>
                    <p className="text-[11px] text-red-500 dark:text-rose-400">This action is irreversible. All your data will be deleted.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-950/20 border border-red-200 dark:border-rose-900/40 mb-4 text-xs text-red-700 dark:text-rose-300 space-y-1">
                  <p className="font-semibold">The following will be permanently deleted:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-red-600 dark:text-rose-400">
                    <li>Your account and personal information</li>
                    <li>All active sessions and refresh tokens</li>
                    <li>Notifications and activity logs</li>
                    <li>Profile avatar from cloud storage</li>
                  </ul>
                </div>

                {deleteError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs mb-3 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span>{deleteError}</span>
                  </div>
                )}

                <form onSubmit={handleDeleteAccount} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Type <span className="font-mono font-bold text-red-600 dark:text-rose-400">DELETE</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-red-300 dark:border-rose-800/80 rounded-xl text-xs font-mono font-bold tracking-widest text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      required
                      autoComplete="off"
                    />
                  </div>

                  {profile?.hasPassword && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Current Password (Required)</label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        required
                      />
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmText(''); setDeletePassword(''); setDeleteError(''); }}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isDeletingAccount || deleteConfirmText !== 'DELETE'}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {isDeletingAccount && <Loader2 className="w-3 h-3 animate-spin" />}
                      {isDeletingAccount ? 'Deleting...' : 'Delete My Account'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default ProfilePage;

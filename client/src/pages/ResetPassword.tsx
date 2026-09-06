import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, Sparkles, AlertCircle, CheckCircle2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardBody } from '../components/ui/Card';

export const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: toastError } = useToast();

  // These are passed via navigate state from VerifyOTP page
  const email = location.state?.email || '';
  const resetToken = location.state?.resetToken || '';

  // Guard: if no reset token, redirect to forgot-password
  useEffect(() => {
    if (!resetToken || !email) {
      navigate('/forgot-password', { replace: true });
    }
  }, [resetToken, email, navigate]);

  // ─── Password validation matching the server schema (6–8 chars) ───────────────
  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['bg-rose-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'];

    return {
      score,
      label: labels[score - 1] || 'Very Weak',
      color: colors[score - 1] || 'bg-rose-500',
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    if (password.length > 8) {
      errors.push('Password cannot exceed 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!resetToken) {
      setError('Reset authorization missing. Please restart the forgot password process.');
      navigate('/forgot-password', { replace: true });
      return;
    }

    setIsLoading(true);

    try {
      // Send email + resetToken (NOT the OTP) to the backend.
      // The backend verifies the signed JWT reset token to authorize the password change.
      const response = await api.post('/auth/reset-password', {
        email,
        resetToken,
        newPassword,
      });

      if (response.data.success) {
        setIsSuccess(true);
        success('Password updated successfully!');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        'Failed to reset password. Please try again or restart the process.';
      setError(errorMessage);
      toastError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      {/* Soft Ambient Background Glows */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none animate-pulse-aura" />
      <div className="absolute -bottom-8 right-2 w-56 h-56 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-aura" />

      <div className="w-full max-w-md relative z-10">
        <Card className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_40px_rgba(37,99,235,0.08)] border border-slate-200/90 overflow-hidden">
          <CardHeader className="p-6 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '9s' }} />
              </div>
              <span className="text-sm font-bold text-slate-800 tracking-tight">AI CRM Suite</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Create New Password
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Choose a strong password for your account
            </p>
          </CardHeader>

          <CardBody className="p-6 pt-4">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">
                  Password Updated!
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  Your password has been successfully reset.
                </p>
                <p className="text-xs text-slate-500">
                  Redirecting to login...
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      maxLength={8}
                      className={`w-full pl-10 pr-10 py-3 bg-[#f8fafc] border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-medium shadow-xs ${
                        error
                          ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400/20'
                          : 'border-slate-200/90 focus:ring-3 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                            className={`h-full ${passwordStrength.color} transition-all`}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600">
                          {passwordStrength.label}
                        </span>
                      </div>

                      {/* Password Requirements — match backend validation exactly */}
                      <div className="space-y-1">
                        <div className={`flex items-center gap-1.5 text-[10px] ${newPassword.length >= 6 && newPassword.length <= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" />
                          <span>6–8 characters</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] ${/[A-Z]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" />
                          <span>One uppercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] ${/[a-z]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" />
                          <span>One lowercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] ${/[0-9]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" />
                          <span>One number</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] ${/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <Check className="w-3 h-3" />
                          <span>One special character (e.g. @, #, !)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      maxLength={8}
                      className={`w-full pl-10 pr-10 py-3 bg-[#f8fafc] border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-medium shadow-xs ${
                        error && confirmPassword && confirmPassword !== newPassword
                          ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400/20'
                          : 'border-slate-200/90 focus:ring-3 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 text-xs font-semibold text-rose-500 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      Passwords do not match
                    </motion.p>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  disabled={
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword ||
                    validatePassword(newPassword).errors.length > 0
                  }
                  className="w-full"
                >
                  {isLoading ? 'Updating...' : 'Reset Password'}
                </Button>

                {/* Back to Login */}
                <div className="pt-2 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardBody>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-400">
            🔒 Choose a strong password to protect your account
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

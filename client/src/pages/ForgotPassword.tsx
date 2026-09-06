import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardBody } from '../components/ui/Card';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [devModeCode, setDevModeCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      
      if (response.data.success) {
        setIsSuccess(true);
        success('Verification code sent successfully!');
        
        // Show dev mode code if available
        if (response.data.devModeCode) {
          setDevModeCode(response.data.devModeCode);
        }

        // Redirect to verify OTP page after 2 seconds
        setTimeout(() => {
          navigate('/verify-otp', { state: { email } });
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to send verification code. Please try again.';
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
              Reset Password
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Enter your registered email address
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
                  Verification Code Sent!
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  We've sent a 6-digit verification code to your email address.
                </p>
                
                {devModeCode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2">
                      [Dev Mode Code]
                    </p>
                    <p className="text-2xl font-bold text-amber-900 tracking-widest">
                      {devModeCode}
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-slate-500">
                  Redirecting to verification page...
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className={`w-full pl-10 pr-4 py-3 bg-[#f8fafc] border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-medium shadow-xs ${
                        error
                          ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400/20'
                          : 'border-slate-200/90 focus:ring-3 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white'
                      }`}
                    />
                  </div>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 text-xs font-semibold text-rose-500 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </motion.p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </Button>

                {/* Back to Login */}
                <div className="pt-4 text-center">
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
            🔒 Your information is secure. We use industry-standard encryption.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

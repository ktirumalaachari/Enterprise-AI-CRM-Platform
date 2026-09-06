import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as any) || {};

  const planName = (state.plan || 'SaaS').toUpperCase();
  const paymentId = state.paymentId || 'RZP_SUCCESS';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center relative z-10"
      >
        {/* Animated Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </motion.div>

        <h1 className="text-3xl font-extrabold text-white mb-2">Payment Successful 🎉</h1>
        <p className="text-slate-300 text-sm mb-6">
          Your <span className="text-emerald-400 font-semibold">{planName}</span> subscription is now active!
        </p>

        {/* Feature Unlocked Box */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 mb-6 text-left space-y-3">
          <div className="flex items-center gap-3 text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> AI Features Unlocked
          </div>
          <ul className="text-xs text-slate-300 space-y-2">
            <li className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-400" /> AI Assistant & Copilot Chat Enabled
            </li>
            <li className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-400" /> AI Email & Follow-up Generator Active
            </li>
            <li className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-400" /> AI Note & Meeting Summarizer Ready
            </li>
          </ul>
        </div>

        {/* Payment Ref Info */}
        <div className="text-[11px] text-slate-500 font-mono mb-6 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Payment ID: {paymentId}
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center justify-center gap-2"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
};

export default PaymentSuccessPage;

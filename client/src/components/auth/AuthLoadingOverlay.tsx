import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShieldCheck, CheckCircle2, Zap } from 'lucide-react';

interface AuthLoadingOverlayProps {
  isVisible: boolean;
  mode?: 'signin' | 'signup' | 'google';
  onComplete?: () => void;
}

const STAGE_MESSAGES = [
  'Authenticating...',
  'Verifying Credentials...',
  'Signing You In...',
  'Preparing Dashboard...',
  'Almost Ready...',
  'Redirecting...',
];

export const AuthLoadingOverlay: React.FC<AuthLoadingOverlayProps> = ({
  isVisible,
  mode = 'signin',
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStage(0);
      setProgress(15);
      return;
    }

    // Progress bar increments smoothly
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.floor(Math.random() * 12) + 5;
      });
    }, 220);

    // Message stage switcher
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < STAGE_MESSAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, [isVisible]);

  const getSubtext = () => {
    if (mode === 'google') return 'Connecting securely via Google OAuth 2.0 Provider';
    if (mode === 'signup') return 'Setting up your new workspace and security keys';
    return 'Verifying access tokens and user authorizations';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl selection:bg-blue-500 selection:text-white p-4 overflow-hidden"
          style={{ touchAction: 'none' }}
        >
          {/* Ambient Background Aura Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-aura" />
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Central Card Container */}
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -10, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm sm:max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col items-center text-center overflow-hidden"
          >
            {/* Top Security Badge */}
            <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Enterprise SSL Encrypted</span>
            </div>

            {/* Logo Centerpiece with Rotating Gradient Ring */}
            <div className="relative mb-8 flex items-center justify-center">
              {/* Outer Spinning Gradient Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_25px_rgba(59,130,246,0.5)]"
              >
                <div className="w-full h-full bg-slate-950 rounded-full" />
              </motion.div>

              {/* Inner Glowing Core */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/40 text-white font-extrabold text-xl sm:text-2xl border border-white/20"
                >
                  <div className="flex items-center gap-0.5">
                    <span>AI</span>
                    <Sparkles className="w-4 h-4 text-blue-200 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Dynamic Stage Message Header */}
            <div className="h-14 flex flex-col justify-center items-center mb-6 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStage}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    {STAGE_MESSAGES[currentStage]}
                    {currentStage === STAGE_MESSAGES.length - 1 && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {getSubtext()}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden mb-3 p-0.5 border border-slate-700/50">
              <motion.div
                initial={{ width: '15%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)]"
              />
            </div>

            {/* Micro Details Footer */}
            <div className="flex items-center justify-between w-full text-[11px] text-slate-500 font-mono mt-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
                AICRM Engine
              </span>
              <span>{progress}%</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthLoadingOverlay;

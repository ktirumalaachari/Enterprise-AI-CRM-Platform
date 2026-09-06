import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((msg: string, dur?: number) => toast(msg, 'success', dur), [toast]);
  const error = useCallback((msg: string, dur?: number) => toast(msg, 'error', dur), [toast]);
  const info = useCallback((msg: string, dur?: number) => toast(msg, 'info', dur), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div 
        className={isMobileOrTablet 
          ? "fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100%-2.5rem)] pointer-events-none"
          : "fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        }
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={isMobileOrTablet
                ? { opacity: 0, y: -30, scale: 0.95 }
                : { opacity: 0, y: 15, scale: 0.95 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={isMobileOrTablet
                ? { opacity: 0, y: -20, scale: 0.95 }
                : { opacity: 0, y: -10, scale: 0.95 }
              }
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 w-full bg-white text-slate-800 border-slate-100 premium-shadow`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                {t.type === 'info' && <Info className="w-5 h-5 text-brand-primary" />}
              </div>
              <div className="flex-grow text-sm font-medium pr-2">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

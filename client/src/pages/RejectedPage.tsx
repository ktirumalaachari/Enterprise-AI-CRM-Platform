import React from 'react';
import { XCircle, LogOut, Mail, RefreshCw } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export const RejectedPage = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_16px_rgba(0,0,0,0.06),_0_24px_64px_rgba(0,0,0,0.12),_0_2px_4px_rgba(0,0,0,0.04)] border border-slate-200/90 p-6 sm:p-8 text-center space-y-5">
        
        {/* Status Badge & Icon */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-[10px] font-bold text-rose-700 uppercase tracking-wider">
            <XCircle size={12} className="text-rose-600" />
            <span>Access Denied</span>
          </div>

          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center justify-center mx-auto text-rose-600 shadow-sm">
            <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Join Request Rejected
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
              {user?.name && <span className="text-slate-800 font-semibold">Hi {user.name.split(' ')[0]}, </span>}
              your request to join the company was reviewed and declined by the Company Admin.
            </p>
          </div>
        </div>

        {/* Info Box / Next Steps */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-left space-y-2">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-rose-600" />
            What can you do?
          </h3>
          <ul className="space-y-1.5">
            {[
              'Contact your Company Admin directly to discuss access.',
              'Ensure you entered the correct 8-character join code.',
              'Ask your Admin to re-review and approve your request.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* User Account Banner */}
        {user?.email && (
          <p className="text-xs text-slate-400 font-medium">
            Logged in as: <span className="text-slate-700 font-semibold">{user.email}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => window.location.reload()}
            id="rejected-check-status-btn"
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Status Again
          </button>

          <button
            type="button"
            onClick={handleLogout}
            id="rejected-logout-btn"
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectedPage;


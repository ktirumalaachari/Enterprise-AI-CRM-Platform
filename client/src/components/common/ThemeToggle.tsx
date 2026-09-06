import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`group relative inline-flex items-center w-14 h-7 rounded-full p-0.5 transition-all duration-300 outline-none cursor-pointer select-none shrink-0 overflow-hidden
        ${
          isDark
            ? 'bg-zinc-800/95 border border-zinc-700 shadow-inner'
            : 'bg-slate-200/90 border border-slate-300 shadow-inner'
        }
        hover:scale-102 active:scale-95
        ${className}
      `}
    >
      {/* Background Micro Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Sun className={`w-3.5 h-3.5 transition-all duration-300 ${!isDark ? 'text-amber-500 opacity-20' : 'text-zinc-500 opacity-80'}`} />
        <Moon className={`w-3.5 h-3.5 transition-all duration-300 ${isDark ? 'text-blue-400 opacity-20' : 'text-slate-400 opacity-80'}`} />
      </div>

      {/* iOS Sliding Capsule Knob */}
      <div
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ease-out shadow-md
          ${
            isDark
              ? 'translate-x-7 bg-zinc-950 text-blue-400 border border-zinc-700'
              : 'translate-x-0 bg-white text-amber-500 border border-slate-200'
          }
        `}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 fill-blue-400/20 text-blue-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 fill-amber-500/20 text-amber-500" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;

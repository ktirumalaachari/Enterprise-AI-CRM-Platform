import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const LogoIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <div className={`relative ${className} shrink-0 rounded-xl overflow-hidden shadow-md transition-transform duration-200 hover:scale-105 select-none bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center p-1.5 border border-blue-400/40`}>
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* High-Contrast Bold AI Star / Spark Emblem */}
      <path 
        d="M12 2L14.8 8.6L22 12L14.8 15.4L12 22L9.2 15.4L2 12L9.2 8.6L12 2Z" 
        fill="#FFFFFF" 
      />
      <circle cx="12" cy="12" r="3.5" fill="#1D4ED8" />
      <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
    </svg>
  </div>
);

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  onClick,
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const textSizeMap = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <LogoIcon className={sizeMap[size]} />

      {showText && (
        <div className="flex flex-col leading-none">
          <div className={`font-black tracking-tight ${textSizeMap[size]} flex items-center gap-1.5`}>
            <span className="text-slate-900 dark:text-white">AI CRM</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 tracking-wider">
              PRO
            </span>
          </div>
          {size !== 'sm' && (
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-zinc-400 tracking-wider mt-1">
              Enterprise Sales Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;

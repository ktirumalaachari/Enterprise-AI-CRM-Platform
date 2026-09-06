import React from 'react';
import { Loader2 } from 'lucide-react';
import { LogoIcon } from '../common/Logo';

/**
 * TableSkeletonLoader: Renders realistic table skeleton rows matching enterprise CRM grids.
 */
export const TableSkeletonLoader: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 5,
  className = '',
}) => {
  return (
    <div className={`w-full overflow-hidden animate-pulse ${className}`}>
      {/* Header row skeleton */}
      <div className="flex items-center gap-4 px-4 py-3 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700/60">
        {Array.from({ length: columns }).map((_, idx) => (
          <div
            key={`th-${idx}`}
            className={`h-3.5 bg-slate-200 dark:bg-slate-700 rounded-md ${idx === 0 ? 'w-24' : idx === columns - 1 ? 'w-20 ml-auto' : 'w-28'}`}
          />
        ))}
      </div>

      {/* Data rows skeleton */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`row-${rIdx}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
            {/* Column 1: Name + avatar placeholder */}
            <div className="flex items-center gap-2.5 w-36">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-20" />
            </div>

            {/* Column 2: Email */}
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-36 hidden sm:block" />

            {/* Column 3: Status Badge */}
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />

            {/* Column 4: Date */}
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 hidden md:block" />

            {/* Column 5: Action Buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * CardSkeletonLoader: Renders realistic form/card skeleton layouts.
 */
export const CardSkeletonLoader: React.FC<{ count?: number; className?: string }> = ({
  count = 1,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`card-skel-${idx}`}
          className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 animate-pulse"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-44" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * BrandedSectionLoader: Impressive animated loader for major views and full-page transitions.
 */
export const BrandedSectionLoader: React.FC<{
  title?: string;
  subtitle?: string;
  className?: string;
}> = ({
  title = 'Loading AI CRM...',
  subtitle = 'Syncing your workspace data in real-time',
  className = '',
}) => {
  return (
    <div className={`min-h-[340px] w-full flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="relative mb-5 flex items-center justify-center">
        {/* Ambient pulse rings */}
        <div className="absolute w-20 h-20 rounded-full bg-blue-500/15 dark:bg-blue-500/25 animate-ping" />
        <div className="absolute w-14 h-14 rounded-full bg-indigo-500/20 dark:bg-indigo-500/30 animate-pulse" />

        {/* Center icon */}
        <div className="relative z-10 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800">
          <LogoIcon className="w-9 h-9" />
        </div>
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center justify-center gap-2">
          <span>{title}</span>
          <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {subtitle}
        </p>
      </div>

      {/* Progress Bar Line */}
      <div className="w-44 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-4">
        <div className="w-full h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-full animate-[shimmer_1.5s_infinite]" />
      </div>
    </div>
  );
};

export default BrandedSectionLoader;

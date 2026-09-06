import React, { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'rect', className = '', ...props }) => {
  const baseClass = 'bg-slate-200 dark:bg-slate-800 animate-pulse-slow';
  
  const variants: Record<'text' | 'rect' | 'circle', string> = {
    text: 'h-4 w-full rounded',
    rect: 'w-full h-32 rounded-lg',
    circle: 'rounded-full',
  };

  return (
    <div
      className={`${baseClass} ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

export default Skeleton;

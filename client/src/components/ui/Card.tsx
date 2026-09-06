import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hoverable = false, className = '', ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl smooth-shadow transition-all duration-200 
        ${hoverable ? 'hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700' : ''} 
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ children, className = '', ...props }) => {
  return (
    <div className={`px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ children, className = '', ...props }) => {
  return (
    <div className={`px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-b-2xl ${className}`} {...props}>
      {children}
    </div>
  );
};

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'crisis' | 'sage' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-2xl transition-all duration-150';

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantStyles = {
    default: 'bg-white border border-slate-200/80 shadow-xs text-slate-800',
    interactive:
      'bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-[#0F766E]/40 cursor-pointer text-slate-800',
    crisis: 'bg-[#FFFBEB] border-2 border-[#FDE68A] text-amber-950 shadow-xs',
    sage: 'bg-[#F4F7F5] border border-[#CBD5E1] text-slate-800',
    subtle: 'bg-stone-100/60 border border-stone-200/60 text-slate-700',
  };

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'sage' | 'amber' | 'neutral' | 'coral' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 font-semibold rounded-full tracking-tight select-none';

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs sm:text-sm',
    lg: 'px-3.5 py-1.5 text-sm',
  };

  const variantStyles = {
    brand: 'bg-[#F0FDFA] text-[#0D5C56] border border-[#CCFBF1]',
    sage: 'bg-[#F4F7F5] text-[#3B5B52] border border-[#CBD5E1]',
    amber: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
    coral: 'bg-[#FFF5F2] text-[#C4573C] border border-[#FCD5CC]',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    outline: 'bg-transparent text-slate-600 border border-slate-300',
  };

  const dotColors = {
    brand: 'bg-[#0D5C56]',
    sage: 'bg-[#4A6B62]',
    amber: 'bg-[#D97706]',
    coral: 'bg-[#D96B4F]',
    neutral: 'bg-slate-500',
    outline: 'bg-slate-400',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};

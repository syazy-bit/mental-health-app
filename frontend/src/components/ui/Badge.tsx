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
    brand: 'bg-[#F0FDFA] dark:bg-[#142725] text-[#0D5C56] dark:text-[#4FA79D] border border-[#CCFBF1] dark:border-[#28534E]',
    sage: 'bg-[#F4F7F5] dark:bg-[#172320] text-[#3B5B52] dark:text-[#86A69D] border border-[#CBD5E1] dark:border-[#30443F]',
    amber: 'bg-[#FEF3C7] dark:bg-[#281F13] text-[#92400E] dark:text-[#E7A044] border border-[#FDE68A] dark:border-[#5E421E]',
    coral: 'bg-[#FFF5F2] dark:bg-[#2A1E1B] text-[#C4573C] dark:text-[#E58A73] border border-[#FCD5CC] dark:border-[#523630]',
    neutral: 'bg-slate-100 dark:bg-[#1C2623] text-slate-700 dark:text-[#AAB6B1] border border-slate-200/80 dark:border-[#283632]',
    outline: 'bg-transparent text-slate-600 dark:text-[#AAB6B1] border border-slate-300 dark:border-[#283632]',
  };

  const dotColors = {
    brand: 'bg-[#0D5C56] dark:bg-[#4FA79D]',
    sage: 'bg-[#4A6B62] dark:bg-[#86A69D]',
    amber: 'bg-[#D97706] dark:bg-[#E7A044]',
    coral: 'bg-[#D96B4F] dark:bg-[#E58A73]',
    neutral: 'bg-slate-500 dark:bg-slate-400',
    outline: 'bg-slate-400 dark:bg-slate-500',
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

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'sage' | 'amber' | 'neutral' | 'coral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const variantStyles = {
    brand: 'bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]',
    sage: 'bg-[#F4F7F5] text-[#3B5B52] border border-[#CBD5E1]',
    amber: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
    coral: 'bg-[#FFF5F2] text-[#C4573C] border border-[#FCD5CC]',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

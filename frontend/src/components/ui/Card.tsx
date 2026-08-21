import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'crisis' | 'sage' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-2xl transition-all duration-200';

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-7 sm:p-8',
  };

  const variantStyles = {
    // Default Clean Card
    default:
      'bg-white border border-[#E6E4DD] shadow-[0_1px_3px_rgba(25,35,45,0.04)] text-[#19232D]',
    // Elevated Card
    elevated:
      'bg-white border border-[#E6E4DD]/80 shadow-[0_4px_16px_rgba(25,35,45,0.06)] text-[#19232D]',
    // Interactive Hover Card
    interactive:
      'bg-white border border-[#E6E4DD] shadow-[0_1px_3px_rgba(25,35,45,0.04)] hover:shadow-[0_10px_24px_-4px_rgba(25,35,45,0.08)] hover:border-[#0D5C56]/40 cursor-pointer text-[#19232D] group',
    // Crisis / Safety Check-in Card (Calming Warm Amber)
    crisis:
      'bg-[#FFFBEB] border-2 border-[#FDE68A] text-[#78350F] shadow-[0_1px_3px_rgba(217,119,6,0.08)]',
    // Sage Wellness Card
    sage:
      'bg-[#F4F7F5] border border-[#CBD5E1] text-[#19232D]',
    // Subtle Neutral Card
    subtle:
      'bg-[#FAF8F5] border border-[#E6E4DD] text-slate-700',
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

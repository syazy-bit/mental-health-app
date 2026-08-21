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
      'bg-white dark:bg-[#18211F] border border-[#E6E4DD] dark:border-[#283632] shadow-[0_1px_3px_rgba(25,35,45,0.04)] dark:shadow-none text-[#19232D] dark:text-[#F1F3EF]',
    // Elevated Card
    elevated:
      'bg-white dark:bg-[#202B28] border border-[#E6E4DD]/80 dark:border-[#283632] shadow-[0_4px_16px_rgba(25,35,45,0.06)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)] text-[#19232D] dark:text-[#F1F3EF]',
    // Interactive Hover Card
    interactive:
      'bg-white dark:bg-[#18211F] border border-[#E6E4DD] dark:border-[#283632] shadow-[0_1px_3px_rgba(25,35,45,0.04)] hover:shadow-[0_10px_24px_-4px_rgba(25,35,45,0.08)] dark:hover:shadow-[0_10px_24px_-4px_rgba(0,0,0,0.4)] hover:border-[#0D5C56]/40 dark:hover:border-[#4FA79D]/40 cursor-pointer text-[#19232D] dark:text-[#F1F3EF] group',
    // Crisis / Safety Check-in Card (Calming Warm Amber)
    crisis:
      'bg-[#FFFBEB] dark:bg-[#281F13] border-2 border-[#FDE68A] dark:border-[#5E421E] text-[#78350F] dark:text-[#FDE68A] shadow-[0_1px_3px_rgba(217,119,6,0.08)]',
    // Sage Wellness Card
    sage:
      'bg-[#F4F7F5] dark:bg-[#172320] border border-[#CBD5E1] dark:border-[#30443F] text-[#19232D] dark:text-[#F1F3EF]',
    // Subtle Neutral Card
    subtle:
      'bg-[#FAF8F5] dark:bg-[#141C1A] border border-[#E6E4DD] dark:border-[#283632] text-slate-700 dark:text-[#AAB6B1]',
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

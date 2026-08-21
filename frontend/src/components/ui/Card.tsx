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
      'bg-white dark:bg-[#162220] border border-[#E8E5DC] dark:border-[#253633] shadow-card text-[#1A242B] dark:text-[#F1F5F3]',
    // Elevated Card
    elevated:
      'bg-white dark:bg-[#1C2B28] border border-[#E8E5DC] dark:border-[#253633] shadow-card text-[#1A242B] dark:text-[#F1F5F3]',
    // Interactive Hover Card
    interactive:
      'bg-white dark:bg-[#162220] border border-[#E8E5DC] dark:border-[#253633] shadow-card hover:shadow-card-hover hover:border-[#0E5A54]/40 dark:hover:border-[#57ADA3]/40 cursor-pointer text-[#1A242B] dark:text-[#F1F5F3] group',
    // Crisis / Safety Check-in Card (Calming Warm Amber)
    crisis:
      'bg-[#FFFBEB] dark:bg-[#281D10] border border-[#FDE68A] dark:border-[#5C3F1C] text-[#78350F] dark:text-[#FDE68A] shadow-xs',
    // Sage Wellness Card
    sage:
      'bg-[#F1F6F4] dark:bg-[#162420] border border-[#CAD8D1] dark:border-[#2E4740] text-[#1A242B] dark:text-[#F1F5F3]',
    // Subtle Neutral Card
    subtle:
      'bg-[#FAF8F5] dark:bg-[#131D1B] border border-[#E8E5DC] dark:border-[#253633] text-[#5D6E77] dark:text-[#9EAEA9]',
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

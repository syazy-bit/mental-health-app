import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    rectangular: 'rounded-xl',
    circular: 'rounded-full shrink-0',
  };

  return (
    <div
      className={`animate-pulse bg-slate-200/70 dark:bg-white/10 ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
      {...props}
    >
      </div>
  );
};

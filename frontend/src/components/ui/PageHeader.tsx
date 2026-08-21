import React from 'react';
import Link from 'next/link';
import { Badge, BadgeProps } from './Badge';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: BadgeProps['variant'];
  };
  backLink?: {
    href: string;
    label: string;
  };
  action?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  backLink,
  action,
  align = 'left',
  className = '',
}) => {
  return (
    <div
      className={`space-y-3 ${
        align === 'center' ? 'text-center max-w-2xl mx-auto' : ''
      } ${className}`}
    >
      {(backLink || badge || action) && (
        <div
          className={`flex items-center gap-3 ${
            align === 'center'
              ? 'justify-center'
              : 'justify-between'
          } flex-wrap`}
        >
          {backLink && (
            <Link
              href={backLink.href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#AAB6B1] hover:text-[#0D5C56] dark:hover:text-[#4FA79D] transition-colors focus-accessible rounded-md p-1 -ml-1"
            >
              <span>&larr;</span>
              <span>{backLink.label}</span>
            </Link>
          )}
          {badge && (
            <Badge variant={badge.variant ?? 'brand'} size="md" dot>
              {badge.label}
            </Badge>
          )}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#19232D] dark:text-[#F1F3EF] tracking-tight leading-tight">
        {title}
      </h1>

      {subtitle && (
        <p className="text-sm sm:text-base text-slate-600 dark:text-[#AAB6B1] leading-relaxed max-w-3xl">
          {subtitle}
        </p>
      )}
    </div>
  );
};

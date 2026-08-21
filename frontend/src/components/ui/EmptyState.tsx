import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import Link from 'next/link';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'brand';
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  const defaultIcon = (
    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );

  return (
    <Card
      variant="subtle"
      padding="lg"
      className={`text-center flex flex-col items-center justify-center p-8 sm:p-12 space-y-4 max-w-lg mx-auto ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white border border-[#E6E4DD] flex items-center justify-center shadow-2xs">
        {icon ?? defaultIcon}
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-base sm:text-lg font-bold text-[#19232D]">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {description}
        </p>
      </div>
      {action && (
        <div className="pt-2">
          {action.href ? (
            <Link href={action.href}>
              <Button variant={action.variant ?? 'brand'} size="md">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button
              variant={action.variant ?? 'brand'}
              size="md"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

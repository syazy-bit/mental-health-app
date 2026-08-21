import React from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'crisis';

const variantStyles: Record<AlertVariant, { container: string; icon: string; title: string }> = {
  info: {
    container: 'bg-sky-50/80 border-sky-200 text-sky-950',
    icon: 'text-sky-600',
    title: 'text-sky-900',
  },
  success: {
    container: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
    icon: 'text-emerald-600',
    title: 'text-emerald-900',
  },
  warning: {
    container: 'bg-amber-50/80 border-amber-200 text-amber-950',
    icon: 'text-amber-600',
    title: 'text-amber-900',
  },
  error: {
    container: 'bg-red-50/80 border-red-200 text-red-950',
    icon: 'text-red-600',
    title: 'text-red-900',
  },
  crisis: {
    container: 'bg-[#FFFBEB] border-2 border-[#FDE68A] text-[#78350F]',
    icon: 'text-[#D97706]',
    title: 'text-[#92400E]',
  },
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  icon,
  children,
  className = '',
}) => {
  const styles = variantStyles[variant];

  const defaultIcons = {
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    crisis: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  };

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border p-4 text-xs sm:text-sm flex items-start gap-3 shadow-2xs ${styles.container} ${className}`}
    >
      <span className={`shrink-0 mt-0.5 ${styles.icon}`}>
        {icon ?? defaultIcons[variant]}
      </span>
      <div className="flex-1 space-y-1">
        {title && <p className={`font-bold ${styles.title}`}>{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
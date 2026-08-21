import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'brand' | 'crisis' | 'outline' | 'ghost' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none touch-target focus-accessible active:scale-[0.98] select-none';

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs sm:text-sm tracking-tight',
    md: 'px-5 py-2.5 text-sm sm:text-base tracking-tight',
    lg: 'px-6 py-3.5 text-base sm:text-lg font-bold tracking-tight',
  };

  const variantStyles = {
    // Primary CTA (Terracotta Warm Accent)
    primary:
      'bg-[#D96B4F] dark:bg-[#E58A73] dark:text-[#101817] hover:bg-[#C4573C] dark:hover:bg-[#F09A83] active:bg-[#A8422A] dark:active:bg-[#D47760] text-white shadow-sm hover:shadow-md hover:shadow-[#D96B4F]/20',
    // Secondary Outline (Spruce Teal Border)
    secondary:
      'border-2 border-[#0D5C56] dark:border-[#4FA79D] text-[#0D5C56] dark:text-[#4FA79D] bg-transparent hover:bg-[#F0FDFA] dark:hover:bg-[#142725] active:bg-[#CCFBF1] dark:active:bg-[#1A3734]',
    // Brand Solid (Deep Spruce Teal)
    brand:
      'bg-[#0D5C56] dark:bg-[#4FA79D] dark:text-[#101817] hover:bg-[#115E59] dark:hover:bg-[#61B8AE] active:bg-[#09403C] dark:active:bg-[#3D8F86] text-white shadow-sm hover:shadow-md hover:shadow-[#0D5C56]/20',
    // Crisis Urgent (Warm Golden Amber)
    crisis:
      'bg-[#D97706] dark:bg-[#E7A044] dark:text-[#101817] hover:bg-[#B45309] dark:hover:bg-[#F0B260] active:bg-[#92400E] text-white shadow-sm font-bold hover:shadow-md hover:shadow-[#D97706]/20',
    // Clean Neutral Outline
    outline:
      'border border-[#E6E4DD] dark:border-[#283632] bg-white dark:bg-[#18211F] text-[#19232D] dark:text-[#F1F3EF] hover:bg-stone-50 dark:hover:bg-[#202B28] hover:border-slate-400 dark:hover:border-slate-500 shadow-xs',
    // Subtle Ghost
    ghost:
      'text-slate-700 dark:text-[#AAB6B1] hover:text-slate-900 dark:hover:text-[#F1F3EF] hover:bg-slate-100/70 dark:hover:bg-white/5 active:bg-slate-200/70 dark:active:bg-white/10',
    // Soft Pill Variant
    soft:
      'bg-[#F0FDFA] dark:bg-[#142725] text-[#0D5C56] dark:text-[#4FA79D] hover:bg-[#CCFBF1] dark:hover:bg-[#1A3734] active:bg-[#99F6E4]/50 border border-[#CCFBF1] dark:border-[#28534E]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="shrink-0 -ml-0.5">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0 -mr-0.5">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

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
      'bg-[#CE674D] hover:bg-[#B9573E] active:bg-[#9A412A] text-white shadow-xs hover:shadow-md dark:bg-[#E58A73] dark:hover:bg-[#F09B85] dark:active:bg-[#D4755D] dark:text-[#0F1615]',
    // Secondary Outline (Spruce Teal Border)
    secondary:
      'border border-[#0E5A54] dark:border-[#57ADA3] text-[#0E5A54] dark:text-[#57ADA3] bg-transparent hover:bg-[#F0F9F8] dark:hover:bg-[#142825] active:bg-[#CEF0EB] dark:active:bg-[#193834]',
    // Brand Solid (Deep Spruce Teal)
    brand:
      'bg-[#0E5A54] hover:bg-[#126D66] active:bg-[#09403B] text-white shadow-xs hover:shadow-md dark:bg-[#57ADA3] dark:hover:bg-[#69BFB5] dark:active:bg-[#45938A] dark:text-[#0F1615]',
    // Crisis Urgent (Warm Golden Amber)
    crisis:
      'bg-[#D97706] hover:bg-[#B45309] active:bg-[#92400E] text-white shadow-xs font-bold hover:shadow-md dark:bg-[#ECA347] dark:hover:bg-[#F5B666] dark:text-[#0F1615]',
    // Clean Neutral Outline
    outline:
      'border border-[#E8E5DC] dark:border-[#253633] bg-white dark:bg-[#162220] text-[#1A242B] dark:text-[#F1F5F3] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2B28] hover:border-[#CAD8D1] dark:hover:border-[#37574E] shadow-xs',
    // Subtle Ghost
    ghost:
      'text-[#5D6E77] dark:text-[#9EAEA9] hover:text-[#1A242B] dark:hover:text-[#F1F5F3] hover:bg-black/[0.04] dark:hover:bg-white/5 active:bg-black/[0.08] dark:active:bg-white/10',
    // Soft Pill Variant
    soft:
      'bg-[#F0F9F8] dark:bg-[#142825] text-[#0E5A54] dark:text-[#57ADA3] hover:bg-[#CEF0EB] dark:hover:bg-[#193834] border border-[#CEF0EB] dark:border-[#2B5751]',
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

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string | null;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, helperText, error, id, leftIcon, className = '', ...props }, ref) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#AAB6B1]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-slate-400 dark:text-[#73827D] pointer-events-none shrink-0">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId ?? helperId}
            className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#18211F] text-[#19232D] dark:text-[#F1F3EF] placeholder:text-slate-400 dark:placeholder:text-[#73827D] focus-accessible text-sm sm:text-base transition-colors shadow-2xs ${
              leftIcon ? 'pl-10' : ''
            } ${
              error
                ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950/40'
                : 'border-[#E6E4DD] dark:border-[#283632] hover:border-slate-400 dark:hover:border-slate-500 focus:border-[#0D5C56] dark:focus:border-[#4FA79D] focus:ring-2 focus:ring-[#0D5C56]/15 dark:focus:ring-[#4FA79D]/20'
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p id={errorId} className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500 dark:text-[#73827D]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
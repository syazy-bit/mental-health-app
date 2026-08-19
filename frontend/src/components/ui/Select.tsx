import React from 'react';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, id, className = '', children, ...props }, ref) {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    const describedBy = error ? `${selectId}-error` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full px-4 py-2.5 rounded-xl border bg-white text-slate-900 focus-accessible ${
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-slate-300 focus:border-teal-600'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={describedBy} className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
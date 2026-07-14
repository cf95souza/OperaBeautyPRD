import React from 'react';
import { cn } from './Button.jsx';

export const Input = React.forwardRef(
  ({ className, type = 'text', label, error, helperText, startIcon, endIcon, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label className="text-label-md text-on-surface">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <span className="material-symbols-outlined absolute left-3 text-outline text-[20px]">
              {startIcon}
            </span>
          )}
          <input
            type={type}
            className={cn(
              'flex h-12 w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2 text-body-md text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
              startIcon && 'pl-10',
              endIcon && 'pr-10',
              error && 'border-error focus:border-error focus:ring-error',
              className
            )}
            ref={ref}
            {...props}
          />
          {endIcon && (
            <span className="material-symbols-outlined absolute right-3 text-outline text-[20px]">
              {endIcon}
            </span>
          )}
        </div>
        {(error || helperText) && (
          <p className={cn('text-label-sm mt-0.5', error ? 'text-error' : 'text-outline')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

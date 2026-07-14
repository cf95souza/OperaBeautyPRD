import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const buttonVariants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-fixed-variant shadow-premium active:scale-95',
  secondary: 'bg-secondary text-on-secondary hover:bg-secondary-fixed-variant shadow-premium active:scale-95',
  outline: 'bg-transparent border border-outline text-on-surface hover:bg-surface-variant active:scale-95',
  ghost: 'bg-transparent text-on-surface hover:bg-surface-variant active:scale-95',
  danger: 'bg-error text-on-error hover:opacity-90 shadow-premium active:scale-95',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-label-sm rounded-full',
  md: 'px-4 py-2 text-label-md rounded-full',
  lg: 'px-6 py-3 text-body-md rounded-full',
  icon: 'p-2 rounded-full flex items-center justify-center',
};

export const Button = React.forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      startIcon,
      endIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          buttonVariants[variant],
          buttonSizes[size],
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed active:scale-100 shadow-none hover:bg-opacity-100',
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!isLoading && startIcon && <span className="material-symbols-outlined text-[1.25em]">{startIcon}</span>}
        {children}
        {!isLoading && endIcon && <span className="material-symbols-outlined text-[1.25em]">{endIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

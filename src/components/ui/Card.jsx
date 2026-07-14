import React from 'react';
import { cn } from './Button.jsx';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-outline-variant bg-surface p-6 shadow-card transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

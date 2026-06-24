import { cn } from './utils';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <input
        className={cn(
          'rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary',
          'placeholder:text-text-muted focus:border-tap-orange focus:outline-none focus:ring-1 focus:ring-tap-orange',
          className
        )}
        {...props}
      />
    </div>
  );
}

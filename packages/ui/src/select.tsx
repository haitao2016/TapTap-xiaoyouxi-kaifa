import { cn } from './utils';
import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react';

interface SelectContextValue {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const SelectContext = createContext<SelectContextValue | null>(null);

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Select({ value, defaultValue, onValueChange, children, className }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onChange: handleChange,
        open,
        setOpen,
        triggerRef: triggerRef as React.RefObject<HTMLButtonElement>,
      }}
    >
      <div className={cn('relative inline-block w-full', className)}>{children}</div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  children: ReactNode;
  className?: string;
}

export function SelectTrigger({ children, className }: SelectTriggerProps) {
  const ctx = useContext(SelectContext)!;
  return (
    <button
      ref={ctx.triggerRef}
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary',
        'placeholder:text-text-muted focus:border-tap-orange focus:outline-none focus:ring-1 focus:ring-tap-orange',
        className
      )}
    >
      {children}
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const ctx = useContext(SelectContext)!;
  return (
    <span className={ctx.value ? 'text-text-primary' : 'text-text-muted'}>
      {ctx.value || placeholder}
    </span>
  );
}

interface SelectContentProps {
  children: ReactNode;
  className?: string;
  position?: 'popper' | 'item-aligned';
}

export function SelectContent({ children, className, position = 'popper' }: SelectContentProps) {
  const ctx = useContext(SelectContext)!;
  if (!ctx.open) return null;

  return (
    <div
      className={cn(
        'absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface-1 shadow-lg',
        position === 'popper' && 'top-full left-0',
        className
      )}
    >
      {children}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SelectItem({ value, children, className, disabled }: SelectItemProps) {
  const ctx = useContext(SelectContext)!;
  const isSelected = ctx.value === value;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => ctx.onChange(value)}
      className={cn(
        'flex w-full items-center px-3 py-2 text-sm text-left transition-colors',
        'hover:bg-surface-2 focus:bg-surface-2 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isSelected && 'bg-surface-2 text-tap-orange',
        className
      )}
    >
      {children}
    </button>
  );
}

import { cn } from './index';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  disabled,
  children,
  ...props
}: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        disabled={disabled}
        className={cn(
          "w-4 h-4 rounded border-primary/30 bg-surface-2 text-primary focus:ring-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      />
      {children && <span className="text-sm text-text-secondary">{children}</span>}
    </label>
  );
}

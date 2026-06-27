import { cn } from './utils';

interface ProgressProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function Progress({ value, className, showLabel = true }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-tap-orange transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-text-muted">{clamped.toFixed(0)}%</span>}
    </div>
  );
}

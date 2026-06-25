import { cn } from './utils';
import { useRef, useCallback, useState, useEffect } from 'react';

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  value,
  defaultValue = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState<number[]>(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + percent * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.max(min, Math.min(max, steppedValue));
    },
    [min, max, step]
  );

  const updateValue = useCallback(
    (newValue: number) => {
      const newValues = [newValue];
      if (!isControlled) {
        setInternalValue(newValues);
      }
      onValueChange?.(newValues);
    },
    [isControlled, onValueChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      const newValue = getValueFromPosition(e.clientX);
      updateValue(newValue);

      const handleMouseMove = (e: MouseEvent) => {
        const newValue = getValueFromPosition(e.clientX);
        updateValue(newValue);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [disabled, getValueFromPosition, updateValue]
  );

  const percent = ((currentValue[0] - min) / (max - min)) * 100;

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative flex w-full touch-none items-center select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseDown={handleMouseDown}
    >
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-surface-3">
        <div
          className="absolute h-full bg-tap-orange"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div
        className="absolute h-5 w-5 rounded-full border-2 border-tap-orange bg-white shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-tap-orange focus:ring-offset-2"
        style={{ left: `calc(${percent}% - 10px)` }}
      />
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';

export interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  duration = 1000,
  className = '',
  decimals,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startValueRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const resolvedDecimals =
    typeof decimals === 'number'
      ? decimals
      : Number.isInteger(value)
      ? 0
      : 2;

  useEffect(() => {
    const startVal = startValueRef.current;
    const endVal = value;
    const diff = endVal - startVal;
    
    if (diff === 0) {
      setDisplayValue(endVal);
      return;
    }

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentVal = startVal + diff * easedProgress;
      setDisplayValue(currentVal);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        startValueRef.current = endVal;
        setDisplayValue(endVal);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  const formattedNumber = displayValue.toLocaleString('en-IN', {
    minimumFractionDigits: resolvedDecimals,
    maximumFractionDigits: resolvedDecimals,
  });

  return (
    <span className={`tabular-nums font-mono ${className}`}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;

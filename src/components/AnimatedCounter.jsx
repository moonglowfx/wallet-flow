import React, { useEffect, useState, useRef } from 'react';

/**
 * AnimatedCounter: Smoothly animates numerical changes using requestAnimationFrame.
 * Does not mutate underlying data; only handles visual interpolation with easeOutCubic.
 */
export const AnimatedCounter = ({
  value = 0,
  duration = 650,
  formatter,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const startVal = displayValue;
    const endVal = Number(value) || 0;
    if (startVal === endVal) return;

    startValueRef.current = startVal;
    startTimeRef.current = null;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const current = startValueRef.current + (endVal - startValueRef.current) * easeOutCubic(progress);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  const output = formatter ? formatter(displayValue) : Math.round(displayValue).toLocaleString();

  return <span className={`inline-block font-tabular ${className}`}>{output}</span>;
};

import React, { useId } from 'react';

export interface SparkLineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export const SparkLine: React.FC<SparkLineProps> = ({
  data = [],
  color = '#06B6D4',
  width = 120,
  height = 36,
  className = '',
}) => {
  const gradientId = useId();

  if (!data || data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`overflow-visible ${className}`}
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          strokeOpacity="0.4"
        />
      </svg>
    );
  }

  const paddingY = 4;
  const usableHeight = height - paddingY * 2;
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  // Compute 2D coordinates for all points
  const points = data.map((val, idx) => {
    const x = data.length > 1 ? (idx / (data.length - 1)) * width : width / 2;
    // Invert Y because SVG coordinates increase downwards
    const y = height - paddingY - ((val - minVal) / range) * usableHeight;
    return { x, y };
  });

  // Construct smooth cubic bezier curve
  let linePath = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
  }

  // Construct fill path enclosed with bottom edge
  const lastX = points[points.length - 1].x;
  const firstX = points[0].x;
  const areaPath = `${linePath} L ${lastX},${height} L ${firstX},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible inline-block ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Area under curve */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Foreground sparkline */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default SparkLine;

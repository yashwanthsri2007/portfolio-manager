import React from 'react';

export type SkeletonVariant = 'text' | 'card' | 'chart' | 'table';

export interface LoadingSkeletonProps {
  className?: string;
  variant?: SkeletonVariant;
  rows?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'text',
  rows,
}) => {
  const baseShimmer = 'animate-shimmer rounded-lg bg-gray-800/60';

  if (variant === 'text') {
    const rowCount = rows || 3;
    const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];
    return (
      <div className={`space-y-2.5 ${className}`}>
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            className={`h-4 ${widths[i % widths.length]} ${baseShimmer}`}
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    const cardCount = rows || 1;
    return (
      <div className={`grid grid-cols-1 md:grid-cols-${Math.min(cardCount, 3)} gap-4 ${className}`}>
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div
            key={idx}
            className="glass-card p-5 rounded-2xl space-y-4 border border-gray-800/60"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${baseShimmer}`} />
                <div className="space-y-1.5">
                  <div className={`h-4 w-28 ${baseShimmer}`} />
                  <div className={`h-3 w-16 ${baseShimmer}`} />
                </div>
              </div>
              <div className={`h-5 w-14 rounded-full ${baseShimmer}`} />
            </div>

            <div className="space-y-2 pt-2">
              <div className={`h-8 w-44 ${baseShimmer}`} />
              <div className={`h-3.5 w-24 ${baseShimmer}`} />
            </div>

            <div className={`h-8 w-full rounded-xl ${baseShimmer}`} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`glass-card p-6 rounded-2xl border border-gray-800/60 space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className={`h-5 w-40 ${baseShimmer}`} />
            <div className={`h-3 w-24 ${baseShimmer}`} />
          </div>
          <div className="flex gap-2">
            <div className={`h-8 w-14 rounded-lg ${baseShimmer}`} />
            <div className={`h-8 w-14 rounded-lg ${baseShimmer}`} />
            <div className={`h-8 w-14 rounded-lg ${baseShimmer}`} />
          </div>
        </div>

        {/* Chart bars simulation */}
        <div className="h-48 flex items-end gap-3 pt-6 pb-2 border-b border-gray-800/40">
          {[40, 65, 30, 85, 95, 60, 75, 50, 90, 70, 80, 100].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className={`flex-1 rounded-t-md ${baseShimmer}`}
            />
          ))}
        </div>

        <div className="flex justify-between pt-1">
          {['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV'].map((m) => (
            <div key={m} className={`h-3 w-8 ${baseShimmer}`} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    const tableRows = rows || 5;
    return (
      <div className={`glass-card rounded-2xl border border-gray-800/60 overflow-hidden ${className}`}>
        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-800/60 bg-gray-900/40">
          <div className={`h-4 w-24 ${baseShimmer}`} />
          <div className={`h-4 w-20 ${baseShimmer}`} />
          <div className={`h-4 w-16 ml-auto ${baseShimmer}`} />
          <div className={`h-4 w-20 ml-auto ${baseShimmer}`} />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-800/40">
          {Array.from({ length: tableRows }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 p-4 items-center">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${baseShimmer}`} />
                <div className="space-y-1">
                  <div className={`h-3.5 w-24 ${baseShimmer}`} />
                  <div className={`h-2.5 w-16 ${baseShimmer}`} />
                </div>
              </div>
              <div className={`h-3.5 w-20 ${baseShimmer}`} />
              <div className={`h-3.5 w-16 ml-auto ${baseShimmer}`} />
              <div className={`h-3.5 w-14 ml-auto rounded-full ${baseShimmer}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default LoadingSkeleton;

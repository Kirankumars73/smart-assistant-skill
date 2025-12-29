import React from 'react';

/**
 * Skeleton loader components for different UI elements
 */

// Base shimmer animation
const shimmerClass = "animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]";

// Card skeleton for student/item cards
export const SkeletonCard = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
    {/* Header */}
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-full ${shimmerClass}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-4 w-32 rounded ${shimmerClass}`} />
        <div className={`h-3 w-24 rounded ${shimmerClass}`} />
      </div>
    </div>
    
    {/* Content */}
    <div className="space-y-2">
      <div className={`h-3 w-full rounded ${shimmerClass}`} />
      <div className={`h-3 w-5/6 rounded ${shimmerClass}`} />
      <div className={`h-3 w-4/6 rounded ${shimmerClass}`} />
    </div>
    
    {/* Footer */}
    <div className="flex gap-2 pt-4 border-t border-gray-800">
      <div className={`h-8 w-20 rounded-lg ${shimmerClass}`} />
      <div className={`h-8 w-20 rounded-lg ${shimmerClass}`} />
    </div>
  </div>
);

// Table row skeleton
export const SkeletonTableRow = () => (
  <tr className="border-t border-gray-800">
    <td className="px-4 py-3">
      <div className={`h-4 w-full rounded ${shimmerClass}`} />
    </td>
    <td className="px-4 py-3">
      <div className={`h-4 w-full rounded ${shimmerClass}`} />
    </td>
    <td className="px-4 py-3">
      <div className={`h-4 w-3/4 rounded ${shimmerClass}`} />
    </td>
    <td className="px-4 py-3">
      <div className={`h-4 w-1/2 rounded ${shimmerClass}`} />
    </td>
  </tr>
);

// Stats widget skeleton
export const SkeletonStat = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
    <div className={`w-12 h-12 rounded-lg mb-2 ${shimmerClass}`} />
    <div className={`h-8 w-16 rounded mb-1 ${shimmerClass}`} />
    <div className={`h-4 w-24 rounded ${shimmerClass}`} />
  </div>
);

// Text line skeleton
export const SkeletonText = ({ width = 'full' }) => {
  const widths = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4'
  };
  
  return <div className={`h-4 ${widths[width]} rounded ${shimmerClass}`} />;
};

// Prediction card skeleton
export const SkeletonPrediction = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className={`h-6 w-48 rounded ${shimmerClass}`} />
        <div className={`h-4 w-32 rounded ${shimmerClass}`} />
      </div>
      <div className={`h-10 w-32 rounded-lg ${shimmerClass}`} />
    </div>
    
    <div className="space-y-3">
      <div className={`h-4 w-full rounded ${shimmerClass}`} />
      <div className={`h-4 w-5/6 rounded ${shimmerClass}`} />
      <div className={`h-4 w-4/6 rounded ${shimmerClass}`} />
    </div>
  </div>
);

// Generic skeleton with custom dimensions
export const Skeleton = ({ width = 'full', height = '4', className = '' }) => (
  <div 
    className={`h-${height} w-${width} rounded ${shimmerClass} ${className}`}
    style={{ 
      animation: 'shimmer 2s infinite',
      backgroundSize: '200% 100%'
    }}
  />
);

export default {
  Card: SkeletonCard,
  TableRow: SkeletonTableRow,
  Stat: SkeletonStat,
  Text: SkeletonText,
  Prediction: SkeletonPrediction,
  Custom: Skeleton
};

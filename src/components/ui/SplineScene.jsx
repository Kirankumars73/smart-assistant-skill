import React, { Suspense, lazy } from 'react';

// Lazy load Spline to improve initial page load
const Spline = lazy(() => import('@splinetool/react-spline'));

/**
 * SplineScene - Wrapper component for 3D Spline scenes
 * @param {string} scene - URL to the Spline scene
 * @param {string} className - Additional CSS classes
 */
export function SplineScene({ scene, className }) {
  return (
    <Suspense 
      fallback={
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
          <div className="relative">
            {/* Animated loading spinner with gradient */}
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-400 animate-pulse">Loading 3D Scene...</p>
          </div>
        </div>
      }
    >
      <Spline
        scene={scene}
        className={className}
      />
    </Suspense>
  );
}

export default SplineScene;

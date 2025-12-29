import React from 'react';
import { motion } from 'framer-motion';

const ProgressBar = ({ 
  progress = 0, 
  max = 100,
  showPercentage = true,
  label = '',
  color = 'primary',
  size = 'md',
  animated = true,
  className = ''
}) => {
  const percentage = Math.min(Math.round((progress / max) * 100), 100);
  
  const colors = {
    primary: 'from-pink-500 to-orange-500',
    success: 'from-green-500 to-emerald-500',
    warning: 'from-yellow-500 to-orange-500',
    info: 'from-blue-500 to-cyan-500'
  };

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4'
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label & Percentage */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          {label && <span className="text-gray-300">{label}</span>}
          {showPercentage && (
            <span className="text-gray-400 font-mono">{percentage}%</span>
          )}
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="relative w-full bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`${sizes[size]} bg-gradient-to-r ${colors[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={animated ? { duration: 0.5, ease: 'easeOut' } : { duration: 0 }}
        />
        
        {/* Shine effect */}
        {animated && percentage > 0 && percentage < 100 && (
          <motion.div
            className="absolute top-0 h-full w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ left: '-25%' }}
            animate={{ left: '125%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear'
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;

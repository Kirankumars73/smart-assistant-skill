import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ toast, onDismiss }) => {
  const { id, type, message, duration, action } = toast;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const colors = {
    success: 'from-green-500 to-emerald-500',
    error: 'from-red-500 to-pink-500',
    warning: 'from-yellow-500 to-orange-500',
    info: 'from-blue-500 to-cyan-500'
  };

  const bgColors = {
    success: 'bg-green-500/10 border-green-500/30',
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    info: 'bg-blue-500/10 border-blue-500/30'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      className={`${bgColors[type]} border rounded-lg p-4 shadow-lg min-w-[300px] max-w-md backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`text-2xl flex-shrink-0 bg-gradient-to-br ${colors[type]} bg-clip-text text-transparent`}>
          {icons[type]}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm leading-relaxed break-words">{message}</p>
          
          {/* Action Buttons */}
          {action && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  action.onClick();
                  onDismiss(id);
                }}
                className={`px-3 py-1 rounded text-xs font-semibold bg-gradient-to-r ${colors[type]} text-white hover:opacity-90 transition-opacity`}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => onDismiss(id)}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress Bar for Auto-Dismiss */}
      {duration && duration > 0 && (
        <motion.div
          className={`h-1 mt-3 rounded-full bg-gradient-to-r ${colors[type]} opacity-30`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
};

export default Toast;

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger', 'warning', 'info', 'success'
  icon = null
}) => {
  const colors = {
    danger: {
      gradient: 'from-red-500 to-pink-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      button: 'bg-gradient-to-r from-red-500 to-pink-500',
      icon: '🗑️'
    },
    warning: {
      gradient: 'from-yellow-500 to-orange-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      button: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      icon: '⚠️'
    },
    info: {
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      button: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      icon: 'ℹ️'
    },
    success: {
      gradient: 'from-green-500 to-emerald-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      button: 'bg-gradient-to-r from-green-500 to-emerald-500',
      icon: '✅'
    }
  };

  const theme = colors[type];
  const displayIcon = icon || theme.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`bg-gray-900 border ${theme.border} rounded-2xl shadow-2xl max-w-md w-full overflow-hidden`}>
                {/* Gradient Header Bar */}
                <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />

                <div className="p-6">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring" }}
                      className={`text-4xl p-3 rounded-xl ${theme.bg} border ${theme.border}`}
                    >
                      {displayIcon}
                    </motion.div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                  </div>

                  {/* Message */}
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    {message}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-all hover:scale-105 active:scale-95"
                    >
                      {cancelText}
                    </button>
                    <motion.button
                      onClick={() => {
                        onConfirm();
                        onClose();
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex-1 px-4 py-3 rounded-lg ${theme.button} text-white font-semibold shadow-lg transition-all`}
                    >
                      {confirmText}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;

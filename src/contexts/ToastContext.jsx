import React, { createContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '../components/ui/Toast';

export const ToastContext = createContext();

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, message, options = {}) => {
    const id = toastId++;
    const duration = options.duration !== undefined ? options.duration : 4000;
    
    const toast = {
      id,
      type,
      message,
      duration,
      action: options.action
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, options) => {
    return showToast('success', message, options);
  }, [showToast]);

  const showError = useCallback((message, options) => {
    return showToast('error', message, options);
  }, [showToast]);

  const showWarning = useCallback((message, options) => {
    return showToast('warning', message, options);
  }, [showToast]);

  const showInfo = useCallback((message, options) => {
    return showToast('info', message, options);
  }, [showToast]);

  const showRetry = useCallback((message, onRetry) => {
    return showToast('error', message, {
      duration: 0, // Don't auto-dismiss retry toasts
      action: {
        label: 'Retry',
        onClick: onRetry
      }
    });
  }, [showToast]);

  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showRetry,
    dismissToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

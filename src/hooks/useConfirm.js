import { useState, useCallback } from 'react';

/**
 * Hook for easy confirmation dialogs
 * Usage:
 *   const { confirm, ConfirmDialogComponent } = useConfirm();
 *   
 *   const handleDelete = async () => {
 *     const confirmed = await confirm({
 *       title: 'Delete Student',
 *       message: 'Are you sure you want to delete this student?',
 *       type: 'danger'
 *     });
 *     if (confirmed) {
 *       // do delete
 *     }
 *   };
 */
export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvePromise, setResolvePromise] = useState(null);
  const [config, setConfig] = useState({});

  const confirm = useCallback((options = {}) => {
    setConfig(options);
    setIsOpen(true);
    
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(true);
    }
    setIsOpen(false);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false);
    }
    setIsOpen(false);
  }, [resolvePromise]);

  return {
    confirm,
    isOpen,
    config,
    handleConfirm,
    handleCancel
  };
};

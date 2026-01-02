import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const GradientButton = ({ 
  children, 
  onClick, 
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props 
}) => {
  // Muted, professional colors
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    secondary: 'bg-gray-700 hover:bg-gray-600',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={clsx(
        'rounded-lg font-semibold transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default GradientButton;

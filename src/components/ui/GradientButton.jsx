import React from 'react';
import { motion } from 'framer-motion';

const GradientButton = ({ 
  children, 
  className = '', 
  disabled = false,
  variant = 'cyan', // 'cyan' | 'purple' | 'blue'
  size = 'md', // 'sm' | 'md' | 'lg'
  type = 'button',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    cyan: 'bg-gradient-to-r from-glow-cyan to-glow-blue hover:from-glow-cyan-light hover:to-glow-blue-light shadow-glow',
    purple: 'bg-gradient-to-r from-glow-purple to-glow-pink hover:from-glow-purple-light hover:to-glow-pink-light shadow-glow-purple',
    blue: 'bg-gradient-to-r from-glow-blue to-glow-purple hover:from-glow-blue-light hover:to-glow-purple-light shadow-glow-blue',
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-xl font-semibold
        glow-button ripple
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default GradientButton;

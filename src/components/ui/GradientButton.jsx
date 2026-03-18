import React from 'react';

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
    <button
      type={type}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-xl font-semibold
        ripple active:scale-95
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default GradientButton;

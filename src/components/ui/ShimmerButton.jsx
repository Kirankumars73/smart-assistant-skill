import React from 'react';

const ShimmerButton = ({ 
  children, 
  className = '',
  variant = 'cyan',
  ...props 
}) => {
  const variantColors = {
    cyan: 'from-glow-cyan via-glow-blue to-glow-cyan',
    purple: 'from-glow-purple via-glow-pink to-glow-purple',
    blue: 'from-glow-blue via-glow-purple to-glow-blue',
  };

  return (
    <button
      className={`
        relative overflow-hidden px-6 py-3 rounded-xl font-semibold
        bg-gradient-to-r ${variantColors[variant]}
        glow-button ripple
        ${className}
      `}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
           style={{ backgroundSize: '200% 100%' }} />
    </button>
  );
};

export default ShimmerButton;

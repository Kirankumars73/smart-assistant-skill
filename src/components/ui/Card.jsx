import React from 'react';

const Card = ({ 
  children, 
  className = '',
  hover = true,
  variant = 'default', // 'default' | 'glass' | 'glow'
  onClick,
  ...props 
}) => {
  const baseClasses = "bg-midnight-50/40 border rounded-xl p-6 backdrop-blur-md noise-texture";
  
  const variantClasses = {
    default: "border-slate-700/50",
    glass:   "border-slate-600/50 glass-morphic bg-midnight-50/20",
    glow:    "border-glow-cyan/40 shadow-glow bg-midnight-50/30",
  };

  // Only subtle border/glow transition — no transform/scale/lift on hover
  const hoverClasses = hover
    ? "transition-[border-color,box-shadow] duration-300 hover:border-glow-cyan/50 hover:shadow-[0_0_28px_rgba(6,182,212,0.18)] cursor-pointer"
    : "";

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

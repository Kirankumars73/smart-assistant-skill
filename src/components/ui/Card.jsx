import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ 
  children, 
  className = '',
  hover = true,
  variant = 'default', // 'default' | 'glass' | 'glow'
  onClick,
  ...props 
}) => {
  // Midnight Oil theme - Rich dark base with bioluminescent accents
  const baseClasses = "bg-midnight-50/40 border rounded-xl p-6 backdrop-blur-md noise-texture";
  
  const variantClasses = {
    default: "border-slate-700/50",
    glass: "border-slate-600/50 glass-morphic bg-midnight-50/20",
    glow: "border-glow-cyan/40 shadow-glow bg-midnight-50/30",
  };
  
  const hoverClasses = hover 
    ? "transition-all duration-300 hover:border-glow-cyan/50 cursor-pointer hover:-translate-y-2 hover:shadow-glow card-lift"
    : "";

  const Component = hover ? motion.div : 'div';

  return (
    <Component
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
      whileHover={hover ? { scale: 1.02 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Card;

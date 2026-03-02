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
  const baseClasses = "bg-midnight-50/40 border rounded-xl p-6 backdrop-blur-md noise-texture";
  
  const variantClasses = {
    default: "border-slate-700/50",
    glass:   "border-slate-600/50 glass-morphic bg-midnight-50/20",
    glow:    "border-glow-cyan/40 shadow-glow bg-midnight-50/30",
  };

  // Only transition border-color + box-shadow via CSS
  // ALL transforms (translate, scale) handled solely by Framer Motion to avoid conflicts
  const hoverClasses = hover
    ? "transition-[border-color,box-shadow] duration-300 hover:border-glow-cyan/50 hover:shadow-[0_0_28px_rgba(6,182,212,0.18)] cursor-pointer"
    : "";

  const Component = hover ? motion.div : 'div';

  return (
    <Component
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
      whileHover={hover ? { scale: 1.025, y: -6 } : {}}
      // Silky spring — low stiffness = smooth glide up, damping = no bounce
      transition={{ type: 'spring', stiffness: 160, damping: 22, mass: 0.6 }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Card;

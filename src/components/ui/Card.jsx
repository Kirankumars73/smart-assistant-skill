import React from 'react';

const Card = ({ 
  children, 
  className = '',
  hover = true,
  gradient = false,
  onClick,
  ...props 
}) => {
  // Optimized classes for better performance
  const baseClasses = "bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg";
  
  // Use CSS transforms (GPU accelerated) instead of box-shadow for hover
  const hoverClasses = hover 
    ? "transition-all duration-300 ease-out hover:border-pink-500/30 cursor-pointer will-change-transform hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(236,72,153,0.2)]"
    : "";
  
  const gradientClasses = gradient 
    ? "bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-transparent" 
    : "";

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

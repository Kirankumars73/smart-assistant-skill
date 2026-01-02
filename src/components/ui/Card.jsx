import React from 'react';

const Card = ({ 
  children, 
  className = '',
  hover = true,
  gradient = false,
  onClick,
  ...props 
}) => {
  // Clean, muted card styling
  const baseClasses = "bg-gray-900/50 border border-gray-800/50 rounded-lg p-6 backdrop-blur-sm";
  
  const hoverClasses = hover 
    ? "transition-all duration-200 hover:border-gray-700 cursor-pointer hover:-translate-y-1 hover:bg-gray-900/70"
    : "";
  
  const gradientClasses = gradient 
    ? "bg-gradient-to-br from-gray-900/60 to-gray-800/60" 
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

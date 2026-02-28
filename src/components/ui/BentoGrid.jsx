import React from 'react';

const BentoGrid = ({ 
  children, 
  className = '',
  variant = 'default',
  ...props 
}) => {
  const variantStyles = {
    default: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    dense: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4',
    asymmetric: 'grid-cols-1 md:grid-cols-6',
  };

  return (
    <div
      className={`
        grid gap-4 sm:gap-6
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

// Bento Grid Item with size variants
export const BentoItem = ({ 
  children, 
  className = '',
  size = 'normal', // 'small' | 'normal' | 'wide' | 'tall' | 'large'
  ...props 
}) => {
  const sizeStyles = {
    small: 'md:col-span-1 md:row-span-1',
    normal: 'md:col-span-2 md:row-span-1',
    wide: 'md:col-span-3 md:row-span-1',
    tall: 'md:col-span-2 md:row-span-2',
    large: 'md:col-span-3 md:row-span-2',
  };

  return (
    <div
      className={`
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default BentoGrid;

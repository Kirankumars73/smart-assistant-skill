import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const Card = ({ 
  children, 
  className = '',
  hover = true,
  gradient = false,
  onClick,
  ...props 
}) => {
  const CardWrapper = onClick ? motion.div : motion.div;

  return (
    <CardWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={hover ? { y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' } : {}}
      onClick={onClick}
      className={clsx(
        'bg-gray-800 rounded-xl p-6',
        'shadow-lg transition-all duration-300',
        hover && 'cursor-pointer',
        gradient && 'border-2 border-transparent bg-gradient-to-br from-gray-800 to-gray-900',
        className
      )}
      {...props}
    >
      {children}
    </CardWrapper>
  );
};

export default Card;

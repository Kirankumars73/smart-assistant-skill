import React from 'react';
import clsx from 'clsx';

const Input = ({ 
  label, 
  error, 
  className = '',
  containerClassName = '',
  type = 'text',
  ...props 
}) => {
  return (
    <div className={clsx('mb-4', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        className={clsx(
          'w-full px-4 py-3 rounded-lg',
          'bg-gray-800 border border-gray-700',
          'text-white placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent',
          'transition-all duration-200',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Input;

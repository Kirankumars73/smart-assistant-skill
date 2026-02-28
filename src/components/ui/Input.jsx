import React, { useState } from 'react';

const Input = ({ 
  label, 
  className = '', 
  type = 'text',
  value,
  error,
  icon,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Label — sits above the input, clearly separated */}
      {label && (
        <label
          className={`text-sm font-medium transition-colors duration-200 ${
            isFocused ? 'text-glow-cyan' : 'text-gray-300'
          }`}
        >
          {label}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}

        {/* Input Field */}
        <input
          type={type}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-4 py-2.5
            bg-midnight-100 border rounded-xl
            text-white placeholder-gray-500 text-sm
            transition-all duration-200
            focus-glow outline-none
            ${error ? 'border-red-500' : 'border-slate-700 focus:border-glow-cyan'}
            ${icon ? 'pl-10' : ''}
          `}
          {...props}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
};

export default Input;

import React, { useState, useRef } from 'react';

const SpotlightCard = ({ children, className = '', spotlightColor = 'rgba(6, 182, 212, 0.15)', ...props }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        relative overflow-hidden
        bg-midnight-50/50 border border-slate-600/60 rounded-xl
        transition-all duration-300
        hover:border-glow-cyan/60 hover:shadow-glow-lg
        ${className}
      `}
      {...props}
    >
      {/* Brighter Spotlight Effect */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          background: isHovered
            ? `radial-gradient(300px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(6, 182, 212, 0.35), transparent 60%)`
            : 'none',
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Border glow - only visible on hover */}
      {isHovered && (
        <div
          className="absolute pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 150px at ${mousePosition.x}px ${mousePosition.y}px, rgba(6, 182, 212, 0.6), transparent)`,
            inset: '-1px',
            borderRadius: 'inherit',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            opacity: 0.5,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default SpotlightCard;

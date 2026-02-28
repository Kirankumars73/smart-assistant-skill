import React from 'react';
import { motion } from 'framer-motion';

const MeteorCard = ({ 
  children, 
  className = '',
  meteorCount = 3,
  ...props 
}) => {
  const meteors = Array.from({ length: meteorCount });

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        bg-midnight-100 border border-slate-800 p-6
        card-lift
        ${className}
      `}
      {...props}
    >
      {/* Meteor effects */}
      {meteors.map((_, idx) => (
        <motion.div
          key={idx}
          className="absolute top-0 left-0 h-px w-24 bg-gradient-to-r from-transparent via-glow-cyan to-transparent"
          initial={{ x: '-100%', y: '-100%' }}
          animate={{
            x: ['0%', '150%'],
            y: ['0%', '150%'],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            delay: idx * 1.5,
            ease: 'linear',
          }}
          style={{
            transform: 'rotate(45deg)',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.8)',
          }}
        />
      ))}
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default MeteorCard;

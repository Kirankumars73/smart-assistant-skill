import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const FloatingOrbs = () => {
  const orbsRef = useRef([]);

  useEffect(() => {
    // Create floating animation
    const handleMouseMove = (e) => {
      orbsRef.current.forEach((orb, index) => {
        if (orb) {
          const speed = (index + 1) * 0.0003;
          const x = (e.clientX * speed) - (window.innerWidth * speed / 2);
          const y = (e.clientY * speed) - (window.innerHeight * speed / 2);
          orb.style.transform = `translate(${x}px, ${y}px)`;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {/* Floating Orb 1 - Cyan */}
      <motion.div
        ref={el => orbsRef.current[0] = el}
        className="absolute w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
          top: '20%',
          left: '10%',
          filter: 'blur(60px)',
        }}
        animate={{
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating Orb 2 - Blue */}
      <motion.div
        ref={el => orbsRef.current[1] = el}
        className="absolute w-80 h-80 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          top: '60%',
          right: '15%',
          filter: 'blur(70px)',
        }}
        animate={{
          y: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />

      {/* Floating Orb 3 - Purple */}
      <motion.div
        ref={el => orbsRef.current[2] = el}
        className="absolute w-72 h-72 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
          bottom: '10%',
          left: '50%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [-20, 20, -20],
          y: [0, -20, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-glow-cyan"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            boxShadow: '0 0 4px rgba(6, 182, 212, 0.8)',
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default FloatingOrbs;

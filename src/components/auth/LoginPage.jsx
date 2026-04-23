import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { DotShaderBackground } from '../ui/DotShaderBackground';

// NOTE: Spline was intentionally removed from this page.
// Spline's lockdown-install.js runs SES (Secure EcmaScript) lockdown which
// removes JavaScript intrinsics (eval, Function, etc.) that Firebase's
// signInWithPopup depends on, causing auth to fail silently.

const LoginPage = () => {
  const { signInWithGoogle, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setLocalError('');
      await signInWithGoogle();
    } catch (err) {
      setLocalError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] overflow-hidden">
      {/* Animated Dot Shader Background */}
      <div className="absolute inset-0 z-0">
        <DotShaderBackground />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full flex flex-col md:flex-row">
        
        {/* Left Content - Minimal Login */}
        <div className="flex-1 md:w-2/5 p-8 lg:p-16 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="max-w-md mx-auto w-full space-y-12"
          >
            {/* Title */}
            <div>
              <h1 className="text-6xl md:text-7xl font-light text-white mb-4">
                SMART<br />ACADEMIC
              </h1>
              <p className="text-base text-white/60 font-light">
                AI-powered academic management
              </p>
            </div>

            {/* Login Button */}
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full px-8 py-4 bg-white text-black font-light text-base
                           hover:bg-white/90 active:bg-white/80 disabled:bg-white/50 
                           disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </div>
                )}
              </button>

              {/* Error Message */}
              {(error || localError) && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-light">
                  {error || localError}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Content - Animated geometric visual (replaces Spline 3D) */}
        <div className="flex-1 md:w-3/5 relative hidden md:flex items-center justify-center">
          <div className="relative w-80 h-80">
            {/* Orbiting rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-white/10"
                style={{ 
                  transform: `rotateX(${60 + i * 15}deg) rotateY(${i * 30}deg)`,
                  transformStyle: 'preserve-3d'
                }}
                animate={{ rotateZ: [0, 360] }}
                transition={{ 
                  duration: 12 + i * 4, 
                  repeat: Infinity, 
                  ease: 'linear' 
                }}
              />
            ))}
            {/* Center glow */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0) 70%)'
              }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`p-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-white/30"
                style={{
                  top: `${20 + Math.sin(i * 1.2) * 30}%`,
                  left: `${20 + Math.cos(i * 1.2) * 30}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  x: [0, 10 * (i % 2 ? 1 : -1), 0],
                  opacity: [0.2, 0.7, 0.2],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;


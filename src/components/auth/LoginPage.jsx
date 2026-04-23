import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { DotShaderBackground } from '../ui/DotShaderBackground';

// Lazy-load Spline to defer its heavy bundle
const SplineScene = lazy(() =>
  import('../ui/SplineScene').then(mod => ({ default: mod.SplineScene }))
);

// Google OAuth Client ID (from Firebase project)
const GOOGLE_CLIENT_ID = '292806544658-8umcn4fi8jhnk4c3i70pcqs8l8kkhi29.apps.googleusercontent.com';

const LoginPage = () => {
  const { signInWithGoogle, signInWithGoogleCredential, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showGsiButton, setShowGsiButton] = useState(false);
  const gsiButtonRef = useRef(null);
  const gsiInitialized = useRef(false);

  // Initialize Google Identity Services button as fallback
  const initGsi = useCallback(() => {
    if (gsiInitialized.current || !window.google?.accounts?.id) return;
    
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            setLoading(true);
            setLocalError('');
            await signInWithGoogleCredential(response.credential);
          } catch (err) {
            setLocalError(err.message || 'Failed to sign in.');
          } finally {
            setLoading(false);
          }
        },
        auto_select: false,
        context: 'signin',
      });

      if (gsiButtonRef.current) {
        window.google.accounts.id.renderButton(gsiButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 400,
          shape: 'rectangular',
          text: 'continue_with',
        });
      }
      gsiInitialized.current = true;
    } catch (err) {
      console.error('GIS initialization error:', err);
    }
  }, [signInWithGoogleCredential]);

  // When popup is blocked, show the GIS button
  useEffect(() => {
    if (error === 'POPUP_BLOCKED') {
      setShowGsiButton(true);
    }
  }, [error]);

  // Initialize GIS when the fallback button container appears
  useEffect(() => {
    if (showGsiButton) {
      // Small delay to ensure the DOM ref is available and GIS script is loaded
      const timer = setTimeout(() => {
        if (window.google?.accounts?.id) {
          initGsi();
        } else {
          // GIS script might still be loading — poll for it
          const interval = setInterval(() => {
            if (window.google?.accounts?.id) {
              initGsi();
              clearInterval(interval);
            }
          }, 200);
          // Clean up after 5 seconds
          setTimeout(() => clearInterval(interval), 5000);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showGsiButton, initGsi]);

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

            {/* Login Buttons */}
            <div className="space-y-4">
              {/* Primary: Custom button using Firebase popup */}
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

              {/* Fallback: Google's native sign-in button (shown if popup is blocked) */}
              {showGsiButton && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-white/50 text-center">
                    Pop-up was blocked — use Google's sign-in below instead:
                  </p>
                  <div 
                    ref={gsiButtonRef}
                    className="flex justify-center"
                    style={{ colorScheme: 'auto' }}
                  />
                </motion.div>
              )}

              {/* Error Message (skip the internal POPUP_BLOCKED sentinel) */}
              {(error && error !== 'POPUP_BLOCKED') || localError ? (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-light">
                  {error !== 'POPUP_BLOCKED' ? error : ''}{localError}
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>

        {/* Right Content - 3D Robot */}
        <div className="flex-1 md:w-3/5 relative hidden md:block">
          <div className="w-full h-full">
            <Suspense fallback={<div className="w-full h-full bg-[#0a0a0a]" />}>
              <SplineScene 
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import GradientButton from '../ui/GradientButton';
import { SplineScene } from '../ui/SplineScene';

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
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div className="w-full h-full bg-black relative overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Content - Login Form */}
        <div className="flex-1 md:w-2/5 p-8 lg:p-16 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md mx-auto w-full"
          >
            {/* Logo/Title */}
            <div className="mb-12">
              <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
                Smart<br />Academic
              </h1>
              <p className="text-lg text-gray-400">
                Your intelligent academic assistant powered by AI
              </p>
            </div>

            {/* Features List */}
            <div className="mb-8 space-y-4">
              {[
                { icon: '📊', text: 'Smart Timetable Generation' },
                { icon: '📈', text: 'Student Performance Analytics' },
                { icon: '🎯', text: 'AI-Powered Question Prediction' },
                { icon: '👨‍👩‍👦', text: 'Parent-Teacher Connection' }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3 text-white"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="text-base">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Sign In Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <GradientButton
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-4 text-lg font-semibold"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </div>
                )}
              </GradientButton>

              {/* Error Message */}
              {(error || localError) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                >
                  {error || localError}
                </motion.div>
              )}

              <p className="text-xs text-gray-500 mt-6 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Content - 3D Robot Scene */}
        <div className="flex-1 md:w-3/5 relative hidden md:block">
          <motion.div
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <SplineScene 
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

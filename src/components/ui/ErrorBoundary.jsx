import React from 'react';
import { motion } from 'framer-motion';
import GradientButton from './GradientButton';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Reload the page to reset everything
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl w-full"
          >
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center">
              {/* Error Icon */}
              <div className="text-6xl mb-6">⚠️</div>

              {/* Title */}
              <h1 className="text-3xl font-bold mb-4">
                <span className="text-gradient">Oops!</span> Something went wrong
              </h1>

              {/* Description */}
              <p className="text-gray-400 mb-6 text-lg">
                We encountered an unexpected error. Don't worry, your data is safe.
                You can try refreshing the page or return to the dashboard.
              </p>

              {/* Error Details (only in development) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-red-400 hover:text-red-300 mb-2 font-mono text-sm">
                    🔍 Technical Details (Development Only)
                  </summary>
                  <div className="bg-black rounded-lg p-4 border border-red-900/50 overflow-auto max-h-64">
                    <p className="text-red-400 font-mono text-xs mb-2">
                      <strong>Error:</strong> {this.state.error.toString()}
                    </p>
                    <pre className="text-red-300 font-mono text-xs whitespace-pre-wrap">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center flex-wrap">
                <GradientButton onClick={this.handleReset} size="lg">
                  🏠 Return to Dashboard
                </GradientButton>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors font-semibold"
                >
                  🔄 Refresh Page
                </button>
              </div>

              {/* Help Text */}
              <p className="text-gray-500 text-sm mt-6">
                If this problem persists, please contact support at{' '}
                <a
                  href="mailto:kirankumar07112003@gmail.com"
                  className="text-pink-400 hover:text-pink-300 underline"
                >
                  kirankumar07112003@gmail.com
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;

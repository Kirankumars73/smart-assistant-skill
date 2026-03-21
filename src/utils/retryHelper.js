/**
 * Retry helper for network operations
 * Implements exponential backoff retry logic
 */

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the operation
 */
export const retryOperation = async (
  operation,
  options = {}
) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on these errors
      const noRetryErrors = [
        'permission-denied',
        'unauthenticated',
        'invalid-argument',
        'not-found',
        'already-exists',
      ];

      const errorCode = error.code || '';
      const shouldNotRetry = noRetryErrors.some(code => errorCode.includes(code));

      if (shouldNotRetry || attempt === maxRetries) {
        throw error;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, maxRetries);
      }

      // Wait before retrying (with jitter to prevent thundering herd)
      const jitter = delay * 0.2 * (Math.random() * 2 - 1); // ±20% random jitter
      await sleep(Math.max(0, Math.round(delay + jitter)));

      // Exponential backoff
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is retryable
 */
export const isRetryableError = (error) => {
  const retryableErrors = [
    'network',
    'timeout',
    'unavailable',
    'deadline-exceeded',
    'aborted',
    'cancelled',
  ];

  const errorMessage = (error.message || error.toString()).toLowerCase();
  const errorCode = (error.code || '').toLowerCase();

  return retryableErrors.some(
    keyword => errorMessage.includes(keyword) || errorCode.includes(keyword)
  );
};

/**
 * User-friendly error message mapper
 * Converts technical errors into actionable messages
 */

export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred';

  const errorMessage = error.message || error.toString();
  const errorCode = error.code || '';

  // Firebase Auth Errors
  if (errorCode.includes('auth/')) {
    const authErrors = {
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-credential': 'Incorrect email or password',
      'auth/too-many-requests': 'Too many failed attempts. Please wait before trying again',
      'auth/missing-password': 'Please enter your password',
      'auth/email-already-in-use': 'This email is already registered',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/invalid-email': 'Invalid email address',
      'auth/user-disabled': 'This account has been disabled',
      'auth/operation-not-allowed': 'Sign in method not enabled',
      'auth/account-exists-with-different-credential': 'Account already exists with different sign-in method',
      'auth/popup-closed-by-user': 'Sign in canceled',
      'auth/popup-blocked': 'Please enable popups for this site',
      'auth/unauthorized-domain': 'This domain is not authorized. Contact admin',
      'auth/network-request-failed': 'Connection failed. Check your internet',
    };
    return authErrors[errorCode] || 'Authentication failed. Please try again';
  }

  // Firestore Errors
  if (errorCode.includes('firestore/')) {
    const firestoreErrors = {
      'firestore/permission-denied': 'You don\'t have permission for this action. Sign in as faculty/admin',
      'firestore/not-found': 'Item not found. It may have been deleted',
      'firestore/already-exists': 'This item already exists',
      'firestore/aborted': 'Operation was interrupted. Please try again',
      'firestore/cancelled': 'Operation was canceled',
      'firestore/data-loss': 'Data loss detected. Please contact support',
      'firestore/deadline-exceeded': 'Request timed out. Please try again',
      'firestore/failed-precondition': 'Operation cannot be performed in current state',
      'firestore/internal': 'Internal server error. Please try again later',
      'firestore/invalid-argument': 'Invalid data provided',
      'firestore/resource-exhausted': 'Too many requests. Please wait and try again',
      'firestore/unauthenticated': 'Please sign in to continue',
      'firestore/unavailable': 'Service temporarily unavailable. Try again',
      'firestore/unimplemented': 'This feature is not yet available',
    };
    return firestoreErrors[errorCode] || 'Database operation failed. Please try again';
  }

  // Network Errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('offline') ||
    errorMessage.includes('fetch')
  ) {
    return 'Connection failed. Check your internet connection';
  }

  // Permission Errors
  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('denied') ||
    errorMessage.includes('unauthorized')
  ) {
    return 'You don\'t have permission for this action';
  }

  // Validation Errors
  if (
    errorMessage.includes('required') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('must')
  ) {
    return errorMessage; // These are usually user-friendly already
  }

  // Quota/Rate Limit Errors
  if (
    errorMessage.includes('quota') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many')
  ) {
    return 'Too many requests. Please wait a moment and try again';
  }

  // File Upload Errors
  if (errorMessage.includes('file') || errorMessage.includes('upload')) {
    return 'File upload failed. Check file size and format';
  }

  // Default: Return original message if it's short and readable,
  // otherwise provide generic message
  if (errorMessage.length < 100 && !errorMessage.includes('Error:')) {
    return errorMessage;
  }

  return 'Something went wrong. Please try again';
};

/**
 * Get success message based on action
 */
export const getSuccessMessage = (action, item = '') => {
  const messages = {
    created: `${item} created successfully!`,
    added: `${item} added successfully!`,
    updated: `${item} updated successfully!`,
    saved: `${item} saved successfully!`,
    deleted: `${item} deleted successfully!`,
    imported: `${item} imported successfully!`,
    exported: `${item} exported successfully!`,
    uploaded: `${item} uploaded successfully!`,
    generated: `${item} generated successfully!`,
    sent: `${item} sent successfully!`,
  };

  return messages[action] || 'Operation completed successfully!';
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import GradientButton from '../ui/GradientButton';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { verifyStudentId, linkParentToStudent } from '../../utils/parentHelpers';

/**
 * Parent Onboarding Component
 * Shows modal for parent to link their account to their child's student ID
 * This is a one-time setup that permanently links the parent to the student
 */
function ParentOnboarding({ isOpen, userId, onComplete }) {
  const [studentId, setStudentId] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleVerify = async () => {
    if (!studentId.trim()) {
      setError('Please enter a student ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const student = await verifyStudentId(studentId.trim());
      
      if (!student) {
        setError('❌ Student ID not found. Please verify the ID and try again. Check the browser console for debugging information.');
        setVerifiedStudent(null);
      } else {
        setVerifiedStudent(student);
        setError('');
      }
    } catch (err) {
      setError(err.message || 'Failed to verify student ID');
      setVerifiedStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!verifiedStudent) return;

    setLoading(true);
    try {
      await linkParentToStudent(userId, verifiedStudent.studentId);
      showToast('Successfully linked to student!', 'success');
      onComplete(verifiedStudent);
    } catch (err) {
      showToast(err.message || 'Failed to link to student', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !verifiedStudent) {
      handleVerify();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Link to Student Account">
      <div className="space-y-6">
        {/* Introduction */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <p className="text-sm text-gray-300">
            Welcome! To access your child's academic data, please enter their <strong>Student ID</strong>.
            This link is permanent and can only be changed by an administrator.
          </p>
        </div>

        {/* Student ID Input */}
        {!verifiedStudent && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Student ID
              </label>
              <Input
                type="text"
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value.toUpperCase());
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter Student ID (e.g., PTA123456)"
                className="w-full"
                disabled={loading}
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            <GradientButton
              onClick={handleVerify}
              disabled={loading || !studentId.trim()}
              className="w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Verifying...
                </span>
              ) : (
                'Verify Student ID'
              )}
            </GradientButton>
          </div>
        )}

        {/* Student Confirmation */}
        <AnimatePresence>
          {verifiedStudent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Student Info Card */}
              <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                    {verifiedStudent.name?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {verifiedStudent.name}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-400">
                      <p><span className="text-gray-500">Student ID:</span> {verifiedStudent.studentId}</p>
                      <p><span className="text-gray-500">Branch:</span> {verifiedStudent.branch}</p>
                      <p><span className="text-gray-500">Semester:</span> {verifiedStudent.semester}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmation Message */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-200">
                  <strong>⚠️ Important:</strong> You are about to link your account to <strong>{verifiedStudent.name}</strong>. 
                  This action is permanent and can only be changed by an administrator.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setVerifiedStudent(null);
                    setStudentId('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <GradientButton
                  onClick={handleLink}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      Linking...
                    </span>
                  ) : (
                    'Confirm & Link'
                  )}
                </GradientButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

export default ParentOnboarding;

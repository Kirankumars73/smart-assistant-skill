import React from 'react';
import { motion } from 'framer-motion';
import GradientButton from '../ui/GradientButton';
import { getBacklogStatusColor, getBacklogStatusText } from '../../utils/backlogHelpers';

/**
 * Notification Card Component
 * Displays clearance request notifications for faculty
 */
const NotificationCard = ({ notification, onApprove, onReject, loading = false }) => {
  const isResolved = notification.status !== 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-xl border ${
        notification.status === 'approved'
          ? 'bg-green-500/5 border-green-500/20'
          : notification.status === 'rejected'
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-gray-800/50 border-gray-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-xl font-bold text-white">
            {notification.studentName?.charAt(0) || 'S'}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{notification.studentName}</h3>
            <p className="text-sm text-gray-400">ID: {notification.studentId}</p>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getBacklogStatusColor(notification.status)}`}>
          {getBacklogStatusText(notification.status)}
        </span>
      </div>

      {/* Paper Details */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Subject:</span>
            <span className="text-white ml-2 font-medium">{notification.subjectName}</span>
          </div>
          <div>
            <span className="text-gray-500">Code:</span>
            <span className="text-white ml-2 font-medium">{notification.subjectCode}</span>
          </div>
          <div>
            <span className="text-gray-500">Semester:</span>
            <span className="text-white ml-2">{notification.semester}</span>
          </div>
          <div>
            <span className="text-gray-500">Requested:</span>
            <span className="text-white ml-2">
              {new Date(notification.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Message */}
      <p className="text-gray-300 text-sm mb-4">{notification.message}</p>

      {/* Actions or Resolution Info */}
      {!isResolved ? (
        <div className="flex gap-3">
          <GradientButton
            onClick={() => onApprove(notification)}
            disabled={loading}
            className="flex-1"
          >
            ✓ Approve & Clear
          </GradientButton>
          <button
            onClick={() => onReject(notification)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/30 transition-all disabled:opacity-50"
          >
            ✗ Reject
          </button>
        </div>
      ) : (
        <div className="pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Resolved on {new Date(notification.resolvedAt).toLocaleDateString()}
            </span>
            {notification.rejectionReason && (
              <span className="text-red-400">Reason: {notification.rejectionReason}</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NotificationCard;

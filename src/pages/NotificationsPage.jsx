import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getClearanceNotifications, approveClearance, rejectClearance } from '../services/notificationService';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import NotificationCard from '../components/notifications/NotificationCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import NoiseTexture from '../components/ui/NoiseTexture';
import FloatingOrbs from '../components/ui/FloatingOrbs';

/**
 * Notifications Page for Faculty/Admin
 * Displays backlog clearance requests and allows approval/rejection
 */
const NotificationsPage = () => {
  const { hasFacultyAccess, currentUser } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');

  useEffect(() => {
    if (hasFacultyAccess()) {
      fetchNotifications();
    }
  }, [filterStatus, hasFacultyAccess]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log('Fetching notifications with status:', filterStatus);
      const data = await getClearanceNotifications(filterStatus);
      console.log('Notifications fetched:', data);
      console.log('Number of notifications:', data.length);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showToast('Failed to fetch notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (notification) => {
    try {
      setProcessingId(notification.id);
      await approveClearance(
        notification.id,
        notification.studentDocId,
        notification.subjectCode,
        currentUser.uid
      );
      showToast(`Cleared ${notification.subjectName} for ${notification.studentName}`, 'success');
      fetchNotifications();
    } catch (error) {
      console.error('Error approving clearance:', error);
      showToast(error.message || 'Failed to approve clearance', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (notification) => {
    try {
      const reason = prompt('Reason for rejection (optional):');
      setProcessingId(notification.id);
      await rejectClearance(notification.id, currentUser.uid, reason || '');
      showToast(`Rejected clearance request for ${notification.subjectName}`, 'error');
      fetchNotifications();
    } catch (error) {
      console.error('Error rejecting clearance:', error);
      showToast('Failed to reject clearance request', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (!hasFacultyAccess()) {
    return (
      <div className="min-h-screen bg-midnight relative">
        <NoiseTexture />
        <FloatingOrbs />
        <div className="mesh-gradient-bg" />
        <Navbar />
        <div className="relative z-10 flex items-center justify-center h-[80vh]">
          <Card className="text-center p-8">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">Only faculty and administrators can access this page.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight relative">
      <NoiseTexture />
      <FloatingOrbs />
      <div className="mesh-gradient-bg" />
      <Navbar />
      
      <div className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-extrabold mb-2">
              <span className="text-gradient">Clearance Requests</span>
            </h1>
            <p className="text-xl text-gray-400">
              Review and approve student backlog clearance requests
            </p>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg border border-gray-700 inline-flex">
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-md transition-all ${
                  filterStatus === 'pending'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-md transition-all ${
                  filterStatus === 'approved'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 rounded-md transition-all ${
                  filterStatus === 'rejected'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-md transition-all ${
                  filterStatus === 'all'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>
          </motion.div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-white mb-2">No notifications</h3>
                <p className="text-gray-400">
                  {filterStatus === 'pending' && 'No pending clearance requests at the moment.'}
                  {filterStatus === 'approved' && 'No approved requests yet.'}
                  {filterStatus === 'rejected' && 'No rejected requests yet.'}
                  {filterStatus === 'all' && 'No clearance requests found.'}
                </p>
              </Card>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <NotificationCard
                      notification={notification}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      loading={processingId === notification.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Stats */}
          {!loading && notifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex items-center justify-between px-4 py-3 bg-gray-800/30 border border-gray-700 rounded-lg"
            >
              <span className="text-gray-400">Total: {notifications.length} request(s)</span>
              <button
                onClick={fetchNotifications}
                className="text-sm text-pink-400 hover:text-pink-300 transition-colors"
              >
                🔄 Refresh
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;

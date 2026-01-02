import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { removeBacklogPaper, updateBacklogPaperStatus } from '../utils/backlogHelpers';

/**
 * Notification Service
 * Manages clearance request notifications between students and faculty
 */

/**
 * Create a clearance notification when student requests backlog clearance
 * @param {string} studentId - Student ID (e.g., "PTA009")
 * @param {string} studentName - Student name
 * @param {Object} paperDetails - { subjectName, subjectCode, semester }
 * @param {string} studentDocId - Firestore document ID of the student
 * @returns {Promise<string>} Notification ID
 */
export const createClearanceNotification = async (studentId, studentName, paperDetails, studentDocId) => {
  try {
    const notification = {
      type: 'backlog_clearance',
      studentId,
      studentName,
      studentDocId, // Store the Firestore doc ID for easy updates
      subjectName: paperDetails.subjectName,
      subjectCode: paperDetails.subjectCode,
      semester: paperDetails.semester,
      message: `${studentName} (${studentId}) has requested clearance for ${paperDetails.subjectName} (${paperDetails.subjectCode})`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      rejectionReason: null
    };

    const docRef = await addDoc(collection(db, 'notifications'), notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating clearance notification:', error);
    throw new Error('Failed to create clearance notification');
  }
};

/**
 * Get clearance notifications filtered by status
 * @param {string} status - 'pending', 'approved', 'rejected', or 'all'
 * @returns {Promise<Array>} Array of notifications
 */
export const getClearanceNotifications = async (status = 'all') => {
  try {
    const notificationsRef = collection(db, 'notifications');
    let q;

    if (status === 'all') {
      q = query(
        notificationsRef, 
        where('type', '==', 'backlog_clearance')
        // Temporarily removed orderBy - will add back after creating Firestore index
        // orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        notificationsRef,
        where('type', '==', 'backlog_clearance'),
        where('status', '==', status)
        // Temporarily removed orderBy - will add back after creating Firestore index
        // orderBy('createdAt', 'desc')
      );
    }

    console.log('Executing query for status:', status);
    const querySnapshot = await getDocs(q);
    console.log('Query returned', querySnapshot.size, 'documents');
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching clearance notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
};

/**
 * Get count of notifications by status
 * @param {string} status - 'pending', 'approved', or 'rejected'
 * @returns {Promise<number>} Count of notifications
 */
export const getNotificationCount = async (status = 'pending') => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('type', '==', 'backlog_clearance'),
      where('status', '==', status)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting notification count:', error);
    return 0;
  }
};

/**
 * Subscribe to real-time notification count updates
 * @param {string} status - Status to monitor
 * @param {Function} callback - Callback function to receive count
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNotificationCount = (status = 'pending', callback) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('type', '==', 'backlog_clearance'),
      where('status', '==', status)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    });
  } catch (error) {
    console.error('Error subscribing to notification count:', error);
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Approve a clearance request and update student record
 * @param {string} notificationId - Notification document ID
 * @param {string} studentDocId - Student document ID
 * @param {string} subjectCode - Subject code to remove
 * @param {string} facultyId - Faculty user ID who approved
 * @returns {Promise<void>}
 */
export const approveClearance = async (notificationId, studentDocId, subjectCode, facultyId) => {
  try {
    // Get student data
    const studentRef = doc(db, 'students', studentDocId);
    const studentSnap = await getDoc(studentRef);
    
    if (!studentSnap.exists()) {
      throw new Error('Student not found');
    }

    const studentData = studentSnap.data();
    
    // Remove the backlog paper from student's record
    const updatedStudent = removeBacklogPaper(studentData, subjectCode);
    
    // Update student document
    await updateDoc(studentRef, {
      backlogPapers: updatedStudent.backlogPapers,
      backPapers: updatedStudent.backPapers,
      updatedAt: new Date().toISOString()
    });

    // Update notification status
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      status: 'approved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: facultyId
    });
  } catch (error) {
    console.error('Error approving clearance:', error);
    throw new Error('Failed to approve clearance request');
  }
};

/**
 * Reject a clearance request
 * @param {string} notificationId - Notification document ID
 * @param {string} facultyId - Faculty user ID who rejected
 * @param {string} reason - Optional rejection reason
 * @returns {Promise<void>}
 */
export const rejectClearance = async (notificationId, facultyId, reason = '') => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      status: 'rejected',
      resolvedAt: new Date().toISOString(),
      resolvedBy: facultyId,
      rejectionReason: reason
    });
  } catch (error) {
    console.error('Error rejecting clearance:', error);
    throw new Error('Failed to reject clearance request');
  }
};

/**
 * Get notifications for a specific student
 * @param {string} studentId - Student ID (e.g., "PTA009")
 * @returns {Promise<Array>} Array of notifications for the student
 */
export const getStudentNotifications = async (studentId) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('type', '==', 'backlog_clearance'),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching student notifications:', error);
    throw new Error('Failed to fetch student notifications');
  }
};

/**
 * Check if a clearance request already exists for a specific paper
 * @param {string} studentId - Student ID
 * @param {string} subjectCode - Subject code
 * @returns {Promise<boolean>} True if pending request exists
 */
export const hasPendingClearanceRequest = async (studentId, subjectCode) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('type', '==', 'backlog_clearance'),
      where('studentId', '==', studentId),
      where('subjectCode', '==', subjectCode),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking pending clearance:', error);
    return false;
  }
};

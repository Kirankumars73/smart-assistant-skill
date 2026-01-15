import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Verify if a student ID exists in the database
 * @param {string} studentId - The student ID to verify (e.g., "PTA123456")
 * @returns {Promise<Object|null>} Student data if found, null if not found
 */
export const verifyStudentId = async (studentId) => {
  try {
    console.log('🔍 Verifying student ID:', studentId);
    
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('studentId', '==', studentId.toUpperCase()));
    
    console.log('📊 Querying Firestore for studentId:', studentId.toUpperCase());
    const querySnapshot = await getDocs(q);
    
    console.log('📈 Query results:', querySnapshot.size, 'documents found');

    if (querySnapshot.empty) {
      console.warn('⚠️ No student found with ID:', studentId);
      
      // DEBUG: Try to find if field name is different
      const allStudentsQuery = query(studentsRef);
      const allDocs = await getDocs(allStudentsQuery);
      console.log('🔍 Total students in database:', allDocs.size);
      
      if (allDocs.size > 0) {
        const sampleDoc = allDocs.docs[0].data();
        console.log('📋 Sample student document fields:', Object.keys(sampleDoc));
        console.log('📋 Sample studentId field value:', sampleDoc.student Id || sampleDoc.student_id || 'FIELD NOT FOUND');
      }
      
      return null;
    }

    // Return first matching student (should be unique)
    const studentDoc = querySnapshot.docs[0];
    const studentData = studentDoc.data();
    console.log('✅ Student found:', studentData.name, '|', studentData.studentId);
    
    return {
      id: studentDoc.id,
      ...studentData
    };
  } catch (error) {
    console.error('❌ Error verifying student ID:', error);
    console.error('Error details:', error.code, error.message);
    throw new Error('Failed to verify student ID. Please try again.');
  }
};

/**
 * Link a parent user to a student
 * @param {string} userId - The parent's user ID (Firebase Auth UID)
 * @param {string} studentId - The student ID to link to
 * @returns {Promise<void>}
 */
export const linkParentToStudent = async (userId, studentId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      linkedStudentId: studentId.toUpperCase(),
      linkedAt: new Date()
    });
  } catch (error) {
    console.error('Error linking parent to student:', error);
    throw new Error('Failed to link to student. Please try again.');
  }
};

/**
 * Get student data for a linked student
 * @param {string} linkedStudentId - The student ID the parent is linked to
 * @returns {Promise<Object|null>} Student data if found, null if not found
 */
export const getLinkedStudentData = async (linkedStudentId) => {
  try {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('studentId', '==', linkedStudentId.toUpperCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const studentDoc = querySnapshot.docs[0];
    return {
      id: studentDoc.id,
      ...studentDoc.data()
    };
  } catch (error) {
    console.error('Error fetching linked student data:', error);
    throw new Error('Failed to fetch student data. Please try again.');
  }
};

/**
 * Check if user profile has a linked student
 * @param {Object} userProfile - The user profile object
 * @returns {boolean} True if user has linkedStudentId, false otherwise
 */
export const hasLinkedStudent = (userProfile) => {
  return userProfile?.linkedStudentId && userProfile.linkedStudentId.length > 0;
};

/**
 * Unlink a parent from their student (admin only)
 * @param {string} userId - The parent's user ID
 * @returns {Promise<void>}
 */
export const unlinkParentFromStudent = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      linkedStudentId: null,
      linkedAt: null
    });
  } catch (error) {
    console.error('Error unlinking parent from student:', error);
    throw new Error('Failed to unlink parent. Please try again.');
  }
};

/**
 * Change parent's linked student (admin only)
 * @param {string} userId - The parent's user ID
 * @param {string} newStudentId - The new student ID to link to
 * @returns {Promise<void>}
 */
export const changeLinkedStudent = async (userId, newStudentId) => {
  try {
    // First verify the new student exists
    const student = await verifyStudentId(newStudentId);
    if (!student) {
      throw new Error('Student ID not found');
    }

    // Update the link
    await linkParentToStudent(userId, newStudentId);
  } catch (error) {
    console.error('Error changing linked student:', error);
    throw error;
  }
};

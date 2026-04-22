/**
 * Student Pass/Fail Prediction Service
 * Centralized prediction logic used across all components.
 * Ensures consistent criteria and allows storing predictions in Firestore.
 */

import { getInternalMarks } from '../utils/subjectHelpers';

/**
 * Predict whether a student will pass or fail based on academic metrics.
 * 
 * Criteria:
 * - Fail if CGPA < 5.5
 * - Fail if backPapers > 2
 * - Fail if average internal marks < 40
 * - Pass otherwise
 * 
 * @param {Object} student - Student data object
 * @returns {string} 'Pass' or 'Fail'
 */
export const predictPassFail = (student) => {
  const cgpa = parseFloat(student.cgpa) || 0;
  const backPapers = parseInt(student.backPapers) || 0;
  const internalMarks = getInternalMarks(student);

  if (cgpa < 5.5 || backPapers > 2 || internalMarks < 40) {
    return 'Fail';
  }
  return 'Pass';
};

/**
 * Get detailed prediction with status, color, and icon (used in ParentDashboard).
 * @param {Object} student - Student data object
 * @returns {Object} { status, color, icon }
 */
export const predictPassFailDetailed = (student) => {
  const result = predictPassFail(student);
  if (result === 'Fail') {
    return { status: 'Fail', color: 'red', icon: '❌' };
  }
  return { status: 'Pass', color: 'green', icon: '✅' };
};

/**
 * Check if a student is at-risk (broader criteria than pass/fail).
 * @param {Object} student - Student data object
 * @returns {boolean}
 */
export const isAtRisk = (student) => {
  const cgpa = parseFloat(student.cgpa) || 0;
  const backPapers = parseInt(student.backPapers) || 0;
  const internalMarks = getInternalMarks(student);

  return cgpa < 6.0 || backPapers > 0 || internalMarks < 50;
};

/**
 * Compute prediction and embed it into student data before saving to Firestore.
 * This ensures the prediction is always stored alongside the student record.
 * 
 * @param {Object} studentData - Student data to be saved
 * @returns {Object} studentData with `prediction` field added
 */
export const computeAndStorePrediction = (studentData) => {
  const prediction = predictPassFail(studentData);
  return {
    ...studentData,
    prediction,
    predictionUpdatedAt: new Date().toISOString()
  };
};

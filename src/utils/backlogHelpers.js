/**
 * Backlog Paper Management Helpers
 * Utilities for managing student backlog papers
 */

/**
 * Create an empty backlog paper object
 * @returns {Object} Empty backlog paper with default values
 */
export const createEmptyBacklogPaper = () => ({
  subjectName: '',
  subjectCode: '',
  semester: '',
  status: 'pending',
  requestedAt: null
});

/**
 * Add a backlog paper to student's record
 * @param {Object} student - Student object
 * @param {Object} paperDetails - { subjectName, subjectCode, semester }
 * @returns {Object} Updated student object
 */
export const addBacklogPaper = (student, paperDetails) => {
  const backlogPapers = student.backlogPapers || [];
  
  const newPaper = {
    subjectName: paperDetails.subjectName,
    subjectCode: paperDetails.subjectCode,
    semester: parseInt(paperDetails.semester) || 0,
    status: 'pending',
    requestedAt: null
  };
  
  return {
    ...student,
    backlogPapers: [...backlogPapers, newPaper],
    backPapers: backlogPapers.length + 1
  };
};

/**
 * Remove a backlog paper from student's record
 * @param {Object} student - Student object
 * @param {string} subjectCode - Subject code to remove
 * @returns {Object} Updated student object
 */
export const removeBacklogPaper = (student, subjectCode) => {
  const backlogPapers = student.backlogPapers || [];
  const filtered = backlogPapers.filter(paper => paper.subjectCode !== subjectCode);
  
  return {
    ...student,
    backlogPapers: filtered,
    backPapers: filtered.length
  };
};

/**
 * Update a backlog paper's status
 * @param {Object} student - Student object
 * @param {string} subjectCode - Subject code to update
 * @param {string} newStatus - New status ('pending', 'clearance_requested', 'cleared')
 * @returns {Object} Updated student object
 */
export const updateBacklogPaperStatus = (student, subjectCode, newStatus) => {
  const backlogPapers = student.backlogPapers || [];
  const updated = backlogPapers.map(paper => {
    if (paper.subjectCode === subjectCode) {
      return {
        ...paper,
        status: newStatus,
        requestedAt: newStatus === 'clearance_requested' ? new Date().toISOString() : paper.requestedAt
      };
    }
    return paper;
  });
  
  return {
    ...student,
    backlogPapers: updated
  };
};

/**
 * Get count of backlog papers
 * @param {Object} student - Student object
 * @returns {number} Number of backlog papers
 */
export const getBacklogCount = (student) => {
  if (student.backlogPapers && Array.isArray(student.backlogPapers)) {
    return student.backlogPapers.length;
  }
  // Fallback to old schema
  return parseInt(student.backPapers) || 0;
};

/**
 * Check if a backlog paper can have clearance requested
 * @param {Object} paper - Backlog paper object
 * @returns {boolean} True if clearance can be requested
 */
export const canRequestClearance = (paper) => {
  return paper.status === 'pending';
};

/**
 * Validate backlog paper data
 * @param {Object} paper - Backlog paper object
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateBacklogPaper = (paper) => {
  const errors = [];
  
  if (!paper.subjectName || paper.subjectName.trim() === '') {
    errors.push('Subject name is required');
  }
  
  if (!paper.subjectCode || paper.subjectCode.trim() === '') {
    errors.push('Subject code is required');
  }
  
  if (!paper.semester || isNaN(parseInt(paper.semester))) {
    errors.push('Valid semester is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Migrate old backPapers format to new backlogPapers array
 * Used for backward compatibility
 * @param {Object} student - Student object with old schema
 * @returns {Object} Student with new schema
 */
export const migrateBacklogData = (student) => {
  // If already has backlogPapers array, return as-is
  if (student.backlogPapers && Array.isArray(student.backlogPapers)) {
    return student;
  }
  
  // If has old backPapers count but no array, create placeholder entries
  const backPapersCount = parseInt(student.backPapers) || 0;
  if (backPapersCount > 0) {
    const backlogPapers = [];
    for (let i = 0; i < backPapersCount; i++) {
      backlogPapers.push({
        subjectName: `Backlog Paper ${i + 1}`,
        subjectCode: `BP${i + 1}`,
        semester: 0,
        status: 'pending',
        requestedAt: null
      });
    }
    
    return {
      ...student,
      backlogPapers,
      backPapers: backPapersCount
    };
  }
  
  // No backlog papers
  return {
    ...student,
    backlogPapers: [],
    backPapers: 0
  };
};

/**
 * Get status badge color for backlog paper
 * @param {string} status - Status of the paper
 * @returns {string} Tailwind color class
 */
export const getBacklogStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'clearance_requested':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'cleared':
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
};

/**
 * Get status display text
 * @param {string} status - Status of the paper
 * @returns {string} Display text
 */
export const getBacklogStatusText = (status) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'clearance_requested':
      return 'Clearance Requested';
    case 'cleared':
      return 'Cleared';
    default:
      return 'Unknown';
  }
};

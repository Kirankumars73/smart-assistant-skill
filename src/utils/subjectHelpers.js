/**
 * Helper functions for subject-based internal marks system
 */

/**
 * Calculate average internal marks from subjects array
 * @param {Array} subjects - Array of subject objects
 * @returns {number} Average marks (0-100)
 */
export const calculateAverageInternalMarks = (subjects) => {
  if (!subjects || subjects.length === 0) return 0;
  
  // Only count subjects that have marks entered
  const subjectsWithMarks = subjects.filter(s => s.internalMarks !== '' && s.internalMarks !== null && s.internalMarks !== undefined);
  
  if (subjectsWithMarks.length === 0) return 0;
  
  const total = subjectsWithMarks.reduce((sum, s) => sum + (parseFloat(s.internalMarks) || 0), 0);
  return parseFloat((total / subjectsWithMarks.length).toFixed(2));
};

/**
 * Get internal marks with backward compatibility
 * If student has subjects array, calculate average; otherwise use old internalMarks field
 * @param {Object} student - Student object
 * @returns {number} Internal marks
 */
export const getInternalMarks = (student) => {
  if (student.subjects && student.subjects.length > 0) {
    return calculateAverageInternalMarks(student.subjects);
  }
  return parseFloat(student.internalMarks) || 0;
};

/**
 * Format subjects for display
 * @param {Array} subjects - Array of subject objects
 * @returns {string} Formatted string
 */
export const formatSubjectsForDisplay = (subjects) => {
  if (!subjects || subjects.length === 0) return 'No subjects';
  
  return subjects.map(s => {
    const marks = s.internalMarks ? ` (${s.internalMarks}%)` : '';
    const type = s.type === 'lab' ? ' 🔬' : ' 📘';
    return `${s.name}${type}${marks}`;
  }).join(', ');
};

/**
 * Validate subject data
 * @param {Array} subjects - Array of subject objects
 * @returns {Object} { isValid: boolean, errors: Array }
 */
export const validateSubjects = (subjects) => {
  const errors = [];
  
  if (!subjects || subjects.length === 0) {
    errors.push('At least one subject is required');
    return { isValid: false, errors };
  }
  
  subjects.forEach((subject, index) => {
    if (!subject.name || subject.name.trim() === '') {
      errors.push(`Subject ${index + 1}: Name is required`);
    }
    
    // Internal marks are OPTIONAL (can be added later via bulk update)
    if (subject.internalMarks !== '' && subject.internalMarks !== null && subject.internalMarks !== undefined) {
      const marks = parseFloat(subject.internalMarks);
      if (isNaN(marks) || marks < 0 || marks > 100) {
        errors.push(`Subject ${index + 1}: Marks must be between 0 and 100`);
      }
    }
    
    if (subject.credits !== '' && subject.credits !== null && subject.credits !== undefined) {
      const credits = parseFloat(subject.credits);
      if (isNaN(credits) || credits < 0 || credits > 10) {
        errors.push(`Subject ${index + 1}: Credits must be between 0 and 10`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Initialize empty subject (for form defaults)
 */
export const createEmptySubject = () => ({
  id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name: '',
  type: 'theory',
  internalMarks: '',
  credits: ''
});

/**
 * Get subject summary statistics
 * @param {Array} subjects - Array of subject objects
 * @returns {Object} Statistics object
 */
export const getSubjectStats = (subjects) => {
  if (!subjects || subjects.length === 0) {
    return {
      total: 0,
      theory: 0,
      lab: 0,
      withMarks: 0,
      average: 0,
      highest: null,
      lowest: null
    };
  }
  
  const subjectsWithMarks = subjects.filter(s => s.internalMarks !== '' && s.internalMarks !== null);
  const marks = subjectsWithMarks.map(s => parseFloat(s.internalMarks));
  
  return {
    total: subjects.length,
    theory: subjects.filter(s => s.type === 'theory').length,
    lab: subjects.filter(s => s.type === 'lab').length,
    withMarks: subjectsWithMarks.length,
    average: calculateAverageInternalMarks(subjects),
    highest: marks.length > 0 ? Math.max(...marks) : null,
    lowest: marks.length > 0 ? Math.min(...marks) : null
  };
};

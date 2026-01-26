/**
 * Timetable Generation Service
 * Supports TWO algorithms:
 * 1. Backtracking (original) - Fast for simple cases
 * 2. Genetic Algorithm (new) - Better for complex constraints
 * Based on constraint satisfaction and evolutionary optimization
 */

import * as GeneticAlgorithm from './geneticAlgorithmService';

// Global timetable state
let facultyTimetable = {};  // { facultyName: [[...], [...]] }
let classTimetable = {};    // { className: [[...], [...]] }
let rows = 5;  // Number of days (default)
let cols = 6;  // Number of periods (default)

// Data storage
let manualData = {};   // Manual assignments
let facultyData = {};  // Faculty-subject-class mappings
let labData = {};      // Lab session data

/**
 * Initialize empty timetable structure
 */
export const initializeTimetable = (numDays, numPeriods) => {
  rows = numDays;
  cols = numPeriods;
  facultyTimetable = {};
  classTimetable = {};
  manualData = {};
  facultyData = {};
  labData = {};
};

/**
 * Add faculty to timetable
 */
export const addFaculty = (facultyName) => {
  if (!facultyName || facultyName.trim() === '') {
    throw new Error('Faculty name cannot be empty');
  }
  
  if (facultyTimetable[facultyName]) {
    return { success: false, message: 'Faculty already exists' };
  }
  
  facultyTimetable[facultyName] = Array(rows).fill(null).map(() => Array(cols).fill('FREE'));
  return { success: true, message: `Faculty ${facultyName} added successfully` };
};

/**
 * Add class to timetable
 */
export const addClass = (className) => {
  if (!className || className.trim() === '') {
    throw new Error('Class name cannot be empty');
  }
  
  if (classTimetable[className]) {
    return { success: false, message: 'Class already exists' };
  }
  
  classTimetable[className] = Array(rows).fill(null).map(() => Array(cols).fill('FREE'));
  return { success: true, message: `Class ${className} added successfully` };
};

/**
 * Add manual assignment data
 */
export const addManualData = (facultyName, className, subjectName, day, time) => {
  if (!manualData[facultyName]) {
    manualData[facultyName] = [];
  }
  manualData[facultyName].push({ className, subjectName, day, time });
};

/**
 * Get all manual assignments
 */
export const getAllManualData = () => {
  const allData = [];
  for (const [facultyName, assignments] of Object.entries(manualData)) {
    for (const { className, subjectName, day, time } of assignments) {
      allData.push({ facultyName, className, subjectName, day, time });
    }
  }
  return allData;
};

/**
 * Clear manual data
 */
export const clearManualData = () => {
  manualData = {};
};

/**
 * Add faculty data (subject assignments)
 */
export const addFacultyData = (facultyName, className, limit, subjectName) => {
  if (!facultyData[facultyName]) {
    facultyData[facultyName] = [];
  }
  facultyData[facultyName].push({ className, limit, subjectName });
};

/**
 * Get all faculty data
 */
export const getAllFacultyData = () => {
  const allData = [];
  for (const [facultyName, assignments] of Object.entries(facultyData)) {
    for (const { className, limit, subjectName } of assignments) {
      allData.push({ facultyName, className, limit, subjectName });
    }
  }
  return allData;
};

/**
 * Clear faculty data
 */
export const clearFacultyData = () => {
  facultyData = {};
};

/**
 * Add lab data
 */
export const addLabData = (limit, count, faculties, className, subjectName, isLab) => {
  if (!labData[className]) {
    labData[className] = [];
  }
  labData[className].push({ limit, count, faculties, subjectName, isLab });
};

/**
 * Get all lab data
 */
export const getAllLabData = () => {
  const allData = [];
  for (const [className, labs] of Object.entries(labData)) {
    for (const { limit, count, faculties, subjectName, isLab } of labs) {
      allData.push({ limit, count, faculties, className, subjectName, isLab });
    }
  }
  return allData;
};

/**
 * Clear lab data
 */
export const clearLabData = () => {
  labData = {};
};

/**
 * Check if a slot is available
 */
const isSlotAvailable = (facultyName, className, day, period) => {
  if (day < 0 || day >= rows || period < 0 || period >= cols) {
    return false;
  }
  
  if (!facultyTimetable[facultyName] || !classTimetable[className]) {
    return false;
  }
  
  return facultyTimetable[facultyName][day][period] === 'FREE' && 
         classTimetable[className][day][period] === 'FREE';
};

/**
 * Add data to timetable (assign a slot)
 */
export const addData = (facultyName, day, period, className, subjectName) => {
  if (!facultyTimetable[facultyName]) {
    return { success: false, message: 'Faculty not found' };
  }
  
  if (!classTimetable[className]) {
    return { success: false, message: 'Class not found' };
  }
  
  if (!isSlotAvailable(facultyName, className, day, period)) {
    return { success: false, message: 'Slot not available' };
  }
  
  facultyTimetable[facultyName][day][period] = className;
  classTimetable[className][day][period] = subjectName;
  
  return { success: true, message: 'Timetable updated successfully' };
};

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Check if it's safe to assign a period without creating consecutive different classes
 * This prevents teacher fatigue by ensuring breaks between teaching different classes
 * @param {string} facultyName - Teacher name
 * @param {string} className - Class being assigned
 * @param {number} day - Day index
 * @param {number} period - Period index
 * @param {boolean} isLabAssignment - If true, skip this check (labs are naturally consecutive)
 * @returns {boolean} True if safe to assign (no different class in adjacent periods)
 */
const isSafeFromConsecutiveDifferentClasses = (
  facultyName, 
  className, 
  day, 
  period,
  isLabAssignment = false
) => {
  // Labs are exempt from this check - they need consecutive periods
  if (isLabAssignment) return true;
  
  if (!facultyTimetable[facultyName] || !facultyTimetable[facultyName][day]) {
    return true;
  }
  
  const facultySchedule = facultyTimetable[facultyName][day];
  
  // Check previous period (period - 1)
  if (period > 0) {
    const prevSlot = facultySchedule[period - 1];
    // If previous period has a DIFFERENT class (not FREE and not same class), block this assignment
    if (prevSlot !== 'FREE' && prevSlot !== className) {
      return false; // Would create consecutive different classes - prevent teacher fatigue!
    }
  }
  
  // Check next period (period + 1)
  if (period < cols - 1) {
    const nextSlot = facultySchedule[period + 1];
    // If next period has a DIFFERENT class (not FREE and not same class), block this assignment
    if (nextSlot !== 'FREE' && nextSlot !== className) {
      return false; // Would create consecutive different classes - prevent teacher fatigue!
    }
  }
  
  return true; // Safe to assign - teacher gets proper rest or teaches same class consecutively
};

/**
 * Find empty positions for faculty and class
 */
const findEmptyPositions = (facultyName, className, count, isLab) => {
  if (!facultyTimetable[facultyName]) {
    return [];
  }
  
  if (!classTimetable[className]) {
    return [];
  }
  
  const emptyPositions = [];
  
  if (isLab) {
    // For labs, find consecutive empty slots
    for (let i = 0; i < rows; i++) {
      // Check first 'count' consecutive hours
      let firstConsecutive = true;
      for (let j = 0; j < count; j++) {
        if (!isSlotAvailable(facultyName, className, i, j)) {
          firstConsecutive = false;
          break;
        }
      }
      if (firstConsecutive) {
        emptyPositions.push({ day: i, period: 0 });
      }
      
      // Check last 'count' consecutive hours (avoid Friday last slots for 3-hour labs)
      if (i !== 4 || count < 3) {
        let lastConsecutive = true;
        const startPos = cols - count;
        for (let j = startPos; j < cols; j++) {
          if (!isSlotAvailable(facultyName, className, i, j)) {
            lastConsecutive = false;
            break;
          }
        }
        if (lastConsecutive) {
          emptyPositions.push({ day: i, period: startPos });
        }
      }
    }
  } else {
    // For regular subjects, find random positions (max 2 per day)
    // Also check to prevent consecutive different classes for teacher health
    for (let i = 0; i < rows; i++) {
      let limitPerDay = 0;
      const randomIndices = shuffleArray([...Array(cols).keys()]);
      
      for (const j of randomIndices) {
        if (limitPerDay < 2 && 
            isSlotAvailable(facultyName, className, i, j) &&
            isSafeFromConsecutiveDifferentClasses(facultyName, className, i, j, false)) {
          emptyPositions.push({ day: i, period: j });
          limitPerDay++;
        }
      }
    }
    
    if (emptyPositions.length < count) {
      return false;
    }
  }
  
  return shuffleArray(emptyPositions);
};

/**
 * Recursive backtracking assignment
 */
const assignRecursive = (allData, index = 0) => {
  // Base case: all assignments done
  if (index >= allData.length) {
    return true;
  }
  
  const { facultyName, className, limit, subjectName } = allData[index];
  
  // Try up to 3 times with different random positions
  for (let attempt = 0; attempt < 3; attempt++) {
    const positions = findEmptyPositions(facultyName, className, limit, false);
    
    if (positions === false) {
      continue;
    }
    
    if (!positions || positions.length === 0) {
      continue;
    }
    
    const assignmentsMade = [];
    let successCount = 0;
    
    // Try to make all required assignments for this subject
    for (const { day, period } of positions) {
      if (successCount >= limit) break;
      
      if (isSlotAvailable(facultyName, className, day, period) &&
          isSafeFromConsecutiveDifferentClasses(facultyName, className, day, period, false)) {
        const result = addData(facultyName, day, period, className, subjectName);
        if (result.success) {
          assignmentsMade.push({ day, period });
          successCount++;
        }
      }
    }
    
    // If we made all needed assignments, try to solve the rest
    if (successCount === limit) {
      if (assignRecursive(allData, index + 1)) {
        return true;
      }
    }
    
    // Backtrack: undo assignments
    for (const { day, period } of assignmentsMade) {
      facultyTimetable[facultyName][day][period] = 'FREE';
      classTimetable[className][day][period] = 'FREE';
    }
  }
  
  // Assignment failed - backtrack will try alternatives
  return false;
};

/**
 * Automatic assignment for labs and multi-faculty subjects
 */
const autoAssign = (limit, count, faculties, className, subjectName, isLab) => {
  try {
    if (isLab) {
      // Find common empty positions for all faculties
      let commonPositions = new Set(
        findEmptyPositions(faculties[0], className, count, true)
          .map(pos => `${pos.day},${pos.period}`)
      );
      
      for (let i = 1; i < faculties.length; i++) {
        const facultyPositions = new Set(
          findEmptyPositions(faculties[i], className, count, true)
            .map(pos => `${pos.day},${pos.period}`)
        );
        commonPositions = new Set([...commonPositions].filter(x => facultyPositions.has(x)));
      }
      
      if (commonPositions.size === 0) {
        return false;
      }
      
      const positionsArray = Array.from(commonPositions).map(pos => {
        const [day, period] = pos.split(',').map(Number);
        return { day, period };
      });
      
      const shuffledPositions = shuffleArray(positionsArray);
      const assignedPositions = [];
      let occurrence = 0;
      const taken = [];
      
      for (const { day, period } of shuffledPositions) {
        if (occurrence >= limit) break;
        
        // Only one lab session per day
        if (!taken.includes(day)) {
          taken.push(day);
          occurrence++;
          
          // Assign consecutive periods
          for (let k = 0; k < count; k++) {
            assignedPositions.push({ day, period: period + k });
          }
        }
      }
      
      // Some lab sessions couldn't be assigned - continue with what we have
      
      // Assign all positions to all faculties
      for (const { day, period } of assignedPositions) {
        for (const facultyName of faculties) {
          const result = manualAssign(facultyName, className, subjectName, day, period, true);
          if (!result) {
            return false;
          }
        }
      }
      
      return true;
    } else {
      // Multi-faculty regular subject
      let commonPositions = new Set();
      
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          let allFree = true;
          for (const facultyName of faculties) {
            if (!isSlotAvailable(facultyName, className, i, j)) {
              allFree = false;
              break;
            }
          }
          if (allFree) {
            commonPositions.add(`${i},${j}`);
          }
        }
      }
      
      if (commonPositions.size === 0) {
        return false;
      }
      
      const positionsArray = Array.from(commonPositions).map(pos => {
        const [day, period] = pos.split(',').map(Number);
        return { day, period };
      });
      
      const shuffledPositions = shuffleArray(positionsArray);
      const dayCount = {};
      const selectedPositions = [];
      
      for (const { day, period } of shuffledPositions) {
        if (selectedPositions.length >= limit) break;
        
        if (!dayCount[day]) {
          dayCount[day] = 1;
          selectedPositions.push({ day, period });
        } else if (dayCount[day] === 1) {
          dayCount[day]++;
          selectedPositions.push({ day, period });
        }
      }
      
      // Assign selected positions to all faculties
      for (const { day, period } of selectedPositions) {
        for (const facultyName of faculties) {
          const result = manualAssign(facultyName, className, subjectName, day, period, true);
          if (!result) {
            return false;
          }
        }
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error in autoAssign:', error);
    return false;
  }
};

/**
 * Manual assignment
 */
const manualAssign = (facultyName, className, subjectName, day, period, isLab) => {
  if (day < 0 || day >= rows || period < 0 || period >= cols) {
    return false;
  }
  
  if (!facultyTimetable[facultyName]) {
    return false;
  }
  
  if (!classTimetable[className]) {
    return false;
  }
  
  if (facultyTimetable[facultyName][day][period] !== 'FREE') {
    return false;
  }
  
  facultyTimetable[facultyName][day][period] = className;
  classTimetable[className][day][period] = subjectName;
  
  return true;
};

/**
 * Reset timetable to FREE
 */
export const resetTimetable = () => {
  for (const facultyName in facultyTimetable) {
    facultyTimetable[facultyName] = Array(rows).fill(null).map(() => Array(cols).fill('FREE'));
  }
  
  for (const className in classTimetable) {
    classTimetable[className] = Array(rows).fill(null).map(() => Array(cols).fill('FREE'));
  }
  
  return true;
};

/**
 * Main timetable generation function
 */
export const generateTimetable = () => {
  try {
    // Step 1: Reset timetables
    resetTimetable();
    
    // Step 2: Apply manual assignments (highest priority)
    const allManualData = getAllManualData();
    for (const { facultyName, className, subjectName, day, time } of allManualData) {
      manualAssign(facultyName, className, subjectName, day, time, false);
    }
    
    // Step 3: Apply lab assignments
    const allLabData = getAllLabData();
    for (const { limit, count, faculties, className, subjectName, isLab } of allLabData) {
      autoAssign(limit, count, faculties, className, subjectName, isLab);
    }
    
    // Step 4: Apply regular assignments using backtracking
    const allFacultyData = getAllFacultyData();
    if (allFacultyData.length > 0) {
      if (!assignRecursive(allFacultyData)) {
        return {
          success: false,
          message: 'Could not complete timetable assignment. Please check constraints.',
          facultyTimetables: facultyTimetable,
          classTimetables: classTimetable
        };
      }
    }
    
    return {
      success: true,
      message: 'Timetable generated successfully!',
      facultyTimetables: facultyTimetable,
      classTimetables: classTimetable
    };
  } catch (error) {
    console.error('Error generating timetable:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      facultyTimetables: facultyTimetable,
      classTimetables: classTimetable
    };
  }
};

/**
 * Get current timetables
 */
export const getTimetables = () => {
  return {
    facultyTimetables: facultyTimetable,
    classTimetables: classTimetable,
    rows,
    cols
  };
};

/**
 * Get faculty list
 */
export const getFacultyList = () => {
  return Object.keys(facultyTimetable);
};

/**
 * Get class list
 */
export const getClassList = () => {
  return Object.keys(classTimetable);
};

// ==================== GENETIC ALGORITHM INTEGRATION ====================

/**
 * Convert assignments to GA format
 */
const convertAssignmentsForGA = () => {
  const allFacultyData = getAllFacultyData();
  return allFacultyData.map(({ facultyName, className, limit, subjectName }) => ({
    facultyName,
    className,
    subjectName,
    weeklyLimit: limit,
    isLab: false,
    consecutivePeriods: 1,
    additionalFaculties: []
  }));
};

/**
 * Convert lab data to GA format
 */
const convertLabDataForGA = () => {
  const allLabData = getAllLabData();
  return allLabData.map(({ limit, count, faculties, className, subjectName, isLab }) => ({
    facultyName: faculties[0],
    className,
    subjectName,
    weeklyLimit: limit,
    isLab,
    consecutivePeriods: count,
    additionalFaculties: faculties.slice(1)
  }));
};

/**
 * Generate timetable using Genetic Algorithm
 * @param {Object} gaConfig - GA parameters (optional)
 * @param {Function} onProgress - Progress callback (optional)
 */
export const generateTimetableWithGA = async (gaConfig = {}, onProgress = null) => {
  try {
    console.log('🧬 Starting Genetic Algorithm Timetable Generation...');
    
    // Get all data
    const faculties = Object.keys(facultyTimetable);
    const classes = Object.keys(classTimetable);
    const regularAssignments = convertAssignmentsForGA();
    const labAssignments = convertLabDataForGA();
    const manualAssignments = getAllManualData().map(({ facultyName, className, subjectName, day, time }) => ({
      facultyName,
      className,
      subjectName,
      day,
      period: time
    }));
    
    // Prepare config
    const config = {
      rows,
      cols,
      ...gaConfig
    };
    
    // Run GA
    const bestChromosome = await GeneticAlgorithm.runGeneticAlgorithm(
      config,
      faculties,
      classes,
      regularAssignments,
      manualAssignments,
      labAssignments,
      onProgress
    );
    
    if (!bestChromosome) {
      return {
        success: false,
        message: 'Genetic Algorithm failed to generate timetable',
        facultyTimetables: facultyTimetable,
        classTimetables: classTimetable
      };
    }
    
    // Apply best solution to our timetables
    facultyTimetable = bestChromosome.genes.faculty;
    classTimetable = bestChromosome.genes.class;
    
    // Check if solution is acceptable
    const hasHardViolations = bestChromosome.conflicts.some(c => 
      ['FACULTY_DOUBLE_BOOKING', 'CLASS_DOUBLE_BOOKING', 'LAB_NON_CONSECUTIVE'].includes(c.type)
    );
    
    return {
      success: !hasHardViolations,
      message: hasHardViolations 
        ? `Timetable generated with ${bestChromosome.conflicts.length} constraint violations (best effort)`
        : 'Timetable generated successfully with GA!',
      facultyTimetables: facultyTimetable,
      classTimetables: classTimetable,
      fitness: bestChromosome.fitness,
      conflicts: bestChromosome.conflicts,
      generation: bestChromosome.generation,
      algorithm: 'genetic'
    };
    
  } catch (error) {
    console.error('Error in Genetic Algorithm:', error);
    return {
      success: false,
      message: `GA Error: ${error.message}`,
      facultyTimetables: facultyTimetable,
      classTimetables: classTimetable
    };
  }
};

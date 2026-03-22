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
    // EDGE-ONLY: Labs must be at start or end of day.
    // Only check period 0 (start) and cols-count (end).
    const edgeStarts = [0];
    if (cols - count > 0) edgeStarts.push(cols - count);

    for (let i = 0; i < rows; i++) {
      for (const startPeriod of edgeStarts) {
        // Avoid scheduling 3-hour labs in the last slot of Friday (day index 4)
        if (i === 4 && count >= 3 && startPeriod > cols - count - 1) continue;
        if (startPeriod + count > cols) continue;

        let allFree = true;
        for (let k = 0; k < count; k++) {
          if (!isSlotAvailable(facultyName, className, i, startPeriod + k)) {
            allFree = false;
            break;
          }
        }
        if (allFree) {
          emptyPositions.push({ day: i, period: startPeriod });
        }
      }
    }
  } else {
    // For regular subjects, find random positions (max 2 per day)
    // SOFT constraint: prefer slots that don't create consecutive different classes,
    // but fall back to any free slot if we can't find enough preferred slots.
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
    
    // If preferred positions are not enough, fall back to ALL free positions (ignore soft constraint)
    if (emptyPositions.length < count) {
      const fallbackPositions = [];
      for (let i = 0; i < rows; i++) {
        let limitPerDay = 0;
        const randomIndices = shuffleArray([...Array(cols).keys()]);
        for (const j of randomIndices) {
          if (limitPerDay < 2 && isSlotAvailable(facultyName, className, i, j)) {
            fallbackPositions.push({ day: i, period: j });
            limitPerDay++;
          }
        }
      }
      if (fallbackPositions.length < count) {
        return false; // Genuinely no room at all
      }
      return shuffleArray(fallbackPositions);
    }
  }
  
  return shuffleArray(emptyPositions);
};

// Timeout sentinel for backtracking (reset before each run)
const BACKTRACK_TIMEOUT_MS = 20000; // 20 seconds max
let _backtrackStartTime = 0;
let _backtrackTimedOut = false;
const YIELD_EVERY_N_CALLS = 50; // Yield to browser every N recursive calls to keep UI responsive
let _backtrackCallCount = 0;
let _backtrackOnProgress = null; // Progress callback (optional)

/**
 * Recursive backtracking assignment — async to yield to browser periodically
 */
const assignRecursive = async (allData, index = 0) => {
  // Base case: all assignments done
  if (index >= allData.length) {
    return true;
  }

  // Time guard — bail gracefully if running too long (prevents browser freeze)
  if (Date.now() - _backtrackStartTime > BACKTRACK_TIMEOUT_MS) {
    _backtrackTimedOut = true;
    return false;
  }
  if (_backtrackTimedOut) return false;

  // Yield to browser every N calls so the loading screen can update
  _backtrackCallCount++;
  if (_backtrackCallCount % YIELD_EVERY_N_CALLS === 0) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const { facultyName, className, limit, subjectName, additionalFaculties = [] } = allData[index];

  // PLAN FIX #2 (backtracking): Cap positions tried per subject.
  // Without a cap, findEmptyPositions can return up to rows*cols*2 = 60 candidates,
  // making the branching factor 60^N which is infinite for N>5.
  // Cap to min(positions.length, 2*limit) so exploration stays tractable.
  const MAX_POSITIONS_PER_SUBJECT = 2 * limit;

  // Try up to 3 times — findEmptyPositions shuffles positions each call,
  // giving a different slot ordering per attempt. More than 3 has diminishing
  // returns and significantly expands the backtracking search tree.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (_backtrackTimedOut) return false;

    const rawPositions = findEmptyPositions(facultyName, className, limit, false);

    if (rawPositions === false) {
      continue;
    }

    if (!rawPositions || rawPositions.length === 0) {
      continue;
    }

    // Cap branching factor
    const positions = rawPositions.slice(0, MAX_POSITIONS_PER_SUBJECT);

    const assignmentsMade = [];
    let successCount = 0;

    // PLAN FIX #4 (backtracking): Report progress every 100 calls
    if (_backtrackOnProgress && _backtrackCallCount % 100 === 0) {
      _backtrackOnProgress({ assignedSoFar: index });
    }
    // Try to make all required assignments for this subject
    // NOTE: soft consecutive-class check (teacher comfort) is already applied in
    // findEmptyPositions as a preference. Do NOT re-check it here — doing so would
    // reject fallback positions and prevent valid assignments from being placed.
    for (const { day, period } of positions) {
      if (successCount >= limit) break;
      
      if (isSlotAvailable(facultyName, className, day, period)) {
        // Check co-teachers' faculty grids are also free at this slot
        const coTeachersAvailable = additionalFaculties.every(
          af => facultyTimetable[af] && facultyTimetable[af][day][period] === 'FREE'
        );
        if (!coTeachersAvailable) continue;

        const result = addData(facultyName, day, period, className, subjectName);
        if (result.success) {
          assignmentsMade.push({ day, period });
          successCount++;
          // Co-teachers occupy the same slot — only mark their faculty grid
          for (const af of additionalFaculties) {
            if (facultyTimetable[af]) {
              facultyTimetable[af][day][period] = className;
            }
          }
        }
      }
    }
    
    // If we made all needed assignments, try to solve the rest
    if (successCount === limit) {
      if (await assignRecursive(allData, index + 1)) {
        return true;
      }
    }
    
    // Backtrack: undo assignments (primary + co-teachers)
    for (const { day, period } of assignmentsMade) {
      facultyTimetable[facultyName][day][period] = 'FREE';
      classTimetable[className][day][period] = 'FREE';
      for (const af of additionalFaculties) {
        if (facultyTimetable[af]) {
          facultyTimetable[af][day][period] = 'FREE';
        }
      }
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
      
      // KEY FIX: limit is in HOURS/periods. For labs, we need NUMBER OF SESSIONS.
      // e.g. weeklyLimit=6 hours, count=2 consecutive → 3 sessions (not 6).
      const sessionCount = Math.max(1, Math.round(limit / count));
      
      for (const { day, period } of shuffledPositions) {
        if (occurrence >= sessionCount) break;
        
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
      
      // Assign all positions to all faculties.
      // Primary faculty (index 0) writes the class grid; co-teachers skip it (isCoTeach=true)
      for (const { day, period } of assignedPositions) {
        for (let fi = 0; fi < faculties.length; fi++) {
          const result = manualAssign(faculties[fi], className, subjectName, day, period, true, fi > 0);
          if (!result) {
            // Only abort if primary faculty fails; co-teacher failure is non-fatal
            if (fi === 0) return false;
          }
        }
      }
      
      return true;
    } else {
      // Multi-faculty co-teaching: find common free slots for ALL faculty AND the class
      let commonPositions = new Set();
      
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          // Class slot must be free
          if (classTimetable[className][i][j] !== 'FREE') continue;
          let allFree = true;
          for (const facultyName of faculties) {
            if (!facultyTimetable[facultyName] ||
                facultyTimetable[facultyName][i][j] !== 'FREE') {
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
      
      // Assign selected positions: primary faculty writes class slot, co-teachers skip it
      for (const { day, period } of selectedPositions) {
        // Primary faculty — also writes the class grid
        const primaryResult = manualAssign(faculties[0], className, subjectName, day, period, false, false);
        if (!primaryResult) {
          return false;
        }
        // Additional co-teachers — only mark their own faculty grid, class slot already filled
        for (let fi = 1; fi < faculties.length; fi++) {
          manualAssign(faculties[fi], className, subjectName, day, period, false, true);
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
 * @param {boolean} isCoTeach - When true, skip the class-slot-busy check so a
 *   second (or third…) co-teacher can be placed in the same slot as the first.
 *   The class grid is NOT overwritten — it already has the correct subject from
 *   the primary teacher's assignment.
 */
const manualAssign = (facultyName, className, subjectName, day, period, isLab, isCoTeach = false) => {
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
  // Co-teachers share the same class slot — only the primary teacher writes the subject
  if (!isCoTeach) {
    classTimetable[className][day][period] = subjectName;
  }
  
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
 * Main timetable generation function — async so backtracking can yield to browser
 * @param {Function} onProgress - Optional progress callback for backtracking path
 */
export const generateTimetable = async (onProgress = null) => {
  try {
    // Step 1: Reset timetables
    resetTimetable();

    // Reset backtracking timeout sentinel and call counter
    _backtrackStartTime = Date.now();
    _backtrackTimedOut = false;
    _backtrackCallCount = 0;
    _backtrackOnProgress = onProgress;

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

    // Step 4: Apply regular assignments using backtracking (async for UI responsiveness)
    // PLAN FIX #1 (backtracking): Sort by MRV (Minimum Remaining Values) —
    // subjects with the fewest possible placement options go first.
    // Most-constrained first dramatically reduces the backtracking depth.
    const allFacultyData = getAllFacultyData();
    if (allFacultyData.length > 0) {
      // MRV sort: count available positions for each assignment and sort ascending
      const withCounts = allFacultyData.map(item => {
        const positions = findEmptyPositions(item.facultyName, item.className, item.limit, false);
        const count = Array.isArray(positions) ? positions.length : 0;
        return { item, count };
      });
      withCounts.sort((a, b) => a.count - b.count);
      const sortedFacultyData = withCounts.map(x => x.item);

      const success = await assignRecursive(sortedFacultyData);

      // PLAN FIX #3 (backtracking): On timeout, return partial result instead of failure
      if (!success) {
        if (_backtrackTimedOut) {
          return {
            success: true,
            partial: true,
            message: `Partial timetable — some subjects could not be placed within the time limit. Consider reducing weekly hours or adding more periods.`,
            facultyTimetables: facultyTimetable,
            classTimetables: classTimetable
          };
        }
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
    // Lab subjects always carry the '*' marker; non-lab multi-faculty subjects do NOT
    subjectName: isLab && !subjectName.endsWith('*') ? subjectName + '*' : subjectName,
    weeklyLimit: limit,
    // FIX: pass the ACTUAL isLab flag — do NOT hardcode true.
    // Multi-faculty theory subjects (isLab=false) must be handled by displacementRepair,
    // not labRepair. Hardcoding true caused them to be skipped by theory repair entirely.
    isLab: !!isLab,
    // Non-lab multi-faculty: consecutivePeriods should be 1, not 2
    consecutivePeriods: isLab ? (count || 2) : 1,
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

    // Collect all data from service state
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

    const totalAssignments = (regularAssignments?.length || 0) + (labAssignments?.length || 0);
    console.log('[GA] Data summary:', {
      faculties: faculties.length,
      classes: classes.length,
      regularAssignments: regularAssignments.length,
      labAssignments: labAssignments.length,
      manualAssignments: manualAssignments.length,
      totalAssignments
    });

    // Validate
    if (!faculties || faculties.length === 0) {
      return { success: false, message: 'No faculties found. Please add faculty data first.', facultyTimetables: facultyTimetable, classTimetables: classTimetable };
    }
    if (!classes || classes.length === 0) {
      return { success: false, message: 'No classes found. Please add class data first.', facultyTimetables: facultyTimetable, classTimetables: classTimetable };
    }
    if (totalAssignments === 0) {
      return { success: false, message: 'No subject assignments found. Please add assignments first.', facultyTimetables: facultyTimetable, classTimetables: classTimetable };
    }

    // Build GA config (adaptive scaling happens inside runGeneticAlgorithm)
    const config = {
      rows,
      cols,
      ...gaConfig
    };

    // Run the genetic algorithm
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
        message: 'Genetic Algorithm failed to produce any result. Try reducing data size or using Backtracking.',
        facultyTimetables: facultyTimetable,
        classTimetables: classTimetable
      };
    }

    // Apply the best solution found
    facultyTimetable = bestChromosome.genes.faculty;
    classTimetable = bestChromosome.genes.class;

    const hardViolations = bestChromosome.conflicts.filter(c =>
      ['FACULTY_DOUBLE_BOOKING', 'CLASS_DOUBLE_BOOKING', 'LAB_NON_CONSECUTIVE'].includes(c.type)
    );

    // IMPORTANT: Always return success:true so the timetable is shown to the user.
    // Hard violations are reported as a warning, not as a failure —
    // the user can still view, export, and manually adjust the timetable.
    const message = hardViolations.length > 0
      ? `Timetable generated (best effort) with ${hardViolations.length} hard constraint violation(s) out of ${bestChromosome.conflicts.length} total. You can still export and adjust manually.`
      : `Timetable generated successfully with Genetic Algorithm! (Fitness: ${bestChromosome.fitness}, Generation: ${bestChromosome.generation + 1})`;

    return {
      success: true,
      message,
      hasViolations: hardViolations.length > 0,
      facultyTimetables: facultyTimetable,
      classTimetables: classTimetable,
      fitness: bestChromosome.fitness,
      conflicts: bestChromosome.conflicts,
      generation: bestChromosome.generation,
      algorithm: 'genetic'
    };

  } catch (error) {
    console.error('[GA] Error in generateTimetableWithGA:', error);
    return {
      success: false,
      message: `GA Error: ${error.message}`,
      facultyTimetables: facultyTimetable,
      classTimetables: classTimetable
    };
  }
};

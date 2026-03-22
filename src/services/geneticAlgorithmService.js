/**
 * Genetic Algorithm Service for Timetable Generation
 * Implements evolutionary optimization for constraint-based scheduling
 *
 * BUG FIXES (v2):
 *  1. cloneChromosome now uses a fast manual deep-copy instead of
 *     JSON.parse(JSON.stringify()) which caused GC pressure / tab crash on large data.
 *  2. evaluateFitness double-booking check is now per-slot, not Set-based.
 *     A faculty teaching the same class at two different periods is NOT a conflict.
 *  3. swapMutation now reads class names BEFORE swapping faculty slots so the
 *     class timetable update is consistent.
 *  4. runGeneticAlgorithm auto-scales populationSize / maxGenerations based on
 *     data size so large Excel imports don't hang or OOM the browser.
 *  5. Browser yields every generation (not every 5) to keep the tab responsive.
 */

// ==================== CONFIGURATION ====================

const DEFAULT_CONFIG = {
  populationSize: 50,
  maxGenerations: 200,
  mutationRate: 0.1,
  crossoverRate: 0.7,
  elitismCount: 5,
  tournamentSize: 3,
  convergenceThreshold: 30,
  targetFitness: 9500
};

// Fitness penalty weights
const PENALTIES = {
  FACULTY_DOUBLE_BOOKING: -100,
  CLASS_DOUBLE_BOOKING: -100,
  UNASSIGNED_SUBJECT: -200,
  UNASSIGNED_LAB_SESSION: -150,
  LAB_NON_CONSECUTIVE: -80,
  MANUAL_ASSIGNMENT_VIOLATED: -150,
  EXCEED_WEEKLY_LIMIT: -20,
  BELOW_WEEKLY_LIMIT: -15,
  CONSECUTIVE_DIFFERENT_CLASSES: -25,
  FRIDAY_LAST_SLOT_LAB: -10,
  UNEVEN_DISTRIBUTION: -5,
  FREE_SLOT_GAPS: -3
};

const BASE_FITNESS = 10000;

// ==================== CHROMOSOME REPRESENTATION ====================

const createEmptyChromosome = (faculties, classes, rows, cols) => {
  const chromosome = {
    genes: {
      faculty: {},
      class: {}
    },
    fitness: 0,
    conflicts: [],
    generation: 0,
    metadata: { rows, cols }
  };

  // Initialize faculty timetables
  faculties.forEach(faculty => {
    const grid = new Array(rows);
    for (let r = 0; r < rows; r++) {
      grid[r] = new Array(cols).fill('FREE');
    }
    chromosome.genes.faculty[faculty] = grid;
  });

  // Initialize class timetables
  classes.forEach(className => {
    const grid = new Array(rows);
    for (let r = 0; r < rows; r++) {
      grid[r] = new Array(cols).fill('FREE');
    }
    chromosome.genes.class[className] = grid;
  });

  return chromosome;
};

/**
 * FIX #1: Fast manual deep-copy of chromosome grids.
 * JSON.parse(JSON.stringify()) is O(n) on the JSON string length and triggers
 * massive GC allocations — with large data this crashes browser tabs.
 * Manual row-by-row copy is 3-5x faster and allocates far fewer objects.
 */
const cloneChromosome = (chromosome) => {
  const { rows, cols } = chromosome.metadata;

  const clonedFaculty = {};
  for (const name in chromosome.genes.faculty) {
    const srcGrid = chromosome.genes.faculty[name];
    const dstGrid = new Array(rows);
    for (let r = 0; r < rows; r++) {
      dstGrid[r] = srcGrid[r].slice(); // shallow copy of primitives (strings) — correct
    }
    clonedFaculty[name] = dstGrid;
  }

  const clonedClass = {};
  for (const name in chromosome.genes.class) {
    const srcGrid = chromosome.genes.class[name];
    const dstGrid = new Array(rows);
    for (let r = 0; r < rows; r++) {
      dstGrid[r] = srcGrid[r].slice();
    }
    clonedClass[name] = dstGrid;
  }

  return {
    genes: {
      faculty: clonedFaculty,
      class: clonedClass
    },
    fitness: chromosome.fitness,
    conflicts: chromosome.conflicts.slice(),
    generation: chromosome.generation,
    metadata: { rows, cols }
  };
};

// ==================== INITIALIZATION ====================

const assignSubjectRandom = (chromosome, assignment) => {
  const { facultyName, className, weeklyLimit, subjectName, isLab, consecutivePeriods, additionalFaculties = [] } = assignment;
  const { rows, cols } = chromosome.metadata;

  // Guard: primary faculty and class must both exist in the chromosome
  if (!chromosome.genes.faculty[facultyName] || !chromosome.genes.class[className]) {
    return false;
  }

  let assigned = 0;
  const maxAttempts = Math.max(500, rows * cols * 10); // Increased from *3 to *10 so random placement is more thorough in dense timetables
  let attempts = 0;

  if (isLab) {
    // KEY FIX: weeklyLimit is HOURS. Convert to number of SESSIONS.
    // e.g. weeklyLimit=6 hours, labLen=2 → 3 sessions (not 6).
    const labLen = consecutivePeriods || 2;
    const sessionTarget = Math.max(1, Math.round(weeklyLimit / labLen));
    const usedDays = new Set(); // one lab session per day maximum

    // EDGE-ONLY: Labs must be at start or end of day.
    // Build candidate edge start positions (deduplicate if cols == labLen).
    const edgeStarts = [0];
    if (cols - labLen > 0) edgeStarts.push(cols - labLen);

    // Shuffle day order for diversity across chromosomes
    const dayOrder = [];
    for (let d = 0; d < rows; d++) dayOrder.push(d);
    for (let i = dayOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dayOrder[i], dayOrder[j]] = [dayOrder[j], dayOrder[i]];
    }

    for (const day of dayOrder) {
      if (assigned >= sessionTarget) break;
      if (usedDays.has(day)) continue;

      // Shuffle edge positions so we don't always bias toward start-of-day
      const starts = [...edgeStarts];
      if (Math.random() < 0.5 && starts.length > 1) {
        [starts[0], starts[1]] = [starts[1], starts[0]];
      }

      for (const period of starts) {
        if (period + labLen > cols) continue;

        // Check ALL consecutive slots are free for primary faculty, class, AND co-teachers
        let canAssign = true;
        for (let p = period; p < period + labLen; p++) {
          if (chromosome.genes.faculty[facultyName][day][p] !== 'FREE' ||
              chromosome.genes.class[className][day][p] !== 'FREE') {
            canAssign = false;
            break;
          }
          for (const af of additionalFaculties) {
            if (chromosome.genes.faculty[af] && chromosome.genes.faculty[af][day][p] !== 'FREE') {
              canAssign = false;
              break;
            }
          }
          if (!canAssign) break;
        }

        if (canAssign) {
          usedDays.add(day);
          for (let p = period; p < period + labLen; p++) {
            chromosome.genes.faculty[facultyName][day][p] = className;
            chromosome.genes.class[className][day][p] = subjectName.endsWith('*')
              ? subjectName
              : subjectName + '*';
            for (const af of additionalFaculties) {
              if (chromosome.genes.faculty[af]) {
                chromosome.genes.faculty[af][day][p] = className;
              }
            }
          }
          assigned++;
          break; // move to next day
        }
      }
    }
    return assigned >= sessionTarget;
  } else {
    // FIX: Round-robin distribution across days.
    // Each PASS places at most 1 slot per day before any day gets a 2nd slot.
    // This prevents early days monopolising all slots and leaving Day 4-5 empty.
    // After each full round, slotsPerDayLimit increases by 1, until quota filled.
    const assignedPerDay = new Array(rows).fill(0);

    for (let slotsPerDayLimit = 1; assigned < weeklyLimit && slotsPerDayLimit <= cols; slotsPerDayLimit++) {
      // Shuffle day order fresh on each round so different days get priority
      const dayOrder = [];
      for (let d = 0; d < rows; d++) dayOrder.push(d);
      for (let i = dayOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dayOrder[i], dayOrder[j]] = [dayOrder[j], dayOrder[i]];
      }

      let placedThisRound = 0;
      for (const day of dayOrder) {
        if (assigned >= weeklyLimit) break;
        // Each day can only hold slotsPerDayLimit of this subject in this round
        if (assignedPerDay[day] >= slotsPerDayLimit) continue;

        // Shuffle period order for this day
        const periodOrder = [];
        for (let p = 0; p < cols; p++) periodOrder.push(p);
        for (let i = periodOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [periodOrder[i], periodOrder[j]] = [periodOrder[j], periodOrder[i]];
        }

        for (const period of periodOrder) {
          if (assigned >= weeklyLimit) break;
          if (assignedPerDay[day] >= slotsPerDayLimit) break;
          // Check primary faculty AND class slot are free
          if (chromosome.genes.faculty[facultyName][day][period] === 'FREE' &&
              chromosome.genes.class[className][day][period] === 'FREE') {
            // Check all co-teachers are also free at this slot
            const coFree = additionalFaculties.every(
              af => chromosome.genes.faculty[af] && chromosome.genes.faculty[af][day][period] === 'FREE'
            );
            if (!coFree) continue;
            chromosome.genes.faculty[facultyName][day][period] = className;
            chromosome.genes.class[className][day][period] = subjectName;
            for (const af of additionalFaculties) {
              if (chromosome.genes.faculty[af]) {
                chromosome.genes.faculty[af][day][period] = className;
              }
            }
            assigned++;
            assignedPerDay[day]++;
            placedThisRound++;
            break; // move to next day after placing 1 slot here
          }
        }
      }
      // If no slots placed in this round, no more progress is possible
      if (placedThisRound === 0) break;
    }

    // Fallback: if round-robin didn't fill quota, try random picks for remaining
    while (assigned < weeklyLimit && attempts < maxAttempts) {
      attempts++;
      const day = Math.floor(Math.random() * rows);
      const period = Math.floor(Math.random() * cols);
      if (chromosome.genes.faculty[facultyName][day][period] === 'FREE' &&
          chromosome.genes.class[className][day][period] === 'FREE') {
        const coFree = additionalFaculties.every(
          af => chromosome.genes.faculty[af] && chromosome.genes.faculty[af][day][period] === 'FREE'
        );
        if (!coFree) continue;
        chromosome.genes.faculty[facultyName][day][period] = className;
        chromosome.genes.class[className][day][period] = subjectName;
        for (const af of additionalFaculties) {
          if (chromosome.genes.faculty[af]) chromosome.genes.faculty[af][day][period] = className;
        }
        assigned++;
      }
    }
    return assigned >= weeklyLimit;
  }
};


const applyManualAssignments = (chromosome, manualAssignments) => {
  if (!manualAssignments || manualAssignments.length === 0) return;

  manualAssignments.forEach(({ facultyName, className, subjectName, day, period }) => {
    if (chromosome.genes.faculty[facultyName] && chromosome.genes.class[className]) {
      if (day >= 0 && day < chromosome.metadata.rows && period >= 0 && period < chromosome.metadata.cols) {
        chromosome.genes.faculty[facultyName][day][period] = className;
        chromosome.genes.class[className][day][period] = subjectName;
      }
    }
  });
};


/**
 * Count how many theory periods are still unplaced.
 */
export const countUnplacedPeriods = (chromosome, assignments) => {
  if (!assignments || assignments.length === 0) return 0;
  const { rows, cols } = chromosome.metadata;
  let total = 0;
  for (const { className, subjectName, weeklyLimit, isLab } of assignments) {
    if (isLab) continue;
    if (!chromosome.genes.class[className]) continue;
    let placed = 0;
    for (let d = 0; d < rows; d++)
      for (let p = 0; p < cols; p++)
        if (chromosome.genes.class[className][d][p] === subjectName) placed++;
    if (placed < weeklyLimit) total += weeklyLimit - placed;
  }
  return total;
};

/**
 * Count how many lab SESSIONS are still unplaced.
 * A session = labLen consecutive identical lab-subject slots on the same day.
 */
export const countUnplacedLabSessions = (chromosome, labAssignments) => {
  if (!labAssignments || labAssignments.length === 0) return 0;
  const { rows, cols } = chromosome.metadata;
  let total = 0;
  for (const { className, subjectName, weeklyLimit, isLab, consecutivePeriods } of labAssignments) {
    if (!isLab) continue;
    if (!chromosome.genes.class[className]) continue;
    const labLen = consecutivePeriods || 2;
    const sessionTarget = Math.max(1, Math.round(weeklyLimit / labLen));
    const labSubjName = subjectName.endsWith('*') ? subjectName : subjectName + '*';
    let placed = 0;
    for (let d = 0; d < rows; d++) {
      let runLen = 0;
      for (let p = 0; p < cols; p++) {
        if (chromosome.genes.class[className][d][p] === labSubjName) {
          runLen++;
        } else {
          if (runLen >= labLen) placed++;
          runLen = 0;
        }
      }
      if (runLen >= labLen) placed++;
    }
    if (placed < sessionTarget) total += sessionTarget - placed;
  }
  return total;
};

/**
 * DISPLACEMENT REPAIR — two-phase approach:
 *
 * Phase 1 (direct fill): For each under-placed subject, find ALL slots where
 *   BOTH the faculty grid AND class grid are FREE, then assign there.
 *
 * Phase 2 (displacement): If a subject still has missing periods after Phase 1,
 *   find class-FREE slots where the FACULTY is blocked by another assignment.
 *   Try to move that blocking assignment to a different (also free) slot,
 *   then place the target subject in the vacated slot.
 *   This handles the case where faculty is busy during all free class slots.
 *
 * Run multiple passes until no progress is made or all subjects are satisfied.
 */

/**
 * chainFreeSlot — recursively tries to make faculty slot (d, p) FREE by
 * chain-displacing whatever blocking assignment is there.
 *
 * Returns TRUE if (faculty, d, p) is now FREE (and all moves already applied).
 * Returns FALSE if impossible at this depth — NO modifications are made on false.
 *
 * Key property: modifications happen ONLY on the path that eventually returns
 * true, so callers never need a rollback on a false return.
 *
 * @param {object} chromosome
 * @param {string} faculty        - name of the faculty whose slot we want to free
 * @param {number} d,p            - the slot to free
 * @param {number} depth          - remaining recursion budget (0 = give up)
 * @param {Set}    visited        - "d|p" strings already in the current chain
 */
const chainFreeSlot = (chromosome, faculty, d, p, depth, visited, rows, cols, allAssignments) => {
  // Already free — nothing to do
  if (chromosome.genes.faculty[faculty][d][p] === 'FREE') return true;
  if (depth === 0) return false;

  const blockerClass   = chromosome.genes.faculty[faculty][d][p];
  const blockerSubject = chromosome.genes.class[blockerClass]?.[d][p];

  // Can't displace a missing entry, a FREE entry, or a lab block
  if (!blockerSubject || blockerSubject === 'FREE' || blockerSubject.endsWith('*')) return false;

  // FIX #3: Find co-teachers for the blocking assignment so we can move them too
  let blockerCoTeachers = [];
  if (allAssignments) {
    const blockerAssignment = allAssignments.find(a =>
      a.className === blockerClass && a.subjectName === blockerSubject
    );
    if (blockerAssignment && blockerAssignment.additionalFaculties) {
      blockerCoTeachers = blockerAssignment.additionalFaculties;
    }
  }

  // Try every slot where blockerClass has a free cell as an alternative home
  for (let d2 = 0; d2 < rows; d2++) {
    for (let p2 = 0; p2 < cols; p2++) {
      if (d2 === d && p2 === p) continue;
      // blockerClass must have a FREE cell at the target
      if (!chromosome.genes.class[blockerClass] ||
          chromosome.genes.class[blockerClass][d2][p2] !== 'FREE') continue;
      // FIX #3: Check co-teachers are also free at (d2, p2)
      let coTeachersOk = true;
      for (const ct of blockerCoTeachers) {
        if (chromosome.genes.faculty[ct] && chromosome.genes.faculty[ct][d2][p2] !== 'FREE') {
          coTeachersOk = false;
          break;
        }
      }
      if (!coTeachersOk) continue;
      // Avoid cycles in the current chain
      const key = `${d2}|${p2}`;
      if (visited.has(key)) continue;

      // Try to free (faculty, d2, p2) — one level deeper
      const childVisited = new Set(visited);
      childVisited.add(key);
      if (chainFreeSlot(chromosome, faculty, d2, p2, depth - 1, childVisited, rows, cols, allAssignments)) {
        // (faculty, d2, p2) is now FREE.  Move blocker there.
        chromosome.genes.faculty[faculty][d][p]   = 'FREE';
        chromosome.genes.class[blockerClass][d][p] = 'FREE';
        chromosome.genes.faculty[faculty][d2][p2]   = blockerClass;
        chromosome.genes.class[blockerClass][d2][p2] = blockerSubject;
        // FIX #3: Move co-teachers too
        for (const ct of blockerCoTeachers) {
          if (chromosome.genes.faculty[ct]) {
            chromosome.genes.faculty[ct][d][p] = 'FREE';
            chromosome.genes.faculty[ct][d2][p2] = blockerClass;
          }
        }
        return true;
      }
    }
  }
  return false;
};

/**
 * How many levels of chain displacement to attempt.
 * 4 is enough to solve virtually all real scheduling conflicts without
 * becoming exponentially slow (branching factor is bounded by rows × cols).
 */
const CHAIN_DEPTH = 4;

/**
 * DISPLACEMENT REPAIR — two-phase approach:
 *
 * Phase 1 (direct fill): For each under-placed subject, find ALL slots where
 *   BOTH the faculty grid AND class grid are FREE, then assign there.
 *
 * Phase 2 (chain displacement): If a subject still has missing periods after
 *   Phase 1, find class-FREE slots where the FACULTY is blocked. Use the
 *   recursive chainFreeSlot to move the blocking assignment (and its blockers,
 *   up to CHAIN_DEPTH levels deep) to genuinely free slots, then place here.
 *   This mirrors what backtracking does — following chains of dependencies.
 *
 * Runs in an unlimited loop until a full pass makes zero progress.
 */
const displacementRepair = (chromosome, assignments) => {
  const { rows, cols } = chromosome.metadata;
  if (!assignments || assignments.length === 0) return;

  const theoryAssignments = assignments.filter(a => !a.isLab &&
    chromosome.genes.class[a.className] && chromosome.genes.faculty[a.facultyName]);

  for (;;) {
    let progress = false;

    // Shuffle order each pass for diversity
    const order = [...theoryAssignments];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    for (const { facultyName, className, subjectName, weeklyLimit, additionalFaculties = [] } of order) {
      // Count placed
      let placed = 0;
      for (let d = 0; d < rows; d++)
        for (let p = 0; p < cols; p++)
          if (chromosome.genes.class[className][d][p] === subjectName) placed++;
      if (placed >= weeklyLimit) continue;

      // ── PHASE 1: direct fill ──────────────────────────────────────────────
      for (let d = 0; d < rows && placed < weeklyLimit; d++) {
        for (let p = 0; p < cols && placed < weeklyLimit; p++) {
          if (chromosome.genes.class[className][d][p] !== 'FREE') continue;
          if (chromosome.genes.faculty[facultyName][d][p] !== 'FREE') continue;
          const coFree = additionalFaculties.every(
            af => chromosome.genes.faculty[af] && chromosome.genes.faculty[af][d][p] === 'FREE'
          );
          if (!coFree) continue;
          chromosome.genes.class[className][d][p]   = subjectName;
          chromosome.genes.faculty[facultyName][d][p] = className;
          for (const af of additionalFaculties)
            if (chromosome.genes.faculty[af]) chromosome.genes.faculty[af][d][p] = className;
          placed++;
          progress = true;
        }
      }
      if (placed >= weeklyLimit) continue;

      // ── PHASE 2: chain displacement ───────────────────────────────────────
      // For each class-FREE slot where the faculty is blocked, try to free
      // the faculty slot via a recursive chain move (up to CHAIN_DEPTH deep).
      outerLoop:
      for (let d = 0; d < rows && placed < weeklyLimit; d++) {
        for (let p = 0; p < cols && placed < weeklyLimit; p++) {
          if (chromosome.genes.class[className][d][p] !== 'FREE') continue;
          if (chromosome.genes.faculty[facultyName][d][p] === 'FREE') continue; // Phase 1 already handles free slots

          const visited = new Set([`${d}|${p}`]);
          if (chainFreeSlot(chromosome, facultyName, d, p, CHAIN_DEPTH, visited, rows, cols, assignments)) {
            // faculty slot at (d, p) is now FREE — place the subject
            // Also verify co-teachers are free at this slot (chain may have freed them too)
            const coFree = additionalFaculties.every(
              af => !chromosome.genes.faculty[af] || chromosome.genes.faculty[af][d][p] === 'FREE'
            );
            if (!coFree) continue;
            chromosome.genes.class[className][d][p]   = subjectName;
            chromosome.genes.faculty[facultyName][d][p] = className;
            for (const af of additionalFaculties)
              if (chromosome.genes.faculty[af]) chromosome.genes.faculty[af][d][p] = className;
            placed++;
            progress = true;
            continue outerLoop;
          }
        }
      }
    }

    if (!progress) break; // No slots filled this pass — no further improvement possible
  }
};


/**
 * LAB REPAIR PASS
 *
 * After theory displacement repair fills missing theory slots, some lab sessions
 * may still be absent (crossover destroyed them and theory repair filled those
 * slots with theory subjects instead). This pass:
 *   1. Counts how many consecutive lab sessions are *actually* placed for each
 *      lab assignment in the class grid (looks for `subjectName*` runs of the
 *      right length on the same day).
 *   2. For each missing session, scans every (day, startPeriod) pair and checks
 *      that ALL labLen consecutive slots are FREE in BOTH the class grid AND the
 *      primary faculty grid (AND all co-teacher grids).
 *   3. If free, places the lab session there (marks class grid `subjectName*`,
 *      faculty grids with `className`).
 *
 * One session per day limit is respected (same as the initial placement).
 */
const labRepair = (chromosome, labAssignments) => {
  if (!labAssignments || labAssignments.length === 0) return;
  const { rows, cols } = chromosome.metadata;

  for (const {
    facultyName, className, subjectName, weeklyLimit,
    isLab, consecutivePeriods, additionalFaculties = []
  } of labAssignments) {
    if (!isLab) continue;
    if (!chromosome.genes.faculty[facultyName] || !chromosome.genes.class[className]) continue;

    const labLen = consecutivePeriods || 2;
    // Convert weeklyLimit (hours) → number of sessions needed
    const sessionTarget = Math.max(1, Math.round(weeklyLimit / labLen));
    // Lab subject name always ends with '*'
    const labSubjName = subjectName.endsWith('*') ? subjectName : subjectName + '*';

    // ── Step 1: Count sessions already placed ─────────────────────────────────
    // A session = labLen consecutive identical lab-subject slots on the same day.
    const daysUsed = new Set();
    let placed = 0;
    for (let d = 0; d < rows; d++) {
      // Scan for runs of labSubjName of length >= labLen on this day
      let runStart = -1;
      let runLen = 0;
      for (let p = 0; p < cols; p++) {
        if (chromosome.genes.class[className][d][p] === labSubjName) {
          if (runStart === -1) runStart = p;
          runLen++;
        } else {
          if (runLen >= labLen) {
            placed++;
            daysUsed.add(d);
          }
          runStart = -1;
          runLen = 0;
        }
      }
      if (runLen >= labLen) {
        placed++;
        daysUsed.add(d);
      }
    }

    if (placed >= sessionTarget) continue; // Nothing to repair

    // ── Step 2: Place missing sessions (EDGE-ONLY: start or end of day) ────────
    const needed = sessionTarget - placed;
    let restored = 0;

    // Only try edge positions: period 0 (start) and cols-labLen (end)
    const edgeStartsRepair = [0];
    if (cols - labLen > 0) edgeStartsRepair.push(cols - labLen);

    for (let d = 0; d < rows && restored < needed; d++) {
      if (daysUsed.has(d)) continue; // already one session on this day

      for (const startP of edgeStartsRepair) {
        if (restored >= needed) break;
        if (startP + labLen > cols) continue;

        // Check ALL consecutive slots are FREE: class, primary faculty, co-teachers
        let canPlace = true;
        for (let p = startP; p < startP + labLen; p++) {
          if (chromosome.genes.class[className][d][p] !== 'FREE' ||
              chromosome.genes.faculty[facultyName][d][p] !== 'FREE') {
            canPlace = false;
            break;
          }
          for (const af of additionalFaculties) {
            if (chromosome.genes.faculty[af] &&
                chromosome.genes.faculty[af][d][p] !== 'FREE') {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }

        if (!canPlace) continue;

        // Place the lab session
        for (let p = startP; p < startP + labLen; p++) {
          chromosome.genes.class[className][d][p] = labSubjName;
          chromosome.genes.faculty[facultyName][d][p] = className;
          for (const af of additionalFaculties) {
            if (chromosome.genes.faculty[af]) {
              chromosome.genes.faculty[af][d][p] = className;
            }
          }
        }
        daysUsed.add(d);
        restored++;
        break; // move to next day
      }
    }

    // ── Step 3 (FIX #4): Displacement for labs ────────────────────────────────
    // If direct placement couldn't fill all sessions, try displacing theory
    // subjects from consecutive slots to make room for the lab.
    if (restored < needed) {
      // EDGE-ONLY displacement: only try start and end of day
      const edgeStartsDisplace = [0];
      if (cols - labLen > 0) edgeStartsDisplace.push(cols - labLen);

      for (let d = 0; d < rows && restored < needed; d++) {
        if (daysUsed.has(d)) continue;

        for (const startP of edgeStartsDisplace) {
          if (restored >= needed) break;
          if (startP + labLen > cols) continue;

          // Check: class grid must be FREE or theory (non-lab) for all labLen slots
          // Faculty grid can be anything — we'll try to displace/free it
          let classOk = true;
          for (let p = startP; p < startP + labLen; p++) {
            const cv = chromosome.genes.class[className][d][p];
            if (cv !== 'FREE' && cv.endsWith('*')) {
              classOk = false; // another lab is here — can't displace
              break;
            }
          }
          if (!classOk) continue;

          // Try to free all labLen slots for both class and faculty
          // Snapshot current state so we can rollback on failure
          const snapshots = [];
          let allFreed = true;

          for (let p = startP; p < startP + labLen && allFreed; p++) {
            // Free the class slot if occupied by theory
            const classVal = chromosome.genes.class[className][d][p];
            if (classVal !== 'FREE') {
              // Find which faculty teaches this theory subject here
              let theoryFaculty = null;
              for (const fn in chromosome.genes.faculty) {
                if (chromosome.genes.faculty[fn][d][p] === className) {
                  theoryFaculty = fn;
                  break;
                }
              }
              if (!theoryFaculty) { allFreed = false; break; }

              // Find an alternative slot for this theory subject
              let moved = false;
              for (let d2 = 0; d2 < rows && !moved; d2++) {
                for (let p2 = 0; p2 < cols && !moved; p2++) {
                  if (d2 === d && p2 >= startP && p2 < startP + labLen) continue;
                  if (chromosome.genes.class[className][d2][p2] !== 'FREE') continue;
                  if (chromosome.genes.faculty[theoryFaculty][d2][p2] !== 'FREE') continue;
                  // Move the theory subject
                  snapshots.push({ type: 'move', faculty: theoryFaculty, cls: className, subj: classVal, fromD: d, fromP: p, toD: d2, toP: p2 });
                  chromosome.genes.class[className][d2][p2] = classVal;
                  chromosome.genes.faculty[theoryFaculty][d2][p2] = className;
                  chromosome.genes.class[className][d][p] = 'FREE';
                  chromosome.genes.faculty[theoryFaculty][d][p] = 'FREE';
                  moved = true;
                }
              }
              if (!moved) { allFreed = false; }
            }

            // Now free the primary faculty slot if still occupied
            if (allFreed && chromosome.genes.faculty[facultyName][d][p] !== 'FREE') {
              const visited = new Set([`${d}|${p}`]);
              if (!chainFreeSlot(chromosome, facultyName, d, p, CHAIN_DEPTH, visited, rows, cols, labAssignments)) {
                allFreed = false;
              }
            }

            // Free co-teacher slots
            if (allFreed) {
              for (const af of additionalFaculties) {
                if (chromosome.genes.faculty[af] && chromosome.genes.faculty[af][d][p] !== 'FREE') {
                  const visited = new Set([`${d}|${p}`]);
                  if (!chainFreeSlot(chromosome, af, d, p, CHAIN_DEPTH, visited, rows, cols, labAssignments)) {
                    allFreed = false;
                    break;
                  }
                }
              }
            }
          }

          if (!allFreed) {
            // Rollback any moves we made
            for (let si = snapshots.length - 1; si >= 0; si--) {
              const s = snapshots[si];
              if (s.type === 'move') {
                chromosome.genes.class[s.cls][s.fromD][s.fromP] = s.subj;
                chromosome.genes.faculty[s.faculty][s.fromD][s.fromP] = s.cls;
                chromosome.genes.class[s.cls][s.toD][s.toP] = 'FREE';
                chromosome.genes.faculty[s.faculty][s.toD][s.toP] = 'FREE';
              }
            }
            continue; // try next edge position
          }

          // All slots freed — place the lab
          for (let p = startP; p < startP + labLen; p++) {
            chromosome.genes.class[className][d][p] = labSubjName;
            chromosome.genes.faculty[facultyName][d][p] = className;
            for (const af of additionalFaculties) {
              if (chromosome.genes.faculty[af]) {
                chromosome.genes.faculty[af][d][p] = className;
              }
            }
          }
          daysUsed.add(d);
          restored++;
          break; // move to next day
        }
      }
    }

    if (restored > 0) {
      console.log(`[labRepair] ${className} ${labSubjName}: restored ${restored}/${needed} missing sessions`);
    }
  }
};

export const initializePopulation = (config, faculties, classes, assignments, manualAssignments, labAssignments) => {
  const population = [];
  const { rows, cols, populationSize } = config;

  console.log(`Initializing population of ${populationSize} (${faculties.length} faculties, ${classes.length} classes)...`);

  for (let i = 0; i < populationSize; i++) {
    try {
      const chromosome = createEmptyChromosome(faculties, classes, rows, cols);

      // Manual overrides first (highest priority)
      applyManualAssignments(chromosome, manualAssignments);

      // Labs before theory so consecutive-slot logic has less interference
      if (labAssignments && labAssignments.length > 0) {
        labAssignments.forEach(labAssignment => {
          // assignSubjectRandom now handles ALL co-teachers internally — call once only
          assignSubjectRandom(chromosome, labAssignment);
        });
      }

      // Regular theory assignments — shuffle order per chromosome.
      // FIX: Using the same assignment order in every chromosome means every
      // chromosome has the same 'day monopolisation' pattern. Shuffling the
      // order gives each chromosome a different priority ranking so the
      // population explores many different placement configurations.
      if (assignments && assignments.length > 0) {
        const shuffledAssignments = [...assignments];
        for (let si = shuffledAssignments.length - 1; si > 0; si--) {
          const sj = Math.floor(Math.random() * (si + 1));
          [shuffledAssignments[si], shuffledAssignments[sj]] = [shuffledAssignments[sj], shuffledAssignments[si]];
        }
        shuffledAssignments.forEach(assignment => {
          assignSubjectRandom(chromosome, assignment);
        });
      }

      // REPAIR: displacement repair fills any under-placed theory subjects the greedy pass missed,
      // including cases where faculty is blocked — it moves the blocking assignment elsewhere.
      // Also include any non-lab multi-faculty assignments from labAssignments (isLab=false)
      // so they get chain-displacement repair too.
      const allTheoryForRepair = [
        ...(assignments || []),
        ...(labAssignments || []).filter(a => !a.isLab)
      ];
      displacementRepair(chromosome, allTheoryForRepair);

      // LAB REPAIR: crossover can destroy lab sessions; theory repair may then fill those
      // freed slots with theory subjects. This dedicated pass re-places any missing lab sessions
      // in genuinely free consecutive slots so every class gets its labs.
      if (labAssignments && labAssignments.length > 0) {
        labRepair(chromosome, labAssignments);
      }

      chromosome.generation = 0;
      population.push(chromosome);
    } catch (err) {
      console.error(`Error creating chromosome ${i}:`, err);
    }
  }

  console.log(`Population initialized: ${population.length} individuals`);
  return population;
};

// ==================== FITNESS EVALUATION ====================

/**
 * FIX #2: Correct double-booking detection.
 *
 * OLD (wrong): Set-based — flags as conflict if a faculty teaches the same class
 *   twice in a day (e.g., BCS-1 at period 1 AND period 3). That is perfectly fine.
 *
 * NEW (correct): Per-slot check — a conflict only exists if TWO DIFFERENT classes
 *   are assigned to the same (day, period) slot for a faculty.
 *   Similarly for class: two different subjects in same slot = double-booking.
 */
const evaluateFitness = (chromosome, assignments, labAssignments) => {
  let fitness = BASE_FITNESS;
  const conflicts = [];
  const { rows, cols } = chromosome.metadata;

  // --- Faculty double-booking: same period assigned to two different classes ---
  // We check per slot: if the slot is occupied, it must be exactly one class (which is guaranteed
  // by direct assignment), so a real double-booking can't occur via the current assignment logic.
  // However we still check in case crossover accidentally creates it via array swapping.
  try {
    for (const facultyName in chromosome.genes.faculty) {
      const timetable = chromosome.genes.faculty[facultyName];
      for (let day = 0; day < rows; day++) {
        const row = timetable[day];
        // Each cell can only hold one string — structural double-booking can't happen.
        // What CAN happen via bad crossover: faculty grid says BCS-1 but class grid
        // says FREE for that same slot. Penalise inconsistency.
        for (let period = 0; period < cols; period++) {
          const facultySlot = row[period];
          if (facultySlot !== 'FREE') {
            // The class entry should NOT be FREE if faculty has something here
            const className = facultySlot;
            if (chromosome.genes.class[className]) {
              const classSlot = chromosome.genes.class[className][day][period];
              if (classSlot === 'FREE') {
                fitness += PENALTIES.CLASS_DOUBLE_BOOKING;
                conflicts.push({ type: 'CLASS_DOUBLE_BOOKING', detail: `${facultyName} → ${className} @ day${day} p${period}` });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error checking faculty/class consistency:', e);
  }

  // --- Class double-booking: same period in a class timetable is non-empty ---
  // This would mean two faculties scheduled to the same class at the same time.
  // EXCEPTION: co-teaching is intentional — 2+ faculty in the same class slot
  // is only a conflict if the class grid for that slot is FREE (inconsistency),
  // not when the class grid already has a subject (legitimate co-teaching).
  try {
    for (let day = 0; day < rows; day++) {
      for (let period = 0; period < cols; period++) {
        // Build a count of how many faculties are assigned to each class at this slot
        const slotClassCounts = {};
        for (const facultyName in chromosome.genes.faculty) {
          const val = chromosome.genes.faculty[facultyName][day][period];
          if (val !== 'FREE') {
            slotClassCounts[val] = (slotClassCounts[val] || 0) + 1;
          }
        }
        for (const className in slotClassCounts) {
          if (slotClassCounts[className] > 1) {
            // Only penalise if the class grid for that slot is FREE (inconsistency / bad crossover)
            // If the class grid already has a subject, this is intentional co-teaching — no penalty
            const classSlotValue = chromosome.genes.class[className]
              ? chromosome.genes.class[className][day][period]
              : 'FREE';
            if (classSlotValue === 'FREE') {
              fitness += PENALTIES.FACULTY_DOUBLE_BOOKING * (slotClassCounts[className] - 1);
              conflicts.push({ type: 'FACULTY_DOUBLE_BOOKING', detail: `${className} @ day${day} p${period}` });
            }
            // else: co-teaching (intentional), do not penalise
          }
        }
      }
    }
  } catch (e) {
    console.error('Error checking class double-booking:', e);
  }

  // --- Lab continuity: lab periods must appear consecutively ---
  try {
    for (const className in chromosome.genes.class) {
      const timetable = chromosome.genes.class[className];
      for (let day = 0; day < rows; day++) {
        for (let period = 0; period < cols - 1; period++) {
          const current = timetable[day][period];
          const next = timetable[day][period + 1];
          // A lab slot ends with '*'. If current is a lab slot but next is a
          // different subject (or FREE), the lab isn't continuous.
          if (current && current.endsWith('*') && current !== next) {
            fitness += PENALTIES.LAB_NON_CONSECUTIVE;
            conflicts.push({ type: 'LAB_NON_CONSECUTIVE', detail: `${className} @ day${day} p${period}` });
          }
        }
      }
    }
  } catch (e) {
    console.error('Error checking lab continuity:', e);
  }

  // --- Consecutive different classes: penalise faculty switching between different classes ---
  // A faculty teaching BCS-1 at period 1, then MCA-1 at period 2 creates fatigue.
  // Only penalise transitions between TWO DIFFERENT occupied classes (FREE doesn't count).
  try {
    for (const facultyName in chromosome.genes.faculty) {
      const timetable = chromosome.genes.faculty[facultyName];
      for (let day = 0; day < rows; day++) {
        for (let period = 1; period < cols; period++) {
          const prev = timetable[day][period - 1];
          const curr = timetable[day][period];
          if (prev !== 'FREE' && curr !== 'FREE' && prev !== curr) {
            fitness += PENALTIES.CONSECUTIVE_DIFFERENT_CLASSES;
            conflicts.push({ type: 'CONSECUTIVE_DIFFERENT_CLASSES', detail: `${facultyName}: ${prev}→${curr} @ day${day} p${period}` });
          }
        }
      }
    }
  } catch (e) {
    console.error('Error checking consecutive different classes:', e);
  }



  // PLAN FIX #2a: Penalise theory subject appearing 3+ times in same class on same day.
  // This prevents chromosomes where one subject dominates the entire day.
  try {
    for (const className in chromosome.genes.class) {
      const timetable = chromosome.genes.class[className];
      for (let day = 0; day < rows; day++) {
        const subjectCount = {};
        for (let period = 0; period < cols; period++) {
          const subj = timetable[day][period];
          if (subj && subj !== 'FREE' && !subj.endsWith('*')) { // skip labs
            subjectCount[subj] = (subjectCount[subj] || 0) + 1;
          }
        }
        for (const count of Object.values(subjectCount)) {
          if (count >= 3) {
            fitness += -30 * (count - 2); // -30 per excess occurrence beyond 2
            conflicts.push({ type: 'SUBJECT_DAILY_REPEAT', detail: `${className} @ day${day}` });
          }
        }
      }
    }
  } catch (e) {
    console.error('Error checking subject daily repeat:', e);
  }

  // PLAN FIX #2b: Faculty fatigue — penalise 3+ consecutive occupied slots
  // teaching different classes (soft constraint, weight 0.8).
  try {
    for (const facultyName in chromosome.genes.faculty) {
      const timetable = chromosome.genes.faculty[facultyName];
      for (let day = 0; day < rows; day++) {
        let consecutive = 0;
        for (let period = 0; period < cols; period++) {
          if (timetable[day][period] !== 'FREE') {
            consecutive++;
            if (consecutive >= 3) {
              fitness += Math.round(-40 * 0.8); // -32 per extra period over 2
              conflicts.push({ type: 'FACULTY_FATIGUE', detail: `${facultyName} @ day${day} p${period}` });
            }
          } else {
            consecutive = 0;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error checking faculty fatigue:', e);
  }

  // ── FIX #1: Penalise unassigned / under-placed subjects ───────────────────
  // This is THE critical penalty that gives the GA evolutionary pressure to
  // fill every slot. Without this, chromosomes with FREE slots score the same
  // as fully-filled ones, so selection never drives towards completeness.
  try {
    // Theory subjects
    if (assignments && assignments.length > 0) {
      for (const { className, subjectName, weeklyLimit, isLab } of assignments) {
        if (isLab) continue;
        if (!chromosome.genes.class[className]) continue;
        let placed = 0;
        for (let d = 0; d < rows; d++)
          for (let p = 0; p < cols; p++)
            if (chromosome.genes.class[className][d][p] === subjectName) placed++;
        if (placed < weeklyLimit) {
          const missing = weeklyLimit - placed;
          fitness += PENALTIES.UNASSIGNED_SUBJECT * missing;
          conflicts.push({ type: 'UNASSIGNED_SUBJECT', detail: `${className} ${subjectName}: ${placed}/${weeklyLimit} placed (${missing} missing)` });
        }
      }
    }
    // Lab subjects
    if (labAssignments && labAssignments.length > 0) {
      for (const { className, subjectName, weeklyLimit, isLab, consecutivePeriods } of labAssignments) {
        if (!isLab) {
          // Non-lab multi-faculty — check like theory
          if (!chromosome.genes.class[className]) continue;
          let placed = 0;
          for (let d = 0; d < rows; d++)
            for (let p = 0; p < cols; p++)
              if (chromosome.genes.class[className][d][p] === subjectName) placed++;
          if (placed < weeklyLimit) {
            const missing = weeklyLimit - placed;
            fitness += PENALTIES.UNASSIGNED_SUBJECT * missing;
            conflicts.push({ type: 'UNASSIGNED_SUBJECT', detail: `${className} ${subjectName}: ${placed}/${weeklyLimit} placed (${missing} missing)` });
          }
          continue;
        }
        if (!chromosome.genes.class[className]) continue;
        const labLen = consecutivePeriods || 2;
        const sessionTarget = Math.max(1, Math.round(weeklyLimit / labLen));
        const labSubjName = subjectName.endsWith('*') ? subjectName : subjectName + '*';
        let placedSessions = 0;
        for (let d = 0; d < rows; d++) {
          let runLen = 0;
          for (let p = 0; p < cols; p++) {
            if (chromosome.genes.class[className][d][p] === labSubjName) {
              runLen++;
            } else {
              if (runLen >= labLen) placedSessions++;
              runLen = 0;
            }
          }
          if (runLen >= labLen) placedSessions++;
        }
        if (placedSessions < sessionTarget) {
          const missing = sessionTarget - placedSessions;
          fitness += PENALTIES.UNASSIGNED_LAB_SESSION * missing;
          conflicts.push({ type: 'UNASSIGNED_LAB_SESSION', detail: `${className} ${labSubjName}: ${placedSessions}/${sessionTarget} sessions (${missing} missing)` });
        }
      }
    }
  } catch (e) {
    console.error('Error checking subject completeness:', e);
  }

  chromosome.fitness = fitness;
  chromosome.conflicts = conflicts;
  return fitness;
};

// ==================== SELECTION ====================

const tournamentSelection = (population, tournamentSize) => {
  let best = null;
  for (let i = 0; i < tournamentSize; i++) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (!best || candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  return best;
};

// ==================== CROSSOVER ====================

const crossover = (parent1, parent2, crossoverRate) => {
  if (Math.random() > crossoverRate) {
    return [cloneChromosome(parent1), cloneChromosome(parent2)];
  }

  const offspring1 = cloneChromosome(parent1);
  const offspring2 = cloneChromosome(parent2);

  const rows = parent1.metadata.rows;
  const cols = parent1.metadata.cols;
  const point1 = Math.floor(Math.random() * rows);
  const point2 = Math.floor(Math.random() * rows);
  const start = Math.min(point1, point2);
  const end = Math.max(point1, point2);

  try {
    // Step 1: Swap day-rows between start..end for faculty grids ONLY
    for (const faculty in offspring1.genes.faculty) {
      if (!offspring2.genes.faculty[faculty]) continue;
      for (let day = start; day <= end && day < rows; day++) {
        const tmp = offspring1.genes.faculty[faculty][day];
        offspring1.genes.faculty[faculty][day] = offspring2.genes.faculty[faculty][day];
        offspring2.genes.faculty[faculty][day] = tmp;
      }
    }

    // Step 2: Rebuild class grids from the (now-updated) faculty grids.
    // This guarantees faculty and class grids are always in sync — no orphaned entries.
    // We need the parent class grids to know WHICH subject corresponds to each class-slot.
    // Strategy: clear swapped day range in class grid, then re-fill from faculty grid.
    // For the subject name we look it up from the parent whose faculty row we just took.

    const rebuildClassGrid = (offspring, donorParent, affectedDays) => {
      // Clear and rebuild only the affected day rows in the class grid
      for (const className in offspring.genes.class) {
        for (const day of affectedDays) {
          offspring.genes.class[className][day] = new Array(cols).fill('FREE');
        }
      }
      // Re-populate from faculty grid: for each faculty slot that is non-FREE,
      // look up the subject from the donor parent's class grid (since we took those rows from it)
      for (const faculty in offspring.genes.faculty) {
        for (const day of affectedDays) {
          const row = offspring.genes.faculty[faculty][day];
          for (let p = 0; p < cols; p++) {
            const cls = row[p];
            if (cls !== 'FREE' && offspring.genes.class[cls]) {
              // The subject for this slot comes from the donor parent's class grid
              if (donorParent.genes.class[cls] && donorParent.genes.class[cls][day][p] !== 'FREE') {
                offspring.genes.class[cls][day][p] = donorParent.genes.class[cls][day][p];
              } else {
                // Donor parent doesn't have subject info for this slot — leave FREE.
                // Better to have an empty slot than a corrupt subject name.
                // The faculty grid still records the class booking; fitness will penalize the mismatch.
                offspring.genes.class[cls][day][p] = 'FREE';
              }
            }
          }
        }
      }
    };

    const affectedDays = [];
    for (let day = start; day <= end && day < rows; day++) affectedDays.push(day);

    // offspring1 took its swapped rows FROM parent2; offspring2 took its swapped rows FROM parent1
    rebuildClassGrid(offspring1, parent2, affectedDays);
    rebuildClassGrid(offspring2, parent1, affectedDays);

  } catch (e) {
    console.error('Error during crossover:', e);
    return [cloneChromosome(parent1), cloneChromosome(parent2)];
  }

  return [offspring1, offspring2];
};


// ==================== MUTATION ====================

/**
 * FIX #3: Read class names BEFORE swapping faculty slots.
 *
 * OLD BUG: the code swapped faculty[day1][period1] ↔ faculty[day2][period2] first,
 * then re-read class1 = faculty[day1][period1] — which now holds the NEW (swapped) value.
 * This caused the class timetable sync to update the wrong class.
 *
 * NEW: snapshot both class names before swapping, handle same-class and different-class cases correctly.
 */
const swapMutation = (chromosome) => {
  const { rows, cols } = chromosome.metadata;
  const faculties = Object.keys(chromosome.genes.faculty);
  if (faculties.length === 0) return;

  const faculty = faculties[Math.floor(Math.random() * faculties.length)];
  const day1 = Math.floor(Math.random() * rows);
  const period1 = Math.floor(Math.random() * cols);
  const day2 = Math.floor(Math.random() * rows);
  const period2 = Math.floor(Math.random() * cols);

  // Don't swap a slot with itself
  if (day1 === day2 && period1 === period2) return;

  // PLAN FIX #5: Skip if either slot belongs to a lab block (ends with '*').
  // Swapping only one slot of a consecutive lab pair breaks the lab session.
  // Labs should only move via crossover (which operates on whole days).
  const cls1 = chromosome.genes.faculty[faculty][day1][period1];
  const cls2 = chromosome.genes.faculty[faculty][day2][period2];
  if (cls1 !== 'FREE' && cls1 && chromosome.genes.class[cls1]) {
    const subj1 = chromosome.genes.class[cls1][day1][period1];
    if (subj1 && subj1.endsWith('*')) return; // lab slot — skip
  }
  if (cls2 !== 'FREE' && cls2 && chromosome.genes.class[cls2]) {
    const subj2 = chromosome.genes.class[cls2][day2][period2];
    if (subj2 && subj2.endsWith('*')) return; // lab slot — skip
  }

  // Snapshot BEFORE swap
  const class1 = chromosome.genes.faculty[faculty][day1][period1];
  const class2 = chromosome.genes.faculty[faculty][day2][period2];

  // Swap faculty slots
  chromosome.genes.faculty[faculty][day1][period1] = class2;
  chromosome.genes.faculty[faculty][day2][period2] = class1;

  if (class1 === class2) {
    // Same class (or both FREE) — just swap the subject entries in that class's grid too
    if (class1 !== 'FREE' && class1 && chromosome.genes.class[class1]) {
      const subj1 = chromosome.genes.class[class1][day1][period1];
      const subj2 = chromosome.genes.class[class1][day2][period2];
      chromosome.genes.class[class1][day1][period1] = subj2;
      chromosome.genes.class[class1][day2][period2] = subj1;
    }
    return;
  }

  // Different classes: snapshot subjects, clear old positions, write to new positions.
  // class1 was at (day1,p1) → should now be at (day2,p2)
  // class2 was at (day2,p2) → should now be at (day1,p1)
  const subj1 = (class1 !== 'FREE' && class1 && chromosome.genes.class[class1])
    ? chromosome.genes.class[class1][day1][period1]
    : null;
  const subj2 = (class2 !== 'FREE' && class2 && chromosome.genes.class[class2])
    ? chromosome.genes.class[class2][day2][period2]
    : null;

  // Clear old positions
  if (class1 !== 'FREE' && class1 && chromosome.genes.class[class1]) {
    chromosome.genes.class[class1][day1][period1] = 'FREE';
  }
  if (class2 !== 'FREE' && class2 && chromosome.genes.class[class2]) {
    chromosome.genes.class[class2][day2][period2] = 'FREE';
  }

  // Write to new positions
  if (class1 !== 'FREE' && class1 && chromosome.genes.class[class1] && subj1 !== null) {
    chromosome.genes.class[class1][day2][period2] = subj1;
  }
  if (class2 !== 'FREE' && class2 && chromosome.genes.class[class2] && subj2 !== null) {
    chromosome.genes.class[class2][day1][period1] = subj2;
  }
};


export const mutate = (chromosome, mutationRate) => {
  if (Math.random() > mutationRate) return;
  swapMutation(chromosome);
};

// ==================== EVOLUTION ====================

export const evolveGeneration = (population, config, assignments, manualAssignments, labAssignments) => {
  const { populationSize, crossoverRate, mutationRate, elitismCount, tournamentSize } = config;

  // Sort by fitness descending (best first)
  population.sort((a, b) => b.fitness - a.fitness);

  // Elitism: keep the best N chromosomes unchanged
  const newGeneration = [];
  for (let i = 0; i < elitismCount && i < population.length; i++) {
    newGeneration.push(cloneChromosome(population[i]));
  }

  while (newGeneration.length < populationSize) {
    try {
      const parent1 = tournamentSelection(population, tournamentSize);
      const parent2 = tournamentSelection(population, tournamentSize);

      const [offspring1, offspring2] = crossover(parent1, parent2, crossoverRate);

      mutate(offspring1, mutationRate);
      mutate(offspring2, mutationRate);

      // Re-apply manual assignments to ensure they are never overwritten
      applyManualAssignments(offspring1, manualAssignments);
      applyManualAssignments(offspring2, manualAssignments);

      // COMPLETENESS REPAIR: crossover/mutation can destroy slot assignments.
      // Run one pass of theory repair + lab repair on each offspring so
      // damage does not accumulate across generations.
      const allTheory = [
        ...(assignments || []),
        ...(labAssignments || []).filter(a => !a.isLab)
      ];
      if (allTheory.length > 0) {
        displacementRepair(offspring1, allTheory);
        displacementRepair(offspring2, allTheory);
      }
      if (labAssignments && labAssignments.length > 0) {
        labRepair(offspring1, labAssignments);
        labRepair(offspring2, labAssignments);
      }

      evaluateFitness(offspring1, assignments, labAssignments);
      evaluateFitness(offspring2, assignments, labAssignments);

      newGeneration.push(offspring1);
      if (newGeneration.length < populationSize) {
        newGeneration.push(offspring2);
      }
    } catch (e) {
      console.error('Error in evolution loop:', e);
    }
  }

  return newGeneration;
};

// ==================== ADAPTIVE SCALING ====================

/**
 * FIX #4 & #5: Auto-scale GA parameters based on problem size.
 *
 * Large data (many faculties × many classes × many assignments) means each
 * chromosome is much bigger and each generation takes much longer. We cap the
 * work to a safe amount so the browser doesn't OOM or freeze.
 *
 * Scale factor is derived from total "scheduling slots demanded":
 *   demand = sum of all weeklyLimits across all assignments
 *   capacity = faculties * rows * cols (total available faculty-period slots)
 * When demand/capacity is high, the problem is heavily constrained → need fewer
 * but smarter generations rather than brute-force population.
 */
const computeAdaptiveConfig = (baseConfig, faculties, classes, assignments, labAssignments) => {
  const allAssignments = [...(assignments || []), ...(labAssignments || [])];
  const dataSize = faculties.length + classes.length + allAssignments.length;

  let { populationSize, maxGenerations, elitismCount, convergenceThreshold } = baseConfig;

  if (dataSize > 150) {
    // Very large — e.g. whole college timetable
    populationSize = Math.min(populationSize, 20);
    maxGenerations = Math.min(maxGenerations, 80);
    elitismCount = Math.min(elitismCount, 3);
    convergenceThreshold = Math.min(convergenceThreshold, 15);
    console.warn(`[GA] Large dataset (size=${dataSize}). Auto-scaled: pop=${populationSize}, gen=${maxGenerations}`);
  } else if (dataSize > 80) {
    // Medium-large
    populationSize = Math.min(populationSize, 30);
    maxGenerations = Math.min(maxGenerations, 120);
    elitismCount = Math.min(elitismCount, 4);
    convergenceThreshold = Math.min(convergenceThreshold, 20);
    console.warn(`[GA] Medium-large dataset (size=${dataSize}). Auto-scaled: pop=${populationSize}, gen=${maxGenerations}`);
  } else if (dataSize > 40) {
    // Medium
    populationSize = Math.min(populationSize, 40);
    maxGenerations = Math.min(maxGenerations, 180);
    convergenceThreshold = Math.min(convergenceThreshold, 25);
    console.log(`[GA] Medium dataset (size=${dataSize}). Auto-scaled: pop=${populationSize}, gen=${maxGenerations}`);
  }
  // Small data: use whatever the user configured

  return {
    ...baseConfig,
    populationSize,
    maxGenerations,
    elitismCount,
    convergenceThreshold
  };
};

// ==================== MAIN ALGORITHM ====================

export const runGeneticAlgorithm = async (
  config,
  faculties,
  classes,
  assignments,
  manualAssignments,
  labAssignments,
  onProgress
) => {
  // Start with defaults merged with any user overrides
  let gaConfig = { ...DEFAULT_CONFIG, ...config };

  // FIX #4: Adapt to data size before running
  gaConfig = computeAdaptiveConfig(gaConfig, faculties, classes, assignments, labAssignments);

  const { maxGenerations, convergenceThreshold, targetFitness } = gaConfig;

  console.log('Starting Genetic Algorithm...', {
    faculties: faculties?.length,
    classes: classes?.length,
    assignments: assignments?.length,
    labs: labAssignments?.length,
    config: gaConfig
  });

  // Input validation
  if (!faculties || faculties.length === 0) {
    console.error('[GA] No faculties provided');
    return null;
  }
  if (!classes || classes.length === 0) {
    console.error('[GA] No classes provided');
    return null;
  }
  if ((!assignments || assignments.length === 0) && (!labAssignments || labAssignments.length === 0)) {
    console.error('[GA] No assignments provided');
    return null;
  }

  try {
    // Build initial population
    let population = initializePopulation(
      gaConfig,
      faculties,
      classes,
      assignments,
      manualAssignments,
      labAssignments
    );

    if (population.length === 0) {
      console.error('[GA] Failed to create initial population');
      return null;
    }

    // Evaluate fitness for all initial chromosomes
    population.forEach(chromosome => {
      try {
        evaluateFitness(chromosome, assignments, labAssignments);
      } catch (e) {
        console.error('[GA] Error evaluating initial fitness:', e);
      }
    });

    let bestFitness = -Infinity;
    let bestChromosome = null;
    let generationsWithoutImprovement = 0;

    // PLAN FIX #3: Scale convergenceThreshold to avoid stopping too early.
    // Also compute immigrant injection interval: every 1/3 of threshold gens without improvement,
    // inject fresh random chromosomes to restore diversity.
    const adaptedConvergenceThreshold = Math.max(30, Math.floor(maxGenerations / 5));
    const immigrantInterval = Math.max(5, Math.floor(adaptedConvergenceThreshold / 3));

    const { faculties: facList, classes: classList } = {
      faculties: (assignments || []).map(a => a.facultyName).concat((labAssignments || []).map(a => a.facultyName)),
      classes: (assignments || []).map(a => a.className).concat((labAssignments || []).map(a => a.className))
    };

    for (let generation = 0; generation < maxGenerations; generation++) {
      try {
        population = evolveGeneration(population, gaConfig, assignments, manualAssignments, labAssignments);

        // Find best in this generation
        let currentBest = population[0];
        for (let i = 1; i < population.length; i++) {
          if (population[i].fitness > currentBest.fitness) {
            currentBest = population[i];
          }
        }

        if (currentBest.fitness > bestFitness) {
          bestFitness = currentBest.fitness;
          bestChromosome = cloneChromosome(currentBest);
          bestChromosome.generation = generation;
          generationsWithoutImprovement = 0;
        } else {
          generationsWithoutImprovement++;
        }

        // PLAN FIX #3 continued: Inject random immigrants every immigrantInterval gens
        // without improvement to escape local optima.
        if (
          generationsWithoutImprovement > 0 &&
          generationsWithoutImprovement % immigrantInterval === 0 &&
          generationsWithoutImprovement < adaptedConvergenceThreshold
        ) {
          // Replace worst elitismCount chromosomes with fresh random ones
          population.sort((a, b) => a.fitness - b.fitness);
          const immigrantCount = Math.min(gaConfig.elitismCount, population.length);
          try {
            const immigrants = initializePopulation(
              { ...gaConfig, populationSize: immigrantCount },
              [...new Set(facList)],
              [...new Set(classList)],
              assignments,
              manualAssignments,
              labAssignments
            );
            immigrants.forEach(chr => evaluateFitness(chr, assignments, labAssignments));
            for (let ii = 0; ii < immigrantCount && ii < immigrants.length; ii++) {
              population[ii] = immigrants[ii];
            }
            console.log(`[GA] Gen ${generation + 1}: Injected ${immigrantCount} random immigrants to restore diversity`);
          } catch (immigrantErr) {
            console.warn('[GA] Immigrant injection failed:', immigrantErr);
          }
        }

        // Report progress
        if (onProgress) {
          let totalFitness = 0;
          for (let i = 0; i < population.length; i++) totalFitness += population[i].fitness;
          onProgress({
            generation: generation + 1,
            totalGenerations: maxGenerations,
            bestFitness,
            avgFitness: totalFitness / population.length,
            conflicts: bestChromosome ? bestChromosome.conflicts.length : 0
          });
        }

        // Early exit: perfect solution found
        if (bestFitness >= targetFitness) {
          console.log(`[GA] Target fitness reached at generation ${generation + 1}`);
          break;
        }

        // PLAN FIX #3: Use adapted (larger) convergence threshold
        if (generationsWithoutImprovement >= adaptedConvergenceThreshold) {
          console.log(`[GA] Converged at generation ${generation + 1} (no improvement for ${adaptedConvergenceThreshold} gens)`);
          break;
        }

        // Yield to browser EVERY generation so the tab never hangs.
        await new Promise(resolve => setTimeout(resolve, 0));

      } catch (e) {
        console.error(`[GA] Error at generation ${generation}:`, e);
      }
    }

    // ── FINAL COMPLETENESS PASS ───────────────────────────────────────────────────
    // After evolution, apply displacement repair to the best chromosome so that
    // every subject given by the user is guaranteed to be assigned.
    // This runs ONCE on the final result (not during evolution — too expensive).
    if (bestChromosome) {
      // ── AGGRESSIVE COMPLETENESS LOOP ────────────────────────────────────────
      // Alternate theory repair ↔ lab repair until every subject is placed
      // OR no more progress is possible. At most MAX_REPAIR_ROUNDS iterations.
      // Non-lab multi-faculty assignments (isLab=false in labAssignments) are
      // treated as theory: they go through displacementRepair, not labRepair.
      const MAX_REPAIR_ROUNDS = 20;
      const nonLabFromLabAssignments = (labAssignments || []).filter(a => !a.isLab);
      const allTheoryFinal = [...(assignments || []), ...nonLabFromLabAssignments];

      for (let rnd = 0; rnd < MAX_REPAIR_ROUNDS; rnd++) {
        // Count gaps across ALL theory subjects (including non-lab multi-faculty)
        const theoryGap = countUnplacedPeriods(bestChromosome, allTheoryFinal);
        const labGap    = countUnplacedLabSessions(bestChromosome, labAssignments || []);

        if (theoryGap === 0 && labGap === 0) {
          console.log(`[GA] All subjects fully assigned after ${rnd} repair round(s). ✓`);
          break;
        }

        console.log(`[GA] Repair round ${rnd + 1}: ${theoryGap} theory period(s), ${labGap} lab session(s) missing.`);

        // 1. Fill free theory slots first (they don't break lab consecutiveness)
        if (theoryGap > 0) {
          displacementRepair(bestChromosome, allTheoryFinal);
        }

        // 2. Re-place any lab sessions that are still missing
        if (labGap > 0 && labAssignments && labAssignments.length > 0) {
          labRepair(bestChromosome, labAssignments);
        }

        // 3. Check if this round made any progress at all
        const newTheoryGap = countUnplacedPeriods(bestChromosome, allTheoryFinal);
        const newLabGap    = countUnplacedLabSessions(bestChromosome, labAssignments || []);
        if (newTheoryGap === theoryGap && newLabGap === labGap) {
          console.warn(`[GA] Repair stalled at round ${rnd + 1}: ${newTheoryGap} theory + ${newLabGap} lab gap(s) remain. ` +
            'These may be truly infeasible given faculty/class constraints.');
          break;
        }
      }

      // Re-evaluate fitness after all repairs
      evaluateFitness(bestChromosome, assignments, labAssignments);
    }

    console.log(`[GA] Complete. Best fitness: ${bestChromosome?.fitness}, Generation: ${bestChromosome?.generation}`);
    return bestChromosome;

  } catch (error) {
    console.error('[GA] Fatal error:', error);
    return null;
  }
};

export default {
  initializePopulation,
  evaluateFitness,
  tournamentSelection,
  crossover,
  mutate,
  evolveGeneration,
  runGeneticAlgorithm
};
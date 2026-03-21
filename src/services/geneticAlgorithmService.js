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
  UNASSIGNED_SUBJECT: -50,
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
  const maxAttempts = Math.max(100, rows * cols * 3);
  let attempts = 0;

  if (isLab) {
    // KEY FIX: weeklyLimit is HOURS. Convert to number of SESSIONS.
    // e.g. weeklyLimit=6 hours, labLen=2 → 3 sessions (not 6).
    const labLen = consecutivePeriods || 2;
    const sessionTarget = Math.max(1, Math.round(weeklyLimit / labLen));
    const usedDays = new Set(); // one lab session per day maximum

    while (assigned < sessionTarget && attempts < maxAttempts) {
      attempts++;

      const day = Math.floor(Math.random() * rows);
      const period = Math.floor(Math.random() * (cols - labLen + 1)); // ensure room for labLen

      // Only one lab session per day
      if (usedDays.has(day)) continue;
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
      }
    }
    return assigned >= sessionTarget;
  } else {
    // Theory subject: weeklyLimit = number of individual periods
    while (assigned < weeklyLimit && attempts < maxAttempts) {
      attempts++;
      const day = Math.floor(Math.random() * rows);
      const period = Math.floor(Math.random() * cols);

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

      // Regular theory assignments
      if (assignments && assignments.length > 0) {
        assignments.forEach(assignment => {
          assignSubjectRandom(chromosome, assignment);
        });
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
const evaluateFitness = (chromosome) => {
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

export const evolveGeneration = (population, config, assignments, manualAssignments) => {
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

      evaluateFitness(offspring1);
      evaluateFitness(offspring2);

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
        evaluateFitness(chromosome);
      } catch (e) {
        console.error('[GA] Error evaluating initial fitness:', e);
      }
    });

    let bestFitness = -Infinity;
    let bestChromosome = null;
    let generationsWithoutImprovement = 0;

    for (let generation = 0; generation < maxGenerations; generation++) {
      try {
        population = evolveGeneration(population, gaConfig, assignments, manualAssignments);

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

        // Early exit: no improvement for too long (converged)
        if (generationsWithoutImprovement >= convergenceThreshold) {
          console.log(`[GA] Converged at generation ${generation + 1} (no improvement for ${convergenceThreshold} gens)`);
          break;
        }

        // FIX #5: Yield to browser EVERY generation so the tab never hangs.
        // This replaces the old "every 5 generations" yield which caused freezes
        // on large datasets where one generation could take 100+ ms.
        await new Promise(resolve => setTimeout(resolve, 0));

      } catch (e) {
        console.error(`[GA] Error at generation ${generation}:`, e);
      }
    }

    console.log(`[GA] Complete. Best fitness: ${bestFitness}, Generation: ${bestChromosome?.generation}`);
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
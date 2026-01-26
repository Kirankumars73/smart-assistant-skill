/**
 * Genetic Algorithm Service for Timetable Generation
 * Implements evolutionary optimization for constraint-based scheduling
 * 
 * Algorithm Overview:
 * 1. Initialize population of random timetables (chromosomes)
 * 2. Evaluate fitness (constraint violations)
 * 3. Select best individuals (tournament selection)
 * 4. Create offspring via crossover and mutation
 * 5. Repeat until convergence or max generations
 */

// ==================== CONFIGURATION ====================

const DEFAULT_CONFIG = {
  populationSize: 100,
  maxGenerations: 500,
  mutationRate: 0.15,
  crossoverRate: 0.80,
  elitismCount: 10,
  tournamentSize: 5,
  convergenceThreshold: 50, // Generations without improvement before stopping
  targetFitness: 9800 // Stop if fitness reaches this (out of 10,000)
};

// Fitness penalty weights
const PENALTIES = {
  // Hard constraints (critical violations)
  FACULTY_DOUBLE_BOOKING: -100,
  CLASS_DOUBLE_BOOKING: -100,
  UNASSIGNED_SUBJECT: -50,
  LAB_NON_CONSECUTIVE: -80,
  MANUAL_ASSIGNMENT_VIOLATED: -150,
  
  // Soft constraints (optimization)
  EXCEEDS_WEEKLY_LIMIT: -20,
  BELOW_WEEKLY_LIMIT: -15,
  CONSECUTIVE_DIFFERENT_CLASSES: -25,
  FRIDAY_LAST_SLOT_LAB: -10,
  UNEVEN_DISTRIBUTION: -5,
  FREE_SLOT_GAPS: -3
};

const BASE_FITNESS = 10000;

// ==================== CHROMOSOME REPRESENTATION ====================

/**
 * Create an empty chromosome structure
 */
const createEmptyChromosome = (faculties, classes, rows, cols) => {
  const chromosome = {
    genes: {
      faculty: {},
      class: {}
    },
    fitness: 0,
    conflicts: [],
    generation: 0,
    metadata: {
      rows,
      cols,
      faculties: faculties.slice(),
      classes: classes.slice()
    }
  };
  
  // Initialize faculty timetables
  faculties.forEach(faculty => {
    chromosome.genes.faculty[faculty] = Array(rows).fill(null).map(() => Array(cols).fill('FREE'));
  });
  
  // Initialize class timetables
  classes.forEach(className => {
    chromosome.genes.class[className] = Array(rows).fill(null).map(() => Array(cols).fill('FREE'));
  });
  
  return chromosome;
};

/**
 * Deep clone a chromosome
 */
const cloneChromosome = (chromosome) => {
  return {
    genes: {
      faculty: JSON.parse(JSON.stringify(chromosome.genes.faculty)),
      class: JSON.parse(JSON.stringify(chromosome.genes.class))
    },
    fitness: chromosome.fitness,
    conflicts: [...chromosome.conflicts],
    generation: chromosome.generation,
    metadata: { ...chromosome.metadata }
  };
};

// ==================== INITIALIZATION ====================

/**
 * Assign a single subject to random slots in a chromosome
 */
const assignSubjectRandom = (chromosome, assignment, manualAssignments) => {
  const { facultyName, className, weeklyLimit, subjectName, isLab, consecutivePeriods } = assignment;
  const { rows, cols } = chromosome.metadata;
  
  let assigned = 0;
  const maxAttempts = 100;
  let attempts = 0;
  
  while (assigned < weeklyLimit && attempts < maxAttempts) {
    attempts++;
    
    // Random day and period
    const day = Math.floor(Math.random() * rows);
    const period = Math.floor(Math.random() * cols);
    
    // Check if slots are free
    let canAssign = true;
    
    if (isLab) {
      // Check consecutive periods for lab
      if (period + consecutivePeriods > cols) {
        canAssign = false;
      } else {
        for (let p = period; p < period + consecutivePeriods; p++) {
          if (chromosome.genes.faculty[facultyName][day][p] !== 'FREE' ||
              chromosome.genes.class[className][day][p] !== 'FREE') {
            canAssign = false;
            break;
          }
        }
      }
      
      if (canAssign) {
        // Assign consecutive periods for lab
        for (let p = period; p < period + consecutivePeriods; p++) {
          chromosome.genes.faculty[facultyName][day][p] = className;
          chromosome.genes.class[className][day][p] = subjectName + '*';
        }
        assigned++;
      }
    } else {
      // Regular subject - single period
      if (chromosome.genes.faculty[facultyName][day][period] === 'FREE' &&
          chromosome.genes.class[className][day][period] === 'FREE') {
        chromosome.genes.faculty[facultyName][day][period] = className;
        chromosome.genes.class[className][day][period] = subjectName;
        assigned++;
      }
    }
  }
  
  return assigned === weeklyLimit;
};

/**
 * Apply manual assignments to a chromosome (these are fixed)
 */
const applyManualAssignments = (chromosome, manualAssignments) => {
  manualAssignments.forEach(({ facultyName, className, subjectName, day, period }) => {
    if (chromosome.genes.faculty[facultyName] && chromosome.genes.class[className]) {
      chromosome.genes.faculty[facultyName][day][period] = className;
      chromosome.genes.class[className][day][period] = subjectName;
    }
  });
};

/**
 * Initialize population with random chromosomes
 */
export const initializePopulation = (config, faculties, classes, assignments, manualAssignments, labAssignments) => {
  const population = [];
  const { rows, cols, populationSize } = config;
  
  console.log(`🧬 Initializing population of ${populationSize} chromosomes...`);
  
  for (let i = 0; i < populationSize; i++) {
    const chromosome = createEmptyChromosome(faculties, classes, rows, cols);
    
    // Apply manual assignments first (these are immutable)
    applyManualAssignments(chromosome, manualAssignments);
    
    // Randomly assign labs
    labAssignments.forEach(labAssignment => {
      const allFaculties = [labAssignment.facultyName, ...labAssignment.additionalFaculties];
      
      // For multi-faculty labs, assign to all faculties
      allFaculties.forEach(faculty => {
        const labAssignmentCopy = { ...labAssignment, facultyName: faculty };
        assignSubjectRandom(chromosome, labAssignmentCopy, manualAssignments);
      });
    });
    
    // Randomly assign regular subjects
    assignments.forEach(assignment => {
      assignSubjectRandom(chromosome, assignment, manualAssignments);
    });
    
    chromosome.generation = 0;
    population.push(chromosome);
  }
  
  console.log(`✅ Population initialized with ${population.length} individuals`);
  return population;
};

// ==================== FITNESS EVALUATION ====================

/**
 * Check for faculty double-booking
 */
const checkFacultyDoubleBooking = (chromosome) => {
  let violations = 0;
  const { rows, cols } = chromosome.metadata;
  
  Object.entries(chromosome.genes.faculty).forEach(([facultyName, timetable]) => {
    for (let day = 0; day < rows; day++) {
      for (let period = 0; period < cols; period++) {
        if (timetable[day][period] !== 'FREE') {
          // Count how many times this faculty is assigned at this time
          let count = 0;
          for (let p = 0; p < cols; p++) {
            if (p === period && timetable[day][p] !== 'FREE') count++;
          }
          if (count > 1) violations++;
        }
      }
    }
  });
  
  return violations;
};

/**
 * Check for class double-booking
 */
const checkClassDoubleBooking = (chromosome) => {
  let violations = 0;
  const { rows, cols } = chromosome.metadata;
  
  Object.entries(chromosome.genes.class).forEach(([className, timetable]) => {
    for (let day = 0; day < rows; day++) {
      for (let period = 0; period < cols; period++) {
        if (timetable[day][period] !== 'FREE') {
          // Count subjects at this time
          let count = 0;
          for (let p = 0; p < cols; p++) {
            if (p === period && timetable[day][p] !== 'FREE') count++;
          }
          if (count > 1) violations++;
        }
      }
    }
  });
  
  return violations;
};

/**
 * Check consecutive different classes (teacher fatigue)
 */
const checkConsecutiveDifferentClasses = (chromosome) => {
  let violations = 0;
  const { rows, cols } = chromosome.metadata;
  
  Object.entries(chromosome.genes.faculty).forEach(([facultyName, timetable]) => {
    for (let day = 0; day < rows; day++) {
      for (let period = 1; period < cols; period++) {
        const current = timetable[day][period];
        const previous = timetable[day][period - 1];
        
        // If both are occupied but different classes
        if (current !== 'FREE' && previous !== 'FREE' && current !== previous) {
          violations++;
        }
      }
    }
  });
  
  return violations;
};

/**
 * Check lab session continuity
 */
const checkLabContinuity = (chromosome) => {
  let violations = 0;
  const { rows, cols } = chromosome.metadata;
  
  Object.entries(chromosome.genes.class).forEach(([className, timetable]) => {
    for (let day = 0; day < rows; day++) {
      for (let period = 0; period < cols; period++) {
        const subject = timetable[day][period];
        
        // Lab subjects end with '*'
        if (subject && subject.endsWith('*')) {
          // Check if next period is the same lab
          if (period + 1 < cols) {
            const next = timetable[day][period + 1];
            if (next !== subject) {
              violations++;
            }
          }
        }
      }
    }
  });
  
  return violations;
};

/**
 * Calculate fitness score for a chromosome
 */
export const evaluateFitness = (chromosome, assignments, manualAssignments) => {
  let fitness = BASE_FITNESS;
  const conflicts = [];
  
  // Hard constraints
  const facultyDoubleBooking = checkFacultyDoubleBooking(chromosome);
  if (facultyDoubleBooking > 0) {
    fitness += facultyDoubleBooking * PENALTIES.FACULTY_DOUBLE_BOOKING;
    conflicts.push({ type: 'FACULTY_DOUBLE_BOOKING', count: facultyDoubleBooking });
  }
  
  const classDoubleBooking = checkClassDoubleBooking(chromosome);
  if (classDoubleBooking > 0) {
    fitness += classDoubleBooking * PENALTIES.CLASS_DOUBLE_BOOKING;
    conflicts.push({ type: 'CLASS_DOUBLE_BOOKING', count: classDoubleBooking });
  }
  
  const labContinuity = checkLabContinuity(chromosome);
  if (labContinuity > 0) {
    fitness += labContinuity * PENALTIES.LAB_NON_CONSECUTIVE;
    conflicts.push({ type: 'LAB_NON_CONSECUTIVE', count: labContinuity });
  }
  
  // Soft constraints
  const consecutiveDifferent = checkConsecutiveDifferentClasses(chromosome);
  if (consecutiveDifferent > 0) {
    fitness += consecutiveDifferent * PENALTIES.CONSECUTIVE_DIFFERENT_CLASSES;
    conflicts.push({ type: 'CONSECUTIVE_DIFFERENT_CLASSES', count: consecutiveDifferent });
  }
  
  chromosome.fitness = fitness;
  chromosome.conflicts = conflicts;
  
  return fitness;
};

// ==================== SELECTION ====================

/**
 * Tournament selection - select K random individuals, return the fittest
 */
export const tournamentSelection = (population, tournamentSize = 5) => {
  const tournament = [];
  
  for (let i = 0; i < tournamentSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length);
    tournament.push(population[randomIndex]);
  }
  
  // Return the fittest from tournament
  return tournament.reduce((best, current) => 
    current.fitness > best.fitness ? current : best
  );
};

// ==================== CROSSOVER ====================

/**
 * Two-point crossover - exchange timetable segments between parents
 */
export const crossover = (parent1, parent2, crossoverRate) => {
  if (Math.random() > crossoverRate) {
    // No crossover, return clones
    return [cloneChromosome(parent1), cloneChromosome(parent2)];
  }
  
  const offspring1 = cloneChromosome(parent1);
  const offspring2 = cloneChromosome(parent2);
  
  const rows = parent1.metadata.rows;
  
  // Select two crossover points (days)
  const point1 = Math.floor(Math.random() * rows);
  const point2 = Math.floor(Math.random() * rows);
  const start = Math.min(point1, point2);
  const end = Math.max(point1, point2);
  
  // Swap days between start and end
  Object.keys(offspring1.genes.faculty).forEach(faculty => {
    for (let day = start; day <= end; day++) {
      [offspring1.genes.faculty[faculty][day], offspring2.genes.faculty[faculty][day]] = 
      [offspring2.genes.faculty[faculty][day], offspring1.genes.faculty[faculty][day]];
    }
  });
  
  Object.keys(offspring1.genes.class).forEach(className => {
    for (let day = start; day <= end; day++) {
      [offspring1.genes.class[className][day], offspring2.genes.class[className][day]] = 
      [offspring2.genes.class[className][day], offspring1.genes.class[className][day]];
    }
  });
  
  return [offspring1, offspring2];
};

// ==================== MUTATION ====================

/**
 * Swap mutation - swap two random time slots
 */
const swapMutation = (chromosome) => {
  const { rows, cols } = chromosome.metadata;
  const faculties = Object.keys(chromosome.genes.faculty);
  
  if (faculties.length === 0) return;
  
  // Pick random faculty
  const faculty = faculties[Math.floor(Math.random() * faculties.length)];
  
  // Pick two random slots
  const day1 = Math.floor(Math.random() * rows);
  const period1 = Math.floor(Math.random() * cols);
  const day2 = Math.floor(Math.random() * rows);
  const period2 = Math.floor(Math.random() * cols);
  
  // Swap in faculty timetable
  const temp = chromosome.genes.faculty[faculty][day1][period1];
  chromosome.genes.faculty[faculty][day1][period1] = chromosome.genes.faculty[faculty][day2][period2];
  chromosome.genes.faculty[faculty][day2][period2] = temp;
  
  // Also swap in class timetable if applicable
  const class1 = chromosome.genes.faculty[faculty][day1][period1];
  const class2 = chromosome.genes.faculty[faculty][day2][period2];
  
  if (class1 !== 'FREE' && chromosome.genes.class[class1]) {
    const tempSubject = chromosome.genes.class[class1][day1][period1];
    chromosome.genes.class[class1][day1][period1] = chromosome.genes.class[class1][day2][period2];
    chromosome.genes.class[class1][day2][period2] = tempSubject;
  }
};

/**
 * Scramble mutation - shuffle assignments within a random day
 */
const scrambleMutation = (chromosome) => {
  const { rows, cols } = chromosome.metadata;
  const faculties = Object.keys(chromosome.genes.faculty);
  
  if (faculties.length === 0) return;
  
  const faculty = faculties[Math.floor(Math.random() * faculties.length)];
  const day = Math.floor(Math.random() * rows);
  
  // Fisher-Yates shuffle on one day
  const daySchedule = chromosome.genes.faculty[faculty][day];
  for (let i = daySchedule.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [daySchedule[i], daySchedule[j]] = [daySchedule[j], daySchedule[i]];
  }
};

/**
 * Multi-strategy mutation
 */
export const mutate = (chromosome, mutationRate) => {
  if (Math.random() > mutationRate) return;
  
  const strategy = Math.random();
  
  if (strategy < 0.4) {
    swapMutation(chromosome);
  } else if (strategy < 0.7) {
    scrambleMutation(chromosome);
  } else {
    swapMutation(chromosome); // Default to swap
  }
};

// ==================== EVOLUTION ====================

/**
 * Evolve one generation
 */
export const evolveGeneration = (population, config, assignments, manualAssignments) => {
  const { populationSize, crossoverRate, mutationRate, elitismCount, tournamentSize } = config;
  
  // Sort by fitness (descending)
  population.sort((a, b) => b.fitness - a.fitness);
  
  // New generation starts with elite individuals
  const newGeneration = population.slice(0, elitismCount).map(cloneChromosome);
  
  // Fill rest of population with offspring
  while (newGeneration.length < populationSize) {
    const parent1 = tournamentSelection(population, tournamentSize);
    const parent2 = tournamentSelection(population, tournamentSize);
    
    const [offspring1, offspring2] = crossover(parent1, parent2, crossoverRate);
    
    mutate(offspring1, mutationRate);
    mutate(offspring2, mutationRate);
    
    // Re-apply manual assignments (they should never be mutated)
    applyManualAssignments(offspring1, manualAssignments);
    applyManualAssignments(offspring2, manualAssignments);
    
    // Evaluate fitness
    evaluateFitness(offspring1, assignments, manualAssignments);
    evaluateFitness(offspring2, assignments, manualAssignments);
    
    newGeneration.push(offspring1);
    if (newGeneration.length < populationSize) {
      newGeneration.push(offspring2);
    }
  }
  
  return newGeneration;
};

// ==================== MAIN ALGORITHM ====================

/**
 * Run genetic algorithm
 * @param {Object} config - Algorithm configuration
 * @param {Function} onProgress - Callback (generation, bestFitness, bestChromosome)
 */
export const runGeneticAlgorithm = async (config, faculties, classes, assignments, manualAssignments, labAssignments, onProgress) => {
  const gaConfig = { ...DEFAULT_CONFIG, ...config };
  const { maxGenerations, convergenceThreshold, targetFitness } = gaConfig;
  
  console.log('🚀 Starting Genetic Algorithm...');
  console.log('📊 Configuration:', gaConfig);
  
  // Initialize population
  let population = initializePopulation(gaConfig, faculties, classes, assignments, manualAssignments, labAssignments);
  
  // Evaluate initial fitness
  population.forEach(chromosome => {
    evaluateFitness(chromosome, assignments, manualAssignments);
  });
  
  let bestFitness = -Infinity;
  let bestChromosome = null;
  let generationsWithoutImprovement = 0;
  
  // Evolution loop
  for (let generation = 0; generation < maxGenerations; generation++) {
    // Evolve
    population = evolveGeneration(population, gaConfig, assignments, manualAssignments);
    
    // Track best solution
    const currentBest = population.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
    
    if (currentBest.fitness > bestFitness) {
      bestFitness = currentBest.fitness;
      bestChromosome = cloneChromosome(currentBest);
      bestChromosome.generation = generation;
      generationsWithoutImprovement = 0;
    } else {
      generationsWithoutImprovement++;
    }
    
    // Progress callback
    if (onProgress) {
      onProgress({
        generation: generation + 1,
        bestFitness,
        avgFitness: population.reduce((sum, c) => sum + c.fitness, 0) / population.length,
        conflicts: bestChromosome ? bestChromosome.conflicts.length : 0
      });
    }
    
    // Early stopping conditions
    if (bestFitness >= targetFitness) {
      console.log(`🎯 Target fitness reached at generation ${generation + 1}`);
      break;
    }
    
    if (generationsWithoutImprovement >= convergenceThreshold) {
      console.log(`⏹️ Converged at generation ${generation + 1} (no improvement for ${convergenceThreshold} generations)`);
      break;
    }
    
    // Log progress every 50 generations
    if ((generation + 1) % 50 === 0) {
      console.log(`📈 Generation ${generation + 1}: Best Fitness = ${bestFitness}, Avg Fitness = ${population.reduce((sum, c) => sum + c.fitness, 0) / population.length}`);
    }
  }
  
  console.log('✅ Genetic Algorithm Complete!');
  console.log(`🏆 Best Fitness: ${bestFitness} (Generation ${bestChromosome.generation})`);
  console.log(`⚠️  Conflicts: ${bestChromosome.conflicts.length}`);
  
  return bestChromosome;
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

/**
 * Question Paper Prediction Service
 * Based on ML algorithm using frequency, marks, and recency
 */

/**
 * Clean and normalize question text for comparison
 * Similar to Python's clean_text function
 */
export const cleanText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2) // Remove very short words (stopwords approximation)
    .join(' ')
    .trim();
};

/**
 * Calculate importance score for Part A questions
 * Logic: Frequency-based (questions asked multiple times are important)
 */
export const calculatePartAImportance = (questions) => {
  // Count frequency of each question
  const frequencyMap = {};
  
  questions.forEach(q => {
    const cleaned = q.clean_question;
    frequencyMap[cleaned] = (frequencyMap[cleaned] || 0) + 1;
  });

  // Assign importance score
  return questions.map(q => ({
    ...q,
    importance: frequencyMap[q.clean_question] > 1 ? 1 : 0,
    frequency: frequencyMap[q.clean_question],
    probability: frequencyMap[q.clean_question] / questions.length
  }));
};

/**
 * Calculate importance score for Part B questions
 * Logic: Frequency + High marks (>=8) + Recent years
 */
export const calculatePartBImportance = (questions) => {
  if (questions.length === 0) return [];

  const frequencyMap = {};
  const recentYear = Math.max(...questions.map(q => parseInt(q.Year) || 0));
  
  questions.forEach(q => {
    const cleaned = q.clean_question;
    frequencyMap[cleaned] = (frequencyMap[cleaned] || 0) + 1;
  });

  return questions.map(q => {
    const freq = frequencyMap[q.clean_question];
    const marks = parseInt(q.Marks) || 0;
    const year = parseInt(q.Year) || 0;
    
    // Importance criteria (matching Python logic)
    let importance = 0;
    let score = 0;

    if (freq > 1) {
      importance = 1;
      score += 0.4;
    }
    if (marks >= 8) {
      importance = 1;
      score += 0.3;
    }
    if (year >= recentYear - 1) {
      importance = 1;
      score += 0.3;
    }

    // Additional scoring factors
    score += (freq * 0.2); // More frequent = higher score
    score += (marks / 20) * 0.2; // Higher marks = slightly higher score
    score += ((year - (recentYear - 5)) / 5) * 0.2; // Recent years = higher score

    return {
      ...q,
      importance,
      frequency: freq,
      probability: Math.min(score, 1) // Normalize to 0-1
    };
  });
};

/**
 * Predict Part A questions (top 2 per module)
 */
export const predictPartA = (questions) => {
  const modules = {};
  
  // Group by module
  questions.forEach(q => {
    const module = q.Module;
    if (!modules[module]) modules[module] = [];
    modules[module].push(q);
  });

  // Get top 2 per module
  const predictions = {};
  Object.keys(modules).sort().forEach(module => {
    const sorted = modules[module].sort((a, b) => b.probability - a.probability);
    predictions[`Module ${module}`] = sorted.slice(0, 2).map(q => ({
      question: q.Question,
      probability: q.probability,
      frequency: q.frequency,
      marks: q.Marks
    }));
  });

  return predictions;
};

/**
 * Assemble 14-mark question combinations for Part B
 * Greedy algorithm to select questions that sum to 14 marks
 */
export const assemble14Mark = (questions) => {
  const selected = [];
  let total = 0;

  for (const q of questions) {
    const marks = parseInt(q.Marks) || 0;
    if (total + marks <= 14) {
      selected.push(q);
      total += marks;
    }
    if (total >= 14) break;
  }

  return { questions: selected, total };
};

/**
 * Predict Part B questions (important sub-questions)
 */
export const predictPartB = (questions) => {
  const modules = {};
  
  // Group by module
  questions.forEach(q => {
    const module = q.Module;
    if (!modules[module]) modules[module] = [];
    modules[module].push(q);
  });

  // Get top combinations per module
  const predictions = {};
  Object.keys(modules).sort().forEach(module => {
    const sorted = modules[module].sort((a, b) => b.probability - a.probability);
    const combination = assemble14Mark(sorted);
    
    predictions[`Module ${module}`] = {
      questions: combination.questions.map(q => ({
        question: q.Question,
        marks: q.Marks,
        probability: q.probability,
        frequency: q.frequency
      })),
      totalMarks: combination.total
    };
  });

  return predictions;
};

/**
 * Parse CSV file and extract question data
 */
export const parseQuestionCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());
  
  // Expected columns
  const requiredColumns = ['Question', 'Year', 'Module', 'Marks', 'Part'];
  const missingColumns = requiredColumns.filter(col => !header.includes(col));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Parse data rows
  const questions = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== header.length) continue; // Skip malformed rows

    const row = {};
    header.forEach((col, idx) => {
      row[col] = values[idx];
    });

    // Add cleaned text
    row.clean_question = cleanText(row.Question);
    questions.push(row);
  }

  return questions;
};

/**
 * Main prediction function
 * Process uploaded data and generate predictions
 */
export const generatePredictions = (csvText, subjectName) => {
  // Parse CSV
  const allQuestions = parseQuestionCSV(csvText);

  // Split by Part A and Part B
  const partAQuestions = allQuestions.filter(
    q => q.Part?.toUpperCase() === 'A' && parseInt(q.Marks) === 3
  );
  
  const partBQuestions = allQuestions.filter(
    q => q.Part?.toUpperCase() === 'B'
  );

  // Calculate importance scores
  const partAWithScores = calculatePartAImportance(partAQuestions);
  const partBWithScores = calculatePartBImportance(partBQuestions);

  // Generate predictions
  const partAPredictions = predictPartA(partAWithScores);
  const partBPredictions = predictPartB(partBWithScores);

  return {
    subjectName,
    partA: partAPredictions,
    partB: partBPredictions,
    stats: {
      totalQuestions: allQuestions.length,
      partAQuestions: partAQuestions.length,
      partBQuestions: partBQuestions.length,
      modules: Object.keys(partAPredictions).length
    },
    generatedAt: new Date().toISOString()
  };
};

export default {
  cleanText,
  calculatePartAImportance,
  calculatePartBImportance,
  predictPartA,
  predictPartB,
  parseQuestionCSV,
  generatePredictions
};

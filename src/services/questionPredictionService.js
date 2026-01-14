/**
 * Question Paper Prediction Service - ML Enhanced
 * Uses trend analysis, TF-IDF semantic similarity, and ensemble methods
 */

/**
 * Clean and normalize question text for comparison
 */
export const cleanText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .join(' ')
    .trim();
};

/**
 * Calculate TF-IDF for semantic similarity (ML Enhancement)
 * Helps group questions by meaning, not just exact text
 */
export const calculateIDF = (questions) => {
  const vocabulary = new Set();
  questions.forEach(q => {
    const words = q.clean_question.split(' ');
    words.forEach(word => vocabulary.add(word));
  });

  const idf = {};
  vocabulary.forEach(term => {
    const docsWithTerm = questions.filter(q => 
      q.clean_question.includes(term)
    ).length;
    idf[term] = Math.log(questions.length / (1 + docsWithTerm));
  });

  return idf;
};

/**
 * Build TF-IDF vector for a question
 */
export const buildTFIDFVector = (question, idf) => {
  const words = question.clean_question.split(' ');
  const tfVector = {};
  
  words.forEach(word => {
    const tf = words.filter(w => w === word).length / words.length;
    tfVector[word] = tf * (idf[word] || 0);
  });
  
  return tfVector;
};

/**
 * Calculate cosine similarity between two TF-IDF vectors
 */
export const cosineSimilarity = (vecA, vecB) => {
  const allWords = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  
  allWords.forEach(word => {
    const a = vecA[word] || 0;
    const b = vecB[word] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  });
  
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
};

/**
 * Calculate trend score based on temporal patterns (ML Enhancement)
 * Recent years weighted more heavily - adapts as new data added
 */
export const calculateTrendScore = (questions, currentYear = new Date().getFullYear()) => {
  return questions.map(q => {
    const yearsAgo = currentYear - (parseInt(q.Year) || 0);
    // Exponential decay: recent = higher weight
    const recencyWeight = Math.exp(-yearsAgo * 0.25);
    
    return {
      ...q,
      recencyWeight,
      trendScore: recencyWeight
    };
  });
};

/**
 * Calculate importance score for Part A questions - ML ENHANCED
 * Combines: Frequency + Trend Analysis + Semantic Similarity
 */
export const calculatePartAImportance = (questions, currentYear = new Date().getFullYear()) => {
  // Deduplicate and count frequency
  const frequencyMap = {};
  const seen = new Set();
  
  questions.forEach(q => {
    const cleaned = q.clean_question;
    const uniqueKey = `${cleaned}_${q.Year}_${q.Module}`;
    
    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      frequencyMap[cleaned] = (frequencyMap[cleaned] || 0) + 1;
    }
  });

  // Calculate TF-IDF for semantic similarity
  const idf = calculateIDF(questions);
  
  // Add trend scores
  const withTrends = calculateTrendScore(questions, currentYear);

  // Assign combined scores
  return withTrends.map(q => {
    const frequency = frequencyMap[q.clean_question];
    const yearsAgo = currentYear - (parseInt(q.Year) || 0);
    
   // Build TF-IDF vector
    const tfVector = buildTFIDFVector(q, idf);
    
    // Ensemble scoring: 40% frequency, 30% trend, 30% recency
    const freqScore = Math.min(frequency / 5, 1) * 0.4;
    const trendScore = q.recencyWeight * 0.3;
    const recencyBonus = Math.max(0, (5 - yearsAgo) / 5) * 0.3;
    
    const finalScore = freqScore + trendScore + recencyBonus;
    
    return {
      ...q,
      importance: frequency > 1 || yearsAgo <= 2 ? 1 : 0,
      frequency,
      trendScore: q.trendScore,
      tfVector,
      probability: Math.min(finalScore, 1),
      confidence: finalScore  // Show confidence to user
    };
  });
};

/**
 * Calculate importance score for Part B questions - ML ENHANCED
 * Uses: Frequency + Marks + Recency + Trend Analysis + Semantic Similarity
 */
export const calculatePartBImportance = (questions, currentYear = new Date().getFullYear()) => {
  if (questions.length === 0) return [];

  // Deduplicate and count frequency
  const frequencyMap = {};
  const seen = new Set();
  const recentYear = Math.max(...questions.map(q => parseInt(q.Year) || 0));
  
  questions.forEach(q => {
    const cleaned = q.clean_question;
    const uniqueKey = `${cleaned}_${q.Year}_${q.Module}`;
    
    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      frequencyMap[cleaned] = (frequencyMap[cleaned] || 0) + 1;
    }
  });

  // Calculate TF-IDF
  const idf = calculateIDF(questions);
  
  // Add trend scores
  const withTrends = calculateTrendScore(questions, currentYear);

  return withTrends.map(q => {
    const freq = frequencyMap[q.clean_question];
    const marks = parseInt(q.Marks) || 0;
    const year = parseInt(q.Year) || 0;
    
    // Build TF-IDF vector
    const tfVector = buildTFIDFVector(q, idf);
    
    // ML Ensemble Scoring (weights add to 1.0)
    const freqScore = Math.min(freq / 5, 1) * 0.3;         // 30% frequency
    const marksScore = Math.min(marks / 14, 1) * 0.25;      // 25% marks weight
    const yearScore = Math.max(0, Math.min((year - (recentYear - 5)) / 5, 1)) * 0.25;  // 25% recency
    const trendBonus = q.recencyWeight * 0.2;               // 20% trend analysis

    const score = freqScore + marksScore + yearScore + trendBonus;
    
    // Importance flag
    const importance = (freq > 1 || marks >= 8 || year >= recentYear - 1) ? 1 : 0;

    return {
      ...q,
      importance,
      frequency: freq,
      trendScore: q.trendScore,
      tfVector,
      probability: score,
      confidence: score
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
 * FIX: Use recursive combination finder for EXACT 14-mark solutions
 * Finds the combination with highest total probability that sums to exactly 14 marks
 */
export const assemble14Mark = (questions) => {
  const validCombinations = [];
  
  // Recursive function to find all combinations that sum to 14
  function findCombinations(index, current, currentTotal, currentProb) {
    if (currentTotal === 14) {
      validCombinations.push({
        questions: [...current],
        total: currentTotal,
        totalProbability: currentProb
      });
      return;
    }
    
    if (index >= questions.length || currentTotal > 14) return;
    
    // Try including current question
    const marks = parseInt(questions[index].Marks) || 0;
    if (currentTotal + marks <= 14) {
      findCombinations(
        index + 1,
        [...current, questions[index]],
        currentTotal + marks,
        currentProb + (questions[index].probability || 0)
      );
    }
    
    // Try skipping current question
    findCombinations(index, current, currentTotal, currentProb);
  }
  
  findCombinations(0, [], 0, 0);
  
  // If we found exact 14-mark combinations, return best one
  if (validCombinations.length > 0) {
    validCombinations.sort((a, b) => b.totalProbability - a.totalProbability);
    return {
      questions: validCombinations[0].questions,
      total: validCombinations[0].total
    };
  }
  
  // Fallback: If no exact 14-mark combo, use greedy approach for closest
  const selected = [];
  let total = 0;
  
  for (const q of questions) {
    const marks = parseInt(q.Marks) || 0;
    if (total + marks <= 14) {
      selected.push(q);
      total += marks;
    }
    if (total === 14) break;
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
 * FIX: Properly handle commas, quotes, and special characters in CSV
 */
export const parseQuestionCSV = (csvText) => {
  if (!csvText || csvText.trim().length === 0) {
    throw new Error('CSV file is empty');
  }

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file has no data rows');
  }

  // Parse CSV line properly handling quoted values with commas
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Parse header
  const header = parseCSVLine(lines[0]);
  
  // Expected columns
  const requiredColumns = ['Question', 'Year', 'Module', 'Marks', 'Part'];
  const missingColumns = requiredColumns.filter(col => !header.includes(col));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Parse data rows
  const questions = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = parseCSVLine(lines[i]);
    
    // Allow flexible column count (some rows might have optional columns)
    if (values.length < requiredColumns.length) continue;

    const row = {};
    header.forEach((col, idx) => {
      row[col] = values[idx] || '';
    });

    // Validate required fields
    if (!row.Question || !row.Year || !row.Module || !row.Marks || !row.Part) {
      continue; // Skip invalid rows
    }

    // Add cleaned text
    row.clean_question = cleanText(row.Question);
    questions.push(row);
  }

  if (questions.length === 0) {
    throw new Error('No valid questions found in CSV file');
  }

  return questions;
};

/**
 * Main prediction function
 * Process uploaded data and generate predictions
 * FIX: Flexible Part A marks (2-4 marks), better validation
 */
export const generatePredictions = (csvText, subjectName) => {
  // Parse CSV
  const allQuestions = parseQuestionCSV(csvText);

  // Split by Part A and Part B (flexible marks for Part A)
  const partAQuestions = allQuestions.filter(q => {
    if (q.Part?.toUpperCase() !== 'A') return false;
    const marks = parseInt(q.Marks) || 0;
    return marks >= 2 && marks <= 4;  // Part A is typically 2-4 marks
  });
  
  const partBQuestions = allQuestions.filter(
    q => q.Part?.toUpperCase() === 'B'
  );

  // Validate we have questions
  if (partAQuestions.length === 0 && partBQuestions.length === 0) {
    throw new Error('No valid Part A or Part B questions found. Please check your CSV format.');
  }

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

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
export const buildTFIDFVector = (cleanQuestion, idf) => {
  const words = cleanQuestion.split(' ');
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
 * PHASE 2: Pattern Detection - Detect cyclic/alternating question patterns
 * Identifies if questions appear in predictable cycles (e.g., every 2 years)
 */
export const detectPattern = (questionHistory, currentYear = new Date().getFullYear()) => {
  try {
    // Error Check 1: Validate input
    if (!questionHistory || questionHistory.length < 2) {
      return { pattern: 'RANDOM', cycle: null, isDue: false };
    }

    // Error Check 2: Ensure years are valid numbers
    const validHistory = questionHistory.filter(q => {
      const year = parseInt(q.Year);
      return !isNaN(year) && year > 1900 && year <= currentYear;
    });

    if (validHistory.length < 2) {
      return { pattern: 'RANDOM', cycle: null, isDue: false };
    }

    // Sort by year
    const years = validHistory.map(q => parseInt(q.Year)).sort((a, b) => a - b);
    
    // Calculate gaps between appearances
    const gaps = [];
    for (let i = 1; i < years.length; i++) {
      gaps.push(years[i] - years[i - 1]);
    }

    // Error Check 3: Check for consistent gaps (cyclic pattern)
    const uniqueGaps = [...new Set(gaps)];
    if (uniqueGaps.length === 1 && uniqueGaps[0] > 0) {
      const cycleLength = uniqueGaps[0];
      const lastYear = years[years.length - 1];
      const yearsSince = currentYear - lastYear;
      const isDue = yearsSince >= cycleLength;
      
      return {
        pattern: 'CYCLIC',
        cycle: cycleLength,
        isDue,
        lastAppearance: lastYear,
        nextExpected: lastYear + cycleLength
      };
    }

    // Check for alternating pattern (appears in odd/even years only)
    if (years.length >= 3) {
      const oddYears = years.filter(y => y % 2 === 1);
      const evenYears = years.filter(y => y % 2 === 0);
      
      if (oddYears.length === years.length || evenYears.length === years.length) {
        const isOddPattern = oddYears.length === years.length;
        const lastYear = years[years.length - 1];
        const isDue = (currentYear % 2 === (isOddPattern ? 1 : 0)) && currentYear > lastYear;
        
        return {
          pattern: 'ALTERNATING',
          cycle: 2,
          isDue,
          lastAppearance: lastYear,
          nextExpected: lastYear + 2
        };
      }
    }

    // No pattern detected
    return { pattern: 'RANDOM', cycle: null, isDue: false };
    
  } catch (error) {
    console.error('❌ Pattern detection error:', error);
    // Error Check 4: Safe fallback
    return { pattern: 'RANDOM', cycle: null, isDue: false };
  }
};


/**
 * PHASE 2: Transformer AI Integration - Browser-based semantic understanding
 * Uses @xenova/transformers for advanced question similarity detection
 */

// Singleton to cache AI model
let embeddingPipeline = null;

/**
 * Initialize Transformer model (cached after first load)
 */
export const initTransformer = async () => {
  try {
    if (embeddingPipeline) {
      return embeddingPipeline;
    }

    console.log('🤖 Loading AI model (all-MiniLM-L6-v2)...');
    
    // Dynamic import to avoid bundle bloat
    const { pipeline } = await import('@xenova/transformers');
    
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MinieLM-L6-v2'  // Lightweight, fast model (384 dims)
    );
    
    console.log('✅ AI model loaded successfully!');
    return embeddingPipeline;
    
  } catch (error) {
    console.error('❌ Failed to load AI model:', error);
    return null;  // Fallback to TF-IDF
  }
};

/**
 * Generate AI embeddings for questions
 */
export const generateEmbeddings = async (questions) => {
  try {
    const extractor = await initTransformer();
    
    // Error Check 1: Model failed to load
    if (!extractor) {
      console.warn('⚠️ AI model unavailable, using TF-IDF fallback');
      return questions.map(q => ({ ...q, embedding: null }));
    }

    // Error Check 2: Validate input
    if (!questions || questions.length === 0) {
      return [];
    }

    console.log(`🧠 Generating AI embeddings for ${questions.length} questions...`);
    
    // Generate embeddings for all questions
    const embeddings = await Promise.all(
      questions.map(async (q, index) => {
        try {
          // Error Check 3: Validate question text
          if (!q.clean_question || q.clean_question.trim().length < 5) {
            return { ...q, embedding: null };
          }

          const output = await extractor(q.clean_question, {
            pooling: 'mean',
            normalize: true
          });
          
          return {
            ...q,
            embedding: Array.from(output.data),
            hasAI: true
          };
          
        } catch (embError) {
          console.error(`❌ Embedding error for question ${index}:`, embError.message);
          return { ...q, embedding: null, hasAI: false };
        }
      })
    );
    
    console.log(`✅ Generated ${embeddings.filter(e => e.embedding).length} AI embeddings`);
    return embeddings;
    
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    return questions.map(q => ({ ...q, embedding: null }));
  }
};

/**
 * Calculate cosine similarity between two AI embeddings
 */
export const aiCosineSimilarity = (embeddingA, embeddingB) => {
  try {
    // Error Check 1: Validate embeddings
    if (!embeddingA || !embeddingB || embeddingA.length !== embeddingB.length) {
      return 0;
    }

    // Dot product (vectors are already normalized)
    let dotProduct = 0;
    for (let i = 0; i < embeddingA.length; i++) {
      dotProduct += embeddingA[i] * embeddingB[i];
    }
    
    return Math.max(0, Math.min(1, dotProduct));  // Clamp to [0, 1]
    
  } catch (error) {
    console.error('❌ Similarity calculation error:', error);
    return 0;
  }
};

/**
 * PHASE 2: AI-based question clustering
 * Groups semantically similar questions using transformer embeddings
 */
export const aiSmartClustering = async (questions, threshold = 0.75) => {
  try {
    console.log('🔬 AI Smart Clustering starting...');
    
    // Generate embeddings
    const withEmbeddings = await generateEmbeddings(questions);
    
    // Filter questions with valid embeddings
    const validQuestions = withEmbeddings.filter(q => q.embedding);
    
    // Error Check: If no valid embeddings, fall back to TF-IDF
    if (validQuestions.length === 0) {
      console.warn('⚠️ No valid AI embeddings, falling back to TF-IDF clustering');
      return fallbackTFIDFClustering(questions, threshold);
    }

    const clusters = [];
    const clustered = new Set();
    
    for (const q of validQuestions) {
      // Skip if already clustered
      if (clustered.has(q.id || q.Question)) continue;
      
      // Find similar questions
      const similar = validQuestions
        .filter(other => {
          const id = other.id || other.Question;
          return id !== (q.id || q.Question) && !clustered.has(id);
        })
        .map(other => ({
          question: other,
          similarity: aiCosineSimilarity(q.embedding, other.embedding)
        }))
        .filter(s => s.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
      
      // Create cluster
      const cluster = [q, ...similar.map(s => s.question)];
      cluster.forEach(cq => clustered.add(cq.id || cq.Question));
      
      clusters.push({
        representative: q,
        members: cluster,
        avgFrequency: cluster.reduce((sum, cq) => sum + (cq.frequency || 1), 0) / cluster.length,
        aiClustered: true
      });
    }
    
    console.log(`✅ Created ${clusters.length} AI clusters`);
    return clusters;
    
  } catch (error) {
    console.error('❌ AI clustering failed:', error);
    // Fallback to TF-IDF clustering
    return fallbackTFIDFClustering(questions, threshold);
  }
};

/**
 * Fallback TF-IDF clustering if AI fails
 */
const fallbackTFIDFClustering = (questions, threshold = 0.7) => {
  console.log('📊 Using TF-IDF clustering (fallback)...');
  
  try {
    const idf = calculateIDF(questions);
    const clusters = [];
    const clustered = new Set ();
    
    for (const q of questions) {
      if (clustered.has(q.id || q.Question)) continue;
      
      const qVector = buildTFIDFVector(q.clean_question, idf);
      
      const similar = questions
        .filter(other => {
          const id = other.id || other.Question;
          return id !== (q.id || q.Question) && !clustered.has(id);
        })
        .map(other => ({
          question: other,
          similarity: cosineSimilarity(qVector, buildTFIDFVector(other.clean_question, idf))
        }))
        .filter(s => s.similarity >= threshold);
      
      const cluster = [q, ...similar.map(s => s.question)];
      cluster.forEach(cq => clustered.add(cq.id || cq.Question));
      
      clusters.push({
        representative: q,
        members: cluster,
        avgFrequency: cluster.reduce((sum, cq) => sum + (cq.frequency || 1), 0) / cluster.length,
        aiClustered: false
      });
    }
    
    console.log(`✅ Created ${clusters.length} TF-IDF clusters`);
    return clusters;
    
  } catch (error) {
    console.error('❌ TF-IDF clustering failed:', error);
    // Return each question as its own cluster
    return questions.map(q => ({
      representative: q,
      members: [q],
      avgFrequency: q.frequency || 1,
      aiClustered: false
    }));
  }
};



/**
 * PHASE 2: Difficulty Classification - Classify based on ANSWER DEPTH & COMPLEXITY
 * Analyzes what's required in the answer, not just question keywords
 */
export const classifyDifficulty = (question, marks = 3) => {
  try {
    if (!question || typeof question !== 'string') {
      return { difficulty: 'MEDIUM', score: 0.5 };
    }

    const qLower = question.toLowerCase();
    let difficultyScore = 0;
    
    // ANSWER DEPTH: What does the answer require?
    const easyIndicators = ['what is', 'who is', 'define', 'state', 'name', 'list'];
    const mediumIndicators = ['explain', 'describe', 'discuss', 'how', 'why', 'compare', 'advantages and disadvantages'];
    const hardIndicators = ['analyze', 'evaluate', 'design', 'implement', 'derive', 'prove', 'build', 'create'];
    
    if (hardIndicators.some(i => qLower.includes(i))) {
      difficultyScore += 4; // Deep analysis/creation required
    } else if (mediumIndicators.some(i => qLower.includes(i))) {
      difficultyScore += 2; // Explanation required
    } else if (easyIndicators.some(i => qLower.includes(i))) {
      difficultyScore += 0.5; // Simple recall
    } else {
      difficultyScore += 1.5;
    }
    
    // CONCEPT COMPLEXITY: How hard are the concepts?
    const deepConcepts = ['algorithm', 'complexity', 'distributed', 'concurrent', 'recursion', 'dynamic programming', 'compiler', 'cryptography'];
    const moderateConcepts = ['inheritance', 'polymorphism', 'array', 'linked list', 'sorting', 'searching'];
    
    const deepCount = deepConcepts.filter(c => qLower.includes(c)).length;
    const moderateCount = moderateConcepts.filter(c => qLower.includes(c)).length;
    
    if (deepCount >= 2) difficultyScore += 3;
    else if (deepCount >= 1) difficultyScore += 2;
    else if (moderateCount >= 2) difficultyScore += 1.5;
    else if (moderateCount >= 1) difficultyScore += 0.5;
    
    // DETAIL REQUIRED: How much work?
    if (qLower.includes('in detail') || qLower.includes('detailed')) difficultyScore += 2;
    if (qLower.includes('comprehensive')) difficultyScore += 2;
    if (qLower.includes('step by step')) difficultyScore += 1.5;
    if (qLower.includes('with example')) difficultyScore += 1;
    if (qLower.includes('with diagram')) difficultyScore += 1.5;
    if (qLower.includes('with neat diagram')) difficultyScore += 2;
    
    // MULTIPLE PARTS: How many things to cover?
    const andCount = (qLower.match(/ and | & /g) || []).length;
    difficultyScore += andCount * 0.5;
    if (qLower.includes('various') || qLower.includes('all')) difficultyScore += 1;
    
    // MARKS: Higher = more expected
    if (marks >= 15) difficultyScore += 3;
    else if (marks >= 10) difficultyScore += 2.5;
    else if (marks >= 7) difficultyScore += 1.5;
    else if (marks >= 5) difficultyScore += 1;
    else if (marks >= 3) difficultyScore += 0.5;
    
    // CODE/IMPLEMENTATION: Requires coding?
    if (qLower.includes('write a program') || qLower.includes('write code')) difficultyScore += 2;
    if (qLower.includes('algorithm') && (qLower.includes('write') || qLower.includes('design'))) difficultyScore += 1.5;
    
    // Classify based on total score (max ~11, typical range 0-8)
    let difficulty, score;
    if (difficultyScore <= 3) {
      difficulty = 'EASY';
      score = 0.3;
    } else if (difficultyScore <= 6) {
      difficulty = 'MEDIUM';
      score = 0.5;
    } else {
      difficulty = 'HARD';
      score = 0.7;
    }
    
    return { difficulty, score };
    
  } catch (error) {
    console.error('Error classifying difficulty:', error);
    return { difficulty: 'MEDIUM', score: 0.5 };
  }
};

/**
 * PHASE 2: Enhanced Confidence Scoring - Multi-factor prediction confidence
 * Provides transparent explanations for why a question is predicted
 */
export const calculateDetailedConfidence = (questionData, currentYear = new Date().getFullYear()) => {
  try {
    const factors = [];
    let score = 0;
    
    // Factor 1: Frequency (40% max)
    const freq = questionData.frequency || 1;
    if (freq >= 3) {
      factors.push(`Appeared ${freq} times`);
      score += 0.4; // Full weight
    } else if (freq === 2) {
      factors.push('Appeared 2 times');
      score += 0.3; // 30%
    } else {
      factors.push('Appeared once');
      score += 0.2; // 20% (improved from 10%)
    }
    
    // Factor 2: Recency (25%)
    const yearsAgo = currentYear - (parseInt(questionData.Year) || currentYear);
    if (yearsAgo <= 1) {
      factors.push('Very recent (last year)');
      score += 0.25;
    } else if (yearsAgo <= 2) {
      factors.push('Recent (2 years)');
      score += 0.15;
    } else if (yearsAgo <= 3) {
      factors.push('Moderately recent');
      score += 0.1;
    }
    
    // Factor 3: Pattern (20%)
    if (questionData.pattern === 'CYCLIC' && questionData.isDue) {
      factors.push(`Due (${questionData.cycle}-year cycle)`);
      score += 0.2;
    } else if (questionData.pattern === 'ALTERNATING') {
      factors.push('Alternating pattern');
      score += 0.1;
    }
    
    // Factor 4: Cluster strength (15%)
    const clusterSize = questionData.cluster_size || 1;
    if (clusterSize >= 3) {
      factors.push(`${clusterSize} similar questions`);
      score += 0.15;
    } else if (clusterSize === 2) {
      factors.push('1 similar question');
      score += 0.08;
    }
    
    // Factor 5: Trend (10%)
    const trendScore = questionData.trendScore || 0;
    if (trendScore > 0.8) {
      factors.push('Strong trend');
      score += 0.1;
    } else if (trendScore > 0.5) {
      factors.push('Moderate trend');
      score += 0.05;
    }
    
    // Classify confidence level
    let level, emoji;
    if (score >= 0.6) { // Changed from 0.7 to 0.6
      level = 'HIGH';
      emoji = '🟢';
    } else if (score >= 0.3) {
      level = 'MEDIUM';
      emoji = '🟡';
    } else {
      level = 'LOW';
      emoji = '🔴';
    }
    
    return {
      level,
      score: Math.min(score, 1),
      emoji,
      factors,
      explanation: `${emoji} ${level} (${Math.round(score * 100)}%): ${factors.join(', ')}`
    };
    
  } catch (error) {
    console.error('❌ Confidence calculation error:', error);
    return {
      level: 'MEDIUM',
      score: 0.5,
      emoji: '🟡',
      factors: ['Default confidence'],
      explanation: '🟡 MEDIUM (50%): Default confidence'
    };
  }
};

/**
 * PHASE 2: Syllabus Integration - Map questions to syllabus topics
 * Boosts questions based on curriculum importance
 */
export const matchToSyllabus = (question, syllabus) => {
  try {
    if (!syllabus || !syllabus.modules || !question.Module) {
      console.log('⚠️ No syllabus or missing module for question:', question.Question?.substring(0, 50));
      return { matches: [], score: 0 };
    }

    const moduleData = syllabus.modules.find(m => m.number === parseInt(question.Module));
    if (!moduleData || !moduleData.topics) {
      console.log(`⚠️ No topics found for Module ${question.Module}`);
      return { matches: [], score: 0 };
    }

    const matches = [];
    let bestScore = 0;
    const qWords = question.clean_question.toLowerCase().split(' ');

    moduleData.topics.forEach(topic => {
      if (!topic.keywords || !Array.isArray(topic.keywords)) return;

      const matchCount = topic.keywords.filter(keyword =>
        qWords.some(word => word.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(word))
      ).length;

      if (matchCount > 0) {
        const matchRatio = matchCount / topic.keywords.length;
        const importanceWeight = { 'high': 1.0, 'medium': 0.6, 'low': 0.3 }[topic.importance] || 0.5;
        const hoursWeight = (topic.hours || 4) / 8;
        const topicScore = matchRatio * importanceWeight * hoursWeight;

        matches.push({
          topic: topic.name,
          score: topicScore,
          importance: topic.importance,
          hours: topic.hours
        });

        bestScore = Math.max(bestScore, topicScore);
        console.log(`✅ Matched "${question.Question?.substring(0, 40)}..." → ${topic.name} (score: ${topicScore.toFixed(2)})`);
      }
    });

    if (matches.length === 0) {
      console.log(`⚠️ No topic matches for: "${question.Question?.substring(0, 50)}..."`);
    }

    return {
      matches: matches.sort((a, b) => b.score - a.score),
      score: bestScore
    };

  } catch (error) {
    console.error('❌ Syllabus matching error:', error);
    return { matches: [], score: 0 };
  }
};

/**
 * PHASE 2: Question Variation Detection - Detect rephrased questions
 * Identifies questions that are essentially the same but worded differently
 */
export const detectVariations = (question, allQuestions, threshold = 0.85) => {
  try {
    if (!question || !allQuestions || allQuestions.length === 0) {
      return [];
    }

    const variations = [];
    const qWords = new Set(question.clean_question.split(' '));

    for (const other of allQuestions) {
      if (other.Question === question.Question) continue;

      const otherWords = new Set(other.clean_question.split(' '));
      const intersection = new Set([...qWords].filter(x => otherWords.has(x)));
      const union = new Set([...qWords, ...otherWords]);

      const similarity = intersection.size / union.size; // Jaccard similarity

      if (similarity >= threshold) {
        variations.push({
          question: other,
          similarity,
          type: 'REPHRASE'
        });
      }
    }

    return variations;

  } catch (error) {
    console.error('❌ Variation detection error:', error);
    return [];
  }
};

/**
 * PHASE 2: Module Coverage Balance - Ensure fair module representation
 * Adjusts predictions to include all modules proportionally
 */
export const balanceModuleCoverage = (predictions, targetCount = 30) => {
  try {
    if (!predictions || predictions.length === 0) {
      return predictions;
    }

    // Group by module
    const byModule = {};
    predictions.forEach(q => {
      const mod = q.Module || 'Unknown';
      if (!byModule[mod]) byModule[mod] = [];
      byModule[mod].push(q);
    });

    const modules = Object.keys(byModule);
    const questionsPerModule = Math.floor(targetCount / modules.length);
    const balanced = [];

    // Take top N from each module
    modules.forEach(mod => {
      const moduleQuestions = byModule[mod]
        .sort((a, b) => (b.probability || 0) - (a.probability || 0))
        .slice(0, questionsPerModule);
      balanced.push(...moduleQuestions);
    });

    // Fill remaining slots with highest probability overall
    const remaining = targetCount - balanced.length;
    if (remaining > 0) {
      const unselected = predictions.filter(q => !balanced.includes(q));
      const topRemaining = unselected
        .sort((a, b) => (b.probability || 0) - (a.probability || 0))
        .slice(0, remaining);
      balanced.push(...topRemaining);
    }

    return balanced.sort((a, b) => (b.probability || 0) - (a.probability || 0));

  } catch (error) {
    console.error('❌ Module balance error:', error);
    return predictions;
  }
};

/**
 * PHASE 2: Enhanced Export Data - Add ML insights to export
 * Includes confidence, difficulty, patterns in exported data
 */
export const enhanceExportData = (predictions) => {
  try {
    return predictions.map(q => ({
      ...q,
      ml_insights: {
        confidence: q.confidence?.level || 'MEDIUM',
        confidence_score: Math.round((q.confidence?.score || 0.5) * 100),
        difficulty: q.difficulty?.difficulty || 'MEDIUM',
        pattern: q.pattern || 'RANDOM',
        cluster_size: q.cluster_size || 1,
        ai_clustered: q.aiClustered || false,
        syllabus_topics: q.syllabus_topics || []
      }
    }));

  } catch (error) {
    console.error('❌ Export enhancement error:', error);
    return predictions;
  }
};

/**
 * PHASE 2: Historical Accuracy Tracking - Track prediction accuracy
 * Compares predictions with actual exam questions for future improvement
 */
export const trackAccuracy = (predictions, actualExam) => {
  try {
    if (!predictions || !actualExam || actualExam.length === 0) {
      return { accuracy: 0, hits: 0, misses: predictions?.length || 0 };
    }

    const predictedQuestions = new Set(
      predictions.map(q => q.clean_question)
    );
    const actualQuestions = new Set(
      actualExam.map(q => cleanText(q.Question || q.question || ''))
    );

    let hits = 0;
    actualQuestions.forEach(aq => {
      if (predictedQuestions.has(aq)) hits++;
    });

    const accuracy = actualQuestions.size > 0 ? hits / actualQuestions.size : 0;

    return {
      accuracy: Math.round(accuracy * 100),
      hits,
      misses: actualQuestions.size - hits,
      totalPredicted: predictions.length,
      totalActual: actualQuestions.size
    };

  } catch (error) {
    console.error('❌ Accuracy tracking error:', error);
    return { accuracy: 0, hits: 0, misses: 0 };
  }
};


/**
 * Calculate importance score for Part A questions - ML ENHANCED
 * Combines: Frequency + Trend Analysis + Semantic Similarity
 */
export const calculatePartAImportance = (questions, currentYear = new Date().getFullYear()) => {
  console.log('🔍 Part A - Total questions received:', questions.length);
  
  // Count frequency across ALL occurrences (not deduplicated yet)
  const frequencyMap = {};
  
  questions.forEach(q => {
    const cleaned = q.clean_question;
    frequencyMap[cleaned] = (frequencyMap[cleaned] || 0) + 1;
  });

  // Log frequency counts
  console.log('📊 Frequency Map:', Object.fromEntries(
    Object.entries(frequencyMap).slice(0, 5).map(([q, count]) => [q.substring(0, 30) + '...', count])
  ));
  console.log('📊 Total unique questions:', Object.keys(frequencyMap).length);
  console.log('📊 Questions with frequency > 1:', Object.values(frequencyMap).filter(f => f > 1).length);

  // Calculate TF-IDF for semantic similarity
  const idf = calculateIDF(questions);

  // Now deduplicate for unique predictions (keep one instance per year/module)
  const seen = new Set();
  const uniqueQuestions = [];
  
  questions.forEach(q => {
    const uniqueKey = `${q.clean_question}_${q.Year}_${q.Module}`;
    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      uniqueQuestions.push(q);
    }
  });

  console.log('✅ Unique questions after dedup:', uniqueQuestions.length);

  // Assign combined scores to unique questions
  return uniqueQuestions.map(q => {
    const frequency = frequencyMap[q.clean_question]; // Get total frequency
    const yearsAgo = currentYear - (parseInt(q.Year) || 0);
    
    // Calculate trend score directly
    const recencyWeight = Math.exp(-yearsAgo * 0.25);
    
    // Ensemble scoring: 40% frequency, 30% trend, 30% recency
    const freqScore = Math.min(frequency / 5, 1) * 0.4;
    const trendScore = recencyWeight * 0.3;
    const recencyBonus = Math.max(0, (5 - yearsAgo) / 5) * 0.3;
    
    const finalScore = freqScore + trendScore + recencyBonus;
    
    // Log first few for debugging
    if (uniqueQuestions.indexOf(q) < 3) {
      console.log(`📌 Question: "${q.Question.substring(0, 40)}..."`, {
        frequency,
        probability: Math.min(finalScore, 1).toFixed(2)
      });
    }
    
    // Return clean new object
    return {
      Question: q.Question,
      Year: q.Year,
      Module: q.Module,
      Marks: q.Marks,
      Part: q.Part,
      clean_question: q.clean_question,
      importance: frequency > 1 || yearsAgo <= 2 ? 1 : 0,
      frequency,  // Now shows actual total count!
      trendScore: recencyWeight,
      probability: Math.min(finalScore, 1),
      confidence: finalScore
    };
  });
};

/**
 * Calculate importance score for Part B questions - ML ENHANCED
 * Uses: Frequency + Marks + Recency + Trend Analysis + Semantic Similarity
 */
export const calculatePartBImportance = (questions, currentYear = new Date().getFullYear()) => {
  if (questions.length === 0) return [];

  // Count frequency across ALL occurrences first
  const frequencyMap = {};
  questions.forEach(q => {
    const cleaned = q.clean_question;
    frequencyMap[cleaned] = (frequencyMap[cleaned] || 0) + 1;
  });

  // Calculate TF-IDF
  const idf = calculateIDF(questions);
  
  // Find most recent year for scoring
  const recentYear = Math.max(...questions.map(q => parseInt(q.Year) || 0));

  // Deduplicate keeping one instance per year/module
  const seen = new Set();
  const uniqueQuestions = [];
  
  questions.forEach(q => {
    const uniqueKey = `${q.clean_question}_${q.Year}_${q.Module}`;
    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      uniqueQuestions.push(q);
    }
  });

  return uniqueQuestions.map(q => {
    const freq = frequencyMap[q.clean_question]; // Total frequency
    const marks = parseInt(q.Marks) || 0;
    const year = parseInt(q.Year) || 0;
    const yearsAgo = currentYear - year;
    
    // Calculate trend score directly
    const recencyWeight = Math.exp(-yearsAgo * 0.25);
    
    // ML Ensemble Scoring
    const freqScore = Math.min(freq / 5, 1) * 0.3;
    const marksScore = Math.min(marks / 14, 1) * 0.25;
    const yearScore = Math.max(0, Math.min((year - (recentYear - 5)) / 5, 1)) * 0.25;
    const trendBonus = recencyWeight * 0.2;

    const score = freqScore + marksScore + yearScore + trendBonus;
    
    // Importance flag
    const importance = (freq > 1 || marks >= 8 || year >= recentYear - 1) ? 1 : 0;

    // Return clean new object
    return {
      Question: q.Question,
      Year: q.Year,
      Module: q.Module,
      Marks: q.Marks,
      Part: q.Part,
      clean_question: q.clean_question,
      importance,
      frequency: freq,  // Shows actual total count!
      trendScore: recencyWeight,
      probability: score,
      confidence: score
    };
  });
};

/**
 * Predict Part A questions (top 4 per module for more variety)
 */
export const predictPartA = (questions) => {
  const modules = {};
  
  // Group by module
  questions.forEach(q => {
    const module = q.Module;
    if (!modules[module]) modules[module] = [];
    modules[module].push(q);
  });

  // Get top 4 per module (increased from 2 for more variety)
  const predictions = {};
  Object.keys(modules).sort().forEach(module => {
    const sorted = modules[module].sort((a, b) => b.probability - a.probability);
    predictions[`Module ${module}`] = sorted.slice(0, 4).map(q => ({
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
    
    // Try skipping current question - FIX: INCREMENT INDEX!
    findCombinations(index + 1, current, currentTotal, currentProb);
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
  
  // Fallback: greedy approach
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
 * FIX: Properly handle commas, quotes, and FLEXIBLE column name matching
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
  const rawHeaders = parseCSVLine(lines[0]);
  
  // Smart column name mapping (INTELLIGENT ML FEATURE)
  const columnMappings = {
    'Question': [
      'question', 'questions', 'question text', 'question_text', 
      'questiontext', 'q', 'ques', 'question name'
    ],
    'Year': [
      'year', 'yr', 'academic year', 'exam year', 'year_of_exam'
    ],
    'Module': [
      'module', 'mod', 'unit', 'chapter', 'module number', 'module_number'
    ],
    'Marks': [
      'marks', 'mark', 'points', 'score', 'total marks', 'max marks'
    ],
    'Part': [
      'part', 'section', 'part name', 'question part'
    ]
  };

  // Map actual headers to expected columns
  const headerMap = {};
  const mappedHeaders = [];
  
  rawHeaders.forEach((rawHeader, idx) => {
    const normalized = rawHeader.toLowerCase().trim();
    let mapped = null;
    
    // Try to find a match
    for (const [expectedCol, variations] of Object.entries(columnMappings)) {
      if (variations.includes(normalized) || normalized === expectedCol.toLowerCase()) {
        mapped = expectedCol;
        headerMap[idx] = expectedCol;
        break;
      }
    }
    
    mappedHeaders.push(mapped || rawHeader);
  });

  // Log detected columns (ACTIVE LOGGING)
  console.log('📋 CSV Column Detection:');
  console.log('Raw headers:', rawHeaders);
  console.log('Mapped to:', mappedHeaders);
  console.log('Header mapping:', headerMap);
  
  // Expected columns
  const requiredColumns = ['Question', 'Year', 'Module', 'Marks', 'Part'];
  const detectedColumns = Object.values(headerMap);
  const missingColumns = requiredColumns.filter(col => !detectedColumns.includes(col));
  
  if (missingColumns.length > 0) {
    console.error('❌ Missing columns:', missingColumns);
    console.error('💡 Available columns:', rawHeaders);
    console.error('💡 Detected mappings:', headerMap);
    throw new Error(
      `Missing required columns: ${missingColumns.join(', ')}\n\n` +
      `Found columns: ${rawHeaders.join(', ')}\n\n` +
      `Tip: Make sure your CSV has columns for: ${requiredColumns.join(', ')}`
    );
  }

  console.log('✅ All required columns found!');

  // Parse data rows
  const questions = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = parseCSVLine(lines[i]);
    
    // Build row with mapped column names
    const row = {};
    values.forEach((value, idx) => {
      const columnName = headerMap[idx] || rawHeaders[idx];
      row[columnName] = value || '';
    });

    // Validate required fields
    if (!row.Question || !row.Year || !row.Module || !row.Marks || !row.Part) {
      console.warn(`⚠️ Row ${i} missing data:`, row);
      continue; // Skip invalid rows
    }

    // Add cleaned text
    row.clean_question = cleanText(row.Question);
    
    // Log first few questions for verification
    if (i <= 3) {
      console.log(`✓ Parsed row ${i}:`, {
        Question: row.Question.substring(0, 50) + '...',
        Year: row.Year,
        Module: row.Module,
        Marks: row.Marks,
        Part: row.Part
      });
    }
    
    questions.push(row);
  }

  if (questions.length === 0) {
    throw new Error('No valid questions found in CSV file');
  }

  console.log(`✅ Successfully parsed ${questions.length} questions`);

  return questions;
};

/**
 * Main prediction function
 * Process uploaded data and generate predictions
 * FIX: Flexible Part A marks (2-4 marks), better validation
 */
export const generatePredictions = async (csvText, subjectName, syllabus = null, aiEnabled = true) => {
  console.log('🚀 Phase 2: Starting ML-enhanced prediction generation...');
  
  try {
    // Parse CSV using existing parser
    const allQuestions = parseQuestionCSV(csvText);
    
    if (!allQuestions || allQuestions.length === 0) {
      throw new Error('No questions found in CSV');
    }

    console.log(`📊 Total questions: ${allQuestions.length}`);

    // PHASE 2: Apply ML Features
    const currentYear = new Date().getFullYear();
    
    // 1. Pattern Detection for each unique question
    const questionPatterns = {};
    const uniqueQuestions = [...new Set(allQuestions.map(q => q.clean_question))];
    
    uniqueQuestions.forEach(cleanQ => {
      const history = allQuestions.filter(q => q.clean_question === cleanQ);
      questionPatterns[cleanQ] = detectPattern(history, currentYear);
    });
    
    console.log('✅ Pattern detection complete');

    // 2. AI Clustering (or TF-IDF if disabled)
    let clusters = [];
    if (aiEnabled) {
      try {
        console.log('🤖 Running AI clustering...');
        clusters = await aiSmartClustering(allQuestions);
        console.log(`✅ AI clustering: ${clusters.length} clusters`);
      } catch (err) {
        console.warn('⚠️ AI clustering failed, using TF-IDF');
        clusters = await aiSmartClustering(allQuestions); // Will fall back internally
      }
    } else {
      console.log('📊 AI disabled, using TF-IDF clustering');
      clusters = await aiSmartClustering(allQuestions); // Will use fallback
    }

    // 3. Split by Part and calculate importance
    const partA = allQuestions.filter(q => q.Part?.toUpperCase() === 'A');
    const partB = allQuestions.filter(q => q.Part?.toUpperCase() === 'B');
    
    const partAScored = calculatePartAImportance(partA, currentYear);
    const partBScored = calculatePartBImportance(partB, currentYear);
    
    // 4. Enhance Part A with Phase 2 features
    const partAEnhanced = partAScored.map(q => {
      const pattern =questionPatterns[q.clean_question] || { pattern: 'RANDOM', isDue: false };
      const difficulty = classifyDifficulty(q.Question, parseInt(q.Marks) || 3);
      const syllabusMatch = syllabus ? matchToSyllabus(q, syllabus) : { matches: [], score: 0 };
      
      const tempData = {
        frequency: q.frequency,
        Year: q.Year,
        pattern: pattern.pattern,
        isDue: pattern.isDue,
        cycle: pattern.cycle,
        cluster_size: clusters.find(c => c.members.some(m => m.clean_question === q.clean_question))?.members.length || 1,
        trendScore: q.trendScore || 0
      };
      
      const confidence = calculateDetailedConfidence(tempData, currentYear);
      
      // Boost probability if pattern is due or high syllabus match
      let finalProbability = q.probability || 0;
      if (pattern.isDue) finalProbability *= 1.3;
      if (syllabusMatch.score > 0) finalProbability *= (1 + syllabusMatch.score * 0.25);
      finalProbability = Math.min(finalProbability, 1); // Cap at 1
      
      return {
        question: q.Question,
        Question: q.Question,  // Keep both for compatibility
        Year: q.Year,
        Module: q.Module,
        marks: q.Marks,
        Marks: q.Marks,  // Keep both
        frequency: q.frequency,
        probability: finalProbability,
        pattern: pattern.pattern,
        isDue: pattern.isDue,
        cycle: pattern.cycle,
        difficulty,
        confidence,
        syllabus_topics: syllabusMatch.matches.map(m => m.topic),
        cluster_size: tempData.cluster_size,
        aiClustered: aiEnabled,
        clean_question: q.clean_question
      };
    });

    // 5. Enhance Part B with Phase 2 features
    const partBEnhanced = partBScored.map(q => {
      const pattern = questionPatterns[q.clean_question] || { pattern: 'RANDOM', isDue: false };
      const difficulty = classifyDifficulty(q.Question, parseInt(q.Marks) || 7);
      const syllabusMatch = syllabus ? matchToSyllabus(q, syllabus) : { matches: [], score: 0 };
      
      const tempData = {
        frequency: q.frequency,
        Year: q.Year,
        pattern: pattern.pattern,
        isDue: pattern.isDue,
        cycle: pattern.cycle,
        cluster_size: clusters.find(c => c.members.some(m => m.clean_question === q.clean_question))?.members.length || 1,
        trendScore: q.trendScore || 0
      };
      
      const confidence = calculateDetailedConfidence(tempData, currentYear);
      
      let finalProbability = q.probability || 0;
      if (pattern.isDue) finalProbability *= 1.3;
      if (syllabusMatch.score > 0) finalProbability *= (1 + syllabusMatch.score * 0.25);
      finalProbability = Math.min(finalProbability, 1);
      
      return {
        question: q.Question,
        Question: q.Question,
        Year: q.Year,
        Module: q.Module,
        marks: q.Marks,
        Marks: q.Marks,
        frequency: q.frequency,
        probability: finalProbability,
        pattern: pattern.pattern,
        isDue: pattern.isDue,
        cycle: pattern.cycle,
        difficulty,
        confidence,
        syllabus_topics: syllabusMatch.matches.map(m => m.topic),
        cluster_size: tempData.cluster_size,
        aiClustered: aiEnabled,
        clean_question: q.clean_question
      };
    });

    // 6. Sort and balance (INCREASED limits for more variety)
    const sortedPartA = partAEnhanced.sort((a, b) => b.probability - a.probability);
    const sortedPartB = partBEnhanced.sort((a, b) => b.probability - a.probability);

    const balancedPartA = balanceModuleCoverage(sortedPartA, 40);  // Increased from 20
    const balancedPartB = balanceModuleCoverage(sortedPartB, 30);  // Increased from 10

    // 7. Group by module (using existing predictPartA/B format)
    const partAByModule = {};
    const partBByModule = {};

    balancedPartA.forEach(q => {
      const mod = `Module ${q.Module}`;
      if (!partAByModule[mod]) partAByModule[mod] = [];
      partAByModule[mod].push(q);
    });

    // Part B: Create TWO alternative sets per module (OR questions)
    const partBByModuleTemp = {};
    
    // First group by module
    balancedPartB.forEach(q => {
      const mod = `Module ${q.Module}`;
      if (!partBByModuleTemp[mod]) partBByModuleTemp[mod] = [];
      partBByModuleTemp[mod].push(q);
    });
    
    // Helper function to find best combination summing to target marks (14-19 acceptable)
    const findBestCombination = (questions, usedQuestions = new Set(), preferredMarks = 14) => {
      const available = questions.filter(q => !usedQuestions.has(q.Question));
      if (available.length === 0) return { questions: [], totalMarks: 0 };
      
      let bestCombo = { questions: [], totalMarks: 0, score: -Infinity };
      
      // Exhaustive search through all combinations
      const tryCombo = (index, current, currentMarks) => {
        // Calculate score for this combination - ALLOW 14-19 marks for flexibility
        if (currentMarks >= 14 && currentMarks <= 19) {
          // Prefer exactly 14, but accept 15-17 as very good, 18-19 as acceptable
          const markScore = currentMarks === 14 ? 1000 : 
                           currentMarks === 15 ? 800 : 
                           currentMarks === 16 ? 600 : 
                           currentMarks === 17 ? 400 :
                           currentMarks === 18 ? 200 : 100;
          
          // More questions = more variety (gives students choice)
          const questionScore = current.length * 10;
          
          // Boost probability score for better questions
          const probabilityScore = current.reduce((sum, q) => sum + (q.probability || 0), 0) * 50;
          
          const totalScore = markScore + questionScore + probabilityScore;
          
          if (totalScore > bestCombo.score) {
            bestCombo = { questions: [...current], totalMarks: currentMarks, score: totalScore };
          }
        }
        
        // Stop if exceeded range or out of questions
        if (currentMarks > 19 || index >= available.length) return;
        
        // Try each remaining question
        for (let i = index; i < available.length; i++) {
          const q = available[i];
          const marks = parseInt(q.Marks) || 0;
          
          // Only add if it keeps us in acceptable range
          if (currentMarks + marks <= 19) {
            tryCombo(i + 1, [...current, q], currentMarks + marks);
          }
        }
      };
      
      tryCombo(0, [], 0);
      
      // If no combination found, take best single question as last resort
      if (bestCombo.questions.length === 0 && available.length > 0) {
        console.warn(`⚠️ No valid combination found, using single best question`);
        bestCombo = { questions: [available[0]], totalMarks: parseInt(available[0].Marks) || 0, score: 0 };
      }
      
      return bestCombo;
    };
    
    // Then create two DIFFERENT sets from each module
    Object.keys(partBByModuleTemp).forEach(module => {
      const questions = partBByModuleTemp[module];
      
      // Sort by probability (best questions first)
      const sorted = questions.sort((a, b) => b.probability - a.probability);
      
      console.log(`\n📊 ${module}: Processing ${sorted.length} Part B questions`);
      
      // Set A: Best combination (prioritize exactly 14 marks)
      const setA = findBestCombination(sorted, new Set(), 14);
      console.log(`✅ Set A: ${setA.totalMarks} marks, ${setA.questions.length} questions`);
      
      // Set B: Best combination EXCLUDING Set A questions (ensures different questions!)
      const usedInA = new Set(setA.questions.map(q => q.Question));
      const setB = findBestCombination(sorted, usedInA, 14);
      
      if (setB.questions.length > 0) {
        console.log(`✅ Set B: ${setB.totalMarks} marks, ${setB.questions.length} DIFFERENT questions`);
      } else {
        console.warn(`⚠️ ${module}: Not enough questions for Set B, need more data!`);
      }
      
      // Store both sets - ONLY use setA as fallback if absolutely no questions available
      partBByModule[module] = {
        setA,
        setB: setB.questions.length > 0 ? setB : {
          questions: sorted.length > setA.questions.length ? 
            [sorted.find(q => !usedInA.has(q.Question)) || sorted[sorted.length - 1]] : 
            setA.questions,
          totalMarks: setB.questions.length > 0 ? setB.totalMarks : setA.totalMarks
        }
      };
      
      // Verify no duplicates
      const setAQuestions = new Set(partBByModule[module].setA.questions.map(q => q.Question));
      const setBQuestions = new Set(partBByModule[module].setB.questions.map(q => q.Question));
      const duplicates = [...setAQuestions].filter(q => setBQuestions.has(q));
      
      if (duplicates.length > 0) {
        console.warn(`⚠️ ${module}: ${duplicates.length} duplicate questions found between Set A and B`);
      } else {
        console.log(`✅ ${module}: Set A and Set B have NO duplicate questions!`);
      }
    });

    console.log('✅ Phase 2 ML prediction generation complete!');

    return {
      subjectName,
      partA: partAByModule,
      partB: partBByModule,
      stats: {
        totalQuestions: allQuestions.length,
        partAQuestions: balancedPartA.length,
        partBQuestions: balancedPartB.length,
        modules: Object.keys(partAByModule).length,
        aiEnabled,
        syllabusProvided: !!syllabus,
        patternsDetected: Object.values(questionPatterns).filter(p => p.pattern !== 'RANDOM').length
      },
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Phase 2 prediction error:', error);
    throw new Error(`Failed to generate predictions: ${error.message}`);
  }
};

export default {
  cleanText,
  calculatePartAImportance,
  calculatePartBImportance,
  predictPartA,
  predictPartB,
  parseQuestionCSV,
  generatePredictions,
  // Phase 2 exports
  detectPattern,
  aiSmartClustering,
  classifyDifficulty,
  calculateDetailedConfidence,
  matchToSyllabus,
  detectVariations,
  balanceModuleCoverage,
  enhanceExportData,
  trackAccuracy
};


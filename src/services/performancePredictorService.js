/**
 * AI Student Performance Predictor Service
 * Uses TensorFlow.js for browser-based ML predictions
 * Features: CGPA prediction, risk assessment, trend analysis
 * NO API CALLS - runs entirely in browser
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Normalize data for neural network
 */
const normalizeData = (value, min, max) => {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
};

/**
 * Denormalize prediction back to original scale
 */
const denormalizeData = (normalizedValue, min, max) => {
  return normalizedValue * (max - min) + min;
};

/**
 * Extract features from student data
 */
const extractFeatures = (student) => {
  // Current CGPA (0-10)
  const currentCGPA = parseFloat(student.cgpa) || 0;
  
  // Internal marks - get average from subjects or use old field
  let internalMarks = 0;
  if (student.subjects && student.subjects.length > 0) {
    const markedSubjects = student.subjects.filter(s => s.internalMarks);
    if (markedSubjects.length > 0) {
      internalMarks = markedSubjects.reduce((sum, s) => sum + parseFloat(s.internalMarks), 0) / markedSubjects.length;
    }
  } else {
    internalMarks = parseFloat(student.internalMarks) || 0;
  }
  
  // Attendance (0-100)
  const attendance = parseFloat(student.attendance) || 0;
  
  // Back papers (0-10+)
  const backPapers = parseInt(student.backPapers) || 0;
  
  // Semester (1-8)
  const semester = parseInt(student.semester) || 1;
  
  return {
    currentCGPA,
    internalMarks,
    attendance,
    backPapers,
    semester
  };
};

/**
 * Create and train a simple neural network model
 */
export const trainPredictionModel = async (studentsData) => {
  try {
    // Extract features and labels
    const features = [];
    const labels = [];
    
    studentsData.forEach(student => {
      const feat = extractFeatures(student);
      
      // Skip if insufficient data
      if (feat.currentCGPA === 0) return;
      
      // Normalize features [0, 1]
      features.push([
        normalizeData(feat.currentCGPA, 0, 10),
        normalizeData(feat.internalMarks, 0, 100),
        normalizeData(feat.attendance, 0, 100),
        normalizeData(feat.backPapers, 0, 10),
        normalizeData(feat.semester, 1, 8)
      ]);
      
      // Label is current CGPA (we'll predict future based on patterns)
      labels.push([normalizeData(feat.currentCGPA, 0, 10)]);
    });
    
    if (features.length < 5) {
      console.warn('Not enough data to train model');
      return null;
    }
    
    // Create tensors
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels);
    
    // Create model
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [5], units: 16, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    // Train model (quick training for browser)
    await model.fit(xs, ys, {
      epochs: 50,
      batchSize: 8,
      verbose: 0,
      shuffle: true
    });
    
    // Cleanup tensors
    xs.dispose();
    ys.dispose();
    
    return model;
  } catch (error) {
    console.error('Error training model:', error);
    return null;
  }
};

/**
 * Predict student performance
 */
export const predictPerformance = async (student, model = null) => {
  try {
    const features = extractFeatures(student);
    
    // Simple rule-based prediction if no model (fallback)
    if (!model) {
      return getRuleBasedPrediction(features);
    }
    
    // Normalize input
    const input = tf.tensor2d([[
      normalizeData(features.currentCGPA, 0, 10),
      normalizeData(features.internalMarks, 0, 100),
      normalizeData(features.attendance, 0, 100),
      normalizeData(features.backPapers, 0, 10),
      normalizeData(features.semester, 1, 8)
    ]]);
    
    // Predict
    const prediction = model.predict(input);
    const normalizedCGPA = (await prediction.data())[0];
    
    // Denormalize
    const predictedCGPA = denormalizeData(normalizedCGPA, 0, 10);
    
    // Cleanup
    input.dispose();
    prediction.dispose();
    
    // Calculate confidence based on data quality
    const confidence = calculateConfidence(features);
    
    // Assess risk
    const riskLevel = assessRisk(predictedCGPA, features);
    
    // Generate insights
    const insights = generateInsights(features, predictedCGPA);
    
    return {
      predictedCGPA: Math.max(0, Math.min(10, predictedCGPA)).toFixed(2),
      confidence,
      riskLevel,
      insights,
      currentCGPA: features.currentCGPA.toFixed(2)
    };
  } catch (error) {
    console.error('Error predicting performance:', error);
    return getRuleBasedPrediction(extractFeatures(student));
  }
};

/**
 * Rule-based prediction (fallback)
 */
const getRuleBasedPrediction = (features) => {
  const { currentCGPA, internalMarks, attendance, backPapers } = features;
  
  // Simple weighted prediction
  let predicted = currentCGPA;
  
  // Adjust based on internal marks
  if (internalMarks < 40) predicted -= 0.5;
  else if (internalMarks > 80) predicted += 0.3;
  
  // Adjust based on attendance
  if (attendance < 75) predicted -= 0.4;
  else if (attendance > 90) predicted += 0.2;
  
  // Penalty for back papers
  predicted -= (backPapers * 0.3);
  
  // Clamp to valid range
  predicted = Math.max(0, Math.min(10, predicted));
  
  const confidence = 65; // Lower confidence for rule-based
  const riskLevel = assessRisk(predicted, features);
  const insights = generateInsights(features, predicted);
  
  return {
    predictedCGPA: predicted.toFixed(2),
    confidence,
    riskLevel,
    insights,
    currentCGPA: currentCGPA.toFixed(2)
  };
};

/**
 * Calculate prediction confidence
 */
const calculateConfidence = (features) => {
  let confidence = 100;
  
  // Reduce confidence for edge cases
  if (features.currentCGPA < 1) confidence -= 30;
  if (features.internalMarks === 0) confidence -= 20;
  if (features.attendance === 0) confidence -= 15;
  if (features.backPapers > 5) confidence -= 15;
  
  return Math.max(30, Math.min(100, confidence));
};

/**
 * Assess risk level
 */
const assessRisk = (predictedCGPA, features) => {
  const { backPapers, attendance, internalMarks } = features;
  
  // Critical risk factors
  if (predictedCGPA < 5.5 || backPapers > 3 || attendance < 75) {
    return {
      level: 'HIGH',
      color: '#ef4444',
      label: 'High Risk',
      icon: '🔴'
    };
  }
  
  // Moderate risk
  if (predictedCGPA < 7.0 || backPapers > 0 || attendance < 85 || internalMarks < 60) {
    return {
      level: 'MEDIUM',
      color: '#f59e0b',
      label: 'Medium Risk',
      icon: '🟡'
    };
  }
  
  // Low risk - doing well
  return {
    level: 'LOW',
    color: '#10b981',
    label: 'Low Risk',
    icon: '🟢'
  };
};

/**
 * Generate actionable insights
 */
const generateInsights = (features, predictedCGPA) => {
  const insights = [];
  const { currentCGPA, internalMarks, attendance, backPapers } = features;
  
  // CGPA trend
  const cgpaDiff = predictedCGPA - currentCGPA;
  if (cgpaDiff > 0.3) {
    insights.push({
      type: 'positive',
      message: `Predicted improvement of ${cgpaDiff.toFixed(2)} points! Keep it up! 🎉`,
      icon: '📈'
    });
  } else if (cgpaDiff < -0.3) {
    insights.push({
      type: 'warning',
      message: `Predicted decline of ${Math.abs(cgpaDiff).toFixed(2)} points. Take action now!`,
      icon: '📉'
    });
  } else {
    insights.push({
      type: 'neutral',
      message: 'CGPA expected to remain stable',
      icon: '📊'
    });
  }
  
  // Attendance insight
  if (attendance < 75) {
    insights.push({
      type: 'critical',
      message: `Attendance is ${attendance}%. Aim for 75%+ to avoid penalties`,
      icon: '⚠️'
    });
  } else if (attendance >= 90) {
    insights.push({
      type: 'positive',
      message: `Excellent attendance at ${attendance}%! 👏`,
      icon: '✅'
    });
  }
  
  // Internal marks insight
  if (internalMarks < 50) {
    insights.push({
      type: 'warning',
      message: `Internal marks (${internalMarks.toFixed(0)}%) need improvement. Study regularly!`,
      icon: '📚'
    });
  } else if (internalMarks >= 80) {
    insights.push({
      type: 'positive',
      message: `Strong internal performance at ${internalMarks.toFixed(0)}%!`,
      icon: '⭐'
    });
  }
  
  // Back papers insight
  if (backPapers > 0) {
    insights.push({
      type: 'critical',
      message: `${backPapers} back paper${backPapers > 1 ? 's' : ''}. Clear ASAP to improve CGPA!`,
      icon: '🎯'
    });
  }
  
  // Recommendation
  if (predictedCGPA < 6.0) {
    insights.push({
      type: 'action',
      message: 'Recommended: Extra tutoring, regular study schedule, clear back papers',
      icon: '💡'
    });
  }
  
  return insights;
};

/**
 * Batch predict for multiple students
 */
export const batchPredict = async (students, model = null) => {
  const predictions = [];
  
  for (const student of students) {
    const prediction = await predictPerformance(student, model);
    predictions.push({
      studentId: student.studentId,
      studentName: student.name,
      ...prediction
    });
  }
  
  return predictions;
};

/**
 * Get at-risk students
 */
export const getAtRiskStudents = async (students, model = null) => {
  const predictions = await batchPredict(students, model);
  
  return predictions
    .filter(p => p.riskLevel.level === 'HIGH' || p.riskLevel.level === 'MEDIUM')
    .sort((a, b) => {
      // Sort by risk level (HIGH first) then by predicted CGPA
      if (a.riskLevel.level === 'HIGH' && b.riskLevel.level !== 'HIGH') return -1;
      if (a.riskLevel.level !== 'HIGH' && b.riskLevel.level === 'HIGH') return 1;
      return parseFloat(a.predictedCGPA) - parseFloat(b.predictedCGPA);
    });
};

export default {
  trainPredictionModel,
  predictPerformance,
  batchPredict,
  getAtRiskStudents
};

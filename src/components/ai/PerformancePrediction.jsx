import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { predictPerformance } from '../services/performancePredictorService';

const PerformancePrediction = ({ student }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getPrediction = async () => {
      if (!student) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await predictPerformance(student);
        setPrediction(result);
      } catch (error) {
        console.error('Prediction error:', error);
      } finally {
        setLoading(false);
      }
    };

    getPrediction();
  }, [student]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-lg text-center text-gray-400">
        <p>Unable to generate prediction</p>
      </div>
    );
  }

  const cgpaDiff = (parseFloat(prediction.predictedCGPA) - parseFloat(prediction.currentCGPA)).toFixed(2);
  const isImproving = parseFloat(cgpaDiff) > 0;
  const isStable = Math.abs(parseFloat(cgpaDiff)) <= 0.2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span>🤖</span>
          <span>AI Performance Prediction</span>
        </h3>
        <div className="text-xs text-gray-400">
          Confidence: {prediction.confidence}%
        </div>
      </div>

      {/* Main Prediction Card */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border-2 border-gray-700">
        <div className="grid grid-cols-2 gap-6">
          {/* Current CGPA */}
          <div>
            <div className="text-sm text-gray-400 mb-2">Current CGPA</div>
            <div className="text-4xl font-bold text-white">
              {prediction.currentCGPA}
            </div>
          </div>

          {/* Predicted CGPA */}
          <div>
            <div className="text-sm text-gray-400 mb-2">Predicted CGPA</div>
            <div className="flex items-center gap-3">
              <div className={`text-4xl font-bold ${
                isImproving ? 'text-green-400' :
                isStable ? 'text-blue-400' :
                'text-red-400'
              }`}>
                {prediction.predictedCGPA}
              </div>
              {!isStable && (
                <div className={`text-2xl ${
                  isImproving ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isImproving ? '📈' : '📉'}
                </div>
              )}
            </div>
            {!isStable && (
              <div className={`text-sm mt-1 ${
                isImproving ? 'text-green-400' : 'text-red-400'
              }`}>
                {isImproving ? '+' : ''}{cgpaDiff} points
              </div>
            )}
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Prediction Confidence</span>
            <span>{prediction.confidence}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${prediction.confidence}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={`h-2 rounded-full ${
                prediction.confidence >= 80 ? 'bg-green-500' :
                prediction.confidence >= 60 ? 'bg-yellow-500' :
                'bg-orange-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className={`rounded-lg p-4 border-2`} style={{
        backgroundColor: `${prediction.riskLevel.color}20`,
        borderColor: prediction.riskLevel.color
      }}>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{prediction.riskLevel.icon}</div>
          <div className="flex-1">
            <div className="font-bold text-white">{prediction.riskLevel.label}</div>
            <div className="text-sm text-gray-300">
              {prediction.riskLevel.level === 'HIGH' && 'Immediate attention required'}
              {prediction.riskLevel.level === 'MEDIUM' && 'Monitor closely and take preventive action'}
              {prediction.riskLevel.level === 'LOW' && 'Good standing - maintain current performance'}
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {prediction.insights && prediction.insights.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <span>💡</span>
            <span>AI Insights & Recommendations</span>
          </h4>
          
          {prediction.insights.map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx, duration: 0.4 }}
              className={`p-3 rounded-lg border-l-4 ${
                insight.type === 'positive' ? 'bg-green-500/10 border-green-500' :
                insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                insight.type === 'critical' ? 'bg-red-500/10 border-red-500' :
                insight.type === 'action' ? 'bg-blue-500/10 border-blue-500' :
                'bg-gray-800/50 border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-xl flex-shrink-0">{insight.icon}</div>
                <p className="text-sm text-gray-200 flex-1">{insight.message}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-gray-500 text-center border-t border-gray-700 pt-3">
        <p>
          ⓘ Predictions are based on current academic trends and historical patterns.
          Actual results may vary. Use as guidance only.
        </p>
      </div>
    </motion.div>
  );
};

export default PerformancePrediction;

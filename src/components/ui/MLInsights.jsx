import React from 'react';

/**
 * MLInsights Component - Displays Phase 2 ML features
 * Shows confidence, difficulty, patterns, and AI clustering info
 */
const MLInsights = ({ question, compact = false }) => {
  if (!question) return null;

  const {
    confidence,
    difficulty,
    pattern,
    cluster_size,
    aiClustered,
    syllabus_topics
  } = question;

  if (compact) {
    return (
      <div className="flex gap-2 items-center text-xs">
        {confidence?.emoji && (
          <span title={confidence.explanation}>
            {confidence.emoji} {Math.round(confidence.score * 100)}%
          </span>
        )}
        {difficulty?.difficulty && (
          <span className={`px-2 py-0.5 rounded ${
            difficulty.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
            difficulty.difficulty === 'HARD' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {difficulty.difficulty}
          </span>
        )}
        {pattern && pattern !== 'RANDOM' && (
          <span title={`${pattern} pattern`}>
            {pattern === 'CYCLIC' ? '🔁' : '⚡'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-800/30 rounded-lg space-y-2">
      <div className="text-sm font-semibold text-gray-300">📊 ML Insights</div>
      
      {/* Confidence */}
      {confidence && (
        <div className="flex items-center gap-2 text-sm">
          <span>{confidence.emoji}</span>
          <span className="text-gray-400">Confidence:</span>
          <span className={`font-semibold ${
            confidence.level === 'HIGH' ? 'text-green-400' :
            confidence.level === 'LOW' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {confidence.level} ({Math.round(confidence.score * 100)}%)
          </span>
        </div>
      )}

      {/* Confidence Factors */}
      {confidence?.factors && confidence.factors.length > 0 && (
        <div className="text-xs text-gray-500 pl-6">
          {confidence.factors.join(' • ')}
        </div>
      )}

      {/* Difficulty */}
      {difficulty && (
        <div className="flex items-center gap-2 text-sm">
          <span>🎯</span>
          <span className="text-gray-400">Difficulty:</span>
          <span className={`px-2 py-0.5 rounded font-semibold ${
            difficulty.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
            difficulty.difficulty === 'HARD' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {difficulty.difficulty}
          </span>
        </div>
      )}

      {/* Pattern */}
      {pattern && pattern !== 'RANDOM' && (
        <div className="flex items-center gap-2 text-sm">
          <span>{pattern === 'CYCLIC' ? '🔁' : '⚡'}</span>
          <span className="text-gray-400">Pattern:</span>
          <span className="text-blue-400 font-semibold">{pattern}</span>
          {question.isDue && (
            <span className="text-green-400 text-xs">(Due this year!)</span>
          )}
        </div>
      )}

      {/* AI Clustering */}
      {aiClustered && cluster_size > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span>🤖</span>
          <span className="text-gray-400">AI Cluster:</span>
          <span className="text-purple-400 font-semibold">
            {cluster_size} similar questions
          </span>
        </div>
      )}

      {/* Syllabus Topics */}
      {syllabus_topics && syllabus_topics.length > 0 && (
        <div className="flex items-start gap-2 text-sm">
          <span>📚</span>
          <div>
            <span className="text-gray-400">Topics:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {syllabus_topics.map((topic, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MLInsights;

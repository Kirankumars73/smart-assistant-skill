import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Input from '../ui/Input';
import { createEmptyBacklogPaper, validateBacklogPaper, getBacklogStatusColor, getBacklogStatusText } from '../../utils/backlogHelpers';

/**
 * Backlog Paper Manager Component
 * Allows adding/removing backlog papers in student forms
 */
const BacklogPaperManager = ({ backlogPapers = [], onChange, disabled = false }) => {
  const addPaper = () => {
    onChange([...backlogPapers, createEmptyBacklogPaper()]);
  };

  const removePaper = (index) => {
    const updated = backlogPapers.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updatePaper = (index, field, value) => {
    const updated = backlogPapers.map((paper, i) => {
      if (i === index) {
        return { ...paper, [field]: value };
      }
      return paper;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          Backlog Papers
        </label>
        <button
          type="button"
          onClick={addPaper}
          disabled={disabled}
          className="px-3 py-1 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Paper
        </button>
      </div>

      {backlogPapers.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
          <p className="text-gray-500 text-sm">No backlog papers</p>
          <p className="text-gray-600 text-xs mt-1">Click "Add Paper" to add a backlog paper</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {backlogPapers.map((paper, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Subject Name */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Subject Name *
                      </label>
                      <Input
                        type="text"
                        value={paper.subjectName}
                        onChange={(e) => updatePaper(index, 'subjectName', e.target.value)}
                        placeholder="e.g., Data Structures"
                        disabled={disabled}
                        className="w-full"
                      />
                    </div>

                    {/* Subject Code */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Subject Code *
                      </label>
                      <Input
                        type="text"
                        value={paper.subjectCode}
                        onChange={(e) => updatePaper(index, 'subjectCode', e.target.value.toUpperCase())}
                        placeholder="e.g., CS301"
                        disabled={disabled}
                        className="w-full"
                      />
                    </div>

                    {/* Semester */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Semester *
                      </label>
                      <Input
                        type="number"
                        value={paper.semester}
                        onChange={(e) => updatePaper(index, 'semester', e.target.value)}
                        placeholder="e.g., 3"
                        min="1"
                        max="8"
                        disabled={disabled}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removePaper(index)}
                    disabled={disabled}
                    className="mt-6 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove paper"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Status Badge (for existing papers) */}
                {paper.status && (
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getBacklogStatusColor(paper.status)}`}>
                      {getBacklogStatusText(paper.status)}
                    </span>
                    {paper.requestedAt && (
                      <span className="text-xs text-gray-500">
                        Requested: {new Date(paper.requestedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Summary */}
      {backlogPapers.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/30 border border-gray-700 rounded-lg">
          <span className="text-sm text-gray-400">Total Backlog Papers</span>
          <span className="text-lg font-bold text-white">{backlogPapers.length}</span>
        </div>
      )}
    </div>
  );
};

export default BacklogPaperManager;

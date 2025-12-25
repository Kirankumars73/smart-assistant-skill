import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SubjectInputList = ({ subjects = [], onChange, readOnly = false }) => {
  
  // Generate unique ID for new subjects
  const generateId = () => `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add a new subject
  const addSubject = () => {
    const newSubject = {
      id: generateId(),
      name: '',
      type: 'theory',
      internalMarks: '',
      credits: ''
    };
    onChange([...subjects, newSubject]);
  };
  
  // Remove a subject
  const removeSubject = (id) => {
    onChange(subjects.filter(s => s.id !== id));
  };
  
  // Update a subject field
  const updateSubject = (id, field, value) => {
    onChange(subjects.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          📚 Subjects & Labs
          <span className="text-gray-500 font-normal ml-2">
            ({subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'})
          </span>
        </label>
        {!readOnly && (
          <button
            type="button"
            onClick={addSubject}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/30 transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Subject
          </button>
        )}
      </div>
      
      {/* Subject List */}
      {subjects.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-lg bg-white/5 border border-white/10 border-dashed">
          <p className="text-gray-400 mb-2">📖 No subjects added yet</p>
          {!readOnly && (
            <p className="text-sm text-gray-500">Click "Add Subject" to get started</p>
          )}
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2 }}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-pink-500/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Subject Number Badge */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  {/* Subject Fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Subject Name */}
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        value={subject.name}
                        onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                        placeholder="Subject name (e.g., Data Structures)"
                        disabled={readOnly}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:border-pink-500 focus:outline-none text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    {/* Type */}
                    <div className="md:col-span-2">
                      <select
                        value={subject.type}
                        onChange={(e) => updateSubject(subject.id, 'type', e.target.value)}
                        disabled={readOnly}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:border-pink-500 focus:outline-none text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="theory">📘 Theory</option>
                        <option value="lab">🔬 Lab</option>
                      </select>
                    </div>
                    
                    {/* Internal Marks */}
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={subject.internalMarks}
                        onChange={(e) => updateSubject(subject.id, 'internalMarks', e.target.value)}
                        placeholder="Marks (optional)"
                        disabled={readOnly}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:border-pink-500 focus:outline-none text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">0-100 (optional)</p>
                    </div>
                    
                    {/* Credits (Optional) */}
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        min="0"
                        max="6"
                        value={subject.credits}
                        onChange={(e) => updateSubject(subject.id, 'credits', e.target.value)}
                        placeholder="Credits"
                        disabled={readOnly}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:border-pink-500 focus:outline-none text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Optional</p>
                    </div>
                    
                    {/* Delete Button */}
                    {!readOnly && (
                      <div className="md:col-span-1 flex items-center">
                        <button
                          type="button"
                          onClick={() => removeSubject(subject.id)}
                          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-colors text-red-400"
                          title="Remove subject"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
      
      {/* Summary */}
      {subjects.length > 0 && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">
              📊 Average Internal Marks ({subjects.filter(s => s.internalMarks).length}/{subjects.length} graded):
            </span>
            <span className="font-bold text-lg">
              {subjects.filter(s => s.internalMarks).length > 0
                ? (subjects.reduce((sum, s) => sum + (parseFloat(s.internalMarks) || 0), 0) / 
                   subjects.filter(s => s.internalMarks).length).toFixed(2)
                : 'Not graded yet'}
              {subjects.filter(s => s.internalMarks).length > 0 && '%'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectInputList;

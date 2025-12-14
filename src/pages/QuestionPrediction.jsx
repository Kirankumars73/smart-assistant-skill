import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import GradientButton from '../components/ui/GradientButton';
import { useAuth } from '../contexts/AuthContext';

const QuestionPrediction = () => {
  const { userRole } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Mock predicted questions
  const predictedQuestions = [
    { id: 1, question: 'Explain the backpropagation algorithm in neural networks', subject: 'Machine Learning', frequency: 5, importance: 95 },
    { id: 2, question: 'Describe AVL tree rotations with examples', subject: 'Data Structures', frequency: 4, importance: 88 },
    { id: 3, question: 'Compare React Hooks vs Class Components', subject: 'Web Development', frequency: 4, importance: 85 },
    { id: 4, question: 'What is the time complexity of QuickSort?', subject: 'Algorithms', frequency: 6, importance: 92 },
    { id: 5, question: 'Explain ACID properties in databases', subject: 'DBMS', frequency: 5, importance: 90 },
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      // Here you would typically send this to a Cloud Function for processing
    }
  };

  const filteredQuestions = selectedSubject === 'all' 
    ? predictedQuestions 
    : predictedQuestions.filter(q => q.subject === selectedSubject);

  const getImportanceColor = (importance) => {
    if (importance >= 90) return 'text-red-500 bg-red-500/20 border-red-500';
    if (importance >= 80) return 'text-orange-500 bg-orange-500/20 border-orange-500';
    return 'text-yellow-500 bg-yellow-500/20 border-yellow-500';
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              <span className="text-gradient">Question</span> Prediction
            </h1>
            <p className="text-xl text-gray-400">
              AI-powered analysis of high-weightage exam questions
            </p>
          </motion.div>

          {/* Upload Section (Faculty/Admin only) */}
          {(userRole === 'admin' || userRole === 'faculty') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-12"
            >
              <Card>
                <h2 className="text-2xl font-bold mb-6">Upload Past Papers</h2>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-pink-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-white mb-2">
                      {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-400">PDF or TXT files (MAX. 10MB)</p>
                  </label>
                </div>
                {uploadedFile && (
                  <div className="mt-6 flex items-center justify-between p-4 bg-green-500/10 border border-green-500 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-500 font-medium">{uploadedFile.name} uploaded</span>
                    </div>
                    <GradientButton size="sm">Process Paper</GradientButton>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* Filter & View */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Predicted Questions</h2>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="all">All Subjects</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="Data Structures">Data Structures</option>
                <option value="Web Development">Web Development</option>
                <option value="Algorithms">Algorithms</option>
                <option value="DBMS">DBMS</option>
              </select>
            </div>
          </motion.div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.map((q, index) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card hover>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                        #{index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-semibold text-gray-400">{q.subject}</span>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getImportanceColor(q.importance)}`}>
                          {q.importance}% Important
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{q.question}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                          </svg>
                          Appeared {q.frequency} times
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-12"
          >
            <Card gradient>
              <h2 className="text-2xl font-bold mb-6">Prediction Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-gradient mb-2">{predictedQuestions.length}</p>
                  <p className="text-gray-400">Total Questions</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-gradient mb-2">
                    {Math.round(predictedQuestions.reduce((sum, q) => sum + q.importance, 0) / predictedQuestions.length)}%
                  </p>
                  <p className="text-gray-400">Avg. Importance</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-gradient mb-2">5</p>
                  <p className="text-gray-400">Subjects Covered</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default QuestionPrediction;

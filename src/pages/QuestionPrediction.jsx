import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import GradientButton from '../components/ui/GradientButton';
import Input from '../components/ui/Input';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { generatePredictions } from '../services/questionPredictionService';
import { exportQuestionPredictionToPDF } from '../utils/questionPdfHelper';
import * as XLSX from 'xlsx';

const QuestionPrediction = () =>{
  const { userRole, hasFacultyAccess } = useAuth();
  const showToast = useToast();
  const { confirm, isOpen: isConfirmOpen, config: confirmConfig, handleConfirm, handleCancel } = useConfirm();
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [semester, setSemester] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [savedPredictions, setSavedPredictions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');

  // Fetch saved predictions from Firestore
  useEffect(() => {
    fetchSavedPredictions();
  }, []);

  const fetchSavedPredictions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'questions'));
      const preds = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedPredictions(preds);
    } catch (err) {
      console.error('Error fetching predictions:', err);
    }
  };

  // Handle CSV file upload and processing
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    if (!subjectName.trim()) {
      setError('Please enter a subject name before uploading');
      return;
    }

    if (!subjectCode.trim()) {
      setError('Please enter a subject code before uploading');
      return;
    }

    if (!semester.trim()) {
      setError('Please enter a semester before uploading');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read CSV file
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvText = event.target.result;
          
          // Generate predictions with metadata
          const result = generatePredictions(csvText, subjectName);
          result.subjectCode = subjectCode;
          result.semester = semester;
          setPredictions(result);

          // Save to Firestore
          if (hasFacultyAccess()) {
            await addDoc(collection(db, 'questions'), result);
            await fetchSavedPredictions();
          }

          setLoading(false);
        } catch (err) {
          setError(err.message || 'Error processing CSV file');
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Error reading file');
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err.message || 'Error uploading file');
      setLoading(false);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const template = [
      ['Question', 'Year', 'Module', 'Marks', 'Part', 'Scheme', 'subject_name'],
      ['Explain the concept of React Hooks', '2024', '1', '3', 'A', '2018', 'Web Development'],
      ['What are the differences between TCP and UDP?', '2023', '1', '3', 'A', '2018', 'Computer Networks'],
      ['Build a complete web application using MERN stack', '2024', '2', '10', 'B', '2018', 'Web Development'],
      ['Implement binary search tree operations', '2023', '2', '8', 'B', '2018', 'Data Structures'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Question Template');
    XLSX.writeFile(wb, 'question_prediction_template.csv');
  };

  // Get modules for filter
  const getModules = () => {
    if (!predictions) return [];
    return Object.keys(predictions.partA).map(m => m.replace('Module ', ''));
  };

  // Filter predictions by module
  const getFilteredPredictions = () => {
    if (!predictions || selectedModule === 'all') return predictions;

    const moduleKey = `Module ${selectedModule}`;
    return {
      ...predictions,
      partA: { [moduleKey]: predictions.partA[moduleKey] },
      partB: { [moduleKey]: predictions.partB[moduleKey] }
    };
  };

  const filteredPredictions = getFilteredPredictions();

  // Export question paper as formatted text document (fixed alignment)
  const exportQuestionPaper = () => {
    if (!predictions) return;

    // Create formatted text content with proper alignment
    let content = '';
    content += '================================================================================\n';
    content += '                       PREDICTED QUESTION PAPER                                 \n';
    content += '================================================================================\n\n';
    content += `Subject        : ${predictions.subjectName}\n`;
    content += `Subject Code   : ${predictions.subjectCode}\n`;
    content += `Semester       : ${predictions.semester}\n`;
    content += `Generated Date : ${new Date(predictions.generatedAt).toLocaleDateString()}\n\n`;
    content += '================================================================================\n\n';

    // Part A
    content += 'PART A - Compulsory Questions (3 marks each)\n';
    content += 'Answer ALL questions\n';
    content += '--------------------------------------------------------------------------------\n\n';

    Object.entries(predictions.partA).forEach(([module, questions]) => {
      content += `${module}:\n`;
      content += '\n';
      questions.forEach((q, idx) => {
        content += `   ${idx + 1}. ${q.question}\n`;
        content += `      [Probability: ${Math.round(q.probability * 100)}% | Frequency: ${q.frequency}x]\n\n`;
      });
    });

    // Part B
    content += '\n================================================================================\n\n';
    content += 'PART B - Answer ANY ONE from each module (14 marks total)\n';
    content += '--------------------------------------------------------------------------------\n\n';

    Object.entries(predictions.partB).forEach(([module, data]) => {
      content += `${module} (Total: ${data.totalMarks} marks):\n`;
      content += '\n';
      data.questions.forEach((q, idx) => {
        content += `   ${idx + 1}. (${q.marks} marks) ${q.question}\n`;
        content += `      [Probability: ${Math.round(q.probability * 100)}% | Frequency: ${q.frequency}x]\n\n`;
      });
      content += '   OR any other combination summing to 14 marks\n\n';
    });

    // Statistics
    content += '\n================================================================================\n\n';
    content += 'STATISTICS:\n\n';
    content += `   Total Questions Analyzed  : ${predictions.stats.totalQuestions}\n`;
    content += `   Part A Questions          : ${predictions.stats.partAQuestions}\n`;
    content += `   Part B Questions          : ${predictions.stats.partBQuestions}\n`;
    content += `   Modules Covered           : ${predictions.stats.modules}\n\n`;

    content += '================================================================================\n';
    content += 'Generated by Smart Academic Assistant - Question Prediction System\n';
    content += 'Based on historical question frequency, marks weightage, and recency analysis\n';
    content += '================================================================================\n';

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${predictions.subjectCode}_Sem${predictions.semester}_Predicted_Questions.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export question paper as PDF with logo
  const exportQuestionPaperAsPDF = async () => {
    if (!predictions) return;

    try {
      await exportQuestionPredictionToPDF(predictions);
      showToast('PDF exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('Failed to export PDF. Please try again.', 'error');
    }
  };

  // Export as JSON (alternative format)
  const exportAsJSON = () => {
    if (!predictions) return;

    const blob = new Blob([JSON.stringify(predictions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${predictions.subjectCode}_Sem${predictions.semester}_Predictions.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete prediction (faculty only)
const handleDeletePrediction = async (predictionId) => {
  if (!hasFacultyAccess()) return;

  const confirmed = await confirm({
    title: 'Delete Prediction',
    message: 'Are you sure you want to delete this prediction? This action cannot be undone. The prediction will be permanently removed.',
    confirmText: 'Delete',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, 'questions', predictionId));
    
    // If currently viewing this prediction, clear it
    if (predictions && predictions.id === predictionId) {
      setPredictions(null);
    }
    
    // Refresh the list
    await fetchSavedPredictions();
    
    showToast('Prediction deleted successfully!', 'success');
  } catch (err) {
    console.error('Error deleting prediction:', err);
    showToast('Error deleting prediction. Please try again.', 'error');
  }
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
              ML-powered analysis of high-importance exam questions
            </p>
          </motion.div>

          {/* Upload Section (Faculty/Admin only) */}
          {hasFacultyAccess() && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-12"
            >
              <Card>
                <h2 className="text-2xl font-bold mb-6">Upload Question Data</h2>
                
                {/* Subject Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Input
                    label="Subject Name"
                    placeholder="e.g., Web Development"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                  />
                  <Input
                    label="Subject Code"
                    placeholder="e.g., CS301"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                  />
                  <Input
                    label="Semester"
                    type="number"
                    placeholder="e.g., 5"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  />
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-pink-500 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={loading || !subjectName.trim() || !subjectCode.trim() || !semester.trim()}
                  />
                  <label htmlFor="file-upload" className={`cursor-pointer ${loading || !subjectName.trim() || !subjectCode.trim() || !semester.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-white mb-2">
                      {loading ? 'Processing...' : 'Click to upload CSV file'}
                    </p>
                    <p className="text-sm text-gray-400">CSV format with Question, Year, Module, Marks, Part columns</p>
                  </label>
                </div>

                {/* Download Template Button */}
                <div className="mt-6 flex justify-between items-center">
                  <button
                    onClick={downloadTemplate}
                    className="text-pink-400 hover:text-pink-300 underline text-sm"
                  >
                    📥 Download CSV Template
                  </button>
                  {loading && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
                      <span>Processing predictions...</span>
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                    <p className="text-red-500">⚠️ {error}</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* Predictions Display */}
          {predictions && (
            <>
              {/* Module Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="mb-8"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{predictions.subjectName}</h2>
                    <p className="text-gray-400 text-sm mt-1">
                      {predictions.subjectCode} • Semester {predictions.semester}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <GradientButton onClick={exportQuestionPaperAsPDF} size="sm">
                        📄 Download PDF
                      </GradientButton>
                      <button
                        onClick={exportQuestionPaper}
                        className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors text-sm font-semibold"
                      >
                        📝 Export Text
                      </button>
                      {hasFacultyAccess() && (
                        <>
                          <button
                            onClick={exportAsJSON}
                            className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors text-sm font-semibold"
                          >
                            📊 Export JSON
                          </button>
                          <button
                            onClick={() => handleDeletePrediction(predictions.id)}
                            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500 transition-colors text-sm font-semibold"
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                    </div>
                    <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                      className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="all">All Modules</option>
                      {getModules().map(m => (
                        <option key={m} value={m}>Module {m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>

              {/* Part A Predictions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mb-12"
              >
                <Card gradient>
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-gradient">Part A</span> 
                    <span className="text-gray-400 text-base">(Compulsory 3-mark questions)</span>
                  </h3>
                  
                  <div className="space-y-6">
                    {Object.entries(filteredPredictions.partA).map(([module, questions]) => (
                      <div key={module} className="border-l-4 border-pink-500 pl-6">
                        <h4 className="text-xl font-bold mb-3 text-pink-400">{module}</h4>
                        <div className="space-y-3">
                          {questions.map((q, idx) => (
                            <div key={idx} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <p className="text-white font-medium mb-2">{q.question}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span>📊 Probability: {Math.round(q.probability * 100)}%</span>
                                    <span>🔄 Frequency: {q.frequency}x</span>
                                    <span>📝 {q.marks} marks</span>
                                  </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  q.probability > 0.7 ? 'bg-red-500/20 text-red-500 border border-red-500' :
                                  q.probability > 0.5 ? 'bg-orange-500/20 text-orange-500 border border-orange-500' :
                                  'bg-yellow-500/20 text-yellow-500 border border-yellow-500'
                                }`}>
                                  {q.probability > 0.7 ? 'High' : q.probability > 0.5 ? 'Medium' : 'Low'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>

              {/* Part B Predictions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mb-12"
              >
                <Card gradient>
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-gradient">Part B</span>
                    <span className="text-gray-400 text-base">(Answer any one - 14 marks total)</span>
                  </h3>
                  
                  <div className="space-y-6">
                    {Object.entries(filteredPredictions.partB).map(([module, data]) => (
                      <div key={module} className="border-l-4 border-orange-500 pl-6">
                        <h4 className="text-xl font-bold mb-3 text-orange-400">
                          {module} <span className="text-sm text-gray-400">(Total: {data.totalMarks} marks)</span>
                        </h4>
                        <div className="space-y-3">
                          {data.questions.map((q, idx) => (
                            <div key={idx} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                                      {q.marks} marks
                                    </span>
                                    <p className="text-white font-medium">{q.question}</p>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span>📊 Probability: {Math.round(q.probability * 100)}%</span>
                                    <span>🔄 Frequency: {q.frequency}x</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-gray-500 text-sm italic">OR any other combination...</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>

              {/* Statistics Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <Card>
                  <h3 className="text-2xl font-bold mb-6">Prediction Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-4xl font-extrabold text-gradient mb-2">{predictions.stats.totalQuestions}</p>
                      <p className="text-gray-400">Total Questions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-extrabold text-gradient mb-2">{predictions.stats.partAQuestions}</p>
                      <p className="text-gray-400">Part A Questions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-extrabold text-gradient mb-2">{predictions.stats.partBQuestions}</p>
                      <p className="text-gray-400">Part B Questions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-extrabold text-gradient mb-2">{predictions.stats.modules}</p>
                      <p className="text-gray-400">Modules</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </>
          )}

          {/* Student Search Section */}
          {!hasFacultyAccess() && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-12"
            >
              <Card>
                <h2 className="text-2xl font-bold mb-6">Search Question Predictions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Input
                    label="Search by Subject Name"
                    placeholder="e.g., Web Development"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Semester</label>
                    <select
                      value={semesterFilter}
                      onChange={(e) => setSemesterFilter(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="all">All Semesters</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Saved Predictions List */}
          {!predictions && savedPredictions.filter(pred => {
            const matchesSearch = searchQuery === '' || 
              pred.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              pred.subjectCode?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSemester = semesterFilter === 'all' || pred.semester === semesterFilter;
            return matchesSearch && matchesSemester;
          }).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Card>
                <h2 className="text-2xl font-bold mb-6">
                  {hasFacultyAccess() ? 'Previously Generated Predictions' : 'Available Predictions'}
                </h2>
                <div className="space-y-4">
                  {savedPredictions.filter(pred => {
                    const matchesSearch = searchQuery === '' || 
                      pred.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      pred.subjectCode?.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesSemester = semesterFilter === 'all' || pred.semester === semesterFilter;
                    return matchesSearch && matchesSemester;
                  }).map((pred) => (
                    <div
                      key={pred.id}
                      className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1" onClick={() => setPredictions(pred)}>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{pred.subjectName}</h3>
                            <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs font-semibold">
                              {pred.subjectCode || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>📚 Semester {pred.semester || 'N/A'}</span>
                            <span>📊 {pred.stats.modules} modules</span>
                            <span>📝 {pred.stats.totalQuestions} questions</span>
                            <span>📅 {new Date(pred.generatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasFacultyAccess() && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrediction(pred.id);
                              }}
                              className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50 transition-colors"
                              title="Delete prediction"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <div className="text-pink-400" onClick={() => setPredictions(pred)}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Empty State */}
          {!predictions && savedPredictions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Card>
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h2 className="text-2xl font-bold mb-2">No Predictions Yet</h2>
                  <p className="text-gray-400 mb-6">
                    {hasFacultyAccess() 
                      ? 'Upload a CSV file with past exam questions to generate predictions.'
                      : 'Predictions will appear here once faculty uploads question data.'}
                  </p>
                  {hasFacultyAccess() && (
                    <GradientButton onClick={downloadTemplate}>
                      📥 Download CSV Template
                    </GradientButton>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
      />
    </div>
  );
};

export default QuestionPrediction;

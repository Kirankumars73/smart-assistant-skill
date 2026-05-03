import React, { useState, useEffect, useRef } from 'react';
import './QuestionPrediction.css';
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
import MLInsights from '../components/ui/MLInsights';  // Phase 2: ML insights display
import * as XLSX from 'xlsx';
import { parseSyllabus } from '../services/syllabusParser';  // Auto-parse syllabus format
import NoiseTexture from '../components/ui/NoiseTexture';
import FloatingOrbs from '../components/ui/FloatingOrbs';

const QuestionPrediction = () => {
  const { userRole, hasFacultyAccess, currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
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
  const [activePart, setActivePart] = useState('A');
  const [semesterFilter, setSemesterFilter] = useState('all');
  
  // Phase 2: Syllabus integration and AI features
  const [syllabus, setSyllabus] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(true);  // Enable AI by default
  const [showMLInsights, setShowMLInsights] = useState(true);  // Show ML features

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
          
          // Generate predictions with Phase 2 ML features
          const result = await generatePredictions(csvText, subjectName, syllabus, aiEnabled);
          result.subjectCode = subjectCode;
          result.semester = semester;
          setPredictions(result);

          // Save to Firestore automatically for all authenticated users
          try {
            console.log('" Attempting to save prediction to Firestore...');
            console.log(' Current User:', {
              uid: currentUser?.uid,
              email: currentUser?.email,
              emailVerified: currentUser?.emailVerified,
              isAnonymous: currentUser?.isAnonymous
            });
            console.log(' User Role:', userRole);
            console.log(' Is Gmail?', currentUser?.email?.endsWith('@gmail.com'));
            
            const docRef = await addDoc(collection(db, 'questions'), {
              ...result,
              createdAt: new Date().toISOString(),
              createdBy: currentUser?.uid || 'unknown',
              userEmail: currentUser?.email || 'unknown'
            });
            console.log(' Prediction saved with ID:', docRef.id);
            await fetchSavedPredictions();
          } catch (saveError) {
            console.error(' Error saving to Firestore:', saveError);
            console.error('S Error details:', {
              code: saveError.code,
              message: saveError.message,
              name: saveError.name
            });
            // Don't fail the whole operation if save fails
            setError(`Prediction generated but not saved: ${saveError.message}`);
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

  // TEST: Direct Firestore write
  const testFirestoreWrite = async () => {
    try {
      console.log(' Testing direct Firestore write...');
      const testDoc = await addDoc(collection(db, 'questions'), {
        test: true,
        timestamp: new Date().toISOString(),
        user: currentUser?.email
      });
      console.log(' TEST PASSED! Document created:', testDoc.id);
      alert(' Firebase write works! Document ID: ' + testDoc.id);
    } catch (err) {
      console.error(' TEST FAILED:', err);
      alert(' Test failed: ' + err.message);
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
    // CRITICAL: Return safe default structure if predictions is null
    if (!predictions || !predictions.partA || !predictions.partB) {
      return {
        partA: {},
        partB: {}
      };
    }
    
    if (selectedModule === 'all') {
      return predictions;
    }

    const moduleKey = `Module ${selectedModule}`;
    return {
      partA: predictions.partA[moduleKey] ? { [moduleKey]: predictions.partA[moduleKey] } : {},
      partB: predictions.partB[moduleKey] ? { [moduleKey]: predictions.partB[moduleKey] } : {},
      stats: predictions.stats
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
      showSuccess('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showError('Failed to export PDF. Please try again.');
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
    
    showSuccess('Prediction deleted successfully!');
  } catch (err) {
    console.error('Error deleting prediction:', err);
    showError('Error deleting prediction. Please try again.');
  }
};

  // Helper: Animated counter
  const AnimatedCounter = ({ value, duration = 1.5 }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      const target = parseInt(value) || 0;
      if (target === 0) return;
      let start = 0;
      const step = Math.ceil(target / (duration * 60));
      const timer = setInterval(() => {
        start += step;
        if (start >= target) { setCount(target); clearInterval(timer); }
        else setCount(start);
      }, 1000 / 60);
      return () => clearInterval(timer);
    }, [value, duration]);
    return <span className="ag-counter">{count}</span>;
  };

  // Helper: Orbit Ring SVG
  const OrbitRing = ({ size = 120 }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" className="ag-orbit-ring absolute -left-4 -top-4 opacity-30 pointer-events-none">
      <defs>
        <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke="url(#orbitGrad)" strokeWidth="1.5" strokeDasharray="8 6"/>
    </svg>
  );

  // Helper: get probability color class
  const getProbClass = (p) => p > 0.7 ? 'high' : p > 0.4 ? 'medium' : 'low';
  const getProbColor = (p) => p > 0.7 ? '#4ade80' : p > 0.4 ? '#fbbf24' : '#f87171';

  return (
    <div className="ag-page">
      <Navbar />
      <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
            className="mb-14"
          >
            <h1 className="ag-heading text-4xl md:text-5xl font-bold mb-3 text-white">
              Question <span style={{ color: '#6366f1' }}>Prediction</span>
            </h1>
            <p className="ag-body text-base text-slate-400" style={{ maxWidth: 480 }}>
              ML-powered analysis engine  predicting high-importance exam questions with pattern detection and frequency mapping.
            </p>
          </motion.div>

          {/* Upload Section (Faculty/Admin only) */}
          {hasFacultyAccess() && (
            <motion.div
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.15 }}
              className="mb-14"
            >
              <div className="ag-card ag-gradient-border ag-levitate p-8">
                <h2 className="ag-heading text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <span style={{ color: '#22d3ee' }}></span> Upload Question Data
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
                  {[{l:'Subject Name',p:'e.g., Web Development',v:subjectName,fn:setSubjectName},
                    {l:'Subject Code',p:'e.g., CS301',v:subjectCode,fn:setSubjectCode},
                    {l:'Semester',p:'e.g., 5',v:semester,fn:setSemester,t:'number'}].map(f=>(
                    <div key={f.l}>
                      <div className="ag-input-label">{f.l}</div>
                      <input className="ag-input" type={f.t||'text'} placeholder={f.p} value={f.v} onChange={e=>f.fn(e.target.value)}/>
                    </div>
                  ))}
                </div>

                <div className="ag-dropzone p-10 text-center relative mb-6">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                    <OrbitRing size={200}/>
                  </div>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="file-upload"
                    disabled={loading || !subjectName.trim() || !subjectCode.trim() || !semester.trim()}/>
                  <label htmlFor="file-upload" className={`cursor-pointer block ${loading || !subjectName.trim() || !subjectCode.trim() || !semester.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <div className="mb-3">
                      <svg className="w-12 h-12 mx-auto" style={{color:'#6366f1'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                    </div>
                    <p className="ag-heading text-sm font-bold text-white mb-1">{loading ? 'Processing...' : 'Drop CSV or click to upload'}</p>
                    <p className="text-xs text-slate-500">Question, Year, Module, Marks, Part columns required</p>
                  </label>
                </div>

                <div className="mb-5">
                  <div className="ag-input-label">S Syllabus (Optional  JSON)</div>
                  <input type="file" accept=".json" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const rawData = JSON.parse(event.target.result);
                          const parsedSyllabus = parseSyllabus(rawData);
                          setSyllabus(parsedSyllabus);
                          showSuccess('Syllabus loaded!');
                        } catch (err) { showError('Invalid syllabus JSON'); }
                      };
                      reader.readAsText(file);
                    }
                  }} className="ag-input text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/15 file:text-indigo-400 hover:file:bg-indigo-500/25 cursor-pointer"/>
                </div>

                <div className="flex flex-wrap items-center gap-5 p-4 rounded-xl" style={{background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.08)'}}>
                  {[{c:aiEnabled,s:setAiEnabled,t:' AI Clustering'},{c:showMLInsights,s:setShowMLInsights,t:'S ML Insights'}].map(x=>(
                    <label key={x.t} className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition">
                      <input type="checkbox" checked={x.c} onChange={e=>x.s(e.target.checked)} className="w-3.5 h-3.5 rounded accent-indigo-500"/>
                      <span>{x.t}</span>
                    </label>
                  ))}
                  {syllabus && <span className="text-xs px-3 py-1 rounded-full" style={{background:'rgba(74,222,128,0.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.15)'}}>S Syllabus</span>}
                </div>

                <div className="mt-5 flex justify-between items-center">
                  <button onClick={downloadTemplate} className="text-xs text-indigo-400 hover:text-indigo-300 transition">S Download Template</button>
                  {loading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:'linear'}} className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"/>
                      Processing...
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-5 p-3 rounded-xl text-sm" style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)',color:'#fca5a5'}}>
                     {error}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Predictions Display */}
          {predictions && (
            <>
              {/* Back Button */}
              <motion.button initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{type:'spring',stiffness:100}}
                onClick={() => setPredictions(null)}
                className="ag-btn flex items-center gap-2 mb-8">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                Back
              </motion.button>

              {/* Header + Controls */}
              <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} transition={{type:'spring',stiffness:70,delay:0.1}} className="mb-10">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div>
                    <h2 className="ag-heading text-2xl font-bold text-white">{predictions.subjectName}</h2>
                    <p className="text-sm text-slate-500 mt-1 ag-body">{predictions.subjectCode} · Semester {predictions.semester}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={exportQuestionPaperAsPDF} className="ag-btn-primary ag-btn">PDF</button>
                    <button onClick={exportQuestionPaper} className="ag-btn">Text</button>
                    {hasFacultyAccess() && (
                      <>
                        <button onClick={exportAsJSON} className="ag-btn">JSON</button>
                        <button onClick={() => handleDeletePrediction(predictions.id)} className="ag-btn ag-btn-danger">Delete</button>
                      </>
                    )}
                    <select value={selectedModule} onChange={e=>setSelectedModule(e.target.value)} className="ag-input text-sm" style={{width:'auto',minWidth:140}}>
                      <option value="all">All Modules</option>
                      {getModules().map(m => <option key={m} value={m}>Module {m}</option>)}
                    </select>
                  </div>
                </div>

                {/* Part A / B Pill Toggle */}
                <div className="mt-6">
                  <div className="ag-pill relative">
                    <motion.div className="absolute top-1 bottom-1 rounded-full" style={{background:'linear-gradient(135deg,#6366f1,#4f46e5)',width:'calc(50% - 4px)',zIndex:1}}
                      animate={{x: activePart === 'A' ? 4 : 'calc(100% + 4px)'}} transition={{type:'spring',stiffness:300,damping:30}}/>
                    <button className={`ag-pill-btn ${activePart==='A'?'ag-pill-btn--active':''}`} onClick={()=>setActivePart('A')}>Part A</button>
                    <button className={`ag-pill-btn ${activePart==='B'?'ag-pill-btn--active':''}`} onClick={()=>setActivePart('B')}>Part B</button>
                  </div>
                </div>
              </motion.div>

              {/* AG Question Cards with Pill Toggle */}
              {(() => {
                const QCard = ({ q, idx, delay = 0 }) => (
                  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:delay+idx*0.05,type:'spring',stiffness:100}}
                    className="ag-card p-4 flex gap-3 items-stretch" style={{marginBottom:10}}>
                    <div className={`ag-glow-bar ag-glow-bar--${getProbClass(q.probability)}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="ag-body text-sm text-slate-100 font-medium leading-relaxed mb-2 break-words">{q.question}</p>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="ag-freq-badge">{q.frequency}x</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${q.difficulty?.difficulty==='EASY'?'ag-chip-easy':q.difficulty?.difficulty==='HARD'?'ag-chip-hard':'ag-chip-medium'}`}>
                          {q.difficulty?.difficulty || 'MEDIUM'}
                        </span>
                        {q.marks && <span className="text-xs text-slate-500">{q.marks}m</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="ag-prob-bar-track flex-1">
                          <motion.div className="ag-prob-bar-fill" initial={{width:0}} animate={{width:`${Math.round(q.probability*100)}%`}}
                            transition={{duration:1,delay:delay+idx*0.05+0.3}} style={{background:getProbColor(q.probability)}}/>
                        </div>
                        <span className="ag-counter text-xs" style={{color:getProbColor(q.probability),minWidth:32,textAlign:'right'}}>{Math.round(q.probability*100)}%</span>
                      </div>
                      {showMLInsights && <MLInsights question={q} compact/>}
                    </div>
                  </motion.div>
                );
                return (
                  <AnimatePresence mode="wait">
                    {activePart === 'A' ? (
                      <motion.div key="partA" initial={{opacity:0,x:-30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:30}} transition={{duration:0.3}} className="mb-10">
                        {filteredPredictions?.partA && Object.entries(filteredPredictions.partA).map(([module, questions], mIdx) => {
                          const modNum = module.replace('Module ','');
                          return (
                            <div key={module} className="mb-10">
                              <div className="ag-module-header relative mb-5">
                                <OrbitRing size={80}/>
                                <span className="ag-module-num-bg">{modNum}</span>
                                <h3 className="ag-heading text-lg font-bold text-white relative z-10">{module}</h3>
                                <p className="text-xs text-slate-500 relative z-10">Compulsory · 3 marks each</p>
                              </div>
                              {questions.map((q,idx) => <QCard key={idx} q={q} idx={idx} delay={mIdx*0.15}/>)}
                            </div>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <motion.div key="partB" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}} transition={{duration:0.3}} className="mb-10">
                        {filteredPredictions?.partB && Object.entries(filteredPredictions.partB).map(([module, data], mIdx) => {
                          const modNum = module.replace('Module ','');
                          return (
                            <div key={module} className="mb-10">
                              <div className="ag-module-header relative mb-5">
                                <OrbitRing size={80}/>
                                <span className="ag-module-num-bg">{modNum}</span>
                                <h3 className="ag-heading text-lg font-bold text-white relative z-10">{module}</h3>
                                <p className="text-xs text-slate-500 relative z-10">14 marks · Choose Set A or B</p>
                              </div>
                              <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                                <span className="ag-freq-badge" style={{background:'rgba(34,211,238,0.1)',color:'#22d3ee',borderColor:'rgba(34,211,238,0.2)'}}>SET A</span>
                                {data.setA?.totalMarks || 0} marks
                              </div>
                              {data.setA?.questions?.map((q,idx) => <QCard key={`a${idx}`} q={q} idx={idx} delay={mIdx*0.15}/>)}
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px" style={{background:'rgba(99,102,241,0.15)'}}/>
                                <span className="ag-heading text-xs text-slate-600 tracking-widest">OR</span>
                                <div className="flex-1 h-px" style={{background:'rgba(99,102,241,0.15)'}}/>
                              </div>
                              <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                                <span className="ag-freq-badge" style={{background:'rgba(74,222,128,0.1)',color:'#4ade80',borderColor:'rgba(74,222,128,0.2)'}}>SET B</span>
                                {data.setB?.totalMarks || 0} marks
                              </div>
                              {data.setB?.questions?.map((q,idx) => <QCard key={`b${idx}`} q={q} idx={idx} delay={mIdx*0.15+0.2}/>)}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                );
              })()}

              {/* Stats  4 Floating Cards */}
              <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:0.4,type:'spring',stiffness:60}} className="mb-10">
                <h3 className="ag-heading text-lg font-bold text-white mb-5">Analysis Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {label:'Total Questions',value:predictions.stats.totalQuestions,color:'#6366f1'},
                    {label:'Part A',value:predictions.stats.partAQuestions,color:'#22d3ee'},
                    {label:'Part B',value:predictions.stats.partBQuestions,color:'#4ade80'},
                    {label:'Modules',value:predictions.stats.modules,color:'#fbbf24'}
                  ].map((s,i) => (
                    <motion.div key={s.label} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.5+i*0.1}} className="ag-stat-card">
                      <div className="ag-stat-card-inner ag-card ag-gradient-border p-5 text-center">
                        <p className="ag-counter text-3xl font-bold mb-1" style={{color:s.color}}><AnimatedCounter value={s.value}/></p>
                        <p className="ag-body text-xs text-slate-500">{s.label}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </>
          )}

          {/* Student Search */}
          {!hasFacultyAccess() && (
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2,type:'spring',stiffness:80}} className="mb-12">
              <div className="ag-card p-6">
                <h2 className="ag-heading text-xl font-bold text-white mb-5">Search Predictions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <div className="ag-input-label">Subject Name</div>
                    <input className="ag-input" placeholder="e.g., Web Development" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
                  </div>
                  <div>
                    <div className="ag-input-label">Semester</div>
                    <select value={semesterFilter} onChange={e=>setSemesterFilter(e.target.value)} className="ag-input">
                      <option value="all">All Semesters</option>
                      {[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Saved Predictions  Horizontal Scroll Cards */}
          {!predictions && savedPredictions.filter(pred => {
            const matchesSearch = searchQuery === '' || pred.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) || pred.subjectCode?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSemester = semesterFilter === 'all' || pred.semester === semesterFilter;
            return matchesSearch && matchesSemester;
          }).length > 0 && (
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3,type:'spring',stiffness:70}}>
              <h2 className="ag-heading text-xl font-bold text-white mb-5">
                {hasFacultyAccess() ? 'Previous Predictions' : 'Available Predictions'}
              </h2>
              <div className="ag-saved-scroll">
                {savedPredictions.filter(pred => {
                  const matchesSearch = searchQuery === '' || pred.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) || pred.subjectCode?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesSemester = semesterFilter === 'all' || pred.semester === semesterFilter;
                  return matchesSearch && matchesSemester;
                }).map((pred) => (
                  <motion.div key={pred.id} whileHover={{y:-4}} className="ag-saved-card ag-card cursor-pointer" onClick={()=>setPredictions(pred)}>
                    <div className="ag-saved-card-gradient"/>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="ag-heading text-sm font-bold text-white truncate">{pred.subjectName}</h3>
                        {hasFacultyAccess() && (
                          <button onClick={e=>{e.stopPropagation();handleDeletePrediction(pred.id);}} className="text-red-400 hover:text-red-300 p-1 rounded transition" title="Delete">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        )}
                      </div>
                      <span className="ag-freq-badge mb-3 inline-block">{pred.subjectCode || 'N/A'}</span>
                      <div className="space-y-1 text-xs text-slate-500 ag-body">
                        <div>Sem {pred.semester || '?'}  {pred.stats?.modules || 0} modules</div>
                        <div>{pred.stats?.totalQuestions || 0} questions</div>
                        <div>{pred.generatedAt ? new Date(pred.generatedAt).toLocaleDateString() : ''}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!predictions && savedPredictions.length === 0 && (
            <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:0.3,type:'spring',stiffness:60}}>
              <div className="ag-card ag-gradient-border p-12 text-center">
                <div className="text-5xl mb-4 opacity-40"></div>
                <h2 className="ag-heading text-xl font-bold text-white mb-2">No Predictions Yet</h2>
                <p className="ag-body text-sm text-slate-500 mb-6 max-w-md mx-auto">
                  {hasFacultyAccess() ? 'Upload a CSV file with past exam questions to generate ML-powered predictions.' : 'Predictions will appear here once faculty uploads question data.'}
                </p>
                {hasFacultyAccess() && (
                  <button onClick={downloadTemplate} className="ag-btn ag-btn-primary">x Download CSV Template</button>
                )}
              </div>
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

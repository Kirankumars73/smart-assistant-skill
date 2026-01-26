import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import GradientButton from '../components/ui/GradientButton';
import Input from '../components/ui/Input';
import {
  generateNotes,
  generateDiagram,
  generatePracticeQuestions,
  generateStudyPlan,
  generateCompleteMaterial
} from '../services/studyMaterialService';
import mermaid from 'mermaid';

const StudyMaterialGenerator = () => {
  const { userRole } = useAuth();
  const { showSuccess, showError } = useToast();
  
  // Form state
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState({
    notes: true,
    diagram: true,
    questions: true,
    studyPlan: true
  });
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');
  const [generatedMaterials, setGeneratedMaterials] = useState(null);
  
  // Settings
  const [questionCount, setQuestionCount] = useState(10);
  const [studyDays, setStudyDays] = useState(7);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  
  // Diagram ref for Mermaid rendering
  const diagramRef = useRef(null);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        primaryColor: '#dbeafe',      // Light blue background
        primaryTextColor: '#1f2937',  // Dark gray text (readable!)
        primaryBorderColor: '#3b82f6', // Blue border
        lineColor: '#6366f1',         // Indigo lines
        secondaryColor: '#fef3c7',    // Light yellow background
        secondaryTextColor: '#1f2937', // Dark gray text
        tertiaryColor: '#e0e7ff',     // Light purple background
        tertiaryTextColor: '#1f2937', // Dark gray text
        noteBkgColor: '#dbeafe',
        noteTextColor: '#1f2937',
        nodeBorder: '#3b82f6',
        clusterBkg: '#f3f4f6',
        clusterBorder: '#6366f1',
        defaultLinkColor: '#6366f1',
        titleColor: '#1f2937',
        edgeLabelBackground: '#ffffff',
        actorBorder: '#3b82f6',
        actorBkg: '#dbeafe',
        actorTextColor: '#1f2937',
        signalColor: '#1f2937',
        signalTextColor: '#1f2937',
        labelBoxBkgColor: '#dbeafe',
        labelBoxBorderColor: '#3b82f6',
        labelTextColor: '#1f2937'
      }
    });
  }, []);

  // Render Mermaid diagram when generated
  useEffect(() => {
    if (generatedMaterials?.diagram?.success && diagramRef.current) {
      renderMermaidDiagram();
    }
  }, [generatedMaterials?.diagram, activeTab]);

  const renderMermaidDiagram = async () => {
    if (!diagramRef.current || !generatedMaterials?.diagram?.mermaidCode) return;

    try {
      // Basic validation before rendering
      const code = generatedMaterials.diagram.mermaidCode;
      
      // Check for basic structure
      if (!code.includes('graph')) {
        throw new Error('Invalid Mermaid syntax: Missing graph declaration');
      }

      // Attempt to render
      const { svg } = await mermaid.render(
        `mermaid-${Date.now()}`,
        code
      );
      diagramRef.current.innerHTML = svg;
      console.log('✅ Mermaid diagram rendered successfully');
      
    } catch (error) {
      console.error('❌ Error rendering Mermaid diagram:', error);
      
      // Enhanced error display with detailed information
      const errorDetails = error.message || 'Unknown error';
      const mermaidCode = generatedMaterials.diagram.mermaidCode;
      
      diagramRef.current.innerHTML = `
        <div class="p-6 bg-red-500/10 border-2 border-red-500 rounded-lg">
          <div class="flex items-start gap-3 mb-4">
            <div class="text-2xl">⚠️</div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-red-400 mb-2">Diagram Rendering Failed</h3>
              <p class="text-red-300 text-sm mb-3">
                The AI generated invalid Mermaid syntax. This happens when special characters or complex labels are used.
              </p>
              <div class="bg-red-900/30 border border-red-500/50 rounded p-3 mb-3">
                <p class="text-xs text-red-200 font-mono">
                  <strong>Error:</strong> ${errorDetails}
                </p>
              </div>
            </div>
          </div>
          
          <details class="mb-4">
            <summary class="cursor-pointer text-sm text-red-300 hover:text-red-200 font-semibold mb-2">
              📄 View Generated Code
            </summary>
            <pre class="mt-2 p-3 bg-gray-900 border border-gray-700 rounded text-xs overflow-auto max-h-48 text-gray-300">${mermaidCode}</pre>
          </details>
          
          <div class="flex gap-3">
            <button 
              onclick="window.location.reload()" 
              class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              🔄 Regenerate Diagram
            </button>
            <button 
              onclick="navigator.clipboard.writeText(\`${mermaidCode.replace(/`/g, '\\`')}\`).then(() => alert('Code copied!'))" 
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              📋 Copy Code
            </button>
          </div>
          
          <div class="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
            <p class="text-xs text-blue-300">
              💡 <strong>Tip:</strong> Try regenerating with a simpler topic name, or manually edit the code in a Mermaid editor.
            </p>
          </div>
        </div>
      `;
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      showError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setGeneratedMaterials(null);

    try {
      const result = await generateCompleteMaterial(topic, {
        subject,
        semester,
        includeDiagram: selectedMaterials.diagram,
        includeQuestions: selectedMaterials.questions,
        includeStudyPlan: selectedMaterials.studyPlan,
        questionCount,
        studyDays,
        hoursPerDay
      });

      if (result.success) {
        setGeneratedMaterials(result.materials);
        showSuccess('Study materials generated successfully!');
        setActiveTab('notes'); // Switch to notes tab
      } else {
        showError(result.error || 'Failed to generate materials');
      }
    } catch (error) {
      console.error('Generation error:', error);
      showError('An error occurred while generating materials');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadNotes = () => {
    if (!generatedMaterials?.notes?.notes) return;

    const content = `
# ${topic}
${subject ? `Subject: ${subject}` : ''}
${semester ? `Semester: ${semester}` : ''}
Generated: ${new Date().toLocaleString()}

${generatedMaterials.notes.notes}
    `.trim();

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '_')}_Notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadQuestions = () => {
    if (!generatedMaterials?.questions?.questions) return;

    const content = JSON.stringify(generatedMaterials.questions, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '_')}_Practice_Questions.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadStudyPlan = () => {
    if (!generatedMaterials?.studyPlan?.studyPlan) return;

    const content = JSON.stringify(generatedMaterials.studyPlan, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '_')}_Study_Plan.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              <span className="text-gradient">AI Study</span> Material Generator
            </h1>
            <p className="text-xl text-gray-400">
              Generate comprehensive notes, diagrams, practice questions, and study plans powered by AI
            </p>
          </motion.div>

          {/* Generator Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8"
          >
            <Card>
              <h2 className="text-2xl font-bold mb-6">Generate Study Materials</h2>
              
              {/* Topic Input */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Input
                  label="Topic *"
                  placeholder="e.g., Binary Search Trees"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <Input
                  label="Subject (Optional)"
                  placeholder="e.g., Data Structures"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <Input
                  label="Semester (Optional)"
                  placeholder="e.g., 5"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>

              {/* Material Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Materials to Generate
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'notes', label: '📝 Notes', icon: '📝' },
                    { key: 'diagram', label: '📊 Diagram', icon: '📊' },
                    { key: 'questions', label: '❓ Practice Questions', icon: '❓' },
                    { key: 'studyPlan', label: '📅 Study Plan', icon: '📅' }
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setSelectedMaterials(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedMaterials[key]
                          ? 'border-pink-500 bg-pink-500/10'
                          : 'border-gray-700 bg-gray-800/50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{icon}</div>
                      <div className="text-sm font-semibold">{label.replace(icon + ' ', '')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings */}
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-medium text-gray-300 mb-3">
                  ⚙️ Advanced Settings
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-800/30 rounded-lg">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Practice Questions Count</label>
                    <input
                      type="number"
                      min="5"
                      max="20"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Study Days</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={studyDays}
                      onChange={(e) => setStudyDays(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Hours Per Day</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                    />
                  </div>
                </div>
              </details>

              {/* Generate Button */}
              <GradientButton
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Generating with AI...</span>
                  </div>
                ) : (
                  '✨ Generate Study Materials'
                )}
              </GradientButton>
            </Card>
          </motion.div>

          {/* Generated Materials Display */}
          <AnimatePresence>
            {generatedMaterials && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
              >
                <Card gradient>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Generated Materials</h2>
                    <div className="text-sm text-gray-400">
                      Topic: <span className="text-pink-400 font-semibold">{generatedMaterials.topic}</span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
                    {generatedMaterials.notes?.success && (
                      <button
                        onClick={() => setActiveTab('notes')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          activeTab === 'notes'
                            ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        📝 Notes
                      </button>
                    )}
                    {generatedMaterials.diagram?.success && (
                      <button
                        onClick={() => setActiveTab('diagram')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          activeTab === 'diagram'
                            ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        📊 Diagram
                      </button>
                    )}
                    {generatedMaterials.questions?.success && (
                      <button
                        onClick={() => setActiveTab('questions')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          activeTab === 'questions'
                            ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        ❓ Practice Questions ({generatedMaterials.questions.totalQuestions})
                      </button>
                    )}
                    {generatedMaterials.studyPlan?.success && (
                      <button
                        onClick={() => setActiveTab('studyPlan')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          activeTab === 'studyPlan'
                            ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        📅 Study Plan ({generatedMaterials.studyPlan.studyPlan.totalHours}hrs)
                      </button>
                    )}
                  </div>

                  {/* Content Display */}
                  <div className="min-h-[400px]">
                    {/* Notes Tab */}
                    {activeTab === 'notes' && generatedMaterials.notes?.success && (
                      <div>
                        <div className="flex justify-end mb-4">
                          <button
                            onClick={downloadNotes}
                            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors"
                          >
                            💾 Download Notes
                          </button>
                        </div>
                        <div className="prose prose-invert max-w-none">
                          <pre className="whitespace-pre-wrap bg-gray-800/50 p-6 rounded-lg text-gray-200 leading-relaxed">
                            {generatedMaterials.notes.notes}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Diagram Tab */}
                    {activeTab === 'diagram' && generatedMaterials.diagram?.success && (
                      <div>
                        <div className="flex justify-center p-8 bg-white rounded-lg">
                          <div ref={diagramRef} className="w-full" />
                        </div>
                      </div>
                    )}

                    {/* Questions Tab */}
                    {activeTab === 'questions' && generatedMaterials.questions?.success && (
                      <div>
                        <div className="flex justify-end mb-4">
                          <button
                            onClick={downloadQuestions}
                            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors"
                          >
                            💾 Download Questions
                          </button>
                        </div>
                        <div className="space-y-6">
                          {generatedMaterials.questions.questions.map((q, idx) => (
                            <div key={idx} className="bg-gray-800/50 rounded-lg p-6">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="text-lg font-bold text-white">Q{idx + 1}. {q.question}</h3>
                                <div className="flex gap-2">
                                  <span className="px-2 py-1 rounded bg-pink-500/20 text-pink-400 text-xs font-semibold">
                                    {q.marks} marks
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    q.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                                    q.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {q.difficulty}
                                  </span>
                                </div>
                              </div>
                              {q.options && (
                                <div className="mb-3 space-y-2">
                                  {q.options.map((opt, i) => (
                                    <div key={i} className="text-gray-300">{opt}</div>
                                  ))}
                                </div>
                              )}
                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm text-pink-400 font-semibold">
                                  Show Answer & Explanation
                                </summary>
                                <div className="mt-2 p-3 bg-gray-900/50 rounded">
                                  <p className="text-green-400 font-semibold mb-2">Answer: {q.correctAnswer || q.answer}</p>
                                  <p className="text-gray-300 text-sm">{q.explanation}</p>
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Study Plan Tab */}
                    {activeTab === 'studyPlan' && generatedMaterials.studyPlan?.success && (
                      <div>
                        <div className="flex justify-end mb-4">
                          <button
                            onClick={downloadStudyPlan}
                            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors"
                          >
                            💾 Download Study Plan
                          </button>
                        </div>
                        <div className="space-y-6">
                          {/* Overview */}
                          <div className="bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/30 rounded-lg p-6">
                            <h3 className="text-xl font-bold mb-3 text-pink-400">📋 Overview</h3>
                            <p className="text-gray-300">{generatedMaterials.studyPlan.studyPlan.overview}</p>
                          </div>

                          {/* Daily Breakdown */}
                          <div>
                            <h3 className="text-xl font-bold mb-4">📅 Daily Schedule</h3>
                            <div className="space-y-4">
                              {generatedMaterials.studyPlan.studyPlan.days.map((day, idx) => (
                                <div key={idx} className="bg-gray-800/50 rounded-lg p-6">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-lg font-bold text-white">{day.title}</h4>
                                    <span className="text-sm text-gray-400">{day.hours} hours</span>
                                  </div>
                                  <div className="mb-3">
                                    <p className="text-sm text-gray-400 mb-2">Topics:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {day.topics.map((topic, i) => (
                                        <span key={i} className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs">
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="mb-3">
                                    <p className="text-sm text-gray-400 mb-2">Activities:</p>
                                    <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                                      {day.activities.map((activity, i) => (
                                        <li key={i}>{activity}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded">
                                    <p className="text-green-400 text-sm">
                                      ✓ Milestone: {day.milestone}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Resources & Tips */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                              <h3 className="text-lg font-bold mb-3 text-blue-400">📚 Resources</h3>
                              <ul className="list-disc list-inside text-gray-300 text-sm space-y-2">
                                {generatedMaterials.studyPlan.studyPlan.resources.map((resource, i) => (
                                  <li key={i}>{resource}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6">
                              <h3 className="text-lg font-bold mb-3 text-orange-400">💡 Study Tips</h3>
                              <ul className="list-disc list-inside text-gray-300 text-sm space-y-2">
                                {generatedMaterials.studyPlan.studyPlan.tips.map((tip, i) => (
                                  <li key={i}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default StudyMaterialGenerator;

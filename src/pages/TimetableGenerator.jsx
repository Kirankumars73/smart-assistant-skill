import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import GradientButton from '../components/ui/GradientButton';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import * as TimetableService from '../services/timetableService';
import { 
  exportToExcel, 
  exportToText, 
  downloadTextFile, 
  exportToJSON,
  detectConflicts,
  validateConfiguration 
} from '../utils/timetableHelpers';

const TimetableGenerator = () => {
  const { hasFacultyAccess, currentUser } = useAuth();
  
  // Wizard step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;
  
  // Configuration state
  const [config, setConfig] = useState({
    department: '',
    scheme: '',
    semester: '',
    rows: 5,  // days
    cols: 6,  // periods
    academicYear: ''
  });
  
  // Faculty management
  const [faculties, setFaculties] = useState([]);
  const [newFaculty, setNewFaculty] = useState('');
  
  // Class management
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState('');
  
  // Subject management
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState({ name: '', type: 'theory' });
  
  // Assignment configuration
  const [assignments, setAssignments] = useState([]);
  const [currentAssignment, setCurrentAssignment] = useState({
    className: '',
    subjectName: '',
    facultyName: '',
    weeklyLimit: 3,
    isLab: false,
    consecutivePeriods: 1,
    multiFaculty: false,
    additionalFaculties: []
  });
  
  // Manual assignments
  const [manualAssignments, setManualAssignments] = useState([]);
  const [manualEntry, setManualEntry] = useState({
    facultyName: '',
    className: '',
    subjectName: '',
    day: 1,
    period: 1
  });
  
  // Generated timetable
  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Saved timetables
  const [savedTimetables, setSavedTimetables] = useState([]);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [viewMode, setViewMode] = useState('view'); // 'create' or 'view' - default to view for all users
  
  // Search/filter state
  const [searchFilters, setSearchFilters] = useState({
    semester: '',
    className: '',
    department: ''
  });
  
  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [timetableToDelete, setTimetableToDelete] = useState(null);
  
  // Load saved timetables on mount
  useEffect(() => {
    fetchSavedTimetables();
  }, []);
  
  const fetchSavedTimetables = async () => {
    try {
      const timetablesRef = collection(db, 'timetables');
      const snapshot = await getDocs(timetablesRef);
      const timetablesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedTimetables(timetablesList);
    } catch (error) {
      console.error('Error fetching timetables:', error);
    }
  };
  
  // Filter timetables based on search
  const getFilteredTimetables = () => {
    return savedTimetables.filter(tt => {
      const matchesSemester = !searchFilters.semester || tt.semester?.toLowerCase().includes(searchFilters.semester.toLowerCase());
      const matchesDepartment = !searchFilters.department || tt.department?.toLowerCase().includes(searchFilters.department.toLowerCase());
      const matchesClass = !searchFilters.className || 
        tt.classes?.some(c => c.toLowerCase().includes(searchFilters.className.toLowerCase()));
      
      return matchesSemester && matchesDepartment && matchesClass;
    });
  };
  
  // Load timetable for editing
  const loadTimetableForEdit = (timetable) => {
    setConfig({
      department: timetable.department || '',
      scheme: timetable.scheme || '',
      semester: timetable.semester || '',
      rows: timetable.rows || 5,
      cols: timetable.cols || 6,
      academicYear: timetable.academicYear || ''
    });
    
    setFaculties(timetable.faculties || []);
    setClasses(timetable.classes || []);
    setSubjects(timetable.subjects || []);
    setAssignments(timetable.assignments || []);
    setManualAssignments(timetable.manualAssignments || []);
    
    if (timetable.facultyTimetables && timetable.classTimetables) {
      setGeneratedTimetable({
        success: true,
        facultyTimetables: timetable.facultyTimetables,
        classTimetables: timetable.classTimetables
      });
    }
    
    setSelectedTimetable(timetable);
    setViewMode('create');
    setCurrentStep(7); // Go to generate step to view
  };
  
  // Delete timetable
  const confirmDelete = (timetableId) => {
    setTimetableToDelete(timetableId);
    setDeleteModalOpen(true);
  };
  
  const handleDelete = async () => {
    if (!timetableToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'timetables', timetableToDelete));
      alert('Timetable deleted successfully!');
      fetchSavedTimetables();
      setDeleteModalOpen(false);
      setTimetableToDelete(null);
    } catch (error) {
      console.error('Error deleting timetable:', error);
      alert('Failed to delete timetable: ' + error.message);
    }
  };
  
  // Update existing timetable
  const updateTimetable = async () => {
    if (!generatedTimetable || !selectedTimetable) {
      alert('No timetable to update');
      return;
    }
    
    try {
      const timetableData = {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.uid,
        updatedByEmail: currentUser.email,
        faculties,
        classes,
        subjects,
        assignments,
        manualAssignments,
        facultyTimetables: generatedTimetable.facultyTimetables,
        classTimetables: generatedTimetable.classTimetables
      };
      
      await updateDoc(doc(db, 'timetables', selectedTimetable.id), timetableData);
      alert('Timetable updated successfully!');
      fetchSavedTimetables();
      setSelectedTimetable(null);
    } catch (error) {
      console.error('Error updating timetable:', error);
      alert('Failed to update timetable: ' + error.message);
    }
  };
  
  // Reset form for new timetable
  const startNewTimetable = () => {
    setConfig({
      department: '',
      scheme: '',
      semester: '',
      rows: 5,
      cols: 6,
      academicYear: ''
    });
    setFaculties([]);
    setClasses([]);
    setSubjects([]);
    setAssignments([]);
    setManualAssignments([]);
    setGeneratedTimetable(null);
    setSelectedTimetable(null);
    setConflicts([]);
    setCurrentStep(1);
    setViewMode('create');
  };
  
  // Step 1: Configuration
  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };
  
  // Step 2: Faculty Management
  const addFaculty = () => {
    if (newFaculty.trim()) {
      setFaculties(prev => [...prev, newFaculty.trim()]);
      setNewFaculty('');
    }
  };
  
  const removeFaculty = (index) => {
    setFaculties(prev => prev.filter((_, i) => i !== index));
  };
  
  // Step 3: Class Management
  const addClass = () => {
    if (newClass.trim()) {
      setClasses(prev => [...prev, newClass.trim()]);
      setNewClass('');
    }
  };
  
  const removeClass = (index) => {
    setClasses(prev => prev.filter((_, i) => i !== index));
  };
  
  // Step 4: Subject Management
  const addSubject = () => {
    if (newSubject.name.trim()) {
      setSubjects(prev => [...prev, { ...newSubject, name: newSubject.name.trim() }]);
      setNewSubject({ name: '', type: 'theory' });
    }
  };
  
  const removeSubject = (index) => {
    setSubjects(prev => prev.filter((_, i) => i !== index));
  };
  
  // Step 5: Assignment Configuration
  const addAssignment = () => {
    if (currentAssignment.className && currentAssignment.subjectName && currentAssignment.facultyName) {
      const assignment = {
        ...currentAssignment,
        id: Date.now()
      };
      setAssignments(prev => [...prev, assignment]);
      setCurrentAssignment({
        className: '',
        subjectName: '',
        facultyName: '',
        weeklyLimit: 3,
        isLab: false,
        consecutivePeriods: 1,
        multiFaculty: false,
        additionalFaculties: []
      });
    }
  };
  
  const removeAssignment = (id) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  };
  
  const toggleAdditionalFaculty = (facultyName) => {
    setCurrentAssignment(prev => {
      const additionalFaculties = prev.additionalFaculties.includes(facultyName)
        ? prev.additionalFaculties.filter(f => f !== facultyName)
        : [...prev.additionalFaculties, facultyName];
      return { ...prev, additionalFaculties };
    });
  };
  
  // Step 6: Manual Assignments
  const addManualAssignment = () => {
    if (manualEntry.facultyName && manualEntry.className && manualEntry.subjectName) {
      setManualAssignments(prev => [...prev, { ...manualEntry, id: Date.now() }]);
      setManualEntry({
        facultyName: '',
        className: '',
        subjectName: '',
        day: 1,
        period: 1
      });
    }
  };
  
  const removeManualAssignment = (id) => {
    setManualAssignments(prev => prev.filter(a => a.id !== id));
  };
  
  // Step 7: Generate Timetable
  const generateTimetable = async () => {
    setIsGenerating(true);
    
    try {
      // Validate configuration
      const validation = validateConfiguration({
        rows: config.rows,
        cols: config.cols,
        faculties,
        classes,
        subjects
      });
      
      if (!validation.valid) {
        alert('Configuration errors:\n' + validation.errors.join('\n'));
        setIsGenerating(false);
        return;
      }
      
      // Initialize timetable
      TimetableService.initializeTimetable(config.rows, config.cols);
      
      // Add faculties
      for (const faculty of faculties) {
        TimetableService.addFaculty(faculty);
      }
      
      // Add classes
      for (const className of classes) {
        TimetableService.addClass(className);
      }
      
      // Add manual assignments
      for (const manual of manualAssignments) {
        TimetableService.addManualData(
          manual.facultyName,
          manual.className,
          manual.subjectName,
          manual.day - 1,  // Convert to 0-indexed
          manual.period - 1
        );
      }
      
      // Add regular and lab assignments
      for (const assignment of assignments) {
        if (assignment.isLab || assignment.multiFaculty) {
          // Lab or multi-faculty assignment
          const allFaculties = [assignment.facultyName, ...assignment.additionalFaculties];
          TimetableService.addLabData(
            assignment.weeklyLimit,
            assignment.consecutivePeriods,
            allFaculties,
            assignment.className,
            assignment.isLab ? assignment.subjectName + '*' : assignment.subjectName,
            assignment.isLab
          );
        } else {
          // Regular assignment
          TimetableService.addFacultyData(
            assignment.facultyName,
            assignment.className,
            assignment.weeklyLimit,
            assignment.subjectName
          );
        }
      }
      
      // Generate the timetable
      const result = TimetableService.generateTimetable();
      
      if (result.success) {
        setGeneratedTimetable(result);
        
        // Detect conflicts
        const foundConflicts = detectConflicts(
          result.facultyTimetables,
          result.classTimetables,
          config.rows,
          config.cols
        );
        setConflicts(foundConflicts);
        
        if (foundConflicts.length > 0) {
          alert(`Timetable generated with ${foundConflicts.length} conflict(s). Please review.`);
        }
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error generating timetable:', error);
      alert('Failed to generate timetable: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Save to Firestore
  const saveTimetable = async () => {
    if (!generatedTimetable) {
      alert('Please generate a timetable first');
      return;
    }
    
    try {
      const timetableData = {
        ...config,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email,
        faculties,
        classes,
        subjects,
        assignments,
        manualAssignments,
        facultyTimetables: generatedTimetable.facultyTimetables,
        classTimetables: generatedTimetable.classTimetables
      };
      
      await addDoc(collection(db, 'timetables'), timetableData);
      alert('Timetable saved successfully!');
      fetchSavedTimetables();
    } catch (error) {
      console.error('Error saving timetable:', error);
      alert('Failed to save timetable: ' + error.message);
    }
  };
  
  // Export functions
  const handleExportExcel = () => {
    if (!generatedTimetable) return;
    
    const filename = `timetable_${config.department}_${config.semester}_${Date.now()}.xlsx`;
    exportToExcel(
      generatedTimetable.facultyTimetables,
      generatedTimetable.classTimetables,
      config.rows,
      config.cols,
      filename
    );
  };
  
  const handleExportText = () => {
    if (!generatedTimetable) return;
    
    const textContent = exportToText(
      generatedTimetable.facultyTimetables,
      generatedTimetable.classTimetables,
      config.rows,
      config.cols,
      config
    );
    
    if (textContent) {
      const filename = `timetable_${config.department}_${config.semester}_${Date.now()}.txt`;
      downloadTextFile(textContent, filename);
    }
  };
  
  const handleExportJSON = () => {
    if (!generatedTimetable) return;
    
    const data = {
      config,
      faculties,
      classes,
      subjects,
      assignments,
      manualAssignments,
      timetables: generatedTimetable
    };
    
    const filename = `timetable_${config.department}_${config.semester}_${Date.now()}.json`;
    exportToJSON(data, filename);
  };
  
  // Navigation
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const goToStep = (step) => {
    setCurrentStep(step);
  };
  
  // Render timetable grid
  const renderTimetableGrid = (timetable, title, rows, cols) => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-700">
            <thead>
              <tr className="bg-gray-800">
                <th className="border border-gray-700 px-4 py-2">Day</th>
                {Array.from({ length: cols }, (_, i) => (
                  <th key={i} className="border border-gray-700 px-4 py-2">
                    Period {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => (
                <tr key={i}>
                  <td className="border border-gray-700 px-4 py-2 font-semibold">
                    Day {i + 1}
                  </td>
                  {Array.from({ length: cols }, (_, j) => (
                    <td 
                      key={j} 
                      className={`border border-gray-700 px-4 py-2 ${
                        timetable[i][j] === 'FREE' ? 'text-gray-500' : 'text-white'
                      }`}
                    >
                      {timetable[i][j]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Step render functions
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Step 1: Basic Configuration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Department *"
          placeholder="e.g., Computer Science"
          value={config.department}
          onChange={(e) => handleConfigChange('department', e.target.value)}
        />
        
        <Input
          label="Academic Year"
          placeholder="e.g., 2023-2024"
          value={config.academicYear}
          onChange={(e) => handleConfigChange('academicYear', e.target.value)}
        />
        
        <Input
          label="Scheme (Optional)"
          placeholder="e.g., 2022 Scheme"
          value={config.scheme}
          onChange={(e) => handleConfigChange('scheme', e.target.value)}
        />
        
        <Input
          label="Semester (Optional)"
          placeholder="e.g., 5"
          value={config.semester}
          onChange={(e) => handleConfigChange('semester', e.target.value)}
        />
        
        <Input
          label="Number of Days *"
          type="number"
          min="1"
          max="7"
          value={config.rows}
          onChange={(e) => handleConfigChange('rows', parseInt(e.target.value) || 5)}
        />
        
        <Input
          label="Number of Periods per Day *"
          type="number"
          min="1"
          max="10"
          value={config.cols}
          onChange={(e) => handleConfigChange('cols', parseInt(e.target.value) || 6)}
        />
      </div>
    </div>
  );
  
  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Step 2: Add Faculty Members</h2>
      
      <div className="flex gap-4">
        <Input
          label="Faculty Name"
          placeholder="Enter faculty name"
          value={newFaculty}
          onChange={(e) => setNewFaculty(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addFaculty()}
        />
        <GradientButton onClick={addFaculty} className="self-end">
          Add Faculty
        </GradientButton>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Added Faculty ({faculties.length})</h3>
        {faculties.length === 0 ? (
          <p className="text-gray-400">No faculty members added yet.</p>
        ) : (
          <div className="space-y-2">
            {faculties.map((faculty, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-lg"
              >
                <span className="text-white">{faculty}</span>
                <button
                  onClick={() => removeFaculty(index)}
                  className="text-red-500 hover:text-red-400"
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Step 3: Add Classes</h2>
      
      <div className="flex gap-4">
        <Input
          label="Class Name"
          placeholder="e.g., CSE-5A, ECE-3B"
          value={newClass}
          onChange={(e) => setNewClass(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addClass()}
        />
        <GradientButton onClick={addClass} className="self-end">
          Add Class
        </GradientButton>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Added Classes ({classes.length})</h3>
        {classes.length === 0 ? (
          <p className="text-gray-400">No classes added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {classes.map((className, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-lg"
              >
                <span className="text-white">{className}</span>
                <button
                  onClick={() => removeClass(index)}
                  className="text-red-500 hover:text-red-400"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Step 4: Add Subjects</h2>
      
      <div className="flex gap-4">
        <Input
          label="Subject Name"
          placeholder="e.g., Data Structures"
          value={newSubject.name}
          onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
          onKeyPress={(e) => e.key === 'Enter' && addSubject()}
        />
        
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
          <select
            value={newSubject.type}
            onChange={(e) => setNewSubject(prev => ({ ...prev, type: e.target.value }))}
            className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="theory">Theory</option>
            <option value="lab">Lab</option>
          </select>
        </div>
        
        <GradientButton onClick={addSubject} className="self-end">
          Add Subject
        </GradientButton>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Added Subjects ({subjects.length})</h3>
        {subjects.length === 0 ? (
          <p className="text-gray-400">No subjects added yet.</p>
        ) : (
          <div className="space-y-2">
            {subjects.map((subject, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-lg"
              >
                <div>
                  <span className="text-white font-medium">{subject.name}</span>
                  <span className={`ml-3 text-xs px-2 py-1 rounded ${
                    subject.type === 'lab' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {subject.type}
                  </span>
                </div>
                <button
                  onClick={() => removeSubject(index)}
                  className="text-red-500 hover:text-red-400"
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Step 5: Configure Subject Assignments</h2>
      
      <div className="bg-gray-800 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Class *</label>
            <select
              value={currentAssignment.className}
              onChange={(e) => setCurrentAssignment(prev => ({ ...prev, className: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select class</option>
              {classes.map((className, index) => (
                <option key={index} value={className}>{className}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Subject *</label>
            <select
              value={currentAssignment.subjectName}
              onChange={(e) => setCurrentAssignment(prev => ({ ...prev, subjectName: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select subject</option>
              {subjects.map((subject, index) => (
                <option key={index} value={subject.name}>{subject.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Primary Faculty *</label>
            <select
              value={currentAssignment.facultyName}
              onChange={(e) => setCurrentAssignment(prev => ({ ...prev, facultyName: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select faculty</option>
              {faculties.map((faculty, index) => (
                <option key={index} value={faculty}>{faculty}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Weekly Limit</label>
            <input
              type="number"
              min="1"
              max="10"
              value={currentAssignment.weeklyLimit}
              onChange={(e) => setCurrentAssignment(prev => ({ ...prev, weeklyLimit: parseInt(e.target.value) || 3 }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentAssignment.isLab}
              onChange={(e) => setCurrentAssignment(prev => ({ 
                ...prev, 
                isLab: e.target.checked,
                consecutivePeriods: e.target.checked ? 2 : 1
              }))}
              className="w-4 h-4 text-pink-600 bg-gray-700 border-gray-600 rounded focus:ring-pink-500"
            />
            <span className="text-white">Is Lab Session</span>
          </label>
          
          {currentAssignment.isLab && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Consecutive Periods</label>
              <input
                type="number"
                min="2"
                max="4"
                value={currentAssignment.consecutivePeriods}
                onChange={(e) => setCurrentAssignment(prev => ({ ...prev, consecutivePeriods: parseInt(e.target.value) || 2 }))}
                className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          )}
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentAssignment.multiFaculty}
              onChange={(e) => setCurrentAssignment(prev => ({ ...prev, multiFaculty: e.target.checked }))}
              className="w-4 h-4 text-pink-600 bg-gray-700 border-gray-600 rounded focus:ring-pink-500"
            />
            <span className="text-white">Multiple Faculty</span>
          </label>
        </div>
        
        {currentAssignment.multiFaculty && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Additional Faculty</label>
            <div className="flex flex-wrap gap-2">
              {faculties.filter(f => f !== currentAssignment.facultyName).map((faculty, index) => (
                <button
                  key={index}
                  onClick={() => toggleAdditionalFaculty(faculty)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentAssignment.additionalFaculties.includes(faculty)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {faculty}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <GradientButton onClick={addAssignment} className="w-full">
          Add Assignment
        </GradientButton>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Configured Assignments ({assignments.length})</h3>
        {assignments.length === 0 ? (
          <p className="text-gray-400">No assignments configured yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800 px-4 py-3 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      {assignment.className} - {assignment.subjectName}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Faculty: {assignment.facultyName}
                      {assignment.additionalFaculties.length > 0 && `, ${assignment.additionalFaculties.join(', ')}`}
                      {' • '}
                      {assignment.weeklyLimit}x per week
                      {assignment.isLab && ` • Lab (${assignment.consecutivePeriods} periods)`}
                    </div>
                  </div>
                  <button
                    onClick={() => removeAssignment(assignment.id)}
                    className="text-red-500 hover:text-red-400 ml-4"
                  >
                    Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderStep6 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Step 6: Manual Assignments (Optional)</h2>
      <p className="text-gray-400 mb-4">Pre-assign specific slots if needed. These will be given highest priority.</p>
      
      <div className="bg-gray-800 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Faculty</label>
            <select
              value={manualEntry.facultyName}
              onChange={(e) => setManualEntry(prev => ({ ...prev, facultyName: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select faculty</option>
              {faculties.map((faculty, index) => (
                <option key={index} value={faculty}>{faculty}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Class</label>
            <select
              value={manualEntry.className}
              onChange={(e) => setManualEntry(prev => ({ ...prev, className: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select class</option>
              {classes.map((className, index) => (
                <option key={index} value={className}>{className}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
            <select
              value={manualEntry.subjectName}
              onChange={(e) => setManualEntry(prev => ({ ...prev, subjectName: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select subject</option>
              {subjects.map((subject, index) => (
                <option key={index} value={subject.name}>{subject.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Day</label>
            <input
              type="number"
              min="1"
              max={config.rows}
              value={manualEntry.day}
              onChange={(e) => setManualEntry(prev => ({ ...prev, day: parseInt(e.target.value) || 1 }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Period</label>
            <input
              type="number"
              min="1"
              max={config.cols}
              value={manualEntry.period}
              onChange={(e) => setManualEntry(prev => ({ ...prev, period: parseInt(e.target.value) || 1 }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>
        
        <GradientButton onClick={addManualAssignment} className="w-full">
          Add Manual Assignment
        </GradientButton>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Manual Assignments ({manualAssignments.length})</h3>
        {manualAssignments.length === 0 ? (
          <p className="text-gray-400">No manual assignments. Skip to next step.</p>
        ) : (
          <div className="space-y-2">
            {manualAssignments.map((assignment) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-lg"
              >
                <div className="text-white">
                  {assignment.facultyName} • {assignment.className} • {assignment.subjectName}
                  {' '}(Day {assignment.day}, Period {assignment.period})
                </div>
                <button
                  onClick={() => removeManualAssignment(assignment.id)}
                  className="text-red-500 hover:text-red-400"
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderStep7 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Step 7: Generate & Review Timetable</h2>
      
      {!generatedTimetable ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-gray-400 mb-6">
            Ready to generate your timetable with all configurations.
          </p>
          <GradientButton
            onClick={generateTimetable}
            disabled={isGenerating}
            size="lg"
          >
            {isGenerating ? 'Generating...' : 'Generate Timetable'}
          </GradientButton>
        </div>
      ) : (
        <div className="space-y-6">
          {conflicts.length > 0 && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
              <h3 className="text-red-500 font-bold mb-2">⚠️ Conflicts Detected ({conflicts.length})</h3>
              <ul className="text-red-400 text-sm space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index}>
                    {conflict.type}: {conflict.faculty || conflict.class} - Day {conflict.day}, Period {conflict.period}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
            <h3 className="text-green-500 font-bold mb-2">✅ {generatedTimetable.message}</h3>
          </div>
          
          {/* Faculty Timetables */}
          <div>
            <h3 className="text-2xl font-bold mb-4">Faculty Timetables</h3>
            {Object.entries(generatedTimetable.facultyTimetables).map(([facultyName, timetable]) => (
              <div key={facultyName}>
                {renderTimetableGrid(timetable, facultyName, config.rows, config.cols)}
              </div>
            ))}
          </div>
          
          {/* Class Timetables */}
          <div>
            <h3 className="text-2xl font-bold mb-4 mt-8">Class Timetables</h3>
            {Object.entries(generatedTimetable.classTimetables).map(([className, timetable]) => (
              <div key={className}>
                {renderTimetableGrid(timetable, className, config.rows, config.cols)}
              </div>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex flex-wrap gap-4 mt-8">
            {selectedTimetable ? (
              <GradientButton onClick={updateTimetable}>
                💾 Update Timetable
              </GradientButton>
            ) : (
              <GradientButton onClick={saveTimetable}>
                💾 Save to Database
              </GradientButton>
            )}
            <GradientButton onClick={handleExportExcel} variant="secondary">
              📊 Export Excel
            </GradientButton>
            <GradientButton onClick={handleExportText} variant="secondary">
              📄 Export Text
            </GradientButton>
            <GradientButton onClick={handleExportJSON} variant="secondary">
              📦 Export JSON
            </GradientButton>
            <GradientButton 
              onClick={generateTimetable} 
              variant="secondary"
              disabled={isGenerating}
            >
              🔄 Regenerate
            </GradientButton>
          </div>
        </div>
      )}
    </div>
  );
  
  // Progress indicator
  const renderProgressIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <React.Fragment key={step}>
            <button
              onClick={() => goToStep(step)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step === currentStep
                  ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                  : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {step < currentStep ? '✓' : step}
            </button>
            {step < totalSteps && (
              <div className={`flex-1 h-1 mx-2 ${
                step < currentStep ? 'bg-green-500' : 'bg-gray-700'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Config</span>
        <span>Faculty</span>
        <span>Classes</span>
        <span>Subjects</span>
        <span>Assign</span>
        <span>Manual</span>
        <span>Generate</span>
      </div>
    </div>
  );
  
  
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              <span className="text-gradient">Timetable</span> {viewMode === 'view' ? 'Browser' : 'Generator'}
            </h1>
            <p className="text-xl text-gray-400">
              {viewMode === 'view' 
                ? 'Browse and search saved timetables'
                : 'Create clash-free schedules using advanced backtracking algorithms'
              }
            </p>
          </motion.div>
          
          {/* Mode Toggle */}
          <div className="flex gap-4 mb-8">
            <GradientButton
              onClick={() => setViewMode('view')}
              variant={viewMode === 'view' ? 'primary' : 'secondary'}
            >
              📋 Browse Timetables
            </GradientButton>
            {hasFacultyAccess() && (
              <GradientButton
                onClick={startNewTimetable}
                variant={viewMode === 'create' ? 'primary' : 'secondary'}
              >
                ➕ Create New
              </GradientButton>
            )}
          </div>
          
          {/* View Mode - Browse Timetables */}
          {viewMode === 'view' && (
            <Card>
              <h2 className="text-2xl font-bold mb-6">Saved Timetables</h2>
              
              {/* Search/Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-800 rounded-lg">
                <Input
                  label="Search by Department"
                  placeholder="e.g., Computer Science"
                  value={searchFilters.department}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, department: e.target.value }))}
                />
                <Input
                  label="Search by Semester"
                  placeholder="e.g., 5"
                  value={searchFilters.semester}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, semester: e.target.value }))}
                />
                <Input
                  label="Search by Class"
                  placeholder="e.g., CSE-5A"
                  value={searchFilters.className}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, className: e.target.value }))}
                />
              </div>
              
              {/* Timetable Cards */}
              <div className="space-y-4">
                {getFilteredTimetables().length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-gray-400">
                      {savedTimetables.length === 0 
                        ? 'No timetables saved yet.'
                        : 'No timetables match your search criteria.'
                      }
                    </p>
                  </div>
                ) : (
                  getFilteredTimetables().map((timetable) => (
                    <motion.div
                      key={timetable.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">
                            {timetable.department} {timetable.semester && `- Semester ${timetable.semester}`}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            {timetable.scheme && <span>📋 {timetable.scheme}</span>}
                            {timetable.academicYear && <span>📅 {timetable.academicYear}</span>}
                            <span>👥 {timetable.faculties?.length || 0} Faculty</span>
                            <span>🏫 {timetable.classes?.length || 0} Classes</span>
                            <span>📚 {timetable.subjects?.length || 0} Subjects</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Created by {timetable.createdByEmail} on {new Date(timetable.createdAt).toLocaleDateString()}
                            {timetable.updatedAt && ` • Updated on ${new Date(timetable.updatedAt).toLocaleDateString()}`}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <GradientButton
                            onClick={() => loadTimetableForEdit(timetable)}
                            variant="secondary"
                            size="sm"
                          >
                            👁️ View
                          </GradientButton>
                          {hasFacultyAccess() && (
                            <>
                              <GradientButton
                                onClick={() => loadTimetableForEdit(timetable)}
                                variant="secondary"
                                size="sm"
                              >
                                ✏️ Edit
                              </GradientButton>
                              <button
                                onClick={() => confirmDelete(timetable.id)}
                                className="px-3 py-2 text-sm rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                              >
                                🗑️ Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Class List */}
                      {timetable.classes && timetable.classes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <p className="text-sm text-gray-400 mb-2">Classes:</p>
                          <div className="flex flex-wrap gap-2">
                            {timetable.classes.map((className, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-gray-900 rounded-full text-sm text-white"
                              >
                                {className}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </Card>
          )}
          
          {/* Create Mode - Wizard */}
          {viewMode === 'create' && (
            <Card>
              {renderProgressIndicator()}
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStep === 1 && renderStep1()}
                  {currentStep === 2 && renderStep2()}
                  {currentStep === 3 && renderStep3()}
                  {currentStep === 4 && renderStep4()}
                  {currentStep === 5 && renderStep5()}
                  {currentStep === 6 && renderStep6()}
                  {currentStep === 7 && renderStep7()}
                </motion.div>
              </AnimatePresence>
              
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
                <GradientButton
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  variant="secondary"
                >
                  ← Previous
                </GradientButton>
                
                <span className="text-gray-400">
                  Step {currentStep} of {totalSteps}
                </span>
                
                <GradientButton
                  onClick={nextStep}
                  disabled={currentStep === totalSteps}
                >
                  Next →
                </GradientButton>
              </div>
            </Card>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Timetable"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete this timetable? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <GradientButton
              onClick={() => setDeleteModalOpen(false)}
              variant="secondary"
            >
              Cancel
            </GradientButton>
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimetableGenerator;

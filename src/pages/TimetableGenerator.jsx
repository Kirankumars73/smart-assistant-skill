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
  const { currentUser, userRole } = useAuth();
  
  // Wizard step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6; // Reduced from 7: removed global subjects step
  
  // Configuration state - just grid dimensions
  const [config, setConfig] = useState({
    rows: 5,  // days
    cols: 6   // periods
  });
  
  // Faculty management
  const [faculties, setFaculties] = useState([]);
  const [newFaculty, setNewFaculty] = useState('');
  
  // Class management - each class has all its metadata
  const [classes, setClasses] = useState([]); // Array of {name, department, semester, scheme, academicYear, subjects: [{name, type}]}
  const [newClass, setNewClass] = useState({ name: '', department: '', semester: '', scheme: '', academicYear: '' });
  const [currentClassSubjects, setCurrentClassSubjects] = useState([]);
  const [newSubjectForClass, setNewSubjectForClass] = useState({ name: '', type: 'theory' });
  
  // Subject management - deprecated, subjects now stored per class
  // Kept for backward compatibility with old saved timetables
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
  const [activeTab, setActiveTab] = useState(userRole === 'student' ? 'class' : 'faculty'); // Students default to class view
  
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
      rows: timetable.rows || 5,
      cols: timetable.cols || 6
    });
    
    setFaculties(timetable.faculties || []);
    setClasses(timetable.classes || []);
    setSubjects(timetable.subjects || []);
    setAssignments(timetable.assignments || []);
    setManualAssignments(timetable.manualAssignments || []);
    
    // Deserialize timetables if they exist
    if (timetable.timetables) {
      const { facultyTimetables, classTimetables } = deserializeTimetables(
        timetable.timetables,
        timetable.rows || 5,
        timetable.cols || 6
      );
      
      setGeneratedTimetable({
        success: true,
        facultyTimetables,
        classTimetables
      });
    } else if (timetable.facultyTimetables && timetable.classTimetables) {
      // Legacy support for old format (if any exist)
      setGeneratedTimetable({
        success: true,
        facultyTimetables: timetable.facultyTimetables,
        classTimetables: timetable.classTimetables
      });
    }
    
    setSelectedTimetable(timetable);
    setViewMode('create');
    setCurrentStep(6); // Go to Step 6 (Generate & Review) to view timetable
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
      // Serialize timetables to avoid nested arrays
      const serializedTimetables = serializeTimetables(
        generatedTimetable.facultyTimetables,
        generatedTimetable.classTimetables
      );
      
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
        timetables: serializedTimetables // Store serialized version
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
  
  // Step 3: Class Management with subjects, semester, and scheme
  const addSubjectToCurrentClass = () => {
    if (newSubjectForClass.name.trim()) {
      setCurrentClassSubjects(prev => [...prev, { ...newSubjectForClass, name: newSubjectForClass.name.trim() }]);
      setNewSubjectForClass({ name: '', type: 'theory' });
    }
  };
  
  const removeSubjectFromCurrentClass = (index) => {
    setCurrentClassSubjects(prev => prev.filter((_, i) => i !== index));
  };
  
  const addClass = () => {
    if (newClass.name.trim() && newClass.department && newClass.semester && newClass.scheme && newClass.academicYear && currentClassSubjects.length > 0) {
      const classData = {
        name: newClass.name.trim(),
        department: newClass.department,
        semester: newClass.semester,
        scheme: newClass.scheme,
        academicYear: newClass.academicYear,
        subjects: [...currentClassSubjects]
      };
      setClasses(prev => [...prev, classData]);
      setNewClass({ name: '', department: '', semester: '', scheme: '', academicYear: '' });
      setCurrentClassSubjects([]);
    } else if (!newClass.name.trim()) {
      alert('Please enter class name');
    } else if (!newClass.department || !newClass.semester || !newClass.scheme || !newClass.academicYear) {
      alert('Please fill all class details (department, semester, scheme, academic year)');
    } else if (currentClassSubjects.length === 0) {
      alert('Please add at least one subject for this class');
    }
  };
  
  const removeClass = (index) => {
    setClasses(prev => prev.filter((_, i) => i !== index));
  };
  
  // Step 4: Subject Management - DEPRECATED, skip to assignments
  // Users now add subjects per-class in Step 3
  
  // Step 5 (formerly Step 5): Assignment Configuration
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
  
  // Step 7 (formerly Step 6): Generate Timetable
  const generateTimetable = async () => {
    setIsGenerating(true);
    
    try {
      // Extract all subjects from classes for the algorithm
      const allSubjects = [];
      classes.forEach(classData => {
        classData.subjects.forEach(subject => {
          // Add subject if not already in list
          if (!allSubjects.find(s => s.name === subject.name && s.type === subject.type)) {
            allSubjects.push(subject);
          }
        });
      });
      
      // Extract class names only
      const classNames = classes.map(c => c.name);
      
      // Validate configuration
      const validation = validateConfiguration({
        rows: config.rows,
        cols: config.cols,
        faculties: faculties,
        classes: classNames,
        subjects: allSubjects, // Use extracted subjects from all classes
        assignments: assignments
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
      for (const className of classNames) {
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
  
  // Helper: Convert 2D array to Firestore-compatible format (flat array with metadata)
  const serializeTimetables = (facultyTimetables, classTimetables) => {
    const serialized = {};
    
    // Serialize faculty timetables
    for (const [name, grid] of Object.entries(facultyTimetables)) {
      serialized[`faculty_${name}`] = {
        name,
        type: 'faculty',
        grid: grid.flat() // Flatten 2D array to 1D
      };
    }
    
    // Serialize class timetables
    for (const [name, grid] of Object.entries(classTimetables)) {
      serialized[`class_${name}`] = {
        name,
        type: 'class',
        grid: grid.flat() // Flatten 2D array to 1D
      };
    }
    
    return serialized;
  };
  
  // Helper: Convert serialized data back to 2D arrays
  const deserializeTimetables = (serialized, rows, cols) => {
    const facultyTimetables = {};
    const classTimetables = {};
    
    for (const [key, data] of Object.entries(serialized)) {
      // Reconstruct 2D array from flat array
      const grid = [];
      for (let i = 0; i < rows; i++) {
        grid.push(data.grid.slice(i * cols, (i + 1) * cols));
      }
      
      if (data.type === 'faculty') {
        facultyTimetables[data.name] = grid;
      } else if (data.type === 'class') {
        classTimetables[data.name] = grid;
      }
    }
    
    return { facultyTimetables, classTimetables };
  };
  
  // Save to Firestore
  const saveTimetable = async () => {
    if (!generatedTimetable) {
      alert('Please generate a timetable first');
      return;
    }
    
    try {
      // Serialize timetables to avoid nested arrays
      const serializedTimetables = serializeTimetables(
        generatedTimetable.facultyTimetables,
        generatedTimetable.classTimetables
      );
      
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
        timetables: serializedTimetables // Store serialized version
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
      <h2 className="text-2xl font-bold mb-6">Step 1: Timetable Grid Configuration</h2>
      <p className="text-gray-400 mb-4">Configure the basic timetable grid structure.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Days (Rows) *"
          type="number"
          min="1"
          max="7"
          value={config.rows}
          onChange={(e) => handleConfigChange('rows', parseInt(e.target.value) || 5)}
        />
        
        <Input
          label="Periods per Day (Columns) *"
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
      <h2 className="text-2xl font-bold mb-6">Step 3: Add Classes & Their Subjects</h2>
      <p className="text-gray-400 mb-4">Add each class along with its specific subjects. This makes it easier to manage different courses.</p>
      
      {/* Add New Class Form */}
      <div className="bg-gray-800 p-6 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold mb-3">Add New Class</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Class Name *"
            placeholder="e.g., CSE-5A, ECE-3B"
            value={newClass.name}
            onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Department *</label>
            <select
              value={newClass.department}
              onChange={(e) => setNewClass(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select Department</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Electronics">Electronics & Communication</option>
              <option value="Mechanical">Mechanical Engineering</option>
              <option value="Civil">Civil Engineering</option>
              <option value="Electrical">Electrical Engineering</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Semester *</label>
            <select
              value={newClass.semester}
              onChange={(e) => setNewClass(prev => ({ ...prev, semester: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select Semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7</option>
              <option value="8">Semester 8</option>
            </select>
          </div>
          
          <Input
            label="Scheme *"
            placeholder="e.g., 2019 2024, 2018, 2022"
            value={newClass.scheme}
            onChange={(e) => setNewClass(prev => ({ ...prev, scheme: e.target.value }))}
          />
          
          <Input
            label="Academic Year *"
            placeholder="e.g., 2023-2024"
            value={newClass.academicYear}
            onChange={(e) => setNewClass(prev => ({ ...prev, academicYear: e.target.value }))}
          />
        </div>
        
        {/* Subject Input for Current Class */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Subjects for {newClass.name || 'this class'}
          </label>
          
          <div className="flex gap-4 mb-3">
            <Input
              label=""
              placeholder="Subject name (e.g., Data Structures)"
              value={newSubjectForClass.name}
              onChange={(e) => setNewSubjectForClass(prev => ({ ...prev, name: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && addSubjectToCurrentClass()}
            />
            
            <div className="flex flex-col">
              <select
                value={newSubjectForClass.type}
                onChange={(e) => setNewSubjectForClass(prev => ({ ...prev, type: e.target.value }))}
                className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="theory">Theory</option>
                <option value="lab">Lab</option>
              </select>
            </div>
            
            <GradientButton onClick={addSubjectToCurrentClass} variant="secondary" className="whitespace-nowrap">
              + Add Subject
            </GradientButton>
          </div>
          
          {/* Current Class Subjects */}
          {currentClassSubjects.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-sm text-gray-400">Subjects added ({currentClassSubjects.length}):</p>
              {currentClassSubjects.map((subject, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-900 px-3 py-2 rounded-lg"
                >
                  <div>
                    <span className="text-white font-medium">{subject.name}</span>
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${
                      subject.type === 'lab' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {subject.type}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSubjectFromCurrentClass(index)}
                    className="text-red-500 hover:text-red-400 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <GradientButton 
          onClick={addClass} 
          className="w-full"
          disabled={!newClass.name || !newClass.department || !newClass.semester || !newClass.scheme || !newClass.academicYear || currentClassSubjects.length === 0}
        >
          ✅ Add Class with {currentClassSubjects.length} Subject(s)
        </GradientButton>
      </div>
      
      {/* Added Classes List */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Added Classes ({classes.length})</h3>
        {classes.length === 0 ? (
          <p className="text-gray-400">No classes added yet.</p>
        ) : (
          <div className="space-y-3">
            {classes.map((classData, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 p-4 rounded-lg border border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="text-white font-bold text-lg">{classData.name}</h4>
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                        {classData.department}
                      </span>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                        Sem {classData.semester}
                      </span>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                        {classData.scheme}
                      </span>
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded">
                        {classData.academicYear}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {classData.subjects.map((subject, sIndex) => (
                        <span
                          key={sIndex}
                          className={`px-3 py-1 rounded-full text-sm ${
                            subject.type === 'lab' 
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {subject.name} {subject.type === 'lab' && '🧪'}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {classData.subjects.length} subject(s) • {classData.subjects.filter(s => s.type === 'lab').length} lab(s)
                    </p>
                  </div>
                  <button
                    onClick={() => removeClass(index)}
                    className="text-red-500 hover:text-red-400 ml-4"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderStep4 = () => {
    // Get subjects for selected class
    const selectedClass = classes.find(c => c.name === currentAssignment.className);
    const availableSubjects = selectedClass ? selectedClass.subjects : [];
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-6">Step 4: Configure Faculty Assignments</h2>
        <p className="text-gray-400 mb-4">Assign faculty members to teach specific subjects for each class.</p>
        
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Class *</label>
              <select
                value={currentAssignment.className}
                onChange={(e) => setCurrentAssignment(prev => ({ ...prev, className: e.target.value, subjectName: '' }))}
                className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Select class</option>
                {classes.map((classData, index) => (
                  <option key={index} value={classData.name}>{classData.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject * {currentAssignment.className && `(${availableSubjects.length} available)`}
              </label>
              <select
                value={currentAssignment.subjectName}
                onChange={(e) => setCurrentAssignment(prev => ({ ...prev, subjectName: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                disabled={!currentAssignment.className}
              >
                <option value="">Select subject</option>
                {availableSubjects.map((subject, index) => (
                  <option key={index} value={subject.name}>
                    {subject.name} {subject.type === 'lab' && '🧪'}
                  </option>
                ))}
              </select>
              {!currentAssignment.className && (
                <p className="text-xs text-gray-500 mt-1">Select a class first</p>
              )}
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
  };
  
  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Step 5: Manual Assignments (Optional)</h2>
      <p className="text-gray-400 mb-4">Pre-assign specific slots if needed. These will be given highest priority.</p>
      
      <div className="bg-gray-800 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Class *</label>
            <select
              value={manualEntry.className}
              onChange={(e) => setManualEntry(prev => ({ ...prev, className: e.target.value, subjectName: '' }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select class</option>
              {classes.map((classData, index) => (
                <option key={index} value={classData.name}>{classData.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Subject *</label>
            <select
              value={manualEntry.subjectName}
              onChange={(e) => setManualEntry(prev => ({ ...prev, subjectName: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              disabled={!manualEntry.className}
            >
              <option value="">Select subject</option>
              {manualEntry.className && (() => {
                const selectedClass = classes.find(c => c.name === manualEntry.className);
                return (selectedClass?.subjects || []).map((subject, index) => (
                  <option key={index} value={subject.name}>{subject.name}</option>
                ));
              })()}
            </select>
            {!manualEntry.className && (
              <p className="text-xs text-gray-400 mt-1">Select a class first</p>
            )}
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
      <h2 className="text-2xl font-bold mb-6">Step 6: Generate & Review Timetable</h2>
      
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
        <div>
          {/* Tab Buttons - Hide Faculty tab for students */}
          <div className="flex gap-4 mb-6">
            {userRole !== 'student' && (
              <button
                onClick={() => setActiveTab('faculty')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === 'faculty'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                👨‍🏫 Faculty Timetables
              </button>
            )}
            <button
              onClick={() => setActiveTab('class')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'class'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              🏫 Class Timetables
            </button>
          </div>
          
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
          
          {/* Faculty Timetables - Only show if activeTab is 'faculty' */}
          {activeTab === 'faculty' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold mb-4">Faculty Timetables</h3>
              {Object.entries(generatedTimetable.facultyTimetables).map(([name, timetable]) => (
              <div key={name}>
                {renderTimetableGrid(timetable, name, config.rows, config.cols)}
              </div>
              ))}
            </div>
          )}
          
          {/* Class Timetables - Only show if activeTab is 'class' */}
          {activeTab === 'class' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold mb-4">Class Timetables</h3>
              {Object.entries(generatedTimetable.classTimetables).map(([name, timetable]) => (
              <div key={name}>
                {renderTimetableGrid(timetable, name, config.rows, config.cols)}
              </div>
              ))}
            </div>
          )}
          
          {/* Action Buttons */}
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
  
  // Check for faculty/admin access
  if (userRole !== 'faculty' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
            <p className="text-gray-400">
              Only faculty and administrators can access the timetable generator.
            </p>
          </Card>
        </div>
      </div>
    );
  }
  
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
            {(userRole === 'faculty' || userRole === 'admin') && (
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
                          {(userRole === 'faculty' || userRole === 'admin') && (
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
                            {timetable.classes.map((classItem, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-gray-900 rounded-full text-sm text-white"
                              >
                                {typeof classItem === 'string' ? classItem : classItem.name}
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
                </motion.div>
              </AnimatePresence>
              
              {/* Navigation Buttons - Hidden when viewing saved timetable */}
              {!selectedTimetable && (
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
              )}
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

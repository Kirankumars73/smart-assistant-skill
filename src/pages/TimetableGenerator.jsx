import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import GradientButton from '../components/ui/GradientButton';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import * as TimetableService from '../services/timetableService';
import {
  exportToExcel,
  exportToText,
  downloadTextFile,
  exportToJSON,
  detectConflicts,
  validateConfiguration
} from '../utils/timetableHelpers';
import { parseExcelTimetable, downloadTemplate } from '../utils/excelTimetableImporter';
import { exportFacultyTimetablesToPDF, exportClassTimetablesToPDF } from '../utils/pdfExportHelper';
import NoiseTexture from '../components/ui/NoiseTexture';
import FloatingOrbs from '../components/ui/FloatingOrbs';

const TimetableGenerator = () => {
  const { currentUser, userRole } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const { confirm, isOpen: isConfirmOpen, config: confirmConfig, handleConfirm, handleCancel } = useConfirm();
  
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
  const [isSaving, setIsSaving] = useState(false); // Prevent double-save
  const [activeTab, setActiveTab] = useState('class'); // Class timetable shown first by default
  
  // Switch/swap cells state
  const [selectedCells, setSelectedCells] = useState([]); // Array to store [row, col] of selected cells
  const [switchingGridName, setSwitchingGridName] = useState(null); // Track which grid is in switch mode
  const [isUpdating, setIsUpdating] = useState(false); // Track update operation status
  
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
  
  // Genetic Algorithm state
  const [algorithm, setAlgorithm] = useState('genetic'); // 'backtracking' or 'genetic'
  const [gaParams, setGaParams] = useState({
    populationSize: 100,
    maxGenerations: 500,
    mutationRate: 0.15,
    crossoverRate: 0.80,
    elitismCount: 10,
    tournamentSize: 5
  });
  const [gaProgress, setGaProgress] = useState({
    generation: 0,
    bestFitness: 0,
    avgFitness: 0,
    conflicts: 0,
    isRunning: false
  });

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef(null);
  
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
        tt.classes?.some(c => {
          const className = typeof c === 'string' ? c : c.name;
          return className?.toLowerCase().includes(searchFilters.className.toLowerCase());
        });
      
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
      showToast('Timetable deleted successfully!', 'success');
      fetchSavedTimetables();
      setDeleteModalOpen(false);
      setTimetableToDelete(null);
    } catch (error) {
      console.error('Error deleting timetable:', error);
      showToast('Failed to delete timetable: ' + error.message, 'error');
    }
  };
  
  // Update existing timetable
  const updateTimetable = async () => {
    if (!generatedTimetable || !selectedTimetable) {
      showToast('No timetable to update', 'warning');
      return;
    }

    if (isUpdating) {
      return; // Prevent double-click
    }
    
    setIsUpdating(true);
    
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
      showToast('Timetable updated successfully!', 'success');
      fetchSavedTimetables();
      setSelectedTimetable(null);
    } catch (error) {
      console.error('Error updating timetable:', error);
      showToast('Failed to update timetable: ' + error.message, 'error');
    } finally {
      setIsUpdating(false);
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
    setSelectedCells([]);
    setSwitchingGridName(null);
    setIsUpdating(false);
  };
  
  // Step 1: Configuration
  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Excel Import handlers
  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      showError('Please select a valid Excel file (.xlsx, .xls, or .csv)');
      return;
    }

    setImportLoading(true);
    setImportErrors([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = parseExcelTimetable(arrayBuffer);

      if (result.success) {
        setImportPreview(result.data);
        setImportErrors([]);
      } else {
        setImportPreview(null);
        setImportErrors(result.errors);
      }
    } catch (err) {
      console.error('Import error:', err);
      setImportErrors(['Failed to parse Excel file. Please ensure it follows the template format.']);
      setImportPreview(null);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    // Set all imported data to state
    setConfig(importPreview.config);
    setFaculties(importPreview.faculties);
    setClasses(importPreview.classes);
    setSubjects(importPreview.subjects);
    setAssignments(importPreview.assignments);

    showSuccess(`Successfully imported ${importPreview.faculties.length} faculty, ${importPreview.classes.length} classes, and ${importPreview.assignments.length} assignments`);

    // Close modal and reset
    setImportModalOpen(false);
    setImportPreview(null);
    setImportErrors([]);

    // Reset to step 1
    setCurrentStep(1);
  };

  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    setImportPreview(null);
    setImportErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate();
    showSuccess('Template downloaded successfully');
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
      showToast('Please enter class name', 'warning');
    } else if (!newClass.department || !newClass.semester || !newClass.scheme || !newClass.academicYear) {
      showToast('Please fill all class details (department, semester, scheme, academic year)', 'warning');
    } else if (currentClassSubjects.length === 0) {
      showToast('Please add at least one subject for this class', 'warning');
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
    setGaProgress({ generation: 0, bestFitness: 0, avgFitness: 0, conflicts: 0, isRunning: true });
    
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
        showToast('Configuration errors: ' + validation.errors.join(', '), 'error');
        setIsGenerating(false);
        setGaProgress(prev => ({ ...prev, isRunning: false }));
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
      
      // Generate the timetable using selected algorithm
      let result;
      
      if (algorithm === 'genetic') {
        console.log('🧬 Using Genetic Algorithm');

        // Warn the user if dataset is very large before starting
        const totalAssignments = assignments.length;
        if (totalAssignments > 80) {
          showWarning(`Large dataset detected (${totalAssignments} assignments). GA auto-scaled to a safe size. This may take 20–60 seconds...`);
        }

        // Progress callback — now includes totalGenerations for accurate progress %
        const onProgress = (progress) => {
          setGaProgress({
            generation: progress.generation,
            totalGenerations: progress.totalGenerations || gaParams.maxGenerations,
            bestFitness: progress.bestFitness,
            avgFitness: progress.avgFitness,
            conflicts: progress.conflicts,
            isRunning: true
          });
        };

        result = await TimetableService.generateTimetableWithGA(gaParams, onProgress);

      } else {
        console.log('🔄 Using Backtracking Algorithm');
        // Wire progress callback so the progress bar shows activity during backtracking
        const onBacktrackProgress = (progress) => {
          setGaProgress(prev => ({
            ...prev,
            generation: progress.assignedSoFar || 0,
            isRunning: true
          }));
        };
        result = await TimetableService.generateTimetable(onBacktrackProgress);
      }

      if (result.success) {
        // Always display the timetable — GA returns success:true even with soft violations
        setGeneratedTimetable(result);

        // Detect conflicts for the conflict panel
        const foundConflicts = detectConflicts(
          result.facultyTimetables,
          result.classTimetables,
          config.rows,
          config.cols
        );
        setConflicts(foundConflicts);

        if (foundConflicts.length > 0) {
          console.log(`⚠️ Timetable generated with ${foundConflicts.length} conflict(s):`, foundConflicts);
        } else {
          console.log('✅ Timetable generated successfully with no conflicts');
        }

        // Show appropriate toast: warning if violations / partial, success otherwise
        const algorithmName = algorithm === 'genetic' ? 'Genetic Algorithm' : 'Backtracking';
        if (result.partial) {
          // Backtracking timed out — partial result
          showWarning(result.message || `Partial timetable generated — some subjects could not be placed. Consider reducing weekly hours or adding more periods.`);
        } else if (result.hasViolations) {
          // GA returned best-effort with violations
          showWarning(result.message || `Timetable generated (best effort) — some slots could not satisfy all constraints. Check the Conflicts panel.`);
        } else {
          const fitnessInfo = result.fitness ? ` (Fitness: ${result.fitness})` : '';
          showSuccess(`Timetable generated successfully using ${algorithmName}!${fitnessInfo}`);
        }

      } else {
        showError(result.message || 'Failed to generate timetable.');
      }
    } catch (error) {
      console.error('Error generating timetable:', error);
      showToast('Failed to generate timetable: ' + error.message, 'error');
    } finally {
      setIsGenerating(false);
      setGaProgress(prev => ({ ...prev, isRunning: false }));
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
      showToast('Please generate a timetable first', 'warning');
      return;
    }
    
    // Prevent double-save
    if (isSaving) {
      return;
    }
    
    setIsSaving(true);
    
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
      showToast('Timetable saved successfully!', 'success');
      fetchSavedTimetables();
    } catch (error) {
      console.error('Error saving timetable:', error);
      showToast('Failed to save timetable: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Export functions - context-aware based on activeTab
  const handleExportExcel = () => {
    if (!generatedTimetable) return;
    
    const timestamp = Date.now();
    const timetables = activeTab === 'faculty' 
      ? { facultyTimetables: generatedTimetable.facultyTimetables, classTimetables: {} }
      : { facultyTimetables: {}, classTimetables: generatedTimetable.classTimetables };
    
    const filename = `${activeTab}_timetables_${timestamp}.xlsx`;
    exportToExcel(
      timetables.facultyTimetables,
      timetables.classTimetables,
      config.rows,
      config.cols,
      filename
    );
  };
  
  const handleExportText = () => {
    if (!generatedTimetable) return;
    
    const timestamp = Date.now();
    const timetables = activeTab === 'faculty' 
      ? { facultyTimetables: generatedTimetable.facultyTimetables, classTimetables: {} }
      : { facultyTimetables: {}, classTimetables: generatedTimetable.classTimetables };
    
    const textContent = exportToText(
      timetables.facultyTimetables,
      timetables.classTimetables,
      config.rows,
      config.cols,
      config
    );
    
    if (textContent) {
      const filename = `${activeTab}_timetables_${timestamp}.txt`;
      downloadTextFile(textContent, filename);
    }
  };
  
  const handleExportJSON = () => {
    if (!generatedTimetable) return;
    
    const timestamp = Date.now();
    const timetables = activeTab === 'faculty' 
      ? { facultyTimetables: generatedTimetable.facultyTimetables, classTimetables: {} }
      : { facultyTimetables: {}, classTimetables: generatedTimetable.classTimetables };
    
    const data = {
      config,
      faculties,
      classes,
      subjects,
      assignments,
      manualAssignments,
      timetables
    };
    
    const filename = `${activeTab}_timetables_${timestamp}.json`;
    exportToJSON(data, filename);
  };
  
  const handleExportPDF = async () => {
    if (!generatedTimetable) return;
    
    try {
      if (activeTab === 'faculty') {
        await exportFacultyTimetablesToPDF(generatedTimetable.facultyTimetables, config);
      } else {
        await exportClassTimetablesToPDF(generatedTimetable.classTimetables, config);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showError('Failed to export PDF: ' + error.message);
    }
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

  // Handle cell selection for switching positions
  const handleCellClick = (gridName, row, col) => {
    // If grid name changed, reset selection
    if (switchingGridName !== gridName) {
      setSelectedCells([[row, col]]);
      setSwitchingGridName(gridName);
      return;
    }

    // Check if this cell is already selected
    const cellIndex = selectedCells.findIndex(([r, c]) => r === row && c === col);
    
    if (cellIndex !== -1) {
      // Deselect if clicking the same cell
      const newSelection = selectedCells.filter((_, i) => i !== cellIndex);
      if (newSelection.length === 0) {
        setSwitchingGridName(null);
      }
      setSelectedCells(newSelection);
    } else if (selectedCells.length < 2) {
      // Add to selection if less than 2 cells selected
      setSelectedCells([...selectedCells, [row, col]]);
    } else {
      // Replace oldest selection if 2 are already selected
      setSelectedCells([selectedCells[1], [row, col]]);
    }
  };

  // Perform the switch/swap operation — conflict-validated & dual-timetable sync
  const performSwitch = (gridName, timetableData, isClass) => {
    if (selectedCells.length !== 2) {
      showWarning('Please select exactly 2 cells to switch');
      return;
    }

    const [[row1, col1], [row2, col2]] = selectedCells;

    if (row1 === row2 && col1 === col2) {
      showWarning('Please select two different cells to switch');
      setSelectedCells([]);
      setSwitchingGridName(null);
      return;
    }

    try {
      // Deep-copy both timetables so we never mutate state directly
      const newFaculty = JSON.parse(JSON.stringify(generatedTimetable.facultyTimetables));
      const newClass   = JSON.parse(JSON.stringify(generatedTimetable.classTimetables));

      if (isClass) {
        // === CLASS TIMETABLE SWITCH ===
        // gridName = class (e.g. "BCS-1"), cells hold subject names
        const subj1 = newClass[gridName][row1][col1];
        const subj2 = newClass[gridName][row2][col2];

        // Find which faculty occupies each slot for this class
        let faculty1 = null;
        let faculty2 = null;
        for (const fName in newFaculty) {
          if (newFaculty[fName][row1]?.[col1] === gridName) faculty1 = fName;
          if (newFaculty[fName][row2]?.[col2] === gridName) faculty2 = fName;
        }

        // Conflict: faculty1 moving to slot2 — is faculty1 already busy there?
        if (subj1 !== 'FREE' && faculty1) {
          const occupied = newFaculty[faculty1][row2]?.[col2];
          if (occupied !== 'FREE' && occupied !== gridName) {
            showError(`❌ Conflict: ${faculty1} is already teaching "${occupied}" at Day ${row2 + 1} Period ${col2 + 1}. Switch blocked.`);
            return;
          }
        }
        // Conflict: faculty2 moving to slot1 — is faculty2 already busy there?
        if (subj2 !== 'FREE' && faculty2) {
          const occupied = newFaculty[faculty2][row1]?.[col1];
          if (occupied !== 'FREE' && occupied !== gridName) {
            showError(`❌ Conflict: ${faculty2} is already teaching "${occupied}" at Day ${row1 + 1} Period ${col1 + 1}. Switch blocked.`);
            return;
          }
        }

        // ✅ Safe — swap subjects in class timetable
        newClass[gridName][row1][col1] = subj2;
        newClass[gridName][row2][col2] = subj1;
        // Sync faculty timetable
        if (faculty1) {
          newFaculty[faculty1][row1][col1] = 'FREE';
          newFaculty[faculty1][row2][col2] = gridName;
        }
        if (faculty2 && faculty2 !== faculty1) {
          newFaculty[faculty2][row2][col2] = 'FREE';
          newFaculty[faculty2][row1][col1] = gridName;
        }

      } else {
        // === FACULTY TIMETABLE SWITCH ===
        // gridName = faculty (e.g. "Dr. Smith"), cells hold class names
        const class1 = newFaculty[gridName][row1][col1];
        const class2 = newFaculty[gridName][row2][col2];

        // Conflict: class1 moving to slot2 — is that slot already busy for class1?
        if (class1 !== 'FREE' && newClass[class1]) {
          const occupied = newClass[class1][row2]?.[col2];
          if (occupied !== 'FREE') {
            showError(`❌ Conflict: ${class1} already has "${occupied}" at Day ${row2 + 1} Period ${col2 + 1}. Switch blocked.`);
            return;
          }
        }
        // Conflict: class2 moving to slot1 — is that slot already busy for class2?
        if (class2 !== 'FREE' && newClass[class2]) {
          const occupied = newClass[class2][row1]?.[col1];
          if (occupied !== 'FREE') {
            showError(`❌ Conflict: ${class2} already has "${occupied}" at Day ${row1 + 1} Period ${col1 + 1}. Switch blocked.`);
            return;
          }
        }

        // Snapshot subject names before modifying anything
        const subj1 = class1 !== 'FREE' && newClass[class1] ? newClass[class1][row1][col1] : 'FREE';
        const subj2 = class2 !== 'FREE' && newClass[class2] ? newClass[class2][row2][col2] : 'FREE';

        // ✅ Safe — swap classes in faculty timetable
        newFaculty[gridName][row1][col1] = class2;
        newFaculty[gridName][row2][col2] = class1;
        // Sync class timetables
        if (class1 !== 'FREE' && newClass[class1]) {
          newClass[class1][row1][col1] = 'FREE';
          newClass[class1][row2][col2] = subj1;
        }
        if (class2 !== 'FREE' && newClass[class2] && class2 !== class1) {
          newClass[class2][row2][col2] = 'FREE';
          newClass[class2][row1][col1] = subj2;
        }
      }

      // Commit both timetables atomically
      setGeneratedTimetable({
        ...generatedTimetable,
        facultyTimetables: newFaculty,
        classTimetables: newClass
      });
      setSelectedCells([]);
      setSwitchingGridName(null);
      showSuccess('✅ Positions switched — no conflicts!');

    } catch (error) {
      console.error('Error switching cells:', error);
      showError('Failed to switch positions: ' + error.message);
    }
  };

  // Reset switch mode
  const resetSwitchMode = () => {
    setSelectedCells([]);
    setSwitchingGridName(null);
  };
  
  // Render timetable grid
  const renderTimetableGrid = (timetable, title, rows, cols, isClass = false) => {
    const isInSwitchMode = switchingGridName === title;
    
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          {isInSwitchMode ? (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-amber-500">
                {selectedCells.length === 0 
                  ? 'Click 2 cells to switch' 
                  : selectedCells.length === 1 
                  ? 'Click 1 more cell' 
                  : 'Ready to switch'}
              </span>
              {selectedCells.length === 2 && (
                <button
                  onClick={() => performSwitch(title, timetable, isClass)}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                >
                  ✅ Switch
                </button>
              )}
              <button
                onClick={resetSwitchMode}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
              >
                ❌ Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setSwitchingGridName(title);
                setSelectedCells([]);
              }}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
              title="Switch positions of two cells"
            >
              🔄 Switch Positions
            </button>
          )}
        </div>
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
                  {Array.from({ length: cols }, (_, j) => {
                    const isSelected = selectedCells.some(([r, c]) => r === i && c === j);
                    return (
                      <td 
                        key={j}
                        onClick={() => isInSwitchMode && handleCellClick(title, i, j)}
                        className={`border border-gray-700 px-4 py-2 ${
                          timetable[i][j] === 'FREE' ? 'text-gray-500' : 'text-white'
                        } ${
                          isInSwitchMode 
                            ? 'cursor-pointer hover:bg-gray-600' 
                            : ''
                        } ${
                          isSelected 
                            ? 'bg-amber-500 bg-opacity-40 border-amber-500 border-2' 
                            : ''
                        } transition-colors`}
                      >
                        {timetable[i][j]}
                      </td>
                    );
                  })}
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

      {/* Import Section */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Import from Excel</h3>
            <p className="text-gray-400 text-sm">Upload a pre-filled Excel file with all timetable data</p>
          </div>
          <div className="flex gap-2">
            <GradientButton onClick={handleDownloadTemplate} variant="secondary" className="text-sm">
              Download Template
            </GradientButton>
            <GradientButton onClick={() => setImportModalOpen(true)} className="text-sm">
              Import Excel
            </GradientButton>
          </div>
        </div>
      </div>

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
      
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            label="Faculty Name"
            placeholder="Enter faculty name"
            value={newFaculty}
            onChange={(e) => setNewFaculty(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addFaculty()}
          />
        </div>
        <GradientButton onClick={addFaculty} className="mt-6">
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
        <div className="space-y-6">
          {/* Algorithm Selector */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">🧬 Algorithm Selection</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setAlgorithm('genetic')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  algorithm === 'genetic'
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🧬</div>
                  <div className="text-left">
                    <div className="font-bold text-white">Genetic Algorithm</div>
                    <div className="text-sm text-gray-400">Best for complex constraints</div>
                  </div>
                  {algorithm === 'genetic' && <div className="ml-auto text-pink-500">✓</div>}
                </div>
              </button>
              
              <button
                onClick={() => setAlgorithm('backtracking')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  algorithm === 'backtracking'
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🔄</div>
                  <div className="text-left">
                    <div className="font-bold text-white">Backtracking</div>
                    <div className="text-sm text-gray-400">Fast for simple cases</div>
                  </div>
                  {algorithm === 'backtracking' && <div className="ml-auto text-pink-500">✓</div>}
                </div>
              </button>
            </div>
            
            {/* GA Parameters (shown when GA is selected) */}
            {algorithm === 'genetic' && (
              <div className="space-y-4 mt-6 border-t border-gray-700 pt-6">
                <h4 className="font-semibold text-white mb-3">Genetic Algorithm Parameters</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Population Size</label>
                    <input
                      type="number"
                      min="50"
                      max="200"
                      value={gaParams.populationSize}
                      onChange={(e) => setGaParams(prev => ({ ...prev, populationSize: parseInt(e.target.value) || 100 }))}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Max Generations</label>
                    <input
                      type="number"
                      min="100"
                      max="1000"
                      value={gaParams.maxGenerations}
                      onChange={(e) => setGaParams(prev => ({ ...prev, maxGenerations: parseInt(e.target.value) || 500 }))}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Mutation Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={gaParams.mutationRate}
                      onChange={(e) => setGaParams(prev => ({ ...prev, mutationRate: parseFloat(e.target.value) || 0.15 }))}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* GA Progress Display (shown when GA is running) */}
          {gaProgress.isRunning && algorithm === 'genetic' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">📊 Evolution Progress</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-500">{gaProgress.generation}</div>
                  <div className="text-sm text-gray-400">Generation</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{Math.round(gaProgress.bestFitness)}</div>
                  <div className="text-sm text-gray-400">Best Fitness</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{Math.round(gaProgress.avgFitness)}</div>
                  <div className="text-sm text-gray-400">Avg Fitness</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-500">{gaProgress.conflicts}</div>
                  <div className="text-sm text-gray-400">Conflicts</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(gaProgress.generation / gaParams.maxGenerations) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 text-right">
                {Math.round((gaProgress.generation / gaParams.maxGenerations) * 100)}% Complete
              </div>
            </div>
          )}
          
          {/* Generate Button */}
          <div className="text-center py-6">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-400 mb-6">
              Ready to generate your timetable with {algorithm === 'genetic' ? 'Genetic Algorithm' : 'Backtracking'}.
            </p>
            <GradientButton
              onClick={generateTimetable}
              disabled={isGenerating}
              size="lg"
            >
              {isGenerating ? (algorithm === 'genetic' ? '🧬 Evolving...' : '🔄 Generating...') : 'Generate Timetable'}
            </GradientButton>
          </div>
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
          
          {/* Conflicts are logged to console for debugging - not shown to clients */}
          
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
            <h3 className="text-green-500 font-bold mb-2">✅ {generatedTimetable.message}</h3>
          </div>
          
          {/* Faculty Timetables - Only show if activeTab is 'faculty' */}
          {activeTab === 'faculty' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold mb-4">Faculty Timetables</h3>
              {Object.entries(generatedTimetable.facultyTimetables).map(([name, timetable]) => (
              <div key={name}>
                {renderTimetableGrid(timetable, name, config.rows, config.cols, false)}
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
                {renderTimetableGrid(timetable, name, config.rows, config.cols, true)}
              </div>
              ))}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mt-8">
            {selectedTimetable ? (
              <GradientButton 
                onClick={updateTimetable}
                disabled={isUpdating || !generatedTimetable}
              >
                {isUpdating ? '⏳ Updating...' : '💾 Update Timetable'}
              </GradientButton>
            ) : (
              <GradientButton onClick={saveTimetable} disabled={isSaving}>
                💾 {isSaving ? 'Saving...' : 'Save to Database'}
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
            <GradientButton onClick={handleExportPDF} variant="secondary">
              📑 Export PDF
            </GradientButton>
            <GradientButton 
              onClick={generateTimetable} 
              variant="secondary"
              disabled={isGenerating}
            >
              🔄 Regenerate
            </GradientButton>
            <GradientButton 
              onClick={async () => {
                const confirmed = await confirm({
                  title: 'Discard Timetable',
                  message: 'Are you sure you want to discard this timetable? This action cannot be undone.',
                  confirmText: 'Discard',
                  type: 'danger'
                });
                if (confirmed) {
                  setGeneratedTimetable(null);
                  setConflicts([]);
                }
              }}
              variant="danger"
              className="ml-auto"
            >
              🗑️ Discard
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
  
  // Students have read-only access to view class timetables
  
  return (
    <div className="min-h-screen bg-midnight relative">
      <NoiseTexture />
      <FloatingOrbs />
      <div className="mesh-gradient-bg" />
      <Navbar />
      
      <div className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
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
                ? userRole === 'student' 
                  ? 'Search and view your class timetables by class name and semester'
                  : 'Browse and search saved timetables'
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
            <Card hover={false}>
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
                          {userRole === 'student' ? null : (
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
            <Card hover={false}>
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
      
      {/* Discard Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
      />

      {/* Excel Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={handleCloseImportModal}
        title="Import Timetable from Excel"
      >
        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
              className="hidden"
              id="excel-import"
            />
            <label htmlFor="excel-import" className="cursor-pointer">
              <div className="space-y-2">
                <div className="text-4xl">📄</div>
                <p className="text-white font-medium">
                  {importLoading ? 'Parsing file...' : 'Click to select Excel file'}
                </p>
                <p className="text-gray-400 text-sm">.xlsx, .xls, or .csv</p>
              </div>
            </label>
          </div>

          {/* Format hint */}
          <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-400 space-y-1">
            <p className="text-gray-300 font-semibold text-sm">📋 Required columns (sheet name: DepartmentData)</p>
            <p><span className="text-pink-400">Class</span> · <span className="text-pink-400">Subject</span> · <span className="text-pink-400">Type</span> (theory/lab) · <span className="text-pink-400">Weekly Hours</span> · <span className="text-pink-400">Consecutive Required</span> (yes/no) · <span className="text-pink-400">Consecutive Hours</span> · <span className="text-pink-400">Faculty</span></p>
            <p>💡 Multiple faculty = comma-separated names &rarr; hours split equally between them</p>
          </div>

          {/* Download Template Link */}
          <div className="text-center">
            <button
              onClick={handleDownloadTemplate}
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              ⬇️ Download filled template example
            </button>
          </div>

          {/* Errors */}
          {importErrors.length > 0 && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-semibold mb-2">Import Errors:</h4>
              <ul className="text-red-300 text-sm space-y-1 max-h-40 overflow-y-auto">
                {importErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          {importPreview && (
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 space-y-3">
              <h4 className="text-green-400 font-semibold">✅ Preview — Ready to Import:</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-gray-300">
                  <span className="text-gray-500">Faculty:</span> {importPreview.faculties.length}
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-500">Classes:</span> {importPreview.classes.length}
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-500">Assignments:</span> {importPreview.assignments.length}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                <span className="text-gray-500">Faculty:</span> {importPreview.faculties.join(', ')}
              </div>
              <div className="text-xs text-gray-400">
                <span className="text-gray-500">Classes:</span> {importPreview.classes.map(c => c.name).join(', ')}
              </div>
              <p className="text-xs text-yellow-400">⚠️ Days &amp; Periods are set in Step 1 — not read from Excel.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <GradientButton onClick={handleCloseImportModal} variant="secondary">
              Cancel
            </GradientButton>
            <GradientButton
              onClick={handleConfirmImport}
              disabled={!importPreview}
              className={!importPreview ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Import Data
            </GradientButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimetableGenerator;

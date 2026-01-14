import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import GradientButton from '../components/ui/GradientButton';
import SubjectInputList from '../components/forms/SubjectInputList';
import BacklogPaperManager from '../components/forms/BacklogPaperManager';
import { getInternalMarks, createEmptySubject, validateSubjects } from '../utils/subjectHelpers';
import { getBacklogCount, createEmptyBacklogPaper } from '../utils/backlogHelpers';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages';
import { useLoadingDelay } from '../hooks/useLoadingDelay';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import ProgressBar from '../components/ui/ProgressBar';
import * as XLSX from 'xlsx';

const StudentRecords = () => {
  const { hasFacultyAccess, isStudent } = useAuth();
  const toast = useToast();
  const { confirm, isOpen: confirmOpen, config: confirmConfig, handleConfirm, handleCancel } = useConfirm();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 200);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    studentId: '',
    branch: '',
    semester: '',
    cgpa: '',
    backPapers: '',
    backlogPapers: [],  // NEW: Array of backlog paper objects
    internalMarks: '',  // Keep for backward compatibility
    subjects: [],       // New: Array of subject objects
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    guardianName: '',
    guardianPhone: '',
    bloodGroup: '',
    attendance: ''
  });

  // Bulk import state
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);  // New: for marks update

  // Bulk delete state
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, studentId: null });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const studentsCollection = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsCollection);
      const studentsList = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pass/Fail Prediction Algorithm
  const predictPassFail = (student) => {
    const cgpa = parseFloat(student.cgpa) || 0;
    const backPapers = parseInt(student.backPapers) || 0;
    const internalMarks = getInternalMarks(student);  // Use helper for backward compatibility

    // Algorithm: Fail if CGPA < 5.5 OR backPapers > 2 OR internal marks < 40%
    if (cgpa < 5.5 || backPapers > 2 || internalMarks < 40) {
      return 'Fail';
    }
    return 'Pass';
  };

  const isAtRisk = (student) => {
    const cgpa = parseFloat(student.cgpa) || 0;
    const backPapers = parseInt(student.backPapers) || 0;
    const internalMarks = getInternalMarks(student);  // Use helper for backward compatibility
    
    return cgpa < 6.0 || backPapers > 0 || internalMarks < 50;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasFacultyAccess()) {
      alert('You do not have permission to create/edit student records.');
      return;
    }

    // Validate subjects
    const validation = validateSubjects(formData.subjects);
    if (!validation.isValid) {
      alert('Subject validation failed:\n' + validation.errors.join('\n'));
      return;
    }

    try {
      // Calculate backPapers count from backlogPapers array
      const backlogCount = formData.backlogPapers.length;
      
      const studentData = {
        ...formData,
        cgpa: parseFloat(formData.cgpa),
        backPapers: backlogCount,  // Auto-calculated from array
        backlogPapers: formData.backlogPapers,  // NEW: Save backlog papers array
        internalMarks: parseFloat(formData.internalMarks),  // Keep for backward compatibility
        semester: parseInt(formData.semester),
        subjects: formData.subjects,  // Save subjects array
        updatedAt: new Date().toISOString()
      };

      if (editingStudent) {
        // Update existing student
        const studentRef = doc(db, 'students', editingStudent.id);
        await updateDoc(studentRef, studentData);
      } else {
        // Add new student
        studentData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'students'), studentData);
      }

      fetchStudents();
      closeModal();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Failed to save student. Check console for details.');
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name || '',
      rollNumber: student.rollNumber || '',
      studentId: student.studentId || '',
      branch: student.branch || '',
      semester: student.semester?.toString() || '',
      cgpa: student.cgpa?.toString() || '',
      backPapers: student.backPapers?.toString() || '',
      backlogPapers: student.backlogPapers || [],  // NEW: Load backlog papers array
      internalMarks: student.internalMarks?.toString() || '',
      subjects: student.subjects || [createEmptySubject()],  // Load subjects or create default
      email: student.email || '',
      phone: student.phone || '',
      dateOfBirth: student.dateOfBirth || '',
      gender: student.gender || '',
      address: student.address || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      bloodGroup: student.bloodGroup || '',
      attendance: student.attendance?.toString() || ''
    });
    setIsModalOpen(true);
  };


  const handleDelete = async (studentId) => {
    if (!hasFacultyAccess()) {
      toast.showError('You don\'t have permission to delete student records');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Student',
      message: 'Are you sure you want to delete this student record? This action cannot be undone.',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      type: 'danger',
      icon: '🗑️'
    });

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'students', studentId));
      toast.showSuccess('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.showError(getErrorMessage(error));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setFormData({
      name: '',
      rollNumber: '',
      studentId: '',
      branch: '',
      semester: '',
      cgpa: '',
      backPapers: '',
      backlogPapers: [],  // NEW: Reset backlog papers
      internalMarks: '',
      subjects: [],  // Reset subjects
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      guardianName: '',
      guardianPhone: '',
      bloodGroup: '',
      attendance: ''
    });
  };

  // ============= BULK DELETE FUNCTIONS =============

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!hasFacultyAccess()) {
      alert('You do not have permission to delete student records.');
      return;
    }

    if (selectedStudents.length === 0) {
      alert('No students selected');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedStudents.length} student(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Use batch delete for efficiency
      const batchSize = 500; // Firestore limit
      
      for (let i = 0; i < selectedStudents.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchIds = selectedStudents.slice(i, i + batchSize);
        
        batchIds.forEach(studentId => {
          const studentRef = doc(db, 'students', studentId);
          batch.delete(studentRef);
        });
        
        await batch.commit();
      }

      alert(`✅ Successfully deleted ${selectedStudents.length} student(s)`);
      setSelectedStudents([]);
      fetchStudents();
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Failed to delete students: ' + error.message);
    }
  };

  const handleContextMenu = (e, studentId) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      studentId: studentId
    });
  };

  const enableSelectionMode = () => {
    setSelectionMode(true);
    if (contextMenu.studentId) {
      setSelectedStudents([contextMenu.studentId]);
    }
    setContextMenu({ visible: false, x: 0, y: 0, studentId: null });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedStudents([]);
  };

  // Close context menu when clicking anywhere
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, studentId: null });
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  // ============= END BULK DELETE FUNCTIONS =============


  // ============= BULK IMPORT FUNCTIONS =============

  // Map common column name variations to our field names
  const mapColumnName = (header) => {
    const normalized = header.toLowerCase().trim();
    
    // Check for subject columns (Subject1_Name, Subject1_Marks, etc.)
    const subjectPattern = /^subject(\d+)_(name|type|marks)$/i;
    const subjectMatch = header.match(subjectPattern);
    if (subjectMatch) {
      const [, num, type] = subjectMatch;
      return `subject${num}_${type.toLowerCase()}`;
    }
    
    const mappings = {
      'name': ['name', 'full name', 'student name', 'fullname'],
      'rollNumber': ['roll number', 'roll no', 'roll', 'rollno', 'roll_number'],
      'studentId': ['student id', 'id', 'studentid', 'student_id', 'pta'],
      'branch': ['branch', 'department', 'dept', 'course'],
      'semester': ['semester', 'sem'],
      'cgpa': ['cgpa', 'gpa'],
      'backPapers': ['back papers', 'backlogs', 'arrears', 'backpapers', 'backs'],
      'internalMarks': ['internal marks', 'internals', 'internal', 'internalmarks'],
      'email': ['email', 'e-mail', 'mail'],
      'phone': ['phone', 'mobile', 'phone number', 'contact', 'phonenumber'],
      'dateOfBirth': ['date of birth', 'dob', 'birthdate', 'birth date'],
      'gender': ['gender', 'sex'],
      'address': ['address', 'location'],
      'guardianName': ['guardian name', 'parent name', 'guardianname', 'parent'],
      'guardianPhone': ['guardian phone', 'parent phone', 'guardian contact', 'guardianphone'],
      'bloodGroup': ['blood group', 'bloodgroup', 'blood'],
      'attendance': ['attendance', 'attendance %', 'attendance percentage']
    };

    for (const [field, variations] of Object.entries(mappings)) {
      if (variations.includes(normalized)) {
        return field;
      }
    }
    return null;
  };

  // Parse Excel/CSV file
  const handleFileUpload = async (file) => {
    try {
      setUploadedFile(file);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          // Map column names and parse data
          const mappedData = jsonData.map((row, index) => {
            const mappedRow = { _rowNumber: index + 2 }; // +2 for header and 0-index
            
            for (const [key, value] of Object.entries(row)) {
              const mappedKey = mapColumnName(key);
              if (mappedKey && value !== null && value !== undefined && value !== '') {
                mappedRow[mappedKey] = String(value).trim();
              }
            }
            
            return mappedRow;
          });

          setParsedData(mappedData);
          validateParsedData(mappedData);
        } catch (error) {
          alert('Error parsing file: ' + error.message);
          console.error('Parse error:', error);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      alert('Error reading file: ' + error.message);
      console.error('File read error:', error);
    }
  };

  // Validate parsed data
  const validateParsedData = async (data) => {
    const results = {
      valid: [],
      errors: [],
      warnings: [],
      duplicates: []
    };

    // Fetch existing Student IDs from Firestore
    let existingStudentIds = new Set();
    try {
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      studentsSnapshot.forEach(doc => {
        const studentData = doc.data();
        if (studentData.studentId) {
          existingStudentIds.add(studentData.studentId.toLowerCase().trim());
        }
      });
    } catch (error) {
      console.error('Error fetching existing students:', error);
      alert('Warning: Could not check for duplicates. Proceeding with validation...');
    }

    // Track Student IDs in current upload to detect duplicates within the file
    const uploadedStudentIds = new Set();

    data.forEach((row) => {
      const issues = [];
      
      // Check required fields
      if (!row.name || !row.rollNumber || !row.studentId) {
        const missing = [];
        if (!row.name) missing.push('Name');
        if (!row.rollNumber) missing.push('Roll Number');
        if (!row.studentId) missing.push('Student ID');
        
        results.errors.push({
          row: row._rowNumber,
          message: `Missing required fields: ${missing.join(', ')}`
        });
        return; // Skip further validation for this row
      }

      // Check for duplicate Student ID in database
      const studentIdLower = row.studentId.toLowerCase().trim();
      if (existingStudentIds.has(studentIdLower)) {
        results.duplicates.push({
          row: row._rowNumber,
          message: `Student ID "${row.studentId}" already exists in database`,
          studentId: row.studentId
        });
        return; // Skip this row - don't add to valid
      }

      // Check for duplicate Student ID within the uploaded file
      if (uploadedStudentIds.has(studentIdLower)) {
        results.duplicates.push({
          row: row._rowNumber,
          message: `Duplicate Student ID "${row.studentId}" found in uploaded file`,
          studentId: row.studentId
        });
        return; // Skip this row
      }

      uploadedStudentIds.add(studentIdLower);

      // Validate numeric fields
      if (row.cgpa && (isNaN(parseFloat(row.cgpa)) || parseFloat(row.cgpa) < 0 || parseFloat(row.cgpa) > 10)) {
        issues.push('Invalid CGPA');
      }
      if (row.semester && (isNaN(parseInt(row.semester)) || parseInt(row.semester) < 1 || parseInt(row.semester) > 8)) {
        issues.push('Invalid Semester');
      }
      if (row.backPapers && isNaN(parseInt(row.backPapers))) {
        issues.push('Invalid Back Papers');
      }
      if (row.internalMarks && (isNaN(parseFloat(row.internalMarks)) || parseFloat(row.internalMarks) < 0 || parseFloat(row.internalMarks) > 100)) {
        issues.push('Invalid Internal Marks');
      }

      if (issues.length > 0) {
        results.warnings.push({
          row: row._rowNumber,
          message: issues.join(', ')
        });
      }
      
      results.valid.push(row);
    });

    setValidationResults(results);
  };

  // Download Excel template
  const downloadTemplate = () => {
    const templateData = [
      {
        'Name': 'John Doe',
        'Roll Number': 'R001',
        'Student ID': 'PTA001',
        'Branch': 'CSE',
        'Semester': 5,
        'CGPA': 8.5,
        'Back Papers': 0,
        'Internal Marks': 85,
        'Email': 'john@example.com',
        'Phone': '+91 9876543210',
        'Date of Birth': '2003-01-15',
        'Gender': 'Male',
        'Address': '123 Main St, City',
        'Guardian Name': 'John Sr.',
        'Guardian Phone': '+91 9876543211',
        'Blood Group': 'O+',
        'Attendance': 90
      },
      {
        'Name': 'Jane Smith',
        'Roll Number': 'R002',
        'Student ID': 'PTA002',
        'Branch': 'ECE',
        'Semester': 6,
        'CGPA': 7.8,
        'Back Papers': 1,
        'Internal Marks': 75,
        'Email': 'jane@example.com',
        'Phone': '+91 9876543212',
        'Date of Birth': '2002-05-20',
        'Gender': 'Female',
        'Address': '456 Park Ave, Town',
        'Guardian Name': 'Jane Sr.',
        'Guardian Phone': '+91 9876543213',
        'Blood Group': 'A+',
        'Attendance': 85
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student_import_template.xlsx');
  };

  // Download marks update template (for end of semester)
  const downloadMarksTemplate = async () => {
    try {
      // Get current students to generate template with their subjects
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      const templateData = [];
      studentsSnapshot.docs.forEach(doc => {
        const student = doc.data();
        if (student.subjects && student.subjects.length > 0) {
          const row = {
            'Student ID': student.studentId,
            'Name': student.name,
            'Branch': student.branch,
            'Semester': student.semester
          };
          
          // Add columns for each subject
          student.subjects.forEach((subject, index) => {
            row[`Subject${index + 1}_Name`] = subject.name;
            row[`Subject${index + 1}_Type`] = subject.type;
            row[`Subject${index + 1}_Marks`] = subject.internalMarks || ''; // Blank if not graded
          });
          
          templateData.push(row);
        }
      });
      
      if (templateData.length === 0) {
        alert('No students with subjects found. Add students with subjects first.');
        return;
      }
      
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Update');
      XLSX.writeFile(workbook, 'student_marks_update_template.xlsx');
    } catch (error) {
      console.error('Error generating template:', error);
      alert('Failed to generate template: ' + error.message);
    }
  };

  // Import students to Firestore
  const importStudentsToFirestore = async () => {
    if (!validationResults || validationResults.valid.length === 0) {
      alert('No valid students to import');
      return;
    }

    if (!hasFacultyAccess()) {
      alert('You do not have permission to import student records.');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const validStudents = validationResults.valid;
      const batchSize = 500; // Firestore limit
      let importedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < validStudents.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchStudents = validStudents.slice(i, i + batchSize);

        batchStudents.forEach((student) => {
          const { _rowNumber, ...studentData } = student;
          
          // Parse numeric fields with defaults
          const processedData = {
            name: studentData.name || '',
            rollNumber: studentData.rollNumber || '',
            studentId: studentData.studentId || '',
            branch: studentData.branch || '',
            semester: studentData.semester ? parseInt(studentData.semester) : 0,
            cgpa: studentData.cgpa ? parseFloat(studentData.cgpa) : 0,
            backPapers: studentData.backPapers ? parseInt(studentData.backPapers) : 0,
            internalMarks: studentData.internalMarks ? parseFloat(studentData.internalMarks) : 0,
            email: studentData.email || '',
            phone: studentData.phone || '',
            dateOfBirth: studentData.dateOfBirth || '',
            gender: studentData.gender || '',
            address: studentData.address || '',
            guardianName: studentData.guardianName || '',
            guardianPhone: studentData.guardianPhone || '',
            bloodGroup: studentData.bloodGroup || '',
            attendance: studentData.attendance ? parseFloat(studentData.attendance) : 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const docRef = doc(collection(db, 'students'));
          batch.set(docRef, processedData);
        });

        await batch.commit();
        importedCount += batchStudents.length;
        setImportProgress(Math.round((importedCount / validStudents.length) * 100));
      }

      alert(`✅ Successfully imported ${importedCount} students!` + 
            (validationResults.errors.length > 0 ? `\n⚠️ ${validationResults.errors.length} rows skipped due to errors.` : '') +
            (validationResults.duplicates?.length > 0 ? `\n🔄 ${validationResults.duplicates.length} duplicates skipped.` : ''));
      
      fetchStudents();
      closeBulkImportModal();
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import students: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // Bulk update marks for existing students
  const bulkUpdateMarks = async () => {
    if (!validationResults || validationResults.valid.length === 0) {
      alert('No valid data to update');
      return;
    }

    if (!hasFacultyAccess()) {
      alert('You do not have permission to update student records.');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      let updatedCount = 0;
      let notFoundCount = 0;
      const errors = [];

      for (let i = 0; i < validationResults.valid.length; i++) {
        const row = validationResults.valid[i];
        
        try {
          // Find student by ID
          const studentsRef = collection(db, 'students');
          const q = query(studentsRef, where('studentId', '==', row.studentId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const existingStudent = studentDoc.data();
            
            // Parse subjects from Excel row and update marks
            const updatedSubjects = [...(existingStudent.subjects || [])];
            
            for (let j = 1; j <= 20; j++) {
              const subjectNameKey = `subject${j}_name`;
              const subjectMarksKey = `subject${j}_marks`;
              
              if (row[subjectNameKey]) {
                const subjectName = row[subjectNameKey];
                const newMarks = row[subjectMarksKey];
                
                // Find and update matching subject
                const subjectIndex = updatedSubjects.findIndex(s => 
                  s.name.toLowerCase().trim() === subjectName.toLowerCase().trim()
                );
                
                if (subjectIndex >= 0 && newMarks !== '' && newMarks !== null && newMarks !== undefined) {
                  updatedSubjects[subjectIndex] = {
                    ...updatedSubjects[subjectIndex],
                    internalMarks: parseFloat(newMarks)
                  };
                }
              }
            }
            
            // Update student with new marks
            const studentRef = doc(db, 'students', studentDoc.id);
            await updateDoc(studentRef, {
              subjects: updatedSubjects,
              updatedAt: new Date().toISOString()
            });
            
            updatedCount++;
          } else {
            notFoundCount++;
            errors.push(`Student ID ${row.studentId} not found`);
          }
        } catch (error) {
          console.error(`Error updating student ${row.studentId}:`, error);
          errors.push(`Failed to update ${row.studentId}: ${error.message}`);
        }
        
        setImportProgress(Math.round(((i + 1) / validationResults.valid.length) * 100));
      }

      let message = `✅ Successfully updated ${updatedCount} student(s)!`;
      if (notFoundCount > 0) message += `\n⚠️ ${notFoundCount} student ID(s) not found.`;
      if (errors.length > 0 && errors.length <= 5) {
        message += '\n\nErrors:\n' + errors.join('\n');
      }
      
      alert(message);
      fetchStudents();
      closeBulkImportModal();
    } catch (error) {
      console.error('Bulk update error:', error);
      alert('Failed to update marks: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // Close bulk import modal and reset
  const closeBulkImportModal = () => {
    setBulkImportModalOpen(false);
    setBulkUpdateMode(false);  // Reset update mode
    setUploadedFile(null);
    setParsedData([]);
    setValidationResults(null);
    setImportProgress(0);
    setImporting(false);
    setIsDragging(false);
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // ============= END BULK IMPORT FUNCTIONS =============


  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.branch?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSemester = filterSemester === 'all' || student.semester === parseInt(filterSemester);
    const prediction = predictPassFail(student);
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'pass' && prediction === 'Pass') ||
      (filterStatus === 'fail' && prediction === 'Fail') ||
      (filterStatus === 'at-risk' && isAtRisk(student));
    
    return matchesSearch && matchesSemester && matchesStatus;
  });

  const stats = {
    total: students.length,
    pass: students.filter(s => predictPassFail(s) === 'Pass').length,
    fail: students.filter(s => predictPassFail(s) === 'Fail').length,
    atRisk: students.filter(s => isAtRisk(s)).length
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Student Records
              </h1>
              <p className="text-xl text-gray-400">
                {hasFacultyAccess() ? 'Manage student data and track performance' : 'View student records and predictions'}
              </p>
            </div>
            
            {hasFacultyAccess() && (
              <div className="flex gap-3">
                <GradientButton
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Student
                </GradientButton>
                
                <GradientButton
                  onClick={() => setBulkImportModalOpen(true)}
                  className="flex items-center gap-2"
                  variant="secondary"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  📤 Bulk Import
                </GradientButton>
                
                <GradientButton
                  onClick={() => {
                    setBulkUpdateMode(true);
                    setBulkImportModalOpen(true);
                  }}
                  className="flex items-center gap-2"
                  variant="secondary"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  📝 Update Marks
                </GradientButton>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Students', value: stats.total, icon: '👥', gradient: 'from-blue-500 to-cyan-500' },
            { label: 'Predicted Pass', value: stats.pass, icon: '✅', gradient: 'from-green-500 to-emerald-500' },
            { label: 'Predicted Fail', value: stats.fail, icon: '❌', gradient: 'from-red-500 to-pink-500' },
            { label: 'At Risk', value: stats.atRisk, icon: '⚠️', gradient: 'from-yellow-500 to-orange-500' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <div className={`text-3xl mb-2 inline-block p-2 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                  {stat.icon}
                </div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by name, roll number, ID, or branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 rounded-lg bg-white/5 border border-white/10 focus:border-pink-500 focus:outline-none"
              />
              <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Semester Filter */}
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-pink-500 focus:outline-none"
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-pink-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pass">Predicted Pass</option>
              <option value="fail">Predicted Fail</option>
              <option value="at-risk">At Risk</option>
            </select>
          </div>
        </Card>

        {/* Bulk Selection Toolbar */}
        {hasFacultyAccess() && selectionMode && filteredStudents.length > 0 && (
          <Card className="mb-6 border-pink-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-pink-500 focus:ring-2 focus:ring-pink-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium">
                    {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                </label>
                
                {selectedStudents.length > 0 && (
                  <span className="text-sm text-gray-400">
                    {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {selectedStudents.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-colors text-red-400 font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete {selectedStudents.length} Student{selectedStudents.length > 1 ? 's' : ''}
                  </button>
                )}
                
                <button
                  onClick={exitSelectionMode}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors text-gray-300 font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit Selection
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Student Grid */}
        {loading ? (
          <Card className="text-center py-12">
            <div className="animate-pulse text-gray-400">Loading students...</div>
          </Card>
        ) : filteredStudents.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-400">
              {students.length === 0 ? 'No students found. Add your first student!' : 'No students match your filters.'}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student, index) => {
              const prediction = predictPassFail(student);
              const atRisk = isAtRisk(student);
              
              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={atRisk ? 'animate-pulse-glow' : ''}
                >
                  <Card 
                    className={`h-full hover:border-pink-500/50 ${atRisk ? 'border-orange-500/50' : ''} ${selectedStudents.includes(student.id) ? 'ring-2 ring-pink-500' : ''}`}
                    onContextMenu={(e) => hasFacultyAccess() && handleContextMenu(e, student.id)}
                  >
                    {/* Student Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Selection Checkbox - Only visible in selection mode */}
                        {hasFacultyAccess() && selectionMode && (
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-pink-500 focus:ring-2 focus:ring-pink-500 cursor-pointer"
                          />
                        )}
                        
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-xl font-bold">
                          {student.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{student.name}</h3>
                          <p className="text-sm text-gray-400">{student.rollNumber}</p>
                        </div>
                      </div>
                      
                      {/* Prediction Badge */}
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        prediction === 'Pass' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {prediction}
                      </div>
                    </div>

                    {/* Student Details */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Student ID:</span>
                        <span className="font-semibold">{student.studentId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Branch:</span>
                        <span className="font-semibold">{student.branch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Semester:</span>
                        <span className="font-semibold">{student.semester}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">CGPA:</span>
                        <span className={`font-bold ${parseFloat(student.cgpa) < 5.5 ? 'text-red-400' : 'text-green-400'}`}>
                          {student.cgpa}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Back Papers:</span>
                        <span className={`font-bold ${parseInt(student.backPapers) > 0 ? 'text-orange-400' : 'text-gray-300'}`}>
                          {student.backPapers}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Internal Marks:</span>
                        <span className={`font-bold ${getInternalMarks(student) < 40 ? 'text-red-400' : 'text-green-400'}`}>
                          {getInternalMarks(student)}%
                        </span>
                      </div>
                    </div>

                    {/* At Risk Warning */}
                    {atRisk && (
                      <div className="mb-4 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>At Risk Student</span>
                      </div>
                    )}

                    {/* Action Buttons - Only for Faculty/Admin */}
                    {hasFacultyAccess() && (
                      <div className="flex gap-2 pt-4 border-t border-white/10">
                        <button
                          onClick={() => handleEdit(student)}
                          className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors text-sm font-semibold text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Student Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add New Student'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Roll Number"
              value={formData.rollNumber}
              onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              required
            />
            <Input
              label="Student ID"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              required
            />
            <Input
              label="Branch"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="e.g., CSE, ECE, ME"
              required
            />
            <Input
              label="Semester"
              type="number"
              min="1"
              max="8"
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              required
            />
            <Input
              label="CGPA"
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={formData.cgpa}
              onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
              required
            />
            
            {/* Backlog Papers Section - NEW */}
            <div className="col-span-2">
              <BacklogPaperManager
                backlogPapers={formData.backlogPapers}
                onChange={(backlogPapers) => setFormData({ ...formData, backlogPapers })}
              />
            </div>
            
            {/* Subjects Section - NEW */}
            <div className="col-span-2">
              <SubjectInputList
                subjects={formData.subjects}
                onChange={(subjects) => setFormData({ ...formData, subjects })}
                readOnly={false}
              />
            </div>
            
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g., +91 9876543210"
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:border-pink-500 focus:outline-none text-white"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <Input
              label="Blood Group"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              placeholder="e.g., O+, A-, B+"
            />
            <Input
              label="Attendance (%)"
              type="number"
              min="0"
              max="100"
              value={formData.attendance}
              onChange={(e) => setFormData({ ...formData, attendance: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full address"
              className="md:col-span-2"
            />
            <Input
              label="Guardian Name"
              value={formData.guardianName}
              onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
              placeholder="Parent/Guardian name"
            />
            <Input
              label="Guardian Phone"
              type="tel"
              value={formData.guardianPhone}
              onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
              placeholder="Guardian contact number"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <GradientButton type="submit" className="flex-1">
              {editingStudent ? 'Update Student' : 'Add Student'}
            </GradientButton>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal 
        isOpen={bulkImportModalOpen} 
        onClose={closeBulkImportModal} 
        title={bulkUpdateMode ? "📝 Bulk Update Marks" : "📤 Bulk Import Students"}
        size="large"
      >
        <div className="space-y-6">
          {/* Template Download Section */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  {bulkUpdateMode ? "Update Existing Students' Marks" : "Import New Students"}
                </h3>
                <p className="text-gray-300 text-sm mb-3">
                  {bulkUpdateMode 
                    ? "Download the template with current students and their subjects. Fill in the marks and upload to update."
                    : "Download the Excel template, fill in student data, and upload to import multiple students at once."}
                </p>
                <button
                  onClick={bulkUpdateMode ? downloadMarksTemplate : downloadTemplate}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm font-semibold text-blue-400 transition-colors"
                >
                  📥 Download {bulkUpdateMode ? "Marks Update" : ""} Template
                </button>
              </div>
            </div>
          </div>

          {/* File Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragging 
                ? 'border-pink-500 bg-pink-500/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex flex-col items-center gap-4">
              <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              
              <div>
                <p className="text-lg font-semibold mb-1">
                  {uploadedFile ? uploadedFile.name : 'Drop your Excel or CSV file here'}
                </p>
                <p className="text-sm text-gray-400">
                  or click to browse
                </p>
              </div>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                id="bulk-upload-input"
              />
              <GradientButton 
                onClick={() => document.getElementById('bulk-upload-input')?.click()}
                type="button"
                className="cursor-pointer"
              >
                Choose File
              </GradientButton>

              <p className="text-xs text-gray-500">
                Supports: .xlsx, .xls, .csv (Max 1000 rows recommended)
              </p>
            </div>
          </div>

          {/* Validation Summary */}
          {validationResults && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{validationResults.valid.length}</div>
                <div className="text-sm text-gray-400">✅ Valid Records</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{validationResults.warnings.length}</div>
                <div className="text-sm text-gray-400">⚠️ Warnings</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-400">{validationResults.errors.length}</div>
                <div className="text-sm text-gray-400">❌ Errors</div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-400">{validationResults.duplicates?.length || 0}</div>
                <div className="text-sm text-gray-400">🔄 Duplicates</div>
              </div>
            </div>
          )}

          {/* Error/Warning/Duplicate Messages */}
          {validationResults && (validationResults.errors.length > 0 || validationResults.warnings.length > 0 || validationResults.duplicates?.length > 0) && (
            <div className="max-h-40 overflow-y-auto space-y-2">
              {validationResults.duplicates?.map((duplicate, idx) => (
                <div key={`dup-${idx}`} className="bg-orange-500/10 border border-orange-500/30 rounded p-2 text-sm">
                  <span className="text-orange-400 font-semibold">Row {duplicate.row}:</span>
                  <span className="text-gray-300 ml-2">{duplicate.message}</span>
                </div>
              ))}
              {validationResults.errors.map((error, idx) => (
                <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded p-2 text-sm">
                  <span className="text-red-400 font-semibold">Row {error.row}:</span>
                  <span className="text-gray-300 ml-2">{error.message}</span>
                </div>
              ))}
              {validationResults.warnings.slice(0, 5).map((warning, idx) => (
                <div key={idx} className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-sm">
                  <span className="text-yellow-400 font-semibold">Row {warning.row}:</span>
                  <span className="text-gray-300 ml-2">{warning.message}</span>
                </div>
              ))}
              {validationResults.warnings.length > 5 && (
                <div className="text-center text-sm text-gray-400">
                  ... and {validationResults.warnings.length - 5} more warnings
                </div>
              )}
            </div>
          )}

          {/* Data Preview */}
          {parsedData.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Preview (First 5 rows):</h3>
              <div className="overflow-x-auto max-h-60 overflow-y-auto border border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Roll No</th>
                      <th className="px-3 py-2 text-left">Student ID</th>
                      <th className="px-3 py-2 text-left">Branch</th>
                      <th className="px-3 py-2 text-left">CGPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-700">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{row.name || '-'}</td>
                        <td className="px-3 py-2">{row.rollNumber || '-'}</td>
                        <td className="px-3 py-2">{row.studentId || '-'}</td>
                        <td className="px-3 py-2">{row.branch || '-'}</td>
                        <td className="px-3 py-2">{row.cgpa || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 5 && (
                <p className="text-center text-sm text-gray-400 mt-2">
                  ... and {parsedData.length - 5} more rows
                </p>
              )}
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Importing...</span>
                <span className="text-pink-400 font-semibold">{importProgress}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${importProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={closeBulkImportModal}
              disabled={importing}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <GradientButton
              onClick={bulkUpdateMode ? bulkUpdateMarks : importStudentsToFirestore}
              disabled={!validationResults || validationResults.valid.length === 0 || importing}
              className="flex-1"
            >
                {importing 
                  ? `${bulkUpdateMode ? 'Updating' : 'Importing'}... ${importProgress}%` 
                  : `${bulkUpdateMode ? 'Update' : 'Import'} ${validationResults?.valid.length || 0} Student${validationResults?.valid.length !== 1 ? 's' : ''}`
                }
            </GradientButton>
          </div>
        </div>
      </Modal>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2 z-50"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            onClick={enableSelectionMode}
            className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Multiple Select
          </button>
        </div>
      )}

      {/* ConfirmDialog Component */}
      <ConfirmDialog 
        isOpen={confirmOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        {...confirmConfig}
      />
    </div>
  );
};

export default StudentRecords;

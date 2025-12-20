import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import GradientButton from '../components/ui/GradientButton';

const StudentRecords = () => {
  const { hasFacultyAccess, isStudent } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
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
    internalMarks: '',
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
    const internalMarks = parseFloat(student.internalMarks) || 0;

    // Algorithm: Fail if CGPA < 5.5 OR backPapers > 2 OR internal marks < 40%
    if (cgpa < 5.5 || backPapers > 2 || internalMarks < 40) {
      return 'Fail';
    }
    return 'Pass';
  };

  const isAtRisk = (student) => {
    const cgpa = parseFloat(student.cgpa) || 0;
    const backPapers = parseInt(student.backPapers) || 0;
    const internalMarks = parseFloat(student.internalMarks) || 0;
    
    return cgpa < 6.0 || backPapers > 0 || internalMarks < 50;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasFacultyAccess()) {
      alert('You do not have permission to create/edit student records.');
      return;
    }

    try {
      const studentData = {
        ...formData,
        cgpa: parseFloat(formData.cgpa),
        backPapers: parseInt(formData.backPapers),
        internalMarks: parseFloat(formData.internalMarks),
        semester: parseInt(formData.semester),
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
      internalMarks: student.internalMarks?.toString() || '',
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
      alert('You do not have permission to delete student records.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this student record?')) {
      try {
        await deleteDoc(doc(db, 'students', studentId));
        fetchStudents();
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student.');
      }
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
      internalMarks: '',
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
              <GradientButton
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Student
              </GradientButton>
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
                  <Card className={`h-full hover:border-pink-500/50 ${atRisk ? 'border-orange-500/50' : ''}`}>
                    {/* Student Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
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
                        <span className={`font-bold ${parseFloat(student.internalMarks) < 40 ? 'text-red-400' : 'text-green-400'}`}>
                          {student.internalMarks}%
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
            <Input
              label="Back Papers"
              type="number"
              min="0"
              value={formData.backPapers}
              onChange={(e) => setFormData({ ...formData, backPapers: e.target.value })}
              required
            />
            <Input
              label="Internal Marks (%)"
              type="number"
              min="0"
              max="100"
              value={formData.internalMarks}
              onChange={(e) => setFormData({ ...formData, internalMarks: e.target.value })}
              required
            />
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
    </div>
  );
};

export default StudentRecords;

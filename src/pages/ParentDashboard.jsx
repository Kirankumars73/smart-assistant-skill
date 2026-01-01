import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getLinkedStudentData, hasLinkedStudent } from '../utils/parentHelpers';
import { getInternalMarks } from '../utils/subjectHelpers';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ParentOnboarding from '../components/parent/ParentOnboarding';

/**
 * Parent Dashboard
 * View-only dashboard for parents to monitor their child's academic progress
 */
function ParentDashboard() {
  const { userProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStudentData();
  }, [userProfile]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if parent has linked student
      if (!hasLinkedStudent(userProfile)) {
        setShowOnboarding(true);
        setLoading(false);
        return;
      }

      // Fetch student data
      const studentData = await getLinkedStudentData(userProfile.linkedStudentId);
      
      if (!studentData) {
        setError('Student data not found. Please contact administration.');
        setLoading(false);
        return;
      }

      setStudent(studentData);
    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err.message || 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = (linkedStudent) => {
    setStudent(linkedStudent);
    setShowOnboarding(false);
  };

  // Pass/Fail Prediction Algorithm (same as StudentRecords)
  const predictPassFail = (studentData) => {
    const cgpa = parseFloat(studentData.cgpa) || 0;
    const backPapers = parseInt(studentData.backPapers) || 0;
    const internalMarks = getInternalMarks(studentData);

    if (cgpa < 5.5 || backPapers > 2 || internalMarks < 40) {
      return { status: 'Fail', color: 'red', icon: '❌' };
    }
    return { status: 'Pass', color: 'green', icon: '✅' };
  };

  const getAtRiskStatus = (studentData) => {
    const cgpa = parseFloat(studentData.cgpa) || 0;
    const backPapers = parseInt(studentData.backPapers) || 0;
    const internalMarks = getInternalMarks(studentData);

    if (cgpa < 6.0 || backPapers > 0 || internalMarks < 50) {
      return { atRisk: true, color: 'yellow', icon: '⚠️', message: 'Needs Attention' };
    }
    return { atRisk: false, color: 'green', icon: '✅', message: 'On Track' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <ParentOnboarding
          isOpen={showOnboarding}
          userId={currentUser?.uid}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-white mb-2">Unable to Load Data</h2>
            <p className="text-gray-400">{error}</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  const prediction = predictPassFail(student);
  const riskStatus = getAtRiskStatus(student);
  const avgInternalMarks = getInternalMarks(student);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Student Progress</h1>
          <p className="text-gray-400">Monitoring academic performance for {student.name}</p>
        </motion.div>

        {/* Student Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-start gap-6">
              {/* Student Avatar */}
              <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-4xl font-bold text-white flex-shrink-0">
                {student.name?.charAt(0) || 'S'}
              </div>

              {/* Student Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-4">{student.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Student ID</p>
                    <p className="text-white font-medium">{student.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Branch</p>
                    <p className="text-white font-medium">{student.branch}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Semester</p>
                    <p className="text-white font-medium">{student.semester}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Roll Number</p>
                    <p className="text-white font-medium">{student.rollNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CGPA Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Current CGPA</h3>
              <div className="text-4xl font-bold text-white mb-2">{student.cgpa || 'N/A'}</div>
              <div className="text-sm text-gray-400">Out of 10.0</div>
              {parseFloat(student.cgpa) < 6.0 && (
                <div className="mt-3 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-200 text-xs">
                  Below average - needs improvement
                </div>
              )}
            </Card>
          </motion.div>

          {/* Internal Marks Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-500/20">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Internal Marks</h3>
              <div className="text-4xl font-bold text-white mb-2">{avgInternalMarks.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Overall performance</div>
              {avgInternalMarks < 50 && (
                <div className="mt-3 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-xs">
                  Critical - immediate attention needed
                </div>
              )}
            </Card>
          </motion.div>

          {/* Back Papers Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className={`p-6 bg-gradient-to-br ${parseInt(student.backPapers) > 0 ? 'from-red-500/10 to-orange-500/10 border-red-500/20' : 'from-gray-500/10 to-gray-600/10 border-gray-500/20'}`}>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Back Papers</h3>
              <div className="text-4xl font-bold text-white mb-2">{student.backPapers || 0}</div>
              <div className="text-sm text-gray-400">Pending backlogs</div>
              {parseInt(student.backPapers) === 0 && (
                <div className="mt-3 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg text-green-200 text-xs">
                  No backlogs - excellent!
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Prediction & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pass/Fail Prediction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Pass/Fail Prediction</h3>
              <div className={`flex items-center gap-3 p-4 rounded-lg bg-${prediction.color}-500/10 border border-${prediction.color}-500/30`}>
                <span className="text-4xl">{prediction.icon}</span>
                <div>
                  <div className={`text-2xl font-bold text-${prediction.color}-400`}>{prediction.status}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {prediction.status === 'Pass' 
                      ? 'Based on current performance metrics' 
                      : 'Requires immediate attention and improvement'}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* At-Risk Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Academic Status</h3>
              <div className={`flex items-center gap-3 p-4 rounded-lg bg-${riskStatus.color}-500/10 border border-${riskStatus.color}-500/30`}>
                <span className="text-4xl">{riskStatus.icon}</span>
                <div>
                  <div className={`text-2xl font-bold text-${riskStatus.color}-400`}>{riskStatus.message}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {riskStatus.atRisk 
                      ? 'Performance indicators show areas of concern' 
                      : 'Performing well in all areas'}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Subject-wise Performance */}
        {student.subjects && student.subjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Subject-wise Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Subject</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Internal Marks</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.subjects.map((subject, index) => {
                      const marks = parseFloat(subject.internalMarks) || 0;
                      const status = marks >= 50 ? { text: 'Good', color: 'green' } 
                                   : marks >= 40 ? { text: 'Average', color: 'yellow' }
                                   : { text: 'Poor', color: 'red' };

                      return (
                        <tr key={index} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="py-3 px-4 text-white">{subject.name || 'Unnamed Subject'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${subject.type === 'lab' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                              {subject.type === 'lab' ? '🔬 Lab' : '📘 Theory'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-white font-medium">{subject.internalMarks || 'Not Graded'}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded text-xs bg-${status.color}-500/20 text-${status.color}-300`}>
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Average Display */}
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Overall Average:</span>
                  <span className="text-2xl font-bold text-white">{avgInternalMarks.toFixed(2)}%</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Student Email</p>
                <p className="text-white">{student.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="text-white">{student.phone || 'Not provided'}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Read-only Notice */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">
            📖 <strong>Read-Only View:</strong> This is a view-only dashboard. 
            Please contact faculty or administration for any changes to student records.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ParentDashboard;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { Calendar, Users, FileText, Settings, BookOpen, Search, Clock, TrendingUp, Award } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import SpotlightCard from '../components/ui/SpotlightCard';
import Navbar from '../components/layout/Navbar';
import Input from '../components/ui/Input';
import GradientButton from '../components/ui/GradientButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import NoiseTexture from '../components/ui/NoiseTexture';
import FloatingOrbs from '../components/ui/FloatingOrbs';
import { getInternalMarks } from '../utils/subjectHelpers';
import { getBacklogStatusColor, getBacklogStatusText, canRequestClearance } from '../utils/backlogHelpers';
import { createClearanceNotification, hasPendingClearanceRequest } from '../services/notificationService';
import { useToast } from '../hooks/useToast';

const Dashboard = () => {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { userRole, currentUser } = useAuth();
  const { showToast } = useToast();
  const [studentData, setStudentData] = useState(null);
  const [isRegisteredStudent, setIsRegisteredStudent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [requestingClearance, setRequestingClearance] = useState(null);

  // Check if student is registered by email - MUST BE BEFORE CONDITIONAL RETURNS
  useEffect(() => {
    const checkStudentRegistration = async () => {
      if (userRole === 'student' && currentUser?.email) {
        try {
          const studentsRef = collection(db, 'students');
          const q = query(studentsRef, where('email', '==', currentUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            setStudentData({ id: studentDoc.id, ...studentDoc.data() });
            setIsRegisteredStudent(true);
          } else {
            setIsRegisteredStudent(false);
          }
        } catch (error) {
          console.error('Error checking student registration:', error);
          setIsRegisteredStudent(false);
        }
      }
      setLoading(false);
    };

    checkStudentRegistration();
  }, [userRole, currentUser]);

  // Show beautiful loading animation while role is being fetched
  if (currentUser && userRole === null) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center relative">
        <NoiseTexture />
        <FloatingOrbs />
        <div className="mesh-gradient-bg" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500"
          />
          <motion.h2 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl font-bold text-gradient"
          >
            Loading your dashboard...
          </motion.h2>
        </motion.div>
      </div>
    );
  }

  // Redirect parents to their own dashboard
  if (userRole === 'parent') {
    return <Navigate to="/parent-dashboard" replace />;
  }

  // Search for student by ID
  const handleSearchById = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);

    if (!searchId.trim()) {
      setSearchError('Please enter a Student ID');
      return;
    }

    if (!searchId.toUpperCase().startsWith('PTA')) {
      setSearchError('Student ID must start with "PTA"');
      return;
    }

    setSearching(true);
    try {
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('studentId', '==', searchId.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0];
        setSearchResult({ id: studentDoc.id, ...studentDoc.data() });
      } else {
        setSearchError('Student not registered. Please contact your faculty if you believe this is an error.');
      }
    } catch (error) {
      console.error('Error searching student:', error);
      setSearchError('Error searching for student. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Handle clearance request for unregistered students
  const handleRequestClearance = async (paper, student) => {
    try {
      setRequestingClearance(paper.subjectCode);
      
      // Check if already requested
      const alreadyRequested = await hasPendingClearanceRequest(student.studentId, paper.subjectCode);
      if (alreadyRequested) {
        showToast('Clearance already requested for this paper', 'warning');
        return;
      }

      // Create notification
      await createClearanceNotification(
        student.studentId,
        student.name,
        paper,
        student.id
      );

      // Update paper status locally
      const updatedPapers = student.backlogPapers.map(p => 
        p.subjectCode === paper.subjectCode 
          ? { ...p, status: 'clearance_requested', requestedAt: new Date().toISOString() }
          : p
      );

      // Update Firestore
      const studentRef = doc(db, 'students', student.id);
      await updateDoc(studentRef, {
        backlogPapers: updatedPapers
      });

      // Update local state
      setSearchResult({ ...student, backlogPapers: updatedPapers });

      showToast('Clearance request sent to faculty!', 'success');
    } catch (error) {
      console.error('Error requesting clearance:', error);
      showToast('Failed to send clearance request', 'error');
    } finally {
      setRequestingClearance(null);
    }
  };

  // Prediction function
  const predictPassFail = (student) => {
    const cgpa = parseFloat(student.cgpa) || 0;
    const backPapers = parseInt(student.backPapers) || 0;
    const internalMarks = getInternalMarks(student);  // Use helper for backward compatibility

    if (cgpa < 5.5 || backPapers > 2 || internalMarks < 40) {
      return 'Fail';
    }
    return 'Pass';
  };

  const adminServices = [
    { title: 'Timetable Generator', description: 'Create automated schedules', Icon: Calendar, path: '/timetable', color: 'from-glow-cyan to-glow-blue' },
    { title: 'Student Records', description: 'Manage student data & analytics', Icon: Users, path: '/students', color: 'from-glow-purple to-glow-pink' },
    { title: 'Question Prediction', description: 'Analyze exam papers', Icon: FileText, path: '/questions', color: 'from-glow-blue to-glow-purple' },
    { title: 'Admin Panel', description: 'Manage roles & permissions', Icon: Settings, path: '/admin', color: 'from-glow-pink to-glow-cyan' },
  ];

  const facultyServices = [
    { title: 'Timetable Generator', description: 'Create class schedules', Icon: Calendar, path: '/timetable', color: 'from-glow-cyan to-glow-blue' },
    { title: 'Student Records', description: 'View & edit student data', Icon: Users, path: '/students', color: 'from-glow-purple to-glow-pink' },
    { title: 'Question Prediction', description: 'Upload & analyze papers', Icon: FileText, path: '/questions', color: 'from-glow-blue to-glow-purple' },
  ];

  const studentServices = [
    { title: 'AI Study Materials', description: 'Generate notes, diagrams & practice questions', Icon: BookOpen, path: '/study-materials', color: 'from-glow-pink to-glow-cyan' },
    { title: 'Predicted Questions', description: 'Study smart with AI predictions', Icon: TrendingUp, path: '/questions', color: 'from-glow-blue to-glow-purple' },
    { title: 'My Timetable', description: 'View class schedule', Icon: Calendar, path: '/timetable', color: 'from-glow-cyan to-glow-blue' },
  ];

  const getServices = () => {
    switch (userRole) {
      case 'admin':
        return adminServices;
      case 'faculty':
        return facultyServices;
      case 'student':
        return studentServices;
      default:
        return [];
    }
  };

  const services = getServices();

  // Render unregistered student search interface
  if (userRole === 'student' && !loading && !isRegisteredStudent) {
    return (
      <div className="min-h-screen bg-midnight">
        <NoiseTexture />
        <FloatingOrbs />
        <div className="mesh-gradient-bg" />
        <Navbar />
        
        <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                Welcome, <span className="text-gradient">{currentUser?.displayName?.split(' ')[0] || 'Student'}</span>
              </h1>
              <p className="text-xl text-gray-400">
                Search for your student records using your Student ID
              </p>
            </motion.div>

            {/* Search Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Card variant="glow">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-glow-cyan to-glow-blue flex items-center justify-center mx-auto mb-4 shadow-glow">
                    <Search className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">Find Your Student Record</h2>
                  <p className="text-gray-400">
                    Enter your Student ID (starting with PTA) to view your academic information
                  </p>
                </div>

                <form onSubmit={handleSearchById} className="space-y-4">
                  <Input
                    label="Student ID"
                    placeholder="e.g., PTA12345"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    required
                  />
                  
                  {searchError && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {searchError}
                    </div>
                  )}

                  <GradientButton 
                    type="submit" 
                    className="w-full"
                    disabled={searching}
                  >
                    {searching ? 'Searching...' : 'Search Student Record'}
                  </GradientButton>
                </form>

                {/* Search Result */}
                {searchResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 rounded-lg bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-2xl font-bold">
                          {searchResult.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold">{searchResult.name}</h3>
                          <p className="text-gray-400">{searchResult.studentId}</p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                        predictPassFail(searchResult) === 'Pass' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {predictPassFail(searchResult)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Roll Number:</span>
                        <span className="font-semibold">{searchResult.rollNumber}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Branch:</span>
                        <span className="font-semibold">{searchResult.branch}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Semester:</span>
                        <span className="font-semibold">{searchResult.semester}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">CGPA:</span>
                        <span className={`font-bold ${parseFloat(searchResult.cgpa) < 5.5 ? 'text-red-400' : 'text-green-400'}`}>
                          {searchResult.cgpa}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Back Papers:</span>
                        <span className={`font-bold ${parseInt(searchResult.backPapers) > 0 ? 'text-orange-400' : 'text-gray-300'}`}>
                          {searchResult.backPapers}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Internal Marks:</span>
                        <span className={`font-bold ${parseFloat(searchResult.internalMarks) < 40 ? 'text-red-400' : 'text-green-400'}`}>
                          {searchResult.internalMarks}%
                        </span>
                      </div>
                      {searchResult.attendance && (
                        <div className="flex justify-between py-2 border-b border-white/10">
                          <span className="text-gray-400">Attendance:</span>
                          <span className="font-semibold">{searchResult.attendance}%</span>
                        </div>
                      )}
                      {searchResult.email && (
                        <div className="flex justify-between py-2 border-b border-white/10">
                          <span className="text-gray-400">Email:</span>
                          <span className="font-semibold">{searchResult.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Backlog Papers Section */}
                    {searchResult.backlogPapers && searchResult.backlogPapers.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Backlog Papers</h3>
                        <div className="space-y-3">
                          {searchResult.backlogPapers.map((paper, index) => (
                            <div 
                              key={index}
                              className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700"
                            >
                              <div className="flex-1">
                                <h4 className="font-semibold text-white">{paper.subjectName}</h4>
                                <p className="text-sm text-gray-400">
                                  {paper.subjectCode} • Semester {paper.semester}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getBacklogStatusColor(paper.status)}`}>
                                  {getBacklogStatusText(paper.status)}
                                </span>
                                {canRequestClearance(paper) && (
                                  <GradientButton
                                    onClick={() => handleRequestClearance(paper, searchResult)}
                                    disabled={requestingClearance === paper.subjectCode}
                                    size="sm"
                                  >
                                    {requestingClearance === paper.subjectCode ? 'Requesting...' : 'Request Clearance'}
                                  </GradientButton>
                                )}
                                {paper.status === 'clearance_requested' && (
                                  <span className="text-sm text-blue-400">
                                    ⏳ Pending approval
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
                      <p className="font-semibold mb-1">📧 Register Your Email</p>
                      <p>Contact your faculty to link your email ({currentUser.email}) with this student record for direct access.</p>
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>

            {/* Quick Access for unregistered students */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-8"
            >
              <h2 className="text-2xl font-bold mb-6">Quick Access</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {studentServices.map((service, index) => (
                  <motion.div
                    key={service.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                  >
                    <Link to={service.path}>
                      <SpotlightCard className="p-6">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 shadow-glow`}>
                          <service.Icon className="w-9 h-9 text-white" strokeWidth={2} />
                        </div>
                        <h3 className="text-xl font-display font-bold mb-2">{service.title}</h3>
                        <p className="text-gray-400 text-sm">{service.description}</p>
                        <div className="mt-4 flex items-center text-glow-cyan font-medium">
                          Open
                          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </SpotlightCard>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Render registered student dashboard
  if (userRole === 'student' && !loading && isRegisteredStudent && studentData) {
    const prediction = predictPassFail(studentData);
    
    return (
      <div className="min-h-screen bg-midnight relative">
        <NoiseTexture />
        <FloatingOrbs />
        <div className="mesh-gradient-bg" />
        <Navbar />
        
        <div className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                Welcome back, <span className="text-gradient">{studentData.name?.split(' ')[0] || 'Student'}</span>
              </h1>
              <p className="text-xl text-gray-400">
                Track your academic progress and resources
              </p>
            </motion.div>

            {/* Student Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-12"
            >
              <Card className="text-center">
                <div className={`text-3xl font-bold mb-1 ${parseFloat(studentData.cgpa) < 5.5 ? 'text-red-400' : 'text-gradient'}`}>
                  {studentData.cgpa || 'N/A'}
                </div>
                <div className="text-sm text-gray-400">Your CGPA</div>
              </Card>
              <Card className="text-center">
                <div className={`text-3xl font-bold mb-1 ${parseInt(studentData.backPapers) > 0 ? 'text-orange-400' : 'text-gradient'}`}>
                  {studentData.backPapers || '0'}
                </div>
                <div className="text-sm text-gray-400">Back Papers</div>
              </Card>
              <Card className="text-center">
                <div className="text-3xl font-bold text-gradient mb-1">
                  {studentData.attendance || 'N/A'}
                  {studentData.attendance && '%'}
                </div>
                <div className="text-sm text-gray-400">Attendance</div>
              </Card>
              <Card className="text-center">
                <div className={`text-3xl font-bold mb-1 ${prediction === 'Pass' ? 'text-green-400' : 'text-red-400'}`}>
                  {prediction}
                </div>
                <div className="text-sm text-gray-400">Prediction</div>
              </Card>
            </motion.div>
          </div>

          {/* Backlog Papers Section for Registered Students */}
          {studentData.backlogPapers && studentData.backlogPapers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold mb-4">📚 Your Backlog Papers</h2>
              <Card>
                <div className="space-y-3">
                  {studentData.backlogPapers.map((paper, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{paper.subjectName}</h3>
                        <p className="text-sm text-gray-400">
                          {paper.subjectCode} • Semester {paper.semester}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getBacklogStatusColor(paper.status)}`}>
                          {getBacklogStatusText(paper.status)}
                        </span>
                        {canRequestClearance(paper) && (
                          <GradientButton
                            onClick={() => handleRequestClearance(paper, studentData)}
                            disabled={requestingClearance === paper.subjectCode}
                            size="sm"
                          >
                            {requestingClearance === paper.subjectCode ? 'Requesting...' : 'Request Clearance'}
                          </GradientButton>
                        )}
                        {paper.status === 'clearance_requested' && (
                          <span className="text-sm text-blue-400">
                            ⏳ Pending approval
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-400">
                    💡 <strong>Tip:</strong> Request clearance once you've cleared a paper. Faculty will review and approve your request.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Services Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold mb-6">Quick Access</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {studentServices.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                >
                  <Link to={service.path}>
                    <SpotlightCard className="p-6">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 shadow-glow`}>
                        <service.Icon className="w-9 h-9 text-white" strokeWidth={2} />
                      </div>
                      <h3 className="text-xl font-display font-bold mb-2">{service.title}</h3>
                      <p className="text-gray-400 text-sm">{service.description}</p>
                      <div className="mt-4 flex items-center text-glow-cyan font-medium">
                        Open
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </SpotlightCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Default dashboard for faculty/admin
  return (
    <div className="min-h-screen bg-midnight relative">
      <NoiseTexture />
      <FloatingOrbs />
      <div className="mesh-gradient-bg" />
      <Navbar />
      
      <div className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Welcome back, <span className="text-gradient">{currentUser?.displayName?.split(' ')[0] || 'User'}</span>
            </h1>
            <p className="text-xl text-gray-400">
              {userRole === 'admin' && 'Manage your entire academic system from here.'}
              {userRole === 'faculty' && 'Access teaching tools and student analytics.'}
              {userRole === 'student' && loading && 'Loading your dashboard...'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold mb-6">Quick Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                >
                  <Link to={service.path}>
                    <SpotlightCard className="p-6">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 shadow-glow`}>
                        <service.Icon className="w-9 h-9 text-white" strokeWidth={2} />
                      </div>
                      <h3 className="text-xl font-display font-bold mb-2">{service.title}</h3>
                      <p className="text-gray-400 text-sm">{service.description}</p>
                      <div className="mt-4 flex items-center text-glow-cyan font-medium">
                        Open
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </SpotlightCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

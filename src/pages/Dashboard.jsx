import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Navbar from '../components/layout/Navbar';

const Dashboard = () => {
  const { userRole, currentUser } = useAuth();

  const adminServices = [
    { title: 'Timetable Generator', description: 'Create automated schedules', icon: '📅', path: '/timetable', color: 'from-orange-500 to-pink-500' },
    { title: 'Student Records', description: 'Manage student data & analytics', icon: '👥', path: '/students', color: 'from-purple-500 to-pink-500' },
    { title: 'Question Prediction', description: 'Analyze exam papers', icon: '📝', path: '/questions', color: 'from-indigo-500 to-purple-500' },
    { title: 'User Management', description: 'Manage roles & permissions', icon: '⚙️', path: '/users', color: 'from-pink-500 to-orange-500' },
  ];

  const facultyServices = [
    { title: 'Timetable Generator', description: 'Create class schedules', icon: '📅', path: '/timetable', color: 'from-orange-500 to-pink-500' },
    { title: 'Student Records', description: 'View & edit student data', icon: '👥', path: '/students', color: 'from-purple-500 to-pink-500' },
    { title: 'Question Prediction', description: 'Upload & analyze papers', icon: '📝', path: '/questions', color: 'from-indigo-500 to-purple-500' },
  ];

  const studentServices = [
    { title: 'My Profile', description: 'View academic records', icon: '👤', path: '/profile', color: 'from-purple-500 to-pink-500' },
    { title: 'Predicted Questions', description: 'Study smart with AI predictions', icon: '📝', path: '/questions', color: 'from-indigo-500 to-purple-500' },
    { title: 'My Timetable', description: 'View class schedule', icon: '📅', path: '/timetable', color: 'from-orange-500 to-pink-500' },
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
              Welcome back, <span className="text-gradient">{currentUser?.displayName?.split(' ')[0] || 'User'}</span>
            </h1>
            <p className="text-xl text-gray-400">
              {userRole === 'admin' && 'Manage your entire academic system from here.'}
              {userRole === 'faculty' && 'Access teaching tools and student analytics.'}
              {userRole === 'student' && 'Track your academic progress and resources.'}
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            <Card className="text-center">
              <div className="text-3xl font-bold text-gradient mb-1">
                {userRole === 'student' ? '8.5' : '150+'}
              </div>
              <div className="text-sm text-gray-400">
                {userRole === 'student' ? 'Your CGPA' : 'Total Students'}
              </div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-gradient mb-1">
                {userRole === 'student' ? '2' : '12'}
              </div>
              <div className="text-sm text-gray-400">
                {userRole === 'student' ? 'Active Backlogs' : 'Active Schedules'}
              </div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-gradient mb-1">
                {userRole === 'student' ? '85%' : '95%'}
              </div>
              <div className="text-sm text-gray-400">
                {userRole === 'student' ? 'Attendance' : 'Success Rate'}
              </div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-gradient mb-1">
                {userRole === 'student' ? 'Pass' : '25'}
              </div>
              <div className="text-sm text-gray-400">
                {userRole === 'student' ? 'Prediction' : 'Faculty Members'}
              </div>
            </Card>
          </motion.div>

          {/* Services Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold mb-6">Quick Access</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                >
                  <Link to={service.path}>
                    <Card hover gradient>
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center text-3xl mb-4`}>
                        {service.icon}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                      <p className="text-gray-400 text-sm">{service.description}</p>
                      <div className="mt-4 flex items-center text-pink-500 font-medium">
                        Open
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Card>
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

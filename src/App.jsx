import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import TimetableGenerator from './pages/TimetableGenerator';
import StudentRecords from './pages/StudentRecords';
import QuestionPrediction from './pages/QuestionPrediction';
import AdminPanel from './pages/AdminPanel';
import ParentDashboard from './pages/ParentDashboard';
import NotificationsPage from './pages/NotificationsPage';
import StudyMaterialGenerator from './pages/StudyMaterialGenerator';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import './index.css';

function AppContent() {
  const { currentUser } = useAuth();

  return (
    <div className="App">
      <Routes>
        {/* Public route - shows login page for unauthenticated users */}
        <Route
          path="/"
          element={currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/timetable"
          element={
            <ProtectedRoute>
              <TimetableGenerator />
            </ProtectedRoute>
          }
        />

        <Route
          path="/students"
          element={
            <ProtectedRoute requireFacultyAccess>
              <StudentRecords />
            </ProtectedRoute>
          }
        />

        <Route
          path="/questions"
          element={
            <ProtectedRoute>
              <QuestionPrediction />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Parent Dashboard Route */}
        <Route
          path="/parent-dashboard"
          element={
            <ProtectedRoute requireParent>
              <ParentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Notifications Page (Faculty/Admin only) */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute requireFacultyAccess>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Study Material Generator (All authenticated users - Students can access!) */}
        <Route
          path="/study-materials"
          element={
            <ProtectedRoute>
              <StudyMaterialGenerator />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Login overlay shown when not authenticated */}
      {!currentUser && <LoginPage />}

      {/* Chatbot widget (only visible to faculty/admin) */}
      {currentUser && <ChatbotWidget />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import TimetableGenerator from './pages/TimetableGenerator';
import StudentRecords from './pages/StudentRecords';
import QuestionPrediction from './pages/QuestionPrediction';
import AdminPanel from './pages/AdminPanel';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import './index.css';

function AppContent() {
  const { currentUser } = useAuth();

  return (
    <div className="App">
      <Routes>
        {/* Public route - shows home page or login based on auth state */}
        <Route
          path="/"
          element={currentUser ? <Navigate to="/dashboard" replace /> : <HomePage />}
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
            <ProtectedRoute>
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
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

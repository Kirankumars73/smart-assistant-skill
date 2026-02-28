import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {Bell, Crown, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToNotificationCount } from '../../services/notificationService';

const Navbar = () => {
  const { currentUser, userRole, signOut, hasFacultyAccess } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Subscribe to notification count for faculty/admin
  useEffect(() => {
    if (hasFacultyAccess()) {
      const unsubscribe = subscribeToNotificationCount('pending', (count) => {
        setNotificationCount(count);
      });
      return unsubscribe;
    }
  }, [hasFacultyAccess]);

  // Handle scroll for floating effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', roles: ['admin', 'faculty', 'student'] },
    { path: '/admin', label: 'Admin Panel', icon: Crown, roles: ['admin'] },
    { path: '/timetable', label: 'Timetable', roles: ['admin', 'faculty', 'student'] },
    { path: '/students', label: 'Students', roles: ['admin', 'faculty'] },
    { path: '/questions', label: 'Questions', roles: ['admin', 'faculty', 'student'] },
  ];

  const filteredLinks = navLinks.filter(link => 
    link.roles.includes(userRole)
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!currentUser) return null;

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        max-w-7xl w-[calc(100%-2rem)] mx-auto
        glass-morphic rounded-2xl
        transition-all duration-300
        ${scrolled ? 'shadow-glow-lg' : 'shadow-lg'}
      `}
    >
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo with Glow */}
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-glow-cyan to-glow-blue flex items-center justify-center shadow-glow transition-all group-hover:shadow-glow-lg group-hover:scale-110">
              <span className="text-xl font-bold">✨</span>
            </div>
            <span className="text-xl font-display font-bold text-white hidden sm:block">
              Smart Academic
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {filteredLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  relative px-4 py-2 rounded-xl font-medium transition-all duration-200
                  link-underline magnetic-hover
                  ${isActive(link.path)
                    ? 'bg-gradient-to-r from-glow-cyan to-glow-blue text-white shadow-glow'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          {/* User Profile Section */}
          <div className="flex items-center space-x-3">
            {/* Role Badge */}
            <div className="hidden sm:block px-3 py-1.5 rounded-full text-xs font-bold bg-glow-purple/20 text-glow-purple-light border border-glow-purple/30">
              {userRole?.toUpperCase()}
            </div>

            {/* Notification Bell (Faculty/Admin only) */}
            {hasFacultyAccess() && (
              <Link to="/notifications" className="relative p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all magnetic-hover">
                <Bell className="w-6 h-6 icon-pulse" />
                {notificationCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-glow-pink text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-glow-purple animate-glow-pulse"
                  >
                    {notificationCount}
                  </motion.span>
                )}
              </Link>
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    className="w-10 h-10 rounded-full border-2 border-glow-cyan shadow-glow-sm hover:shadow-glow transition-all"
                  />
                ) : null}
                <div 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-glow-cyan shadow-glow-sm hover:shadow-glow transition-all"
                  style={{ display: currentUser.photoURL ? 'none' : 'flex' }}
                >
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 glass-morphic rounded-xl shadow-glow border border-slate-700 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-700">
                      <p className="text-sm font-semibold text-white">
                        {currentUser.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {currentUser.email}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors font-medium"
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-gray-300 hover:bg-white/10 magnetic-hover"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-slate-700 py-2 overflow-hidden"
            >
              {filteredLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    block px-4 py-3 rounded-xl font-medium transition-colors
                    ${isActive(link.path)
                      ? 'bg-gradient-to-r from-glow-cyan to-glow-blue text-white'
                      : 'text-gray-300 hover:bg-white/5'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    {link.icon && <link.icon className="w-4 h-4" />}
                    {link.label}
                  </span>
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;

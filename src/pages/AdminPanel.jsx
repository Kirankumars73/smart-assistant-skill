import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, USER_ROLES } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import NoiseTexture from '../components/ui/NoiseTexture';
import FloatingOrbs from '../components/ui/FloatingOrbs';
import {
  Users, ShieldCheck, BookOpen, GraduationCap, Heart,
  Search, Link, AlertCircle, Loader2, Info, ShieldAlert,
  Settings
} from 'lucide-react';

const AdminPanel = () => {
  const { currentUser, isAdmin } = useAuth();
  const showToast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      usersList.sort((a, b) => {
        const dateA = new Date(a.lastLogin || 0);
        const dateB = new Date(b.lastLogin || 0);
        return dateB - dateA;
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      setUpdating(userId);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      setTimeout(() => fetchUsers(), 500);
    } catch (error) {
      console.error('Error updating user role:', error);
      showToast('Failed to update user role. Check console for details.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  // Role badge styling — muted, consistent
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case USER_ROLES.FACULTY:
        return 'bg-violet-500/15 text-violet-400 border border-violet-500/30';
      case USER_ROLES.STUDENT:
        return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
      case USER_ROLES.PARENT:
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      default:
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/30';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:    return <ShieldCheck className="w-3.5 h-3.5" />;
      case USER_ROLES.FACULTY:  return <BookOpen className="w-3.5 h-3.5" />;
      case USER_ROLES.STUDENT:  return <GraduationCap className="w-3.5 h-3.5" />;
      case USER_ROLES.PARENT:   return <Heart className="w-3.5 h-3.5" />;
      default:                  return <Users className="w-3.5 h-3.5" />;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter;
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === USER_ROLES.ADMIN).length,
    faculty: users.filter(u => u.role === USER_ROLES.FACULTY).length,
    students: users.filter(u => u.role === USER_ROLES.STUDENT).length,
    parents: users.filter(u => u.role === USER_ROLES.PARENT).length
  };

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-midnight text-white flex items-center justify-center">
        <NoiseTexture />
        <FloatingOrbs />
        <div className="mesh-gradient-bg" />
        <div className="relative z-10 text-center">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access the Admin Panel.</p>
        </div>
      </div>
    );
  }

  // Stat card definitions with Lucide icons
  const statCards = [
    { label: 'Total Users',  value: stats.total,    Icon: Users,         color: 'text-blue-400',   bg: 'bg-blue-500/10' },
    { label: 'Admins',       value: stats.admins,   Icon: ShieldCheck,   color: 'text-amber-400',  bg: 'bg-amber-500/10' },
    { label: 'Faculty',      value: stats.faculty,  Icon: BookOpen,      color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Students',     value: stats.students, Icon: GraduationCap, color: 'text-sky-400',    bg: 'bg-sky-500/10' },
    { label: 'Parents',      value: stats.parents,  Icon: Heart,         color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="min-h-screen bg-midnight text-white relative">
      <NoiseTexture />
      <FloatingOrbs />
      <div className="mesh-gradient-bg" />
      <Navbar />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Panel</h1>
          </div>
          <p className="text-gray-400 text-sm ml-14">Manage users and assign roles</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
            >
              <Card className="text-center py-5">
                <div className={`inline-flex p-4 rounded-xl ${stat.bg} mb-3`}>
                  <stat.Icon className={`w-7 h-7 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold mb-0.5">{stat.value}</div>
                <div className="text-gray-500 text-xs">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <Card className="mb-5">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {['all', USER_ROLES.ADMIN, USER_ROLES.FACULTY, USER_ROLES.STUDENT, USER_ROLES.PARENT].map(roleFilter => (
                <button
                  key={roleFilter}
                  onClick={() => setFilter(roleFilter)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filter === roleFilter
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {roleFilter === 'all' ? 'All Users' : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-9 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-5 bg-red-500/5 border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-400 mb-1 text-sm">Connection Error</h3>
                <p className="text-xs text-red-300 mb-3">{error}</p>
                <button
                  onClick={fetchUsers}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-medium text-red-300 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* User List */}
        {loading ? (
          <Card className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading users...</p>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="text-center py-16">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No users found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="hover:border-cyan-500/20">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || user.email}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                          className="w-11 h-11 rounded-full border border-white/10 flex-shrink-0"
                        />
                      ) : null}
                      <div 
                        className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                        style={{ display: user.photoURL ? 'none' : 'flex' }}
                      >
                        {(user.displayName || user.email)[0].toUpperCase()}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-white truncate">{user.displayName || 'No Name'}</h3>
                          {user.isHardcodedAdmin && (
                            <span className="px-2 py-0.5 text-xs rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                              Permanent Admin
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mb-1">{user.email}</p>
                        
                        {user.role === USER_ROLES.PARENT && user.linkedStudentId && (
                          <div className="text-xs text-emerald-400 flex items-center gap-1 mb-1">
                            <Link className="w-3 h-3" />
                            <span>Linked: {user.linkedStudentId}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                          <span>Last login: {new Date(user.lastLogin).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Role Badge and Controls */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Current Role Badge */}
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${getRoleBadgeStyle(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span>{user.role.toUpperCase()}</span>
                      </div>

                      {/* Role Change Dropdown */}
                      {!user.isHardcodedAdmin && (
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          disabled={updating === user.id}
                          style={{ colorScheme: 'dark', backgroundColor: '#0f172a' }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-white/20 focus:border-cyan-500/50 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-gray-300"
                        >
                          <option value={USER_ROLES.FACULTY}>Faculty</option>
                          <option value={USER_ROLES.STUDENT}>Student</option>
                          <option value={USER_ROLES.PARENT}>Parent</option>
                        </select>
                      )}
                      
                      {updating === user.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <Card className="mt-8 bg-slate-800/30 border-slate-700/30">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 flex-shrink-0">
              <Info className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2 text-slate-200">How to Use Admin Panel</h3>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• View all users who have logged into the system</li>
                <li>• Use the dropdown to assign <strong className="text-gray-400">Faculty</strong> or <strong className="text-gray-400">Student</strong> roles</li>
                <li>• Filter users by role or search by name / email</li>
                <li>• The permanent admin cannot have their role changed</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;

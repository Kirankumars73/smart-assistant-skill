import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, USER_ROLES } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';

const AdminPanel = () => {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by last login (most recent first)
      usersList.sort((a, b) => {
        const dateA = new Date(a.lastLogin || 0);
        const dateB = new Date(b.lastLogin || 0);
        return dateB - dateA;
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      setUpdating(userId);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      // Refresh to get updated data
      setTimeout(() => fetchUsers(), 500);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Check console for details.');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'from-orange-500 to-red-500';
      case USER_ROLES.FACULTY:
        return 'from-purple-500 to-indigo-500';
      case USER_ROLES.STUDENT:
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return '👑';
      case USER_ROLES.FACULTY:
        return '⭐';
      case USER_ROLES.STUDENT:
        return '👤';
      default:
        return '❓';
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
    students: users.filter(u => u.role === USER_ROLES.STUDENT).length
  };

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access the Admin Panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="text-5xl">👑</div>
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-xl text-gray-400">Manage users and assign roles</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Users', value: stats.total, icon: '👥', gradient: 'from-blue-500 to-cyan-500' },
            { label: 'Admins', value: stats.admins, icon: '👑', gradient: 'from-orange-500 to-red-500' },
            { label: 'Faculty', value: stats.faculty, icon: '⭐', gradient: 'from-purple-500 to-indigo-500' },
            { label: 'Students', value: stats.students, icon: '👤', gradient: 'from-green-500 to-emerald-500' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="text-center">
                <div className={`text-4xl mb-2 inline-block p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {['all', USER_ROLES.ADMIN, USER_ROLES.FACULTY, USER_ROLES.STUDENT].map(roleFilter => (
                <button
                  key={roleFilter}
                  onClick={() => setFilter(roleFilter)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    filter === roleFilter
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {roleFilter === 'all' ? 'All Users' : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 rounded-lg bg-white/5 border border-white/10 focus:border-pink-500 focus:outline-none transition-colors"
              />
              <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* User List */}
        {loading ? (
          <Card className="text-center py-12">
            <div className="animate-pulse text-gray-400">Loading users...</div>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-400">No users found</div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:border-pink-500/50">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar */}
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || user.email}
                          className="w-14 h-14 rounded-full border-2 border-white/10"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-2xl font-bold">
                          {(user.displayName || user.email)[0].toUpperCase()}
                        </div>
                      )}
                      
                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold">{user.displayName || 'No Name'}</h3>
                          {user.isHardcodedAdmin && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gradient-to-r from-orange-500 to-red-500 font-bold">
                              PERMANENT ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{user.email}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                          <span>Last login: {new Date(user.lastLogin).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Role Badge and Controls */}
                    <div className="flex items-center gap-4">
                      {/* Current Role Badge */}
                      <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getRoleBadgeColor(user.role)} font-bold flex items-center gap-2`}>
                        <span>{getRoleIcon(user.role)}</span>
                        <span>{user.role.toUpperCase()}</span>
                      </div>

                      {/* Role Change Dropdown - Only if not hardcoded admin */}
                      {!user.isHardcodedAdmin && (
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          disabled={updating === user.id}
                          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 focus:border-pink-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                          <option value={USER_ROLES.FACULTY}>⭐ Faculty</option>
                          <option value={USER_ROLES.STUDENT}>👤 Student</option>
                        </select>
                      )}
                      
                      {updating === user.id && (
                        <div className="animate-spin text-pink-500">⚙️</div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <Card className="mt-8 bg-gradient-to-br from-orange-500/10 to-pink-500/10 border-orange-500/20">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-bold mb-2">How to Use Admin Panel</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• View all users who have logged into the system</li>
                <li>• Use the dropdown to assign <strong>Faculty (Super User)</strong> or <strong>Student (Normal User)</strong> roles</li>
                <li>• Filter users by role or search by name/email</li>
                <li>• The permanent admin (you) cannot have their role changed</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;

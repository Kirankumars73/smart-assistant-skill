import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';
import Card from '../components/ui/Card';
import GradientButton from '../components/ui/GradientButton';
import Input from '../components/ui/Input';

const TimetableGenerator = () => {
  const { hasFacultyAccess } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    department: '',
    semester: '',
    subjects: [],
    labs: [],
  });
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateTimetable = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setGeneratedSchedule({
        message: 'Timetable generated successfully!',
        // Mock schedule data
      });
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              <span className="text-gradient">Timetable</span> Generator
            </h1>
            <p className="text-xl text-gray-400">
              Create clash-free schedules using advanced algorithms
            </p>
          </motion.div>

          <Card>
            {hasFacultyAccess() ? (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6">Configure Schedule</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Input
                    label="Department"
                    placeholder="e.g., Computer Science"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                  <Input
                    label="Semester"
                    type="number"
                    placeholder="e.g., 5"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Add Subjects
                  </label>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm">
                      Subject management interface (Add/Remove subjects with lecture hours)
                    </p>
                    {/* Placeholder for subject list */}
                    <div className="mt-4 space-y-2">
                      {['Machine Learning', 'Data Structures', 'Web Development'].map((subject) => (
                        <div key={subject} className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded">
                          <span className="text-white">{subject}</span>
                          <span className="text-gray-400 text-sm">3 hours/week</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Lab Sessions (3-hour blocks)
                  </label>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm">
                      Configure lab sessions...
                    </p>
                  </div>
                </div>

                <GradientButton
                  onClick={handleGenerateTimetable}
                  disabled={loading || !formData.department || !formData.semester}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Generating...' : 'Generate Timetable'}
                </GradientButton>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h2 className="text-2xl font-bold mb-2">Timetable View</h2>
                <p className="text-gray-400 mb-6">
                  Generated timetables will appear here. Only faculty and admins can create new timetables.
                </p>
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <p className="text-gray-400">No timetables available yet.</p>
                </div>
              </div>
            )}

            {generatedSchedule && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 bg-green-500/10 border border-green-500 rounded-lg"
              >
                <h3 className="text-xl font-bold text-green-500 mb-2">Success!</h3>
                <p className="text-gray-300">{generatedSchedule.message}</p>
                <div className="mt-4">
                  <GradientButton variant="secondary">
                    Download as PDF
                  </GradientButton>
                </div>
              </motion.div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TimetableGenerator;

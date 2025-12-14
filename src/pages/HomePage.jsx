import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GradientButton from '../components/ui/GradientButton';

const HomePage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Section - Raycast Style */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 99, 99, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 99, 99, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }} />
        </div>

        {/* Glowing Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/30 via-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/30 via-indigo-500/30 to-pink-500/30 rounded-full blur-3xl" style={{ animationDelay: '1.5s' }} />
        
        <motion.div
          style={{ opacity }}
          className="relative z-10 text-center max-w-6xl"
        >
          {/* Top Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20"
          >
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 animate-pulse" />
            <span className="text-sm font-medium bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
              Your intelligent academic assistant
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black mb-8 leading-none tracking-tight"
          >
            <span className="inline-block">Your shortcut</span>
            <br />
            <span className="inline-block bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              to academic
            </span>
            <br />
            <span className="inline-block bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              excellence
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl sm:text-2xl md:text-3xl text-gray-400 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
          >
            A powerful collection of AI-driven tools for automated scheduling,
            <br className="hidden md:block" />
            predictive analytics, and intelligent academic management.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <GradientButton
              size="lg"
              onClick={() => navigate(currentUser ? '/dashboard' : '/')}
              className="text-lg px-8 py-4"
            >
              {currentUser ? 'Go to Dashboard' : 'Get Started'}
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </GradientButton>
            
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 text-lg rounded-xl font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
            >
              Explore Features
            </button>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 text-gray-500"
            >
              <span className="text-xs uppercase tracking-wider">Scroll</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section - Modern Card Grid */}
      <section id="features" className="py-32 px-4 relative bg-gradient-to-b from-black via-gray-900/50 to-black">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                Supercharge
              </span>{' '}
              your workflow
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-light">
              Everything you need for academic excellence, powered by AI
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '⚡',
                title: 'Lightning Fast',
                description: 'Generate clash-free schedules in seconds with our advanced algorithms',
                gradient: 'from-orange-500 to-pink-500'
              },
              {
                icon: '🎯',
                title: 'AI-Powered',
                description: 'Predict student outcomes with machine learning insights',
                gradient: 'from-pink-500 to-purple-500'
              },
              {
                icon: '📊',
                title: 'Smart Analytics',
                description: 'Track performance and identify at-risk students instantly',
                gradient: 'from-purple-500 to-indigo-500'
              },
              {
                icon: '🤖',
                title: 'Intelligent Chatbot',
                description: 'Get instant answers with our AI-powered assistant',
                gradient: 'from-indigo-500 to-pink-500'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative"
              >
                <div className="relative h-full p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-300">
                  {/* Gradient Glow on Hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500`} />
                  
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl mb-6`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-4 bg-gradient-to-br from-orange-500/10 via-pink-500/10 to-purple-500/10 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { value: '1000+', label: 'Active Students' },
              { value: '50+', label: 'Schedules Generated' },
              { value: '95%', label: 'Success Rate' },
              { value: '30+', label: 'Faculty Members' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="text-center"
              >
                <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-7xl font-black mb-8">
              Ready to{' '}
              <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                transform
              </span>
              <br />
              your workflow?
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 mb-12 font-light">
              Join thousands of students and educators using Smart Academic Assistant
            </p>
            <GradientButton
              size="lg"
              onClick={() => navigate(currentUser ? '/dashboard' : '/')}
              className="text-lg px-10 py-5"
            >
              Get Started — It's Free
            </GradientButton>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-gray-500">
          <p>&copy; 2024 Smart Academic Assistant. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="mailto:support@smartacademic.com" className="hover:text-white transition-colors">
              Contact
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

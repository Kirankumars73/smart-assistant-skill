import React, { useState, useEffect } from 'react';
import { getStats, clearCache } from '../../services/geminiKeyManager';
import Card from '../ui/Card';
import GradientButton from '../ui/GradientButton';
import { useToast } from '../../hooks/useToast';

/**
 * Gemini API Key Manager Dashboard
 * Shows real-time statistics for API key rotation system
 * Admin-only component
 */
const GeminiKeyStats = () => {
  const [stats, setStats] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { showToast } = useToast();

  // Fetch stats
  const fetchStats = () => {
    try {
      const data = getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching key stats:', error);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchStats();

    if (autoRefresh) {
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Handle cache clear
  const handleClearCache = () => {
    try {
      clearCache();
      showToast('success', '🗑️ Cache cleared successfully');
      fetchStats();
    } catch (error) {
      showToast('error', '❌ Failed to clear cache');
    }
  };

  if (!stats) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading key statistics...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🔑 Gemini API Key Manager</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-accent-500 focus:ring-accent-500"
            />
            Auto-refresh (10s)
          </label>
          <GradientButton onClick={fetchStats} type="button">
            🔄 Refresh
          </GradientButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-700/50">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Total Keys</p>
            <p className="text-4xl font-bold text-white">{stats.totalKeys}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700/50">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Active Keys</p>
            <p className="text-4xl font-bold text-green-400">{stats.activeKeys}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-700/50">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Exhausted Keys</p>
            <p className="text-4xl font-bold text-red-400">{stats.exhaustedKeys}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-700/50">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Cache Size</p>
            <p className="text-4xl font-bold text-purple-400">{stats.cacheSize}</p>
            <p className="text-xs text-gray-500 mt-1">/ 100 max</p>
          </div>
        </Card>
      </div>

      {/* Health Status Banner */}
      {stats.exhaustedKeys === stats.totalKeys && (
        <Card className="bg-red-900/20 border-red-700/50">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-red-400 font-semibold">All API Keys Exhausted</h3>
              <p className="text-sm text-gray-400">
                All keys have reached their quota. Service will resume when keys reset.
              </p>
            </div>
          </div>
        </Card>
      )}

      {stats.activeKeys > 0 && stats.exhaustedKeys > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-700/50">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h3 className="text-yellow-400 font-semibold">Partial Capacity</h3>
              <p className="text-sm text-gray-400">
                {stats.exhaustedKeys} key(s) exhausted. System running on {stats.activeKeys} remaining key(s).
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Individual Key Stats */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Individual Key Statistics</h3>
          <GradientButton onClick={handleClearCache} type="button" className="text-sm">
            🗑️ Clear Cache
          </GradientButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Key #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Requests</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Errors</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Last Used</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Cooldown</th>
              </tr>
            </thead>
            <tbody>
              {stats.keyStats.map((key) => (
                <tr key={key.index} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-white">Key {key.index}</span>
                  </td>
                  <td className="py-3 px-4">
                    {key.exhausted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-700/50">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Exhausted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-700/50">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-white font-medium">{key.requestCount.toLocaleString()}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={key.errorCount > 0 ? 'text-red-400 font-medium' : 'text-gray-500'}>
                      {key.errorCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-sm">
                    {key.lastUsed}
                  </td>
                  <td className="py-3 px-4">
                    {key.cooldownRemaining > 0 ? (
                      <span className="text-orange-400 text-sm">
                        {Math.floor(key.cooldownRemaining / 60)}m {key.cooldownRemaining % 60}s
                      </span>
                    ) : (
                      <span className="text-gray-600 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Usage Tips */}
      <Card className="bg-gray-800/30">
        <h3 className="text-lg font-semibold text-white mb-3">💡 Key Management Tips</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span>
              <strong className="text-white">Add More Keys:</strong> Update <code className="text-accent-400 bg-gray-900/50 px-1 rounded">.env.local</code> with comma-separated keys for higher limits
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span>
              <strong className="text-white">Auto-Recovery:</strong> Exhausted keys automatically reset after 1 hour
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span>
              <strong className="text-white">Caching:</strong> System caches responses for 5 minutes to reduce API calls
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span>
              <strong className="text-white">Monitoring:</strong> High error count indicates invalid or restricted keys
            </span>
          </li>
        </ul>
      </Card>

      {/* Documentation Link */}
      <Card className="bg-accent-900/20 border-accent-700/50">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📚</span>
          <div className="flex-1">
            <h3 className="text-accent-400 font-semibold">Complete Setup Guide</h3>
            <p className="text-sm text-gray-400">
              See <code className="text-accent-400">GEMINI_KEY_ROTATION_GUIDE.md</code> for detailed setup instructions
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GeminiKeyStats;

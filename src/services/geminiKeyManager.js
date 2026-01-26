/**
 * Gemini API Key Manager with Rotation & Rate Limiting
 * 
 * Features:
 * - Multi-key rotation (automatic failover)
 * - Request caching (reduce duplicate calls)
 * - Exponential backoff (handle temporary limits)
 * - Usage tracking (monitor quota)
 * - Key cooldown (wait for renewal)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ==================== CONFIGURATION ====================

// Load API keys from environment (comma-separated)
const API_KEYS = import.meta.env.VITE_GEMINI_API_KEYS 
  ? import.meta.env.VITE_GEMINI_API_KEYS.split(',').map(k => k.trim())
  : [import.meta.env.VITE_GEMINI_API_KEY]; // Fallback to single key

// Cache configuration
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Key rotation configuration
const KEY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown after exhaustion
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Base delay for exponential backoff

// ==================== STATE MANAGEMENT ====================

class GeminiKeyManager {
  constructor() {
    this.keys = API_KEYS.map((key, index) => ({
      key,
      index,
      client: new GoogleGenerativeAI(key),
      exhausted: false,
      exhaustedAt: null,
      requestCount: 0,
      errorCount: 0,
      lastUsed: null
    }));
    
    this.currentKeyIndex = 0;
    this.cache = new Map();
    this.cacheOrder = []; // For LRU eviction
    
    console.log(`🔑 Gemini Key Manager initialized with ${this.keys.length} key(s)`);
  }

  // ==================== KEY ROTATION ====================

  /**
   * Get next available key
   */
  getNextKey() {
    // Check if current key needs cooldown reset
    this.checkCooldowns();

    // Find first non-exhausted key
    for (let i = 0; i < this.keys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.keys.length;
      const keyData = this.keys[keyIndex];

      if (!keyData.exhausted) {
        this.currentKeyIndex = keyIndex;
        keyData.lastUsed = Date.now();
        keyData.requestCount++;
        return keyData;
      }
    }

    // All keys exhausted - find one with earliest cooldown end
    const earliestCooldown = this.keys.reduce((earliest, key) => {
      if (!key.exhaustedAt) return earliest;
      if (!earliest || key.exhaustedAt < earliest.exhaustedAt) return key;
      return earliest;
    }, null);

    if (earliestCooldown) {
      const waitTime = Math.ceil((earliestCooldown.exhaustedAt + KEY_COOLDOWN_MS - Date.now()) / 1000);
      throw new Error(`⏳ All API keys exhausted. Next available in ~${waitTime}s`);
    }

    throw new Error('❌ No API keys available');
  }

  /**
   * Mark current key as exhausted
   */
  markKeyExhausted(keyData) {
    keyData.exhausted = true;
    keyData.exhaustedAt = Date.now();
    keyData.errorCount++;

    console.warn(`⚠️ API Key ${keyData.index + 1}/${this.keys.length} exhausted. Cooldown until ${new Date(keyData.exhaustedAt + KEY_COOLDOWN_MS).toLocaleTimeString()}`);

    // Try to rotate to next key
    const remainingKeys = this.keys.filter(k => !k.exhausted).length;
    console.log(`🔄 Rotating to next key. ${remainingKeys} key(s) remaining available.`);
  }

  /**
   * Check and reset cooled-down keys
   */
  checkCooldowns() {
    const now = Date.now();
    this.keys.forEach(keyData => {
      if (keyData.exhausted && keyData.exhaustedAt) {
        const cooldownElapsed = now - keyData.exhaustedAt;
        if (cooldownElapsed >= KEY_COOLDOWN_MS) {
          keyData.exhausted = false;
          keyData.exhaustedAt = null;
          console.log(`✅ API Key ${keyData.index + 1} cooldown complete. Key re-enabled.`);
        }
      }
    });
  }

  // ==================== CACHING ====================

  /**
   * Generate cache key from prompt
   */
  getCacheKey(prompt, model = 'gemini-2.5-flash') {
    // Simple hash for cache key (you can use a better hash if needed)
    const hash = prompt.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    return `${model}:${hash}`;
  }

  /**
   * Get cached response if available
   */
  getCached(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      console.log('✅ Using cached response');
      return cached.response;
    }
    
    // Expired cache, remove it
    if (cached) {
      this.cache.delete(cacheKey);
      this.cacheOrder = this.cacheOrder.filter(k => k !== cacheKey);
    }
    
    return null;
  }

  /**
   * Store response in cache
   */
  setCached(cacheKey, response) {
    // LRU eviction if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cacheOrder.shift();
      this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    this.cacheOrder.push(cacheKey);
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache() {
    this.cache.clear();
    this.cacheOrder = [];
    console.log('🗑️ Cache cleared');
  }

  // ==================== REQUEST HANDLING ====================

  /**
   * Make request with retry and key rotation
   */
  async makeRequest(prompt, options = {}) {
    const {
      model = 'gemini-2.5-flash',
      useCache = true,
      maxRetries = MAX_RETRIES
    } = options;

    // Check cache first
    if (useCache) {
      const cacheKey = this.getCacheKey(prompt, model);
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    let lastError = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Get available key
        const keyData = this.getNextKey();
        const geminiModel = keyData.client.getGenerativeModel({ model });

        // Make request
        console.log(`📡 Request attempt ${attempt + 1}/${maxRetries} using Key ${keyData.index + 1}`);
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Cache successful response
        if (useCache) {
          const cacheKey = this.getCacheKey(prompt, model);
          this.setCached(cacheKey, text);
        }

        return text;

      } catch (error) {
        lastError = error;
        attempt++;

        // Check if quota/rate limit error
        const isQuotaError = error.message?.includes('quota') || 
                             error.message?.includes('RESOURCE_EXHAUSTED') ||
                             error.message?.includes('429');

        if (isQuotaError) {
          console.error(`❌ Key ${this.currentKeyIndex + 1} quota exhausted:`, error.message);
          this.markKeyExhausted(this.keys[this.currentKeyIndex]);
          
          // Don't wait on quota errors, try next key immediately
          continue;
        }

        // For other errors, use exponential backoff
        if (attempt < maxRetries) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.warn(`⏳ Retrying in ${delay}ms... (${error.message})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error('❌ All request attempts failed');
    throw new Error(this.getUserFriendlyError(lastError));
  }

  /**
   * Stream request with key rotation
   */
  async makeStreamRequest(prompt, onChunk, options = {}) {
    const { model = 'gemini-2.5-flash', maxRetries = MAX_RETRIES } = options;

    let lastError = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const keyData = this.getNextKey();
        const geminiModel = keyData.client.getGenerativeModel({ model });

        console.log(`📡 Stream request attempt ${attempt + 1}/${maxRetries} using Key ${keyData.index + 1}`);
        const result = await geminiModel.generateContentStream(prompt);

        let fullText = '';
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
          if (onChunk) onChunk(chunkText, fullText);
        }

        return fullText;

      } catch (error) {
        lastError = error;
        attempt++;

        const isQuotaError = error.message?.includes('quota') || 
                             error.message?.includes('RESOURCE_EXHAUSTED') ||
                             error.message?.includes('429');

        if (isQuotaError) {
          console.error(`❌ Key ${this.currentKeyIndex + 1} quota exhausted:`, error.message);
          this.markKeyExhausted(this.keys[this.currentKeyIndex]);
          continue;
        }

        if (attempt < maxRetries) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.warn(`⏳ Retrying stream in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ All stream attempts failed');
    throw new Error(this.getUserFriendlyError(lastError));
  }

  /**
   * Convert error to user-friendly message
   */
  getUserFriendlyError(error) {
    if (!error) return '⚠️ Unknown error occurred';

    if (error.message?.includes('API key')) {
      return '⚠️ AI service configuration error. Please check the API keys.';
    }
    if (error.message?.includes('quota') || error.message?.includes('exhausted')) {
      return '⚠️ AI service quota exceeded. All backup keys exhausted. Please try again later.';
    }
    if (error.message?.includes('RESOURCE_EXHAUSTED')) {
      return '⚠️ API rate limit reached. Please wait a moment and try again.';
    }
    if (error.message?.includes('network')) {
      return '⚠️ Network error. Please check your internet connection.';
    }

    return `⚠️ AI service error: ${error.message || 'Please try again later.'}`;
  }

  // ==================== STATISTICS ====================

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      totalKeys: this.keys.length,
      activeKeys: this.keys.filter(k => !k.exhausted).length,
      exhaustedKeys: this.keys.filter(k => k.exhausted).length,
      cacheSize: this.cache.size,
      keyStats: this.keys.map(k => ({
        index: k.index + 1,
        exhausted: k.exhausted,
        requestCount: k.requestCount,
        errorCount: k.errorCount,
        lastUsed: k.lastUsed ? new Date(k.lastUsed).toLocaleString() : 'Never',
        cooldownRemaining: k.exhaustedAt 
          ? Math.max(0, Math.ceil((k.exhaustedAt + KEY_COOLDOWN_MS - Date.now()) / 1000))
          : 0
      }))
    };
  }

  /**
   * Print stats to console
   */
  printStats() {
    const stats = this.getStats();
    console.group('📊 Gemini Key Manager Statistics');
    console.log(`Total Keys: ${stats.totalKeys}`);
    console.log(`Active Keys: ${stats.activeKeys}`);
    console.log(`Exhausted Keys: ${stats.exhaustedKeys}`);
    console.log(`Cache Size: ${stats.cacheSize}/${MAX_CACHE_SIZE}`);
    console.table(stats.keyStats);
    console.groupEnd();
  }
}

// ==================== SINGLETON INSTANCE ====================

const keyManager = new GeminiKeyManager();

// Export convenience functions
export const generateContent = (prompt, options) => keyManager.makeRequest(prompt, options);
export const generateContentStream = (prompt, onChunk, options) => keyManager.makeStreamRequest(prompt, onChunk, options);
export const getKeyManager = () => keyManager;
export const clearCache = () => keyManager.clearCache();
export const getStats = () => keyManager.getStats();
export const printStats = () => keyManager.printStats();

export default keyManager;

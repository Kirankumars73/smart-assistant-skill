/**
 * Syllabus Parser - Converts user's natural format to algorithm format
 * Handles format: { "1": { "title": "...", "1.1": "...", "1.2": "..." } }
 */

/**
 * Extract important keywords from text
 */
const extractKeywords = (text) => {
  // Remove common words and extract meaningful terms
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'its', 'it', 'this', 'that',
    /* The line `'these', 'those', 'only', 'brief', 'definition', 'examples', 'example'` is creating a
    Set called `commonWords` that contains common words that are typically not considered important
    keywords when extracting keywords from text. These common words are filtered out during the
    keyword extraction process to focus on more meaningful terms that can better represent the
    content of the text. */
    'these', 'those', 'only', 'brief', 'definition', 'examples', 'example'
  ]);

  // Split by spaces, hyphens, commas, parentheses
  const words = text
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .split(/[\s,\-–]+/)
    .filter(word => 
      word.length >= 3 && 
      !commonWords.has(word) &&
      !/^\d+$/.test(word) // Not just numbers
    );

  // Get unique words
  const uniqueWords = [...new Set(words)];

  // Extract important compound terms (2-3 word phrases)
  const compounds = [];
  const originalWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  originalWords.forEach(compound => {
    if (compound.split(' ').length >= 2) {
      compounds.push(compound.toLowerCase());
    }
  });

  // Combine and return top keywords
  return [...new Set([...uniqueWords, ...compounds])].slice(0, 15);
};

/**
 * Extract topic name from subsection text
 */
const extractTopicName = (text) => {
  // Take first sentence or first meaningful phrase (before first hyphen/comma)
  let topic = text.split(/[–\-,]/)[0].trim();
  
  // Limit length
  if (topic.length > 60) {
    const words = topic.split(' ');
    topic = words.slice(0, 8).join(' ') + '...';
  }
  
  return topic;
};

/**
 * Determine importance based on content length and keywords
 */
const determineImportance = (text) => {
  const importantTerms = ['principle', 'definition', 'derivation', 'numericals', 'applications'];
  const veryImportantTerms = ['important', 'main', 'key', 'essential', 'fundamental'];
  
  const lowerText = text.toLowerCase();
  
  if (veryImportantTerms.some(term => lowerText.includes(term))) {
    return 'high';
  }
  
  if (importantTerms.some(term => lowerText.includes(term))) {
    return 'high';
  }
  
  // If content is long (detailed), it's probably important
  if (text.split(' ').length > 30) {
    return 'high';
  }
  
  if (text.split(' ').length > 15) {
    return 'medium';
  }
  
  return 'low';
};

/**
 * Estimate hours based on content length
 */
const estimateHours = (text) => {
  const wordCount = text.split(' ').length;
  
  if (wordCount > 50) return 6;
  if (wordCount > 30) return 4;
  if (wordCount > 15) return 3;
  return 2;
};

/**
 * Parse user's syllabus format into algorithm format
 */
export const parseSyllabus = (userSyllabus) => {
  try {
    console.log('🔄 Parsing user syllabus format...');
    
    // Check if already in correct format
    if (userSyllabus.modules && Array.isArray(userSyllabus.modules)) {
      console.log('✅ Syllabus already in correct format');
      return userSyllabus;
    }

    const modules = [];

    // Iterate through numeric keys (1, 2, 3, 4, 5...)
    Object.keys(userSyllabus).forEach(moduleKey => {
      const moduleNumber = parseInt(moduleKey);
      
      // Skip if not a number
      if (isNaN(moduleNumber)) return;

      const moduleData = userSyllabus[moduleKey];
      const topics = [];

      // Extract title
      const title = moduleData.title || `Module ${moduleNumber}`;

      // Iterate through subsections (1.1, 1.2, etc.)
      Object.keys(moduleData).forEach(subKey => {
        // Skip the title field
        if (subKey === 'title') return;

        const subsectionText = moduleData[subKey];

        // Extract topic details
        const topicName = extractTopicName(subsectionText);
        const keywords = extractKeywords(subsectionText);
        const importance = determineImportance(subsectionText);
        const hours = estimateHours(subsectionText);

        topics.push({
          name: topicName,
          keywords: keywords,
          importance: importance,
          hours: hours,
          _originalSubsection: subKey, // For debugging
          _originalText: subsectionText.substring(0, 100) + '...' // For debugging
        });

        console.log(`  ✅ Parsed topic: "${topicName}" (${keywords.length} keywords)`);
      });

      modules.push({
        number: moduleNumber,
        title: title,
        topics: topics
      });

      console.log(`✅ Module ${moduleNumber}: ${topics.length} topics extracted`);
    });

    const parsedSyllabus = { modules };
    
    console.log(`🎉 Parsed syllabus: ${modules.length} modules, ${modules.reduce((sum, m) => sum + m.topics.length, 0)} total topics`);
    
    return parsedSyllabus;

  } catch (error) {
    console.error('❌ Error parsing syllabus:', error);
    // Return empty structure to prevent crashes
    return { modules: [] };
  }
};

export default parseSyllabus;

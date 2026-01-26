/**
 * AI Study Material Generator Service
 * Uses Google Gemini AI to generate educational content
 * Features: Notes, Diagrams, Practice Questions, Study Plans
 */

import { generateContent } from './geminiKeyManager';

/**
 * Generate comprehensive notes for a topic
 */
export const generateNotes = async (topic, subject = '', semester = '') => {
  try {
    const prompt = `
You are an expert academic tutor. Generate comprehensive, well-structured study notes for the following topic.

**Topic**: ${topic}
${subject ? `**Subject**: ${subject}` : ''}
${semester ? `**Semester**: ${semester}` : ''}

Please provide the following sections:

1. **Introduction** - Brief overview of the topic

2. **Key Concepts** - Main ideas and definitions (use bullet points)

3. **Detailed Explanation** - In-depth coverage with examples

4. **Important Formulas/Theorems** (if applicable)
   - List all key formulas
   - Include derivations if relevant

5. **Important Topics to Focus** ⭐
   - List 5-8 most important sub-topics for exams
   - Mark with stars (⭐) based on importance
   - Include page/chapter references if applicable

6. **Important Questions to Study** 📝
   - 5-7 likely exam questions on this topic
   - Mark as Short (3 marks), Medium (5 marks), or Long (10 marks)
   - Cover all difficulty levels

7. **Real-world Applications** - Practical examples

8. **Common Mistakes** - What students often get wrong
   - Include tips to avoid these mistakes

9. **Quick Revision Points** ✓
   - Bullet list of must-remember points
   - Perfect for last-minute revision

10. **Summary** - Quick recap of main points

Format the notes in a clear, student-friendly manner with:
- Clear headings with emojis
- Bullet points for lists
- Examples clearly marked
- Important points highlighted with ⭐
- Question difficulty marked clearly

Make it comprehensive, exam-focused, and easy to revise!
    `.trim();

    const text = await generateContent(prompt, { model: 'gemini-2.5-flash', useCache: true });

    return {
      success: true,
      notes: text,
      topic,
      subject,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating notes:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate notes'
    };
  }
};

/**
 * Sanitize Mermaid code to fix common syntax errors
 * Handles special characters, invalid node IDs, and malformed labels
 */
const sanitizeMermaidCode = (mermaidCode) => {
  if (!mermaidCode) return '';
  
  try {
    let sanitized = mermaidCode;
    
    // Step 1: Remove any markdown code blocks that might remain
    sanitized = sanitized
      .replace(/```mermaid\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // Step 2: Split into lines for processing
    const lines = sanitized.split('\n');
    const processedLines = lines.map(line => {
      // Skip the graph declaration line
      if (line.trim().startsWith('graph ')) {
        return line;
      }
      
      // Process node definitions and connections
      // Pattern: NodeID[Label] or NodeID{Label} or NodeID((Label))
      let processedLine = line;
      
      // Fix: Replace spaces in node IDs with underscores
      // Match patterns like "Node 1[Label]" and convert to "Node_1[Label]"
      processedLine = processedLine.replace(/([A-Za-z]+)\s+(\d+)(\[|\{|\()/g, '$1_$2$3');
      
      // Fix: Escape quotes within labels
      // Match [Label with "quotes"] and escape inner quotes
      processedLine = processedLine.replace(/\[([^\]]*)"([^\]]*)"([^\]]*)\]/g, (match, before, quoted, after) => {
        return `["${before}${quoted}${after}"]`;
      });
      
      // Fix: Remove HTML tags from labels (common AI mistake)
      processedLine = processedLine.replace(/<[^>]+>/g, '');
      
      // Fix: Escape backticks in labels
      processedLine = processedLine.replace(/`/g, '');
      
      // Fix: Handle parentheses in square bracket labels by quoting
      // Match [Label (with parens)] and convert to ["Label (with parens)"]
      processedLine = processedLine.replace(/\[([^\]]*\([^\]]*\)[^\]]*)\]/g, (match, content) => {
        // Only quote if not already quoted
        if (content.startsWith('"') && content.endsWith('"')) {
          return `[${content}]`;
        }
        return `["${content}"]`;
      });
      
      // Fix: Remove line breaks within labels
      processedLine = processedLine.replace(/\n+/g, ' ');
      
      return processedLine;
    });
    
    // Step 3: Rejoin and final cleanup
    sanitized = processedLines.join('\n');
    
    // Step 4: Validate basic structure
    if (!sanitized.includes('graph ')) {
      console.warn('⚠️ Mermaid code missing graph declaration');
      // Try to fix by adding graph TD if missing
      if (!sanitized.startsWith('graph')) {
        sanitized = 'graph TD\n' + sanitized;
      }
    }
    
    // Step 5: Remove empty lines
    sanitized = sanitized.split('\n').filter(line => line.trim()).join('\n');
    
    return sanitized;
    
  } catch (error) {
    console.error('Error sanitizing Mermaid code:', error);
    return mermaidCode; // Return original if sanitization fails
  }
};

/**
 * Generate Mermaid diagram code for a topic
 */
export const generateDiagram = async (topic, diagramType = 'auto') => {
  try {
    const diagramTypeGuide = diagramType === 'auto' 
      ? 'Choose the most appropriate diagram type (flowchart, mindmap, sequence, class, or state diagram)'
      : `Create a ${diagramType}`;

    const prompt = `
Generate a Mermaid FLOWCHART diagram for the following topic: "${topic}"

Create a clear, educational flowchart that explains the concept visually.

**CRITICAL RULES - SYNTAX REQUIREMENTS**:
1. Use ONLY "graph TD" (top-down flowchart) - NO other types
2. Use SIMPLE node IDs: A, B, C, D, E, etc. (single letters or words, NO SPACES)
3. Use SIMPLE labels without special characters
4. Use proper arrow syntax: --> for connections
5. Use |label| for edge labels IF NEEDED
6. AVOID: quotes, parentheses, brackets, colons, semicolons in labels
7. Keep labels SHORT (max 5-6 words)

**Node Types**:
- Use [Square Brackets] for process boxes
- Use {Curly Braces} for decision diamonds  
- Use ((Double Circles)) for start/end points

**GOOD Examples**:

Example 1 - Simple Process:
graph TD
    A[Start Process] --> B[Initialize Variables]
    B --> C{Check Condition}
    C -->|True| D[Execute Action]
    C -->|False| E[Skip Action]
    D --> F[Complete]
    E --> F

Example 2 - Educational Concept:
graph TD
    A[Binary Search Tree] --> B[Left Subtree]
    A --> C[Right Subtree]
    B --> D[Smaller Values]
    C --> E[Larger Values]
    D --> F[Recursively Repeat]
    E --> F

Example 3 - Algorithm Flow:
graph TD
    Start[Begin] --> Input[Get Input]
    Input --> Process[Process Data]
    Process --> Check{Valid?}
    Check -->|Yes| Output[Display Result]
    Check -->|No| Error[Show Error]
    Output --> End[Finish]
    Error --> End

**BAD Examples (DO NOT USE)**:
❌ Node 1[Label] - spaces in node ID
❌ A[Label (with parens)] - parentheses without quotes
❌ B["Label: with colon"] - special characters
❌ C[Very Long Label That Explains Everything] - too long

**IMPORTANT CONSTRAINTS**: 
- Start with "graph TD" (REQUIRED)
- Use simple single-letter or single-word node IDs (A, B, Start, End)
- Keep labels under 30 characters
- NO special characters in labels (no quotes, colons, parentheses)
- NO HTML tags
- Every line must be valid Mermaid syntax

Now generate a valid, simple flowchart for: ${topic}

Return ONLY the Mermaid code, starting with "graph TD". No explanations, no markdown blocks, no extra text.
    `.trim();

    let mermaidCode = await generateContent(prompt, { model: 'gemini-2.5-flash', useCache: false });

    // Clean up the response - remove markdown code blocks if present
    mermaidCode = mermaidCode
      .replace(/```mermaid\n/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Apply sanitization to fix any remaining issues
    mermaidCode = sanitizeMermaidCode(mermaidCode);

    console.log('✅ Generated and sanitized Mermaid diagram:', mermaidCode.substring(0, 100) + '...');

    return {
      success: true,
      mermaidCode,
      topic,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating diagram:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate diagram'
    };
  }
};

/**
 * Generate practice questions for a topic
 */
export const generatePracticeQuestions = async (topic, difficulty = 'medium', count = 10) => {
  try {
    const prompt = `
Generate ${count} practice questions for the topic: "${topic}"

**Difficulty Level**: ${difficulty}
**Question Types**: Mix of MCQs, Short Answer, and Long Answer

For each question, provide:
1. Question text
2. Question type (MCQ/Short/Long)
3. Marks (3/5/10)
4. Difficulty (Easy/Medium/Hard)
5. Answer/Solution
6. Explanation

Format as JSON array:
[
  {
    "question": "Question text here?",
    "type": "MCQ",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "B",
    "marks": 3,
    "difficulty": "Easy",
    "explanation": "Detailed explanation..."
  }
]

**Distribution**:
- ${Math.floor(count * 0.5)} MCQs (3 marks each)
- ${Math.floor(count * 0.3)} Short Answer (5 marks each)
- ${Math.floor(count * 0.2)} Long Answer (10 marks each)

Return ONLY valid JSON, no other text.
    `.trim();

    const text = await generateContent(prompt, { model: 'gemini-2.5-flash', useCache: false });

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse questions from AI response');
    }

    const questions = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      questions,
      topic,
      difficulty,
      totalQuestions: questions.length,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating practice questions:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate practice questions'
    };
  }
};

/**
 * Generate personalized study plan for a topic
 */
export const generateStudyPlan = async (topic, availableDays = 7, hoursPerDay = 2) => {
  try {
    const prompt = `
Create a personalized study plan for: "${topic}"

**Available Time**: ${availableDays} days, ${hoursPerDay} hours per day
**Total Hours**: ${availableDays * hoursPerDay} hours

Generate a detailed day-by-day study plan with:

1. **Overview** - Study goals and approach
2. **Daily Breakdown** - What to study each day
3. **Time Allocation** - Hours for each subtopic
4. **Resources Needed** - Books, videos, practice materials
5. **Milestones** - Checkpoints to track progress
6. **Tips** - Study techniques and best practices

Format as JSON:
{
  "overview": "Study plan overview...",
  "totalHours": ${availableDays * hoursPerDay},
  "days": [
    {
      "day": 1,
      "title": "Day 1: Introduction & Basics",
      "hours": ${hoursPerDay},
      "topics": ["Topic 1", "Topic 2"],
      "activities": ["Read chapter 1", "Practice problems"],
      "milestone": "Understand fundamentals"
    }
  ],
  "resources": ["Textbook chapters", "Video tutorials"],
  "tips": ["Study tip 1", "Study tip 2"]
}

Return ONLY valid JSON, no other text.
    `.trim();

    const text = await generateContent(prompt, { model: 'gemini-2.5-flash', useCache: false });

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse study plan from AI response');
    }

    const studyPlan = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      studyPlan,
      topic,
      availableDays,
      hoursPerDay,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating study plan:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate study plan'
    };
  }
};

/**
 * Generate ALL materials at once (comprehensive package)
 */
export const generateCompleteMaterial = async (topic, options = {}) => {
  const {
    subject = '',
    semester = '',
    includeDiagram = true,
    includeQuestions = true,
    includeStudyPlan = true,
    questionCount = 10,
    studyDays = 7,
    hoursPerDay = 2
  } = options;

  try {
    const results = {
      topic,
      subject,
      semester,
      generatedAt: new Date().toISOString()
    };

    // Run all generations in PARALLEL for speed
    const promises = [];
    
    // Notes (always included)
    promises.push(generateNotes(topic, subject, semester));
    
    // Diagram (if requested)
    if (includeDiagram) {
      promises.push(generateDiagram(topic));
    } else {
      promises.push(Promise.resolve(null));
    }
    
    // Questions (if requested)
    if (includeQuestions) {
      promises.push(generatePracticeQuestions(topic, 'medium', questionCount));
    } else {
      promises.push(Promise.resolve(null));
    }
    
    // Study Plan (if requested)
    if (includeStudyPlan) {
      promises.push(generateStudyPlan(topic, studyDays, hoursPerDay));
    } else {
      promises.push(Promise.resolve(null));
    }

    // Wait for all to complete in parallel
    const [notesResult, diagramResult, questionsResult, planResult] = await Promise.all(promises);
    
    // Assign results
    results.notes = notesResult;
    if (diagramResult) results.diagram = diagramResult;
    if (questionsResult) results.questions = questionsResult;
    if (planResult) results.studyPlan = planResult;

    return {
      success: true,
      materials: results
    };
  } catch (error) {
    console.error('Error generating complete material:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate study materials'
    };
  }
};

export default {
  generateNotes,
  generateDiagram,
  generatePracticeQuestions,
  generateStudyPlan,
  generateCompleteMaterial
};

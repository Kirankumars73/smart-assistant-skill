import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateContent, generateContentStream } from './geminiKeyManager';

/**
 * Fetch context data from Firestore for AI
 */
const fetchContextData = async () => {
  try {
    const context = {
      students: [],
      studentCount: 0,
      subjects: new Set(),
      branches: new Set(),
      stats: {
        avgCGPA: 0,
        totalBackPapers: 0,
        atRisk: 0
      }
    };

    // Fetch students
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    const students = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    context.students = students;
    context.studentCount = students.length;

    // Calculate statistics
    if (students.length > 0) {
      const totalCGPA = students.reduce((sum, s) => sum + (parseFloat(s.cgpa) || 0), 0);
      context.stats.avgCGPA = (totalCGPA / students.length).toFixed(2);
      context.stats.totalBackPapers = students.reduce((sum, s) => sum + (parseInt(s.backPapers) || 0), 0);
      context.stats.atRisk = students.filter(s => {
        const cgpa = parseFloat(s.cgpa) || 0;
        const backPapers = parseInt(s.backPapers) || 0;
        const internalMarks = parseFloat(s.internalMarks) || 0;
        return cgpa < 6.0 || backPapers > 0 || internalMarks < 50;
      }).length;

      // Extract unique subjects and branches
      students.forEach(s => {
        if (s.branch) context.branches.add(s.branch);
      });
    }

    return context;
  } catch (error) {
    console.error('Error fetching context:', error);
    return null;
  }
};

/**
 * Build system prompt with context
 */
const buildSystemPrompt = (context) => {
  if (!context) {
    return `You are an AI assistant for Smart Academic Assistant, an educational management platform.
You help faculty and administrators with student data queries and insights.`;
  }

  const branches = Array.from(context.branches).join(', ') || 'Not specified';
  
  // Build student list for AI context
  let studentList = '';
  if (context.students && context.students.length > 0) {
    studentList = '\n\nSTUDENT DATA:\n';
    context.students.forEach((student, index) => {
      // Format subjects if available
      let subjectsInfo = '';
      if (student.subjects && student.subjects.length > 0) {
        const subjectsWithMarks = student.subjects.filter(s => s.internalMarks !== '' && s.internalMarks !== null && s.internalMarks !== undefined);
        const avgMarks = subjectsWithMarks.length > 0 
          ? (subjectsWithMarks.reduce((sum, s) => sum + (parseFloat(s.internalMarks) || 0), 0) / subjectsWithMarks.length).toFixed(2)
          : 'N/A';
        
        subjectsInfo = `\n   - Subjects (${student.subjects.length}):\n`;
        student.subjects.forEach(sub => {
          const typeIcon = sub.type === 'lab' ? '🔬' : '📘';
          const marks = sub.internalMarks ? `${sub.internalMarks}%` : 'Not graded';
          subjectsInfo += `     ${typeIcon} ${sub.name || 'Unnamed'}: ${marks}\n`;
        });
        subjectsInfo += `   - Average Internal: ${avgMarks}%\n`;
      } else {
        // Fallback to old internalMarks field
        subjectsInfo = `\n   - Internal Marks: ${student.internalMarks || 'N/A'}%\n`;
      }
      
      studentList += `${index + 1}. ${student.name || 'N/A'} (ID: ${student.studentId || 'N/A'})
   - Branch: ${student.branch || 'N/A'}
   - Semester: ${student.semester || 'N/A'}
   - CGPA: ${student.cgpa || 'N/A'}
   - Back Papers: ${student.backPapers || 0}${subjectsInfo}   - Email: ${student.email || 'N/A'}
   - Phone: ${student.phone || 'N/A'}
`;
    });
  }

  return `You are an AI assistant for Smart Academic Assistant, an educational management platform.

CURRENT DATA CONTEXT:
- Total Students: ${context.studentCount}
- Branches: ${branches}
- Average CGPA: ${context.stats.avgCGPA}
- Students at Risk: ${context.stats.atRisk}
- Total Back Papers: ${context.stats.totalBackPapers}
${studentList}
YOUR CAPABILITIES:
- Answer questions about student data and statistics
- Analyze academic performance trends
- Identify at-risk students by name and ID
- Provide insights and recommendations
- Compare performance across branches
- Access individual student details

GUIDELINES:
- Be helpful, concise, and professional
- Use the student data above to provide specific answers
- When identifying students, mention their name and ID
- Format numbers clearly (e.g., CGPA to 2 decimal places)
- Use emojis sparingly for better readability
- If asked about specific students, use the data provided above

IMPORTANT: You can analyze and discuss the data, but you cannot modify it.`;
};

/**
 * Build user query with relevant data
 */
const buildUserQuery = (userInput, context) => {
  if (!context || !context.students) return userInput;

  // Check if query mentions specific student ID
  const studentIdMatch = userInput.match(/\b(PTA\d+|[A-Z]{2,3}\d+)\b/i);
  if (studentIdMatch) {
    const searchId = studentIdMatch[0].toUpperCase();
    const student = context.students.find(s => 
      s.studentId?.toUpperCase() === searchId ||
      s.rollNumber?.toUpperCase() === searchId
    );

    if (student) {
      return `${userInput}

STUDENT DATA (${student.studentId}):
- Name: ${student.name}
- Branch: ${student.branch}
- Semester: ${student.semester}
- CGPA: ${student.cgpa}
- Back Papers: ${student.backPapers}
- Internal Marks: ${student.internalMarks}%
- Email: ${student.email || 'N/A'}
- Phone: ${student.phone || 'N/A'}`;
    }
  }

  // Check if query is about a specific branch
  const branchMatch = userInput.match(/\b(CSE|ECE|EEE|ME|CIVIL|IT)\b/i);
  if (branchMatch) {
    const branch = branchMatch[0].toUpperCase();
    const branchStudents = context.students.filter(s => 
      s.branch?.toUpperCase().includes(branch)
    );

    if (branchStudents.length > 0) {
      const avgCGPA = (branchStudents.reduce((sum, s) => sum + (parseFloat(s.cgpa) || 0), 0) / branchStudents.length).toFixed(2);
      return `${userInput}

${branch} BRANCH DATA:
- Total Students: ${branchStudents.length}
- Average CGPA: ${avgCGPA}
- Students: ${branchStudents.map(s => s.name).join(', ')}`;
    }
  }

  return userInput;
};

export const processQueryWithAI = async (userInput) => {
  try {
    // Fetch context data
    const context = await fetchContextData();
    
    // Build enhanced query
    const enhancedQuery = buildUserQuery(userInput, context);
    
    // Build full prompt with system context
    const fullPrompt = `${buildSystemPrompt(context)}\n\nUser Query: ${enhancedQuery}`;

    // Generate response using key manager (with automatic rotation & caching)
    const text = await generateContent(fullPrompt, {
      model: 'gemini-2.5-flash',
      useCache: true, // Enable caching for repeated queries
      maxRetries: 3
    });

    return text;
  } catch (error) {
    console.error('Gemini AI Error:', error);
    return error.message || '⚠️ I encountered an error processing your request. Please try again later.';
  }
};

/**
 * Stream response from Gemini (for typing effect)
 */
export const streamQueryWithAI = async (userInput, onChunk) => {
  try {
    const context = await fetchContextData();
    const enhancedQuery = buildUserQuery(userInput, context);
    const fullPrompt = `${buildSystemPrompt(context)}\n\nUser Query: ${enhancedQuery}`;
    
    // Stream using key manager (with automatic rotation)
    const fullText = await generateContentStream(fullPrompt, onChunk, {
      model: 'gemini-2.5-flash',
      maxRetries: 3
    });

    return fullText;
  } catch (error) {
    console.error('Gemini AI Streaming Error:', error);
    throw error;
  }
};

export default { processQueryWithAI, streamQueryWithAI };

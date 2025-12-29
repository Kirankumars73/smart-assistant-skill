import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export question prediction to PDF with logo
 */
export const exportQuestionPredictionToPDF = async (predictions, logoPath = '/college-logo.png') => {
  const doc = new jsPDF('portrait');
  
  // Load logo
  let logo = null;
  try {
    logo = await loadImage(logoPath);
  } catch (error) {
    console.warn('Failed to load logo, continuing without it:', error);
  }
  
  // Add header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('PREDICTED QUESTION PAPER', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  
  // Add subject metadata
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Subject: ${predictions.subjectName}`, 14, 35);
  doc.text(`Subject Code: ${predictions.subjectCode}`, 14, 42);
  doc.text(`Semester: ${predictions.semester}`, 14, 49);
  doc.text(`Generated: ${new Date(predictions.generatedAt).toLocaleDateString()}`, 14, 56);
  
  let currentY = 70;
  
  // PART A Section
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('PART A - Compulsory Questions (3 marks each)', 14, currentY);
  doc.setFontSize(10);
  doc.setFont(undefined, 'italic');
  currentY += 7;
  doc.text('Answer ALL questions', 14, currentY);
  currentY += 10;
  
  // Part A Questions by Module
  Object.entries(predictions.partA).forEach(([module, questions]) => {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      if (logo) addLogoToPage(doc, logo);
      currentY = 20;
    }
    
    // Module heading
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(module, 14, currentY);
    currentY += 7;
    
    // Questions
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    questions.forEach((q, idx) => {
      // Check page break
      if (currentY > 260) {
        doc.addPage();
        if (logo) addLogoToPage(doc, logo);
        currentY = 20;
      }
      
      // Question number and text
      const questionText = `${idx + 1}. ${q.question}`;
      const splitText = doc.splitTextToSize(questionText, 170);
      doc.text(splitText, 20, currentY);
      currentY += splitText.length * 5;
      
      // Metadata (probability and frequency)
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`[Probability: ${Math.round(q.probability * 100)}% | Frequency: ${q.frequency}x]`, 25, currentY);
      currentY += 7;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
    });
    
    currentY += 5;
  });
  
  // PART B Section
  if (currentY > 220) {
    doc.addPage();
    if (logo) addLogoToPage(doc, logo);
    currentY = 20;
  } else {
    currentY += 10;
  }
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('PART B - Answer ANY ONE from each module (14 marks total)', 14, currentY);
  currentY += 10;
  
  // Part B Questions by Module
  Object.entries(predictions.partB).forEach(([module, data]) => {
    // Check if we need a new page
    if (currentY > 240) {
      doc.addPage();
      if (logo) addLogoToPage(doc, logo);
      currentY = 20;
    }
    
    // Module heading with total marks
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${module} (Total: ${data.totalMarks} marks)`, 14, currentY);
    currentY += 7;
    
    // Questions
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    data.questions.forEach((q, idx) => {
      // Check page break
      if (currentY > 260) {
        doc.addPage();
        if (logo) addLogoToPage(doc, logo);
        currentY = 20;
      }
      
      // Question with marks badge
      const questionText = `${idx + 1}. (${q.marks} marks) ${q.question}`;
      const splitText = doc.splitTextToSize(questionText, 170);
      doc.text(splitText, 20, currentY);
      currentY += splitText.length * 5;
      
      // Metadata
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`[Probability: ${Math.round(q.probability * 100)}% | Frequency: ${q.frequency}x]`, 25, currentY);
      currentY += 7;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
    });
    
    // OR note
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('OR any other combination summing to 14 marks', 20, currentY);
    currentY += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
  });
  
  // Statistics Section
  if (currentY > 220) {
    doc.addPage();
    if (logo) addLogoToPage(doc, logo);
    currentY = 20;
  } else {
    currentY += 10;
  }
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('STATISTICS', 14, currentY);
  currentY += 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Total Questions Analyzed: ${predictions.stats.totalQuestions}`, 14, currentY);
  currentY += 6;
  doc.text(`Part A Questions: ${predictions.stats.partAQuestions}`, 14, currentY);
  currentY += 6;
  doc.text(`Part B Questions: ${predictions.stats.partBQuestions}`, 14, currentY);
  currentY += 6;
  doc.text(`Modules Covered: ${predictions.stats.modules}`, 14, currentY);
  
  // Footer on last page
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont(undefined, 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Generated by Smart Academic Assistant - Question Prediction System', 14, pageHeight - 15);
  doc.text('Based on historical question frequency, marks weightage, and recency analysis', 14, pageHeight - 10);
  
  // Add logo to all pages
  if (logo) {
    const totalPages = doc.internal.pages.length - 1; // -1 because first element is metadata
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addLogoToPage(doc, logo);
    }
  }
  
  // Save PDF
  doc.save(`${predictions.subjectCode}_Sem${predictions.semester}_Predicted_Questions.pdf`);
};

/**
 * Load image and convert to base64
 */
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Add logo to bottom right corner of current page
 */
const addLogoToPage = (doc, logoBase64) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo dimensions (small size)
  const logoWidth = 20;
  const logoHeight = 12;
  
  // Position at bottom right with small margin
  const xPos = pageWidth - logoWidth - 8;
  const yPos = pageHeight - logoHeight - 5;
  
  try {
    doc.addImage(logoBase64, 'PNG', xPos, yPos, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Failed to add logo to PDF:', error);
  }
};

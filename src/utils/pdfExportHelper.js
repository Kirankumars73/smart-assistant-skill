import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export faculty timetables to PDF with logo
 */
export const exportFacultyTimetablesToPDF = async (facultyTimetables, config, logoPath = '/college-logo.png') => {
  const doc = new jsPDF('landscape');
  let isFirstPage = true;
  
  // Load logo
  const logo = await loadImage(logoPath);
  
  Object.entries(facultyTimetables).forEach(([facultyName, timetable]) => {
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;
    
    // Add title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Faculty Timetable - ${facultyName}`, 14, 15);
    
    // Prepare table data
    const tableData = prepareTimetableData(timetable, config.rows, config.cols);
    
    // Add table
    autoTable(doc, {
      startY: 25,
      head: [tableData.headers],
      body: tableData.rows,
      theme: 'grid',
      headStyles: { fillColor: [139,0, 139], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fillColor: [240, 240, 240], fontStyle: 'bold' }
      }
    });
    
    // Add logo to bottom right
    addLogoToPage(doc, logo);
  });
  
  // Save PDF
  doc.save(`Faculty_Timetables_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export class timetables to PDF with logo
 */
export const exportClassTimetablesToPDF = async (classTimetables, config, logoPath = '/college-logo.png') => {
  const doc = new jsPDF('landscape');
  let isFirstPage = true;
  
  // Load logo
  const logo = await loadImage(logoPath);
  
  Object.entries(classTimetables).forEach(([className, timetable]) => {
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;
    
    // Add title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Class Timetable - ${className}`, 14, 15);
    
    // Prepare table data
    const tableData = prepareTimetableData(timetable, config.rows, config.cols);
    
    // Add table
    autoTable(doc, {
      startY: 25,
      head: [tableData.headers],
      body: tableData.rows,
      theme: 'grid',
      headStyles: { fillColor: [139, 0, 139], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fillColor: [240, 240, 240], fontStyle: 'bold' }
      }
    });
    
    // Add logo to bottom right
    addLogoToPage(doc, logo);
  });
  
  // Save PDF
  doc.save(`Class_Timetables_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Prepare timetable data for PDF table
 */
const prepareTimetableData = (timetable, rows, cols) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const periods = Array.from({ length: cols }, (_, i) => `Period ${i + 1}`);
  
  const headers = ['Day', ...periods];
  const tableRows = [];
  
  for (let i = 0; i < rows; i++) {
    const row = [days[i] || `Day ${i + 1}`];
    for (let j = 0; j < cols; j++) {
      row.push(timetable[i]?.[j] || 'FREE');
    }
    tableRows.push(row);
  }
  
  return { headers, rows: tableRows };
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
  const logoWidth = 25;
  const logoHeight = 15;
  
  // Position at bottom right with small margin
  const xPos = pageWidth - logoWidth - 10;
  const yPos = pageHeight - logoHeight - 5;
  
  try {
    doc.addImage(logoBase64, 'PNG', xPos, yPos, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Failed to add logo to PDF:', error);
  }
};

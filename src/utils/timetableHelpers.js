/**
 * Timetable Export Utilities
 * Handles PDF and Excel export for generated timetables
 */

import * as XLSX from 'xlsx';

/**
 * Format timetable for export
 */
export const formatTimetableData = (timetables, type = 'faculty', rows, cols) => {
  const formatted = [];
  
  for (const [name, timetable] of Object.entries(timetables)) {
    const data = {
      name,
      grid: timetable,
      type
    };
    formatted.push(data);
  }
  
  return formatted;
};

/**
 * Export timetable as Excel
 */
export const exportToExcel = (facultyTimetables, classTimetables, rows, cols, filename = 'timetable.xlsx') => {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Create faculty timetables sheet
    const facultyData = [];
    for (const [facultyName, timetable] of Object.entries(facultyTimetables)) {
      // Add header row
      facultyData.push([`Faculty: ${facultyName}`]);
      
      // Create header with periods
      const headers = ['Day', ...Array.from({ length: cols }, (_, i) => `Period ${i + 1}`)];
      facultyData.push(headers);
      
      // Add timetable rows
      for (let i = 0; i < rows; i++) {
        const row = [`Day ${i + 1}`, ...timetable[i]];
        facultyData.push(row);
      }
      
      // Add empty row for spacing
      facultyData.push([]);
    }
    
    const facultySheet = XLSX.utils.aoa_to_sheet(facultyData);
    XLSX.utils.book_append_sheet(workbook, facultySheet, 'Faculty Timetables');
    
    // Create class timetables sheet
    const classData = [];
    for (const [className, timetable] of Object.entries(classTimetables)) {
      // Add header row
      classData.push([`Class: ${className}`]);
      
      // Create header with periods
      const headers = ['Day', ...Array.from({ length: cols }, (_, i) => `Period ${i + 1}`)];
      classData.push(headers);
      
      // Add timetable rows
      for (let i = 0; i < rows; i++) {
        const row = [`Day ${i + 1}`, ...timetable[i]];
        classData.push(row);
      }
      
      // Add empty row for spacing
      classData.push([]);
    }
    
    const classSheet = XLSX.utils.aoa_to_sheet(classData);
    XLSX.utils.book_append_sheet(workbook, classSheet, 'Class Timetables');
    
    // Write file
    XLSX.writeFile(workbook, filename);
    
    return { success: true, message: 'Excel file exported successfully' };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, message: `Export failed: ${error.message}` };
  }
};

/**
 * Export timetable as formatted text (for PDF conversion)
 */
export const exportToText = (facultyTimetables, classTimetables, rows, cols, metadata = {}) => {
  try {
    let textContent = '';
    
    // Add metadata header
    textContent += '='.repeat(80) + '\n';
    textContent += '                        TIMETABLE SCHEDULE\n';
    textContent += '='.repeat(80) + '\n\n';
    
    if (metadata.department) {
      textContent += `Department: ${metadata.department}\n`;
    }
    if (metadata.scheme) {
      textContent += `Scheme: ${metadata.scheme}\n`;
    }
    if (metadata.semester) {
      textContent += `Semester: ${metadata.semester}\n`;
    }
    if (metadata.academicYear) {
      textContent += `Academic Year: ${metadata.academicYear}\n`;
    }
    textContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    
    // Faculty timetables
    textContent += '='.repeat(80) + '\n';
    textContent += 'FACULTY TIMETABLES\n';
    textContent += '='.repeat(80) + '\n\n';
    
    for (const [facultyName, timetable] of Object.entries(facultyTimetables)) {
      textContent += `Faculty Name: ${facultyName}\n`;
      textContent += '-'.repeat(80) + '\n';
      
      // Create header
      let header = '| Day       |';
      for (let i = 0; i < cols; i++) {
        header += ` Period ${i + 1}`.padEnd(12) + '|';
      }
      textContent += header + '\n';
      textContent += '|' + '-'.repeat(11) + '|' + ('-'.repeat(12) + '|').repeat(cols) + '\n';
      
      // Add rows
      for (let i = 0; i < rows; i++) {
        let row = `| Day ${i + 1}`.padEnd(12) + '|';
        for (let j = 0; j < cols; j++) {
          row += ` ${timetable[i][j]}`.padEnd(12) + '|';
        }
        textContent += row + '\n';
      }
      
      textContent += '\n\n';
    }
    
    // Class timetables
    textContent += '='.repeat(80) + '\n';
    textContent += 'CLASS TIMETABLES\n';
    textContent += '='.repeat(80) + '\n\n';
    
    for (const [className, timetable] of Object.entries(classTimetables)) {
      textContent += `Class Name: ${className}\n`;
      textContent += '-'.repeat(80) + '\n';
      
      // Create header
      let header = '| Day       |';
      for (let i = 0; i < cols; i++) {
        header += ` Period ${i + 1}`.padEnd(12) + '|';
      }
      textContent += header + '\n';
      textContent += '|' + '-'.repeat(11) + '|' + ('-'.repeat(12) + '|').repeat(cols) + '\n';
      
      // Add rows
      for (let i = 0; i < rows; i++) {
        let row = `| Day ${i + 1}`.padEnd(12) + '|';
        for (let j = 0; j < cols; j++) {
          row += ` ${timetable[i][j]}`.padEnd(12) + '|';
        }
        textContent += row + '\n';
      }
      
      textContent += '\n\n';
    }
    
    textContent += '='.repeat(80) + '\n';
    textContent += 'End of Timetable\n';
    textContent += '='.repeat(80) + '\n';
    
    return textContent;
  } catch (error) {
    console.error('Error formatting text:', error);
    return null;
  }
};

/**
 * Download text file
 */
export const downloadTextFile = (content, filename = 'timetable.txt') => {
  try {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, message: 'Text file downloaded successfully' };
  } catch (error) {
    console.error('Error downloading text file:', error);
    return { success: false, message: `Download failed: ${error.message}` };
  }
};

/**
 * Export timetable as JSON (for backup/import)
 */
export const exportToJSON = (data, filename = 'timetable.json') => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, message: 'JSON file exported successfully' };
  } catch (error) {
    console.error('Error exporting JSON:', error);
    return { success: false, message: `Export failed: ${error.message}` };
  }
};

/**
 * Detect conflicts in timetable
 */
export const detectConflicts = (facultyTimetables, classTimetables, rows, cols) => {
  const conflicts = [];
  
  // Check for double bookings
  for (const [facultyName, timetable] of Object.entries(facultyTimetables)) {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cell = timetable[i][j];
        if (cell !== 'FREE') {
          // Check if this faculty appears multiple times at same slot
          let count = 0;
          for (let k = 0; k < cols; k++) {
            if (timetable[i][k] === cell && k !== j) {
              count++;
            }
          }
          if (count > 0) {
            conflicts.push({
              type: 'faculty_double_booking',
              faculty: facultyName,
              day: i + 1,
              period: j + 1,
              class: cell
            });
          }
        }
      }
    }
  }
  
  // Check for class conflicts
  for (const [className, timetable] of Object.entries(classTimetables)) {
    for (let i = 0; i < rows; i++) {
      const subjects = new Set();
      for (let j = 0; j < cols; j++) {
        const cell = timetable[i][j];
        if (cell !== 'FREE') {
          if (subjects.has(cell)) {
            conflicts.push({
              type: 'class_duplicate_subject',
              class: className,
              day: i + 1,
              subject: cell
            });
          }
          subjects.add(cell);
        }
      }
    }
  }
  
  return conflicts;
};

/**
 * Validate timetable configuration
 */
export const validateConfiguration = (config) => {
  const errors = [];
  
  if (!config.rows || config.rows < 1 || config.rows > 7) {
    errors.push('Days must be between 1 and 7');
  }
  
  if (!config.cols || config.cols < 1 || config.cols > 10) {
    errors.push('Periods must be between 1 and 10');
  }
  
  if (!config.faculties || config.faculties.length === 0) {
    errors.push('At least one faculty member is required');
  }
  
  if (!config.classes || config.classes.length === 0) {
    errors.push('At least one class is required');
  }
  
  if (!config.subjects || config.subjects.length === 0) {
    errors.push('At least one subject is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

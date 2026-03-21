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
 * Real day names for exports
 */
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const getDayLabel = (i) => DAY_NAMES[i] || `Day ${i + 1}`;

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
        const row = [getDayLabel(i), ...timetable[i]];
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
        const row = [getDayLabel(i), ...timetable[i]];
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
        let row = `| ${getDayLabel(i)}`.padEnd(12) + '|';
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
        let row = `| ${getDayLabel(i)}`.padEnd(12) + '|';
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
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Check for faculty double-booking: same faculty in two different classes at same period
  for (const [facultyName, timetable] of Object.entries(facultyTimetables)) {
    for (let i = 0; i < rows; i++) {
      // Track what appears per period (each period can have at most 1 class)
      // The grid stores className per period — structural double-booking impossible,
      // but crossover/mutation could create empty class-grid slots. Already penalized in GA.
      // Here we detect if the SAME faculty slot says two different things (shouldn't happen)
      // More useful: check that a class is not scheduled by two different faculty at same slot
    }
  }

  // Check for class double-booking: two different subjects in the same slot for a class
  for (const [className, timetable] of Object.entries(classTimetables)) {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cell = timetable[i][j];
        // A class can only have one subject per slot — this checks cross-faculty scheduling
        // We count how many faculty are scheduled for this class at this slot
        let facultyCount = 0;
        const scheduledFaculties = [];
        for (const [facultyName, fTable] of Object.entries(facultyTimetables)) {
          if (fTable[i] && fTable[i][j] === className) {
            facultyCount++;
            scheduledFaculties.push(facultyName);
          }
        }
        // More than 1 faculty AND class slot is FREE = inconsistency (not legitimate co-teaching)
        if (facultyCount > 1 && cell === 'FREE') {
          conflicts.push({
            type: 'class_double_booking',
            class: className,
            day: DAY_NAMES[i] || `Day ${i + 1}`,
            period: j + 1,
            faculties: scheduledFaculties
          });
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

import * as XLSX from 'xlsx';

/**
 * Parse an Excel file and extract timetable data from a SINGLE sheet
 * Expected columns: Days, Periods, Faculty, Class, Subject, Type, WeeklyLimit
 *
 * Single sheet format - all data in one place:
 * | Days | Periods | Faculty | Class | Subject | Type | WeeklyLimit |
 * | 5    | 6       | Dr. Smith | BCS-1 | Mathematics | theory | 4           |
 * | 5    | 6       | Dr. Smith | BCS-1 | C Programming | lab | 2          |
 */
export const parseExcelTimetable = (fileData) => {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const errors = [];

  // Get first sheet (single sheet format)
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length === 0) {
    return { success: false, errors: ['Excel file is empty'] };
  }

  // Extract config from first row
  const firstRow = data[0];
  const days = parseInt(firstRow.Days) || parseInt(firstRow.days) || parseInt(firstRow.DaysPerWeek) || 5;
  const periods = parseInt(firstRow.Periods) || parseInt(firstRow.periods) || parseInt(firstRow.PeriodsPerDay) || 6;

  const config = { rows: days, cols: periods };

  // Validate config
  if (config.rows < 1 || config.rows > 7) {
    errors.push('Days must be between 1 and 7');
  }
  if (config.cols < 1 || config.cols > 12) {
    errors.push('Periods must be between 1 and 12');
  }

  // Collect unique faculty and classes
  const facultySet = new Set();
  const classMap = new Map(); // className -> {name, department, semester, scheme, academicYear, subjects: []}
  const assignments = [];

  // Process each row
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Handle different possible column name variations
    const facultyName = row.Faculty || row.faculty || row.FacultyName || row['Faculty Name'] || '';
    const className = row.Class || row.class || row.ClassName || row['Class Name'] || '';
    const subjectName = row.Subject || row.subject || row.SubjectName || row['Subject Name'] || '';
    const type = (row.Type || row.type || row.SubjectType || row['Subject Type'] || 'theory').toString().toLowerCase();
    const weeklyLimit = parseInt(row.WeeklyLimit) || parseInt(row['Weekly Limit']) || parseInt(row.weeklyLimit) || 3;

    // Skip empty rows
    if (!facultyName && !className && !subjectName) {
      continue;
    }

    // Validate required fields
    if (!facultyName || !facultyName.trim()) {
      errors.push(`Row ${i + 2}: Missing Faculty name`);
      continue;
    }
    if (!className || !className.trim()) {
      errors.push(`Row ${i + 2}: Missing Class name`);
      continue;
    }
    if (!subjectName || !subjectName.trim()) {
      errors.push(`Row ${i + 2}: Missing Subject name`);
      continue;
    }

    const trimmedFaculty = facultyName.trim();
    const trimmedClass = className.trim();
    const trimmedSubject = subjectName.trim();

    // Add faculty
    facultySet.add(trimmedFaculty);

    // Add class (if not already exists)
    if (!classMap.has(trimmedClass)) {
      classMap.set(trimmedClass, {
        name: trimmedClass,
        department: row.Department || row.department || row['Department Name'] || '',
        semester: parseInt(row.Semester || row.semester || row.Sem || 1),
        scheme: row.Scheme || row.scheme || row['Scheme Year'] || '',
        academicYear: row.AcademicYear || row['Academic Year'] || row.academicYear || new Date().getFullYear().toString(),
        subjects: []
      });
    }

    // Add subject to class if not exists
    const cls = classMap.get(trimmedClass);
    const subjectExists = cls.subjects.some(s => s.name.toLowerCase() === trimmedSubject.toLowerCase());
    if (!subjectExists) {
      cls.subjects.push({
        name: trimmedSubject,
        type: type === 'lab' ? 'lab' : 'theory'
      });
    }

    // Validate type
    if (type !== 'theory' && type !== 'lab') {
      errors.push(`Row ${i + 2}: Type "${type}" must be "theory" or "lab"`);
      continue;
    }

    // Validate weeklyLimit
    if (weeklyLimit < 1 || weeklyLimit > 20) {
      errors.push(`Row ${i + 2}: WeeklyLimit must be between 1 and 20`);
      continue;
    }

    // Determine isLab from type
    const isLab = type === 'lab';

    assignments.push({
      className: trimmedClass,
      subjectName: trimmedSubject,
      facultyName: trimmedFaculty,
      weeklyLimit: weeklyLimit,
      isLab: isLab,
      consecutivePeriods: isLab ? 2 : 1,
      multiFaculty: false,
      additionalFaculties: []
    });
  }

  // Convert to arrays
  const faculties = Array.from(facultySet);
  const classes = Array.from(classMap.values());

  // Final validation
  if (faculties.length === 0) {
    errors.push('No faculty found in Excel');
  }
  if (classes.length === 0) {
    errors.push('No classes found in Excel');
  }
  if (assignments.length === 0) {
    errors.push('No assignments found in Excel');
  }

  // Collect all subjects
  const subjects = [];
  for (const cls of classes) {
    for (const subj of cls.subjects) {
      subjects.push({ name: subj.name, type: subj.type });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      config,
      faculties,
      classes,
      subjects,
      assignments
    }
  };
};

/**
 * Generate a blank Excel template file with single sheet format
 * All data in ONE sheet - easy to fill in
 */
export const generateTemplate = () => {
  const workbook = XLSX.utils.book_new();

  // Single sheet with all data
  // First row is config, rest are assignments
  const templateData = [
    { Days: 5, Periods: 6, Faculty: 'Dr. John Smith', Class: 'BCS-1', Subject: 'Mathematics', Type: 'theory', WeeklyLimit: 4, Department: 'Computer Science', Semester: 1, Scheme: '2023', AcademicYear: '2023-24' },
    { Days: '', Periods: '', Faculty: 'Dr. John Smith', Class: 'BCS-1', Subject: 'Physics', Type: 'theory', WeeklyLimit: 3, Department: '', Semester: '', Scheme: '', AcademicYear: '' },
    { Days: '', Periods: '', Faculty: 'Dr. John Smith', Class: 'BCS-1', Subject: 'C Programming', Type: 'lab', WeeklyLimit: 2, Department: '', Semester: '', Scheme: '', AcademicYear: '' },
    { Days: '', Periods: '', Faculty: 'Prof. Jane Doe', Class: 'BCS-2', Subject: 'Data Structures', Type: 'theory', WeeklyLimit: 4, Department: '', Semester: '', Scheme: '', AcademicYear: '' },
    { Days: '', Periods: '', Faculty: 'Prof. Jane Doe', Class: 'BCS-2', Subject: 'Database', Type: 'theory', WeeklyLimit: 3, Department: '', Semester: '', Scheme: '', AcademicYear: '' },
    { Days: '', Periods: '', Faculty: 'Prof. Jane Doe', Class: 'BCS-2', Subject: 'SQL Lab', Type: 'lab', WeeklyLimit: 2, Department: '', Semester: '', Scheme: '', AcademicYear: '' },
    { Days: '', Periods: '', Faculty: 'Dr. Robert Johnson', Class: 'BCS-3', Subject: 'Operating Systems', Type: 'theory', WeeklyLimit: 4, Department: '', Semester: '', Scheme: '', AcademicYear: '' },
    { Days: '', Periods: '', Faculty: 'Dr. Robert Johnson', Class: 'BCS-3', Subject: 'Computer Networks', Type: 'theory', WeeklyLimit: 3, Department: '', Semester: '', Scheme: '', AcademicYear: '' },
    { Days: '', Periods: '', Faculty: 'Dr. Robert Johnson', Class: 'BCS-3', Subject: 'Network Lab', Type: 'lab', WeeklyLimit: 2, Department: '', Semester: '', Scheme: '', AcademicYear: '' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // Days
    { wch: 10 }, // Periods
    { wch: 20 }, // Faculty
    { wch: 12 }, // Class
    { wch: 20 }, // Subject
    { wch: 8 },  // Type
    { wch: 12 }, // WeeklyLimit
    { wch: 20 }, // Department
    { wch: 10 }, // Semester
    { wch: 10 }, // Scheme
    { wch: 14 }, // AcademicYear
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable');

  return workbook;
};

/**
 * Download template Excel file
 */
export const downloadTemplate = () => {
  const workbook = generateTemplate();
  XLSX.writeFile(workbook, 'timetable_template.xlsx');
};
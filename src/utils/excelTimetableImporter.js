import * as XLSX from 'xlsx';

/**
 * Parse an Excel file and extract timetable data.
 *
 * Expected sheet name: "DepartmentData" (falls back to first sheet)
 *
 * Column format (exactly as in the downloaded template):
 * | Class | Subject | Type | Weekly Hours | Consecutive Required | Consecutive Hours | Faculty |
 *
 * Rules:
 *  - "Type" must be "theory" or "lab" (case-insensitive)
 *  - "Consecutive Required" accepts: yes/no, true/false, 1/0 (case-insensitive)
 *  - "Faculty" may contain multiple names separated by commas.
 *    When multiple faculty are listed, ALL faculty are scheduled in the SAME slot
 *    simultaneously (co-teaching). "Weekly Hours" is NOT split between them.
 *  - If Type=lab OR Consecutive Required=yes, the subject is treated as a lab.
 *  - "Consecutive Hours" defaults to 2 for labs, 1 for theory (if left blank).
 */
export const parseExcelTimetable = (fileData) => {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const errors = [];
  let assignmentIdCounter = 0; // unique stable IDs within this import

  // Prefer "DepartmentData" sheet, fall back to first sheet
  const sheetName = workbook.SheetNames.includes('DepartmentData')
    ? 'DepartmentData'
    : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (data.length === 0) {
    return { success: false, errors: ['Excel file is empty or has no data rows'] };
  }

  const facultySet = new Set();
  const classMap = new Map(); // className -> { name, subjects: [{name, type}] }
  const assignments = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // ── Read columns (handle minor name variations) ─────────────────────────
    const className     = (row['Class']    || row['class']    || '').toString().trim();
    const subjectName   = (row['Subject']  || row['subject']  || '').toString().trim();
    const rawType       = (row['Type']     || row['type']     || 'theory').toString().trim().toLowerCase();
    const weeklyHoursRaw = row['Weekly Hours'] || row['WeeklyHours'] || row['Weekly_Hours'] || row['weekly hours'] || '';
    const consecutiveReqRaw = row['Consecutive Required'] || row['ConsecutiveRequired'] || row['consecutive required'] || 'no';
    const consecutiveHoursRaw = row['Consecutive Hours'] || row['ConsecutiveHours'] || row['consecutive hours'] || '';
    const facultyRaw   = (row['Faculty']   || row['faculty']  || '').toString().trim();

    // Skip entirely empty rows
    if (!className && !subjectName && !facultyRaw) continue;

    // ── Validate required fields ─────────────────────────────────────────────
    if (!className) {
      errors.push(`Row ${i + 2}: Missing "Class"`);
      continue;
    }
    if (!subjectName) {
      errors.push(`Row ${i + 2}: Missing "Subject"`);
      continue;
    }
    if (!facultyRaw) {
      errors.push(`Row ${i + 2}: Missing "Faculty"`);
      continue;
    }

    // ── Parse type ───────────────────────────────────────────────────────────
    if (rawType !== 'theory' && rawType !== 'lab') {
      errors.push(`Row ${i + 2}: "Type" must be "theory" or "lab", got "${rawType}"`);
      continue;
    }

    // ── Parse Consecutive Required ────────────────────────────────────────────
    const consReqStr = consecutiveReqRaw.toString().trim().toLowerCase();
    const consecutiveRequired = ['yes', 'true', '1'].includes(consReqStr);

    // isLab = type is lab OR consecutive is required
    const isLab = rawType === 'lab' || consecutiveRequired;

    // ── Parse numbers ────────────────────────────────────────────────────────
    const weeklyHours = parseInt(weeklyHoursRaw) || 3;
    const consecutiveHours = parseInt(consecutiveHoursRaw) || (isLab ? 2 : 1);

    // ── Parse faculty (comma-separated) ──────────────────────────────────────
    const facultyNames = facultyRaw.split(',').map(f => f.trim()).filter(Boolean);
    if (facultyNames.length === 0) {
      errors.push(`Row ${i + 2}: "Faculty" is empty`);
      continue;
    }

    // ── Register class ────────────────────────────────────────────────────────
    if (!classMap.has(className)) {
      classMap.set(className, { name: className, subjects: [] });
    }
    const cls = classMap.get(className);
    const subjectExists = cls.subjects.some(
      s => s.name.toLowerCase() === subjectName.toLowerCase()
    );
    if (!subjectExists) {
      cls.subjects.push({ name: subjectName, type: rawType });
    }

    // ── Register faculty (co-teaching: all in same slot) ─────────────────────
    // All faculty names are registered. One single assignment is created with
    // the primary faculty + additionalFaculties list. The scheduler will book
    // ALL of them into the SAME time slot simultaneously (co-teaching).
    facultyNames.forEach(name => facultySet.add(name));

    assignments.push({
      id: assignmentIdCounter++,
      className,
      subjectName: isLab && !subjectName.endsWith('*') ? subjectName + '*' : subjectName,
      facultyName: facultyNames[0],
      weeklyLimit: weeklyHours,
      isLab,
      consecutivePeriods: isLab ? consecutiveHours : 1,
      multiFaculty: facultyNames.length > 1,
      additionalFaculties: facultyNames.slice(1)
    });
  }

  // ── Build output arrays ───────────────────────────────────────────────────
  const faculties = Array.from(facultySet);
  const classes   = Array.from(classMap.values());

  // Collect unique subjects across all classes
  const subjectSet = new Map();
  for (const cls of classes) {
    for (const subj of cls.subjects) {
      if (!subjectSet.has(subj.name)) subjectSet.set(subj.name, subj);
    }
  }
  const subjects = Array.from(subjectSet.values());

  // ── Validate ──────────────────────────────────────────────────────────────
  if (faculties.length === 0) errors.push('No faculty found in Excel');
  if (classes.length === 0)   errors.push('No classes found in Excel');
  if (assignments.length === 0) errors.push('No assignments found in Excel');

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      // Grid config is NOT read from Excel — user sets Days/Periods in Step 1 of the wizard.
      // We keep the default here so the wizard state stays consistent.
      config: { rows: 5, cols: 6 },
      faculties,
      classes,
      subjects,
      assignments
    }
  };
};

/**
 * Generate a blank Excel template matching the expected import format.
 * Sheet name: "DepartmentData"
 * Columns: Class | Subject | Type | Weekly Hours | Consecutive Required | Consecutive Hours | Faculty
 */
export const generateTemplate = () => {
  const workbook = XLSX.utils.book_new();

  const templateData = [
    // ── Theory subject, single faculty ───────────────────────────────────────
    {
      'Class': 'BCS-1',
      'Subject': 'Mathematics',
      'Type': 'theory',
      'Weekly Hours': 4,
      'Consecutive Required': 'no',
      'Consecutive Hours': 1,
      'Faculty': 'Dr. John Smith'
    },
    // ── Theory subject, TWO faculty co-teaching (both in same class simultaneously) ──
    {
      'Class': 'BCS-1',
      'Subject': 'Physics',
      'Type': 'theory',
      'Weekly Hours': 4,
      'Consecutive Required': 'no',
      'Consecutive Hours': 1,
      'Faculty': 'Dr. John Smith, Prof. Jane Doe'
    },
    // ── Lab subject, single faculty, 2-hour consecutive blocks ───────────────
    {
      'Class': 'BCS-1',
      'Subject': 'C Programming Lab',
      'Type': 'lab',
      'Weekly Hours': 2,
      'Consecutive Required': 'yes',
      'Consecutive Hours': 2,
      'Faculty': 'Dr. John Smith'
    },
    // ── Theory subject, different class ──────────────────────────────────────
    {
      'Class': 'BCS-2',
      'Subject': 'Data Structures',
      'Type': 'theory',
      'Weekly Hours': 4,
      'Consecutive Required': 'no',
      'Consecutive Hours': 1,
      'Faculty': 'Prof. Jane Doe'
    },
    {
      'Class': 'BCS-2',
      'Subject': 'Database Management',
      'Type': 'theory',
      'Weekly Hours': 3,
      'Consecutive Required': 'no',
      'Consecutive Hours': 1,
      'Faculty': 'Prof. Jane Doe'
    },
    // ── Lab subject, two faculty sharing ─────────────────────────────────────
    {
      'Class': 'BCS-2',
      'Subject': 'SQL Lab',
      'Type': 'lab',
      'Weekly Hours': 4,
      'Consecutive Required': 'yes',
      'Consecutive Hours': 2,
      'Faculty': 'Prof. Jane Doe, Dr. Robert Johnson'
    },
    {
      'Class': 'BCS-3',
      'Subject': 'Operating Systems',
      'Type': 'theory',
      'Weekly Hours': 4,
      'Consecutive Required': 'no',
      'Consecutive Hours': 1,
      'Faculty': 'Dr. Robert Johnson'
    },
    {
      'Class': 'BCS-3',
      'Subject': 'Computer Networks',
      'Type': 'theory',
      'Weekly Hours': 3,
      'Consecutive Required': 'no',
      'Consecutive Hours': 1,
      'Faculty': 'Dr. Robert Johnson'
    },
    {
      'Class': 'BCS-3',
      'Subject': 'Network Lab',
      'Type': 'lab',
      'Weekly Hours': 2,
      'Consecutive Required': 'yes',
      'Consecutive Hours': 2,
      'Faculty': 'Dr. Robert Johnson'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Column widths
  worksheet['!cols'] = [
    { wch: 12 }, // Class
    { wch: 24 }, // Subject
    { wch: 8  }, // Type
    { wch: 14 }, // Weekly Hours
    { wch: 20 }, // Consecutive Required
    { wch: 18 }, // Consecutive Hours
    { wch: 36 }, // Faculty (wider to fit multiple names)
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'DepartmentData');
  return workbook;
};

/**
 * Download the template Excel file.
 */
export const downloadTemplate = () => {
  const workbook = generateTemplate();
  XLSX.writeFile(workbook, 'timetable_template.xlsx');
};
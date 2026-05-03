import fs from 'fs';
let c = fs.readFileSync('src/pages/QuestionPrediction.jsx', 'utf8');

// Find all non-ASCII sequences and replace with clean text
// Replace any remaining control/garbled chars
c = c.replace(/[^\x20-\x7E\r\n\t]/g, (match, offset) => {
  // Keep legitimate chars we might need
  return '';
});

// Now fix specific text that lost its special chars
c = c.replace('subjectCode} - Semester', 'subjectCode} \u00b7 Semester');
c = c.replace('Compulsory  3 marks each', 'Compulsory \u00b7 3 marks each');
c = c.replace('14 marks  Choose Set A or B', '14 marks \u00b7 Choose Set A or B');
c = c.replace(' Download CSV Template<', ' Download Template<');
c = c.replace(' Syllabus</span>', ' Syllabus</span>');

fs.writeFileSync('src/pages/QuestionPrediction.jsx', c, 'utf8');

// Verify
const verify = fs.readFileSync('src/pages/QuestionPrediction.jsx', 'utf8');
const nonAscii = verify.match(/[^\x20-\x7E\r\n\t\u00b7]/g);
console.log('Non-ASCII remaining:', nonAscii ? nonAscii.length : 0);
console.log('Lines:', verify.split('\n').length);

// Parse check
try {
  const {parse} = await import('@babel/parser');
  parse(verify, {sourceType:'module', plugins:['jsx']});
  console.log('Parse: OK');
} catch(e) {
  console.log('Parse ERROR at line', e.loc?.line, ':', e.message.substring(0,150));
}

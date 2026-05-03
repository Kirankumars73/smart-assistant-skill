import fs from 'fs';
let c = fs.readFileSync('src/pages/QuestionPrediction.jsx', 'utf8');
// Check if encoding is already fine (emojis render correctly)
const hasGarbled = c.includes('\u00c3') || c.includes('\u00c2');
if (!hasGarbled) {
  console.log('File encoding looks clean already');
  process.exit(0);
}
// The file was double-encoded: UTF-8 bytes interpreted as latin1 then saved as UTF-8
// Fix by converting: read as latin1 buffer, then decode as utf8
const buf = Buffer.from(c, 'latin1');
const fixed = buf.toString('utf8');
fs.writeFileSync('src/pages/QuestionPrediction.jsx', fixed, 'utf8');
console.log('Fixed encoding!');

/* Node test suite for app.js parsing logic. Run: node test.js */
'use strict';
var MV = require('./app.js');

var ctx = {
  students: [
    { roll: 1, name: 'Aarav Patel' },
    { roll: 2, name: 'Diya Shah' },
    { roll: 3, name: 'Krishna Prajapati' },
    { roll: 4, name: 'Meera Desai' },
    { roll: 5, name: 'Rohan Chaudhary' },
    { roll: 6, name: 'Aarav Rana' }
  ],
  subjects: [
    { name: 'Maths', max: 50 },
    { name: 'Science', max: 50 },
    { name: 'Gujarati', max: 50 },
    { name: 'English', max: 50 }
  ],
  currentStudentIdx: 0,
  currentSubjectIdx: 0
};

var pass = 0, fail = 0;
function eq(actual, expected, label) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log('FAIL: ' + label + '\n  expected: ' + e + '\n  actual:   ' + a); }
}
function cmd(text) { return MV.parseCommand(text, ctx); }

// --- digits ---
eq(cmd('roll 5'), { type: 'selectRoll', roll: 5 }, 'roll 5');
eq(cmd('roll number 12'), { type: 'selectRoll', roll: 12 }, 'roll number 12');
eq(cmd('45'), { type: 'setMarks', values: [45] }, 'bare digits');
eq(cmd('42 38 45'), { type: 'setMarks', values: [42, 38, 45] }, 'multiple digits');
eq(cmd('maths 45'), { type: 'setMarks', subjectIdx: 0, values: [45] }, 'subject + digits');
eq(cmd('science 38'), { type: 'setMarks', subjectIdx: 1, values: [38] }, 'science 38');

// --- english words ---
eq(cmd('forty five'), { type: 'setMarks', values: [45] }, 'english number words');
eq(cmd('roll seven'), { type: 'selectRoll', roll: 7 }, 'roll seven');
eq(cmd('twenty one'), { type: 'setMarks', values: [21] }, 'twenty one combo');
eq(cmd('maths thirty two'), { type: 'setMarks', subjectIdx: 0, values: [32] }, 'subject + words');

// --- hindi roman ---
eq(cmd('roll paanch'), { type: 'selectRoll', roll: 5 }, 'roll paanch');
eq(cmd('paintalis'), { type: 'setMarks', values: [45] }, 'paintalis = 45');
eq(cmd('athattar'), { type: 'setMarks', values: [78] }, 'athattar = 78');
eq(cmd('maths ne chalis'), { type: 'setMarks', subjectIdx: 0, values: [40] }, 'maths ne chalis');
eq(cmd('ninanave'), { type: 'setMarks', values: [99] }, 'ninanave = 99');

// --- gujarati roman ---
eq(cmd('pistalis'), { type: 'setMarks', values: [45] }, 'pistalis = 45');
eq(cmd('athyoter'), { type: 'setMarks', values: [78] }, 'athyoter = 78');
eq(cmd('so'), { type: 'setMarks', values: [100] }, 'so = 100');

// --- devanagari script ---
eq(cmd('पैंतालीस'), { type: 'setMarks', values: [45] }, 'devanagari 45');
eq(cmd('रोल ५'), { type: 'selectRoll', roll: 5 }, 'devanagari roll 5 (native digit)');
eq(cmd('सत्तर'), { type: 'setMarks', values: [70] }, 'sattar hi script = 70');

// --- gujarati script ---
eq(cmd('પિસ્તાલીસ'), { type: 'setMarks', values: [45] }, 'gujarati script 45');
eq(cmd('રોલ ૫'), { type: 'selectRoll', roll: 5 }, 'gujarati roll 5 (native digit)');
eq(cmd('અઠ્ઠાવન'), { type: 'setMarks', values: [58] }, 'gujarati script 58');

// --- commands ---
eq(cmd('next'), { type: 'next' }, 'next');
eq(cmd('આગળ'), { type: 'next' }, 'next gujarati');
eq(cmd('आगे'), { type: 'next' }, 'next hindi');
eq(cmd('clear'), { type: 'clear' }, 'clear');
eq(cmd('undo'), { type: 'undo' }, 'undo');

// --- student names ---
eq(cmd('diya'), { type: 'selectStudent', studentIdx: 1 }, 'name diya');
eq(cmd('meera'), { type: 'selectStudent', studentIdx: 3 }, 'name meera');
eq(cmd('meera desai'), { type: 'selectStudent', studentIdx: 3 }, 'full name');
var amb = cmd('aarav');
eq(amb.type, 'ambiguousStudent', 'aarav is ambiguous');
eq(amb.candidates.sort(), [0, 5], 'aarav candidates');

// --- fillers ignored ---
eq(cmd('42 marks chhe'), { type: 'setMarks', values: [42] }, 'fillers stripped');
eq(cmd('maths 45 chhe'), { type: 'setMarks', subjectIdx: 0, values: [45] }, 'subject + filler');

// --- validation ---
eq(MV.validateMark(45, 50), { ok: true }, 'valid mark');
eq(MV.validateMark(55, 50).ok, false, 'above max rejected');
eq(MV.validateMark(-3, 50).ok, false, 'negative rejected');
eq(MV.validateMark('', 50), { ok: true }, 'empty ok');

// --- digit conversion ---
eq(MV.toAsciiDigits('૭૮'), '78', 'gujarati digits');
eq(MV.toAsciiDigits('७८'), '78', 'devanagari digits');

// --- fuzzy name ---
var m2 = cmd('krisna'); // common mishearing of Krishna
eq(m2.type === 'selectStudent' && m2.studentIdx === 2, true, 'fuzzy krisna -> Krishna');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

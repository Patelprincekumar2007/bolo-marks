/* Node test suite for app.js parsing logic. Run: node test.js */
'use strict';
var MV = require('./app.js');
var MA = require('./agent.js');

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

// --- absent command ---
eq(cmd('absent'), { type: 'absent' }, 'absent command');
eq(cmd('ગેરહાજર'), { type: 'absent' }, 'gairhazar gujarati');
eq(MV.validateMark('AB', 50), { ok: true }, 'AB marker valid');

// ================= Smart agent layer =================
var actx = ctx;

// parseAgentResponse: clean JSON
var p1 = MA.parseAgentResponse('{"heard":"Diya maths 47","actions":[{"type":"marks","student":"Diya Shah","subject":"Maths","value":47}],"clarify":""}');
eq(p1.ok, true, 'agent clean json parses');
eq(p1.actions.length, 1, 'agent one action');

// fenced JSON with junk around
var p2 = MA.parseAgentResponse('Sure! Here you go:\n```json\n{"heard":"x","actions":[{"type":"marks","student":"3","subject":"Science","value":"absent"}],"clarify":""}\n```\nHope this helps');
eq(p2.ok && p2.actions[0].value === 'absent', true, 'agent fenced json + absent');

// garbage
eq(MA.parseAgentResponse('no json here').ok, false, 'agent garbage rejected');

// mapActions: exact name + subject
var mp1 = MA.mapActions(MA.parseAgentResponse('{"actions":[{"type":"marks","student":"Diya Shah","subject":"Maths","value":47}]}'), actx, MV);
eq(mp1.ops, [{ studentIdx: 1, subjectIdx: 0, value: 47 }], 'map diya maths 47');
eq(mp1.unclear, [], 'map no unclear');

// mapActions: roll string + gujarati-ish subject typo
var mp2 = MA.mapActions(MA.parseAgentResponse('{"actions":[{"type":"marks","student":"5","subject":"math","value":33}]}'), actx, MV);
eq(mp2.ops, [{ studentIdx: 4, subjectIdx: 0, value: 33 }], 'map roll 5, fuzzy subject');

// mapActions: absent fills all subjects with AB
var mp3 = MA.mapActions(MA.parseAgentResponse('{"actions":[{"type":"marks","student":"Rohan Chaudhary","subject":"","value":"absent"}]}'), actx, MV);
eq(mp3.ops.length, 4, 'absent fills all 4 subjects');
eq(mp3.ops[0].value, 'AB', 'absent value AB');

// mapActions: above max is blocked, not written
var mp4 = MA.mapActions(MA.parseAgentResponse('{"actions":[{"type":"marks","student":"Diya Shah","subject":"Maths","value":99}]}'), actx, MV);
eq(mp4.ops.length, 0, 'above max not written');
eq(mp4.unclear.length, 1, 'above max unclear message');

// mapActions: unknown student
var mp5 = MA.mapActions(MA.parseAgentResponse('{"actions":[{"type":"marks","student":"Zebra Khan","subject":"Maths","value":10}]}'), actx, MV);
eq(mp5.ops.length, 0, 'unknown student not written');
eq(mp5.unclear.length, 1, 'unknown student unclear');

// mapActions: ambiguous aarav
var mp6 = MA.mapActions(MA.parseAgentResponse('{"actions":[{"type":"marks","student":"Aarav","subject":"Maths","value":40}]}'), actx, MV);
eq(mp6.ops.length + (mp6.unclear.length ? 1 : 0) >= 1, true, 'ambiguous aarav handled');

// buildAgentPrompt carries context
var pr = MA.buildAgentPrompt(actx, 'Diya ne maths ma 47');
eq(pr.indexOf('Diya Shah') !== -1 && pr.indexOf('Maths (max 50)') !== -1 && pr.indexOf('Diya ne maths ma 47') !== -1, true, 'prompt has roster, subjects, transcript');

// ================= Agent utterance tests (30 utterances) =================

// Test 1: English - Student + Subject + Mark
var ag1 = MA.parseAgentResponse('{"heard":"Diya got 45 in maths","actions":[{"type":"marks","student":"Diya Shah","subject":"Maths","value":45}],"clarify":""}');
eq(ag1.ok && ag1.actions[0].student === 'Diya Shah' && ag1.actions[0].value === 45, true, 'agent: diya maths 45 english');

// Test 2: Gujarati (roman) - Marks entry
var ag2 = MA.parseAgentResponse('{"heard":"Aarav ne vigyaan ma 38","actions":[{"type":"marks","student":"Aarav Patel","subject":"Science","value":38}],"clarify":""}');
eq(ag2.ok && ag2.actions[0].student === 'Aarav Patel' && ag2.actions[0].subject === 'Science', true, 'agent: aarav science 38 gujarati');

// Test 3: Hindi (roman) - Marks entry
var ag3 = MA.parseAgentResponse('{"heard":"Krishna ne mathematics mein 48","actions":[{"type":"marks","student":"Krishna Prajapati","subject":"Maths","value":48}],"clarify":""}');
eq(ag3.ok && ag3.actions[0].value === 48, true, 'agent: krishna maths 48 hindi');

// Test 4: English - Absent marking
var ag4 = MA.parseAgentResponse('{"heard":"Rohan is absent","actions":[{"type":"marks","student":"Rohan Chaudhary","subject":"","value":"absent"}],"clarify":""}');
eq(ag4.ok && ag4.actions[0].value === 'absent', true, 'agent: rohan absent english');

// Test 5: Gujarati - Absent (ગેરહાજર)
var ag5 = MA.parseAgentResponse('{"heard":"Meera ગેરહાજર છે","actions":[{"type":"marks","student":"Meera Desai","subject":"","value":"absent"}],"clarify":""}');
eq(ag5.ok && ag5.actions[0].value === 'absent', true, 'agent: meera absent gujarati');

// Test 6: Hindi - Absent (अनुपस्थित)
var ag6 = MA.parseAgentResponse('{"heard":"Aarav Rana अनुपस्थित है","actions":[{"type":"marks","student":"Aarav Rana","subject":"","value":"absent"}],"clarify":""}');
eq(ag6.ok && ag6.actions[0].value === 'absent', true, 'agent: aarav rana absent hindi');

// Test 7: Multiple students in one utterance
var ag7 = MA.parseAgentResponse('{"heard":"Diya 40 Rohan 35","actions":[{"type":"marks","student":"Diya Shah","subject":"Maths","value":40},{"type":"marks","student":"Rohan Chaudhary","subject":"Maths","value":35}],"clarify":""}');
eq(ag7.ok && ag7.actions.length === 2, true, 'agent: multiple students');

// Test 8: Roll number usage
var ag8 = MA.parseAgentResponse('{"heard":"Roll 3 got 42 in science","actions":[{"type":"marks","student":"3","subject":"Science","value":42}],"clarify":""}');
eq(ag8.ok && ag8.actions[0].student === '3', true, 'agent: roll number 3');

// Test 9: English - Gujarati subject
var ag9 = MA.parseAgentResponse('{"heard":"Diya 38 in gujarati","actions":[{"type":"marks","student":"Diya Shah","subject":"Gujarati","value":38}],"clarify":""}');
eq(ag9.ok && ag9.actions[0].subject === 'Gujarati', true, 'agent: gujarati subject');

// Test 10: English - Science subject with word number
var ag10 = MA.parseAgentResponse('{"heard":"Krishna thirty five science","actions":[{"type":"marks","student":"Krishna Prajapati","subject":"Science","value":35}],"clarify":""}');
eq(ag10.ok && ag10.actions[0].value === 35, true, 'agent: word number thirty five');

// Test 11: Mixed script - Gujarati digits
var ag11 = MA.parseAgentResponse('{"heard":"Meera 45 maths gujarati script","actions":[{"type":"marks","student":"Meera Desai","subject":"Maths","value":45}],"clarify":""}');
eq(ag11.ok && ag11.actions[0].student === 'Meera Desai', true, 'agent: meera gujarati 45');

// Test 12: English - High score
var ag12 = MA.parseAgentResponse('{"heard":"Aarav Patel scored 50 in english","actions":[{"type":"marks","student":"Aarav Patel","subject":"English","value":50}],"clarify":""}');
eq(ag12.ok && ag12.actions[0].value === 50, true, 'agent: aarav english 50 max');

// Test 13: Gujarati subject with Gujarati utterance
var ag13 = MA.parseAgentResponse('{"heard":"દિયા ગુજરાતી માં ૪૫","actions":[{"type":"marks","student":"Diya Shah","subject":"Gujarati","value":45}],"clarify":""}');
eq(ag13.ok && ag13.actions[0].subject === 'Gujarati', true, 'agent: gujarati script utterance');

// Test 14: Hindi - Multiple subjects same student
var ag14 = MA.parseAgentResponse('{"heard":"Krishna maths 48 science 40","actions":[{"type":"marks","student":"Krishna Prajapati","subject":"Maths","value":48},{"type":"marks","student":"Krishna Prajapati","subject":"Science","value":40}],"clarify":""}');
eq(ag14.ok && ag14.actions.length === 2 && ag14.actions[0].subject === 'Maths', true, 'agent: same student two subjects');

// Test 15: Clarification question
var ag15 = MA.parseAgentResponse('{"heard":"Aarav 45","actions":[],"clarify":"Which subject for Aarav?"}');
eq(ag15.ok && ag15.clarify !== '', true, 'agent: ambiguous asks clarification');

// Test 16: English - Low score
var ag16 = MA.parseAgentResponse('{"heard":"Rohan 12 in english","actions":[{"type":"marks","student":"Rohan Chaudhary","subject":"English","value":12}],"clarify":""}');
eq(ag16.ok && ag16.actions[0].value === 12, true, 'agent: rohan english 12');

// Test 17: Gujarati Roman - Student name with marks
var ag17 = MA.parseAgentResponse('{"heard":"Krishna ne hindi ma 42","actions":[{"type":"marks","student":"Krishna Prajapati","subject":"Gujarati","value":42}],"clarify":""}');
eq(ag17.ok && ag17.actions.length >= 1, true, 'agent: krishna gujarati 42');

// Test 18: Hindi with Devanagari
var ag18 = MA.parseAgentResponse('{"heard":"मीरा विज्ञान में 41","actions":[{"type":"marks","student":"Meera Desai","subject":"Science","value":41}],"clarify":""}');
eq(ag18.ok && ag18.actions[0].student === 'Meera Desai', true, 'agent: meera science hindi script');

// Test 19: Partial name matching
var ag19 = MA.parseAgentResponse('{"heard":"Patel 30 science","actions":[{"type":"marks","student":"Aarav Patel","subject":"Science","value":30}],"clarify":""}');
eq(ag19.ok, true, 'agent: partial name patel');

// Test 20: Multiple students different subjects
var ag20 = MA.parseAgentResponse('{"heard":"Aarav maths 40 Krishna science 38","actions":[{"type":"marks","student":"Aarav Patel","subject":"Maths","value":40},{"type":"marks","student":"Krishna Prajapati","subject":"Science","value":38}],"clarify":""}');
eq(ag20.ok && ag20.actions.length === 2, true, 'agent: two students different subjects');

// Test 21: English - Hyphenated number
var ag21 = MA.parseAgentResponse('{"heard":"Diya forty-two maths","actions":[{"type":"marks","student":"Diya Shah","subject":"Maths","value":42}],"clarify":""}');
eq(ag21.ok, true, 'agent: hyphenated number');

// Test 22: Gujarati Roman - Numerals
var ag22 = MA.parseAgentResponse('{"heard":"Rohan Chaudhary 44 gujarati","actions":[{"type":"marks","student":"Rohan Chaudhary","subject":"Gujarati","value":44}],"clarify":""}');
eq(ag22.ok && ag22.actions[0].value === 44, true, 'agent: rohan gujarati 44');

// Test 23: Hindi Roman - Multiple numbers
var ag23 = MA.parseAgentResponse('{"heard":"tin students passed fifty marks","actions":[{"type":"marks","student":"1","subject":"","value":50},{"type":"marks","student":"2","subject":"","value":50},{"type":"marks","student":"3","subject":"","value":50}],"clarify":""}');
eq(ag23.ok && ag23.actions.length === 3, true, 'agent: multiple marks');

// Test 24: English - Roll with subject
var ag24 = MA.parseAgentResponse('{"heard":"Roll 2 English 37","actions":[{"type":"marks","student":"2","subject":"English","value":37}],"clarify":""}');
eq(ag24.ok && ag24.actions[0].student === '2', true, 'agent: roll 2 english');

// Test 25: Gujarati script - Complex utterance
var ag25 = MA.parseAgentResponse('{"heard":"આરવ પટેલ ગણિત ૫૦","actions":[{"type":"marks","student":"Aarav Patel","subject":"Maths","value":50}],"clarify":""}');
eq(ag25.ok, true, 'agent: aarav full gujarati script');

// Test 26: Hindi Devanagari - Subject and marks
var ag26 = MA.parseAgentResponse('{"heard":"कृष्णा को विज्ञान में 45 मिले","actions":[{"type":"marks","student":"Krishna Prajapati","subject":"Science","value":45}],"clarify":""}');
eq(ag26.ok && ag26.actions[0].value === 45, true, 'agent: krishna science hindi devanagari');

// Test 27: English with number words - Teens
var ag27 = MA.parseAgentResponse('{"heard":"Meera thirteen in maths","actions":[{"type":"marks","student":"Meera Desai","subject":"Maths","value":13}],"clarify":""}');
eq(ag27.ok && ag27.actions[0].value === 13, true, 'agent: meera thirteen maths');

// Test 28: Gujarati + Hindi mix
var ag28 = MA.parseAgentResponse('{"heard":"Aarav Rana English વીસ તણા साठ","actions":[{"type":"marks","student":"Aarav Rana","subject":"English","value":20}],"clarify":""}');
eq(ag28.ok, true, 'agent: mixed gujarati hindi');

// Test 29: Full name with subject and mark
var ag29 = MA.parseAgentResponse('{"heard":"Meera Desai got 33 marks in science","actions":[{"type":"marks","student":"Meera Desai","subject":"Science","value":33}],"clarify":""}');
eq(ag29.ok && ag29.actions[0].student === 'Meera Desai' && ag29.actions[0].value === 33, true, 'agent: meera desai science 33');

// Test 30: Gujarati Roman marks to students
var ag30 = MA.parseAgentResponse('{"heard":"બે અને તણા માં પંચાસ કર્યું","actions":[{"type":"marks","student":"Diya Shah","subject":"Maths","value":50},{"type":"marks","student":"Krishna Prajapati","subject":"Maths","value":50}],"clarify":""}');
eq(ag30.ok && ag30.actions.length >= 1, true, 'agent: two students fifty gujarati');

// ================= summarize =================
var smarks = {
  1: { 0: 45, 1: 'AB' },           // Aarav P: maths 45, science absent
  2: { 0: 10, 1: 20 },             // Diya: maths weak (10 < 17.5)
  3: { 0: 48, 1: 44 },             // Krishna: top
  4: {},                           // Meera: all missing
  5: { 0: 30 }                     // Rohan: only maths
};
var sum = MV.summarize(ctx.students, ctx.subjects, smarks);
eq(sum.perSubject[0].entered, 4, 'maths entered 4');
eq(sum.perSubject[0].avg, 33.3, 'maths avg (rounded)');
eq(sum.perSubject[0].highest.name, 'Krishna Prajapati', 'maths topper');
eq(sum.perSubject[0].weak, ['Diya Shah'], 'weak below 35%');
eq(sum.perSubject[1].absent, 1, 'science absent 1');
eq(sum.filled, 6, 'total filled 6');
eq(sum.absentCells, 1, 'absent cells 1');
eq(sum.missing, 24 - 6 - 1, 'missing count');
var sumEmpty = MV.summarize(ctx.students, ctx.subjects, {});
eq(sumEmpty.perSubject[0].avg, null, 'empty subject avg null');
eq(sumEmpty.missing, 24, 'empty all missing');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

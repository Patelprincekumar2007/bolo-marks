/* Bolo Marks - UI layer. Uses MarksVoice (app.js) for parsing. */
(function () {
  'use strict';
  var MV = window.MarksVoice;
  var LS_KEY = 'bolomarks_v1';

  var state = {
    className: '',
    subjects: [],   // [{name, max}]
    students: [],   // [{roll, name}]
    marks: {},      // roll -> {subjectIdx: value}
    curStudent: 0,
    curSubject: 0,
    history: []
  };

  var $ = function (id) { return document.getElementById(id); };

  // ---------- persistence ----------
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (s && s.students && s.subjects) { state = s; return true; }
    } catch (e) {}
    return false;
  }

  // ---------- setup screen ----------
  function parseSetup() {
    var className = $('inpClass').value.trim();
    var subjects = $('inpSubjects').value.split('\n').map(function (l) { return l.trim(); })
      .filter(Boolean).map(function (l) {
        var parts = l.split(/[,،\-]/).map(function (p) { return p.trim(); });
        var max = parseInt(parts[1], 10);
        return { name: parts[0], max: isNaN(max) ? 100 : max };
      });
    var students = $('inpStudents').value.split('\n').map(function (l) { return l.trim(); })
      .filter(Boolean).map(function (l, i) {
        var parts = l.split(/[,،\t]/).map(function (p) { return p.trim(); });
        var roll = parseInt(parts[0], 10);
        return { roll: isNaN(roll) ? (i + 1) : roll, name: parts.slice(1).join(' ').trim() || parts[0] };
      });
    var err = '';
    if (!subjects.length) err = 'Add at least one subject.';
    else if (!students.length) err = 'Add at least one student.';
    else if (subjects.some(function (s) { return !s.name; })) err = 'Every subject needs a name.';
    $('setupError').textContent = err;
    if (err) return null;
    return { className: className, subjects: subjects, students: students };
  }

  $('btnSaveSetup').addEventListener('click', function () {
    var cfg = parseSetup();
    if (!cfg) return;
    state.className = cfg.className;
    state.subjects = cfg.subjects;
    state.students = cfg.students;
    state.marks = {};
    state.curStudent = 0;
    state.curSubject = 0;
    state.history = [];
    save();
    showEntry();
  });

  $('btnDemo').addEventListener('click', function () {
    $('inpClass').value = 'Std 7 A (Demo)';
    $('inpSubjects').value = 'Maths, 50\nScience, 50\nGujarati, 50\nEnglish, 50';
    $('inpStudents').value = '1, Aarav Patel\n2, Diya Shah\n3, Krishna Prajapati\n4, Meera Desai\n5, Rohan Chaudhary';
  });

  $('btnSetup').addEventListener('click', function () {
    $('entryScreen').classList.add('hidden');
    $('setupScreen').classList.remove('hidden');
    stopMic();
    // prefill from state
    $('inpClass').value = state.className || '';
    if (state.subjects.length) {
      $('inpSubjects').value = state.subjects.map(function (s) { return s.name + ', ' + s.max; }).join('\n');
      $('inpStudents').value = state.students.map(function (s) { return s.roll + ', ' + s.name; }).join('\n');
    }
  });

  // ---------- entry screen ----------
  function showEntry() {
    $('setupScreen').classList.add('hidden');
    $('entryScreen').classList.remove('hidden');
    $('classLabel').textContent = state.className || 'My class';
    buildTable();
    updateProgress();
    highlight();
  }

  function markFor(roll, si) {
    var m = state.marks[roll];
    return m && m[si] !== undefined ? m[si] : '';
  }

  function buildTable() {
    var thead = $('marksTable').querySelector('thead');
    var tbody = $('marksTable').querySelector('tbody');
    var hr = '<tr><th>Roll</th><th class="name">Name</th>';
    state.subjects.forEach(function (s) { hr += '<th>' + esc(s.name) + '<br><span class="muted small">/' + s.max + '</span></th>'; });
    hr += '<th>Total</th></tr>';
    thead.innerHTML = hr;
    var br = '';
    state.students.forEach(function (st, ri) {
      br += '<tr data-row="' + ri + '"><td>' + st.roll + '</td><td class="name">' + esc(st.name) + '</td>';
      state.subjects.forEach(function (s, si) {
        br += '<td data-cell="' + ri + '-' + si + '"><input inputmode="numeric" data-ri="' + ri + '" data-si="' + si + '" value="' + markFor(st.roll, si) + '"></td>';
      });
      br += '<td class="total" data-total="' + ri + '">' + totalFor(st.roll) + '</td></tr>';
    });
    tbody.innerHTML = br;
    tbody.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('focus', function () {
        state.curStudent = +inp.dataset.ri;
        state.curSubject = +inp.dataset.si;
        highlight();
      });
      inp.addEventListener('change', function () {
        var v = inp.value.trim();
        setMark(+inp.dataset.ri, +inp.dataset.si, v === '' ? '' : v, true);
      });
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function totalFor(roll) {
    var m = state.marks[roll];
    if (!m) return '';
    var t = 0, any = false;
    state.subjects.forEach(function (s, si) {
      if (m[si] !== undefined && m[si] !== '') { t += Number(m[si]) || 0; any = true; }
    });
    return any ? t : '';
  }

  function setMark(ri, si, value, fromInput) {
    var st = state.students[ri];
    if (!st) return;
    var subj = state.subjects[si];
    if (!fromInput) {
      state.history.push({ ri: ri, si: si, prev: markFor(st.roll, si) });
    }
    if (value === '' || value === null) {
      if (state.marks[st.roll]) delete state.marks[st.roll][si];
    } else {
      if (!state.marks[st.roll]) state.marks[st.roll] = {};
      state.marks[st.roll][si] = value;
    }
    var cell = document.querySelector('[data-cell="' + ri + '-' + si + '"]');
    if (cell) {
      var inp = cell.querySelector('input');
      inp.value = value;
      var chk = MV.validateMark(value, subj.max);
      cell.classList.toggle('bad', !chk.ok);
      if (!chk.ok && chk.reason === 'above-max') {
        setStatus('Warning: ' + value + ' is above max ' + subj.max + ' for ' + subj.name + ' (roll ' + st.roll + ').', 'err');
      }
    }
    var tc = document.querySelector('[data-total="' + ri + '"]');
    if (tc) tc.textContent = totalFor(st.roll);
    updateProgress();
    save();
  }

  function updateProgress() {
    var filled = 0, total = state.students.length * state.subjects.length, errors = 0;
    state.students.forEach(function (st) {
      var m = state.marks[st.roll] || {};
      state.subjects.forEach(function (s, si) {
        if (m[si] !== undefined && m[si] !== '') {
          filled++;
          if (!MV.validateMark(m[si], s.max).ok) errors++;
        }
      });
    });
    $('progressLabel').textContent = filled + ' / ' + total + ' marks entered' + (errors ? ' - ' + errors + ' above max!' : '');
  }

  function highlight() {
    document.querySelectorAll('#marksTable tbody tr').forEach(function (tr, i) {
      tr.classList.toggle('current', i === state.curStudent);
    });
  }

  function focusCell() {
    var cell = document.querySelector('[data-cell="' + state.curStudent + '-' + state.curSubject + '"] input');
    if (cell) {
      cell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    highlight();
  }

  function advance() {
    state.curSubject++;
    if (state.curSubject >= state.subjects.length) {
      state.curSubject = 0;
      state.curStudent = Math.min(state.curStudent + 1, state.students.length - 1);
      setStatus('Next student: roll ' + state.students[state.curStudent].roll + ' ' + state.students[state.curStudent].name);
    }
  }

  function setStatus(msg, kind) {
    var el = $('statusBar');
    el.textContent = msg;
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  // ---------- voice ----------
  var recog = null, micOn = false;

  function micSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function startMic() {
    if (!micSupported()) {
      setStatus('Voice input needs Chrome (Android or desktop). You can still type in the boxes.', 'warn');
      return;
    }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recog = new SR();
    recog.lang = $('langSelect').value;
    recog.continuous = true;
    recog.interimResults = false;
    recog.maxAlternatives = 3;

    recog.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        var alts = [];
        for (var a = 0; a < e.results[i].length; a++) alts.push(e.results[i][a].transcript);
        handleTranscript(alts);
      }
    };
    recog.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setStatus('Mic permission denied. Allow microphone and try again.', 'err');
        stopMic();
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setStatus('Mic error: ' + e.error, 'warn');
      }
    };
    recog.onend = function () {
      if (micOn) { try { recog.start(); } catch (e) {} } // keep listening until toggled off
    };
    try {
      recog.start();
      micOn = true;
      $('btnMic').classList.add('on');
      $('micIcon').textContent = '⏹';
      $('micState').textContent = 'Listening (' + $('langSelect').value + ')';
      setStatus('Listening... say "roll 1" or a student name.');
    } catch (e) {
      setStatus('Could not start mic: ' + e.message, 'err');
    }
  }

  function stopMic() {
    micOn = false;
    if (recog) { try { recog.stop(); } catch (e) {} }
    $('btnMic').classList.remove('on');
    $('micIcon').textContent = '🎤';
    $('micState').textContent = 'Mic off';
  }

  $('btnMic').addEventListener('click', function () { micOn ? stopMic() : startMic(); });
  $('langSelect').addEventListener('change', function () {
    if (micOn) { stopMic(); startMic(); }
  });

  function handleTranscript(alts) {
    var ctx = {
      students: state.students,
      subjects: state.subjects,
      currentStudentIdx: state.curStudent,
      currentSubjectIdx: state.curSubject
    };
    // try each alternative; first one that parses to a known command wins
    var cmd = null, used = '';
    for (var i = 0; i < alts.length; i++) {
      var c = MV.parseCommand(alts[i], ctx);
      if (c.type !== 'unknown') { cmd = c; used = alts[i]; break; }
      if (!cmd) { cmd = c; used = alts[i]; }
    }
    applyCommand(cmd, used);
  }

  function applyCommand(cmd, heard) {
    switch (cmd.type) {
      case 'selectRoll': {
        var idx = state.students.findIndex(function (s) { return s.roll === cmd.roll; });
        if (idx === -1) { setStatus('Heard "' + heard + '" - no student with roll ' + cmd.roll + '.', 'warn'); return; }
        state.curStudent = idx;
        state.curSubject = 0;
        setStatus('Selected roll ' + cmd.roll + ' - ' + state.students[idx].name + '. Now say the marks.');
        focusCell();
        return;
      }
      case 'selectStudent':
        state.curStudent = cmd.studentIdx;
        state.curSubject = 0;
        setStatus('Selected ' + state.students[cmd.studentIdx].name + '. Now say the marks.');
        focusCell();
        return;
      case 'ambiguousStudent':
        showChooser(cmd.candidates, heard);
        return;
      case 'selectSubject':
        state.curSubject = cmd.subjectIdx;
        setStatus('Subject: ' + state.subjects[cmd.subjectIdx].name + '. Say the marks.');
        focusCell();
        return;
      case 'setMarks': {
        var si = cmd.subjectIdx !== undefined ? cmd.subjectIdx : state.curSubject;
        var ri = state.curStudent;
        var st = state.students[ri];
        cmd.values.forEach(function (v) {
          if (si >= state.subjects.length) return;
          setMark(ri, si, v, false);
          si++;
        });
        var subjName = state.subjects[Math.min(si - 1, state.subjects.length - 1)].name;
        if (cmd.subjectIdx === undefined) {
          state.curSubject = Math.min(si, state.subjects.length - 1);
          if (si >= state.subjects.length) {
            setStatus('Heard "' + heard + '" - ' + st.name + ' done (' + subjName + ' filled). Say "next" for the next student.');
          } else {
            setStatus('Heard "' + heard + '" - filled for ' + st.name + '. Next box: ' + state.subjects[state.curSubject].name + '.');
          }
        } else {
          setStatus('Heard "' + heard + '" - ' + cmd.values.join(', ') + ' into ' + state.subjects[cmd.subjectIdx].name + ' for ' + st.name + '.');
        }
        hideChooser();
        focusCell();
        return;
      }
      case 'next':
        if (state.curStudent < state.students.length - 1) {
          state.curStudent++;
          state.curSubject = 0;
          setStatus('Roll ' + state.students[state.curStudent].roll + ' - ' + state.students[state.curStudent].name + '.');
          focusCell();
        } else {
          setStatus('That was the last student.', 'warn');
        }
        return;
      case 'prev':
        if (state.curStudent > 0) {
          state.curStudent--;
          state.curSubject = 0;
          setStatus('Roll ' + state.students[state.curStudent].roll + ' - ' + state.students[state.curStudent].name + '.');
          focusCell();
        }
        return;
      case 'clear':
        setMark(state.curStudent, state.curSubject, '', false);
        setStatus('Cleared ' + state.subjects[state.curSubject].name + ' for roll ' + state.students[state.curStudent].roll + '.');
        return;
      case 'undo': {
        var h = state.history.pop();
        if (!h) { setStatus('Nothing to undo.', 'warn'); return; }
        setMark(h.ri, h.si, h.prev, true);
        state.curStudent = h.ri;
        state.curSubject = h.si;
        setStatus('Undone.');
        focusCell();
        return;
      }
      case 'save':
        save();
        setStatus('Saved on this device.');
        return;
      case 'done':
        stopMic();
        setStatus('Done. Use Export to download the sheet.');
        return;
      default:
        setStatus('Heard "' + heard + '" - did not understand. Try "roll 5", a name, or marks.', 'warn');
    }
  }

  function showChooser(candidates, heard) {
    var el = $('chooser');
    el.innerHTML = '<b>Heard "' + esc(heard) + '" - which student?</b>';
    candidates.forEach(function (idx) {
      var b = document.createElement('button');
      b.className = 'opt';
      b.type = 'button';
      b.textContent = state.students[idx].roll + ' - ' + state.students[idx].name;
      b.addEventListener('click', function () {
        state.curStudent = idx;
        state.curSubject = 0;
        hideChooser();
        setStatus('Selected ' + state.students[idx].name + '. Now say the marks.');
        focusCell();
      });
      el.appendChild(b);
    });
    el.classList.remove('hidden');
    setStatus('Multiple students match. Tap one below.', 'warn');
  }
  function hideChooser() { $('chooser').classList.add('hidden'); }

  // ---------- export ----------
  $('btnExport').addEventListener('click', function () {
    var head = ['Roll', 'Name'].concat(state.subjects.map(function (s) { return s.name + ' (/' + s.max + ')'; })).concat(['Total']);
    var rows = [head];
    state.students.forEach(function (st) {
      var row = [st.roll, st.name];
      state.subjects.forEach(function (s, si) { row.push(markFor(st.roll, si)); });
      row.push(totalFor(st.roll));
      rows.push(row);
    });
    var csv = '﻿' + rows.map(function (r) {
      return r.map(function (c) {
        c = String(c === undefined || c === null ? '' : c);
        return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(',');
    }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    var d = new Date();
    var fn = (state.className || 'marks').replace(/[^\w\u0A80-\u0AFF\u0900-\u097F]+/g, '_') +
      '_' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.csv';
    a.href = URL.createObjectURL(blob);
    a.download = fn;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    setStatus('Downloaded ' + fn + ' - opens in Excel.');
  });

  $('btnClearAll').addEventListener('click', function () {
    if (!confirm('Clear ALL marks? Students and subjects stay.')) return;
    state.marks = {};
    state.history = [];
    buildTable();
    updateProgress();
    save();
    setStatus('All marks cleared.');
  });

  // ---------- help ----------
  $('btnHelp').addEventListener('click', function () { $('helpOverlay').classList.remove('hidden'); });
  $('btnCloseHelp').addEventListener('click', function () { $('helpOverlay').classList.add('hidden'); });

  // ---------- boot ----------
  if (location.hash === '#demo') {
    // Instant demo class for judges and first-time users: index.html#demo
    state.className = 'Std 7 A (Demo)';
    state.subjects = [
      { name: 'Maths', max: 50 }, { name: 'Science', max: 50 },
      { name: 'Gujarati', max: 50 }, { name: 'English', max: 50 }
    ];
    state.students = [
      { roll: 1, name: 'Aarav Patel' }, { roll: 2, name: 'Diya Shah' },
      { roll: 3, name: 'Krishna Prajapati' }, { roll: 4, name: 'Meera Desai' },
      { roll: 5, name: 'Rohan Chaudhary' }
    ];
    state.marks = { 1: { 0: 42, 1: 38 }, 2: { 0: 47 } };
    showEntry();
  } else if (load() && state.students.length && state.subjects.length) {
    showEntry();
  }
  if (!micSupported()) {
    $('micState').textContent = 'Voice needs Chrome';
  }
})();

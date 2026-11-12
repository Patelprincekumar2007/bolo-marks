/*
 * Bolo Marks - voice marks-entry helper for government school teachers.
 * Core voice parsing logic. Runs in the browser (window.MarksVoice) and in Node (module.exports) for tests.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MarksVoice = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Number word tables (0-100) ----------

  var EN = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100
  };

  // Hindi (roman) 0-100
  var HI_ROMAN = {
    shunya: 0, sunya: 0, ek: 1, do: 2, teen: 3, tin: 3, char: 4, chaar: 4, panch: 5, paanch: 5,
    chheh: 6, chah: 6, saat: 7, sat: 7, aath: 8, ath: 8, nau: 9, nav: 9, das: 10,
    gyarah: 11, gyara: 11, barah: 12, bara: 12, terah: 13, tera: 13, chaudah: 14, chauda: 14,
    pandrah: 15, pandra: 15, solah: 16, sola: 16, satrah: 17, satra: 17, atharah: 18, athara: 18,
    unnis: 19, unnees: 19, bees: 20, bis: 20, ikkis: 21, ikees: 21, bais: 22, baees: 22,
    teis: 23, teees: 23, chaubis: 24, chaubees: 24, pachchis: 25, pacchees: 25, pachis: 25,
    chhabbis: 26, chhabbees: 26, sattais: 27, sattaees: 27, atthais: 28, athais: 28,
    untis: 29, untees: 29, tees: 30, tis: 30, battis: 32, battees: 32, taintis: 33, taintees: 33,
    chautis: 34, chautees: 34, paintis: 35, paintees: 35, chhattis: 36, chhattees: 36,
    saitis: 37, saintees: 37, adtis: 38, adtees: 38, untalis: 39, untalees: 39, chalis: 40,
    chalees: 40, iktalis: 41, iktalees: 41, bayalis: 42, bayalees: 42, tatalis: 43, tatalees: 43,
    tetalis: 43, chavalis: 44, chavalees: 44, paintalis: 45, paintalees: 45, chhiyalis: 46,
    chhiyalees: 46, saitalis: 47, saitalees: 47, adtalis: 48, adtalees: 48, unchas: 49,
    pachas: 50, ikyavan: 51, ikyawan: 51, bavan: 52, bawan: 52, tirpan: 53, chauvan: 54,
    chauwan: 54, pachpan: 55, chhappan: 56, chappan: 56, sattavan: 57, athavan: 58,
    unsath: 59, saath: 60, sath: 60, iksath: 61, basath: 62, tirseth: 63, chaunsath: 64,
    painsath: 65, chhiyasath: 66, sarsath: 67, arsath: 68, unhattar: 69, sattar: 70,
    ikhattar: 71, bahattar: 72, tihattar: 73, chauhattar: 74, pachhattar: 75, chhihattar: 76,
    sathattar: 77, athattar: 78, unyasi: 79, assi: 80, ikyasi: 81, bayasi: 82, tirasi: 83,
    chaurasi: 84, pachasi: 85, chhiyasi: 86, satasi: 87, athasi: 88, navasi: 89, nabbe: 90,
    ikyanave: 91, banave: 92, tiranave: 93, chauranave: 94, pachanave: 95, chhianave: 96,
    satanave: 97, athanave: 98, ninanave: 99, sau: 100
  };

  // Gujarati (roman) 0-100
  var GU_ROMAN = {
    ek: 1, be: 2, tran: 3, chaar: 4, char: 4, paanch: 5, panch: 5, chha: 6, cha: 6,
    saat: 7, aath: 8, nav: 9, das: 10, agyar: 11, agiyar: 11, baar: 12, bar: 12, ter: 13,
    chaud: 14, pandr: 15, pandra: 15, sol: 16, sattar: 17, adhar: 18, oganis: 19,
    vis: 20, ekvis: 21, bavis: 22, trevis: 23, chovis: 24, panchvis: 25, chhavis: 26,
    sattavis: 27, athavis: 28, ogantis: 29, ogantris: 29, tris: 30, ektaris: 31, battis: 32,
    tetris: 33, chotris: 34, paatris: 35, patris: 35, chhatris: 36, sadtris: 37, adtris: 38,
    oganchalis: 39, chalis: 40, ektalis: 41, betalis: 42, talatalis: 43, tetadis: 43,
    chummalis: 44, pistalis: 45, chhetalis: 46, sudatalis: 47, adtalis: 48, oganchas: 49,
    oganpachas: 49, pachas: 50, ekavan: 51, ekkavan: 51, bavan: 52, tepan: 53, trepan: 53,
    chopan: 54, panchpan: 55, chhappan: 56, sattavan: 57, athavan: 58, ogansaith: 59,
    saith: 60, eksath: 61, basath: 62, tresath: 63, chosath: 64, pasath: 65, chhasath: 66,
    sadsath: 67, adsath: 68, ogansitter: 69, sitter: 70, ekoter: 71, boter: 72, toter: 73,
    chumoter: 74, panchoter: 75, chhoter: 76, satyoter: 77, athyoter: 78, oganensi: 79,
    ensi: 80, ekyasi: 81, byasi: 82, tyasi: 83, choryasi: 84, panchyasi: 85, chhyasi: 86,
    sityasi: 87, athyasi: 88, nevyasi: 89, nevu: 90, ekanu: 91, banu: 92, tranu: 93,
    choranu: 94, panchanu: 95, chhannu: 96, sattanu: 97, atthanu: 98, navvanu: 99, so: 100
  };

  // Devanagari script 0-100
  var DEVANAGARI = {
    'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'छः': 6,
    'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10, 'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14,
    'पंद्रह': 15, 'पन्द्रह': 15, 'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19,
    'बीस': 20, 'इक्कीस': 21, 'बाईस': 22, 'तेईस': 23, 'चौबीस': 24, 'पच्चीस': 25,
    'छब्बीस': 26, 'सत्ताईस': 27, 'अट्ठाईस': 28, 'उनतीस': 29, 'तीस': 30, 'इकतीस': 31,
    'बत्तीस': 32, 'तैंतीस': 33, 'चौंतीस': 34, 'पैंतीस': 35, 'छत्तीस': 36, 'सैंतीस': 37,
    'अड़तीस': 38, 'उनतालीस': 39, 'चालीस': 40, 'इकतालीस': 41, 'बयालीस': 42, 'तैंतालीस': 43,
    'चवालीस': 44, 'पैंतालीस': 45, 'छियालीस': 46, 'सैंतालीस': 47, 'अड़तालीस': 48,
    'उनचास': 49, 'पचास': 50, 'इक्यावन': 51, 'बावन': 52, 'तिरपन': 53, 'चौवन': 54,
    'पचपन': 55, 'छप्पन': 56, 'सत्तावन': 57, 'अट्ठावन': 58, 'उनसठ': 59, 'साठ': 60,
    'इकसठ': 61, 'बासठ': 62, 'तिरसठ': 63, 'चौंसठ': 64, 'पैंसठ': 65, 'छियासठ': 66,
    'सड़सठ': 67, 'अड़सठ': 68, 'उनहत्तर': 69, 'सत्तर': 70, 'इकहत्तर': 71, 'बहत्तर': 72,
    'तिहत्तर': 73, 'चौहत्तर': 74, 'पचहत्तर': 75, 'छिहत्तर': 76, 'सतहत्तर': 77,
    'अठहत्तर': 78, 'उन्यासी': 79, 'अस्सी': 80, 'इक्यासी': 81, 'बयासी': 82, 'तिरासी': 83,
    'चौरासी': 84, 'पचासी': 85, 'छियासी': 86, 'सत्तासी': 87, 'अट्ठासी': 88, 'नवासी': 89,
    'नब्बे': 90, 'इक्यानवे': 91, 'बानवे': 92, 'तिरानवे': 93, 'चौरानवे': 94, 'पचानवे': 95,
    'छियानवे': 96, 'सत्तानवे': 97, 'अट्ठानवे': 98, 'निन्यानवे': 99, 'सौ': 100
  };

  // Gujarati script 0-100
  var GUJARATI_SCRIPT = {
    'શૂન્ય': 0, 'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5, 'છ': 6, 'છઃ': 6,
    'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10, 'અગિયાર': 11, 'અગ્યાર': 11, 'બાર': 12,
    'તેર': 13, 'ચૌદ': 14, 'પંદર': 15, 'સોળ': 16, 'સત્તર': 17, 'અઢાર': 18, 'અધાર': 18,
    'ઓગણીસ': 19, 'ઓગણિસ': 19, 'વીસ': 20, 'એકવીસ': 21, 'બાવીસ': 22, 'ત્રેવીસ': 23,
    'ચોવીસ': 24, 'પચ્ચીસ': 25, 'છવ્વીસ': 26, 'સત્તાવીસ': 27, 'અઠ્ઠાવીસ': 28,
    'ઓગણત્રીસ': 29, 'ત્રીસ': 30, 'એકત્રીસ': 31, 'બત્રીસ': 32, 'તેત્રીસ': 33,
    'ચોત્રીસ': 34, 'પાત્રીસ': 35, 'છત્રીસ': 36, 'સાડત્રીસ': 37, 'અડત્રીસ': 38,
    'ઓગણચાલીસ': 39, 'ચાલીસ': 40, 'એકતાલીસ': 41, 'બેતાલીસ': 42, 'તેતાલીસ': 43,
    'ચુમ્માલીસ': 44, 'પિસ્તાલીસ': 45, 'છેતાલીસ': 46, 'સુદતાલીસ': 47, 'અડતાલીસ': 48,
    'ઓગણપચાસ': 49, 'પચાસ': 50, 'એકાવન': 51, 'બાવન': 52, 'ત્રેપન': 53, 'ચોપન': 54,
    'પંચાવન': 55, 'છપ્પન': 56, 'સત્તાવન': 57, 'અઠ્ઠાવન': 58, 'ઓગણસાઠ': 59, 'સાઠ': 60,
    'એકસઠ': 61, 'બાસઠ': 62, 'ત્રેસઠ': 63, 'ચોસઠ': 64, 'પાસઠ': 65, 'છાસઠ': 66,
    'સાડસઠ': 67, 'અડસઠ': 68, 'ઓગણસિત્તેર': 69, 'સિત્તેર': 70, 'એકોતેર': 71,
    'બોતેર': 72, 'તોતેર': 73, 'ચુમોતેર': 74, 'પંચોતેર': 75, 'છોતેર': 76,
    'સત્યોતેર': 77, 'અઠ્યોતેર': 78, 'ઓગણએંસી': 79, 'એંસી': 80, 'એક્યાસી': 81,
    'બ્યાસી': 82, 'ત્યાસી': 83, 'ચોર્યાસી': 84, 'પંચ્યાસી': 85, 'છ્યાસી': 86,
    'સિત્યાસી': 87, 'અઠ્યાસી': 88, 'નેવ્યાસી': 89, 'નેવું': 90, 'એકાણું': 91,
    'બાણું': 92, 'ત્રાણું': 93, 'ચોરાણું': 94, 'પંચાણું': 95, 'છન્નું': 96,
    'સત્તાણું': 97, 'અઠ્ઠાણું': 98, 'નવ્વાણું': 99, 'સો': 100
  };

  var WORD_NUMS = {};
  [EN, HI_ROMAN, GU_ROMAN, DEVANAGARI, GUJARATI_SCRIPT].forEach(function (t) {
    Object.keys(t).forEach(function (k) { WORD_NUMS[k] = t[k]; });
  });

  // Devanagari + Gujarati digit maps to ASCII
  function toAsciiDigits(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0x0966 && c <= 0x096f) out += String(c - 0x0966);       // Devanagari
      else if (c >= 0x0ae6 && c <= 0x0aef) out += String(c - 0x0ae6); // Gujarati
      else out += s[i];
    }
    return out;
  }

  function normalizeText(s) {
    if (!s) return '';
    s = toAsciiDigits(String(s)).toLowerCase();
    // split hyphenated english numbers (twenty-five -> twenty five)
    s = s.replace(/-/g, ' ');
    // strip punctuation but keep letters of all scripts and digits and spaces
    s = s.replace(/[.,!?;:'"()\[\]{}|/\\@#$%^&*_+=<>~`]/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function tokenize(s) {
    var n = normalizeText(s);
    return n ? n.split(' ') : [];
  }

  // Convert number words to numbers. Handles English combos ("twenty five") and
  // digit tokens (including multi-digit like "78").
  function numberize(tokens) {
    var out = [];
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (/^\d+$/.test(t)) {
        out.push(parseInt(t, 10));
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(WORD_NUMS, t)) {
        var v = WORD_NUMS[t];
        // English style combination: a multiple of ten (20..90) followed by a unit (1..9)
        if (v >= 20 && v <= 90 && v % 10 === 0 && i + 1 < tokens.length) {
          var nx = tokens[i + 1];
          var nv = Object.prototype.hasOwnProperty.call(WORD_NUMS, nx) ? WORD_NUMS[nx] : null;
          if (nv !== null && nv >= 1 && nv <= 9) {
            out.push(v + nv);
            i++;
            continue;
          }
        }
        out.push(v);
        continue;
      }
      out.push(t);
    }
    return out;
  }

  var FILLERS = {
    marks: 1, mark: 1, 'માર્ક્સ': 1, 'ગુણ': 1, 'गुण': 1, 'मार्क्स': 1,
    ane: 1, ne: 1, 'અને': 1, 'ને': 1, 'और': 1,
    che: 1, chhe: 1, 'છે': 1, 'है': 1, hai: 1,
    nu: 1, 'નું': 1, 'ના': 1, na: 1, 'मा': 1, 'માં': 1,
    number: 1, 'नंबर': 1, 'નંબર': 1,
    okay: 1, ok: 1, 'हाँ': 1, please: 1
  };

  var CMD = {
    next: ['next', 'agla', 'aage', 'aagal', 'aagad', 'आगे', 'આગળ', 'आगला', 'पुढे', 'pudhe'],
    prev: ['previous', 'prev', 'back', 'pachhal', 'પાછળ', 'पीछे', 'pichhe'],
    clear: ['clear', 'delete', 'remove', 'saaf', 'saf', 'સાફ', 'हटाओ', 'hatao', 'કાઢી', 'કાઢો'],
    undo: ['undo', 'pacho', 'પાછો'],
    save: ['save', 'સેવ', 'सेव'],
    absent: ['absent', 'gairhazar', 'gair hazar', 'ગેરહાજર', 'ગેર હાજર', 'अनुपस्थित', 'गैरहाजिर'],
    done: ['done', 'finish', 'finished', 'થઈ ગયું', 'पूरा', 'pura', 'patyu', 'પત્યું', 'complete']
  };

  function isCmd(tokens, list) {
    return tokens.length > 0 && tokens.every(function (t) { return typeof t === 'string'; }) &&
      list.indexOf(tokens.join(' ')) !== -1;
  }

  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var d = [];
    for (var i = 0; i <= m; i++) { d[i] = [i]; }
    for (var j = 0; j <= n; j++) { d[0][j] = j; }
    for (j = 1; j <= n; j++) {
      for (i = 1; i <= m; i++) {
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return d[m][n];
  }

  // Match spoken text against student names. Returns {studentIdx} or {candidates:[idx,...]}
  function matchStudentName(words, students) {
    var q = words.join(' ');
    if (!q) return null;
    var scored = [];
    students.forEach(function (s, idx) {
      var name = normalizeText(s.name);
      if (!name) return;
      var best = -1;
      if (name === q) best = 100;
      else {
        var nameTokens = name.split(' ');
        words.forEach(function (w) {
          nameTokens.forEach(function (nt) {
            var score = 0;
            if (nt === w) score = 90;
            else if (nt.length >= 3 && nt.indexOf(w) === 0) score = 75;
            else if (w.length >= 3 && w.indexOf(nt) === 0) score = 70;
            else if (w.length >= 3 && nt.length >= 3) {
              var d = lev(w, nt);
              var maxLen = Math.max(w.length, nt.length);
              if (d <= (maxLen <= 4 ? 1 : 2)) score = 60 - d * 5;
            }
            if (score > best) best = score;
          });
        });
      }
      if (best > 0) scored.push({ idx: idx, score: best });
    });
    if (!scored.length) return null;
    scored.sort(function (a, b) { return b.score - a.score; });
    var top = scored[0].score;
    var tied = scored.filter(function (s) { return s.score >= top - 4; });
    if (tied.length === 1) return { studentIdx: tied[0].idx };
    // prefer unique strong match
    if (scored[0].score >= 90 && scored.length > 1 && scored[1].score < 90) {
      return { studentIdx: scored[0].idx };
    }
    return { candidates: tied.slice(0, 5).map(function (s) { return s.idx; }) };
  }

  function findSubject(word, subjects) {
    var w = normalizeText(word);
    if (!w) return -1;
    var best = -1, bestScore = 0;
    subjects.forEach(function (s, i) {
      var name = normalizeText(s.name);
      var score = 0;
      if (name === w) score = 100;
      else if (name.length >= 3 && name.indexOf(w) === 0) score = 80;
      else if (w.length >= 3 && w.indexOf(name) === 0) score = 75;
      else if (w.length >= 3 && name.length >= 3 && lev(w, name) <= 1) score = 60;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    return bestScore >= 60 ? best : -1;
  }

  /**
   * Parse one voice utterance into a command.
   * ctx: { students:[{roll,name}], subjects:[{name,max}], currentStudentIdx, currentSubjectIdx }
   * Returns {type, ...} where type is one of:
   *   selectRoll {roll} | selectStudent {studentIdx} | ambiguousStudent {candidates:[idx]}
   *   setMarks {values:[n,...], subjectIdx?} | next | prev | clear | undo | save | done | unknown
   */
  function parseCommand(text, ctx) {
    ctx = ctx || {};
    var students = ctx.students || [];
    var subjects = ctx.subjects || [];
    var rawTokens = tokenize(text);
    if (!rawTokens.length) return { type: 'unknown', text: text };

    var joined = rawTokens.join(' ');
    for (var k in CMD) {
      if (isCmd(rawTokens, CMD[k])) return { type: k };
    }

    var toks = numberize(rawTokens);

    // roll selection: "roll 5" / "roll number 5" / "રોલ 5" / "रोल नंबर 5"
    var rollIdx = -1;
    for (var i = 0; i < toks.length; i++) {
      if (toks[i] === 'roll' || toks[i] === 'રોલ' || toks[i] === 'रोल' || toks[i] === 'role') {
        rollIdx = i;
        break;
      }
    }
    if (rollIdx !== -1) {
      for (var j = rollIdx + 1; j < toks.length; j++) {
        if (typeof toks[j] === 'number') return { type: 'selectRoll', roll: toks[j] };
      }
      return { type: 'unknown', text: text };
    }

    // drop fillers
    var words = [], nums = [];
    toks.forEach(function (t) {
      if (typeof t === 'number') { nums.push(t); return; }
      if (FILLERS[t]) return;
      words.push(t);
    });

    // subject-targeted marks: "maths 78" / "ગણિત 78" / "maths ne 78"
    if (words.length && nums.length) {
      for (var w = 0; w < words.length; w++) {
        var si = findSubject(words[w], subjects);
        if (si !== -1) return { type: 'setMarks', subjectIdx: si, values: nums };
      }
    }

    // pure numbers: fill current cell and advance
    if (!words.length && nums.length) {
      return { type: 'setMarks', values: nums };
    }

    // single stray word that is a subject name: move cursor to that subject
    if (words.length && !nums.length) {
      for (var w2 = 0; w2 < words.length; w2++) {
        var si2 = findSubject(words[w2], subjects);
        if (si2 !== -1 && words.length === 1) return { type: 'selectSubject', subjectIdx: si2 };
      }
      // otherwise treat as student name
      var m = matchStudentName(words, students);
      if (m) {
        if (m.studentIdx !== undefined) return { type: 'selectStudent', studentIdx: m.studentIdx };
        return { type: 'ambiguousStudent', candidates: m.candidates };
      }
    }

    return { type: 'unknown', text: text };
  }

  // ---------- class summary / insights ----------
  // marks: { roll: { subjectIdx: value } }; value may be number, numeric string or 'AB'
  function summarize(students, subjects, marks) {
    var perSubject = subjects.map(function (sub, si) {
      var entered = 0, absent = 0, sum = 0;
      var high = null, low = null;
      var weak = [];
      students.forEach(function (st) {
        var m = marks[st.roll] || {};
        var v = m[si];
        if (v === undefined || v === '') return;
        if (String(v).toUpperCase() === 'AB') { absent++; return; }
        var n = Number(v);
        if (isNaN(n)) return;
        entered++;
        sum += n;
        if (!high || n > high.value) high = { name: st.name, value: n };
        if (!low || n < low.value) low = { name: st.name, value: n };
        if (sub.max > 0 && n < 0.35 * sub.max) weak.push(st.name);
      });
      return {
        name: sub.name, max: sub.max, entered: entered, absent: absent,
        avg: entered ? Math.round((sum / entered) * 10) / 10 : null,
        avgPct: entered && sub.max ? Math.round((sum / entered) / sub.max * 100) : null,
        highest: high, lowest: low, weak: weak
      };
    });
    var totalCells = students.length * subjects.length;
    var filled = 0, absentCells = 0;
    students.forEach(function (st) {
      var m = marks[st.roll] || {};
      subjects.forEach(function (sub, si) {
        var v = m[si];
        if (v === undefined || v === '') return;
        if (String(v).toUpperCase() === 'AB') absentCells++;
        else filled++;
      });
    });
    return {
      perSubject: perSubject,
      totalCells: totalCells,
      filled: filled,
      absentCells: absentCells,
      missing: totalCells - filled - absentCells
    };
  }

  function validateMark(value, max) {
    if (value === null || value === undefined || value === '') return { ok: true };
    if (String(value).toUpperCase() === 'AB') return { ok: true }; // absent marker
    var v = Number(value);
    if (isNaN(v)) return { ok: false, reason: 'not-a-number' };
    if (v < 0) return { ok: false, reason: 'negative' };
    if (typeof max === 'number' && max >= 0 && v > max) return { ok: false, reason: 'above-max', max: max };
    return { ok: true };
  }

  return {
    toAsciiDigits: toAsciiDigits,
    normalizeText: normalizeText,
    tokenize: tokenize,
    numberize: numberize,
    parseCommand: parseCommand,
    matchStudentName: matchStudentName,
    findSubject: findSubject,
    validateMark: validateMark,
    summarize: summarize,
    WORD_NUMS: WORD_NUMS
  };
});

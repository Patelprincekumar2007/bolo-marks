/*
 * Bolo Marks - Smart agent layer.
 * Turns a natural sentence ("Diya ne maths ma 47, Rohan absent") into validated
 * table actions via a BYOK LLM call. Runs in the browser (window.MarksAgent)
 * and in Node (module.exports) for tests. No API key is ever stored in this file.
 */
(function (root, factory) {
  if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MarksAgent = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

  // ---------- prompt ----------
  function buildAgentPrompt(ctx, transcript) {
    var students = (ctx.students || []).map(function (s) { return s.roll + ': ' + s.name; }).join('\n');
    var subjects = (ctx.subjects || []).map(function (s) { return s.name + ' (max ' + s.max + ')'; }).join(', ');
    return [
      'You are a marks-entry assistant for an Indian school teacher.',
      'The teacher says sentences in Gujarati, Hindi, English or a mix.',
      'Turn the sentence into marks-table actions.',
      '',
      'STUDENTS (roll: name):',
      students,
      '',
      'SUBJECTS: ' + subjects,
      '',
      'TEACHER SAID: "' + transcript + '"',
      '',
      'Reply with ONLY this JSON, nothing else:',
      '{',
      '  "heard": "<what you understood, in English>",',
      '  "actions": [',
      '    {"type": "marks", "student": "<exact name or roll from the list>", "subject": "<exact subject from the list>", "value": <number or "absent">}',
      '  ],',
      '  "clarify": "<one short question if anything is ambiguous, else empty string>"',
      '}',
      '',
      'Rules:',
      '- Use ONLY students and subjects from the lists above, copied exactly.',
      '- "absent", "gairhazar", "ગેરહાજર", "अनुपस्थित" mean value "absent".',
      '- If the teacher names several students or subjects, add one action per mark.',
      '- If no mark or student is clear, return empty actions and ask in "clarify".',
      '- Numbers may be spoken as words in any of the three languages.'
    ].join('\n');
  }

  // ---------- response parsing ----------
  function extractJson(text) {
    if (!text) return null;
    var t = String(text).trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    var start = t.indexOf('{');
    var end = t.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    var candidate = t.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch (e) { return null; }
  }

  function parseAgentResponse(text) {
    var j = extractJson(text);
    if (!j || typeof j !== 'object') return { ok: false, error: 'no-json' };
    var actions = Array.isArray(j.actions) ? j.actions : [];
    var clean = [];
    for (var i = 0; i < actions.length; i++) {
      var a = actions[i] || {};
      if (a.type !== 'marks') continue;
      if (!a.student) continue;
      var v = a.value;
      if (typeof v === 'string' && v.toLowerCase() === 'absent') v = 'absent';
      else {
        v = parseInt(v, 10);
        if (isNaN(v)) continue;
      }
      clean.push({ student: String(a.student), subject: a.subject ? String(a.subject) : '', value: v });
    }
    return {
      ok: true,
      actions: clean,
      clarify: typeof j.clarify === 'string' ? j.clarify.trim() : '',
      heard: typeof j.heard === 'string' ? j.heard : ''
    };
  }

  /**
   * Resolve parsed actions to concrete table operations using the app's fuzzy matchers.
   * MV = MarksVoice (app.js). Returns {ops:[{studentIdx, subjectIdx, value}], unclear:[str]}
   * value is a number or 'AB'.
   */
  function mapActions(parsed, ctx, MV) {
    var students = ctx.students || [];
    var subjects = ctx.subjects || [];
    var ops = [], unclear = [];
    (parsed.actions || []).forEach(function (a) {
      // resolve student: roll number, exact name, or fuzzy
      var sIdx = -1;
      var asNum = parseInt(a.student, 10);
      if (!isNaN(asNum) && String(asNum) === a.student.trim()) {
        sIdx = students.findIndex(function (s) { return s.roll === asNum; });
      }
      if (sIdx === -1) {
        students.forEach(function (s, i) {
          if (sIdx === -1 && MV.normalizeText(s.name) === MV.normalizeText(a.student)) sIdx = i;
        });
      }
      if (sIdx === -1) {
        var m = MV.matchStudentName(MV.tokenize(a.student), students);
        if (m && m.studentIdx !== undefined) sIdx = m.studentIdx;
        else if (m && m.candidates) {
          unclear.push('Which student: ' + m.candidates.map(function (i) { return students[i].name; }).join(' / ') + '?');
          return;
        }
      }
      if (sIdx === -1) { unclear.push('Student "' + a.student + '" not found in the list.'); return; }

      if (a.value === 'absent') {
        // absent: fill every empty subject with AB
        var filledAny = false;
        subjects.forEach(function (sub, si) {
          ops.push({ studentIdx: sIdx, subjectIdx: si, value: 'AB' });
          filledAny = true;
        });
        if (!filledAny) unclear.push('No subjects configured for absent marking.');
        return;
      }

      var subjIdx = -1;
      if (a.subject) subjIdx = MV.findSubject(a.subject, subjects);
      if (subjIdx === -1 && subjects.length === 1) subjIdx = 0;
      if (subjIdx === -1) { unclear.push('Which subject for ' + students[sIdx].name + ' (' + a.value + ')?'); return; }

      var max = subjects[subjIdx].max;
      var chk = MV.validateMark(a.value, max);
      if (!chk.ok && chk.reason === 'above-max') {
        unclear.push(a.value + ' is above max ' + max + ' for ' + subjects[subjIdx].name + ' - not written. Repeat or type to override.');
        return;
      }
      ops.push({ studentIdx: sIdx, subjectIdx: subjIdx, value: a.value });
    });
    return { ops: ops, unclear: unclear };
  }

  // ---------- network (browser only) ----------
  function genConfig(model) {
    var cfg = { temperature: 0.1, maxOutputTokens: 1024, responseMimeType: 'application/json' };
    // 2.5 models "think" by default and spend maxOutputTokens on hidden thoughts,
    // which can come back as an empty reply (finishReason MAX_TOKENS). Turn it off.
    if (model.indexOf('2.5') !== -1) cfg.thinkingConfig = { thinkingBudget: 0 };
    return cfg;
  }

  function callGemini(key, prompt, fetchImpl) {
    var doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!doFetch) return Promise.reject(new Error('no-fetch'));
    var i = 0;
    var sawQuota = false, sawEmpty = false;
    function attempt() {
      if (i >= MODELS.length) {
        if (sawQuota) return Promise.reject(new Error('quota'));
        if (sawEmpty) return Promise.reject(new Error('empty-reply'));
        return Promise.reject(new Error('no-model'));
      }
      var model = MODELS[i++];
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key);
      return doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: genConfig(model)
        })
      }).then(function (r) {
        if (r.status === 404) return attempt(); // model name not available, try next
        if (r.status === 429) { sawQuota = true; return attempt(); } // free quota over on this model, try next
        if (r.status === 400 || r.status === 403) throw new Error('bad-key');
        if (!r.ok) throw new Error('http-' + r.status);
        return r.json().then(function (j) {
          var cand = j && j.candidates && j.candidates[0];
          var parts = cand && cand.content && cand.content.parts;
          var text = parts && parts.filter(function (p) { return !p.thought; })
            .map(function (p) { return p.text || ''; }).join(' ').trim();
          if (!text) { sawEmpty = true; return attempt(); } // e.g. token budget eaten - try next model
          return text;
        });
      }, function () { throw new Error('network'); });
    }
    return attempt();
  }

  function ask(key, ctx, transcript, fetchImpl) {
    var prompt = buildAgentPrompt(ctx, transcript);
    return callGemini(key, prompt, fetchImpl).then(function (text) {
      var parsed = parseAgentResponse(text);
      if (!parsed.ok) throw new Error('bad-reply');
      return parsed;
    });
  }

  return {
    MODELS: MODELS,
    buildAgentPrompt: buildAgentPrompt,
    extractJson: extractJson,
    parseAgentResponse: parseAgentResponse,
    mapActions: mapActions,
    callGemini: callGemini,
    ask: ask
  };
});

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
  var API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

  // Preference order for ranking what ListModels returns (newest flash first).
  // Also the static fallback when ListModels itself cannot be reached.
  var MODELS = [
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ];

  // Specialist models that speak generateContent but are not plain text chat models.
  var NON_TEXT = /(tts|image|live|native-audio|transcribe|embedding|aqa|imagen|veo|robotics|computer-use)/i;

  var CACHE_KEY = 'bolomarks_agent_model_v1';

  function errWith(code, detail) {
    var e = new Error(code);
    e.detail = detail || '';
    return e;
  }

  function apiError(r) {
    return r.json().then(function (j) {
      var m = j && j.error && j.error.message;
      return 'HTTP ' + r.status + (m ? ': ' + m : '');
    }, function () { return 'HTTP ' + r.status; });
  }

  function modelBase(m) { return String(m && m.name || m || '').replace(/^models\//, ''); }

  function isTextModel(m) {
    var meths = m.supportedGenerationMethods || [];
    var b = modelBase(m);
    return meths.indexOf('generateContent') !== -1 && /^gemini/i.test(b) && !NON_TEXT.test(b);
  }

  function rankModels(list) {
    return list.slice().sort(function (a, b) {
      var ba = modelBase(a), bb = modelBase(b);
      var ia = MODELS.indexOf(ba), ib = MODELS.indexOf(bb);
      if (ia === -1) ia = 100;
      if (ib === -1) ib = 100;
      return ia - ib || (ba < bb ? -1 : 1);
    }).map(modelBase);
  }

  function cacheGet(key) {
    try {
      if (typeof localStorage === 'undefined') return null;
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return c && c.key === key && c.model ? c.model : null;
    } catch (e) { return null; }
  }

  function cacheSet(key, model) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(CACHE_KEY, JSON.stringify({ key: key, model: model }));
    } catch (e) {}
  }

  // Ask the API which models this key can actually use (new keys cannot use retired
  // 2.x/1.5 models, so a hardcoded list 404s). Ranked best-first.
  function listModels(key, doFetch) {
    return doFetch(API_BASE + '?pageSize=200&key=' + encodeURIComponent(key)).then(function (r) {
      if (r.status === 400 || r.status === 403) {
        return apiError(r).then(function (d) { throw errWith('bad-key', d); });
      }
      if (!r.ok) return apiError(r).then(function (d) { throw errWith('http-' + r.status, d); });
      return r.json();
    }, function () { throw errWith('network', 'could not reach Google'); }).then(function (j) {
      var list = (j && j.models) || [];
      var usable = rankModels(list.filter(isTextModel));
      if (!usable.length) {
        throw errWith('no-model', 'ListModels saw: ' + (list.slice(0, 5).map(modelBase).join(', ') || 'nothing'));
      }
      return usable;
    });
  }

  function genConfig(model) {
    var cfg = { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' };
    // Thinking models (2.5 and 3.x) spend maxOutputTokens on hidden thoughts and can
    // return an empty reply (finishReason MAX_TOKENS). Turn thinking off.
    if (/(2\.5|gemini-3)/.test(model)) cfg.thinkingConfig = { thinkingBudget: 0 };
    return cfg;
  }

  function postGenerate(doFetch, key, model, prompt, minimal) {
    var url = API_BASE + '/' + model + ':generateContent?key=' + encodeURIComponent(key);
    var body = { contents: [{ parts: [{ text: prompt }] }] };
    if (!minimal) body.generationConfig = genConfig(model);
    return doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  function callGemini(key, prompt, fetchImpl) {
    var doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!doFetch) return Promise.reject(errWith('no-fetch'));

    // Build the candidate model order: cached winner, then live discovery,
    // then the static list if discovery itself is unreachable.
    var candidatesP;
    var cached = cacheGet(key);
    if (cached) {
      candidatesP = Promise.resolve([cached]);
    } else {
      candidatesP = listModels(key, doFetch).then(null, function (e) {
        if (e.message === 'bad-key' || e.message === 'no-model') throw e;
        return MODELS.slice(); // discovery unreachable: try the known list
      });
    }

    return candidatesP.then(function (candidates) {
      var i = 0;
      var sawQuota = null, sawEmpty = false, sawService = null;
      function next(errCode, detail) {
        if (errCode === 'quota' && !sawQuota) sawQuota = detail;
        if (errCode === 'empty') sawEmpty = true;
        if (errCode === 'service' && !sawService) sawService = detail;
        return attempt();
      }
      function attempt() {
        if (i >= candidates.length) {
          if (cached) { // cached model stopped working: drop it and rediscover once
            cached = null;
            return listModels(key, doFetch).then(function (fresh) {
              candidates = fresh.filter(function (m) { return candidates.indexOf(m) === -1; });
              i = 0;
              if (!candidates.length) throw errWith('no-model', 'cached model gone, nothing else usable');
              return attempt();
            });
          }
          if (sawQuota) throw errWith('quota', sawQuota);
          if (sawEmpty) throw errWith('empty-reply', 'models replied with no text');
          if (sawService) throw errWith('service', sawService);
          throw errWith('no-model', 'no candidate model answered');
        }
        var model = candidates[i++];
        return postGenerate(doFetch, key, model, prompt, false).then(function (r) {
          if (r.status === 404) return apiError(r).then(function (d) { return next('service', d); });
          if (r.status === 429) return apiError(r).then(function (d) { return next('quota', d); });
          if (r.status === 403) return apiError(r).then(function (d) { throw errWith('bad-key', d); });
          if (r.status === 400) {
            return apiError(r).then(function (d) {
              if (/api.?key|key not valid|key_invalid|permission/i.test(d)) throw errWith('bad-key', d);
              // request shape rejected (e.g. unknown config field): retry bare minimum for this model
              return postGenerate(doFetch, key, model, prompt, true).then(function (r2) {
                if (!r2.ok) return apiError(r2).then(function (d2) { return next('service', d2); });
                return readText(r2, model);
              });
            });
          }
          if (!r.ok) return apiError(r).then(function (d) { return next('service', d); });
          return readText(r, model);
        }, function () { throw errWith('network', 'could not reach Google'); });
      }
      function readText(r, model) {
        return r.json().then(function (j) {
          var cand = j && j.candidates && j.candidates[0];
          var parts = cand && cand.content && cand.content.parts;
          var text = parts && parts.filter(function (p) { return !p.thought; })
            .map(function (p) { return p.text || ''; }).join(' ').trim();
          if (!text) return next('empty');
          cacheSet(key, model);
          return text;
        });
      }
      return attempt();
    });
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

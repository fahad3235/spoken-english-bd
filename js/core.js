'use strict';
/**
 * Spoken English BD — pure logic (no DOM). Node-testable.
 *
 * Quiz model: each question shows a Bangla sentence and asks for the English
 * phrase. 4 options: the correct English + 3 distractors drawn from other
 * phrases (preferably the same topic, falling back to any topic).
 * Speech check: word-overlap score between the recognised transcript and the
 * target phrase — order-insensitive, punctuation-insensitive.
 * Streak: consecutive calendar days with at least one practised phrase,
 * counted back from today (or from yesterday when today is not practised yet).
 * Daily goal: 5 phrases.
 */
const STORAGE_KEY = 'spokenEnglishBD.v1';
const DAILY_GOAL = 5;
const QUIZ_COUNT = 10;
const MAX_PHRASE_LEN = 200;

const BN_DIGITS = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };

function toBengaliDigits(v) {
  return String(v).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
}
function formatNumber(n, lang) {
  const s = String(n);
  return lang === 'bn' ? toBengaliDigits(s) : s;
}

function isNonEmptyStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Validate the bundled phrase bank. Returns an array of error strings (empty = valid). */
function validatePhraseData(phrases, topics) {
  const errs = [];
  if (!Array.isArray(phrases) || phrases.length === 0) return ['noPhrases'];
  const topicIds = new Set((topics || []).map((t) => t.id));
  const ids = new Set();
  phrases.forEach((p, i) => {
    if (!p || typeof p !== 'object') { errs.push('badEntry:' + i); return; }
    if (!isNonEmptyStr(p.id)) errs.push('missingId:' + i);
    else if (ids.has(p.id)) errs.push('dupId:' + p.id);
    else ids.add(p.id);
    if (!isNonEmptyStr(p.en)) errs.push('missingEn:' + (p.id || i));
    if (!isNonEmptyStr(p.bn)) errs.push('missingBn:' + (p.id || i));
    if (!isNonEmptyStr(p.say)) errs.push('missingSay:' + (p.id || i));
    if (p.en && p.en.length > MAX_PHRASE_LEN) errs.push('enTooLong:' + p.id);
    if (p.topic && !topicIds.has(p.topic)) errs.push('unknownTopic:' + p.id);
  });
  return errs;
}

function shuffle(arr, rng) {
  const a = arr.slice();
  const r = rng || Math.random;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/**
 * Build a quiz of `count` questions from `phrases`.
 * Each question: { phraseId, bn, say, options[4], answerIndex }.
 * Distractors prefer the same topic; falls back to any other phrase.
 */
function buildQuiz(phrases, count, rng) {
  const n = Math.min(count || QUIZ_COUNT, phrases.length);
  const picked = shuffle(phrases, rng).slice(0, n);
  return picked.map((p) => {
    const sameTopic = phrases.filter((q) => q.topic === p.topic && q.id !== p.id);
    const others = phrases.filter((q) => q.topic !== p.topic && q.id !== p.id);
    const pool = shuffle(sameTopic.concat(others), rng);
    const distractors = pool.slice(0, 3).map((q) => q.en);
    const options = shuffle([p.en].concat(distractors), rng);
    return {
      phraseId: p.id,
      bn: p.bn,
      say: p.say,
      options,
      answerIndex: options.indexOf(p.en),
    };
  });
}

function normalizeTranscript(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set(['a', 'an', 'the', 'i', 'am', 'is', 'are', 'to', 'it', 'me', 'my', 'you', 'your', 'please', 'do', 'can', 'could', 'will', 'would']);

/**
 * Word-overlap score 0..1: fraction of the target phrase's content words that
 * appear in the transcript. Order-insensitive, punctuation-insensitive.
 */
function transcriptScore(transcript, targetEn) {
  const tWords = new Set(normalizeTranscript(transcript).split(' ').filter(Boolean));
  const targetWords = normalizeTranscript(targetEn).split(' ').filter((w) => w && !STOPWORDS.has(w));
  if (targetWords.length === 0) return 0;
  const hit = targetWords.filter((w) => tWords.has(w)).length;
  return hit / targetWords.length;
}

function verdictForScore(score) {
  if (score >= 0.8) return 'great';
  if (score >= 0.5) return 'close';
  return 'again';
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function addDaysStr(key, delta) {
  const parts = key.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

/**
 * Current streak from a set/array of practised date keys (YYYY-MM-DD).
 * Counts consecutive days ending today; if today is not practised yet, ends
 * yesterday. `today` is an injectable YYYY-MM-DD key (defaults to local today).
 */
function streakDays(dateKeys, today) {
  const set = new Set(dateKeys || []);
  const todayKey = today || dateKey(new Date());
  let cursor = set.has(todayKey) ? todayKey : addDaysStr(todayKey, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDaysStr(cursor, -1);
  }
  return streak;
}

function totalPractised(sessions) {
  let total = 0;
  let gotIt = 0;
  Object.values(sessions || {}).forEach((s) => {
    total += s.practised || 0;
    gotIt += s.gotIt || 0;
  });
  return { total, gotIt };
}

/** Validate a user-added phrase. Returns error codes (empty = valid). */
function validateCustomPhrase(input, existing) {
  const errs = [];
  if (!input || typeof input !== 'object') return ['badInput'];
  if (!isNonEmptyStr(input.en)) errs.push('enMissing');
  else if (input.en.trim().length > MAX_PHRASE_LEN) errs.push('enTooLong');
  if (!isNonEmptyStr(input.bn)) errs.push('bnMissing');
  else if (input.bn.trim().length > MAX_PHRASE_LEN) errs.push('bnTooLong');
  if (isNonEmptyStr(input.en) && Array.isArray(existing)) {
    const norm = input.en.trim().toLowerCase();
    const dup = existing.some((p) => p && typeof p.en === 'string' && p.en.trim().toLowerCase() === norm);
    if (dup) errs.push('duplicateEn');
  }
  return errs;
}

function makeCustomPhrase(input, id) {
  return {
    id: id || ('u' + Date.now().toString(36)),
    topic: 'custom',
    en: input.en.trim(),
    bn: input.bn.trim(),
    say: isNonEmptyStr(input.say) ? input.say.trim() : '',
    custom: true,
  };
}

/**
 * Validate an import JSON string. Accepts a bare array of phrases or the app's
 * own export shape { app, version, exportedAt, phrases: [...] }.
 * Returns { added: [phrase, ...], rejected: [{ index, reason }] }.
 * Only custom phrases (topic 'custom' or missing topic) are importable — the
 * built-in 60 are never duplicated.
 */
function validateImport(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { added: [], rejected: [{ index: -1, reason: 'badJson' }] };
  }
  let arr = null;
  if (Array.isArray(parsed)) arr = parsed;
  else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.phrases)) arr = parsed.phrases;
  else return { added: [], rejected: [{ index: -1, reason: 'notArray' }] };

  const added = [];
  const rejected = [];
  const seen = new Set();
  arr.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object') { rejected.push({ index: i, reason: 'badEntry' }); return; }
    const errs = validateCustomPhrase(entry, added.concat([]));
    if (errs.length) { rejected.push({ index: i, reason: errs[0] }); return; }
    const norm = entry.en.trim().toLowerCase();
    if (seen.has(norm)) { rejected.push({ index: i, reason: 'duplicateEn' }); return; }
    seen.add(norm);
    added.push(makeCustomPhrase(entry, 'u' + i + '-' + Date.now().toString(36)));
  });
  return { added, rejected };
}

function buildExportJson(customPhrases) {
  return JSON.stringify({
    app: 'spoken-english-bd',
    version: 1,
    exportedAt: new Date().toISOString(),
    phrases: (customPhrases || []).map((p) => ({ en: p.en, bn: p.bn, say: p.say || '' })),
  }, null, 2);
}

const coreApi = {
  STORAGE_KEY,
  DAILY_GOAL,
  QUIZ_COUNT,
  MAX_PHRASE_LEN,
  toBengaliDigits,
  formatNumber,
  validatePhraseData,
  shuffle,
  buildQuiz,
  normalizeTranscript,
  transcriptScore,
  verdictForScore,
  dateKey,
  addDaysStr,
  streakDays,
  totalPractised,
  validateCustomPhrase,
  makeCustomPhrase,
  validateImport,
  buildExportJson,
};

if (typeof module !== 'undefined' && module.exports) module.exports = coreApi;
if (typeof window !== 'undefined') window.SpokenCore = coreApi;

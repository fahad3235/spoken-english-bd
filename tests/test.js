'use strict';
/**
 * Spoken English BD — unit tests for js/core.js + js/data.js (pure logic, no DOM).
 * Hand-computed expected values (verified by hand before writing):
 *   transcriptScore('I want one kilo of rice', 'I want one kilogram of rice'):
 *     target content words = want, one, kilogram, of, rice (5; 'i' is a stopword)
 *     transcript has want, one, of, rice (4) -> 4/5 = 0.8 -> verdict 'great'
 *   transcriptScore('hello', 'Hello, how are you?'):
 *     target content words = hello, how (2; 'are','you' are stopwords)
 *     transcript has hello (1) -> 1/2 = 0.5 -> verdict 'close'
 *   transcriptScore('', anything) = 0 -> 'again'
 *   streakDays(['2026-11-17','2026-11-16','2026-11-15'], '2026-11-17') = 3
 *   streakDays(['2026-11-16','2026-11-15'], '2026-11-17') = 2 (today missing -> from yesterday)
 *   streakDays(['2026-11-17','2026-11-15'], '2026-11-17') = 1 (gap on 16th)
 *   streakDays([], '2026-11-17') = 0
 *   addDaysStr('2026-11-01', -1) = '2026-10-31' (month boundary)
 *   toBengaliDigits('2026') = '২০২৬'
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../js/core.js');
const Data = require('../js/data.js');

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- phrase bank ----------
test('phrase bank: 60 phrases, 6 topics x 10, all valid', () => {
  assert.equal(Data.PHRASES.length, 60);
  assert.equal(Data.TOPICS.length, 6);
  assert.deepEqual(Core.validatePhraseData(Data.PHRASES, Data.TOPICS), []);
  for (const tp of Data.TOPICS) {
    assert.equal(Data.PHRASES.filter((p) => p.topic === tp.id).length, 10, tp.id);
  }
});

test('validatePhraseData: duplicate id, missing say, unknown topic detected', () => {
  const dup = Data.PHRASES.slice(0, 2);
  dup[1] = { ...dup[1], id: dup[0].id };
  assert.ok(Core.validatePhraseData(dup, Data.TOPICS).some((e) => e.startsWith('dupId:')));
  const noSay = [{ id: 'x1', topic: 'greetings', en: 'Hi.', bn: 'হাই।', say: '' }];
  assert.ok(Core.validatePhraseData(noSay, Data.TOPICS).includes('missingSay:x1'));
  const badTopic = [{ id: 'x2', topic: 'nope', en: 'Hi.', bn: 'হাই।', say: 'হাই।' }];
  assert.ok(Core.validatePhraseData(badTopic, Data.TOPICS).includes('unknownTopic:x2'));
  assert.deepEqual(Core.validatePhraseData([], Data.TOPICS), ['noPhrases']);
});

// ---------- quiz ----------
test('buildQuiz: 10 questions, 4 distinct options, answerIndex correct', () => {
  const qs = Core.buildQuiz(Data.PHRASES, 10, mulberry32(42));
  assert.equal(qs.length, 10);
  const ids = new Set();
  for (const q of qs) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4, 'options must be distinct');
    assert.ok(q.answerIndex >= 0 && q.answerIndex < 4);
    const phrase = Data.PHRASES.find((p) => p.id === q.phraseId);
    assert.ok(phrase);
    assert.equal(q.options[q.answerIndex], phrase.en);
    assert.equal(q.bn, phrase.bn);
    assert.equal(q.say, phrase.say);
    assert.ok(!ids.has(q.phraseId));
    ids.add(q.phraseId);
  }
});

test('buildQuiz: deterministic with seeded rng; count capped at bank size', () => {
  const a = Core.buildQuiz(Data.PHRASES, 10, mulberry32(7));
  const b = Core.buildQuiz(Data.PHRASES, 10, mulberry32(7));
  assert.deepEqual(a, b);
  assert.equal(Core.buildQuiz(Data.PHRASES, 999, mulberry32(7)).length, 60);
});

test('buildQuiz: single-phrase topic still yields 4 options from other topics', () => {
  const small = [
    { id: 'a', topic: 'solo', en: 'Only phrase.', bn: 'একমাত্র।', say: 'ওনলি।' },
    { id: 'b', topic: 'other', en: 'Second one.', bn: 'দ্বিতীয়।', say: 'সেকেন্ড।' },
    { id: 'c', topic: 'other', en: 'Third one.', bn: 'তৃতীয়।', say: 'থার্ড।' },
    { id: 'd', topic: 'other', en: 'Fourth one.', bn: 'চতুর্থ।', say: 'ফোর্থ।' },
    { id: 'e', topic: 'other', en: 'Fifth one.', bn: 'পঞ্চম।', say: 'ফিফথ।' },
  ];
  const qs = Core.buildQuiz(small, 1, mulberry32(3));
  assert.equal(qs.length, 1);
  assert.equal(qs[0].options.length, 4);
  assert.equal(new Set(qs[0].options).size, 4);
});

// ---------- transcript scoring ----------
test('transcriptScore: exact match is 1.0', () => {
  assert.equal(Core.transcriptScore('Hello, how are you?', 'Hello, how are you?'), 1);
  assert.equal(Core.transcriptScore('HELLO HOW ARE YOU', 'Hello, how are you?'), 1);
});

test('transcriptScore: 4 of 5 content words -> 0.8', () => {
  assert.equal(Core.transcriptScore('I want one kilo of rice', 'I want one kilogram of rice.'), 0.8);
});

test('transcriptScore: 1 of 2 content words -> 0.5', () => {
  assert.equal(Core.transcriptScore('hello', 'Hello, how are you?'), 0.5);
});

test('transcriptScore: empty or unrelated transcript is 0', () => {
  assert.equal(Core.transcriptScore('', 'Hello, how are you?'), 0);
  assert.equal(Core.transcriptScore('goodbye friend', 'How much is this?'), 0);
});

test('verdictForScore: boundaries 0.8 great, 0.5 close, below again', () => {
  assert.equal(Core.verdictForScore(1), 'great');
  assert.equal(Core.verdictForScore(0.8), 'great');
  assert.equal(Core.verdictForScore(0.79), 'close');
  assert.equal(Core.verdictForScore(0.5), 'close');
  assert.equal(Core.verdictForScore(0.49), 'again');
  assert.equal(Core.verdictForScore(0), 'again');
});

test('normalizeTranscript: strips punctuation, lowercases, collapses spaces', () => {
  assert.equal(Core.normalizeTranscript("  Hello,   WORLD! "), 'hello world');
  assert.equal(Core.normalizeTranscript("don't stop"), "don't stop");
});

// ---------- streaks ----------
test('streakDays: 3 consecutive days ending today', () => {
  assert.equal(Core.streakDays(['2026-11-17', '2026-11-16', '2026-11-15'], '2026-11-17'), 3);
});

test('streakDays: today missing, counts back from yesterday', () => {
  assert.equal(Core.streakDays(['2026-11-16', '2026-11-15'], '2026-11-17'), 2);
});

test('streakDays: gap breaks the streak', () => {
  assert.equal(Core.streakDays(['2026-11-17', '2026-11-15'], '2026-11-17'), 1);
  assert.equal(Core.streakDays(['2026-11-14'], '2026-11-17'), 0);
});

test('streakDays: empty set is 0; only today is 1', () => {
  assert.equal(Core.streakDays([], '2026-11-17'), 0);
  assert.equal(Core.streakDays(['2026-11-17'], '2026-11-17'), 1);
});

test('addDaysStr: month boundary and year boundary', () => {
  assert.equal(Core.addDaysStr('2026-11-01', -1), '2026-10-31');
  assert.equal(Core.addDaysStr('2026-01-01', -1), '2025-12-31');
  assert.equal(Core.addDaysStr('2026-11-17', 1), '2026-11-18');
});

test('totalPractised: sums practised and gotIt across sessions', () => {
  const t = Core.totalPractised({
    '2026-11-16': { practised: 5, gotIt: 4 },
    '2026-11-17': { practised: 3, gotIt: 2 },
  });
  assert.deepEqual(t, { total: 8, gotIt: 6 });
  assert.deepEqual(Core.totalPractised({}), { total: 0, gotIt: 0 });
});

// ---------- custom phrases ----------
test('validateCustomPhrase: missing fields, too long, duplicate (case-insensitive)', () => {
  assert.deepEqual(Core.validateCustomPhrase({ en: '', bn: 'বাংলা' }, []), ['enMissing']);
  assert.deepEqual(Core.validateCustomPhrase({ en: 'Hi', bn: '' }, []), ['bnMissing']);
  assert.deepEqual(Core.validateCustomPhrase({ en: 'x'.repeat(201), bn: 'বাংলা' }, []), ['enTooLong']);
  assert.deepEqual(Core.validateCustomPhrase({ en: 'Hi', bn: 'বাংলা' }, []), []);
  const dup = Core.validateCustomPhrase(
    { en: 'where is the bus stop?', bn: 'বাস স্টপ কোথায়?' },
    [{ en: 'Where is the bus stop?' }],
  );
  assert.deepEqual(dup, ['duplicateEn']);
});

test('makeCustomPhrase: trims, tags custom, keeps optional say', () => {
  const p = Core.makeCustomPhrase({ en: '  Hi there. ', bn: '  হাই। ', say: '' }, 'u1');
  assert.equal(p.id, 'u1');
  assert.equal(p.en, 'Hi there.');
  assert.equal(p.bn, 'হাই।');
  assert.equal(p.topic, 'custom');
  assert.equal(p.custom, true);
});

// ---------- import / export ----------
test('validateImport: bad JSON and non-array rejected', () => {
  assert.deepEqual(Core.validateImport('{not json').rejected, [{ index: -1, reason: 'badJson' }]);
  assert.deepEqual(Core.validateImport('{"a":1}').rejected, [{ index: -1, reason: 'notArray' }]);
  assert.deepEqual(Core.validateImport('"hello"').rejected, [{ index: -1, reason: 'notArray' }]);
});

test('validateImport: wrapped export shape accepted; mixed entries handled', () => {
  const json = JSON.stringify({
    app: 'spoken-english-bd', version: 1, exportedAt: '2026-11-17T00:00:00.000Z',
    phrases: [
      { en: 'Where is the bus stop?', bn: 'বাস স্টপ কোথায়?', say: 'হোয়্যার।' },
      { en: '', bn: 'বাংলা' },
      { en: 'Where is the bus stop?', bn: 'ডুপ্লিকেট' },
    ],
  });
  const res = Core.validateImport(json);
  assert.equal(res.added.length, 1);
  assert.equal(res.added[0].en, 'Where is the bus stop?');
  assert.equal(res.rejected.length, 2);
  assert.equal(res.rejected[0].reason, 'enMissing');
  assert.equal(res.rejected[1].reason, 'duplicateEn');
});

test('buildExportJson round-trip: export -> import restores phrases', () => {
  const mine = [Core.makeCustomPhrase({ en: 'Good luck!', bn: 'শুভ কামনা!', say: 'গুড লাক!' }, 'u9')];
  const json = Core.buildExportJson(mine);
  const parsed = JSON.parse(json);
  assert.equal(parsed.app, 'spoken-english-bd');
  assert.equal(parsed.phrases.length, 1);
  const back = Core.validateImport(json);
  assert.equal(back.added.length, 1);
  assert.equal(back.added[0].en, 'Good luck!');
  assert.equal(back.rejected.length, 0);
});

// ---------- formatting ----------
test('toBengaliDigits and formatNumber', () => {
  assert.equal(Core.toBengaliDigits('2026'), '২০২৬');
  assert.equal(Core.toBengaliDigits('5/10'), '৫/১০');
  assert.equal(Core.formatNumber(7, 'bn'), '৭');
  assert.equal(Core.formatNumber(7, 'en'), '7');
});

// ---------- constants ----------
test('constants: daily goal 5, quiz 10, storage key set', () => {
  assert.equal(Core.DAILY_GOAL, 5);
  assert.equal(Core.QUIZ_COUNT, 10);
  assert.equal(Core.STORAGE_KEY, 'spokenEnglishBD.v1');
});

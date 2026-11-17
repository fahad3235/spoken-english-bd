# Spoken English BD — Test Results

Date: 2026-11-17. All results below are from real runs on this machine; nothing is invented.

## Hand-verified expectations (checked by hand before writing tests)

| Case | Hand computation | Expected |
|---|---|---|
| transcriptScore('I want one kilo of rice', 'I want one kilogram of rice.') | target content words = want, one, kilogram, of, rice (5; 'i' is a stopword); transcript has want, one, of, rice (4) | **0.8 → 'great'** |
| transcriptScore('hello', 'Hello, how are you?') | target content words = hello, how (2; 'are','you' are stopwords); transcript has hello (1) | **0.5 → 'close'** |
| transcriptScore('', anything) | no words | **0 → 'again'** |
| streakDays(['2026-11-17','2026-11-16','2026-11-15'], '2026-11-17') | 3 consecutive days ending today | **3** |
| streakDays(['2026-11-16','2026-11-15'], '2026-11-17') | today missing → count back from yesterday | **2** |
| streakDays(['2026-11-17','2026-11-15'], '2026-11-17') | gap on 16th | **1** |
| addDaysStr('2026-11-01', -1) | month boundary | **2026-10-31** |
| toBengaliDigits('2026') | digit map | **২০২৬** |
| search 'rice' (substring) | 'p**rice**' + 'rice' both contain 'rice' | **2 cards** |
| quiz, all 10 correct | 10 questions, correct option clicked each time | **10/10, best 10/10** |

## 1. Unit tests (Node)

Command:

```bash
cd ~/workspace/muse-project-factory/builds/spoken-english-bd
node --test tests/test.js
```

Result: **24 tests, 24 pass, 0 fail** (Node v24.22.1).

Coverage: phrase bank (60 phrases, 6 topics × 10, all valid; duplicate id / missing say / unknown topic detected), quiz builder (10 questions, 4 distinct options, answerIndex correct, deterministic with seeded rng, count capped at bank size, single-phrase topic still yields 4 options), transcript scoring (exact match 1.0, 0.8 / 0.5 / 0 cases, punctuation/case normalisation), verdict boundaries (0.8 great, 0.5 close, below again), streaks (3-day, today-missing, gap, empty, only-today), date arithmetic (month + year boundaries), session totals, custom-phrase validation (missing/too-long/duplicate case-insensitive), import validation (bad JSON, non-array, wrapped export shape, mixed valid/invalid, duplicate inside import), export → import round-trip, Bengali digits, constants (daily goal 5, quiz 10).

## 2. Headless-Chrome smoke test (CDP)

Tool: cached `chromium_headless_shell-1187` at `~/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell`, driven over CDP (raw WebSocket, Node 24) by `tests/smoke.mjs`. Page loaded over `file://`.

Command:

```bash
cd ~/workspace/muse-project-factory/builds/spoken-english-bd
node tests/smoke.mjs
```

Result: **44/44 checks passed**, 0 page exceptions, 0 console errors.

Checks that passed (each verified live in the page):

- Page loads: title, `window.__app` + `window.SpokenCore` + `window.SpokenData` present, header text, 60 phrase cards, stats 60 / 0/5 / 0 / —.
- Learn: search 'kilogram' → 1 card ('I want one kilogram of rice.'); search 'rice' → 2 cards (substring: 'price' + 'rice'); Bangla search 'ধানমন্ডি' → 1 card; nonsense search → empty state; topic filter 'market' → 10 cards.
- Listen button click: no exception (speechSynthesis present in headless shell).
- Custom phrase: add 'Where is the bus stop?' → 61 cards, 'Phrase added.'; duplicate (case-insensitive) rejected with inline error; empty English rejected; stat shows 61.
- Persistence: 61 cards survive a page reload.
- Practice drill: drill card appears with progress '1 / N'; rating 'I said it ✓' → today stat 1/5, goal bar 20%, streak 1; Next → card #2. Microphone note present and explains recognition (headless shell exposes SpeechRecognition, so the supported-note variant shows).
- Quiz: all 10 questions answered correctly via the live UI → 'You scored 10 out of 10.'; best quiz shows 10/10.
- Language toggle: heading switches to 'স্পোকেন ইংলিশ বিডি'; today stat shows Bengali digits '১/৫'; toggles back to English.
- Data tab: export → import round-trip restores 1 custom phrase, 0 rejected; bad import (`{"a":1}`) rejected as `notArray`; totals show practised 1 / said well 1; erase with wrong word refused; erase with DELETE works → 60 cards, streak 0.
- Responsive: `document.documentElement.scrollWidth` = 390 at 390 px viewport and 1280 at 1280 px — no horizontal overflow at either width.

## 3. Bugs found and fixed during testing (repair cycle 1 of 2)

**Bug 1 (real, found by the smoke test): global-scope `const api` collision.** `js/data.js` and `js/core.js` both declared top-level `const api` in classic scripts, which share one global scope — `core.js` threw `SyntaxError: Identifier 'api' has already been declared`, so `window.SpokenCore` was undefined and the app never initialised (0 cards, no `window.__app`). First smoke run: 9/44 with page exceptions. **Fix:** renamed to `dataApi` in `js/data.js` and `coreApi` in `js/core.js` (both still exported the same way). After the fix: unit tests 24/24, smoke 40/44.

**Bug 2 (test-side, not the app): two wrong smoke expectations.** Search 'rice' returns 2 cards, not 1 — 'p**rice**' is a substring match, which is correct behaviour; and the headless shell *does* expose `SpeechRecognition`, so the mic note shows the supported variant, not the unsupported one. Both expectations were corrected (search 'kilogram' → 1 card; mic note asserted to explain recognition either way). After the fix: smoke 44/44. No further repair cycles needed.

## Files tested

- `index.html`, `css/style.css`, `js/app.js`, `js/core.js`, `js/data.js`, `js/i18n.js` (all present; Bengali strings in UTF-8)
- `tests/test.js`, `tests/smoke.mjs`, `README.md`, `.gitignore`

## Known limitations (not failures)

- Smoke-test profile (`/tmp/sebd-profile`) is throwaway; localStorage behaviour was verified in-page and across a reload within that profile.
- The export download itself (browser save dialog) was not exercised end-to-end in headless mode; the export *content* and the import of that content were verified exactly via `buildExportJson()` + `validateImport()`.
- Speech-recognition listening was not exercised end-to-end (no microphone in headless mode); the scoring function behind it (`transcriptScore`) is unit-tested with hand-verified values, and the app shows the honest availability note.
- Speech-synthesis audio output was not listened to; the Listen button click was verified to run without throwing.

# Spoken English BD — Speak Everyday English

Offline bilingual (English / বাংলা) spoken-English practice app for Bangladeshi learners. Listen to everyday phrases, repeat them out loud, check yourself with the microphone where your browser supports it, take a quiz, and keep a daily practice streak.

**Live site:** https://fahad3235.github.io/spoken-english-bd/
**Status:** MVP, fully offline static site (no build step, no server, no account).

## Problem

Many Bangladeshi students can read and write English but hesitate to speak it. There is no shortage of grammar apps — what is missing is a small, offline, low-pressure tool for *speaking* the sentences people actually use every day: greeting someone, bargaining in the bazar, telling a rickshaw-wala where to go, answering a phone call.

## Features

1. **Phrase library — 60 everyday phrases in 6 topics** (Greetings & Polite, Market & Shopping, Rickshaw & Transport, Classroom & Office, Phone Calls, Help & Emergencies). Each phrase has the English sentence, the Bangla meaning, and a Bangla-script pronunciation hint (labelled approximate).
2. **Listen** — hear any phrase read aloud via the browser's speech synthesis (tap 🔊 Listen).
3. **Shadowing drill** — listen, then say the phrase out loud. Rate yourself honestly (I said it ✓ / Try again), or use the **microphone check** (🎤 Say it) where the browser supports speech recognition: it scores your words against the target phrase (≥80% = excellent, ≥50% = close). Daily goal: 5 phrases, with a progress bar.
4. **Bangla → English quiz** — 10 questions per round, 4 options each, instant feedback, best score saved.
5. **Daily streak & progress** — consecutive-day streak, total phrases practised, best quiz score, all stored in your browser (localStorage).
6. **My phrases** — add your own English + Bangla phrases (with optional pronunciation hint), delete them, export them as JSON, import them back. Strict import validation rejects bad JSON, non-lists, and invalid entries individually.
7. **EN / বাংলা toggle** — full UI translation, persisted; Bengali digits in Bangla mode. Responsive down to 390 px.

## Honesty notes

- Pronunciation hints are approximate guides, not phonetic transcriptions — listen to the audio and repeat.
- The microphone check uses your browser's speech-recognition service. In Chrome it may need internet; if recognition is unavailable the app says so and self-rating still works. Everything else works fully offline.
- This is a practice tool, not a teacher and not exam preparation. No fluency score is claimed anywhere.
- Emergency number shown in the footer (999) is Bangladesh's national emergency number.

## Stack

- Vanilla HTML + CSS + JavaScript, no dependencies, no build step, no network requests by design.
- `js/data.js` — the 60-phrase bank (UMD: browser global + Node require).
- `js/core.js` — pure logic: quiz builder, transcript word-overlap scoring, streak math, custom-phrase + import validation, export builder (UMD, Node-tested).
- `js/i18n.js` — all UI strings in English + Bengali.
- `js/app.js` — DOM/UI layer, speech synthesis + recognition wiring, localStorage persistence.

## Run locally

```bash
# Any static server, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000
# or just open index.html directly in a browser.
```

## Tests

```bash
# Node unit tests (pure logic + phrase-bank validation)
node --test tests/test.js
# Headless-Chrome smoke test (raw CDP, cached headless_shell-1187)
node tests/smoke.mjs
```

Results (2026-11-17, this machine): **24/24 unit tests pass, 44/44 headless-Chrome smoke checks pass, 0 console/page errors.** See [TEST_RESULTS.md](TEST_RESULTS.md) for the hand-verified numbers and the two bugs found and fixed during testing.

## Project structure

```
index.html          — page shell, 4 tabs (Learn / Practice / Quiz / Progress & Data)
css/style.css       — mobile-first styles, no framework
js/data.js          — 60 phrases, 6 topics
js/core.js          — quiz, scoring, streaks, validation, export (pure logic)
js/i18n.js          — English + Bengali UI strings
js/app.js           — UI wiring, speech, localStorage
tests/test.js       — Node unit tests
tests/smoke.mjs     — headless-Chrome smoke test (CDP)
```

## Limitations

- Speech recognition quality and availability depend on the browser and device; on some browsers it is absent entirely. The app degrades gracefully to self-rating.
- Speech-synthesis voices depend on the device; the app picks the default English voice and does not bundle any audio.
- Quiz distractors are drawn from the same 60-phrase bank, so repeat rounds will reuse phrases.
- Data lives only in the browser's localStorage on one device; there is no account or sync. Export JSON to back up your own phrases.

## License

MIT — see the repository. Built by the MUSE Project Factory (run #368, 2026-11-17).

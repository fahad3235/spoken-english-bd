'use strict';
/**
 * Spoken English BD — headless-Chrome smoke test (raw CDP, no deps).
 * Drives the cached headless_shell-1187 over file:// and asserts live behaviour.
 * Usage: node tests/smoke.mjs
 * Requires: ~/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SHELL = path.join(os.homedir(), '.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const PROFILE = '/tmp/sebd-profile';
const PAGE_URL = 'file://' + path.resolve(import.meta.dirname, '..', 'index.html');
const PORT = 9334;

let passed = 0;
let failed = 0;
const failures = [];
const consoleErrors = [];
const pageExceptions = [];

function check(name, cond, extra) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; failures.push(name + (extra ? ' — ' + extra : '')); console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

async function main() {
  if (!fs.existsSync(SHELL)) throw new Error('headless_shell not found at ' + SHELL);
  fs.rmSync(PROFILE, { recursive: true, force: true });
  const chrome = spawn(SHELL, [
    '--headless', '--no-sandbox', '--disable-gpu',
    '--user-data-dir=' + PROFILE,
    '--remote-debugging-port=' + PORT,
    'about:blank',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 40 && !wsUrl; i++) {
    await sleep(250);
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      const j = await res.json();
      wsUrl = j.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
  }
  if (!wsUrl) throw new Error('CDP did not come up');

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let msgId = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) rej(new Error(JSON.stringify(m.error)));
      else res(m.result);
    } else if (m.method) {
      for (const fn of listeners) fn(m);
    }
  };
  function send(method, params) {
    return new Promise((res, rej) => {
      const id = ++msgId;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  async function evaljs(expression) {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result ? r.result.value : undefined;
  }
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      pageExceptions.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
      consoleErrors.push(m.params.type + ': ' + (m.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 200));
    }
  });

  try {
    // Use the default page target from /json/list
    const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
    const page = list.find((t) => t.type === 'page');
    const pageWs = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { pageWs.onopen = res; pageWs.onerror = rej; });
    let pId = 0;
    const pPending = new Map();
    pageWs.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pPending.has(m.id)) {
        const { res, rej } = pPending.get(m.id);
        pPending.delete(m.id);
        if (m.error) rej(new Error(JSON.stringify(m.error)));
        else res(m.result);
      } else if (m.method) {
        for (const fn of listeners) fn(m);
      }
    };
    const psend = (method, params) => new Promise((res, rej) => {
      const id = ++pId;
      pPending.set(id, { res, rej });
      pageWs.send(JSON.stringify({ id, method, params: params || {} }));
    });
    const peval = async (expression) => {
      const r = await psend('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
      return r.result ? r.result.value : undefined;
    };

    await psend('Page.enable');
    await psend('Runtime.enable');
    await psend('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await psend('Page.navigate', { url: PAGE_URL });
    await sleep(1200);

    console.log('== load ==');
    check('title', await peval('document.title') === 'Spoken English BD — Speak Everyday English');
    check('window.__app present', await peval('!!window.__app && !!window.SpokenCore && !!window.SpokenData'));
    check('header text', (await peval(`document.querySelector('h1').textContent`)) === 'Spoken English BD');
    check('60 phrase cards render', (await peval(`document.querySelectorAll('.phrase-card').length`)) === 60);
    check('stat phrases = 60', (await peval(`document.getElementById('statPhrases').textContent`)) === '60');
    check('stat today = 0/5', (await peval(`document.getElementById('statToday').textContent`)) === '0/5');
    check('stat streak = 0', (await peval(`document.getElementById('statStreak').textContent`)) === '0');
    check('stat best = —', (await peval(`document.getElementById('statBestQuiz').textContent`)) === '—');

    console.log('== learn: search + filter ==');
    check('search "kilogram" -> 1 card', await peval(`
      (() => { const i = document.getElementById('searchInput'); i.value = 'kilogram';
        i.dispatchEvent(new Event('input', { bubbles: true }));
        return document.querySelectorAll('.phrase-card').length; })()` ) === 1);
    check('search "kilogram" shows rice phrase', (await peval(`document.querySelector('.phrase-en').textContent`)) === 'I want one kilogram of rice.');
    check('search "rice" -> 2 cards (substring: price + rice)', await peval(`
      (() => { const i = document.getElementById('searchInput'); i.value = 'rice';
        i.dispatchEvent(new Event('input', { bubbles: true }));
        return document.querySelectorAll('.phrase-card').length; })()` ) === 2);
    check('search Bangla "ধানমন্ডি" -> 1 card', await peval(`
      (() => { const i = document.getElementById('searchInput'); i.value = 'ধানমন্ডি';
        i.dispatchEvent(new Event('input', { bubbles: true }));
        return document.querySelectorAll('.phrase-card').length; })()` ) === 1);
    check('search nonsense -> empty state', await peval(`
      (() => { const i = document.getElementById('searchInput'); i.value = 'zzzqqq';
        i.dispatchEvent(new Event('input', { bubbles: true }));
        return !!document.querySelector('.empty'); })()` ) === true);
    check('topic filter market -> 10 cards', await peval(`
      (() => { const i = document.getElementById('searchInput'); i.value = '';
        i.dispatchEvent(new Event('input', { bubbles: true }));
        const s = document.getElementById('topicFilter'); s.value = 'market';
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return document.querySelectorAll('.phrase-card').length; })()` ) === 10);
    await peval(`(() => { const s = document.getElementById('topicFilter'); s.value = 'all';
      s.dispatchEvent(new Event('change', { bubbles: true })); })()`);

    console.log('== learn: listen button does not throw ==');
    check('listen click no exception', await peval(`
      (() => { document.querySelector('.phrase-card .btn-small').click(); return true; })()` ) === true);

    console.log('== custom phrase add ==');
    check('add custom phrase -> 61 cards', await peval(`
      (() => {
        document.getElementById('addEn').value = 'Where is the bus stop?';
        document.getElementById('addBn').value = 'বাস স্টপ কোথায়?';
        document.getElementById('addSay').value = 'হোয়্যার ইজ দ্য বাস স্টপ?';
        document.getElementById('addPhraseBtn').click();
        return document.querySelectorAll('.phrase-card').length; })()` ) === 61);
    check('add message shown', (await peval(`document.getElementById('addMsg').textContent`)) === 'Phrase added.');
    check('duplicate custom phrase rejected', await peval(`
      (() => {
        document.getElementById('addEn').value = 'where is the bus stop?';
        document.getElementById('addBn').value = 'বাস স্টপ কোথায়?';
        document.getElementById('addPhraseBtn').click();
        return document.getElementById('addMsg').textContent; })()` ) === 'That English phrase is already in your list.');
    check('empty English rejected', await peval(`
      (() => {
        document.getElementById('addEn').value = '';
        document.getElementById('addBn').value = 'বাংলা';
        document.getElementById('addPhraseBtn').click();
        return document.getElementById('addMsg').textContent; })()` ) === 'Enter the English phrase.');
    check('stat phrases = 61 after add', (await peval(`document.getElementById('statPhrases').textContent`)) === '61');

    console.log('== persistence across reload ==');
    await psend('Page.reload', { ignoreCache: true });
    await sleep(1000);
    check('61 cards survive reload', (await peval(`document.querySelectorAll('.phrase-card').length`)) === 61);

    console.log('== practice drill ==');
    const micNoteText = await peval(`document.getElementById('micNote').textContent`);
    check('mic note explains recognition (supported or unsupported)', micNoteText.length > 20 && /speech recognition/i.test(micNoteText), micNoteText);
    await peval(`window.__app.showTab('practice'); document.getElementById('startDrillBtn').click();`);
    await sleep(300);
    check('drill card appears', (await peval(`!!document.querySelector('.drill-card')`)) === true);
    check('drill progress 1/N', (await peval(`document.querySelector('.drill-progress').textContent`)).includes('/'));
    await peval(`
      (() => { const btns = [...document.querySelectorAll('.drill-card .btn-row .btn')];
        btns.find(b => b.textContent.includes('I said it')).click(); })()`);
    await sleep(200);
    check('today stat 1/5 after rating', (await peval(`document.getElementById('statToday').textContent`)) === '1/5');
    check('goal bar 20%', (await peval(`document.getElementById('goalBar').style.width`)) === '20%');
    check('streak 1 after first practice day', (await peval(`document.getElementById('statStreak').textContent`)) === '1');
    await peval(`
      (() => { const rows = document.querySelectorAll('.drill-card .btn-row');
        rows[rows.length - 1].querySelector('.btn').click(); })()`);
    await sleep(300);
    check('next drill card is #2', (await peval(`document.querySelector('.drill-progress').textContent`)).startsWith('2 /'));

    console.log('== quiz ==');
    const quizScore = await peval(`
      (async () => {
        window.__app.showTab('quiz');
        document.getElementById('startQuizBtn').click();
        await new Promise(r => setTimeout(r, 200));
        for (let q = 0; q < 10; q++) {
          const bn = document.querySelector('.quiz-bn').textContent;
          const phrase = window.__app.Data.PHRASES.find(p => p.bn === bn)
            || window.__app.state.customPhrases.find(p => p.bn === bn);
          const opts = [...document.querySelectorAll('.quiz-option')];
          opts.find(b => b.textContent === phrase.en).click();
          await new Promise(r => setTimeout(r, 100));
          const card = document.querySelector('.quiz-card');
          const next = [...card.querySelectorAll('.btn')].pop();
          next.click();
          await new Promise(r => setTimeout(r, 150));
        }
        return document.querySelector('.quiz-card h3').textContent;
      })()`);
    check('quiz 10/10 when all correct', quizScore === 'You scored 10 out of 10.', quizScore);
    check('best quiz shows 10/10', (await peval(`document.getElementById('statBestQuiz').textContent`)) === '10/10');

    console.log('== language toggle ==');
    await peval(`window.__app.showTab('learn'); document.getElementById('langToggle').click();`);
    await sleep(200);
    check('heading switches to Bengali', (await peval(`document.querySelector('h1').textContent`)) === 'স্পোকেন ইংলিশ বিডি');
    check('today stat shows Bengali digits', (await peval(`document.getElementById('statToday').textContent`)) === '১/৫');
    await peval(`document.getElementById('langToggle').click();`);
    await sleep(200);
    check('heading back to English', (await peval(`document.querySelector('h1').textContent`)) === 'Spoken English BD');

    console.log('== data tab: export/import/erase ==');
    const exportJson = await peval(`window.__app.Core.buildExportJson(window.__app.state.customPhrases)`);
    const importRes = await peval(`
      (() => { const r = window.__app.Core.validateImport(${JSON.stringify(exportJson)});
        return r.added.length + '/' + r.rejected.length; })()`);
    check('export -> import round-trip 1/0', importRes === '1/0', importRes);
    check('bad import rejected', await peval(`
      (() => { const r = window.__app.Core.validateImport('{"a":1}'); return r.rejected[0].reason; })()` ) === 'notArray');
    await peval(`window.__app.showTab('data');`);
    check('data tab totals: practised 1, said well 1', await peval(`
      document.getElementById('dataTotal').textContent === '1' &&
      document.getElementById('dataGotIt').textContent === '1'`) === true);
    check('erase with wrong word refused', await peval(`
      (() => { document.getElementById('eraseInput').value = 'delete';
        document.getElementById('eraseBtn').click();
        return document.getElementById('eraseMsg').textContent; })()` ) === 'Type DELETE exactly to erase.');
    check('erase with DELETE works', await peval(`
      (() => { document.getElementById('eraseInput').value = 'DELETE';
        document.getElementById('eraseBtn').click();
        return document.getElementById('eraseMsg').textContent; })()` ) === 'Your data was erased.');
    check('60 cards after erase (custom gone)', (await peval(`document.querySelectorAll('.phrase-card').length`)) === 60);
    check('streak reset to 0 after erase', (await peval(`document.getElementById('statStreak').textContent`)) === '0');

    console.log('== responsive ==');
    await psend('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(400);
    const sw390 = await peval(`document.documentElement.scrollWidth`);
    check('no horizontal overflow at 390px', sw390 <= 390, 'scrollWidth=' + sw390);
    await psend('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(300);
    const sw1280 = await peval(`document.documentElement.scrollWidth`);
    check('no horizontal overflow at 1280px', sw1280 <= 1280, 'scrollWidth=' + sw1280);

    console.log('== errors ==');
    check('zero page exceptions', pageExceptions.length === 0, pageExceptions.join(' | '));
    check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));

    pageWs.close();
  } finally {
    ws.close();
    chrome.kill('SIGKILL');
  }

  console.log(`\nSMOKE: ${passed} passed, ${failed} failed`);
  if (failed) { console.log('FAILURES:'); failures.forEach((f) => console.log(' - ' + f)); process.exit(1); }
}

main().catch((e) => { console.error('SMOKE RUNNER ERROR:', e); process.exit(2); });

'use strict';
/* Spoken English BD — DOM/UI layer. All math/validation lives in js/core.js. */
(function () {
  const Core = window.SpokenCore;
  const Data = window.SpokenData;
  const STRINGS = window.I18N_STRINGS;

  const state = {
    lang: 'en',
    customPhrases: [],
    sessions: {}, // { 'YYYY-MM-DD': { practised, gotIt } }
    bestQuiz: null, // { score, total }
    quizHistory: [],
  };

  // ---------- storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(Core.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.lang === 'bn' || parsed.lang === 'en') state.lang = parsed.lang;
        if (Array.isArray(parsed.customPhrases)) state.customPhrases = parsed.customPhrases;
        if (parsed.sessions && typeof parsed.sessions === 'object') state.sessions = parsed.sessions;
        if (parsed.bestQuiz && typeof parsed.bestQuiz === 'object') state.bestQuiz = parsed.bestQuiz;
        if (Array.isArray(parsed.quizHistory)) state.quizHistory = parsed.quizHistory;
      }
    } catch (e) { /* corrupted storage: start fresh */ }
  }
  function save() {
    try {
      localStorage.setItem(Core.STORAGE_KEY, JSON.stringify({
        lang: state.lang,
        customPhrases: state.customPhrases,
        sessions: state.sessions,
        bestQuiz: state.bestQuiz,
        quizHistory: state.quizHistory,
      }));
    } catch (e) { /* storage full/blocked: app still works in-memory */ }
  }

  const $ = (id) => document.getElementById(id);
  function allPhrases() { return Data.PHRASES.concat(state.customPhrases); }
  function topicName(id, lang) {
    if (id === 'custom') return lang === 'bn' ? 'আমার বাক্য' : 'My phrases';
    const t = Data.TOPICS.find((x) => x.id === id);
    return t ? (lang === 'bn' ? t.bn : t.en) : id;
  }

  function renderTopicFilter() {
    const tf = $('topicFilter');
    const current = tf.value || 'all';
    tf.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = t('filterAll');
    tf.appendChild(allOpt);
    Data.TOPICS.forEach((tp) => {
      const o = document.createElement('option');
      o.value = tp.id;
      o.textContent = state.lang === 'bn' ? tp.bn : tp.en;
      tf.appendChild(o);
    });
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = state.lang === 'bn' ? 'আমার বাক্য' : 'My phrases';
    tf.appendChild(customOpt);
    tf.value = current;
  }

  // ---------- i18n ----------
  function t(key, vars) {
    const dict = STRINGS[state.lang] || STRINGS.en;
    let s = dict[key] !== undefined ? dict[key] : (STRINGS.en[key] || key);
    if (vars) {
      for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
    }
    return s;
  }
  function applyI18n() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    $('langToggle').textContent = t('langButton');
    renderTopicFilter();
    renderDashboard();
    renderLearn();
    renderPracticeIntro();
    renderQuizIntro();
    renderData();
  }

  // ---------- speech ----------
  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) return false;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function recognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  // ---------- dashboard ----------
  function todayPractised() {
    const s = state.sessions[Core.dateKey(new Date())];
    return s ? (s.practised || 0) : 0;
  }
  function renderDashboard() {
    const totals = Core.totalPractised(state.sessions);
    $('statPhrases').textContent = Core.formatNumber(allPhrases().length, state.lang);
    $('statToday').textContent = Core.formatNumber(todayPractised(), state.lang) + '/' + Core.formatNumber(Core.DAILY_GOAL, state.lang);
    $('statStreak').textContent = Core.formatNumber(Core.streakDays(Object.keys(state.sessions), Core.dateKey(new Date())), state.lang);
    $('statBestQuiz').textContent = state.bestQuiz
      ? Core.formatNumber(state.bestQuiz.score, state.lang) + '/' + Core.formatNumber(state.bestQuiz.total, state.lang)
      : '—';
    $('goalBar').style.width = Math.min(100, (todayPractised() / Core.DAILY_GOAL) * 100) + '%';
    $('goalText').textContent = todayPractised() >= Core.DAILY_GOAL ? t('goalDone') : t('goalLabel');
    void totals;
  }

  // ---------- tabs ----------
  function showTab(name) {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + name));
  }

  // ---------- Learn tab ----------
  function renderLearn() {
    const q = ($('searchInput').value || '').trim().toLowerCase();
    const topic = $('topicFilter').value;
    const list = $('phraseList');
    list.innerHTML = '';
    const shown = allPhrases().filter((p) => {
      if (topic !== 'all' && p.topic !== topic) return false;
      if (!q) return true;
      return p.en.toLowerCase().includes(q) || p.bn.includes(q) || (p.say || '').includes(q);
    });
    if (shown.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = t('noResults');
      list.appendChild(empty);
      return;
    }
    shown.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'phrase-card';
      card.dataset.phraseId = p.id;
      const en = document.createElement('p');
      en.className = 'phrase-en';
      en.textContent = p.en;
      const bn = document.createElement('p');
      bn.className = 'phrase-bn';
      bn.textContent = p.bn;
      card.appendChild(en);
      card.appendChild(bn);
      if (p.say) {
        const say = document.createElement('p');
        say.className = 'phrase-say';
        say.textContent = t('sayHint') + ': ' + p.say;
        card.appendChild(say);
      }
      const meta = document.createElement('div');
      meta.className = 'phrase-meta';
      const tag = document.createElement('span');
      tag.className = 'topic-tag';
      tag.textContent = topicName(p.topic, state.lang);
      meta.appendChild(tag);
      if (p.custom) {
        const badge = document.createElement('span');
        badge.className = 'topic-tag custom-tag';
        badge.textContent = t('customBadge');
        meta.appendChild(badge);
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-small btn-danger';
        del.textContent = t('deleteBtn');
        del.addEventListener('click', () => {
          if (!window.confirm(t('deleteConfirm'))) return;
          state.customPhrases = state.customPhrases.filter((x) => x.id !== p.id);
          save();
          renderDashboard();
          renderLearn();
          renderData();
        });
        meta.appendChild(del);
      }
      const listen = document.createElement('button');
      listen.type = 'button';
      listen.className = 'btn btn-small';
      listen.textContent = '🔊 ' + t('listenBtn');
      listen.addEventListener('click', () => speak(p.en));
      meta.appendChild(listen);
      card.appendChild(meta);
      list.appendChild(card);
    });
  }

  // ---------- Practice tab ----------
  const drill = { active: false, queue: [], index: 0, practised: 0, gotIt: 0, rated: false, recog: null };
  function renderPracticeIntro() {
    $('practiceIntro').textContent = t('practiceIntro');
    $('micNote').textContent = recognitionCtor() ? t('micNote') : t('micUnsupported');
    const sel = $('drillTopic');
    const current = sel.value || 'all';
    sel.innerHTML = '';
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = t('practiceAllTopics');
    sel.appendChild(all);
    Data.TOPICS.forEach((tp) => {
      const o = document.createElement('option');
      o.value = tp.id;
      o.textContent = state.lang === 'bn' ? tp.bn : tp.en;
      sel.appendChild(o);
    });
    const custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = state.lang === 'bn' ? 'আমার বাক্য' : 'My phrases';
    sel.appendChild(custom);
    sel.value = current;
  }
  function startDrill() {
    const topic = $('drillTopic').value;
    const pool = topic === 'all' ? allPhrases() : allPhrases().filter((p) => p.topic === topic);
    if (pool.length === 0) {
      $('drillArea').innerHTML = '<p class="empty">' + t('drillEmpty') + '</p>';
      return;
    }
    drill.active = true;
    drill.queue = Core.shuffle(pool);
    drill.index = 0;
    drill.practised = 0;
    drill.gotIt = 0;
    showDrillCard();
  }
  function showDrillCard() {
    drill.rated = false;
    const p = drill.queue[drill.index];
    const area = $('drillArea');
    area.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'drill-card';
    card.dataset.phraseId = p.id;
    const prog = document.createElement('p');
    prog.className = 'drill-progress';
    prog.textContent = Core.formatNumber(drill.index + 1, state.lang) + ' / ' + Core.formatNumber(drill.queue.length, state.lang);
    const en = document.createElement('p');
    en.className = 'drill-en';
    en.textContent = p.en;
    const bn = document.createElement('p');
    bn.className = 'drill-bn';
    bn.textContent = p.bn;
    card.appendChild(prog);
    card.appendChild(en);
    card.appendChild(bn);
    if (p.say) {
      const say = document.createElement('p');
      say.className = 'phrase-say';
      say.textContent = t('sayHint') + ': ' + p.say;
      card.appendChild(say);
    }
    const row = document.createElement('div');
    row.className = 'btn-row';
    const listen = document.createElement('button');
    listen.type = 'button';
    listen.className = 'btn';
    listen.textContent = '🔊 ' + t('listenBtn');
    listen.addEventListener('click', () => speak(p.en));
    row.appendChild(listen);
    const sayBtn = document.createElement('button');
    sayBtn.type = 'button';
    sayBtn.className = 'btn';
    sayBtn.textContent = '🎤 ' + t('sayItBtn');
    sayBtn.addEventListener('click', () => runMicCheck(p, card));
    row.appendChild(sayBtn);
    card.appendChild(row);
    const micResult = document.createElement('p');
    micResult.className = 'mic-result';
    micResult.id = 'micResult';
    card.appendChild(micResult);
    const rateRow = document.createElement('div');
    rateRow.className = 'btn-row';
    const gotIt = document.createElement('button');
    gotIt.type = 'button';
    gotIt.className = 'btn btn-primary';
    gotIt.textContent = t('gotItBtn');
    gotIt.addEventListener('click', () => rateCard(true, card));
    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn';
    again.textContent = t('tryAgainBtn');
    again.addEventListener('click', () => rateCard(false, card));
    rateRow.appendChild(gotIt);
    rateRow.appendChild(again);
    card.appendChild(rateRow);
    const navRow = document.createElement('div');
    navRow.className = 'btn-row';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn';
    next.textContent = drill.index + 1 >= drill.queue.length ? t('finishPractice') : t('nextPhrase');
    next.addEventListener('click', () => {
      if (drill.index + 1 >= drill.queue.length) finishDrill();
      else { drill.index++; showDrillCard(); }
    });
    navRow.appendChild(next);
    card.appendChild(navRow);
    area.appendChild(card);
  }
  function rateCard(gotIt, card) {
    if (drill.rated) return;
    drill.rated = true;
    drill.practised++;
    if (gotIt) drill.gotIt++;
    recordSession(drill.practised, drill.gotIt, true);
    card.querySelectorAll('.btn-row .btn').forEach((b) => { b.disabled = true; });
    // keep Next enabled
    const rows = card.querySelectorAll('.btn-row');
    if (rows.length) rows[rows.length - 1].querySelectorAll('.btn').forEach((b) => { b.disabled = false; });
  }
  function recordSession(practisedDelta, gotItDelta, replace) {
    // recordSession is called with cumulative drill totals; store incrementally
    const key = Core.dateKey(new Date());
    if (!state.sessions[key]) state.sessions[key] = { practised: 0, gotIt: 0 };
    if (replace) {
      // drill totals are cumulative within the session; recompute from stored baseline
      const base = state.sessions[key]._drillBase || { practised: state.sessions[key].practised, gotIt: state.sessions[key].gotIt };
      state.sessions[key]._drillBase = base;
      state.sessions[key].practised = base.practised + practisedDelta;
      state.sessions[key].gotIt = base.gotIt + gotItDelta;
    } else {
      state.sessions[key].practised += practisedDelta;
      state.sessions[key].gotIt += gotItDelta;
    }
    save();
    renderDashboard();
    renderData();
  }
  function finishDrill() {
    drill.active = false;
    const area = $('drillArea');
    area.innerHTML = '';
    const done = document.createElement('div');
    done.className = 'drill-card';
    const h = document.createElement('h3');
    h.textContent = t('sessionDone');
    const p = document.createElement('p');
    p.textContent = t('sessionSummary', { practised: drill.practised, gotIt: drill.gotIt });
    done.appendChild(h);
    done.appendChild(p);
    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn btn-primary';
    again.textContent = t('startPractice');
    again.addEventListener('click', startDrill);
    done.appendChild(again);
    area.appendChild(done);
    // clear drill baseline markers
    const key = Core.dateKey(new Date());
    if (state.sessions[key]) delete state.sessions[key]._drillBase;
    save();
  }
  function runMicCheck(p, card) {
    const Ctor = recognitionCtor();
    const out = card.querySelector('#micResult');
    if (!Ctor) {
      out.textContent = t('micUnsupported');
      return;
    }
    if (drill.recog) { try { drill.recog.stop(); } catch (e) {} }
    const recog = new Ctor();
    drill.recog = recog;
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    out.textContent = t('micListening');
    recog.onresult = (ev) => {
      const heard = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : '';
      const score = Core.transcriptScore(heard, p.en);
      const verdict = Core.verdictForScore(score);
      out.textContent = t('micHeard') + ' "' + heard + '" — ' + t(verdict === 'great' ? 'micGreat' : verdict === 'close' ? 'micClose' : 'micAgain');
      if (!drill.rated) {
        drill.rated = true;
        drill.practised++;
        if (verdict === 'great') drill.gotIt++;
        recordSession(drill.practised, drill.gotIt, true);
      }
    };
    recog.onerror = () => { out.textContent = t('micError'); };
    recog.onend = () => { drill.recog = null; };
    try { recog.start(); } catch (e) { out.textContent = t('micError'); }
  }

  // ---------- Quiz tab ----------
  const quiz = { active: false, questions: [], index: 0, score: 0, answered: false };
  function renderQuizIntro() {
    $('quizIntro').textContent = t('quizIntro');
    $('quizBest').textContent = state.bestQuiz ? t('quizBest', { score: state.bestQuiz.score, total: state.bestQuiz.total }) : '';
  }
  function startQuiz() {
    quiz.active = true;
    quiz.questions = Core.buildQuiz(allPhrases(), Core.QUIZ_COUNT);
    quiz.index = 0;
    quiz.score = 0;
    showQuizQuestion();
  }
  function showQuizQuestion() {
    quiz.answered = false;
    const q = quiz.questions[quiz.index];
    const area = $('quizArea');
    area.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'quiz-card';
    const prog = document.createElement('p');
    prog.className = 'drill-progress';
    prog.textContent = t('quizQuestion', { n: quiz.index + 1, total: quiz.questions.length });
    const ask = document.createElement('p');
    ask.className = 'quiz-ask';
    ask.textContent = t('quizPick');
    const bn = document.createElement('p');
    bn.className = 'drill-bn quiz-bn';
    bn.textContent = q.bn;
    const say = document.createElement('p');
    say.className = 'phrase-say';
    say.textContent = t('sayHint') + ': ' + q.say;
    card.appendChild(prog);
    card.appendChild(ask);
    card.appendChild(bn);
    card.appendChild(say);
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => answerQuiz(i, card));
      card.appendChild(btn);
    });
    area.appendChild(card);
  }
  function answerQuiz(i, card) {
    if (quiz.answered) return;
    quiz.answered = true;
    const q = quiz.questions[quiz.index];
    const correct = i === q.answerIndex;
    if (correct) quiz.score++;
    card.querySelectorAll('.quiz-option').forEach((b, bi) => {
      b.disabled = true;
      if (bi === q.answerIndex) b.classList.add('correct');
      else if (bi === i) b.classList.add('wrong');
    });
    const fb = document.createElement('p');
    fb.className = 'quiz-feedback';
    fb.textContent = correct ? t('quizCorrect') : t('quizWrong') + ' ' + q.options[q.answerIndex];
    card.appendChild(fb);
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn-primary';
    next.textContent = quiz.index + 1 >= quiz.questions.length ? t('quizFinish') : t('quizNext');
    next.addEventListener('click', () => {
      if (quiz.index + 1 >= quiz.questions.length) finishQuiz();
      else { quiz.index++; showQuizQuestion(); }
    });
    card.appendChild(next);
  }
  function finishQuiz() {
    quiz.active = false;
    const total = quiz.questions.length;
    const score = quiz.score;
    if (!state.bestQuiz || score > state.bestQuiz.score) state.bestQuiz = { score, total };
    state.quizHistory.push({ date: Core.dateKey(new Date()), score, total });
    save();
    renderDashboard();
    renderQuizIntro();
    renderData();
    const area = $('quizArea');
    area.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'quiz-card';
    const h = document.createElement('h3');
    h.textContent = t('quizResult', { score, total });
    const best = document.createElement('p');
    best.textContent = t('quizBest', { score: state.bestQuiz.score, total: state.bestQuiz.total });
    card.appendChild(h);
    card.appendChild(best);
    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn btn-primary';
    again.textContent = t('quizAgain');
    again.addEventListener('click', startQuiz);
    card.appendChild(again);
    area.appendChild(card);
  }

  // ---------- Data tab ----------
  function renderData() {
    const totals = Core.totalPractised(state.sessions);
    $('dataTotal').textContent = Core.formatNumber(totals.total, state.lang);
    $('dataGotIt').textContent = Core.formatNumber(totals.gotIt, state.lang);
    $('dataStreak').textContent = Core.formatNumber(Core.streakDays(Object.keys(state.sessions), Core.dateKey(new Date())), state.lang);
    $('dataBest').textContent = state.bestQuiz
      ? Core.formatNumber(state.bestQuiz.score, state.lang) + '/' + Core.formatNumber(state.bestQuiz.total, state.lang)
      : '—';
    $('dataCustomCount').textContent = Core.formatNumber(state.customPhrases.length, state.lang);
  }
  function exportData() {
    const json = Core.buildExportJson(state.customPhrases);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'spoken-english-bd-my-phrases.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const res = Core.validateImport(String(reader.result || ''));
      if (res.added.length === 0 && res.rejected.length === 1 && res.rejected[0].index === -1) {
        $('importMsg').textContent = t('dataImportBad', { reason: t('reason' + capitalize(res.rejected[0].reason)) });
        return;
      }
      state.customPhrases = state.customPhrases.concat(res.added);
      save();
      renderDashboard();
      renderLearn();
      renderData();
      $('importMsg').textContent = t('dataImportOk', { added: res.added.length, rejected: res.rejected.length });
    };
    reader.readAsText(file);
  }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function eraseData() {
    const v = $('eraseInput').value.trim();
    if (v !== 'DELETE') {
      $('eraseMsg').textContent = t('dataEraseWrong');
      return;
    }
    state.customPhrases = [];
    state.sessions = {};
    state.bestQuiz = null;
    state.quizHistory = [];
    save();
    $('eraseInput').value = '';
    $('eraseMsg').textContent = t('dataErased');
    renderDashboard();
    renderLearn();
    renderQuizIntro();
    renderData();
  }

  // ---------- add phrase form ----------
  function addPhrase() {
    const input = {
      en: $('addEn').value,
      bn: $('addBn').value,
      say: $('addSay').value,
    };
    const errs = Core.validateCustomPhrase(input, allPhrases());
    const msg = $('addMsg');
    if (errs.length) {
      const map = { enMissing: 'errEnMissing', bnMissing: 'errBnMissing', enTooLong: 'errEnTooLong', bnTooLong: 'errBnTooLong', duplicateEn: 'errDuplicateEn' };
      msg.textContent = t(map[errs[0]] || 'errEnMissing');
      return;
    }
    state.customPhrases.push(Core.makeCustomPhrase(input));
    save();
    $('addEn').value = '';
    $('addBn').value = '';
    $('addSay').value = '';
    msg.textContent = t('addOk');
    renderDashboard();
    renderLearn();
    renderData();
  }

  // ---------- init ----------
  function init() {
    load();
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.addEventListener('click', () => showTab(b.dataset.tab));
    });
    $('langToggle').addEventListener('click', () => {
      state.lang = state.lang === 'en' ? 'bn' : 'en';
      save();
      applyI18n();
    });
    $('searchInput').addEventListener('input', renderLearn);
    $('topicFilter').addEventListener('change', renderLearn);
    $('startDrillBtn').addEventListener('click', startDrill);
    $('startQuizBtn').addEventListener('click', startQuiz);
    $('addPhraseBtn').addEventListener('click', addPhrase);
    $('exportBtn').addEventListener('click', exportData);
    $('importFile').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
      e.target.value = '';
    });
    $('eraseBtn').addEventListener('click', eraseData);
    applyI18n();
    showTab('learn');
    window.__app = {
      state, Core, Data,
      allPhrases, showTab, startDrill, startQuiz, addPhrase, eraseData,
      renderLearn, renderDashboard,
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

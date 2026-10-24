(function () {
  'use strict';

  const PW = window.PartWriting;
  const $ = (sel) => document.querySelector(sel);
  const SETTINGS_KEY = 'pwd-settings-v1';
  const STATS_KEY = 'pwd-stats-v1';

  // Scale degrees use a digit and a combining circumflex. CSS draws the caret.
  const deg = (text) => text.replace(/(\d)̂/g, '<span class="deg">$1</span>');
  const plainDeg = (text) => text.replace(/(\d)̂/g, '^$1');

  // Matches a Roman numeral that stands alone in text (V7, vii°6, I6, iv): base and inversion figure.
  const RN = /(^|[\s(])((?:vii|iii|ii|iv|vi|VII|III|II|IV|VI|V|I|v|i)°?)(\d*)(?=$|[\s),.;:→])/g;
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const rn = (text) => text.replace(RN, (_, pre, base, fig) =>
    `${pre}<span class="rnum">${base}${fig ? `<sup>${fig}</sup>` : ''}</span>`);
  const plainRn = (text) => text.replace(RN, (_, pre, base, fig) =>
    pre + base + [...fig].map((d) => SUP[d]).join(''));

  // `notation` returns HTML. `plainNotation` returns text for select options and tooltips.
  const notation = (text) => deg(rn(text));
  const plainNotation = (text) => plainDeg(plainRn(text));

  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    },
  };

  // All pages on the same origin share saved data. On GitHub Pages, this includes all project sites of the account.
  // Validate the data before use.
  const COUNTS = [4, 6, 8];
  const MODES = ['both', 'major', 'minor'];
  const RULE_IDS = PW.RULES.map((r) => r.id);

  function loadSettings() {
    const saved = store.get(SETTINGS_KEY, {});
    const rules = Array.isArray(saved.rules) ? saved.rules.map(Number).filter((id) => RULE_IDS.includes(id)) : [];
    return {
      count: COUNTS.includes(Number(saved.count)) ? Number(saved.count) : 4,
      mode: MODES.includes(saved.mode) ? saved.mode : 'both',
      rn: saved.rn !== false,
      rules: rules.length ? [...new Set(rules)] : RULE_IDS.slice(),
    };
  }

  function loadStats() {
    const saved = store.get(STATS_KEY, {});
    const out = {};
    RULE_IDS.forEach((id) => {
      const s = saved[id] || {};
      const seen = Math.floor(Number(s.seen));
      const correct = Math.floor(Number(s.correct));
      if (seen > 0 && seen < 1e9) {
        out[id] = { seen, correct: correct >= 0 ? Math.min(correct, seen) : 0 };
      }
    });
    return out;
  }

  const settings = loadSettings();
  let ruleStats = loadStats();
  const session = { correct: 0, total: 0, streak: 0 };
  let measures = [];   // generated measures
  let state = [];      // per measure: { tries, done, firstCorrect }

  // ---------- options (chips, as in EarCraft) ----------

  // Chips are <button> elements. aria-pressed shows the selection to keyboard and screen-reader users.
  function setChip(chip, on) {
    chip.classList.toggle('selected', on);
    chip.setAttribute('aria-pressed', String(on));
  }
  function selectChip(row, value) {
    row.querySelectorAll('.chip').forEach((c) => setChip(c, c.dataset.value === String(value)));
  }
  function initSingle(row, onChange) {
    row.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || chip.classList.contains('selected')) return;
      selectChip(row, chip.dataset.value);
      onChange(chip.dataset.value);
    });
  }

  // Rules grouped by category, in display order.
  const byCategory = PW.CATEGORIES.map((name, ci) => ({ name, rules: PW.RULES.filter((r) => r.category === ci) }));

  const ruleChips = $('#rule-chips');
  byCategory.forEach((cat) => {
    const label = document.createElement('div');
    label.className = 'chip-category';
    label.textContent = cat.name;
    const row = document.createElement('div');
    row.className = 'chip-row';
    cat.rules.forEach((r) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.value = r.id;
      chip.title = plainNotation(r.text);
      chip.innerHTML = `${r.num}. ${notation(r.short)}`;
      row.appendChild(chip);
    });
    ruleChips.append(label, row);
  });
  const minorOnly = PW.RULES.filter((r) => PW.MINOR_ONLY[r.id]).map((r) => r.num);
  $('#minor-only-hint').textContent =
    `Rules ${minorOnly.join(' and ')} only occur in minor keys, so they're skipped with Major keys.`;
  ruleChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const selected = ruleChips.querySelectorAll('.chip.selected');
    if (chip.classList.contains('selected') && selected.length === 1) return; // Keep at least one rule selected.
    setChip(chip, !chip.classList.contains('selected'));
    saveSettings();
  });

  selectChip($('#count'), settings.count);
  selectChip($('#mode'), settings.mode);
  setChip($('#show .chip'), settings.rn);
  ruleChips.querySelectorAll('.chip').forEach((c) => setChip(c, settings.rules.includes(Number(c.dataset.value))));

  initSingle($('#count'), (v) => { settings.count = Number(v); newExercise(); });
  initSingle($('#mode'), (v) => { settings.mode = v; newExercise(); });
  $('#show .chip').addEventListener('click', (e) => {
    settings.rn = !settings.rn;
    setChip(e.currentTarget, settings.rn);
    saveSettings();
    measures.forEach((_, i) => drawStaff(i));
  });

  $('#rule-list').innerHTML = byCategory.map((cat) =>
    `<h3 class="rule-category">${cat.name}</h3><ol class="rule-list" start="${cat.rules[0].num}">` +
    cat.rules.map((r) => `<li><b>${notation(r.short)}.</b> ${notation(r.text)}</li>`).join('') + '</ol>').join('');

  function usableRules() {
    return settings.rules.filter((id) => settings.mode !== 'major' || !PW.MINOR_ONLY[id]);
  }

  function saveSettings() {
    settings.rules = [...ruleChips.querySelectorAll('.chip.selected')].map((c) => Number(c.dataset.value));
    store.set(SETTINGS_KEY, settings);
    ruleChips.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('off', settings.mode === 'major' && !!PW.MINOR_ONLY[c.dataset.value]);
    });
    $('#rule-count').textContent = `(${usableRules().length} of ${PW.RULES.length})`;
  }

  // ---------- exercise ----------

  function newExercise() {
    saveSettings();
    stopAudio();
    const rules = usableRules();
    if (!rules.length) {
      $('#measures').innerHTML = '<div class="card muted">Pick at least one rule that fits the chosen keys.</div>';
      measures = [];
      updateProgress();
      return;
    }
    measures = PW.generateExercise(settings.count, settings.mode, rules);
    state = measures.map(() => ({ tries: 0, done: false, firstCorrect: false }));
    renderAll();
  }

  function ruleOptions() {
    return '<option value="">Which rule is broken?</option>' +
      byCategory.map((cat) => `<optgroup label="${cat.name}">` +
        cat.rules.map((r) => `<option value="${r.id}">${r.num}. ${plainNotation(r.short)}</option>`).join('') +
        '</optgroup>').join('');
  }

  function cardEl(i) { return document.querySelector(`.measure[data-i="${i}"]`); }

  function drawStaff(i) {
    const box = cardEl(i).querySelector('.staff-box');
    Staff.render(box, measures[i], { romanNumerals: settings.rn });
    if (state[i].done) Staff.mark(box, measures[i].violation.notes, 'bad');
  }

  function renderAll() {
    const grid = $('#measures');
    grid.innerHTML = '';
    measures.forEach((m, i) => {
      const card = document.createElement('article');
      card.className = 'card measure';
      card.dataset.i = i;
      card.innerHTML = `
        <div class="measure-head">
          <span class="num">${i + 1}</span>
          <span class="key">${PW.keyName(m.key)}</span>
          <button class="btn btn-secondary play" type="button" aria-label="Play measure ${i + 1}">▶ Play</button>
        </div>
        <div class="staff-box"></div>
        <div class="answer-row">
          <select aria-label="Rule broken in measure ${i + 1}">${ruleOptions()}</select>
          <button class="btn btn-primary check" type="button">Check</button>
        </div>
        <div class="feedback" aria-live="polite"></div>
        <button class="link-btn reveal" type="button">Show answer</button>`;
      card.querySelector('.play').addEventListener('click', () => play([i]));
      card.querySelector('.check').addEventListener('click', () => check(i));
      card.querySelector('.reveal').addEventListener('click', () => reveal(i, false));
      card.querySelector('select').addEventListener('change', () => {
        const fb = card.querySelector('.feedback');
        if (!state[i].done) { fb.className = 'feedback'; fb.textContent = ''; }
      });
      grid.appendChild(card);
      drawStaff(i);
    });
    updateProgress();
  }

  // Only the first answer, or Show answer, counts for the score.
  function score(rule, correct) {
    const s = ruleStats[rule] || { seen: 0, correct: 0 };
    s.seen++;
    if (correct) s.correct++;
    ruleStats[rule] = s;
    store.set(STATS_KEY, ruleStats);
    session.total++;
    if (correct) { session.correct++; session.streak++; } else session.streak = 0;
    renderStats();
  }

  function check(i) {
    const st = state[i];
    if (st.done) return;
    const card = cardEl(i);
    const value = Number(card.querySelector('select').value);
    const fb = card.querySelector('.feedback');
    if (!value) {
      fb.className = 'feedback bad';
      fb.textContent = 'Choose a rule first.';
      return;
    }
    const m = measures[i];
    st.tries++;
    if (value === m.rule) {
      if (st.tries === 1) { st.firstCorrect = true; score(m.rule, true); }
      reveal(i, true);
    } else {
      if (st.tries === 1) score(m.rule, false);
      fb.className = 'feedback bad';
      fb.textContent = `Not rule ${PW.ruleById(value).num}. Look again and try another rule.`;
    }
  }

  function reveal(i, correct) {
    const st = state[i];
    const m = measures[i];
    const card = cardEl(i);
    if (!correct && st.tries === 0) score(m.rule, false);
    st.done = true;
    card.classList.add(correct ? 'correct' : 'revealed');
    card.querySelector('select').value = String(m.rule);
    card.querySelector('select').disabled = true;
    card.querySelector('.check').disabled = true;
    card.querySelector('.reveal').hidden = true;
    Staff.mark(card.querySelector('.staff-box'), m.violation.notes, 'bad');
    const rule = PW.ruleById(m.rule);
    const fb = card.querySelector('.feedback');
    fb.className = 'feedback ' + (correct ? 'good' : 'bad');
    fb.innerHTML = `<strong>${correct ? '✓ Correct' : 'Answer'}: rule ${rule.num}, ${notation(rule.short)}</strong>` +
      `<span class="why">${notation(m.violation.msg)}</span>`;
    updateProgress();
  }

  function updateProgress() {
    const left = state.filter((s) => !s.done).length;
    $('#progress').textContent = !measures.length ? ''
      : left ? `${left} of ${measures.length} measures left in this exercise.`
      : 'Exercise complete! Press “New exercise” for another.';
  }

  function renderStats() {
    $('#st-correct').textContent = session.correct;
    $('#st-total').textContent = session.total;
    $('#st-acc').textContent = session.total ? `${Math.round(100 * session.correct / session.total)}%` : '---';
    $('#st-streak').textContent = session.streak;
    $('#rule-stats').innerHTML = byCategory.map((cat) =>
      `<tr class="cat-row"><th colspan="3">${cat.name}</th></tr>` + cat.rules.map((r) => {
        const s = ruleStats[r.id];
        const pct = s && s.seen ? Math.round(100 * s.correct / s.seen) : null;
        return `<tr><td>${r.num}. ${notation(r.short)}</td>` +
          `<td>${s ? `${s.correct} / ${s.seen}` : '<span class="muted">---</span>'}</td>` +
          `<td>${pct === null ? '' : `<div class="meter" title="${pct}%"><i style="width:${pct}%"></i></div>`}</td></tr>`;
      }).join('')).join('');
  }

  // ---------- audio ----------

  const loaderEl = $('#audio-loader');

  function showLoading() {
    loaderEl.textContent = 'Loading piano samples… (first time only)';
    loaderEl.classList.remove('hidden');
  }
  function showLoadError() {
    loaderEl.textContent = '⚠ Could not load piano samples. Check your internet connection and reload.';
    loaderEl.classList.remove('hidden');
  }

  // The samples download when the page loads.
  // Play must still start the AudioContext, because browsers allow this only from a user gesture. ensureReady() does this.
  function preloadAudio() {
    showLoading();
    Piano.preload().then(() => loaderEl.classList.add('hidden'), showLoadError);
  }

  async function ensureAudio() {
    if (!Piano.isLoaded()) showLoading();
    try {
      await Piano.ensureReady();
      loaderEl.classList.add('hidden');
      return true;
    } catch (e) {
      showLoadError();
      return false;
    }
  }

  function clearSounding() {
    document.querySelectorAll('.staff-box').forEach((box) => Staff.clear(box, 'sounding'));
  }

  function stopAudio() {
    if (window.Piano) Piano.stopAll();
    clearSounding();
  }

  async function play(indices) {
    const exercise = measures;
    if (!(await ensureAudio())) return;
    // Stop if a new exercise started while the samples loaded.
    if (exercise !== measures) return;
    const chords = [];
    const where = [];
    const gaps = [];
    indices.forEach((mi) => {
      measures[mi].voicings.forEach((v, ci) => {
        chords.push(v.map((n) => n.midi));
        where.push([mi, ci]);
      });
      gaps.push(chords.length - 1);
    });
    Piano.playChords(chords, {
      gaps,
      onChord: (k) => {
        clearSounding();
        if (k < 0) return;
        const [mi, ci] = where[k];
        Staff.mark(cardEl(mi).querySelector('.staff-box'), [0, 1, 2, 3].map((v) => [ci, v]), 'sounding');
      },
    });
  }

  // ---------- events ----------

  $('#new').addEventListener('click', newExercise);
  $('#play-all').addEventListener('click', () => play(measures.map((_, i) => i)));
  $('#check-all').addEventListener('click', () => {
    measures.forEach((_, i) => {
      if (!state[i].done && cardEl(i).querySelector('select').value) check(i);
    });
  });
  $('#reset-stats').addEventListener('click', () => {
    if (!confirm('Reset your progress for every rule?')) return;
    ruleStats = {};
    store.set(STATS_KEY, ruleStats);
    renderStats();
  });

  // Register the service worker for offline use.
  // This code is not in an inline <script>, because the Content-Security-Policy blocks inline scripts.
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .catch(() => { /* offline or unsupported: the app still works online */ });
    });
  }

  renderStats();
  newExercise();
  preloadAudio();
  registerServiceWorker();
})();

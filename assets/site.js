import { boot, T, lang, onLang, still, whileSeen, fmt, esc } from './core.js?v=9b677b4';
import { S, modelPicker, specCard, playJobs, playConnect, smartScreen, GLYPH } from './widgets.js?v=9b677b4';

boot({
  en: {
    rd_label: 'A real video, read', rd_words: 'words', rd_caught: 'Caught', rd_score: 'Usefulness: 7 of 10',
    rd_k1: 'Marked: made it into the essence', rd_k2: 'Struck: filler, folded away', rd_k3: '3,685 words of video → three lines',
    fold_lab: 'Folded', sec_s: 's',
    demo_h2: 'It does <em class="hl">the rest.</em>', tabs_h2: 'Each in <em class="hl">its own tab.</em>',
    sp_h2: 'In about <em class="hl">half the time.</em>', es_h2: '<em class="hl">No filler,</em> no going around in circles.',
    mo_h2: 'Or leave it on <em class="hl">the default.</em>', plan_h2: 'Stays on <em class="hl">your computer.</em>',
  },
  ar: { fold_lab: 'انطوى', sec_s: 'ث' },
});

/* ---------------------------------------------------------------- the read: the video's own words, marked as Zubda read them */
const reader = document.getElementById('reader');
if (reader) {
  const D = S.duration, PLAY = 32, HOLD = 7, LOOP = PLAY + HOLD;
  const text = document.getElementById('rdText');
  const page = text.parentElement;
  const notesEl = document.getElementById('rdNotes');
  const now = document.getElementById('rdNow'), words = document.getElementById('rdWords'), count = document.getElementById('rdCount');
  const WORDS = S.counts.words_video;
  const marks = []; // { t, note, el }
  const strikes = []; // { t, el, reason, dur }
  const fillerOf = (r) => S.filler.find((f) => f[2] === r);

  // set the transcript: every highlight and every folded passage gets its own time inside its segment
  text.innerHTML = S.transcript.map(([t, s], i) => {
    const end = S.transcript[i + 1]?.[0] ?? D;
    const cuts = [];
    S.highlights.forEach(([p, n]) => { const at = s.indexOf(p); if (at >= 0) cuts.push({ at, len: p.length, kind: 'm', n }); });
    S.strikes.forEach(([p, r]) => { const at = s.indexOf(p); if (at >= 0) cuts.push({ at, len: p.length, kind: 's', r }); });
    cuts.sort((a, b) => a.at - b.at);
    let out = '', pos = 0;
    for (const c of cuts) {
      const ct = (t + (end - t) * (c.at / s.length)).toFixed(1);
      out += esc(s.slice(pos, c.at));
      const body = esc(s.slice(c.at, c.at + c.len));
      out += c.kind === 'm' ? `<mark data-t0="${ct}" data-n="${c.n}">${body}</mark>` : `<span class="st" data-t0="${ct}" data-r="${c.r}">${body}<span class="fold" dir="auto"></span></span>`;
      pos = c.at + c.len;
    }
    out += esc(s.slice(pos));
    return `<p data-a="${t}" data-b="${end}"><time>${fmt(t)}</time><span>${out}</span></p>`;
  }).join('');
  text.querySelectorAll('mark').forEach((el) => marks.push({ t: +el.dataset.t0, note: +el.dataset.n, el }));
  text.querySelectorAll('.st').forEach((el) => { const f = fillerOf(el.dataset.r); strikes.push({ t: +el.dataset.t0, el, reason: el.dataset.r, dur: f ? f[1] - f[0] : 0 }); });
  marks.sort((a, b) => a.t - b.t);

  const labelFolds = () => strikes.forEach((s) => { s.el.querySelector('.fold').textContent = `${T('fold_lab')}: ${S.filler_names[lang][s.reason]} · ${s.dur}${T('sec_s')}`; });
  labelFolds();

  // where each paragraph sits, so a moment of the video maps to a height in the page
  let rows = [], lineY = 0;
  const measure = () => {
    rows = [...text.children].map((p) => ({ a: +p.dataset.a, b: +p.dataset.b, top: p.offsetTop, h: p.offsetHeight, el: p }));
    lineY = page.clientHeight * 0.42;
  };
  const yAt = (tau) => {
    const r = rows.find((x) => tau < x.b) || rows.at(-1);
    if (!r) return 0;
    return r.top + Math.min(1, Math.max(0, (tau - r.a) / (r.b - r.a))) * r.h;
  };

  let shown = 0, last = -1;
  const noteRow = (m) => {
    const n = S.notes[m.note];
    return `<li data-k="${marks.indexOf(m)}"><time>${fmt(n[0])}</time><span>${esc(lang === 'en' ? n[4] : n[3])}</span></li>`;
  };
  const paint = (tau) => {
    text.style.transform = `translateY(${(lineY - yAt(tau)).toFixed(1)}px)`;
    now.textContent = fmt(tau);
    words.textContent = `${Math.round((WORDS * tau) / D).toLocaleString('en')} / ${WORDS.toLocaleString('en')}`;
    let on = 0;
    for (const m of marks) { const v = m.t <= tau; m.el.classList.toggle('on', v); if (v) on++; }
    for (const s of strikes) s.el.classList.toggle('on', s.t + 4 <= tau);
    for (const r of rows) r.el.classList.toggle('past', r.a <= tau);
    if (on !== shown) {
      if (on < shown) notesEl.innerHTML = '';
      for (let i = on < shown ? 0 : shown; i < on; i++) notesEl.insertAdjacentHTML('afterbegin', noteRow(marks[i]));
      shown = on;
      count.textContent = String(on);
    }
    reader.classList.toggle('done', tau >= D);
  };
  const frame = (sec) => {
    const k = sec % LOOP;
    const tau = Math.min(D, (k / PLAY) * D);
    if (Math.abs(tau - last) < 0.01) return;
    last = tau;
    paint(tau);
  };
  measure();
  new ResizeObserver(() => { measure(); last = -1; }).observe(page);
  paint(still ? D : 0);
  if (!still) whileSeen(reader, frame);

  // a caught line points back at the words it came from
  notesEl.addEventListener('mouseover', (e) => {
    const li = e.target.closest('li');
    marks.forEach((m, i) => m.el.classList.toggle('focus', li && +li.dataset.k === i));
  });
  notesEl.addEventListener('mouseleave', () => marks.forEach((m) => m.el.classList.remove('focus')));
  onLang(() => {
    labelFolds();
    const n = shown; shown = 0; notesEl.innerHTML = '';
    for (let i = 0; i < n; i++) notesEl.insertAdjacentHTML('afterbegin', noteRow(marks[i]));
    shown = n;
  });
}

/* ---------------------------------------------------------------- several videos */
const lanes = document.getElementById('lanes');
if (lanes) {
  const tabs = [...document.querySelectorAll('#tabwin .wt')];
  tabs.forEach((el) => { el.querySelector('.wt-g').innerHTML = GLYPH[el.querySelector('.wt-g').dataset.g]; });
  const note = document.getElementById('tabnote');
  let built = '';
  const build = (jobs) => {
    lanes.innerHTML = jobs.map((j) => `<div class="lane"><div class="lane-name">${GLYPH[j.src]}<span></span></div>
      <div class="lane-track">${j.stages.map((s) => `<span class="st"><i></i><span>${T(s.k)}</span></span>`).join('')}</div></div>`).join('');
    built = lang;
  };
  playJobs(lanes, ({ jobs, note: nk }) => {
    if (built !== lang) build(jobs);
    jobs.forEach((j, i) => {
      const lane = lanes.children[i];
      lane.classList.toggle('wait', j.waiting);
      lane.querySelector('.lane-name span').textContent = j.waiting ? `${T(j.name)} · ${T('tw_wait')}` : T(j.name);
      const s = tabs[i].querySelector('.wt-s');
      s.className = `wt-s ${j.waiting ? 'wait' : j.done ? 'done' : 'run'}`;
      s.style.setProperty('--p', j.u.toFixed(3));
      [...lane.querySelector('.lane-track').children].forEach((el, k) => {
        const p = j.stages[k].p;
        el.style.setProperty('--p', p.toFixed(3));
        el.classList.toggle('live', p > 0 && p < 1);
        el.classList.toggle('done', p >= 1);
      });
    });
    if (note.dataset.k !== nk + lang) { note.dataset.k = nk + lang; note.textContent = T(nk); }
  });
}

/* ---------------------------------------------------------------- the measured runs, on one minute ruler */
const ruler = document.getElementById('ruler');
if (ruler) ruler.innerHTML = [0, 60, 120, 180, 240, 300, 360].map((s) => `<span style="--t:${s}">${s / 60}:00</span>`).join('');

/* ---------------------------------------------------------------- the essence card, and what each numbered mark points at */
const spec = document.getElementById('spec');
specCard(spec);
document.querySelectorAll('.marks li').forEach((li) => {
  const on = (v) => { li.classList.toggle('on', v); spec?.querySelector(`[data-hl="${li.dataset.m}"]`)?.classList.toggle('hl-on', v); };
  li.addEventListener('mouseenter', () => on(true));
  li.addEventListener('mouseleave', () => on(false));
});

modelPicker(document.getElementById('msettings'));
playConnect(document.querySelector('.connect'));
smartScreen(document.getElementById('ss'));

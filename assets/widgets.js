// Behaviours that every design shows in its own form. Each one finds its parts by data- hooks
// inside a root element, so the markup and the look stay the design's own.
import { T, L, lang, onLang, still, whileSeen, fmt, esc } from './core.js?v=b3d2898';
import { S } from './sample.js?v=b3d2898';

/* ---------------------------------------------------------------- the models a plan offers */
export const MODELS = {
  claude: [
    ['Opus 5.5', 'أقوى فهم للمقاطع الطويلة والمزدحمة.', 'Strongest on long, dense videos.', true],
    ['Fable 5.1', 'أذكى موديل من Anthropic، فوق Opus، للمقاطع الأصعب.', 'Anthropic’s most advanced, above Opus, for the hardest videos.'],
    ['Sonnet 5.5', 'أسرع وأخف على حدّك، ويكفي أغلب المقاطع.', 'Faster and lighter on your limit; enough for most videos.'],
    ['Haiku 5.5', 'الأسرع، للمقاطع القصيرة والبسيطة.', 'Fastest, for short and simple videos.'],
  ],
  chatgpt: [
    ['GPT-6.1-Sol', 'أحدث موديل للشغل اليومي، وهو الافتراضي.', 'The latest workhorse model, and the default.', true],
    ['GPT-6-Astra', 'أعلى ذكاء، للمقاطع الأصعب.', 'Frontier intelligence, for the hardest videos.'],
    ['GPT-6-Luna', 'سريع وخفيف، للمقاطع البسيطة.', 'Fast and light, for simple videos.'],
  ],
};
const rowDefault = (m, i, on) => `<button type="button" class="mrow${on ? ' on' : ''}" data-i="${i}" role="radio" aria-checked="${on}"><span class="rd"></span>
  <span class="mtx"><b><bdi>${m[0]}</bdi></b><small>${lang === 'en' ? m[2] : m[1]}</small></span>${m[3] ? `<span class="tag">${T('default_tag')}</span>` : '<span></span>'}</button>`;

export function modelPicker(root, { row = rowDefault, onChange } = {}) {
  if (!root) return;
  const st = { p: 'claude', m: 0, think: 'balanced', fast: false };
  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const list = $('[data-mlist]'), chip = $('[data-mchip]'), logo = $('[data-mlogo]'), warn = $('[data-fastwarn]'), fast = $('[data-fast]');
  const paint = () => {
    list.innerHTML = MODELS[st.p].map((m, i) => row(m, i, i === st.m)).join('');
    if (logo) logo.src = `assets/${st.p === 'claude' ? 'claude' : 'openai'}.svg`;
    if (chip) chip.textContent = [MODELS[st.p][st.m][0], T(`think_${st.think}`), st.fast ? T('fast_tag') : ''].filter(Boolean).join(' · ');
    $$('[data-prov] [data-p]').forEach((b) => { b.classList.toggle('on', b.dataset.p === st.p); b.setAttribute('aria-checked', String(b.dataset.p === st.p)); });
    $$('[data-think] [data-v]').forEach((b) => { b.classList.toggle('on', b.dataset.v === st.think); b.setAttribute('aria-checked', String(b.dataset.v === st.think)); });
    if (fast) { fast.classList.toggle('on', st.fast); fast.setAttribute('aria-checked', String(st.fast)); }
    if (warn) { warn.hidden = !st.fast; warn.textContent = T(st.p === 'claude' ? 'set_fast_claude' : 'set_fast_chatgpt'); }
    root.dataset.p = st.p; root.dataset.think = st.think; root.dataset.fast = st.fast ? '1' : '';
    onChange?.(st);
  };
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { st.m = +b.dataset.i; paint(); } });
  $$('[data-prov] [data-p]').forEach((b) => b.addEventListener('click', () => { st.p = b.dataset.p; st.m = 0; paint(); }));
  $$('[data-think] [data-v]').forEach((b) => b.addEventListener('click', () => { st.think = b.dataset.v; paint(); }));
  fast?.addEventListener('click', () => { st.fast = !st.fast; paint(); });
  paint();
  onLang(paint);
}

/* ---------------------------------------------------------------- the sample essence: brief/full, copy, transcript search */
// the video's own sentences with their time, cut from the real transcript
export const SENTENCES = (() => {
  const out = [];
  S.transcript.forEach(([t, text], i) => {
    const end = S.transcript[i + 1]?.[0] ?? S.duration;
    const parts = text.match(/[^.?!]+[.?!]*/g) || [text];
    let at = 0;
    for (const p of parts) {
      const s = p.trim();
      if (s.length > 2) out.push([t + (end - t) * (at / text.length), s]);
      at += p.length;
    }
  });
  return out;
})();

export function specCard(root, { query = 'Sunday', max = 6 } = {}) {
  if (!root) return;
  const modes = root.querySelectorAll('[data-mode]');
  const blocks = root.querySelectorAll('[data-show]');
  modes.forEach((b) => b.addEventListener('click', () => {
    modes.forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
    blocks.forEach((el) => { el.hidden = el.dataset.show !== b.dataset.mode; });
    root.dataset.mode = b.dataset.mode;
  }));
  const copy = root.querySelector('[data-copy]');
  copy?.addEventListener('click', async () => {
    const txt = [...root.querySelectorAll('[data-show]:not([hidden]) :is(h4, li)')].map((el) => (el.tagName === 'H4' ? `\n${el.textContent}` : `- ${el.textContent}`)).join('\n').trim();
    try { await navigator.clipboard.writeText(txt); } catch {}
    const lab = copy.querySelector('[data-t]') || copy;
    copy.classList.add('copied'); lab.textContent = T('copied');
    setTimeout(() => { copy.classList.remove('copied'); lab.textContent = T('copy'); }, 1600);
  });
  const q = root.querySelector('[data-trq]'), out = root.querySelector('[data-trlines]'), count = root.querySelector('[data-trcount]');
  if (!q || !out) return;
  q.value = query;
  const find = () => {
    const w = q.value.trim().toLowerCase();
    const hit = SENTENCES.filter(([, s]) => w.length > 1 && s.toLowerCase().includes(w));
    const re = w ? new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
    const mark = (s) => (re ? esc(s).replace(re, (m) => `<mark>${m}</mark>`) : esc(s));
    const shown = w.length > 1 ? hit.slice(0, max) : SENTENCES.filter(([t]) => t > 320).slice(0, max);
    out.innerHTML = shown.length ? shown.map(([t, s]) => `<p><time>${fmt(t)}</time><span>${mark(s)}</span></p>`).join('') : `<span class="none" dir="auto">${T('tr_none')}</span>`;
    if (count) count.textContent = w.length > 1 ? `${hit.length}` : '';
  };
  q.addEventListener('input', find);
  find();
  onLang(find);
}

/* ---------------------------------------------------------------- several videos: three tabs, two running, one waiting */
export const STAGES = [['st_fetch', 0, 0.11], ['st_listen', 0.11, 0.27], ['st_watch', 0.11, 0.19], ['st_understand', 0.27, 0.62], ['st_write', 0.62, 1]];
export const JOBS = [
  { src: 'youtube', name: 'tw1', at: (t) => 0.55 + t / 10 },
  { src: 'x', name: 'tw2', at: (t) => 0.12 + t / 12 },
  { src: 'tiktok', name: 'tw3', at: (t) => (t < 4.5 ? -1 : (t - 4.5) / 11) },
];
export const JOBS_LOOP = 18;
// where each video is at a moment of the loop
export function jobsAt(t) {
  t %= JOBS_LOOP;
  let done = 0;
  const jobs = JOBS.map((j) => {
    const u = Math.min(1, j.at(t));
    const waiting = u < 0;
    if (u >= 1) done++;
    return { ...j, u: Math.max(0, u), waiting, done: u >= 1, stages: STAGES.map(([k, a, b]) => ({ k, p: waiting ? 0 : Math.min(1, Math.max(0, (u - a) / (b - a))) })) };
  });
  return { jobs, note: done === 3 ? 'tw_note3' : done ? 'tw_note2' : 'tw_note' };
}
export function playJobs(el, paint) {
  if (!el) return;
  paint(jobsAt(7));
  if (!still) whileSeen(el, (t) => paint(jobsAt(t)));
  onLang(() => paint(jobsAt(still ? 7 : 0)));
}

/* ---------------------------------------------------------------- connecting: the steps, as the app shows them */
export const CONNECT = { total: 270, spans: [6, 1.4, 4.2, 1.2] };
export function connectAt(t) {
  const ends = CONNECT.spans.reduce((a, s) => [...a, (a.at(-1) || 0) + s], []);
  const loop = ends.at(-1) + 3.2;
  t %= loop;
  const now = ends.findIndex((e) => t < e);
  const p = Math.min(1, t / CONNECT.spans[0]);
  const got = Math.round(CONNECT.total * (1 - Math.pow(1 - p, 1.6)));
  return { now, got, total: CONNECT.total, late: now === 2 && t - ends[1] > 1.8, clock: fmt(Math.min(t, ends.at(-1)) * 6.5), done: now === -1 };
}
export function playConnect(root) {
  if (!root) return;
  const steps = [...root.querySelectorAll('[data-s]')];
  const mb = root.querySelector('[data-mb]'), bar = root.querySelector('[data-bar]'), clock = root.querySelector('[data-clock]');
  const paint = (c) => {
    steps.forEach((li, i) => { li.classList.toggle('done', c.done || i < c.now); li.classList.toggle('on', i === c.now); });
    if (mb) mb.textContent = `${c.got} / ${c.total} MB`;
    bar?.style.setProperty('--p', (c.got / c.total).toFixed(3));
    steps[2]?.classList.toggle('late', c.late);
    if (clock) clock.textContent = c.clock;
    root.classList.toggle('ok', c.done);
  };
  paint(connectAt(still ? 13.5 : 8.2));
  if (!still) whileSeen(root, (t) => paint(connectAt(t)));
}

/* ---------------------------------------------------------------- SmartScreen, pressed the way a person would */
export function smartScreen(ss) {
  if (!ss) return;
  const ring = ss.querySelector('[data-ss-ring]');
  const place = (el) => {
    const a = ss.getBoundingClientRect(), b = el.getBoundingClientRect();
    return [((b.left + b.width / 2 - a.left) / a.width) * 100, ((b.top + b.height / 2 - a.top) / a.height) * 100];
  };
  const tap = (x, y) => { ring.style.left = `${x}%`; ring.style.top = `${y}%`; ring.classList.remove('tap'); void ring.offsetWidth; ring.classList.add('tap'); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const base = ss.className.replace(/\bs[123]\b/g, '').trim();
  const loop = async () => {
    for (;;) {
      ss.className = base; await wait(1400);
      const [mx, my] = place(ss.querySelector('[data-ss-more]'));
      ss.style.setProperty('--mx', `${mx - 1}%`); ss.style.setProperty('--my', `${my - 2}%`);
      ss.className = `${base} s1`; await wait(1000); tap(mx, my); await wait(250);
      ss.className = `${base} s2`; await wait(1300);
      const [rx, ry] = place(ss.querySelector('[data-ss-run]'));
      ss.style.setProperty('--rx', `${rx - 1}%`); ss.style.setProperty('--ry', `${ry - 2}%`);
      ss.className = `${base} s3`; await wait(1000); tap(rx, ry); await wait(1800);
    }
  };
  if (still) { ss.className = `${base} s2`; return; }
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { loop(); o.disconnect(); } }).observe(ss);
}

/* ---------------------------------------------------------------- source marks */
export const GLYPH = {
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="5" width="21" height="14" rx="4" fill="#FF0033"/><path d="M10 9v6l5.2-3Z" fill="#fff"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.8 3.2h-2.9v12.1a2.7 2.7 0 1 1-1.9-2.6V9.7a5.7 5.7 0 1 0 4.8 5.6V9.2a7.1 7.1 0 0 0 4.1 1.3V7.6a4.1 4.1 0 0 1-4.1-4.4Z"/></svg>',
};
export { S, L };

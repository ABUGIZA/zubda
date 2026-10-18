import { Reel, fmt } from './reel.js';
import { DOCS_EN } from './docs-en.js';

/* ---------------------------------------------------------------- words: Arabic is in the page, English here */
const EN = {
  title: 'Zubda — don’t watch the video, read its essence',
  nav_docs: 'Guide', nav_releases: 'Releases', nav_get: 'Download', nav_issue: 'Report a problem',
  pill_b: 'Free', pill: 'For Windows 10 and 11 · on your Claude or ChatGPT plan',
  h1: 'Don’t watch the video.<br><span class="soft">Read its essence.</span>',
  sub: 'Paste a long YouTube or X link. Zubda listens to and watches all of it — every word said and everything shown on screen — folds away the filler, and gives you what matters in a few minutes of reading.',
  get_win: 'Download for Windows', how: 'See how it works',
  spec1: 'Free', spec4: 'No API key', size: '14 MB',
  to: '5 min read', lg_core: 'Substance', lg_detail: 'Detail', lg_fold: 'Filler folds', lg_pin: 'Each line is a fact; taller is more important',
  demo_eye: 'From the app itself', demo_h: 'Paste the link.<br><span class="soft">It does the rest.</span>', clip_note: 'Recorded from the real app',
  does_eye: 'What it does', does_h: 'Everything useful in the video.<br><span class="soft">Not one second of filler.</span>',
  d1_h: 'It watches the screen, not just the words', d1_p: 'It reads every frame: code, numbers, settings, links. What was shown but never said reaches you word for word.',
  d2_h: 'It tells you if it’s worth watching', d2_p: 'A clear verdict, a usefulness score out of 10, and the only moments you need to see with your own eyes — with their times.',
  d3_h: 'Ask the video, or your whole library', d3_p: 'Every answer comes from the video itself, with the minute it was said. Click the time and the video opens right there.',
  d4_h: 'A whole playlist, or a channel', d4_p: 'Paste a playlist, or a channel and it takes the latest ten videos — skipping the ones you already read.',
  d5_h: 'Files from your computer', d5_p: 'Drag any video or audio onto the window — a lecture, a meeting, a course — and it’s read like any link.',
  d6_h: 'Take it with you: Markdown or PDF', d6_p: 'Save the essence with its frames as a file, move it to Notion or send it to someone.',
  src_more: 'More sites', src_file: 'A file on your computer',
  plan_eye: 'Your plan, your computer', plan_h: 'Runs on your plan.<br><span class="soft">Stays on your computer.</span>',
  f1: 'Connect Claude or ChatGPT in one click; you sign in on their official page. No API key, nothing extra to pay.',
  f2: 'Downloading, listening and watching all happen on your computer. Your library stays with you and is never sent to a server of ours.',
  f3: 'With an NVIDIA card it listens much faster. Without one, it reads the video’s own captions and works on any computer.',
  f4: 'It updates itself: when a new version is out you see “Update ready”. Every update is signed, and the app refuses any file that doesn’t match.',
  claude_d: 'Pro or Max plan', chatgpt_d: 'Plus or Pro plan',
  get_eye: 'Ready?', get_h: 'Get Zubda, and win back hours of watching.',
  ss_h: 'Windows will ask the first time', ss_p: 'Zubda is free and has no paid signing certificate, so Windows shows a SmartScreen warning the first time you run the installer. Two clicks and you’re through:',
  ss_1: 'Click “More info”', ss_2: 'Click “Run anyway”',
  ss_title: 'Windows protected your PC', ss_body: 'Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at risk.',
  ss_more: 'More info', ss_app: 'App:', ss_pub: 'Publisher:', ss_unknown: 'Unknown publisher', ss_run: 'Run anyway', ss_no: 'Don’t run',
  foot: 'Free. Your plan, your computer.',
};
Object.assign(EN, DOCS_EN);
const AR = {};
const isDocs = document.body.dataset.page === 'docs';

let lang = 'ar';
function setLang(l) {
  lang = l === 'en' ? 'en' : 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  for (const el of document.querySelectorAll('[data-t]')) {
    const k = el.dataset.t;
    if (!(k in AR)) AR[k] = el.hasAttribute('data-html') ? el.innerHTML : el.textContent;
    const v = lang === 'en' ? (EN[k] ?? AR[k]) : AR[k];
    if (el.hasAttribute('data-html')) el.innerHTML = v; else el.textContent = v;
  }
  if (!AR.__title) AR.__title = document.title;
  document.title = lang === 'en' ? (isDocs ? EN.doc_title : EN.title) : AR.__title;
  const b = document.getElementById('lang');
  if (b) b.textContent = lang === 'en' ? 'العربية' : 'English';
  try { localStorage.setItem('zubda-lang', lang); } catch {}
  document.dispatchEvent(new CustomEvent('lang', { detail: lang }));
}
let first = new URLSearchParams(location.search).get('lang');
try { first = first || localStorage.getItem('zubda-lang'); } catch {}
if (!first) first = (navigator.language || '').startsWith('ar') ? 'ar' : 'en';
setLang(first);
document.getElementById('lang')?.addEventListener('click', () => setLang(lang === 'en' ? 'ar' : 'en'));
export const getLang = () => lang;

/* ---------------------------------------------------------------- nav, reveals */
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });
const io = new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) {
    e.target.classList.add('in');
    if (e.target.classList.contains('do')) e.target.style.transitionDelay = `${(+e.target.dataset.i % 2) * 0.08}s`;
    io.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.rv, .do').forEach((el, i) => { el.dataset.i = i; io.observe(el); });

/* ---------------------------------------------------------------- the fold */
const cv = document.getElementById('reel');
if (cv) {
  const D = 3492;
  const NAMES = { ar: { intro: 'مقدمة', sponsor: 'إعلان', chit_chat: 'سوالف', tangent: 'خروج عن الموضوع', repetition: 'تكرار', outro: 'خاتمة' },
                  en: { intro: 'Intro', sponsor: 'Sponsor', chit_chat: 'Chit-chat', tangent: 'Tangent', repetition: 'Repetition', outro: 'Outro' } };
  let seed = 11;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const peaks = Array.from({ length: 700 }, (_, i) => 0.22 + 0.78 * Math.abs(Math.sin(i * 0.09) * Math.cos(i * 0.031)) * (0.55 + 0.45 * rnd()));
  const pattern = ['filler:intro', 'core', 'detail', 'filler:sponsor', 'core', 'detail', 'core', 'filler:chit_chat', 'detail', 'core', 'filler:tangent', 'core', 'detail', 'filler:repetition', 'core', 'filler:outro'];
  const runs = [], notes = [];
  let at = 0;
  for (const st of pattern) {
    const len = st.startsWith('filler') ? 140 + rnd() * 260 : 150 + rnd() * 200;
    runs.push({ t: at, t_end: at + len, state: st });
    if (!st.startsWith('filler')) for (let k = 0; k < (st === 'core' ? 4 : 2); k++) notes.push({ t: at + 10 + rnd() * (len - 20), importance: st === 'core' ? 2 + Math.round(rnd()) : 1 });
    at += len;
  }
  const scale = D / at;
  for (const r of runs) { r.t *= scale; r.t_end *= scale; }
  for (const n of notes) n.t *= scale;
  runs[runs.length - 1].t_end = D;

  // the frame lane: real frames of Zubda itself at work, cut from the demo clip
  const frames = Array.from({ length: 40 }, (_, i) => ({ id: `f${i}`, t: (i / 40) * D, thumb: `f${String(i + 1).padStart(2, '0')}.jpg` }));
  let reel = null;
  const pleats = document.getElementById('pleats');
  const from = document.getElementById('from');
  const make = () => {
    reel?.destroy();
    reel = new Reel(cv, { ltr: lang === 'en' });
    reel.set({ duration: D, frames, peaks, runs, notes, frameBase: 'assets/reel/' });
    pleats.innerHTML = reel.folds().map((f) => `<span data-c="${(f.t + f.t_end) / 2}">${NAMES[lang][f.reasons[0]] || ''}</span>`).join('');
    update();
  };
  const fold = document.getElementById('fold');
  const update = () => {
    if (!reel) return;
    const r = fold.getBoundingClientRect();
    const span = r.height - innerHeight;
    const k = Math.min(1, Math.max(0, (-r.top + innerHeight * 0.15) / (span * 0.75)));
    reel.p = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    reel.invalidate();
    from.style.setProperty('--strike', String(Math.min(1, Math.max(0, (reel.p - 0.6) / 0.35))));
    from.style.color = reel.p > 0.9 ? 'var(--cream-4)' : '';
    for (const s of pleats.children) {
      s.style.left = `${reel.X(+s.dataset.c)}px`;
      s.style.setProperty('--o', String(Math.max(0, 1 - reel.p * 1.8)));
    }
  };
  make();
  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  addEventListener('resize', () => requestAnimationFrame(update));
  document.addEventListener('lang', make);
  from.textContent = fmt(D);
}

/* ---------------------------------------------------------------- the real clips */
const clip = document.getElementById('clip');
if (clip) {
  let which = 'youtube';
  const load = () => {
    clip.src = `assets/demo/${which}-${lang}.mp4`;
    clip.play().catch(() => {});
  };
  document.querySelectorAll('[data-clip]').forEach((b) => b.addEventListener('click', () => {
    which = b.dataset.clip;
    document.querySelectorAll('[data-clip]').forEach((x) => x.classList.toggle('on', x === b));
    load();
  }));
  clip.addEventListener('contextmenu', (e) => e.preventDefault());
  // load the clip only when it is about to be seen
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { load(); o.disconnect(); } }, { rootMargin: '400px' }).observe(clip);
  document.addEventListener('lang', () => { if (clip.src) load(); });
}

/* ---------------------------------------------------------------- SmartScreen, pressed the way a person would */
const ss = document.getElementById('ss');
if (ss) {
  const ring = document.getElementById('ssRing');
  const place = (el) => {
    const a = ss.getBoundingClientRect(), b = el.getBoundingClientRect();
    return [((b.left + b.width / 2 - a.left) / a.width) * 100, ((b.top + b.height / 2 - a.top) / a.height) * 100];
  };
  const tap = (x, y) => { ring.style.left = `${x}%`; ring.style.top = `${y}%`; ring.classList.remove('tap'); void ring.offsetWidth; ring.classList.add('tap'); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let running = false;
  const loop = async () => {
    if (running) return; running = true;
    while (true) {
      ss.className = 'ss'; await wait(1400);
      const [mx, my] = place(document.getElementById('ssMore'));
      ss.style.setProperty('--mx', `${mx - 1}%`); ss.style.setProperty('--my', `${my - 2}%`);
      ss.className = 'ss s1'; await wait(1000); tap(mx, my); await wait(250);
      ss.className = 'ss s2'; await wait(1300);
      const [rx, ry] = place(document.getElementById('ssRun'));
      ss.style.setProperty('--rx', `${rx - 1}%`);
      ss.className = 'ss s3'; await wait(1000); tap(rx, ry); await wait(1800);
    }
  };
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { loop(); o.disconnect(); } }).observe(ss);
}

/* ---------------------------------------------------------------- the real version and size, from the latest release */
fetch('https://api.github.com/repos/ABUGIZA/zubda/releases/latest').then((r) => (r.ok ? r.json() : null)).then((rel) => {
  if (!rel) return;
  document.querySelectorAll('.ver').forEach((el) => (el.textContent = rel.tag_name));
  const a = (rel.assets || []).find((x) => x.name === 'Zubda-Setup.exe');
  if (a) {
    const mb = `${Math.round(a.size / 1e6)} MB`;
    AR.size = mb; EN.size = mb;
    document.querySelectorAll('[data-t="size"]').forEach((el) => (el.textContent = mb));
  }
}).catch(() => {});

/* ---------------------------------------------------------------- the guide: its clips, and a contents list that follows */
const demos = [...document.querySelectorAll('video[data-demo]')];
if (demos.length) {
  const load = (v) => { v.src = `assets/demo/${v.dataset.demo}-${lang}.mp4`; v.play().catch(() => {}); };
  const vio = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !e.target.src) load(e.target); }, { rootMargin: '300px' });
  demos.forEach((v) => { vio.observe(v); v.addEventListener('contextmenu', (e) => e.preventDefault()); });
  document.addEventListener('lang', () => demos.forEach((v) => { if (v.src) load(v); }));
}
const toc = document.getElementById('toc');
if (toc) {
  const links = [...toc.querySelectorAll('a')];
  const tio = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) links.forEach((l) => l.classList.toggle('on', l.getAttribute('href') === `#${e.target.id}`));
  }, { rootMargin: '-25% 0px -65% 0px' });
  document.querySelectorAll('.doc section').forEach((s) => tio.observe(s));
}

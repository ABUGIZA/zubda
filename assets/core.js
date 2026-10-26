// What every page of every design shares: the two languages, reveals, the real clips,
// the latest release, and the guide's contents list. A design adds its own words with boot().
import { EN as BASE } from './en.js?v=24ac0d8';
import { DOCS_EN } from './docs-en.js?v=24ac0d8';

export const EN = { ...BASE, ...DOCS_EN };
// words only scripts use (the page has no element holding their Arabic)
export const AR = {
  tw_note2: 'خلص واحد، فبدأ اللي كان ينتظر', tw_note3: 'خلصوا الثلاثة', tw_wait: 'ينتظر دوره',
  st_write: 'كتابة', copied: 'انتسخ', tr_none: 'ما انقالت في المقطع',
  default_tag: 'الافتراضي', fast_tag: 'سريع',
  think_light: 'خفيف', think_balanced: 'متوازن', think_deep: 'عميق',
  set_fast_claude: 'أسرع بحوالي الضعفين. في Claude يشتغل فقط إذا فعّلت «Extra usage» في حسابك على claude.ai، و Anthropic تحسبه دفع إضافي فوق اشتراكك. إذا ما هو مفعّل، زبدة تكمل بالسرعة العادية.',
  set_fast_chatgpt: 'أسرع بحوالي الضعفين، ويستهلك من حدّ اشتراكك أسرع.',
};

export let lang = 'ar';
export const T = (k) => (lang === 'en' ? (EN[k] ?? AR[k]) : AR[k]) ?? k;
export const L = (o) => (o && typeof o === 'object' ? o[lang] ?? o.ar : o); // pick from {ar, en}
export const onLang = (fn) => document.addEventListener('lang', () => fn(lang));
export const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fmt = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const TITLES = { home: 'title', docs: 'doc_title', new: 'new_title' };
// The published site gives each language its own address (Arabic at the root, English under en/), so
// search engines index both: the build marks the page's language and links its twin. The source, opened
// as it is, has neither and swaps the words in place.
const PAGE_LANG = document.documentElement.dataset.pageLang || '';
const twin = (l) => document.querySelector(`link[rel="alternate"][hreflang="${l}"]`)?.href;
// crawlers and AI fetchers read the page they asked for (Google-InspectionTool and Claude-User say no
// "bot"); the Claude and ChatGPT apps' own browsers name themselves too, and are people
const BOT = /bot|crawl|spider|slurp|google-|googleother|claude-user|chatgpt-user|perplexity-user|facebookexternalhit|embedly|lighthouse|headless|preview/i;
// so does a visitor a search engine or an AI answer sent here: Google asks sites not to redirect by
// language, and the switch is one click away
const FROM_SEARCH = (() => {
  try { return /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|brave|kagi|chatgpt|openai|claude|perplexity)\.[a-z.]+$/i.test(new URL(document.referrer).hostname); } catch { return false; }
})();
// files next to this script, wherever the page sits
export const asset = (p) => new URL(p, import.meta.url).href;
export function setLang(l, { remember = true } = {}) {
  lang = l === 'en' ? 'en' : 'ar';
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'en' ? 'ltr' : 'rtl';
  for (const el of document.querySelectorAll('[data-t]')) {
    const k = el.dataset.t;
    const html = el.hasAttribute('data-html');
    if (!(k in AR)) AR[k] = html ? el.innerHTML : el.textContent;
    const v = lang === 'en' ? (EN[k] ?? AR[k]) : AR[k];
    if (html) el.innerHTML = v; else el.textContent = v;
  }
  for (const el of document.querySelectorAll('[data-t-label]')) {
    const k = el.dataset.tLabel;
    if (!(k in AR)) AR[k] = el.getAttribute('aria-label') || '';
    el.setAttribute('aria-label', lang === 'en' ? (EN[k] ?? AR[k]) : AR[k]);
  }
  // a built page keeps its own title (written for search engines); the source swaps it with the words
  if (!PAGE_LANG) {
    if (!AR.__title) AR.__title = document.title;
    document.title = lang === 'en' ? EN[TITLES[document.body.dataset.page] || 'title'] : AR.__title;
  }
  for (const b of document.querySelectorAll('[data-lang]')) b.textContent = lang === 'en' ? 'العربية' : 'English';
  if (remember) try { localStorage.setItem('zubda-lang', lang); } catch {}
  document.dispatchEvent(new CustomEvent('lang', { detail: lang }));
}

// run a frame loop only while its element is on screen; tick gets seconds of on-screen time
export function whileSeen(el, tick, margin = '100px') {
  let on = false, raf = 0, t0 = 0, acc = 0;
  const step = (now) => { if (!on) return; tick((acc + now - t0) / 1000); raf = requestAnimationFrame(step); };
  new IntersectionObserver((es) => {
    const v = es[0].isIntersecting;
    if (v && !on) { on = true; t0 = performance.now(); raf = requestAnimationFrame(step); }
    else if (!v && on) { on = false; acc += performance.now() - t0; cancelAnimationFrame(raf); }
  }, { rootMargin: margin }).observe(el);
}

export function boot({ en = {}, ar = {} } = {}) {
  Object.assign(EN, en);
  Object.assign(AR, ar);
  let first = new URLSearchParams(location.search).get('lang');
  try { first = first || localStorage.getItem('zubda-lang'); } catch {}
  if (!first) first = PAGE_LANG && (BOT.test(navigator.userAgent) || FROM_SEARCH) ? PAGE_LANG : (navigator.language || '').startsWith('ar') ? 'ar' : 'en';
  if (PAGE_LANG) {
    // a first visit in the other language (or a link asking for it) goes to the twin page
    const to = first !== PAGE_LANG && twin(first === 'en' ? 'en' : 'ar');
    if (to) { location.replace(to + location.hash); return; }
    setLang(PAGE_LANG, { remember: false });  // reading a page isn't choosing its language; the button is
    // the twin page has the same sections, so the switch lands where the reader is
    for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => {
      try { localStorage.setItem('zubda-lang', PAGE_LANG === 'en' ? 'ar' : 'en'); } catch {}
      if (b.href) b.href = b.href.split('#')[0] + location.hash;
    });
  } else {
    setLang(first);
    for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(lang === 'en' ? 'ar' : 'en'));
  }

  // reveal on arrival
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
  document.querySelectorAll('[data-here]').forEach((a) => a.classList.toggle('on', a.dataset.here === document.body.dataset.page));
  const nav = document.querySelector('[data-nav]');
  if (nav) addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });

  clips();
  release();
  toc();
}

/* the real clips, recorded from the app and played at 4× */
function clips() {
  const clip = document.getElementById('clip');
  if (clip) {
    let which = 'youtube';
    const load = () => { clip.src = asset(`demo/${which}-${lang}.mp4?v=24ac0d8`); clip.play().catch(() => {}); };
    const tabs = document.querySelectorAll('[data-clip]');
    tabs.forEach((b) => b.addEventListener('click', () => {
      which = b.dataset.clip;
      tabs.forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
      load();
    }));
    clip.addEventListener('contextmenu', (e) => e.preventDefault());
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { load(); o.disconnect(); } }, { rootMargin: '400px' }).observe(clip);
    onLang(() => { if (clip.src) load(); });
  }
  const demos = [...document.querySelectorAll('video[data-demo]')];
  if (demos.length) {
    const load = (v) => { v.src = asset(`demo/${v.dataset.demo}-${lang}.mp4?v=24ac0d8`); v.play().catch(() => {}); };
    const vio = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !e.target.src) load(e.target); }, { rootMargin: '300px' });
    demos.forEach((v) => { vio.observe(v); v.addEventListener('contextmenu', (e) => e.preventDefault()); });
    onLang(() => demos.forEach((v) => { if (v.src) load(v); }));
  }
}

/* the real version and size, from the latest published release */
function release() {
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
}

/* the guide's contents list follows the reading */
function toc() {
  const toc = document.getElementById('toc');
  if (!toc) return;
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const tio = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) {
      links.forEach((l) => l.classList.toggle('on', l.getAttribute('href') === `#${e.target.id}`));
      toc.style.setProperty('--at', String(links.findIndex((l) => l.classList.contains('on'))));
    }
  }, { rootMargin: '-25% 0px -65% 0px' });
  document.querySelectorAll('[data-doc] section[id]').forEach((s) => tio.observe(s));
}

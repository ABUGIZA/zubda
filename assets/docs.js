// The guide: one page at a time, a sidebar of groups, quick search, copy page, an on-this-page rail and a pager.
// Without this script every page simply shows one under the other.
import { T, lang, onLang, esc } from './core.js?v=3e0ece0';

const AR_WORDS = {
  g_find_ph: 'اكتب كلمة: تثبيت، حد الاشتراك، PDF…', g_none: 'ما لقينا شي بهذي الكلمة. جرّب كلمة ثانية.', g_pages: 'الصفحات',
  g_copied: 'انتسخت', g_prev: 'السابق', g_next: 'التالي',
};
const W = (k) => (lang === 'en' ? T(k) : AR_WORDS[k] ?? T(k));

const pages = [...document.querySelectorAll('.pg')];
const side = document.querySelector('[data-side]');
const links = [...side.querySelectorAll('.tree a')];
const pager = document.querySelector('[data-pager]');
const onpage = document.querySelector('[data-onpage]');
const dbar = document.querySelector('[data-dbar]');
const textOf = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
let cur = null, spy = null;

/* ---------------------------------------------------------------- headings get a link of their own */
for (const h of document.querySelectorAll('.pg-body h2[id]')) {
  h.insertAdjacentHTML('beforeend', `<a class="anchor" href="#${h.id}" aria-hidden="true" tabindex="-1"><svg class="ic"><use href="#i-hash"/></svg></a>`);
}

/* ---------------------------------------------------------------- reading time, in the page's own language */
const minutes = (pg) => {
  const words = textOf(pg.querySelector('.pg-body')).split(' ').length + textOf(pg.querySelector('.pg-head')).split(' ').length;
  const n = Math.max(1, Math.round(words / 170));
  if (lang === 'en') return `${n} min read`;
  return n === 1 ? 'دقيقة قراءة' : n === 2 ? 'دقيقتين قراءة' : `${n} دقائق قراءة`;
};

/* ---------------------------------------------------------------- one page at a time */
function show(hash, { scroll = true } = {}) {
  const id = decodeURIComponent((hash || '').replace(/^#/, ''));
  const target = id ? document.getElementById(id) : null;
  const pg = target?.closest('.pg') || pages[0];
  if (pg !== cur) {
    pages.forEach((p) => p.classList.toggle('on', p === pg));
    cur = pg;
    links.forEach((a) => {
      const on = a.getAttribute('href') === `#${pg.id}`;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    paintFrame();
    rail();
  }
  if (target && target !== pg && target.tagName === 'DETAILS') target.open = true;
  if (scroll) {
    if (target && target !== pg) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }
  closeMenu();
}

// the page's words that change with the language: title, reading time, pager, phone bar
function paintFrame() {
  if (!cur) return;
  const title = textOf(cur.querySelector('h1'));
  document.title = `${title} — ${lang === 'en' ? 'Zubda guide' : 'شرح زبدة'}`;
  pages.forEach((p) => { const m = p.querySelector('[data-mins]'); if (m) m.textContent = minutes(p); });
  const i = pages.indexOf(cur);
  const card = (p, dir) => p ? `<a class="pg-${dir}" href="#${p.id}"><span class="pl">${W(dir === 'prev' ? 'g_prev' : 'g_next')}</span>
    <span class="pn"><svg class="ic"><use href="#${p.dataset.ic}"/></svg><b>${esc(textOf(p.querySelector('h1')))}</b></span><svg class="ic arr"><use href="#i-chev"/></svg></a>` : '<span></span>';
  pager.innerHTML = card(pages[i - 1], 'prev') + card(pages[i + 1], 'next');
  dbar.querySelector('[data-dbar-grp]').textContent = T(cur.dataset.grp);
  dbar.querySelector('[data-dbar-pg]').textContent = title;
}

/* ---------------------------------------------------------------- on this page, following the reading */
function rail() {
  spy?.disconnect();
  const hs = [...cur.querySelectorAll('.pg-body h2[id]')];
  onpage.innerHTML = hs.map((h) => `<a href="#${h.id}">${esc(textOf(h))}</a>`).join('');
  onpage.parentElement.classList.toggle('empty', hs.length < 2);
  const as = [...onpage.children];
  const seen = new Map();
  spy = new IntersectionObserver((es) => {
    for (const e of es) seen.set(e.target, e.isIntersecting);
    let k = hs.findIndex((h) => seen.get(h));
    if (k < 0) { k = 0; hs.forEach((h, j) => { if (h.getBoundingClientRect().top < innerHeight * 0.3) k = j; }); }
    as.forEach((a, j) => a.classList.toggle('on', j === k));
    onpage.style.setProperty('--k', k);
  }, { rootMargin: '-72px 0px -55% 0px' });
  hs.forEach((h) => spy.observe(h));
}

/* ---------------------------------------------------------------- copy page, as clean Markdown */
const md = (el) => {
  const inline = (n) => [...n.childNodes].map((c) => {
    if (c.nodeType === 3) return c.textContent;
    if (c.nodeType !== 1 || c.classList.contains('anchor') || c.tagName === 'svg') return '';
    if (c.tagName === 'B' || c.tagName === 'STRONG') return `**${inline(c)}**`;
    if (c.tagName === 'KBD') return `\`${c.textContent}\``;
    if (c.classList.contains('ui')) return `«${inline(c)}»`;
    if (c.tagName === 'A') return `[${inline(c)}](${c.href})`;
    if (c.tagName === 'BR') return '\n';
    return inline(c);
  }).join('').replace(/\s+/g, ' ').trim();
  const out = [];
  const walk = (n) => {
    for (const c of n.children) {
      const t = c.tagName;
      if (t === 'H2') out.push(`## ${inline(c)}`);
      else if (t === 'H3') out.push(`### ${inline(c)}`);
      else if (t === 'P') out.push(inline(c));
      else if (t === 'OL') out.push([...c.children].map((li, i) => `${i + 1}. ${[...li.querySelectorAll(':scope > h3, :scope > b, :scope > p')].map(inline).join(' — ') || inline(li)}`).join('\n'));
      else if (t === 'UL') out.push([...c.children].map((li) => `- ${[...li.querySelectorAll(':scope > b, :scope > span, :scope > p')].map(inline).join(' — ') || inline(li)}`).join('\n'));
      else if (t === 'DL') out.push([...c.querySelectorAll(':scope > div')].map((d) => `- **${inline(d.querySelector('dt'))}**: ${inline(d.querySelector('dd'))}`).join('\n'));
      else if (c.classList.contains('tbl')) {
        const rows = [...c.querySelectorAll('tr')].map((r) => `| ${[...r.children].map(inline).join(' | ')} |`);
        if (c.querySelector('thead')) rows.splice(1, 0, `|${' --- |'.repeat(c.querySelector('tr').children.length)}`);
        out.push(rows.join('\n'));
      } else if (c.classList.contains('co')) out.push(`> **${inline(c.querySelector('.co-h'))}**: ${inline(c.querySelector('p'))}`);
      else if (c.classList.contains('pair')) out.push([...c.children].map((d) => `- ${inline(d.querySelector('b'))}: ${[...d.querySelectorAll('p, li')].map(inline).join('، ')}`).join('\n'));
      else if (c.classList.contains('faq')) out.push([...c.querySelectorAll('details')].map((d) => `### ${inline(d.querySelector('summary'))}\n${inline(d.querySelector('p'))}`).join('\n\n'));
    }
  };
  out.push(`# ${inline(el.querySelector('h1'))}`, inline(el.querySelector('.pg-lede')));
  walk(el.querySelector('.pg-body'));
  return out.filter(Boolean).join('\n\n') + '\n';
};
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const text = md(b.closest('.pg'));
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  const label = b.querySelector('span');
  b.classList.add('done'); b.querySelector('use').setAttribute('href', '#i-check'); label.textContent = W('g_copied');
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.classList.remove('done'); b.querySelector('use').setAttribute('href', '#i-copy'); label.textContent = T('g_copy'); }, 1600);
});

/* ---------------------------------------------------------------- quick search */
const pal = document.querySelector('[data-pal]');
const q = pal.querySelector('[data-palq]');
const list = pal.querySelector('[data-pall]');
let index = [], hits = [], sel = 0, opener = null;

// Arabic letters that people write either way count as the same letter; marks are ignored
const FOLD = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ئ': 'ي', 'ؤ': 'و' };
const norm = (s) => {
  let out = '';
  const map = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/[ً-ٰٟـ]/.test(ch)) continue;
    out += (FOLD[ch] || ch).toLowerCase();
    map.push(i);
  }
  return { out, map };
};
function build() {
  index = [];
  for (const p of pages) {
    const title = textOf(p.querySelector('h1'));
    const base = { pg: p, title, ic: p.dataset.ic, grp: T(p.dataset.grp) };
    index.push({ ...base, id: p.id, head: '', text: textOf(p.querySelector('.pg-lede')), w: 3 });
    for (const h of p.querySelectorAll('.pg-body h2[id]')) {
      let text = '', n = h.nextElementSibling;
      while (n && n.tagName !== 'H2') { text += ` ${textOf(n)}`; n = n.nextElementSibling; }
      index.push({ ...base, id: h.id, head: textOf(h), text: text.trim(), w: 2 });
    }
    for (const d of p.querySelectorAll('details[id]')) index.push({ ...base, id: d.id, head: textOf(d.querySelector('summary')), text: textOf(d.querySelector('p')), w: 2 });
  }
  for (const e of index) { e.nt = norm(e.title).out; e.nh = norm(e.head).out; e.nx = norm(e.text); }
}
const mark = (raw, n, terms) => {
  // highlight every term inside raw, using the folded copy to find it
  const spans = [];
  for (const t of terms) {
    let at = n.out.indexOf(t);
    while (at >= 0) { spans.push([n.map[at], n.map[at + t.length - 1] + 1]); at = n.out.indexOf(t, at + t.length); }
  }
  spans.sort((a, b) => a[0] - b[0]);
  let out = '', pos = 0;
  for (const [a, b] of spans) { if (a < pos) continue; out += esc(raw.slice(pos, a)) + `<mark>${esc(raw.slice(a, b))}</mark>`; pos = b; }
  return out + esc(raw.slice(pos));
};
const snippet = (e, terms) => {
  const first = Math.min(...terms.map((t) => e.nx.out.indexOf(t)).filter((x) => x >= 0));
  if (!Number.isFinite(first)) return esc(e.text.slice(0, 120)) + (e.text.length > 120 ? '…' : '');
  const at = e.nx.map[first];
  const a = Math.max(0, at - 40), b = Math.min(e.text.length, at + 100);
  const raw = e.text.slice(a, b);
  return (a > 0 ? '…' : '') + mark(raw, norm(raw), terms) + (b < e.text.length ? '…' : '');
};
// a short word (حد، PDF) must start a word; a longer one may sit anywhere inside one
const has = (str, t) => (t.length > 2 ? str.includes(t) : str.startsWith(t) || str.includes(` ${t}`));
function search() {
  // «الاشتراك» finds «اشتراكي»: the article and its joined letters are not part of the word
  const terms = norm(q.value.trim()).out.split(/\s+/).filter(Boolean)
    .map((t) => (t.length > 4 ? t.replace(/^(وال|بال|فال|كال|لل|ال)/, '') : t.length > 3 ? t.replace(/^ال/, '') : t));
  if (!terms.length) {
    hits = index.filter((e) => e.w === 3);
    list.innerHTML = `<p class="pal-cap">${W('g_pages')}</p>` + hits.map((e, i) => row(e, i, null)).join('');
  } else {
    hits = index.map((e) => {
      const all = `${e.nt} ${e.nh} ${e.nx.out}`;
      if (!terms.every((t) => has(all, t))) return null;
      const s = terms.reduce((n, t) => n + (has(e.nt, t) ? 6 : 0) + (has(e.nh, t) ? 4 : 0) + (has(e.nx.out, t) ? 1 : 0), e.w);
      return { e, s };
    }).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.e);
    list.innerHTML = hits.length ? hits.map((e, i) => row(e, i, terms)).join('') : `<p class="pal-none">${W('g_none')}</p>`;
  }
  sel = 0; paintSel();
}
const row = (e, i, terms) => `<a class="hit" href="#${e.id}" role="option" data-i="${i}">
  <svg class="ic"><use href="#${e.ic}"/></svg>
  <span class="hit-t"><span class="hit-path">${terms ? mark(e.title, norm(e.title), terms) : esc(e.title)}${e.head ? `<svg class="ic sep"><use href="#i-chev"/></svg><b>${terms ? mark(e.head, norm(e.head), terms) : esc(e.head)}</b>` : ''}</span>
  <span class="hit-x">${terms ? snippet(e, terms) : esc(e.grp)}</span></span>
  <kbd class="ent">↵</kbd></a>`;
const paintSel = () => [...list.querySelectorAll('.hit')].forEach((h, i) => { h.classList.toggle('on', i === sel); h.setAttribute('aria-selected', String(i === sel)); if (i === sel) h.scrollIntoView({ block: 'nearest' }); });
function openPal() {
  if (!pal.hidden) return;
  opener = document.activeElement;
  closeMenu();
  build();
  q.placeholder = W('g_find_ph');
  pal.hidden = false;
  document.documentElement.classList.add('pal-open');
  q.value = '';
  search();
  q.focus();
}
function closePal() {
  if (pal.hidden) return;
  pal.hidden = true;
  document.documentElement.classList.remove('pal-open');
  opener?.focus?.();
}
q.addEventListener('input', search);
q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (hits.length) { sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; paintSel(); } }
  else if (e.key === 'Enter') { e.preventDefault(); const h = hits[sel]; if (h) { closePal(); go(h.id); } }
});
list.addEventListener('mousemove', (e) => { const h = e.target.closest('.hit'); if (h && +h.dataset.i !== sel) { sel = +h.dataset.i; paintSel(); } });
list.addEventListener('click', (e) => { const h = e.target.closest('.hit'); if (h) { e.preventDefault(); closePal(); go(hits[+h.dataset.i].id); } });
pal.addEventListener('mousedown', (e) => { if (e.target === pal) closePal(); });
document.querySelectorAll('[data-find]').forEach((b) => b.addEventListener('click', openPal));
addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); }
  else if (e.key === '/' && !typing && pal.hidden) { e.preventDefault(); openPal(); }
  else if (e.key === 'Escape') { closePal(); closeMenu(); }
});
const go = (id) => { if (location.hash === `#${id}`) show(`#${id}`); else location.hash = id; };

/* ---------------------------------------------------------------- phone: the pages open as a sheet */
const menuBtn = dbar.querySelector('[data-menu]');
const setMenu = (open) => {
  side.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  document.documentElement.classList.toggle('menu-open', open);
};
function closeMenu() { setMenu(false); }
menuBtn.addEventListener('click', () => setMenu(!side.classList.contains('open')));

/* ---------------------------------------------------------------- go */
addEventListener('hashchange', () => show(location.hash));
show(location.hash, { scroll: !!location.hash });
onLang(() => { paintFrame(); rail(); if (!pal.hidden) { build(); q.placeholder = W('g_find_ph'); search(); } });

/* The folded reel — Zubda's signature object.
   A video drawn as its real frames (continuous time slices) over its real waveform, with
   Claude's notes dropped on top as pins. After the audit, the stretches that carry nothing
   fold away into pleats, so the reel physically shrinks from watch-time to read-time.
   Time follows the reading direction: right → left in Arabic, left → right in English.
   Everything is one canvas. */

const C = {
  ground: '#0f0f0d', panel: '#1c1b17', line: '#2a2923',
  cream: '#f2ede0', cream2: '#c9c3b4', cream3: '#8f8a7d', cream4: '#5c584f',
  butter: '#efd27a', butterDeep: '#b8963c', whey: '#5f6b72', whey2: '#353c41', tomato: '#e5664d',
};

const ease = (x) => 1 - Math.pow(1 - x, 3);
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export const FILLER_AR = {
  intro: 'مقدمة', outro: 'خاتمة', sponsor: 'إعلان', self_promo: 'ترويج للقناة', chit_chat: 'سوالف',
  repetition: 'تكرار', tangent: 'خروج عن الموضوع', silence: 'صمت', music: 'موسيقى', recap: 'إعادة تلخيص',
  quiet: 'بلا كلام',
};

export function fmt(t) {
  t = Math.max(0, Math.floor(t || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export class Reel {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.compact = !!opts.compact;
    this.ltr = opts.ltr != null ? !!opts.ltr : document.documentElement.dir === 'ltr';
    this.d = { duration: 1, frames: [], peaks: [], runs: null, notes: [], windows: [], frameBase: '' };
    this.p = 0;            // fold progress 0..1
    this.hoverX = null;
    this.hl = null;        // highlighted range [t0, t1]
    this.imgs = new Map();
    this.anims = new Set();
    this.dirty = true;
    this.listeners = {};
    this._loop = this._loop.bind(this);
    this._resize();
    this.ro = new ResizeObserver(() => { this._resize(); this.invalidate(); });
    this.ro.observe(canvas);
    if (!this.compact) this._bindPointer();
    requestAnimationFrame(this._loop);
  }

  on(ev, fn) { this.listeners[ev] = fn; return this; }
  _emit(ev, ...a) { this.listeners[ev] && this.listeners[ev](...a); }

  destroy() { this.ro.disconnect(); this.dead = true; }

  /* ---------------- data ---------------- */
  set(patch) {
    Object.assign(this.d, patch);
    if (patch.frames) for (const f of patch.frames) this._img(f);
    if (patch.runs !== undefined || patch.duration) this._segments();
    this.invalidate();
  }

  addFrame(f) {
    if (this.d.frames.some((x) => x.id === f.id)) return;
    f._born = performance.now();
    this.d.frames.push(f);
    this.d.frames.sort((a, b) => a.t - b.t);
    this._img(f);
    this._kick(420);
  }

  addPins(pins) {
    const now = performance.now();
    pins.forEach(([t, imp], i) => this.d.notes.push({ t, importance: imp, _born: now + i * 18 }));
    this._kick(900 + pins.length * 18);
  }

  setWindows(ws) { this.d.windows = ws; this._kick(600); }

  _img(f) {
    if (!f || this.imgs.has(f.id)) return;
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => this.invalidate();
    im.src = `${this.d.frameBase}${f.thumb}`;
    this.imgs.set(f.id, im);
  }

  /* Segments: flat stretches keep their length, folds collapse to pleats as p → 1. */
  _segments() {
    const D = this.d.duration || 1;
    const runs = this.d.runs;
    const segs = [];
    if (!runs || !runs.length) {
      segs.push({ t: 0, t_end: D, fold: false });
    } else {
      for (const r of runs) {
        const st = r.state;
        const len = r.t_end - r.t;
        const foldable = (st.startsWith('filler') || st === 'quiet') && len >= 6;
        const reason = st.startsWith('filler:') ? st.slice(7) : st === 'quiet' ? 'quiet' : null;
        const last = segs[segs.length - 1];
        if (!foldable) {
          if (last && !last.fold) { last.t_end = r.t_end; continue; }
          segs.push({ t: r.t, t_end: r.t_end, fold: false });
        } else {
          if (last && last.fold) { last.t_end = r.t_end; last.reasons.add(reason); continue; }
          segs.push({ t: r.t, t_end: r.t_end, fold: true, reasons: new Set([reason]) });
        }
      }
    }
    this.segs = segs;
    this.stateAt = runs ? this._stateIndex(runs, D) : null;
  }

  _stateIndex(runs, D) {
    const arr = new Array(Math.ceil(D) + 1).fill('detail');
    for (const r of runs) for (let k = Math.floor(r.t); k < Math.min(arr.length, Math.ceil(r.t_end)); k++) arr[k] = r.state;
    return arr;
  }

  folds() {
    return (this.segs || []).filter((s) => s.fold).map((s) => ({ t: s.t, t_end: s.t_end, reasons: [...s.reasons] }));
  }

  /* ---------------- geometry ---------------- */
  _resize() {
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(10, r.width);
    this.H = Math.max(10, r.height);
    this.cv.width = Math.round(this.W * dpr);
    this.cv.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const H = this.H;
    if (this.compact) {
      this.L = { pinY: 0, pinH: 8, frY: 10, frH: H - 22, wvY: H - 11, wvH: 11, ruler: false };
    } else {
      const pinH = 26, wvH = Math.round(H * 0.17), ruler = 14;
      this.L = { pinY: 0, pinH, frY: pinH + 6, frH: H - pinH - 6 - wvH - 6 - ruler, wvY: H - wvH - ruler, wvH, rulerY: H - ruler + 3, ruler: true };
    }
  }

  _layout() {
    // returns per-segment [x0, width] in "distance from the right edge"
    const W = this.W, p = this.p, segs = this.segs || [];
    const foldW = Math.max(9, Math.min(20, W * 0.011));
    let flat = 0, fold = 0, nf = 0;
    for (const s of segs) { const len = s.t_end - s.t; if (s.fold) { fold += len; nf++; } else flat += len; }
    const k = (W - p * nf * foldW) / Math.max(1e-6, flat + (1 - p) * fold);
    let acc = 0;
    for (const s of segs) {
      const len = s.t_end - s.t;
      s.w = s.fold ? len * k * (1 - p) + foldW * p : len * k;
      s.x = acc;
      acc += s.w;
    }
    this.k = k;
  }

  // time → canvas x (left coordinate)
  X(t) {
    const segs = this.segs || [];
    for (const s of segs) {
      if (t <= s.t_end || s === segs[segs.length - 1]) {
        const f = (Math.min(Math.max(t, s.t), s.t_end) - s.t) / Math.max(1e-6, s.t_end - s.t);
        const d = s.x + f * s.w;
        return this.ltr ? d : this.W - d;
      }
    }
    return this.ltr ? 0 : this.W;
  }

  // canvas x → time
  T(x) {
    const d = this.ltr ? x : this.W - x;
    for (const s of this.segs || []) {
      if (d <= s.x + s.w) return s.t + ((d - s.x) / Math.max(1e-6, s.w)) * (s.t_end - s.t);
    }
    return this.d.duration;
  }

  segAt(t) { return (this.segs || []).find((s) => t >= s.t && t <= s.t_end); }

  /* ---------------- animation ---------------- */
  invalidate() { this.dirty = true; }
  _kick(ms) { const until = performance.now() + ms; this.anims.add(until); this.invalidate(); }

  fold(to = 1, ms = 1200) {
    const from = this.p, t0 = performance.now();
    this._foldAnim = { from, to, t0, ms };
    this._kick(ms + 50);
    return new Promise((r) => setTimeout(r, ms));
  }

  highlight(range) { this.hl = range; this.invalidate(); }

  _loop(now) {
    if (this.dead) return;
    for (const u of [...this.anims]) if (u < now) this.anims.delete(u);
    const live = this.anims.size > 0 || this.d.windows.some((w) => w.state === 'reading');
    if (this._foldAnim) {
      const a = this._foldAnim;
      const x = Math.min(1, (now - a.t0) / a.ms);
      this.p = a.from + (a.to - a.from) * easeIO(x);
      if (x >= 1) this._foldAnim = null;
    }
    if (this.dirty || live) { this._draw(now); this.dirty = false; }
    requestAnimationFrame(this._loop);
  }

  /* ---------------- drawing ---------------- */
  _colorAt(t) {
    if (!this.stateAt) return C.cream3;
    const s = this.stateAt[Math.min(this.stateAt.length - 1, Math.max(0, Math.floor(t)))] || 'detail';
    if (s === 'core') return C.butter;
    if (s === 'detail') return C.cream3;
    if (s === 'gap') return C.tomato;
    if (s === 'quiet') return C.whey2;
    return C.whey;
  }

  _draw(now) {
    const ctx = this.ctx, W = this.W, H = this.H, L = this.L, D = this.d.duration || 1;
    if (!this.segs) this._segments();
    this._layout();
    ctx.clearRect(0, 0, W, H);

    // frame lane ground
    ctx.fillStyle = C.panel;
    ctx.fillRect(0, L.frY, W, L.frH);

    this._drawFrames(now);
    this._drawWave();
    this._drawFolds();
    if (!this.compact) {
      this._drawWindows(now);
      this._drawPins(now);
      if (L.ruler) this._drawRuler();
      this._drawHighlight();
      this._drawHover();
    } else {
      this._drawPins(now);
    }
  }

  _drawFrames(now) {
    const ctx = this.ctx, L = this.L, fr = this.d.frames, D = this.d.duration || 1;
    if (!fr.length) {
      // empty reel: a quiet ladder of time cells so the shape reads before frames arrive
      ctx.fillStyle = '#1b1b17';
      const n = Math.max(12, Math.round(this.W / 46));
      for (let i = 0; i < n; i++) {
        const x = (this.W / n) * i;
        ctx.fillRect(x + 1, L.frY + 1, this.W / n - 2, L.frH - 2);
      }
      return;
    }
    // each view owns the time from its own start to the next view's start; while frames are
    // still arriving, a view only covers its own span so the strip fills in where things happen
    const done = this.d.framesComplete !== false;
    for (let i = 0; i < fr.length; i++) {
      const f = fr[i];
      const nx = fr[i + 1];
      const s0 = f.start != null ? f.start : f.t;
      const s1 = f.end != null && f.end > s0 ? f.end : f.t + 2;
      const a = i === 0 && done ? 0 : s0;
      const b = nx ? (nx.start != null ? nx.start : nx.t) : done ? D : s1;
      const xr = this.X(a), xl = this.X(b);
      const x = Math.min(xl, xr), w = Math.abs(xr - xl);
      if (w < 0.4) continue;
      const born = f._born ? Math.min(1, (now - f._born) / 380) : 1;
      if (born < 1) this.invalidate();
      const im = this.imgs.get(f.id);
      const y = L.frY + (1 - ease(born)) * 10;
      ctx.save();
      ctx.globalAlpha = ease(born);
      ctx.beginPath();
      ctx.rect(x, L.frY, w, L.frH);
      ctx.clip();
      if (im && im.complete && im.naturalWidth) {
        const ar = im.naturalWidth / im.naturalHeight;
        const sliceAr = w / L.frH;
        let sw, sh, sx, sy;
        if (sliceAr < ar) { sh = im.naturalHeight; sw = sh * sliceAr; sx = (im.naturalWidth - sw) / 2; sy = 0; }
        else { sw = im.naturalWidth; sh = sw / sliceAr; sx = 0; sy = (im.naturalHeight - sh) / 2; }
        ctx.drawImage(im, sx, sy, sw, sh, x, y, w, L.frH);
      } else {
        ctx.fillStyle = '#22221d';
        ctx.fillRect(x, y, w, L.frH);
      }
      ctx.restore();
      // hairline seam between views
      if (w > 3) {
        ctx.fillStyle = 'rgba(15,15,13,.85)';
        ctx.fillRect(Math.round(x), L.frY, 1, L.frH);
      }
    }
    // states veil: filler gets whey wash, before analysis nothing
    if (this.stateAt) {
      for (const s of this.segs) {
        if (!s.fold) continue;
        const x0 = this.X(s.t_end), x1 = this.X(s.t);
        ctx.fillStyle = `rgba(28,33,36,${0.55 + 0.35 * this.p})`;
        ctx.fillRect(x0, L.frY, x1 - x0, L.frH);
      }
    }
  }

  _drawWave() {
    const ctx = this.ctx, L = this.L, peaks = this.d.peaks || [], D = this.d.duration || 1;
    const mid = L.wvY + L.wvH / 2;
    ctx.fillStyle = '#1a1a16';
    ctx.fillRect(0, mid - 0.5, this.W, 1);
    if (!peaks.length) return;
    const n = peaks.length;
    const step = this.compact ? 2 : 2;
    for (let x = 0; x < this.W; x += step) {
      const t0 = this.T(x + step), t1 = this.T(x);
      const i0 = Math.max(0, Math.floor((Math.min(t0, t1) / D) * n));
      const i1 = Math.min(n - 1, Math.ceil((Math.max(t0, t1) / D) * n));
      let m = 0;
      for (let i = i0; i <= i1; i++) if (peaks[i] > m) m = peaks[i];
      const h = Math.max(1, m * (L.wvH - 2));
      ctx.fillStyle = this._colorAt((t0 + t1) / 2);
      ctx.fillRect(x, mid - h / 2, step - 0.6, h);
    }
  }

  _drawFolds() {
    if (this.p <= 0.001 || !this.segs) return;
    const ctx = this.ctx, L = this.L;
    const top = L.frY, bot = L.wvY + L.wvH;
    for (const s of this.segs) {
      if (!s.fold) continue;
      const x0 = this.X(s.t_end), x1 = this.X(s.t), w = x1 - x0;
      if (Math.abs(w) < 1) continue;
      const n = Math.max(3, Math.min(7, Math.round(Math.abs(w) / 3)));
      const fw = w / n;
      for (let i = 0; i < n; i++) {
        const fx = x0 + i * fw;
        const g = ctx.createLinearGradient(fx, 0, fx + fw, 0);
        const lightFirst = i % 2 === 0;
        const a = 0.18 + 0.5 * this.p, b = 0.02;
        g.addColorStop(0, lightFirst ? `rgba(242,237,224,${a * 0.55})` : `rgba(0,0,0,${a})`);
        g.addColorStop(1, lightFirst ? `rgba(0,0,0,${b + a * 0.6})` : `rgba(242,237,224,${a * 0.25})`);
        ctx.fillStyle = g;
        ctx.fillRect(fx, top, fw, bot - top);
      }
      // crease hairlines top and bottom: the fold reads as paper, not as a gap
      ctx.fillStyle = `rgba(242,237,224,${0.22 * this.p})`;
      ctx.fillRect(x0, top, w, 1);
      ctx.fillRect(x0, bot - 1, w, 1);
    }
  }

  _drawPins(now) {
    const ctx = this.ctx, L = this.L, notes = this.d.notes;
    const base = this.compact ? L.pinY + L.pinH : L.pinY + L.pinH;
    // draw low importance first so butter heads sit on top
    const sorted = [...notes].sort((a, b) => a.importance - b.importance);
    for (const n of sorted) {
      const born = n._born ? Math.max(0, Math.min(1, (now - n._born) / 520)) : 1;
      if (born < 1) this.invalidate();
      const x = Math.round(this.X(n.t)) + 0.5;
      const seg = this.segAt(n.t);
      const folded = seg && seg.fold ? 1 - 0.85 * this.p : 1;
      const h = (this.compact ? [0, 3, 5, 8] : [0, 7, 13, 21])[n.importance] * ease(born);
      const drop = (1 - ease(born)) * -8;
      ctx.globalAlpha = Math.min(1, born * 1.4) * folded;
      ctx.fillStyle = n.importance === 3 ? C.butter : n.importance === 2 ? C.cream3 : C.cream4;
      ctx.fillRect(x - 0.5, base - h + drop, 1, h);
      if (n.importance === 3 && !this.compact) {
        ctx.beginPath();
        ctx.arc(x, base - h + drop, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawWindows(now) {
    const ctx = this.ctx, L = this.L;
    for (const w of this.d.windows) {
      const xa = this.X(w.t_end), xb = this.X(w.t), x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
      if (w.state === 'reading') {
        // a bracket over the window and a scan band sweeping the frames inside it
        const ph = ((now / 1600) + w.i * 0.37) % 1;
        const sx = this.ltr ? x0 + (x1 - x0) * ph : x1 - (x1 - x0) * ph;
        const g = this.ctx.createLinearGradient(sx + 40, 0, sx - 40, 0);
        g.addColorStop(0, 'rgba(239,210,122,0)');
        g.addColorStop(0.5, 'rgba(239,210,122,.22)');
        g.addColorStop(1, 'rgba(239,210,122,0)');
        ctx.fillStyle = g;
        ctx.fillRect(Math.max(x0, sx - 40), L.frY, Math.min(80, x1 - x0), L.frH);
        ctx.fillStyle = C.butter;
        ctx.globalAlpha = 0.9;
      } else if (w.state === 'queued') {
        ctx.fillStyle = C.cream4;
        ctx.globalAlpha = 0.6;
      } else {
        ctx.fillStyle = C.butterDeep;
        ctx.globalAlpha = 0.35;
      }
      const y = 3;
      ctx.fillRect(x0 + 2, y, x1 - x0 - 4, 1);
      ctx.fillRect(x0 + 2, y, 1, 5);
      ctx.fillRect(x1 - 3, y, 1, 5);
      ctx.globalAlpha = 1;
    }
  }

  _drawRuler() {
    const ctx = this.ctx, L = this.L, D = this.d.duration || 1;
    const steps = [10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
    const want = Math.max(4, Math.floor(this.W / 110));
    const step = steps.find((s) => D / s <= want) || 3600;
    ctx.font = '10px "Fragment Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    let lastX = 1e9;
    for (let t = 0; t <= D + 0.1; t += step) {
      const seg = this.segAt(Math.min(t, D));
      if (seg && seg.fold && this.p > 0.5 && t > seg.t && t < seg.t_end) continue;
      const x = this.X(Math.min(t, D));
      if (Math.abs(lastX - x) < 46) continue;
      lastX = x;
      ctx.fillStyle = C.cream4;
      ctx.fillRect(Math.round(x), L.rulerY - 3, 1, 3);
      const label = fmt(t);
      const tx = Math.min(this.W - 16, Math.max(16, x));
      ctx.fillText(label, tx, L.rulerY + 1);
    }
  }

  _drawHighlight() {
    if (!this.hl) return;
    const ctx = this.ctx, L = this.L;
    const [a, b] = this.hl;
    const x0 = Math.min(this.X(b), this.X(a)), x1 = Math.max(this.X(b), this.X(a));
    const w = Math.max(3, x1 - x0);
    ctx.fillStyle = 'rgba(15,15,13,.55)';
    ctx.fillRect(0, L.frY, x0, L.frH);
    ctx.fillRect(x0 + w, L.frY, this.W - x0 - w, L.frH);
    ctx.strokeStyle = C.butter;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0 + 0.75, L.frY + 0.75, w - 1.5, L.frH - 1.5);
  }

  _drawHover() {
    if (this.hoverX == null) return;
    const ctx = this.ctx, L = this.L;
    ctx.fillStyle = C.cream;
    ctx.fillRect(Math.round(this.hoverX), L.frY - 4, 1, L.wvY + L.wvH - L.frY + 8);
  }

  _bindPointer() {
    const cv = this.cv;
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      this.hoverX = e.clientX - r.left;
      const t = this.T(this.hoverX);
      this.invalidate();
      this._emit('hover', t, e, this.segAt(t));
    });
    cv.addEventListener('pointerleave', () => { this.hoverX = null; this.invalidate(); this._emit('hover', null); });
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const t = this.T(e.clientX - r.left);
      this._emit('pick', t, this.segAt(t));
    });
  }
}

/* The opening shot, once per visit: a BIOS boot, the Earth from orbit diving onto Dushanbe,
   a target lock, the name, then the tube switches off onto the site. Any key, click or tap skips it. */
(() => {
  'use strict';

  const root = document.documentElement;
  const layer = document.getElementById('intro');
  if (!layer || !root.classList.contains('intro-on')) { if (layer) layer.remove(); return; }

  const DEG = Math.PI / 180;
  const T_BOOT = 1200;        // BIOS lines
  const T_DIVE = 2400;        // Earth spins down onto Dushanbe
  const T_LOCK = 700;         // brackets close, the lock line prints
  const T_NAME = 1100;        // the name decrypts
  const T_OFF = 550;          // the tube collapses onto the site
  const RAMP = ' .,:;-=+*%#@';
  const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&@01';

  const canvas = layer.querySelector('canvas');
  const log = layer.querySelector('.intro__log');
  const lock = layer.querySelector('.intro__lock');
  const name = layer.querySelector('.intro__name');
  const sub = layer.querySelector('.intro__sub');
  const g = canvas.getContext('2d');
  let done = false;
  let raf = 0;

  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const css = getComputedStyle(root);
  const ink = css.getPropertyValue('--amber').trim() || '#ffb000';
  const hot = css.getPropertyValue('--amber-hot').trim() || '#ffd27a';

  /* ---------- 1. the BIOS ---------- */
  const BOOT = [
    'BEKHA-OS BIOS v1.969   (c) 2021-2026 dushanbe',
    'cpu: caffeine-x86 @ 4.20 GHz ......... ok',
    'memory test: 640K .................... ok',
    'mounting /work ....................... 9 projects',
    'uplink: orbit -> earth -> dushanbe ... ',
  ];
  BOOT.forEach((line, i) => setTimeout(() => { if (!done) log.textContent += line + '\n'; }, 80 + i * (T_BOOT / BOOT.length)));

  /* ---------- 2 and 3. the dive and the lock ---------- */
  let cw = 9, ch = 15, cols = 0, rows = 0, dpr = 1, W = 0, H = 0;
  function fit() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    cw = W < 700 ? 7 : 9; ch = Math.round(cw * 1.66);
    cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);
  }
  fit();
  window.addEventListener('resize', fit);

  function drawEarth(t) {
    const G = window.bekhaGlobe;
    if (!G) return;
    const home = G.HOME;
    const p = ease(t);
    /* two fast turns that brake onto Dushanbe's longitude; the tilt brings its latitude to the middle */
    const rot = home.lon * DEG - (1 - p) * Math.PI * 4;
    const tilt = -home.lat * DEG * p;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const R = Math.min(W, H) * (0.3 + 0.95 * Math.pow(p, 2));      // from the whole planet down to the region, coastlines still readable
    const sun = [-0.35, 0.3, 0.88];
    const cx = W / 2, cy = H / 2;
    const last = RAMP.length - 1;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.font = `600 ${Math.round(ch * 0.95 * dpr)}px "IBM Plex Mono", ui-monospace, monospace`;
    g.textBaseline = 'top';
    g.fillStyle = ink;
    for (let j = 0; j < rows; j++) {
      const y = -((j + 0.5) * ch - cy) / R;
      if (Math.abs(y) > 1) continue;
      for (let i = 0; i < cols; i++) {
        const x = ((i + 0.5) * cw - cx) / R;
        const v = G.shade(x, y, rot, ct, st, sun);
        if (v <= 0.04) continue;
        g.globalAlpha = Math.min(1, 0.4 + v);
        g.fillText(RAMP[Math.min(last, Math.max(1, Math.round(v * last)))], i * cw * dpr, j * ch * dpr);
      }
    }
    g.globalAlpha = 1;
  }

  function drawLock(t) {
    const p = ease(t);
    const cx = W / 2 * dpr, cy = H / 2 * dpr;
    const r = (220 - 180 * p) * dpr, arm = 18 * dpr;
    g.strokeStyle = hot;
    g.lineWidth = 2 * dpr;
    g.beginPath();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      g.moveTo(cx + sx * r, cy + sy * (r - arm)); g.lineTo(cx + sx * r, cy + sy * r); g.lineTo(cx + sx * (r - arm), cy + sy * r);
    });
    g.stroke();
    if (p > 0.95) { g.fillStyle = hot; g.fillRect(cx - 3 * dpr, cy - 3 * dpr, 6 * dpr, 6 * dpr); }
  }

  /* ---------- 4. the name ---------- */
  function decryptTo(el, text, ms) {
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const fixed = Math.floor(p * text.length);
      el.textContent = text.split('').map((c, i) => (i < fixed || c === ' ' ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('');
      if (p < 1 && !done) requestAnimationFrame(step); else el.textContent = text;
    };
    requestAnimationFrame(step);
  }

  /* ---------- the timeline ---------- */
  const t0 = performance.now();
  const A = T_BOOT, B = A + T_DIVE, C = B - 600, D = C + T_LOCK, E = D + T_NAME;
  let locked = false, named = false;
  function frame() {
    if (done) return;
    const t = performance.now() - t0;   /* the rAF timestamp can lag performance.now(): use one clock */
    if (t >= A && t < D + 150) {
      if (!layer.classList.contains('is-diving')) layer.classList.add('is-diving');
      drawEarth((t - A) / T_DIVE);
      if (t >= C) drawLock((t - C) / T_LOCK);
      if (t >= C + 250 && !locked) {
        locked = true;
        const tr = window.bekhaI18n ? window.bekhaI18n.lang : 'en';
        lock.textContent = tr === 'ru' ? 'ЦЕЛЬ ЗАХВАЧЕНА: ДУШАНБЕ 38.56N 68.77E' : 'TARGET LOCKED: DUSHANBE 38.56N 68.77E';
        layer.classList.add('is-locked');
      }
    }
    if (t >= D && !named) {
      named = true;
      layer.classList.add('is-named');
      const tr = window.bekhaI18n ? window.bekhaI18n.lang : 'en';
      decryptTo(name, tr === 'ru' ? 'БЕХА' : 'BEKHA', 700);
      setTimeout(() => decryptTo(sub, tr === 'ru' ? 'full-stack разработчик' : 'full-stack developer', 500), 250);
    }
    if (t >= E) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    try { sessionStorage.setItem('intro', '1'); sessionStorage.setItem('seen', '1'); } catch (e) { /* plays again next time */ }
    layer.classList.add('is-off');
    setTimeout(() => {
      layer.remove();
      root.classList.remove('intro-on');
      document.dispatchEvent(new CustomEvent('bekha:intro-done'));
    }, T_OFF);
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.removeEventListener(ev, finish, true));
  }

  ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, finish, { capture: true, passive: true }));
  setTimeout(finish, E + 2500);   // whatever happens, the site comes up
  raf = requestAnimationFrame(frame);
})();

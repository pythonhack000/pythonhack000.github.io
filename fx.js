/* Five small things on top of the page: TV static between projects, a console note for developers,
   a rare green signal, a ghost at the keyboard when nobody types, and hero depth under the pointer. */
(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RARE_CHANCE = 0.03;
  const GHOST_IDLE_MS = 6000;
  const GHOST_TYPE_MS = 85;
  const STATIC_MS = 260;
  const PARALLAX_PX = 14;
  const t = (k, ...a) => (window.bekhaI18n ? window.bekhaI18n.t(k, ...a) : k);

  /* ---------- 1. the project screen is a TV: static between channels and an on-screen channel number ---------- */
  const crt = document.querySelector('.screen__crt');
  if (crt) {
    const noise = document.createElement('canvas');
    noise.className = 'screen__static';
    noise.setAttribute('aria-hidden', 'true');
    const osd = document.createElement('span');
    osd.className = 'screen__osd';
    osd.setAttribute('aria-hidden', 'true');
    crt.append(noise, osd);
    const g = noise.getContext('2d');
    let until = 0;
    let osdTimer = 0;

    const snow = () => {
      if (!g) return;
      const w = (noise.width = 160), h = (noise.height = 100);
      const img = g.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = v; img.data[i + 1] = v * 0.72; img.data[i + 2] = v * 0.2; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      if (performance.now() < until) requestAnimationFrame(snow);
      else noise.classList.remove('is-on');
    };

    document.addEventListener('bekha:channel', (e) => {
      const { port } = e.detail || {};
      osd.textContent = `CH ${port}`;
      osd.classList.add('is-on');
      clearTimeout(osdTimer);
      osdTimer = setTimeout(() => osd.classList.remove('is-on'), 1600);
      if (REDUCED) return;
      until = performance.now() + STATIC_MS;
      noise.classList.add('is-on');
      requestAnimationFrame(snow);
    });
  }

  /* ---------- 2. a note in the devtools console, for the people who open it ---------- */
  const banner = [
    ' ____  _____ _  ___   _    _    ',
    '| __ )| ____| |/ / | | |  / \\   ',
    '|  _ \\|  _| | \' /| |_| | / _ \\  ',
    '| |_) | |___| . \\|  _  |/ ___ \\ ',
    '|____/|_____|_|\\_\\_| |_/_/   \\_\\',
  ].join('\n');
  /* eslint-disable no-console -- the console note is the feature */
  console.log(`%c${banner}`, 'color:#ffb000;font-family:monospace;font-size:12px;text-shadow:0 0 6px #ffb000');
  console.log('%cyou opened the console, so you are one of us.\nsource: https://github.com/pythonhack000/pythonhack000.github.io\nhiring? telegram @sabrsf0', 'color:#f1e2c2;font-family:monospace;font-size:13px;line-height:1.6');
  /* eslint-enable no-console */

  /* ---------- 3. a rare signal: a few visits in a hundred come up in green phosphor ---------- */
  let rare = false;
  try {
    const chosen = localStorage.getItem('theme');
    if (!chosen && !sessionStorage.getItem('rare-rolled')) {
      sessionStorage.setItem('rare-rolled', '1');
      if (Math.random() < RARE_CHANCE) { rare = true; document.documentElement.dataset.theme = 'green'; }
    }
  } catch (e) { /* no storage: no lottery */ }
  if (rare) {
    const say = () => window.bekhaShell?.print(t('rareSignal'), 'hl');
    if (window.bekhaShell) setTimeout(say, 1600); else document.addEventListener('DOMContentLoaded', () => setTimeout(say, 1600));
  }

  /* ---------- 4. the ghost at the keyboard: if nobody types, the shell shows what it can do ---------- */
  const form = document.getElementById('termForm');
  const input = document.getElementById('termIn');
  if (form && input && !REDUCED) {
    const SCRIPT = ['help', 'ls work', 'cat lunar'];
    let step = 0, idle = 0, typing = 0, stopped = false;
    const stop = () => {
      stopped = true;
      clearTimeout(idle); clearTimeout(typing);
      ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.removeEventListener(ev, onUser, true));
    };
    const onUser = (e) => {
      if (e.isTrusted) stop();
    };
    const typeLine = (line, i = 0) => {
      if (stopped) return;
      input.value = line.slice(0, i);
      if (i < line.length) { typing = setTimeout(() => typeLine(line, i + 1), GHOST_TYPE_MS + Math.random() * 60); return; }
      typing = setTimeout(() => {
        if (stopped) return;
        form.requestSubmit();
        step += 1;
        if (step < SCRIPT.length) idle = setTimeout(() => typeLine(SCRIPT[step]), 1800);
      }, 380);
    };
    let listening = false;
    const arm = () => {
      if (stopped || document.documentElement.classList.contains('intro-on')) return;
      if (!listening) {   /* only what the visitor does after the intro counts: the key that skipped it does not */
        listening = true;
        ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, onUser, true));
      }
      idle = setTimeout(() => {
        const r = form.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) typeLine(SCRIPT[step]); else arm();
      }, GHOST_IDLE_MS);
    };
    if (document.documentElement.classList.contains('intro-on')) document.addEventListener('bekha:intro-done', () => setTimeout(arm, 50), { once: true });
    else arm();
  }

  /* ---------- 5. depth in the hero: the name and the globe drift apart under the pointer ---------- */
  const nameEl = document.getElementById('name');
  const globe = document.querySelector('.torus');
  if (nameEl && globe && !REDUCED && window.matchMedia('(hover: hover)').matches) {
    let qx = 0, qy = 0, queued = false;
    const paint = () => {
      nameEl.style.transform = `translate3d(${qx * -PARALLAX_PX * 0.6}px, ${qy * -PARALLAX_PX * 0.4}px, 0)`;
      globe.style.transform = `translate3d(${qx * PARALLAX_PX}px, ${qy * PARALLAX_PX * 0.7}px, 0)`;
      queued = false;
    };
    window.addEventListener('pointermove', (e) => {
      if (window.scrollY > innerHeight) return;
      qx = e.clientX / innerWidth - 0.5; qy = e.clientY / innerHeight - 0.5;
      paint();   /* four or five letters: cheap enough to place on every move, no frame needed */
    }, { passive: true });
  }

  const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 6. a phosphor trail: glyphs left behind by the pointer, fading out ---------- */
  if (FINE && !REDUCED) {
    const TRAIL = '01<>/\\#*+=$';
    const STEP_PX = 18, LIFE_MS = 650, MAX = 90;
    const c = document.createElement('canvas');
    c.className = 'trail';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    const g = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; };
    size();
    window.addEventListener('resize', size);
    let bits = [], lx = -1e4, ly = -1e4, running = false;
    const css = getComputedStyle(document.documentElement);
    const color = () => css.getPropertyValue('--amber').trim() || '#ffb000';
    const tick = (now) => {
      g.clearRect(0, 0, c.width, c.height);
      g.font = `600 ${13 * dpr}px "IBM Plex Mono", monospace`;
      g.fillStyle = color();
      bits = bits.filter((b) => now - b.t < LIFE_MS);
      for (const b of bits) {
        const p = (now - b.t) / LIFE_MS;
        g.globalAlpha = (1 - p) * 0.85;
        g.fillText(b.ch, b.x * dpr, (b.y + p * 14) * dpr);
      }
      g.globalAlpha = 1;
      if (bits.length) requestAnimationFrame(tick); else running = false;
    };
    window.addEventListener('pointermove', (e) => {
      if (document.documentElement.classList.contains('intro-on')) return;
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (d < STEP_PX) return;
      lx = e.clientX; ly = e.clientY;
      bits.push({ x: e.clientX + 8, y: e.clientY + 4, ch: TRAIL[Math.floor(Math.random() * TRAIL.length)], t: performance.now() });
      if (bits.length > MAX) bits = bits.slice(-MAX);
      if (!running) { running = true; requestAnimationFrame(tick); }
    }, { passive: true });
  }

  /* ---------- 7. the name: every letter shies away from the pointer and glows hotter as it comes close ---------- */
  if (nameEl && FINE && !REDUCED) {
    const R = 220, PUSH = 26;
    let letters = [], rebuild = 0, px = -1e4, py = -1e4;
    const split = () => {
      const text = nameEl.textContent;
      if (!text || text !== (nameEl.dataset.text || text)) return;     /* still decrypting: wait */
      if (nameEl.querySelector('.ltr')) return;
      nameEl.textContent = '';
      letters = text.split('').map((ch) => {
        const s = document.createElement('span');
        s.className = 'ltr';
        s.textContent = ch;
        nameEl.appendChild(s);
        return s;
      });
      nameEl.setAttribute('aria-label', text);
    };
    const paint = () => {
      for (const s of nameEl.querySelectorAll('.ltr')) {
        const r = s.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy) || 1;
        const k = Math.max(0, 1 - d / R);
        s.style.transform = `translate(${(dx / d) * k * PUSH}px, ${(dy / d) * k * PUSH}px)`;
        s.style.setProperty('--heat', String(k));
      }
    };
    /* any write to the name (decrypt, language switch) drops the spans; split again once it settles */
    new MutationObserver(() => {
      if (nameEl.querySelector('.ltr')) return;
      letters = [];
      clearTimeout(rebuild);
      rebuild = setTimeout(split, 450);
    }).observe(nameEl, { childList: true, characterData: true, subtree: true });
    window.addEventListener('pointermove', (e) => {
      if (window.scrollY > innerHeight) return;
      px = e.clientX; py = e.clientY;
      paint();   /* four or five letters: cheap enough to place on every move, no frame needed */
    }, { passive: true });
    setTimeout(split, 1500);
  }
})();

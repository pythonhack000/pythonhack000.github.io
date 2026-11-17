/* BEKHA-OS windows: a port in /work boots the live project in a window you can drag, minimise, maximise and close.
   Desktop only; on a phone, and with cmd/ctrl-click, the link opens as before. */
(() => {
  'use strict';

  const MAX_WINDOWS = 4;
  const CASCADE_PX = 34;
  const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wide = () => window.innerWidth >= 1000;
  const t = (k, ...a) => (window.bekhaI18n ? window.bekhaI18n.t(k, ...a) : k);

  const taskbar = document.createElement('nav');
  taskbar.className = 'taskbar';
  taskbar.setAttribute('aria-label', 'BEKHA-OS windows');
  taskbar.hidden = true;
  document.body.appendChild(taskbar);

  let z = 300;
  let opened = 0;
  const wins = new Map();   // url -> { el, btn }

  const syncTaskbar = () => { taskbar.hidden = wins.size === 0; };

  function focus(w) {
    z += 1;
    w.el.style.zIndex = String(z);
    wins.forEach((o) => o.el.classList.toggle('is-front', o === w));
  }

  function close(url) {
    const w = wins.get(url);
    if (!w) return;
    w.el.classList.add('is-closing');
    setTimeout(() => { w.el.remove(); w.btn.remove(); wins.delete(url); syncTaskbar(); }, 180);
  }

  function open({ url, name, port }) {
    if (wins.has(url)) {
      const w = wins.get(url);
      w.el.hidden = false;
      w.el.classList.remove('is-min');
      focus(w);
      return;
    }
    if (wins.size >= MAX_WINDOWS) close(wins.keys().next().value);   // the oldest window makes room

    const el = document.createElement('section');
    el.className = 'win';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', name);
    const n = opened++ % 6;
    el.style.left = `${8 + n * CASCADE_PX / window.innerWidth * 100}vw`;
    el.style.top = `${10 + n * CASCADE_PX / window.innerHeight * 100}vh`;

    const bar = document.createElement('header');
    bar.className = 'win__bar';
    const title = document.createElement('span');
    title.className = 'win__title';
    title.textContent = `${port}  ${name}`;
    const btns = document.createElement('div');
    btns.className = 'win__btns';
    const mk = (label, aria, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', aria);
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      btns.appendChild(b);
      return b;
    };
    const ext = document.createElement('a');
    ext.className = 'win__ext'; ext.href = url; ext.target = '_blank'; ext.rel = 'noopener';
    ext.textContent = '[ ↗ ]'; ext.setAttribute('aria-label', `Open ${name} in a new tab`);
    btns.appendChild(ext);
    mk('_', `Minimise ${name}`, () => { el.classList.add('is-min'); el.hidden = true; });
    mk('[ ]', `Maximise ${name}`, () => el.classList.toggle('is-max'));
    mk('x', `Close ${name}`, () => close(url));
    bar.append(title, btns);

    const body = document.createElement('div');
    body.className = 'win__body';
    const boot = document.createElement('pre');
    boot.className = 'win__boot';
    boot.textContent = `${t('osBoot', name)}\n[`;
    const frame = document.createElement('iframe');
    frame.title = name;
    frame.src = url;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock');
    frame.setAttribute('allow', 'fullscreen');
    frame.referrerPolicy = 'no-referrer';
    let ticks = 0;
    const bootTimer = setInterval(() => { ticks += 1; boot.textContent += '#'; if (ticks > 40) clearInterval(bootTimer); }, 70);
    frame.addEventListener('load', () => {
      clearInterval(bootTimer);
      boot.textContent += '] ok';
      setTimeout(() => body.classList.add('is-up'), 250);
    });
    body.append(frame, boot);

    const grip = document.createElement('span');
    grip.className = 'win__grip';
    grip.setAttribute('aria-hidden', 'true');
    el.append(bar, body, grip);
    document.body.appendChild(el);

    /* drag by the title bar; the iframe ignores the pointer while dragging so it cannot swallow the move */
    let drag = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a') || el.classList.contains('is-max')) return;
      const r = el.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      el.classList.add('is-dragging');
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const x = Math.min(window.innerWidth - 120, Math.max(-el.offsetWidth + 160, e.clientX - drag.dx));
      const y = Math.min(window.innerHeight - 40, Math.max(0, e.clientY - drag.dy));
      el.style.left = `${x}px`; el.style.top = `${y}px`;
    });
    const endDrag = () => { drag = null; el.classList.remove('is-dragging'); };
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);
    bar.addEventListener('dblclick', () => el.classList.toggle('is-max'));

    /* resize from the corner */
    let size = null;
    grip.addEventListener('pointerdown', (e) => {
      size = { x: e.clientX, y: e.clientY, w: el.offsetWidth, h: el.offsetHeight };
      el.classList.add('is-dragging');
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener('pointermove', (e) => {
      if (!size) return;
      el.style.width = `${Math.max(380, size.w + e.clientX - size.x)}px`;
      el.style.height = `${Math.max(260, size.h + e.clientY - size.y)}px`;
    });
    const endSize = () => { size = null; el.classList.remove('is-dragging'); };
    grip.addEventListener('pointerup', endSize);
    grip.addEventListener('pointercancel', endSize);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'taskbar__item';
    btn.textContent = `${port}  ${name}`;
    btn.addEventListener('click', () => {
      const w = wins.get(url);
      if (!w) return;
      const front = w.el.classList.contains('is-front') && !w.el.hidden;
      if (front) { w.el.hidden = true; w.el.classList.add('is-min'); }
      else { w.el.hidden = false; w.el.classList.remove('is-min'); focus(w); }
    });
    taskbar.appendChild(btn);

    const w = { el, btn };
    wins.set(url, w);
    el.addEventListener('pointerdown', () => focus(w), true);
    focus(w);
    syncTaskbar();
    window.bekhaExtras?.sound.thunk();
  }

  /* a live port opens in a window; cmd/ctrl/shift-click, a phone or a narrow window keep the plain link */
  const bootable = (href) => href && href.startsWith('https://pythonhack000.github.io/');
  document.querySelectorAll('.row a.row__link').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (!FINE || !wide() || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !bootable(a.href)) return;
      e.preventDefault();
      const row = a.closest('.row');
      open({
        url: a.href,
        name: row.querySelector('.row__name')?.textContent ?? a.href,
        port: row.querySelector('.row__port')?.textContent ?? '',
      });
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !wins.size) return;
    const front = [...wins.entries()].find(([, w]) => w.el.classList.contains('is-front') && !w.el.hidden);
    if (front) close(front[0]);
  });

  window.bekhaOS = {
    run(name) {
      const row = [...document.querySelectorAll('.row')].find((r) => (r.querySelector('.row__name')?.textContent ?? '').startsWith(name));
      const a = row?.querySelector('a.row__link');
      if (!a || !bootable(a.href)) return false;
      if (!FINE || !wide()) { window.open(a.href, '_blank', 'noopener'); return true; }
      open({ url: a.href, name: row.querySelector('.row__name').textContent, port: row.querySelector('.row__port').textContent });
      return true;
    },
  };
})();

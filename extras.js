/* Easter eggs: snake in the terminal, a fake breach, and synthesised CRT sound. */
(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= sound: everything is synthesised, nothing is downloaded ================= */
  const SOUND_KEY = 'sound';
  let ctx = null;
  let hum = null;
  let soundOn = false;
  try { soundOn = localStorage.getItem(SOUND_KEY) === 'on'; } catch (e) { /* default off */ }

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBurst(ms, freq, gain) {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * ms / 1000);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = a.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  }

  const sound = {
    get on() { return soundOn; },
    set(on) {
      soundOn = on;
      try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch (e) { /* not saved */ }
      if (on) { sound.thunk(); sound.hum(true); } else { sound.hum(false); }
      document.dispatchEvent(new CustomEvent('bekha:sound', { detail: on }));
    },
    click() { if (soundOn) noiseBurst(28, 2400 + Math.random() * 900, 0.35); },
    thunk() {
      if (!soundOn) return;
      const a = audio(); if (!a) return;
      const o = a.createOscillator(); const g = a.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(120, a.currentTime); o.frequency.exponentialRampToValueAtTime(38, a.currentTime + 0.35);
      g.gain.setValueAtTime(0.5, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.45);
      o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.5);
      noiseBurst(120, 6000, 0.12); // the high whine of a tube warming up
    },
    hum(on) {
      const a = audio(); if (!a) return;
      if (on && !hum) {
        const o = a.createOscillator(); const g = a.createGain();
        o.type = 'sawtooth'; o.frequency.value = 50;
        const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
        g.gain.value = 0.012;
        o.connect(f).connect(g).connect(a.destination); o.start();
        hum = { o, g };
      } else if (!on && hum) {
        hum.o.stop(); hum = null;
      }
    },
    blip(freq) {
      if (!soundOn) return;
      const a = audio(); if (!a) return;
      const o = a.createOscillator(); const g = a.createGain();
      o.type = 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.09);
      o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.1);
    },
  };
  /* browsers start audio only after a gesture: resume the hum on the first one */
  if (soundOn) {
    const wake = () => { sound.hum(true); window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake); };
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
  }

  /* ================= snake, drawn in the terminal ================= */
  const COLS = 34, ROWS = 14, TICK_MS = 110;
  const BEST_KEY = 'snake-best';

  function snake(shell) {
    const board = document.createElement('pre');
    board.className = 'snake';
    shell.out.textContent = '';
    shell.out.appendChild(board);
    shell.setWin('max');
    shell.input.blur();

    let best = 0;
    try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { /* no best score */ }
    let body = [[8, 7], [7, 7], [6, 7]];
    let dir = [1, 0], next = [1, 0];
    let food = place();
    let score = 0, over = false;

    function place() {
      for (;;) {
        const p = [Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS)];
        if (!body.some(([x, y]) => x === p[0] && y === p[1])) return p;
      }
    }
    function render(msg) {
      const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(' '));
      grid[food[1]][food[0]] = '*';
      body.forEach(([x, y], i) => { grid[y][x] = i === 0 ? '@' : 'o'; });
      const top = '+' + '-'.repeat(COLS) + '+';
      board.textContent = [
        `snake   score ${score}   best ${best}   arrows or WASD, q to quit`,
        top, ...grid.map((r) => '|' + r.join('') + '|'), top,
        msg || '',
      ].join('\n');
    }
    function step() {
      if (over) return;
      dir = next;
      const head = [(body[0][0] + dir[0] + COLS) % COLS, (body[0][1] + dir[1] + ROWS) % ROWS];
      if (body.some(([x, y]) => x === head[0] && y === head[1])) return end();
      body = [head, ...body];
      if (head[0] === food[0] && head[1] === food[1]) { score += 1; food = place(); sound.blip(880); }
      else body = body.slice(0, -1);
      render();
    }
    function end() {
      over = true;
      clearInterval(timer);
      if (score > best) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* not saved */ } }
      sound.blip(140);
      render(`game over. score ${score}. press r to play again, q to quit.`);
    }
    const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    function onKey(e) {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'q' || k === 'Escape') { quit(); e.preventDefault(); return; }
      if (over && k === 'r') { quit(); snake(shell); e.preventDefault(); return; }
      const d = KEYS[k];
      if (d) {
        if (d[0] !== -dir[0] || d[1] !== -dir[1]) next = d;
        e.preventDefault();
        e.stopPropagation();
      }
    }
    function quit() {
      clearInterval(timer);
      document.removeEventListener('keydown', onKey, true);
      shell.out.textContent = '';
      shell.setWin(null);
      shell.print(`snake exited. score ${score}, best ${best}.`, 'hl');
      shell.input.focus();
    }
    document.addEventListener('keydown', onKey, true);
    const timer = setInterval(step, TICK_MS);
    render();
  }

  /* ================= a fake breach, for whoever types hack or the Konami code ================= */
  let breaching = false;
  function breach() {
    if (breaching) return;
    breaching = true;
    const layer = document.createElement('div');
    layer.className = 'breach';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-label', 'Access granted');
    const log = document.createElement('pre');
    layer.appendChild(log);
    document.body.appendChild(layer);
    sound.thunk();

    const lines = [
      '> connecting to bekha.mainframe:1969 ...',
      '> handshake ok. negotiating cipher: chacha20-poly1305',
      '> bypassing firewall',
      '> [##########..........] 50%',
      '> [####################] 100%',
      '> escalating privileges: visitor -> root',
      '> dumping /home/bekha/projects ... 9 found',
      '> decrypting contact.gpg',
      '',
    ];
    let i = 0;
    const tick = () => {
      if (i < lines.length) {
        log.textContent += lines[i] + '\n';
        sound.click();
        i += 1;
        setTimeout(tick, REDUCED ? 0 : 230);
        return;
      }
      const big = document.createElement('p');
      big.className = 'breach__big';
      big.textContent = 'ACCESS GRANTED';
      const note = document.createElement('p');
      note.className = 'breach__note';
      const tr = window.bekhaI18n ? window.bekhaI18n.t : (k) => ({ breachNote: 'Relax, nothing happened. Now hire the guy who built this: ', breachClose: 'close  [esc]' }[k]);
      note.append(tr('breachNote'));
      const a = document.createElement('a');
      a.href = 'https://t.me/sabrsf0'; a.textContent = 'telegram @sabrsf0'; a.target = '_blank'; a.rel = 'noopener';
      note.appendChild(a);
      const close = document.createElement('button');
      close.type = 'button'; close.className = 'breach__close'; close.textContent = tr('breachClose');
      close.addEventListener('click', done);
      layer.append(big, note, close);
      sound.blip(660);
      close.focus();
    };
    function done() {
      layer.remove();
      document.removeEventListener('keydown', onEsc);
      breaching = false;
    }
    function onEsc(e) { if (e.key === 'Escape') done(); }
    document.addEventListener('keydown', onEsc);
    tick();
  }

  /* the Konami code, anywhere on the page */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  document.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === KONAMI[pos] ? pos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (pos === KONAMI.length) { pos = 0; breach(); }
  });

  window.bekhaExtras = { sound, snake, breach };
})();

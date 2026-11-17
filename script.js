/* Bekha — terminal portfolio. Plain JS, no dependencies. */
(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TZ = 'Asia/Dushanbe';
  const THEMES = ['amber', 'green', 'white'];
  const BOOT_STEP_MS = 140;
  const GH_USER = 'pythonhack000';
  const HOME = '/home/bekha';
  const I = window.bekhaI18n || { t: (k) => k, set: () => false, lang: 'en' };
  const t = (...a) => I.t(...a);
  const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&@01';

  const LINKS = Object.freeze({
    telegram: 'https://t.me/sabrsf0',
    email: 'mailto:pythonhack000@gmail.com',
    github: 'https://github.com/pythonhack000',
    linkedin: 'https://www.linkedin.com/in/behruz-nabizoda-669491238/',
  });

  const PROJECTS = Object.freeze([
    { name: 'lunar-navigator', what: 'NASA Space Apps 2026: Moon landing sites', url: 'https://pythonhack000.github.io/lunar-navigator/' },
    { name: 'tradeboard', what: 'AI draws on a live trading chart', url: 'https://pythonhack000.github.io/tradevision/' },
    { name: 'accbozor', what: 'game account marketplace with escrow', url: 'https://pythonhack000.github.io/bozor/' },
    { name: 'flex', what: 'one pass for Dushanbe gyms', url: 'https://pythonhack000.github.io/gym/' },
    { name: 'takhtabozor', what: 'stock and debts for a timber yard', url: 'https://pythonhack000.github.io/takhtabozor/' },
    { name: 'bysabr', what: 'fashion store with an admin panel', url: 'https://pythonhack000.github.io/bysabr-shop/' },
    { name: 'smart-canteen', what: 'canteen ordering app, Expo', url: 'https://github.com/pythonhack000/canteen-mobile' },
    { name: 'tradesignal-bot', what: 'Telegram signals bot, Python + OpenAI', url: null },
    { name: 'dii-campus', what: 'student app for DII', url: 'https://pythonhack000.github.io/dii-campus/' },
  ]);

  /* ---------------- the name decrypts once ---------------- */
  function decrypt(el, durationMs) {
    const target = el.dataset.text || el.textContent;
    if (REDUCED) { el.textContent = target; return; }
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - start) / durationMs);
      const fixed = Math.floor(p * target.length);
      el.textContent = target.split('').map((ch, i) =>
        i < fixed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      ).join('');
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target;
    };
    requestAnimationFrame(frame);
    setTimeout(() => { el.textContent = target; }, durationMs + 400); // rAF can stall in a background tab
  }
  const firstVisit = !document.documentElement.classList.contains('seen');
  try { sessionStorage.setItem('seen', '1'); } catch (e) { /* storage blocked: intro plays every time */ }
  const nameEl = document.getElementById('name');
  if (nameEl) setTimeout(() => decrypt(nameEl, 1100), firstVisit && !REDUCED ? 650 : 0);

  /* ---------------- word to ASCII art (for projects without a screenshot) ---------------- */
  function asciiWord(word) {
    const cols = 72, rows = 14;
    const c = document.createElement('canvas');
    c.width = cols; c.height = rows;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return word;
    g.fillStyle = '#000'; g.fillRect(0, 0, cols, rows);
    g.fillStyle = '#fff';
    g.textBaseline = 'middle'; g.textAlign = 'center';
    let size = rows * 1.15;
    g.font = `${size}px VT323, monospace`;
    while (g.measureText(word).width > cols - 4 && size > 6) { size -= 1; g.font = `${size}px VT323, monospace`; }
    g.fillText(word, cols / 2, rows / 2 + 1);
    const data = g.getImageData(0, 0, cols, rows).data;
    const RAMP = ' .:-=+*#%@';
    let s = '';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = data[(y * cols + x) * 4] / 255;
        s += RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
      }
      s += '\n';
    }
    return s;
  }

  /* ---------------- live checks: one HEAD request per live project ---------------- */
  const pingCache = new Map();
  const canPing = (url) => Boolean(url) && url.startsWith(location.origin) && location.protocol.startsWith('http');

  async function check(url) {
    const t0 = performance.now();
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      const result = { ok: res.ok, status: res.status, ms: Math.round(performance.now() - t0) };
      pingCache.set(url, result);
      return result;
    } catch (err) {
      const result = { ok: false, status: 0, ms: 0 };
      pingCache.set(url, result);
      return result;
    }
  }
  const describe = (r) => (r.status ? `HTTP ${r.status}  ${r.ms}ms` : t('pingNone'));

  /* ---------------- nmap rows drive the screen ---------------- */
  const rows = Array.from(document.querySelectorAll('.row'));
  const crt = document.querySelector('.screen__crt');
  const shot = document.getElementById('shot');
  const shotAscii = document.getElementById('shotAscii');
  const shotCap = document.getElementById('shotCap');
  const pingEl = document.getElementById('ping');
  const asciiCache = new Map();
  const rowUrl = (row) => row.querySelector('a.row__link')?.href ?? null;
  const rowName = (row) => row.querySelector('.row__name')?.textContent ?? '';

  rows.forEach((r) => { if (r.dataset.shot) { const i = new Image(); i.src = r.dataset.shot; } });

  function markRow(row, result) {
    const state = row.querySelector('.row__state');
    if (!state) return;
    state.classList.remove('is-checking');
    state.textContent = result.ok ? 'open' : 'down';
    state.classList.toggle('is-down', !result.ok);
  }

  let pingToken = 0;
  async function showPing(row) {
    if (!pingEl) return;
    const token = ++pingToken;
    const url = rowUrl(row);
    pingEl.className = 'ping';
    if (!url) { pingEl.textContent = t('pingPrivate'); return; }
    if (url.startsWith('https://github.com/')) { pingEl.textContent = t('pingGithub'); return; }
    if (!canPing(url)) { pingEl.textContent = ''; return; }
    pingEl.textContent = t('pingWait');
    const r = await check(url);
    if (token !== pingToken) return;
    pingEl.textContent = describe(r);
    pingEl.classList.toggle('is-down', !r.ok);
    markRow(row, r);
  }

  function setActive(row) {
    if (!row || row.classList.contains('is-on')) return;
    rows.forEach((r) => r.classList.toggle('is-on', r === row));
    const port = row.querySelector('.row__port')?.textContent ?? '';
    const name = rowName(row);
    if (shotCap) shotCap.textContent = `${port}  ${name}`;
    if (row.dataset.shot) {
      shotAscii.hidden = true;
      shot.hidden = false;
      shot.src = row.dataset.shot;
      shot.alt = row.dataset.alt || name;
    } else {
      const key = row.dataset.ascii || name.toUpperCase();
      if (!asciiCache.has(key)) asciiCache.set(key, asciiWord(key));
      shotAscii.textContent = asciiCache.get(key);
      shotAscii.hidden = false;
      shot.hidden = true;
    }
    showPing(row);
    document.dispatchEvent(new CustomEvent('bekha:channel', { detail: { port: port.replace('/tcp', ''), name } }));
    if (crt && !REDUCED) { crt.classList.remove('is-tuning'); void crt.offsetWidth; crt.classList.add('is-tuning'); }
  }
  rows.forEach((r) => {
    r.addEventListener('pointerenter', () => setActive(r));
    r.addEventListener('focusin', () => setActive(r));
  });
  if (rows[0]) showPing(rows[0]);

  /* the scan: when /work comes into view, check every live port for real */
  const uptime = document.getElementById('uptime');
  const uptimeText = document.getElementById('uptimeText');
  let scanned = false;
  let uptimeState = ['uptimeWait'];
  async function scan() {
    if (scanned || !uptime) return;
    scanned = true;
    const live = rows.filter((r) => canPing(rowUrl(r)));
    if (!live.length) { uptimeState = ['uptimeLocal']; uptimeText.textContent = t('uptimeLocal'); return; }
    live.forEach((r) => r.querySelector('.row__state')?.classList.add('is-checking'));
    uptimeText.textContent = t('uptimeRun', live.length);
    const results = await Promise.all(live.map(async (r) => { const res = await check(rowUrl(r)); markRow(r, res); return res; }));
    const up = results.filter((r) => r.ok);
    const sorted = up.map((r) => r.ms).sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    uptimeState = ['uptimeDone', up.length, results.length, median];
    uptimeText.textContent = t(...uptimeState);
    uptime.classList.add(up.length === results.length ? 'is-done' : 'is-bad');
  }
  if (uptime) {
    new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { scan(); obs.disconnect(); } }, { rootMargin: '0px 0px -30% 0px' }).observe(uptime);
  }

  /* ---------------- live GitHub in neofetch ---------------- */
  function ago(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [u, sec] of units) { const n = Math.floor(s / sec); if (n >= 1) return t('ago', n, u); }
    return t('ago', 0, 'now');
  }
  const ghFill = (id, text) => { const el = document.getElementById(id); if (!el) return; el.querySelector('dd').textContent = text; el.hidden = false; };
  const github = { repos: null, last: null };
  function paintGithub() {
    if (github.repos !== null) ghFill('ghRepos', t('ghRepos', github.repos));
    if (github.last) ghFill('ghPush', t('ghPush', ago(github.last.at), github.last.name));
  }
  (async () => {
    try {
      const [user, repos] = await Promise.all([
        fetch(`https://api.github.com/users/${GH_USER}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`user ${r.status}`)))),
        fetch(`https://api.github.com/users/${GH_USER}/repos?sort=pushed&per_page=1`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`repos ${r.status}`)))),
      ]);
      if (typeof user.public_repos === 'number') github.repos = user.public_repos;
      const top = Array.isArray(repos) ? repos[0] : null;
      if (top && top.pushed_at) github.last = { name: top.name, at: top.pushed_at };
      paintGithub();
    } catch (err) {
      /* GitHub rate limit or offline: the rows stay hidden, nothing else depends on them */
    }
  })();

  /* ---------------- the terminal: a small shell over the page ---------------- */
  const term = document.getElementById('term');
  const out = document.getElementById('termOut');
  const form = document.getElementById('termForm');
  const input = document.getElementById('termIn');
  const psEl = document.getElementById('termPs');
  const titleEl = document.getElementById('termTitle');
  const respawn = document.getElementById('termRespawn');
  const history = [];
  let histIdx = 0;
  let cwd = '~';

  const DIRS = Object.freeze({ '~': 'top', '~/work': 'work', '~/whoami': 'whoami', '~/contact': 'contact' });
  const FILES = Object.freeze(['security.log', 'nasa.txt']);

  const print = (text, cls) => {
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.textContent = text;
    out.appendChild(p);
    out.scrollTop = out.scrollHeight;
  };
  const go = (url) => { if (url) window.open(url, url.startsWith('mailto:') ? '_self' : '_blank', 'noopener'); };
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  const setCwd = (dir) => {
    cwd = dir;
    if (psEl) psEl.textContent = `bekha@dushanbe:${dir}$`;
    if (titleEl) titleEl.textContent = `tty1  bekha@dushanbe:${dir}`;
  };
  const findProject = (q) => PROJECTS.find((p) => p.name.startsWith(q || '\u0000'));
  const rowFor = (name) => rows.find((r) => rowName(r) === name);

  function catProject(p) {
    const row = rowFor(p.name);
    const lines = [[p.name, 'hl']];
    const ver = row?.querySelector('.row__ver')?.textContent?.trim();
    if (ver) lines.push([ver]);
    lines.push([p.url ? `url    ${p.url}` : 'url    private, on a VPS']);
    const r = p.url ? pingCache.get(p.url) : null;
    if (r) lines.push([`status ${describe(r)}`]);
    return lines;
  }

  const COMMANDS = {
    help: () => [
      ['the site is a filesystem. commands:', 'hl'],
      ['  ls [dir]        list a directory (work, whoami, contact)'],
      ['  cd <dir>        go there, the page follows'],
      ['  cat <file>      read a project or a file, e.g. cat tradeboard'],
      ['  run <name>      boot a live project in a BEKHA-OS window'],
      ['  open <name>     open a live project in a new tab'],
      ['  pwd, tree, whoami, stack, nasa, contact'],
      ['  telegram | email | github | linkedin'],
      ['  theme <name>    amber, green or white'],
      ['  lang en|ru      English or Russian'],
      ['  reboot          power-cycle the screen'],
      ['  intro           replay the opening shot'],
      ['  whereami        where you are, and how far from me'],
      ['  snake           play. arrows or WASD'],
      ['  hack            do not'],
      ['  sound on|off    CRT hum and key clicks'],
      ['  sudo hire-me    you know what this does'],
      ['  clear, exit'],
    ],
    whoami: () => {
      const lines = [[t('whoami1')], [t('whoami2')]];
      if (github.last) lines.push([t('lastPush', ago(github.last.at), github.last.name), 'echo']);
      return lines;
    },
    pwd: () => [[cwd === '~' ? HOME : HOME + cwd.slice(1)]],
    tree: () => [['~'], ['|-- work/'], ...PROJECTS.map((p, i) => [`|   ${i === PROJECTS.length - 1 ? '`--' : '|--'} ${p.name}`]), ['|-- whoami/'], ['|-- contact/'], ['|-- security.log'], ['`-- nasa.txt'], [`3 directories, ${PROJECTS.length + 2} files`, 'echo']],
    projects: () => PROJECTS.map((p) => [`  ${p.name.padEnd(18)}${p.what}`]).concat([['try: cat tradeboard, or open lunar', 'echo']]),
    stack: () => [['TypeScript, React, Next.js, Vite, Tailwind'], ['Supabase, PostgreSQL, Flask'], ['Expo, React Native, Flutter'], ['Python, OpenAI, Anthropic, Gemini, Telegram Bot API']],
    contact: () => [['telegram  @sabrsf0'], ['email     pythonhack000@gmail.com'], ['github    pythonhack000'], ['type a name to open it, e.g. telegram', 'echo']],
    telegram: () => { go(LINKS.telegram); return [['opening telegram...']]; },
    email: () => { go(LINKS.email); return [['opening mail...']]; },
    github: () => { go(LINKS.github); return [['opening github...']]; },
    linkedin: () => { go(LINKS.linkedin); return [['opening linkedin...']]; },
    date: () => [[new Date().toLocaleString('en-GB', { timeZone: TZ, dateStyle: 'full', timeStyle: 'short' }) + ' in Dushanbe']],
    nasa: () => [[t('nasa1'), 'hl'], [t('nasa2')], [t('nasa3'), 'echo']],
    exit: () => { setTimeout(closeShell, 250); return [['logout']]; },
    reboot: () => { setTimeout(reboot, 300); return [['the system is going down for reboot NOW']]; },
    whereami: () => {
      const v = window.bekhaGlobe?.visitor?.();
      if (!v) return [['whereami: no globe loaded', 'err']];
      const ru = I.lang === 'ru';
      if (v.km <= 150) return [[ru ? `ты в ${v.ru}. мы соседи. заходи на чай.` : `you are in ${v.en}. we are neighbours. come over.`, 'hl']];
      return [
        [ru ? `ты где-то тут: ${v.ru} (${v.tz || 'часовой пояс неизвестен'})` : `you are around ${v.en} (${v.tz || 'unknown time zone'})`, 'hl'],
        [ru ? `${v.km} км до Душанбе. посмотри на глобус: туда бежит пакет.` : `${v.km} km to Dushanbe. look at the globe: a packet is on its way.`],
        [ru ? 'это по часовому поясу браузера, ни IP, ни геолокации.' : 'guessed from your browser time zone. no IP, no geolocation.', 'echo'],
      ];
    },
    intro: () => { try { sessionStorage.removeItem('intro'); } catch (e) { /* plays anyway after reload */ } setTimeout(() => location.reload(), 300); return [['replaying the opening shot...']]; },
    clear: () => { out.textContent = ''; return []; },
  };

  function ls(arg) {
    const target = arg ? (arg.startsWith('~') ? arg : (cwd === '~' ? `~/${arg}` : `${cwd}/${arg}`)).replace(/\/$/, '') : cwd;
    if (target === '~') return [['work/  whoami/  contact/  security.log  nasa.txt']];
    if (target === '~/work') return COMMANDS.projects();
    if (target === '~/whoami') return [['neofetch  security.log']];
    if (target === '~/contact') return [['telegram  email  github  linkedin']];
    return [[`ls: cannot access '${arg}': no such directory`, 'err']];
  }

  function cd(arg) {
    if (!arg || arg === '~' || arg === '/' || arg === HOME) { setCwd('~'); jump('top'); return []; }
    if (arg === '..') { setCwd('~'); jump('top'); return []; }
    const clean = arg.replace(/\/$/, '').replace(/^~\//, '').replace(/^\.\//, '');
    const dir = `~/${clean}`;
    if (DIRS[dir]) { setCwd(dir); jump(DIRS[dir]); return []; }
    if (findProject(clean)) return [[`cd: ${clean}: is a project, not a directory. try cat ${clean} or open ${clean}`, 'err']];
    return [[`cd: no such directory: ${arg}`, 'err']];
  }

  function cat(arg) {
    if (!arg) return [['cat: what? e.g. cat tradeboard', 'err']];
    const clean = arg.replace(/^.*\//, '');
    if (clean === 'security.log') return Array.from(document.querySelectorAll('.log li')).map((li) => [li.textContent.trim()]);
    if (clean === 'nasa.txt') return COMMANDS.nasa();
    const p = findProject(clean);
    if (p) return catProject(p);
    if (DIRS[`~/${clean}`]) return [[`cat: ${clean}: is a directory`, 'err']];
    return [[`cat: ${clean}: no such file`, 'err']];
  }

  function run(raw) {
    const line = raw.trim();
    if (!line) return;
    print(`${cwd}$ ${line}`, 'echo');
    const [cmd, ...args] = line.toLowerCase().split(/\s+/);
    const say = (lines) => lines.forEach(([text, cls]) => print(text, cls));

    if (cmd === 'sudo') {
      if (args.join(' ') === 'hire-me' || args.join(' ') === 'hire me') {
        print('[sudo] password for visitor: ********');
        print('access granted. opening a chat with Bekha...', 'hl');
        go(LINKS.telegram);
      } else {
        print('visitor is not in the sudoers file. This incident will be reported.', 'err');
      }
      return;
    }
    if (cmd === 'theme') {
      const name = args[0];
      if (!THEMES.includes(name)) { print(`themes: ${THEMES.join(', ')}. e.g. theme green`, 'err'); return; }
      if (name === 'amber') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = name;
      try { localStorage.setItem('theme', name === 'amber' ? '' : name); } catch (e) { /* not saved, still applied */ }
      print(`phosphor set to ${name}.`, 'hl');
      return;
    }
    if (cmd === 'lang') {
      if (!I.set(args[0])) { print('lang: en or ru', 'err'); return; }
      print(t('langSet'), 'hl');
      return;
    }
    if (cmd === 'rm') { print('nice try.', 'err'); return; }
    const X = window.bekhaExtras;
    if (cmd === 'snake') {
      if (!X) { print('snake is not installed.', 'err'); return; }
      if (window.matchMedia('(hover: none)').matches) { print('snake needs a keyboard. try it on a laptop.', 'err'); return; }
      X.snake({ out, input, print, setWin });
      return;
    }
    if (cmd === 'hack') { if (X) X.breach(); return; }
    if (cmd === 'sound') {
      if (!X) { print('no sound card.', 'err'); return; }
      const want = args[0] === 'off' ? false : args[0] === 'on' ? true : !X.sound.on;
      X.sound.set(want);
      print(`sound ${want ? 'on: CRT hum and key clicks' : 'off'}.`, 'hl');
      return;
    }
    if (cmd === 'ls') { say(ls(args[0])); return; }
    if (cmd === 'cd') { say(cd(args[0])); return; }
    if (cmd === 'cat' || cmd === 'less' || cmd === 'more') { say(cat(args[0])); return; }
    if (cmd === 'run') {
      if (!window.bekhaOS || !window.bekhaOS.run(args[0] || '\u0000')) { print(`run: ${args[0] || ''}: no live project by that name. type ls work`, 'err'); return; }
      print(`booting ${args[0]}...`, 'hl');
      return;
    }
    if (cmd === 'open') {
      const target = findProject(args[0]);
      if (!target) { print(`no such project: ${args[0] || ''}. type ls work`, 'err'); return; }
      if (!target.url) { print(`${target.name} runs privately on a VPS. Ask me for a demo: type telegram`); return; }
      print(`opening ${target.name}...`, 'hl');
      go(target.url);
      return;
    }
    const fn = Object.prototype.hasOwnProperty.call(COMMANDS, cmd) ? COMMANDS[cmd] : null;
    if (!fn) { print(`command not found: ${cmd}. type help`, 'err'); return; }
    say(fn());
  }

  /* boot log, also used by reboot */
  const READY = () => t('ready');
  function boot(animated) {
    if (!out) return;
    if (!animated) { print(READY(), 'hl'); return; }
    const lines = ['[  ok  ] phosphor warm', `[  ok  ] mounted /work: ${PROJECTS.length} projects`, '[  ok  ] loaded neofetch, security.log', READY()];
    lines.forEach((line, i) => setTimeout(() => print(line, i === lines.length - 1 ? 'hl' : 'echo'), 900 + i * BOOT_STEP_MS));
  }

  function reboot() {
    window.bekhaExtras?.sound.thunk();
    window.scrollTo({ top: 0, behavior: 'auto' });
    const old = document.querySelector('.power');
    if (old && !REDUCED) {
      const fresh = old.cloneNode(true);
      old.replaceWith(fresh);
    }
    document.documentElement.classList.remove('seen');
    openShell();
    out.textContent = '';
    setCwd('~');
    if (nameEl) setTimeout(() => decrypt(nameEl, 1100), REDUCED ? 0 : 650);
    boot(!REDUCED);
  }

  /* window controls */
  function setWin(state) {
    term.classList.remove('is-min', 'is-max', 'is-closed');
    if (state) term.classList.add(`is-${state}`);
    term.querySelector('[data-win="min"]')?.setAttribute('aria-pressed', String(state === 'min'));
    term.querySelector('[data-win="max"]')?.setAttribute('aria-pressed', String(state === 'max'));
    respawn.hidden = state !== 'closed';
    document.body.style.overflow = state === 'max' ? 'hidden' : '';
  }
  function closeShell() { setWin('closed'); respawn.focus(); }
  function openShell() { setWin(null); }

  if (term && out && form && input && respawn) {
    boot(firstVisit && !REDUCED);

    term.querySelectorAll('[data-win]').forEach((btn) => btn.addEventListener('click', () => {
      const want = btn.dataset.win;
      if (want === 'close') { closeShell(); return; }
      const on = term.classList.contains(`is-${want}`);
      setWin(on ? null : want);
      if (!on && want === 'max') input.focus();
    }));
    respawn.addEventListener('click', () => {
      openShell();
      out.textContent = '';
      setCwd('~');
      print('respawned. bash 5.2, a fresh shell.', 'hl');
      input.focus();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value;
      if (v.trim()) { history.push(v); histIdx = history.length; }
      input.value = '';
      run(v);
    });

    const WORDS = Object.keys(COMMANDS).concat(['ls', 'cd', 'cat', 'open', 'run', 'sudo hire-me', 'theme', 'snake', 'hack', 'sound on', 'sound off', 'lang en', 'lang ru']);
    input.addEventListener('keydown', (e) => {
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') window.bekhaExtras?.sound.click();
      if (e.key === 'Tab' && input.value.trim()) {
        const v = input.value.toLowerCase().trim();
        const [cmd] = v.split(/\s+/);
        let pool = WORDS;
        if (cmd === 'open' || cmd === 'run') pool = PROJECTS.map((p) => `${cmd} ${p.name}`);
        if (cmd === 'cat') pool = PROJECTS.map((p) => `cat ${p.name}`).concat(FILES.map((f) => `cat ${f}`));
        if (cmd === 'cd' || cmd === 'ls') pool = ['work', 'whoami', 'contact'].map((d) => `${cmd} ${d}`);
        if (cmd === 'theme') pool = THEMES.map((t) => `theme ${t}`);
        const hits = pool.filter((w) => w.startsWith(v));
        if (hits.length === 1) input.value = hits[0] + ' ';
        else if (hits.length > 1) print(hits.join('   '), 'echo');
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowUp' && histIdx > 0) { histIdx -= 1; input.value = history[histIdx]; e.preventDefault(); }
      if (e.key === 'ArrowDown') { histIdx = Math.min(history.length, histIdx + 1); input.value = history[histIdx] ?? ''; e.preventDefault(); }
      if (e.key === 'l' && e.ctrlKey) { out.textContent = ''; e.preventDefault(); }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && term.classList.contains('is-max')) { setWin(null); return; }
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '');
      if (e.key === '/' && !typing) {
        e.preventDefault();
        if (term.classList.contains('is-closed') || term.classList.contains('is-min')) openShell();
        input.focus();
      }
    });
  }

  /* ---------------- effects you see without typing ---------------- */

  /* the background is this page's own running code, lit where the pointer goes */
  const srcDim = document.getElementById('srcDim');
  const srcLit = document.getElementById('srcLit');
  if (srcDim && srcLit) {
    const own = [decrypt, window.bekhaGlobe?.frame, asciiWord, check, showPing, scan, run, ls, cd, cat, boot, reboot, setWin]
      .filter(Boolean).map((fn) => fn.toString()).join('\n\n');
    const need = Math.ceil(window.innerHeight / 17.4) * Math.ceil(window.innerWidth / 460) * 60 + 2000;
    let text = own;
    while (text.length < need) text += '\n\n' + own;
    srcDim.textContent = text;
    srcLit.textContent = text;
    if (!REDUCED && window.matchMedia('(hover: hover)').matches) {
      const root = document.documentElement;
      let mx = -999, my = -999, queued = false;
      const paint = () => { root.style.setProperty('--mx', `${mx}px`); root.style.setProperty('--my', `${my}px`); queued = false; };
      window.addEventListener('pointermove', (e) => {
        mx = e.clientX; my = e.clientY;
        root.style.setProperty('--lamp', '190px');
        if (!queued) { queued = true; requestAnimationFrame(paint); }
      }, { passive: true });
      document.addEventListener('pointerleave', () => root.style.setProperty('--lamp', '0px'));
    }
  }

  /* headings decrypt once, as they scroll into view */
  if (!REDUCED) {
    const heads = Array.from(document.querySelectorAll('.h2, .h3, .contact__h'));
    heads.forEach((el) => { el.dataset.text = el.textContent; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { decrypt(e.target, 900); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -15% 0px' });
    heads.forEach((el) => io.observe(el));
  }

  /* the name and the contact labels re-scramble under the pointer */
  const hoverScramble = (el, ms) => {
    let busy = false;
    el.addEventListener('pointerenter', () => {
      if (busy || REDUCED) return;
      busy = true;
      decrypt(el, ms);
      setTimeout(() => { busy = false; }, ms + 450);
    });
  };
  document.querySelectorAll('.big').forEach((a) => {
    const label = a.querySelector('.big__label');
    if (!label) return;
    let busy = false;
    a.addEventListener('pointerenter', () => { if (busy || REDUCED) return; busy = true; decrypt(label, 450); setTimeout(() => { busy = false; }, 900); });
  });

  /* the sound switch in the top bar */
  const soundBtn = document.getElementById('soundBtn');
  if (soundBtn && window.bekhaExtras) {
    const label = (on) => { soundBtn.textContent = t(on ? 'soundOn' : 'soundOff'); soundBtn.setAttribute('aria-pressed', String(on)); };
    document.addEventListener('bekha:lang', () => label(window.bekhaExtras.sound.on));
    label(window.bekhaExtras.sound.on);
    soundBtn.addEventListener('click', () => window.bekhaExtras.sound.set(!window.bekhaExtras.sound.on));
    document.addEventListener('bekha:sound', (e) => label(e.detail));
  }

  /* scroll progress, drawn as a terminal progress bar */
  const prog = document.getElementById('prog');
  if (prog) {
    const CELLS = 20;
    let queued = false;
    const draw = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const full = Math.round(p * CELLS);
      prog.textContent = `[${'#'.repeat(full)}${'-'.repeat(CELLS - full)}] ${String(Math.round(p * 100)).padStart(3, ' ')}%`;
      queued = false;
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(draw); } }, { passive: true });
    draw();
  }

  /* a language switch repaints what the scripts wrote */
  document.addEventListener('bekha:lang', () => {
    if (uptimeText) uptimeText.textContent = t(...uptimeState);
    paintGithub();
    const on = rows.find((r) => r.classList.contains('is-on'));
    if (on) showPing(on);
  });

  /* ---------------- scroll: each section prints itself as it comes into view ---------------- */
  if (!REDUCED && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('rv-on');
    const groups = [
      ['#work', '.scan__head, .row, .done, .uptime'],
      ['.neo', '.neo__list > div, .neo__user, .neo__swatch, .neo__cap'],
      ['.sec', '.h3, .log li'],
      ['#contact', '.contact__lead, .links li'],
    ];
    groups.forEach(([host, sel]) => {
      const root = document.querySelector(host);
      if (!root) return;
      root.querySelectorAll(sel).forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--i', String(i)); });
    });

    /* the command line above each section types itself, once */
    const typeOut = (el) => {
      const ps = el.querySelector('.prompt__ps');
      const text = el.textContent.replace(ps ? ps.textContent : '', '').trim();
      el.textContent = '';
      if (ps) el.append(ps, ' ');
      const span = document.createElement('span');
      el.appendChild(span);
      el.classList.add('is-typing');
      let i = 0;
      const step = () => {
        span.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 28 + Math.random() * 40);
        else setTimeout(() => el.classList.remove('is-typing'), 500);
      };
      step();
    };

    const watch = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add('in');
        if (el.classList.contains('cmd')) typeOut(el);
        watch.unobserve(el);
      });
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.05 });
    document.querySelectorAll('#work, .neo, .sec, #contact, main .cmd').forEach((el) => watch.observe(el));
  }

  /* after the opening shot the name decrypts once more, in front of the visitor */
  document.addEventListener('bekha:intro-done', () => { if (nameEl) decrypt(nameEl, 900); });

  /* a small handle for fx.js: type into the shell as if someone were at the keyboard (run() echoes the line itself) */
  window.bekhaShell = {
    run: (line) => { if (input && !term.classList.contains('is-closed')) run(line); },
    print: (text, cls) => print(text, cls),
    input,
  };
})();

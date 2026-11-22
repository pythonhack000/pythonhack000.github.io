/* A small CTF hidden in the site. Seven flags; the shell only knows their SHA-256, so reading this
   file tells you where to look, not what to type. The few flags the site itself has to print are
   XOR-ed below: recovering them from this source is a legitimate solve too. */
(() => {
  'use strict';

  const S = window.bekhaShell;
  if (!S) return;

  const API = (window.BEKHA_CONFIG && window.BEKHA_CONFIG.api) || '';
  const FOUND_KEY = 'ctf-found';
  const PLAYER_KEY = 'ctf-player';
  const ROLE_KEY = 'role';
  const SNAKE_GOAL = 50;
  const NICK_RE = /^[a-z0-9_-]{3,16}$/i;
  const FLAG_RE = /^flag\{[a-z0-9_]{6,64}\}$/;
  const XOR_KEY = 'phosphor';

  const FLAGS = Object.freeze([
    { id: 1, name: 'view-source', hint: 'the oldest trick there is: look at what the server actually sent you.', hash: '1cc9f1f1b1ba16103242aee7a93e3c1d923e180dffd3f5cb6253a26cf2208549' },
    { id: 2, name: 'devtools', hint: 'developers leave notes where developers look. rot13 is not encryption.', hash: '73e8a207df31e0721fa07b51b78308982640f16fa5242bbf6845613db688c466' },
    { id: 3, name: 'crawler', hint: 'even search engines get house rules. read them, then break them.', hash: '568a2177655bd4067847a8ec18e6a9f0d4c6a7ae955e87f110de6d6275f252a2' },
    { id: 4, name: 'pixels', hint: 'the picture a chat shows when you paste this link knows more than it shows.', hash: '7d4e13a0e45ed1ea3b53c5d351446a6143f72677593f95eeeb80e379c442820a' },
    { id: 5, name: 'privesc', hint: 'before you escalate, ask what you are allowed to run.', hash: 'a4c684edce28324797ae5e0abc032653c4daf09cb38ab85eca997b52ba1b9641' },
    { id: 6, name: 'snake', hint: `feed the snake ${SNAKE_GOAL} times and it talks. or read its mind.`, hash: '609b78f83d9ea098187aecb6ef1649f1634383d12ae81a4746ab46ca2f024020' },
    { id: 7, name: 'trust', hint: 'the browser remembers who you are. disagree with it, then reload.', hash: '6cecbc6fc5e94d7d356a0c058b486a3231198596f1514cbbec35f85f8311a605' },
  ]);

  /* ---------- storage ---------- */
  const load = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: progress lives until reload */ }
  };
  let found = load(FOUND_KEY, {});           // { [id]: flag }
  let player = load(PLAYER_KEY, null);       // { nick, token }

  /* ---------- helpers ---------- */
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  const unveil = (b64) => Array.from(atob(b64), (c, i) => String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length))).join('');
  const count = () => Object.keys(found).length;
  const sfx = () => window.bekhaExtras?.sound;

  async function api(body) {
    if (!API) throw new Error('offline');
    const res = await fetch(`${API}/ctf`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({ success: false, error: `http ${res.status}` }));
    if (!json.success) throw new Error(json.error || `http ${res.status}`);
    return json.data;
  }

  /* ---------- commands ---------- */
  async function submit(args) {
    const flag = (args[0] || '').trim();
    if (!flag) { S.print('usage: submit flag{...}', 'err'); return; }
    if (!FLAG_RE.test(flag)) { S.print('that does not look like a flag. flags look like flag{...}, lowercase.', 'err'); sfx()?.blip(140); return; }
    const hash = await sha256(flag);
    const hit = FLAGS.find((f) => f.hash === hash);
    if (!hit) { S.print('wrong flag. keep digging.', 'err'); sfx()?.blip(140); return; }
    if (found[hit.id]) { S.print(`you already have #${hit.id} ${hit.name}.`); return; }
    found = { ...found, [hit.id]: flag };
    save(FOUND_KEY, found);
    S.print(`[+] flag #${hit.id} ${hit.name} accepted. ${count()}/${FLAGS.length}`, 'hl');
    sfx()?.arp();
    if (player) sync().catch(() => S.print('scoreboard unreachable, your flag is saved here and will sync later.', 'echo'));
    if (count() === FLAGS.length) {
      S.print('all flags. you are exactly the kind of person I want to hear from: type ssh bekha', 'hl');
      if (!player) S.print('put your name on the board: ctf join <nick>', 'echo');
    } else if (!player && count() === 1) {
      S.print('first blood. join the scoreboard with: ctf join <nick>', 'echo');
    }
  }

  async function sync() {
    const data = await api({ action: 'solve', token: player.token, flags: Object.values(found) });
    return data;
  }

  async function join(nick) {
    if (!NICK_RE.test(nick || '')) { S.print('nick: 3 to 16 letters, digits, _ or -', 'err'); return; }
    if (player) { S.print(`you are already on the board as ${player.nick}.`); return; }
    S.print('registering...', 'echo');
    try {
      const data = await api({ action: 'join', nick, flags: Object.values(found) });
      player = { nick: data.nick, token: data.token };
      save(PLAYER_KEY, player);
      S.print(`welcome, ${data.nick}. score ${data.score}/${FLAGS.length}. see ctf top`, 'hl');
    } catch (err) {
      S.print(err.message === 'offline' ? 'the scoreboard is not online yet. your flags are saved in this browser.' : `join failed: ${err.message}`, 'err');
    }
  }

  async function top() {
    try {
      const rows = await api({ action: 'top' });
      if (!rows.length) { S.print('the board is empty. be first.', 'hl'); return; }
      S.print('rank  nick              flags  last solve', 'hl');
      rows.forEach((r, i) => {
        const when = new Date(r.last_solve).toISOString().slice(0, 16).replace('T', ' ');
        const me = player && r.nick === player.nick ? '  <- you' : '';
        S.print(`${String(i + 1).padStart(4)}  ${r.nick.padEnd(16)}  ${String(r.score).padStart(2)}/${FLAGS.length}   ${when}${me}`);
      });
    } catch (err) {
      S.print(err.message === 'offline' ? 'the scoreboard is not online yet.' : `scoreboard: ${err.message}`, 'err');
    }
  }

  function board() {
    S.print(`ctf: ${count()}/${FLAGS.length} flags${player ? `, playing as ${player.nick}` : ''}`, 'hl');
    FLAGS.forEach((f) => S.print(`  [${found[f.id] ? 'x' : ' '}] #${f.id} ${f.name}`));
    S.print('submit flag{...} | hint <n> | ctf join <nick> | ctf top', 'echo');
  }

  S.command('ctf', (args) => {
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'join') return join(args[1]);
    if (sub === 'top' || sub === 'board') return top();
    return board();
  }, 'ctf             seven flags are hidden in this site');
  S.command('submit', (args) => { submit(args); });
  S.command('hint', (args) => {
    const f = FLAGS.find((x) => String(x.id) === args[0]);
    if (!f) { S.print(`hint 1 to ${FLAGS.length}`, 'err'); return; }
    S.print(`#${f.id} ${f.name}: ${f.hint}`);
  });

  /* ---------- #5: sudo -l, then the one thing you may run ---------- */
  const ROOT_FLAG = '/root/flag.txt';
  S.file(ROOT_FLAG, () => [[`cat: ${ROOT_FLAG}: Permission denied`, 'err']]);
  S.sudo((args) => {
    if (args[0] === '-l') {
      S.print('User visitor may run the following commands on dushanbe:');
      S.print(`    (root) NOPASSWD: /bin/cat ${ROOT_FLAG}`);
      return true;
    }
    if (args[0] === 'cat' && (args[1] === ROOT_FLAG)) {
      S.print(unveil('FgQOFAsbGhZANwMsF1wZQS9ZGyxEH1sLL1oNFhQMC0RJFQ=='), 'hl');
      return true;
    }
    return false;
  });

  /* ---------- #6: the snake talks at 50 ---------- */
  document.addEventListener('bekha:snake', (e) => {
    if (e.detail === SNAKE_GOAL) S.print(`the snake hisses: ${unveil('FgQOFAsOXhQEETBHABgDQQM3A0cEWx0tQlENSkNYDkEN')}`, 'hl');
  });

  /* ---------- #7: trust the client, lose the flag ---------- */
  let role = null;
  try {
    role = localStorage.getItem(ROLE_KEY);
    if (role === null) localStorage.setItem(ROLE_KEY, 'visitor');
  } catch (e) { /* storage blocked: this flag needs storage */ }
  if (role === 'root') {
    setTimeout(() => {
      S.print('# you are root now. who told the browser it could decide that?', 'hl');
      S.print(unveil('FgQOFAsGXARDGjAHAh0cBi8cB0AvCwNDQwYbLEcMDUpFCw4VDQ=='), 'hl');
    }, 2400);
  }

  /* ---------- #2: under the console banner fx.js prints ---------- */
  const STYLE = 'color:#ffb000;background:#0f0a03;font:12px monospace;padding:2px 6px';
  console.info('%c synt{q3ig00yf_4e3_0c3a_7ors5196} ', STYLE);
  console.info('%c there are 6 more. type ctf in the terminal. ', STYLE);
})();

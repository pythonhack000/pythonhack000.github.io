/* tty2: a live chat with me. The visitor picks a name, messages land in my Telegram,
   my replies (Telegram "reply") come back here. Opens from the launcher, `chat` or `ssh bekha`. */
(() => {
  'use strict';

  const API = (window.BEKHA_CONFIG && window.BEKHA_CONFIG.api) || '';
  const STORE_KEY = 'chat';
  const NAME_MAX = 32;
  const BODY_MAX = 1000;
  const POLL_OPEN_MS = 3000;
  const POLL_CLOSED_MS = 20000;
  const CLOCK_MS = 30000;
  const TZ = 'Asia/Dushanbe';

  /* ---------- state ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch (e) { return null; } };
  let chat = load();                 // { token, name, session, last, seen }
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(chat)); } catch (e) { /* lives until reload */ } };
  let open = false;
  let pollTimer = 0;
  let busy = false;
  let polling = false;     // one poll loop at a time
  let pollAgain = false;
  const shown = new Set();
  const sfx = () => window.bekhaExtras?.sound;

  /* ---------- DOM ---------- */
  const h = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const launcher = h('button', 'chat-launch');
  launcher.type = 'button';
  launcher.setAttribute('aria-controls', 'chatPanel');
  launcher.setAttribute('aria-expanded', 'false');
  const launchText = h('span', null, 'chat with bekha');
  const badge = h('span', 'chat-launch__badge');
  badge.hidden = true;
  launcher.append(h('span', 'chat-launch__dot'), launchText, badge);

  const panel = h('section', 'chat');
  panel.id = 'chatPanel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Chat with Bekha');
  const bar = h('header', 'chat__bar');
  const title = h('span', 'chat__title', 'tty2  chat with bekha');
  const close = h('button', 'chat__close', 'x');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close chat');
  bar.append(title, close);
  const meta = h('p', 'chat__meta');
  const log = h('div', 'chat__log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  const form = h('form', 'chat__form');
  const ps = h('label', 'chat__ps');
  const input = h('input', 'chat__in');
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.id = 'chatIn';
  ps.htmlFor = 'chatIn';
  form.append(ps, input);
  panel.append(bar, meta, log, form);
  document.body.append(launcher, panel);

  /* ---------- rendering ---------- */
  const clock = () => new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const paintMeta = () => { meta.textContent = `${clock()} in Dushanbe. I answer from Telegram, usually the same day.`; };
  const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function line(who, text, cls) {
    const p = h('p', `chat__line ${cls || ''}`);
    if (who) p.append(h('span', 'chat__who', who));
    p.append(document.createTextNode(text));
    log.append(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }
  function paintMessage(m) {
    if (shown.has(m.id)) return;
    shown.add(m.id);
    const p = line(m.from_owner ? 'bekha>' : `${chat.name}>`, m.body, m.from_owner ? 'is-owner' : 'is-me');
    p.title = time(m.created_at);
  }
  function setMode() {
    if (!chat) {
      ps.textContent = 'name>';
      input.placeholder = 'your name or nick';
      input.maxLength = NAME_MAX;
    } else {
      ps.textContent = `${chat.name}>`;
      input.placeholder = 'type a message, Enter sends';
      input.maxLength = BODY_MAX;
    }
  }
  function unread(n) {
    badge.hidden = !n;
    badge.textContent = n ? String(n) : '';
    launchText.textContent = n ? 'bekha replied' : 'chat with bekha';
  }

  /* ---------- server ---------- */
  async function api(body) {
    if (!API) throw new Error('the chat is offline right now. type telegram in the terminal');
    const res = await fetch(`${API}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({ success: false, error: `http ${res.status}` }));
    if (res.status === 401) { chat = null; persist(); setMode(); }
    if (!json.success) throw new Error(json.error || `http ${res.status}`);
    return json.data;
  }

  async function poll() {
    clearTimeout(pollTimer);
    if (!chat || document.hidden) return;
    if (polling) { pollAgain = true; return; }
    polling = true;
    try {
      const list = await api({ action: 'poll', token: chat.token, after: chat.last || 0 });
      let fresh = 0;
      list.forEach((m) => {
        if (m.from_owner && !shown.has(m.id) && m.id > (chat.seen || 0)) fresh += 1;
        chat.last = Math.max(chat.last || 0, m.id);
        if (open) paintMessage(m);
      });
      if (open) chat.seen = chat.last;
      persist();
      if (fresh) { sfx()?.ping(true, 2); if (!open) unread(fresh + (Number(badge.textContent) || 0)); }
    } catch (err) {
      /* network hiccup: the next tick tries again */
    } finally {
      polling = false;
    }
    if (pollAgain) { pollAgain = false; poll(); return; }
    if (chat) pollTimer = setTimeout(poll, open ? POLL_OPEN_MS : POLL_CLOSED_MS);
  }

  /* history: the whole conversation from the start when the panel opens */
  /* a status line with running dots while the server works; returns a function that removes it */
  function loading(text) {
    const p = line('', text, 'is-sys is-loading');
    return () => p.remove();
  }
  /* the input is locked while a request runs, so a second Enter cannot be lost */
  function lock(on, placeholder) {
    input.disabled = on;
    form.classList.toggle('is-busy', on);
    if (on) input.placeholder = placeholder;
    else { setMode(); if (open) input.focus(); }
  }

  async function history() {
    if (!chat) return;
    const done = shown.size ? () => {} : loading('loading history');
    try {
      const list = await api({ action: 'poll', token: chat.token, after: 0 });
      done();
      list.forEach(paintMessage);
      if (list.length) chat.last = Math.max(chat.last || 0, list[list.length - 1].id);
      chat.seen = chat.last;
      persist();
    } catch (err) { done(); line('', err.message, 'is-err'); }
  }

  async function submit(text) {
    if (busy) return;
    busy = true;
    let done = () => {};
    try {
      if (!chat) {
        const name = text.slice(0, NAME_MAX);
        lock(true, 'connecting...');
        done = loading(`connecting as ${name}`);
        const data = await api({ action: 'start', name });
        done();
        chat = { token: data.token, name: data.name, session: data.session, last: 0, seen: 0 };
        persist();
        setMode();
        line('', `connected as ${data.name}. say hi: what are you building?`, 'is-sys');
        poll();
        return;
      }
      const pending = line(`${chat.name}>`, text.slice(0, BODY_MAX), 'is-me is-pending');   // shown at once, confirmed below
      done = () => pending.remove();
      lock(true, 'sending...');
      const m = await api({ action: 'send', token: chat.token, body: text.slice(0, BODY_MAX) });
      done();
      paintMessage(m);
      sfx()?.key('enter');
      if (!m.delivered) line('', 'saved, but Telegram did not take it yet. I will still see it.', 'is-err');
      poll();
    } catch (err) {
      done();
      line('', err.message, 'is-err');
      sfx()?.blip(140);
    } finally {
      busy = false;
      lock(false);
    }
  }

  /* ---------- open / close ---------- */
  function show() {
    if (open) { input.focus(); return; }
    open = true;
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.classList.add('is-open');
    unread(0);
    paintMeta();
    setMode();
    if (!log.childElementCount) {
      line('', 'this goes straight to my phone. no bots answer here, only me.', 'is-sys');
      if (!chat) line('', 'first, what should I call you?', 'is-sys');
    }
    history().then(poll);
    sfx()?.open();
    input.focus();
  }
  function hide() {
    open = false;
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.classList.remove('is-open');
    sfx()?.close();
    poll();
  }

  launcher.addEventListener('click', () => (open ? hide() : show()));
  close.addEventListener('click', hide);
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    submit(text);
  });
  input.addEventListener('keydown', (e) => { if (e.key.length === 1 || e.key === 'Backspace') sfx()?.key(e.key === ' ' ? 'space' : 'char'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  setInterval(() => { if (open) paintMeta(); }, CLOCK_MS);
  if (chat) poll();   // a returning visitor gets the badge if I answered while they were away

  /* ---------- the shell ---------- */
  const S = window.bekhaShell;
  if (S) {
    S.command('chat', () => { S.print('opening tty2...', 'hl'); show(); }, 'chat            talk to me live, I answer from Telegram');
    S.command('ssh', (args) => {
      const host = (args[0] || '').toLowerCase().replace(/^.*@/, '');
      if (host !== 'bekha' && host !== 'dushanbe') { S.print(host ? `ssh: connect to host ${args[0]} port 22: Connection refused` : 'usage: ssh bekha', 'err'); return; }
      S.print('Connecting to bekha@dushanbe port 22... connected. opening tty2.', 'hl');
      show();
    });
  }
  window.bekhaChat = { show, hide };
})();

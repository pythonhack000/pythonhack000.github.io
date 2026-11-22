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
  const POLL_HIDDEN_MS = 10000;   // background tab: slower, but never stopped
  const TZ = 'Asia/Dushanbe';
  const WORD_MS = 38;            // words surface one after another, like LUNA in Lunar Navigator
  const REVEAL_MAX_MS = 2400;    // a long answer does not crawl
  const TYPING_BEAT_MS = 700;    // the dots show for a moment before each answer
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- state ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch (e) { return null; } };
  let chat = load();                 // { token, name, session, last, seen }
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(chat)); } catch (e) { /* lives until reload */ } };

  /* a random id that stays in this browser, so Bekha sees "came back" instead of a stranger.
     Along with it only the browser's time zone and language go to the server: no IP, no location lookup. */
  const VISITOR_KEY = 'chat-visitor';
  function visitorId() {
    try {
      const known = localStorage.getItem(VISITOR_KEY);
      if (known) return known;
      const fresh = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, fresh);
      return fresh;
    } catch (e) { return ''; }   // storage blocked: every chat looks new, nothing breaks
  }
  const whereFrom = () => ({
    tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })(),
    lang: navigator.language || '',
  });
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
  /* a live Dushanbe clock: one text node, re-rendered on every real second while the chat is open */
  const clockEl = h('b', 'chat__clock');
  meta.append(clockEl, document.createTextNode(' in Dushanbe. I answer from Telegram, usually the same day.'));
  const clock = () => new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let clockTimer = 0;
  function paintMeta() {
    clearTimeout(clockTimer);
    clockEl.textContent = clock();
    if (open) clockTimer = setTimeout(paintMeta, 1000 - (Date.now() % 1000) + 5);   // land just after the second turns
  }
  const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  /* "bekha> typing..." while I have the visitor picked in Telegram; always the last line */
  const dots = () => { const d = h('span', 'chat__dots'); d.setAttribute('aria-hidden', 'true'); d.append(h('i'), h('i'), h('i')); return d; };
  const typingEl = h('p', 'chat__line is-owner is-typing');
  typingEl.append(h('span', 'chat__who', 'bekha>'), dots());
  typingEl.setAttribute('aria-label', 'Bekha is typing');
  let revealing = 0;   // answers waiting behind the dots: keep the dots up until they are out
  function showTyping(on) {
    if ((on || revealing) && open) { if (typingEl.parentNode !== log) { log.append(typingEl); log.scrollTop = log.scrollHeight; } }
    else typingEl.remove();
  }
  /* words fade in from a soft blur, one after another */
  function revealWords(p, text) {
    p.lastChild.remove();
    const box = h('span', 'chat__reveal');
    let i = 0;
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { box.append(document.createTextNode(part)); return; }
      const w = h('span', 'chat__word', part);
      w.style.animationDelay = `${Math.min(i++ * WORD_MS, REVEAL_MAX_MS)}ms`;
      box.append(w);
    });
    p.append(box);
  }
  function line(who, text, cls) {
    const p = h('p', `chat__line ${cls || ''}`);
    if (who) p.append(h('span', 'chat__who', who));
    p.append(document.createTextNode(text));
    log.insertBefore(p, typingEl.parentNode === log ? typingEl : null);
    log.scrollTop = log.scrollHeight;
    return p;
  }
  /** live = it just arrived (not history): my answers then get the dots and the word-by-word reveal */
  function paintMessage(m, live = false) {
    if (shown.has(m.id)) return;
    shown.add(m.id);
    const draw = () => {
      const p = line(m.from_owner ? 'bekha>' : `${chat.name}>`, m.body, m.from_owner ? 'is-owner' : 'is-me');
      p.title = time(m.created_at);
      if (m.from_owner && live && !REDUCED) revealWords(p, m.body);
      return p;
    };
    if (!(m.from_owner && live) || REDUCED) { draw(); return; }
    revealing += 1;
    showTyping(true);
    setTimeout(() => {
      revealing -= 1;
      if (!revealing) typingEl.remove();
      draw();
      log.scrollTop = log.scrollHeight;
    }, TYPING_BEAT_MS);
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
  /** the envelope's data; with full = true the whole envelope (poll needs meta.typing) */
  async function api(body, full = false) {
    if (!API) throw new Error('the chat is offline right now. type telegram in the terminal');
    const res = await fetch(`${API}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({ success: false, error: `http ${res.status}` }));
    if (res.status === 401 && chat) {
      // the server forgets a chat after 24 hours of silence: start a fresh one
      chat = null;
      persist();
      setMode();
      shown.clear();
      typingEl.remove();
      if (open) line('', 'this chat was cleared after 24 hours. start again: what should I call you?', 'is-sys');
      throw new Error('expired');
    }
    if (!json.success) throw new Error(json.error || `http ${res.status}`);
    return full ? json : json.data;
  }

  async function poll() {
    clearTimeout(pollTimer);
    if (!chat) return;
    if (polling) { pollAgain = true; return; }
    polling = true;
    try {
      const json = await api({ action: 'poll', token: chat.token, after: chat.last || 0 }, true);
      const list = json.data;
      let fresh = 0;
      list.forEach((m) => {
        if (m.from_owner && !shown.has(m.id) && m.id > (chat.seen || 0)) fresh += 1;
        chat.last = Math.max(chat.last || 0, m.id);
        if (open) paintMessage(m, true);
      });
      if (open) chat.seen = chat.last;
      showTyping(!!json.meta?.typing);
      persist();
      if (fresh) { sfx()?.ping(true, 2); if (!open) unread(fresh + (Number(badge.textContent) || 0)); }
    } catch (err) {
      /* network hiccup: the next tick tries again */
    } finally {
      polling = false;
    }
    if (pollAgain) { pollAgain = false; poll(); return; }
    if (chat) pollTimer = setTimeout(poll, document.hidden ? POLL_HIDDEN_MS : open ? POLL_OPEN_MS : POLL_CLOSED_MS);
  }

  /* history: the whole conversation from the start when the panel opens */
  /* a status line with running dots while the server works; returns a function that removes it */
  function loading(text) {
    const p = line('', text, 'is-sys is-loading');
    p.append(dots());
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
      list.forEach((m) => paintMessage(m));
      if (list.length) chat.last = Math.max(chat.last || 0, list[list.length - 1].id);
      chat.seen = chat.last;
      persist();
    } catch (err) { done(); if (err.message !== 'expired') line('', err.message, 'is-err'); }
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
        const data = await api({ action: 'start', name, visitor: visitorId(), ...whereFrom() });
        done();
        chat = { token: data.token, name: data.name, session: data.session, last: 0, seen: 0 };
        persist();
        setMode();
        line('', `connected as ${data.name}. say hi: what are you building?`, 'is-sys');
        poll();
        return;
      }
      const pending = line(`${chat.name}>`, text.slice(0, BODY_MAX), 'is-me is-pending');   // shown at once, confirmed below
      pending.append(dots());
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
      if (err.message !== 'expired') line('', err.message, 'is-err');
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
      line('', 'this goes straight to my phone. no bots answer here, only me. the chat clears itself after 24 hours.', 'is-sys');
      if (!chat) line('', 'first, what should I call you?', 'is-sys');
    }
    history().then(poll);
    sfx()?.open();
    input.focus();
  }
  function hide() {
    open = false;
    clearTimeout(clockTimer);
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
  /* coming back to the tab (Telegram on top, phone unlocked, back button): check at once */
  const wake = () => { if (!document.hidden) { poll(); if (open) paintMeta(); } };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('focus', wake);
  window.addEventListener('pageshow', wake);
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

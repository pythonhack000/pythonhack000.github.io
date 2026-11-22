/* ssh bekha: write to me from the terminal. The message goes to a small server function that
   forwards it to my Telegram; the bot token never reaches the browser. Without the server,
   the message is copied and Telegram opens instead. */
(() => {
  'use strict';

  const S = window.bekhaShell;
  if (!S) return;

  const API = (window.BEKHA_CONFIG && window.BEKHA_CONFIG.api) || '';
  const TELEGRAM = 'https://t.me/sabrsf0';
  const CONTACT_MAX = 80;
  const MESSAGE_MAX = 1000;
  const MESSAGE_MIN = 5;
  const COOLDOWN_MS = 60 * 1000;
  const SENT_KEY = 'ssh-sent';
  const CANCEL = '\u0003';

  const lastSent = () => { try { return Number(localStorage.getItem(SENT_KEY)) || 0; } catch (e) { return 0; } };
  const markSent = () => { try { localStorage.setItem(SENT_KEY, String(Date.now())); } catch (e) { /* cooldown only for this page */ } };
  const done = () => S.capture(null);

  async function send(contact, message) {
    if (!API) {
      try { await navigator.clipboard.writeText(`${message}\n\n${contact}`); } catch (e) { /* clipboard blocked */ }
      S.print('the relay is offline, so I copied your message. paste it in the Telegram chat that just opened.', 'hl');
      S.go(TELEGRAM);
      return;
    }
    S.print('sending...', 'echo');
    try {
      const res = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contact, message, page: location.pathname }),
      });
      const json = await res.json().catch(() => ({ success: false, error: `http ${res.status}` }));
      if (!json.success) throw new Error(json.error || `http ${res.status}`);
      markSent();
      S.print('delivered to my Telegram. I usually answer the same day.', 'hl');
      window.bekhaExtras?.sound.arp();
    } catch (err) {
      S.print(`ssh: ${err.message}. write me directly: telegram @sabrsf0`, 'err');
    }
  }

  function session() {
    let contact = '';
    S.print('Connecting to bekha@dushanbe port 22... connected.', 'hl');
    S.print('This lands straight in my Telegram. Ctrl+C or ~. to cancel.', 'echo');
    S.print('who are you? a name plus @telegram or email, so I can answer:');
    const onLine = (line) => {
      const v = line.trim();
      if (line === CANCEL || v === '~.') { done(); S.print('Connection to bekha closed.', 'echo'); return; }
      if (!contact) {
        if (!v) { S.print('I need some way to answer you.', 'err'); return; }
        contact = v.slice(0, CONTACT_MAX);
        S.print(`message, up to ${MESSAGE_MAX} characters. Enter sends:`);
        S.capture(onLine, 'msg>');
        return;
      }
      if (v.length < MESSAGE_MIN) { S.print('a bit more than that, please.', 'err'); return; }
      done();
      send(contact, v.slice(0, MESSAGE_MAX));
    };
    S.capture(onLine, 'you>');
  }

  S.command('ssh', (args) => {
    const host = (args[0] || '').toLowerCase().replace(/^.*@/, '');
    if (!host) { S.print('usage: ssh bekha', 'err'); return; }
    if (host !== 'bekha' && host !== 'dushanbe') { S.print(`ssh: connect to host ${args[0]} port 22: Connection refused`, 'err'); return; }
    const wait = COOLDOWN_MS - (Date.now() - lastSent());
    if (wait > 0) { S.print(`slow down: try again in ${Math.ceil(wait / 1000)} s.`, 'err'); return; }
    session();
  }, 'ssh bekha       write to me from here, lands in my Telegram');
})();

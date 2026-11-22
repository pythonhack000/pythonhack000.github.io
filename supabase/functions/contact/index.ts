// ssh bekha: forwards a visitor's message to my Telegram. The bot token stays in function secrets.
// Plain text only (no parse_mode), so a message cannot inject formatting or links into the chat.
import { allow, clientKey, db, fail, readJson, reply } from '../_shared/http.ts';

const CONTACT_MAX = 80;
const MESSAGE_MIN = 5;
const MESSAGE_MAX = 1000;
const MAX_BODY = 4096;
const HOUR = 3600;
const DAY = 24 * HOUR;
const PER_IP_PER_HOUR = 3;
const ALL_PER_DAY = 40;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return reply(req, 204, { success: true });
  if (req.method !== 'POST') return fail(req, 405, 'POST only');

  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) {
    console.error('contact: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');
    return fail(req, 503, 'relay not configured');
  }

  try {
    const body = await readJson(req, MAX_BODY);
    const contact = typeof body?.contact === 'string' ? body.contact.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!contact || contact.length > CONTACT_MAX) return fail(req, 400, `contact: 1 to ${CONTACT_MAX} characters`);
    if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) return fail(req, 400, `message: ${MESSAGE_MIN} to ${MESSAGE_MAX} characters`);

    const client = db();
    if (!(await allow(client, await clientKey(req, 'contact'), PER_IP_PER_HOUR, HOUR))) return fail(req, 429, 'too many messages from here, try in an hour');
    if (!(await allow(client, 'contact:all', ALL_PER_DAY, DAY))) return fail(req, 429, 'inbox is full for today');

    const text = `ssh bekha, from the site\n\nfrom: ${contact}\n\n${message}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      console.error('contact: telegram', res.status, await res.text());
      return fail(req, 502, 'could not deliver');
    }
    return reply(req, 200, { success: true, data: { delivered: true } });
  } catch (err) {
    console.error('contact', err);
    return fail(req, 500, 'server error');
  }
});

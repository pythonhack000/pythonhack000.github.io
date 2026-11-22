// Live chat for the site. A visitor starts a session under a name and gets a secret token;
// each message is forwarded to Bekha's Telegram, his replies come back through tg-webhook.
import { allow, clientKey, db, fail, preflight, readJson, reply, sha256 } from '../_shared/http.ts';
import { ensureThread, markAwaiting, sendToOwner, shortId, telegramConfig, type ChatSession } from '../_shared/telegram.ts';

const NAME_MAX = 32;
const BODY_MAX = 1000;
const MAX_BODY_BYTES = 4096;
const POLL_LIMIT = 50;
const TOKEN_RE = /^[0-9a-f-]{72,80}$/;
const MINUTE = 60;
const HOUR = 3600;
const DAY = 24 * HOUR;

/** trim, drop control characters, collapse whitespace */
const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(req);
  if (req.method !== 'POST') return fail(req, 405, 'POST only');

  try {
    const body = await readJson(req, MAX_BODY_BYTES);
    if (!body) return fail(req, 400, 'bad request');
    const client = db();

    if (body.action === 'start') {
      const name = clean(body.name, NAME_MAX).replace(/\n/g, ' ');
      if (!name) return fail(req, 400, 'a name, please');
      if (!(await allow(client, await clientKey(req, 'chat-start'), 5, HOUR))) return fail(req, 429, 'too many chats from here, try in an hour');
      const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const { data, error } = await client.from('chat_sessions').insert({ name, token_hash: await sha256(token) }).select('id, name').single();
      if (error) throw new Error(error.message);
      return reply(req, 200, { success: true, data: { token, name: data.name, session: shortId(data.id) } });
    }

    const token = typeof body.token === 'string' ? body.token : '';
    if (!TOKEN_RE.test(token)) return fail(req, 401, 'no chat');
    const { data: session } = await client.from('chat_sessions').select('id, name, tg_thread_id, awaiting').eq('token_hash', await sha256(token)).maybeSingle<ChatSession>();
    if (!session) return fail(req, 401, 'no chat');

    if (body.action === 'poll') {
      const after = Number.isSafeInteger(body.after) ? Number(body.after) : 0;
      const { data, error } = await client.from('chat_messages')
        .select('id, from_owner, body, created_at')
        .eq('session_id', session.id).gt('id', after).order('id', { ascending: true }).limit(POLL_LIMIT);
      if (error) throw new Error(error.message);
      return reply(req, 200, { success: true, data });
    }

    if (body.action === 'send') {
      const text = clean(body.body, BODY_MAX);
      if (!text) return fail(req, 400, 'empty message');
      if (!(await allow(client, `chat-session:${session.id}`, 15, 10 * MINUTE))) return fail(req, 429, 'slow down a little');
      if (!(await allow(client, await clientKey(req, 'chat-send'), 60, HOUR))) return fail(req, 429, 'slow down a little');
      if (!(await allow(client, 'chat:all', 400, DAY))) return fail(req, 429, 'the chat is full for today, write on Telegram');

      const { data: msg, error } = await client.from('chat_messages').insert({ session_id: session.id, body: text }).select('id, from_owner, body, created_at').single();
      if (error) throw new Error(error.message);

      await client.from('chat_sessions').update({ last_message_at: msg.created_at }).eq('id', session.id);
      const cfg = telegramConfig();
      let tgId: number | null = null;
      if (cfg) {
        const thread = await ensureThread(cfg, client, session);
        // in a topic the name is already in the title; in the main chat the header says who it is
        tgId = thread
          ? await sendToOwner(cfg, text, thread)
          : await sendToOwner(cfg, `${session.name} · chat #${shortId(session.id)}\n\n${text}\n\nreply to this message to answer`);
        if (thread) await markAwaiting(cfg, client, { ...session, tg_thread_id: thread, awaiting: session.tg_thread_id ? session.awaiting : true }, true);
        else await client.from('chat_sessions').update({ awaiting: true }).eq('id', session.id);
      }
      if (tgId) await client.from('chat_messages').update({ tg_message_id: tgId }).eq('id', msg.id);
      return reply(req, 200, { success: true, data: { ...msg, delivered: tgId !== null } });
    }

    return fail(req, 400, 'unknown action');
  } catch (err) {
    console.error('chat', err);
    return fail(req, 500, 'server error');
  }
});

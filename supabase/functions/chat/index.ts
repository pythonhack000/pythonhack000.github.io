// Live chat for the site. A visitor starts a session under a name and gets a secret token;
// each message is forwarded to Bekha's Telegram, his replies come back through tg-webhook.
import { allow, clientKey, db, fail, preflight, readJson, reply, sha256 } from '../_shared/http.ts';
import { ensureThread, markAwaiting, sendToOwner, telegramConfig, visitorButtons, type ChatSession, type TelegramConfig } from '../_shared/telegram.ts';

const NAME_MAX = 32;
const BODY_MAX = 1000;
const MAX_BODY_BYTES = 4096;
const POLL_LIMIT = 50;
const TOKEN_RE = /^[0-9a-f-]{72,80}$/;
const TYPING_MS = 2 * 60 * 1000;   // "typing" fades if no answer comes
const MINUTE = 60;
const HOUR = 3600;
const DAY = 24 * HOUR;

/** trim, drop control characters, collapse whitespace */
const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '';

/* Bekha's bot works like a messenger: when he is inside this visitor's chat, their message arrives as
   plain text and he just keeps typing; anyone else arrives with a button to switch over. */
async function toOwnerChat(cfg: TelegramConfig, client: ReturnType<typeof db>, session: ChatSession, text: string): Promise<number | null> {
  const { data } = await client.from('bot_state').select('active_session').eq('id', 1).maybeSingle();
  if (data?.active_session === session.id) {
    // he is in this chat: likely to answer, so the visitor sees "typing" for a moment
    await client.from('chat_sessions').update({ owner_typing_at: new Date().toISOString() }).eq('id', session.id);
    return sendToOwner(cfg, `${session.name}: ${text}`);
  }
  const busyWith = data?.active_session
    ? (await client.from('chat_sessions').select('name').eq('id', data.active_session).maybeSingle()).data?.name
    : null;
  const note = busyWith ? `\n\n(ты сейчас в чате с ${busyWith})` : '';
  return sendToOwner(cfg, `Новое сообщение от ${session.name}:\n${text}${note}`, null, visitorButtons(session));
}

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
      return reply(req, 200, { success: true, data: { token, name: data.name, session: data.id.slice(0, 4) } });
    }

    const token = typeof body.token === 'string' ? body.token : '';
    if (!TOKEN_RE.test(token)) return fail(req, 401, 'no chat');
    const { data: session } = await client.from('chat_sessions').select('id, name, tg_thread_id, awaiting, owner_typing_at').eq('token_hash', await sha256(token)).maybeSingle<ChatSession & { owner_typing_at: string | null }>();
    if (!session) return fail(req, 401, 'no chat');

    if (body.action === 'poll') {
      const after = Number.isSafeInteger(body.after) ? Number(body.after) : 0;
      const { data, error } = await client.from('chat_messages')
        .select('id, from_owner, body, created_at')
        .eq('session_id', session.id).gt('id', after).order('id', { ascending: true }).limit(POLL_LIMIT);
      if (error) throw new Error(error.message);
      const typing = !!session.owner_typing_at && Date.now() - new Date(session.owner_typing_at).getTime() < TYPING_MS;
      return reply(req, 200, { success: true, data, meta: { typing } });
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
          : await toOwnerChat(cfg, client, session, text);
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

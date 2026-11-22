// Telegram webhook for @portfolio_bekhabot.
//   - writing inside a visitor's topic answers that visitor (no reply needed)
//   - replying to a visitor's message in the main chat answers them too (when topics are off)
//   - /chats lists conversations, newest first; /to <id> <text> answers by chat id
// Only requests carrying the webhook secret, and only messages from Bekha's own chat, are accepted.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';
import { db } from '../_shared/http.ts';
import { markAwaiting, sendToOwner, shortId, telegramConfig, type ChatSession, type TelegramConfig } from '../_shared/telegram.ts';

const BODY_MAX = 1000;
const LIST_MAX = 15;
const PREVIEW_MAX = 60;
const SESSION_COLS = 'id, name, tg_thread_id, awaiting';
const ok = () => new Response('ok');

const HELP = [
  'Site chat is on. Visitors write on pythonhack000.github.io.',
  '',
  'With topics on: every visitor gets a topic named after them. Write inside it and it goes to that person. ● in the title = waiting for your answer.',
  'Without topics: reply to a visitor\'s message, or use /to <id> <text>.',
  '',
  '/chats  conversations, newest first',
  '/to a1b2 text  answer chat #a1b2',
].join('\n');

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

async function listChats(cfg: TelegramConfig, client: SupabaseClient, threadId?: number) {
  const { data: sessions } = await client.from('chat_sessions').select('id, name, awaiting, last_message_at')
    .not('last_message_at', 'is', null).order('last_message_at', { ascending: false }).limit(LIST_MAX);
  if (!sessions?.length) { await sendToOwner(cfg, 'No conversations yet.', threadId); return; }
  const { data: msgs } = await client.from('chat_messages').select('session_id, body, from_owner')
    .in('session_id', sessions.map((s) => s.id)).order('id', { ascending: false }).limit(LIST_MAX * 20);
  const lines = sessions.map((s) => {
    const own = (msgs ?? []).filter((m) => m.session_id === s.id);
    const last = own[0];
    const preview = last ? `${last.from_owner ? 'you: ' : ''}${last.body.replace(/\s+/g, ' ').slice(0, PREVIEW_MAX)}` : '';
    return `${s.awaiting ? '● ' : '  '}${s.name} #${shortId(s.id)}  ${own.length} msg, ${ago(s.last_message_at)}\n     ${preview}`;
  });
  const waiting = sessions.filter((s) => s.awaiting).length;
  await sendToOwner(cfg, `${sessions.length} chats, ${waiting} waiting for you (●)\n\n${lines.join('\n\n')}`, threadId);
}

/** stores Bekha's answer in a visitor's chat; the site shows it on the next poll */
async function answer(cfg: TelegramConfig, client: SupabaseClient, session: ChatSession, text: string, tgMessageId: number) {
  const { data: msg, error } = await client.from('chat_messages')
    .insert({ session_id: session.id, from_owner: true, body: text.slice(0, BODY_MAX), tg_message_id: tgMessageId })
    .select('created_at').single();
  if (error) { console.error('tg-webhook insert', error.message); return; }
  await client.from('chat_sessions').update({ last_message_at: msg.created_at }).eq('id', session.id);
  await markAwaiting(cfg, client, session, false);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('TG_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) return new Response('forbidden', { status: 403 });
  const cfg = telegramConfig();
  if (!cfg) return ok();

  try {
    const update = await req.json();
    const msg = update?.message;
    if (!msg || String(msg.chat?.id) !== cfg.ownerChatId || typeof msg.text !== 'string') return ok();
    const client = db();
    const text: string = msg.text.trim();
    const threadId: number | undefined = msg.message_thread_id;

    if (text.startsWith('/chats')) { await listChats(cfg, client, threadId); return ok(); }
    if (text.startsWith('/start') || text.startsWith('/help')) { await sendToOwner(cfg, HELP, threadId); return ok(); }
    if (text.startsWith('/to')) {
      const [, id, ...rest] = text.split(/\s+/);
      const body = rest.join(' ');
      const short = (id ?? '').replace(/^#/, '').toLowerCase();
      if (!/^[0-9a-f]{4}$/.test(short) || !body) { await sendToOwner(cfg, 'usage: /to a1b2 your answer', threadId); return ok(); }
      const { data: matches } = await client.from('chat_sessions').select(SESSION_COLS).gte('id', `${short}0000-0000-0000-0000-000000000000`).lte('id', `${short}ffff-ffff-ffff-ffff-ffffffffffff`).limit(2);
      if (matches?.length !== 1) { await sendToOwner(cfg, matches?.length ? 'Two chats share that id, answer inside the topic instead.' : `No chat #${short}.`, threadId); return ok(); }
      await answer(cfg, client, matches[0] as ChatSession, body, msg.message_id);
      await sendToOwner(cfg, `sent to ${matches[0].name}.`, threadId);
      return ok();
    }

    // inside a visitor's topic: everything written there is for them
    if (threadId) {
      const { data: session } = await client.from('chat_sessions').select(SESSION_COLS).eq('tg_thread_id', threadId).maybeSingle<ChatSession>();
      if (session) { await answer(cfg, client, session, text, msg.message_id); return ok(); }
    }

    // main chat: a reply to one of the visitor's messages
    const repliedTo = msg.reply_to_message?.message_id;
    if (repliedTo) {
      const { data: original } = await client.from('chat_messages').select('session_id').eq('tg_message_id', repliedTo).maybeSingle();
      const { data: session } = original
        ? await client.from('chat_sessions').select(SESSION_COLS).eq('id', original.session_id).maybeSingle<ChatSession>()
        : { data: null };
      if (session) { await answer(cfg, client, session, text, msg.message_id); return ok(); }
    }

    await sendToOwner(cfg, 'Not sure who this is for. Write inside a visitor\'s topic, reply to their message, or use /to <id> <text>. /chats lists them.', threadId);
    return ok();
  } catch (err) {
    console.error('tg-webhook', err);
    return ok();   // never make Telegram retry the same update forever
  }
});

// Telegram webhook for @portfolio_bekhabot, driven by buttons:
//   - under each visitor message: [Ответить: name] [История]
//   - after "Ответить", every plain message goes to that visitor until another one is picked
//   - the "Чаты" key under the input lists conversations as buttons, newest first, ● = waiting
//   - inside a visitor's topic (when topics are on) everything written goes to that visitor
// Only requests carrying the webhook secret, and only Bekha's own chat, are accepted.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';
import { db } from '../_shared/http.ts';
import { markAwaiting, MENU, sendToOwner, telegramConfig, tg, visitorButtons, type ChatSession, type Markup, type TelegramConfig } from '../_shared/telegram.ts';

const BODY_MAX = 1000;
const LIST_MAX = 12;
const HISTORY_MAX = 12;
const LINE_MAX = 300;
const SESSION_COLS = 'id, name, tg_thread_id, awaiting';
const UUID_RE = /^[0-9a-f-]{36}$/;
const ok = () => new Response('ok');

function ago(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'сейчас';
  if (s < 3600) return `${Math.floor(s / 60)} мин`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч`;
  return `${Math.floor(s / 86400)} д`;
}

const getSession = async (client: SupabaseClient, id: string) =>
  UUID_RE.test(id) ? (await client.from('chat_sessions').select(SESSION_COLS).eq('id', id).maybeSingle<ChatSession>()).data : null;

async function activeSession(client: SupabaseClient): Promise<ChatSession | null> {
  const { data } = await client.from('bot_state').select('active_session').eq('id', 1).maybeSingle();
  return data?.active_session ? getSession(client, data.active_session) : null;
}
const setActive = (client: SupabaseClient, id: string | null) =>
  client.from('bot_state').update({ active_session: id, updated_at: new Date().toISOString() }).eq('id', 1);

/* ---------- screens: text + buttons, shown by editing one message ---------- */
async function listScreen(client: SupabaseClient): Promise<[string, Markup]> {
  const { data: sessions } = await client.from('chat_sessions').select('id, name, awaiting, last_message_at')
    .not('last_message_at', 'is', null).order('last_message_at', { ascending: false }).limit(LIST_MAX);
  if (!sessions?.length) return ['Пока никто не писал.', { inline_keyboard: [] }];
  const waiting = sessions.filter((s) => s.awaiting).length;
  const rows = sessions.map((s) => [{ text: `${s.awaiting ? '● ' : ''}${s.name} · ${ago(s.last_message_at)}`.slice(0, 60), callback_data: `h:${s.id}` }]);
  return [`Чаты: ${sessions.length}, ждут ответа: ${waiting} (●)\nНажми на человека, чтобы открыть переписку.`, { inline_keyboard: rows }];
}

async function historyScreen(client: SupabaseClient, s: ChatSession): Promise<[string, Markup]> {
  const { data: msgs } = await client.from('chat_messages').select('from_owner, body, created_at')
    .eq('session_id', s.id).order('id', { ascending: false }).limit(HISTORY_MAX);
  const lines = (msgs ?? []).reverse().map((m) => `${m.from_owner ? 'ты' : s.name}: ${m.body.slice(0, LINE_MAX)}`);
  const text = `${s.awaiting ? '● ждёт ответа\n' : ''}Переписка с ${s.name}\n\n${lines.join('\n\n') || 'пусто'}`;
  return [text.slice(0, 4000), { inline_keyboard: [
    [{ text: `Ответить: ${s.name}`.slice(0, 40), callback_data: `r:${s.id}` }],
    [{ text: '« Все чаты', callback_data: 'l' }],
  ] }];
}

async function show(cfg: TelegramConfig, [text, markup]: [string, Markup], editId?: number) {
  if (editId) {
    const edited = await tg(cfg, 'editMessageText', { chat_id: cfg.ownerChatId, message_id: editId, text, reply_markup: markup });
    if (edited) return;
  }
  await sendToOwner(cfg, text, null, markup);
}

/** stores Bekha's answer in a visitor's chat; the site shows it on the next poll */
async function answer(cfg: TelegramConfig, client: SupabaseClient, s: ChatSession, text: string, tgMessageId: number) {
  const { data: msg, error } = await client.from('chat_messages')
    .insert({ session_id: s.id, from_owner: true, body: text.slice(0, BODY_MAX), tg_message_id: tgMessageId })
    .select('created_at').single();
  if (error) { console.error('tg-webhook insert', error.message); return false; }
  await client.from('chat_sessions').update({ last_message_at: msg.created_at, owner_typing_at: null }).eq('id', s.id);
  await markAwaiting(cfg, client, s, false);
  await tg(cfg, 'setMessageReaction', { chat_id: cfg.ownerChatId, message_id: tgMessageId, reaction: [{ type: 'emoji', emoji: '👌' }] });
  return true;
}

/* ---------- button taps ---------- */
async function onCallback(cfg: TelegramConfig, client: SupabaseClient, cq: Record<string, any>) {
  const data: string = cq.data ?? '';
  const msgId: number | undefined = cq.message?.message_id;
  const toast = (text: string) => tg(cfg, 'answerCallbackQuery', { callback_query_id: cq.id, text });

  if (data === 'l') { await show(cfg, await listScreen(client), msgId); await toast(''); return; }
  if (data === 'x') { await client.from('chat_sessions').update({ owner_typing_at: null }).not('owner_typing_at', 'is', null); await setActive(client, null); await toast('Режим ответа выключен'); await sendToOwner(cfg, 'Ок, никому не отвечаешь. Выбери человека в «Чаты».', null, MENU); return; }

  const [kind, id] = [data.slice(0, 1), data.slice(2)];
  const s = await getSession(client, id);
  if (!s) { await toast('Этого чата уже нет'); return; }
  if (kind === 'h') { await show(cfg, await historyScreen(client, s), msgId); await toast(''); return; }
  if (kind === 'r') {
    await setActive(client, s.id);
    await client.from('chat_sessions').update({ owner_typing_at: new Date().toISOString() }).eq('id', s.id);   // the visitor sees "typing..." 
    await toast(`Пишешь: ${s.name}`);
    await sendToOwner(cfg, `Пишешь ${s.name}. Всё, что напишешь дальше, уйдёт этому человеку.`, null,
      { inline_keyboard: [[{ text: 'История', callback_data: `h:${s.id}` }, { text: 'Хватит отвечать', callback_data: 'x' }]] });
  }
}

/* ---------- typed messages ---------- */
async function onMessage(cfg: TelegramConfig, client: SupabaseClient, msg: Record<string, any>) {
  const text: string = msg.text.trim();
  const threadId: number | undefined = msg.message_thread_id;

  if (text === 'Чаты' || text.startsWith('/chats')) { await show(cfg, await listScreen(client)); return; }
  if (text.startsWith('/start') || text.startsWith('/help')) {
    await sendToOwner(cfg, 'Чат с сайта подключён.\n\nКогда кто-то пишет на сайте, сообщение приходит сюда с кнопками «Ответить» и «История». Нажми «Ответить» и просто пиши текстом.\n\nКнопка «Чаты» внизу показывает всех, кто писал. ● значит ждёт ответа.', threadId, MENU);
    return;
  }

  // inside a visitor's topic: everything written there is for them
  if (threadId) {
    const { data: s } = await client.from('chat_sessions').select(SESSION_COLS).eq('tg_thread_id', threadId).maybeSingle<ChatSession>();
    if (s) { await answer(cfg, client, s, text, msg.message_id); return; }
  }

  // a Telegram reply to a visitor's message still works
  const repliedTo = msg.reply_to_message?.message_id;
  if (repliedTo) {
    const { data: original } = await client.from('chat_messages').select('session_id').eq('tg_message_id', repliedTo).maybeSingle();
    const s = original ? await getSession(client, original.session_id) : null;
    if (s) { await answer(cfg, client, s, text, msg.message_id); return; }
  }

  // the visitor picked with "Ответить"
  const active = await activeSession(client);
  if (active) { await answer(cfg, client, active, text, msg.message_id); return; }

  await sendToOwner(cfg, 'Сначала выбери, кому пишешь: «Ответить» под сообщением или кнопка «Чаты».', threadId, MENU);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('TG_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) return new Response('forbidden', { status: 403 });
  const cfg = telegramConfig();
  if (!cfg) return ok();

  try {
    const update = await req.json();
    const client = db();
    const cq = update?.callback_query;
    if (cq && String(cq.from?.id) === cfg.ownerChatId) { await onCallback(cfg, client, cq); return ok(); }
    const msg = update?.message;
    if (msg && String(msg.chat?.id) === cfg.ownerChatId && typeof msg.text === 'string') await onMessage(cfg, client, msg);
    return ok();
  } catch (err) {
    console.error('tg-webhook', err);
    return ok();   // never make Telegram retry the same update forever
  }
});

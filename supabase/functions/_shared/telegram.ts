// Telegram Bot API, plain text only: no parse_mode, so visitor text cannot inject formatting or links.
// Each visitor gets a topic in the owner's private chat with the bot (Bot API "threaded mode");
// when topics are off, messages fall back to the main chat and are answered by replying.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

export interface TelegramConfig {
  token: string;
  ownerChatId: string;
}

export interface ChatSession {
  id: string;
  name: string;
  tg_thread_id: number | null;
  awaiting: boolean;
}

const TOPIC_MAX = 128;
const AWAITING_MARK = '● ';

export function telegramConfig(): TelegramConfig | null {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const ownerChatId = Deno.env.get('TELEGRAM_CHAT_ID');
  return token && ownerChatId ? { token, ownerChatId } : null;
}

/** one Bot API call; returns `result`, or null when Telegram refused (logged) */
export async function tg<T = unknown>(cfg: TelegramConfig, method: string, params: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`https://api.telegram.org/bot${cfg.token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => null);
  if (!json?.ok) {
    console.error(`telegram ${method}`, res.status, json?.description ?? '');
    return null;
  }
  return json.result as T;
}

export type Markup = Record<string, unknown>;

/** a message to the owner, in a topic when given, with optional buttons; returns its message id */
export async function sendToOwner(cfg: TelegramConfig, text: string, threadId?: number | null, markup?: Markup): Promise<number | null> {
  const params: Record<string, unknown> = { chat_id: cfg.ownerChatId, text, disable_web_page_preview: true };
  if (threadId) params.message_thread_id = threadId;
  if (markup) params.reply_markup = markup;
  const msg = await tg<{ message_id: number }>(cfg, 'sendMessage', params);
  return msg?.message_id ?? null;
}

export const shortId = (id: string) => id.slice(0, 4);

/* callback data (max 64 bytes): r:<uuid> enter that chat, h:<uuid> history, l list, x leave the chat */
export const visitorButtons = (s: { id: string; name: string }): Markup => ({
  inline_keyboard: [[
    { text: `Войти в чат: ${s.name}`.slice(0, 40), callback_data: `r:${s.id}` },
    { text: 'История', callback_data: `h:${s.id}` },
  ]],
});

export const LIST_KEY = 'Чаты';
export const LEAVE_KEY = '« Выйти из чата';

/** the keyboard under the input outside a chat */
export const MENU: Markup = { keyboard: [[{ text: LIST_KEY }]], resize_keyboard: true, is_persistent: true, input_field_placeholder: 'выбери чат' };

/** inside a chat: leave or switch, and the input says who the message goes to */
export const chatMenu = (name: string): Markup => ({
  keyboard: [[{ text: LEAVE_KEY }, { text: LIST_KEY }]],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: `сообщение для ${name}`.slice(0, 64),
});
const topicName = (s: ChatSession, awaiting: boolean) => `${awaiting ? AWAITING_MARK : ''}${s.name} · #${shortId(s.id)}`.slice(0, TOPIC_MAX);

/** the visitor's topic, created on their first message; null when topics are off for this bot */
export async function ensureThread(cfg: TelegramConfig, client: SupabaseClient, s: ChatSession): Promise<number | null> {
  if (s.tg_thread_id) return s.tg_thread_id;
  const topic = await tg<{ message_thread_id: number }>(cfg, 'createForumTopic', { chat_id: cfg.ownerChatId, name: topicName(s, true) });
  if (!topic) return null;
  await client.from('chat_sessions').update({ tg_thread_id: topic.message_thread_id, awaiting: true }).eq('id', s.id);
  await sendToOwner(cfg, `Новый чат с сайта: ${s.name}.\nПиши в эту тему, и всё уйдёт этому человеку.`, topic.message_thread_id);
  return topic.message_thread_id;
}

/** flags the topic with ● while the visitor waits for an answer */
export async function markAwaiting(cfg: TelegramConfig, client: SupabaseClient, s: ChatSession, awaiting: boolean): Promise<void> {
  if (s.awaiting === awaiting) return;
  await client.from('chat_sessions').update({ awaiting }).eq('id', s.id);
  if (s.tg_thread_id) await tg(cfg, 'editForumTopic', { chat_id: cfg.ownerChatId, message_thread_id: s.tg_thread_id, name: topicName(s, awaiting) });
}

// Telegram webhook for @portfolio_bekhabot. When Bekha replies to a visitor's message in Telegram,
// the reply is stored in that visitor's chat and shows up on the site at the next poll.
// Only requests carrying the webhook secret, and only messages from Bekha's own chat, are accepted.
import { db } from '../_shared/http.ts';
import { sendToOwner, telegramConfig } from '../_shared/telegram.ts';

const BODY_MAX = 1000;
const ok = () => new Response('ok');

Deno.serve(async (req) => {
  const secret = Deno.env.get('TG_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) return new Response('forbidden', { status: 403 });
  const cfg = telegramConfig();
  if (!cfg) return ok();

  try {
    const update = await req.json();
    const msg = update?.message;
    if (!msg || String(msg.chat?.id) !== cfg.ownerChatId || typeof msg.text !== 'string') return ok();

    const repliedTo = msg.reply_to_message?.message_id;
    if (!repliedTo) {
      const help = msg.text.startsWith('/start')
        ? 'Site chat is on. Visitors write on pythonhack000.github.io, their messages land here. Reply to a message to answer that visitor.'
        : 'Reply to a visitor\'s message (swipe it, or tap Reply) so I know who it is for.';
      await sendToOwner(cfg, help);
      return ok();
    }

    const client = db();
    const { data: original } = await client.from('chat_messages').select('session_id').eq('tg_message_id', repliedTo).maybeSingle();
    if (!original) {
      await sendToOwner(cfg, 'That message is not from a site chat, so there is nobody to deliver this to.');
      return ok();
    }
    const { error } = await client.from('chat_messages').insert({
      session_id: original.session_id,
      from_owner: true,
      body: msg.text.slice(0, BODY_MAX),
      tg_message_id: msg.message_id,
    });
    if (error) console.error('tg-webhook insert', error.message);
    return ok();
  } catch (err) {
    console.error('tg-webhook', err);
    return ok();   // never make Telegram retry the same update forever
  }
});

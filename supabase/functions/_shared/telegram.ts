// Telegram Bot API, plain text only: no parse_mode, so user text cannot inject formatting or links.

export interface TelegramConfig {
  token: string;
  ownerChatId: string;
}

export function telegramConfig(): TelegramConfig | null {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const ownerChatId = Deno.env.get('TELEGRAM_CHAT_ID');
  return token && ownerChatId ? { token, ownerChatId } : null;
}

/** sends a message to Bekha; returns its Telegram message id, or null when delivery failed */
export async function sendToOwner(cfg: TelegramConfig, text: string): Promise<number | null> {
  const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: cfg.ownerChatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) {
    console.error('telegram sendMessage', res.status, await res.text());
    return null;
  }
  const json = await res.json();
  return typeof json?.result?.message_id === 'number' ? json.result.message_id : null;
}

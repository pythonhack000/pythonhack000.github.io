// Shared helpers for the site's Edge Functions: CORS for the site only, one response envelope, IP rate limits.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

const ALLOWED_ORIGINS = new Set([
  'https://pythonhack000.github.io',
  'http://localhost:5311',
]);

export interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'access-control-allow-origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://pythonhack000.github.io',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'origin',
  };
}

export function reply<T>(req: Request, status: number, body: Envelope<T>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'content-type': 'application/json' },
  });
}

/** CORS preflight: 204 must not carry a body */
export const preflight = (req: Request) => new Response(null, { status: 204, headers: cors(req) });

export const fail = (req: Request, status: number, error: string) => reply(req, status, { success: false, error });

export function db(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** the caller's IP, hashed: we only need to count, not to know who */
export async function clientKey(req: Request, scope: string): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  return `${scope}:${await sha256(`${scope}|${ip}`)}`;
}

/** true when this bucket has room; records the hit. Old hits are pruned on the way. */
export async function allow(client: SupabaseClient, bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  await client.from('rate_hits').delete().eq('bucket', bucket).lt('at', since);
  const { count, error } = await client.from('rate_hits').select('*', { count: 'exact', head: true }).eq('bucket', bucket).gte('at', since);
  if (error) throw new Error(`rate limit: ${error.message}`);
  if ((count ?? 0) >= max) return false;
  const { error: insertError } = await client.from('rate_hits').insert({ bucket });
  if (insertError) throw new Error(`rate limit: ${insertError.message}`);
  return true;
}

export async function readJson(req: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

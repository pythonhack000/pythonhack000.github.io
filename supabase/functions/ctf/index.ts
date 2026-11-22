// CTF scoreboard. Flags are checked here against the same SHA-256 list the site uses,
// so a forged request cannot score without knowing the flags.
import { allow, clientKey, db, fail, readJson, reply, sha256 } from '../_shared/http.ts';

const FLAG_HASHES: ReadonlyArray<string> = [
  '1cc9f1f1b1ba16103242aee7a93e3c1d923e180dffd3f5cb6253a26cf2208549',
  '73e8a207df31e0721fa07b51b78308982640f16fa5242bbf6845613db688c466',
  '568a2177655bd4067847a8ec18e6a9f0d4c6a7ae955e87f110de6d6275f252a2',
  '7d4e13a0e45ed1ea3b53c5d351446a6143f72677593f95eeeb80e379c442820a',
  'a4c684edce28324797ae5e0abc032653c4daf09cb38ab85eca997b52ba1b9641',
  '609b78f83d9ea098187aecb6ef1649f1634383d12ae81a4746ab46ca2f024020',
  '6cecbc6fc5e94d7d356a0c058b486a3231198596f1514cbbec35f85f8311a605',
];
const NICK_RE = /^[A-Za-z0-9_-]{3,16}$/;
const FLAG_RE = /^flag\{[a-z0-9_]{6,64}\}$/;
const TOKEN_RE = /^[0-9a-f-]{72,80}$/;
const MAX_BODY = 2048;
const TOP_ROWS = 20;
const HOUR = 3600;

/** flag ids (1-based) for the flags that are real */
async function verify(flags: unknown): Promise<number[]> {
  if (!Array.isArray(flags)) return [];
  const ids = new Set<number>();
  for (const f of flags.slice(0, FLAG_HASHES.length)) {
    if (typeof f !== 'string' || !FLAG_RE.test(f)) continue;
    const i = FLAG_HASHES.indexOf(await sha256(f));
    if (i >= 0) ids.add(i + 1);
  }
  return [...ids];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return reply(req, 204, { success: true });
  if (req.method !== 'POST') return fail(req, 405, 'POST only');

  try {
    const body = await readJson(req, MAX_BODY);
    if (!body) return fail(req, 400, 'bad request');
    const client = db();

    if (body.action === 'top') {
      const { data, error } = await client.rpc('ctf_top', { max_rows: TOP_ROWS });
      if (error) throw new Error(error.message);
      return reply(req, 200, { success: true, data });
    }

    if (body.action === 'join') {
      const nick = typeof body.nick === 'string' ? body.nick.trim() : '';
      if (!NICK_RE.test(nick)) return fail(req, 400, 'nick: 3 to 16 letters, digits, _ or -');
      if (!(await allow(client, await clientKey(req, 'ctf-join'), 5, HOUR))) return fail(req, 429, 'too many sign-ups from here, try in an hour');
      const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const { data: player, error } = await client.from('ctf_players').insert({ nick, token_hash: await sha256(token) }).select('id, nick').single();
      if (error) return fail(req, error.code === '23505' ? 409 : 500, error.code === '23505' ? 'nick taken' : 'could not register');
      const ids = await verify(body.flags);
      if (ids.length) await client.from('ctf_solves').upsert(ids.map((flag_id) => ({ player_id: player.id, flag_id })), { ignoreDuplicates: true });
      return reply(req, 200, { success: true, data: { nick: player.nick, token, score: ids.length } });
    }

    if (body.action === 'solve') {
      const token = typeof body.token === 'string' ? body.token : '';
      if (!TOKEN_RE.test(token)) return fail(req, 401, 'unknown player');
      if (!(await allow(client, await clientKey(req, 'ctf-solve'), 60, HOUR))) return fail(req, 429, 'slow down');
      const { data: player } = await client.from('ctf_players').select('id').eq('token_hash', await sha256(token)).maybeSingle();
      if (!player) return fail(req, 401, 'unknown player');
      const ids = await verify(body.flags);
      if (ids.length) await client.from('ctf_solves').upsert(ids.map((flag_id) => ({ player_id: player.id, flag_id })), { ignoreDuplicates: true });
      const { count } = await client.from('ctf_solves').select('*', { count: 'exact', head: true }).eq('player_id', player.id);
      return reply(req, 200, { success: true, data: { score: count ?? ids.length } });
    }

    return fail(req, 400, 'unknown action');
  } catch (err) {
    console.error('ctf', err);
    return fail(req, 500, 'server error');
  }
});

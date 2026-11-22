// GitHub data for the site, cached: one refresh per 15 minutes for all visitors instead of
// nine unauthenticated requests per visitor (GitHub allows 60 an hour per IP).
import { cors, db } from '../_shared/http.ts';

const GH_USER = 'pythonhack000';
const CACHE_MS = 15 * 60 * 1000;
const REPOS = 6;
const PER_REPO = 4;
const SHOW = 10;
const MSG_MAX = 60;

interface Commit { sha: string; repo: string; msg: string; at: string; url: string }
interface GhData { repos: number | null; last: { name: string; at: string } | null; commits: Commit[] }

async function getJson(path: string) {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'portfolio-site' };
  const token = Deno.env.get('GITHUB_TOKEN');
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`github ${res.status} ${path}`);
  return res.json();
}

const firstLine = (msg: string) => {
  const line = String(msg || '').split('\n')[0].trim();
  return line.length > MSG_MAX ? `${line.slice(0, MSG_MAX - 1)}…` : line;
};

async function fetchGithub(): Promise<GhData> {
  const [user, repos] = await Promise.all([
    getJson(`/users/${GH_USER}`),
    getJson(`/users/${GH_USER}/repos?sort=pushed&per_page=${REPOS + 4}`),
  ]);
  const live = (repos as Array<Record<string, any>>).filter((r) => !r.fork && !r.archived).slice(0, REPOS);
  const lists = await Promise.all(live.map((r) =>
    getJson(`/repos/${GH_USER}/${r.name}/commits?per_page=${PER_REPO}`)
      .then((list: Array<Record<string, any>>) => list.map((c) => ({ sha: c.sha.slice(0, 7), repo: r.name, msg: firstLine(c.commit.message), at: c.commit.author.date, url: c.html_url })))
      .catch(() => [] as Commit[]),   // an empty repo answers 409
  ));
  const top = repos[0];
  return {
    repos: typeof user.public_repos === 'number' ? user.public_repos : null,
    last: top?.pushed_at ? { name: top.name, at: top.pushed_at } : null,
    commits: lists.flat().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, SHOW),
  };
}

const respond = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors(req), 'access-control-allow-methods': 'GET, OPTIONS', 'content-type': 'application/json', 'cache-control': 'public, max-age=300' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors(req), 'access-control-allow-methods': 'GET, OPTIONS' } });
  if (req.method !== 'GET') return respond(req, 405, { success: false, error: 'GET only' });

  const client = db();
  const { data: cached } = await client.from('gh_cache').select('data, fetched_at').eq('id', 1).maybeSingle();
  const fresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_MS;
  if (fresh) return respond(req, 200, { success: true, data: cached.data });

  try {
    const data = await fetchGithub();
    await client.from('gh_cache').upsert({ id: 1, data, fetched_at: new Date().toISOString() });
    return respond(req, 200, { success: true, data });
  } catch (err) {
    console.error('gh', err);
    // GitHub down or rate-limited: an old copy beats nothing
    if (cached) return respond(req, 200, { success: true, data: cached.data, stale: true });
    return respond(req, 502, { success: false, error: 'github unavailable' });
  }
});

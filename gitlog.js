/* git log: the latest real commits across my public repos. They come from the server's cached copy
   (script.js, window.bekhaGithub); GitHub is asked directly only when that is unavailable. */
(() => {
  'use strict';

  const S = window.bekhaShell;
  if (!S) return;

  const GH_USER = 'pythonhack000';
  const CACHE_KEY = 'gitlog';
  const CACHE_MS = 15 * 60 * 1000;
  const REPOS = 6;
  const PER_REPO = 4;
  const SHOW = 10;
  const MSG_MAX = 60;
  const t = (...a) => (window.bekhaI18n ? window.bekhaI18n.t(...a) : a[0]);

  const getJson = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`github ${r.status}`))));
  const firstLine = (msg) => {
    const line = String(msg || '').split('\n')[0].trim();
    return line.length > MSG_MAX ? `${line.slice(0, MSG_MAX - 1)}…` : line;
  };

  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      return c && Date.now() - c.at < CACHE_MS ? c.commits : null;
    } catch (e) { return null; }
  }

  let pending = null;
  /** @returns {Promise<Array<{sha: string, repo: string, msg: string, at: string, url: string}>>} newest first */
  function commits() {
    const cached = readCache();
    if (cached) return Promise.resolve(cached);
    if (pending) return pending;
    pending = (async () => {
      const shared = await (window.bekhaGithub || Promise.reject(new Error('none'))).catch(() => null);
      if (shared?.commits?.length) return shared.commits;   // the server's cached copy: no GitHub calls from here
      const repos = await getJson(`https://api.github.com/users/${GH_USER}/repos?sort=pushed&per_page=${REPOS + 4}`);
      const live = repos.filter((r) => !r.fork && !r.archived).slice(0, REPOS);
      const lists = await Promise.all(live.map((r) =>
        getJson(`https://api.github.com/repos/${GH_USER}/${r.name}/commits?per_page=${PER_REPO}`)
          .then((list) => list.map((c) => ({ sha: c.sha.slice(0, 7), repo: r.name, msg: firstLine(c.commit.message), at: c.commit.author.date, url: c.html_url })))
          .catch(() => []),   // an empty repo answers 409: skip it
      ));
      const all = lists.flat().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, SHOW);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), commits: all })); } catch (e) { /* not cached */ }
      return all;
    })().finally(() => { pending = null; });
    return pending;
  }

  /* the neofetch row on the page */
  function paintRow(list) {
    const row = document.getElementById('ghCommit');
    const c = list[0];
    if (!row || !c) return;
    row.querySelector('dd').textContent = t('ghCommit', c.msg, c.repo, S.ago(c.at));
    row.hidden = false;
  }
  let latest = [];
  commits().then((list) => { latest = list; paintRow(list); }).catch(() => { /* rate limit or offline: the row stays hidden */ });
  document.addEventListener('bekha:lang', () => paintRow(latest));

  S.command('git', async (args) => {
    if ((args[0] || '').toLowerCase() !== 'log') { S.print('git: only git log works here. this is a portfolio, not a forge.', 'err'); return; }
    S.print('fetching from github...', 'echo');
    try {
      const list = await commits();
      if (!list.length) { S.print('no commits found. suspicious.', 'err'); return; }
      list.forEach((c) => S.print(`${c.sha}  ${c.repo.padEnd(18)} ${S.ago(c.at).padEnd(16)} ${c.msg}`));
      S.print(`live from github.com/${GH_USER}. yes, these are real.`, 'echo');
    } catch (err) {
      S.print(`git log: ${err.message}. github allows 60 requests an hour without a token, try later.`, 'err');
    }
  }, 'git log         what I shipped lately, live from GitHub');
})();

/* The resume, as data. The terminal prints it with `cat resume`; resume.html renders and prints it. */
(() => {
  'use strict';

  const RESUME = Object.freeze({
    name: 'Behruz Nabizoda (Bekha)',
    title: 'Full-stack developer',
    location: 'Dushanbe, Tajikistan',
    contacts: [
      ['telegram', '@sabr_sf0', 'https://t.me/sabr_sf0'],
      ['email', 'pythonhack000@gmail.com', 'mailto:pythonhack000@gmail.com'],
      ['github', 'github.com/pythonhack000', 'https://github.com/pythonhack000'],
      ['linkedin', 'Behruz Nabizoda', 'https://www.linkedin.com/in/behruz-nabizoda-669491238/'],
      ['site', 'pythonhack000.github.io', 'https://pythonhack000.github.io/'],
    ],
    summary: 'I build and ship web apps, mobile apps, Telegram bots and AI tools on my own, from the first commit to the live server. On GitHub since 2021, 15 projects shipped, most of them for real businesses in Tajikistan.',
    projects: [
      ['Lunar Site Navigator', 'NASA Space Apps 2026, team Swarm. A 3D Moon that finds landing sites at the south pole by sunlight and line of sight to Earth, on NASA LRO terrain.', 'React, three.js', 'https://pythonhack000.github.io/lunar-navigator/'],
      ['Feudlands', 'A daily war over a hand-drawn island, played inside a Reddit post by the whole subreddit.', 'Devvit Web, TypeScript', 'https://www.reddit.com/r/feudlands_dev/comments/1y4sw8n/feudlands_day_1_cats_or_dogs_pick_a_side_and_take/'],
      ['Crumple', 'A daily trick-shot puzzle for Reddit where every miss stays on a table shared by all players.', 'Phaser, Devvit', 'https://github.com/pythonhack000/crumple'],
      ['Page 100', 'Teletext, resurrected: news, weather and rates at about 1 KB a page, for slow mobile networks.', 'TypeScript, Vite', 'https://pythonhack000.github.io/page-100/'],
      ['SPHEREx Blink', 'NASA Space Apps 2026. Plays NASA SPHEREx exposures of a sky position like a video, so moving objects stand out.', 'Python, JavaScript', 'https://pythonhack000.github.io/spherex-blink/'],
      ['Store POS', 'Desktop till, stock and manager for a shop in Dushanbe, replacing three Windows programs.', 'Electron, React, PostgreSQL', null],
      ['TRADEBOARD', 'AI draws trendlines and zones on a live chart while it explains them.', 'React, TypeScript, four AI providers', 'https://pythonhack000.github.io/tradevision/'],
      ['AccBozor', 'Game and Steam account marketplace for Tajikistan. Escrow holds the money until the buyer confirms.', 'Next.js, Supabase', 'https://pythonhack000.github.io/bozor/'],
      ['Smart Canteen', 'Lunch ordering app for a university canteen, with bonuses and live order status.', 'Expo, React Native, Supabase', 'https://github.com/pythonhack000/canteen-mobile'],
      ['BYSABR', 'Fashion store with catalog, checkout and an admin panel that syncs across devices.', 'JavaScript, Supabase', 'https://pythonhack000.github.io/bysabr-shop/'],
      ['Takhtabozor', 'Stock, sales and customer debts for a timber yard, counted in somoni.', 'React, Vite, Tailwind', 'https://pythonhack000.github.io/takhtabozor/'],
      ['Flex', 'One pay-per-visit pass for gyms across Dushanbe: landing page, clickable app and the pricing research behind it.', 'Product, research, web', 'https://pythonhack000.github.io/gym/'],
      ['TradeSignal bot', 'Telegram bot that sends trading signals.', 'Python, OpenAI', null],
      ['DII Campus', 'Student app for my university.', 'HTML, CSS, JavaScript, no dependencies', 'https://pythonhack000.github.io/dii-campus/'],
    ],
    skills: [
      ['Languages', 'TypeScript, Python, C, C++, Dart'],
      ['Frontend', 'React, Next.js, Vite, Tailwind, Flutter, three.js'],
      ['Backend', 'Supabase, PostgreSQL, Flask, REST, WebSockets'],
      ['Mobile', 'Expo, React Native, Flutter'],
      ['AI', 'OpenAI, Anthropic, Gemini, Telegram Bot API'],
      ['Security', 'Kali Linux, Burp Suite, Wireshark, Nmap, CTF and OSINT'],
    ],
    education: [['DII, Dushanbe', 'Computer science student']],
    extra: [
      'NASA Space Apps Challenge 2026, team Swarm',
      'I test my own apps with Burp Suite and review escrow and payment flows line by line',
      'Solo on every project: design, code, deploy',
    ],
  });
  window.BEKHA_RESUME = RESUME;

  const S = window.bekhaShell;
  if (!S) return;
  function print() {
    S.print(`${RESUME.name}, ${RESUME.title.toLowerCase()}, ${RESUME.location}`, 'hl');
    S.print(RESUME.summary);
    S.print('');
    S.print('projects', 'hl');
    RESUME.projects.forEach(([name, what, stack]) => S.print(`  ${name.padEnd(22)}${what} (${stack})`));
    S.print('');
    S.print('skills', 'hl');
    RESUME.skills.forEach(([k, v]) => S.print(`  ${k.padEnd(12)}${v}`));
    S.print('');
    RESUME.education.forEach(([where, what]) => S.print(`education   ${what}, ${where}`));
    S.print('pdf: type resume --pdf, or open /resume.html', 'echo');
  }
  S.file('resume', () => { print(); return []; });
  S.file('resume.txt', () => { print(); return []; });
  S.command('resume', (args) => {
    if (args[0] === '--pdf' || args[0] === 'pdf') { S.print('opening the printable resume...', 'hl'); S.go('resume.html'); return; }
    print();
  }, 'resume [--pdf]  my resume here, or as a PDF');
})();

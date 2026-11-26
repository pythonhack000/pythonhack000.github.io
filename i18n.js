/* English and Russian. Elements carry data-i18n="key"; the rest of the scripts ask t(key). */
(() => {
  'use strict';

  const DICT = {
    en: {
      title: 'Bekha — full-stack developer in Dushanbe',
      name: 'BEKHA',
      description: 'Bekha builds and ships web apps, mobile apps, Telegram bots and AI tools from Dushanbe. Type help in the terminal.',
      skip: 'Skip to projects',
      status: 'open to new projects',
      soundOn: 'sound: on', soundOff: 'sound: off',
      lead: 'Full-stack developer in Dushanbe. I build and ship web apps, mobile apps, Telegram bots and AI tools on my own, from the first commit to the live server.',
      factShipped: 'shipped', factShippedV: '15 projects',
      factGithub: 'on github', factGithubV: 'since 2021',
      factOff: 'off hours', factOffV: 'CTF and OSINT',
      hintA: 'type', hintB: 'and press enter',
      workH: '15 open ports. Each one is a product I shipped.',
      uptimeWait: 'uptime check runs when you scroll here',
      uptimeLocal: 'uptime check runs on pythonhack000.github.io',
      uptimeRun: (n) => `checking ${n} live services...`,
      uptimeDone: (up, n, ms) => `uptime check: ${up}/${n} up, median ${ms}ms, checked just now from your browser`,
      rowLunar: 'NASA Space Apps 2026, team Swarm. A 3D Moon that finds landing sites at the south pole by sunlight and line of sight to Earth, on NASA LRO terrain. React, three.js.',
      rowTrade: 'AI draws trendlines and zones on a live chart while it explains them. React, TypeScript, four AI providers.',
      rowBozor: 'Game and Steam account marketplace for Tajikistan. Escrow holds the money until the buyer confirms. Next.js, Supabase.',
      rowFlex: 'One pay-per-visit pass for gyms across Dushanbe. Landing page, clickable app and the pricing research behind it.',
      rowTakhta: 'Stock, sales and customer debts for a timber yard, counted in somoni. React, Vite, Tailwind.',
      rowSabr: 'Fashion store with catalog, checkout and an admin panel that syncs across devices. JavaScript, Supabase.',
      rowCanteen: 'Lunch ordering app for a university canteen, with bonuses and live order status. Expo, React Native, Supabase.',
      rowSignal: 'Telegram bot that reads the market with OpenAI and runs around the clock on a VPS. Python, FFmpeg.',
      rowFeud: 'A daily war over a hand-drawn island, played inside a Reddit post. The whole subreddit fights for the same map, and the best arguments become the battle cries that win hexes. Devvit Web.',
      rowCrumple: "A daily trick-shot puzzle drawn in ballpoint pen. Every miss stays on the shared table, so you can bank off other players' balls. Phaser, Devvit, Reddit.",
      rowPage100: 'Teletext, resurrected: live news, weather and exchange rates on a 40 x 24 screen, about 1 KB a page, so it loads on 2G. TypeScript, Vite.',
      rowBlink: 'NASA Space Apps 2026. A blink comparator for NASA SPHEREx: enter a sky position and its exposures play like a video, so moving objects stand out. Python, JavaScript.',
      rowMachine: 'The answering machine, back with a brain. Strangers call a link, the machine screens them, flags scams and takes a confirmed callback number.',
      rowPos: 'Desktop point of sale for a shop in Dushanbe: till, stock and manager in one app, replacing three old Windows programs. Electron, React, local Postgres.',
      rowDii: 'Student app for my university. Plain HTML, CSS and JavaScript, no dependencies.',
      scanDone: 'Nmap done: 15 hosts up, 0 filtered. Scan took 5 years.',
      scanMoreNote: 'Not shown: 9 open ports.', scanMoreNoteAll: 'Showing all 15 open ports.',
      scanMoreAll: 'nmap --all', scanMoreTop: 'nmap --top',
      pingPrivate: 'private, on a VPS', pingGithub: 'source on github', pingWait: 'pinging...', pingNone: 'no response',
      neoOS: 'Tajikistan, Dushanbe', neoHost: 'DII, computer science student', neoUptime: 'shipping since 2021',
      neoSpace: 'NASA Space Apps 2026, team Swarm', neoPkgs: '15 projects shipped', neoMode: 'solo: design, code, deploy',
      neoArt: '93% mountains. 100% online.',
      ghRepos: (n) => `${n} public on GitHub`,
      ghPush: (when, repo) => `${when}, to ${repo}`,
      ghCommit: (msg, repo, when) => `"${msg}" in ${repo}, ${when}`,
      secH: 'I break things on purpose, so the ones I ship hold.',
      log1: 'Kali Linux as a daily lab', log2: 'Burp Suite on my own apps before anyone else gets to them',
      log3: 'Wireshark, Nmap and Ncat for the network side', log4: 'CTF and OSINT challenges on weekends',
      log5: 'Escrow and payment flows reviewed line by line',
      contactH: 'Got a product in your head? Send it over.',
      contactLead: 'One paragraph is enough. I reply fastest on Telegram.',
      foot: '© 2026 Bekha. Built by hand, no templates.',
      ready: 'ready. type help, or sudo hire-me.',
      whoami1: 'Bekha. Full-stack developer in Dushanbe, DII student, CTF player.',
      whoami2: 'Ten projects shipped since 2021, all solo. NASA Space Apps 2026 with team Swarm.',
      lastPush: (when, repo) => `last push ${when}, to ${repo}`,
      nasa1: 'Lunar Site Navigator, NASA Space Apps Challenge 2026, team Swarm, Dushanbe.',
      nasa2: 'Finds landing sites at the lunar south pole by sunlight and line of sight to Earth.',
      nasa3: 'type open lunar to fly there.',
      langSet: 'language: English.',
      introSkip: 'press any key to skip',
      osBoot: (n) => `BEKHA-OS: booting ${n}...`,
      workHint: 'click a port to boot the live project right here, in a window. cmd+click opens a tab.',
      rareSignal: '[!] rare signal: green phosphor. only 3% of visits get this one.',
      distKm: (n) => `${n} km to dushanbe`, distHome: 'dushanbe. home.', homeTag: 'dushanbe',
      breachNote: 'Relax, nothing happened. Now hire the guy who built this: ',
      breachClose: 'close  [esc]',
      ago: (n, unit) => (unit === 'now' ? 'just now' : `${n} ${unit}${n > 1 ? 's' : ''} ago`),
    },
    ru: {
      title: 'Беха — full-stack разработчик из Душанбе',
      name: 'БЕХА',
      description: 'Беха делает и запускает веб-приложения, мобильные приложения, Telegram-ботов и AI-инструменты в Душанбе. Напиши help в терминале.',
      skip: 'К проектам',
      status: 'открыт для новых проектов',
      soundOn: 'звук: вкл', soundOff: 'звук: выкл',
      lead: 'Full-stack разработчик из Душанбе. Сам делаю и запускаю веб-приложения, мобильные приложения, Telegram-ботов и AI-инструменты: от первого коммита до живого сервера.',
      factShipped: 'запущено', factShippedV: '15 проектов',
      factGithub: 'на github', factGithubV: 'с 2021 года',
      factOff: 'в свободное время', factOffV: 'CTF и OSINT',
      hintA: 'напиши', hintB: 'и нажми enter',
      workH: '15 открытых портов. Каждый — продукт, который я запустил.',
      uptimeWait: 'проверка аптайма запустится, когда долистаешь сюда',
      uptimeLocal: 'проверка аптайма работает на pythonhack000.github.io',
      uptimeRun: (n) => `проверяю ${n} живых сервисов...`,
      uptimeDone: (up, n, ms) => `аптайм: ${up}/${n} в сети, медиана ${ms} мс, проверено только что из твоего браузера`,
      rowLunar: 'NASA Space Apps 2026, команда Swarm. 3D-Луна, которая ищет места посадки на южном полюсе по солнечному свету и прямой видимости Земли, на рельефе NASA LRO. React, three.js.',
      rowTrade: 'ИИ рисует трендовые линии и зоны на живом графике и тут же объясняет их. React, TypeScript, четыре AI-провайдера.',
      rowBozor: 'Маркетплейс игровых и Steam-аккаунтов для Таджикистана. Эскроу держит деньги, пока покупатель не подтвердит. Next.js, Supabase.',
      rowFlex: 'Один абонемент с оплатой за визит во все залы Душанбе. Лендинг, кликабельное приложение и исследование цен.',
      rowTakhta: 'Склад, продажи и долги клиентов для лесного рынка, в сомони. React, Vite, Tailwind.',
      rowSabr: 'Магазин одежды с каталогом, оформлением заказа и админкой, которая синхронизируется между устройствами. JavaScript, Supabase.',
      rowCanteen: 'Приложение для заказа обедов в университетской столовой: бонусы и статус заказа в реальном времени. Expo, React Native, Supabase.',
      rowSignal: 'Telegram-бот, который читает рынок через OpenAI и круглосуточно работает на VPS. Python, FFmpeg.',
      rowFeud: 'Ежедневная война за нарисованный остров прямо в посте на Reddit. Весь сабреддит воюет за одну карту, а лучшие аргументы становятся боевыми кличами, которые берут клетки. Devvit Web.',
      rowCrumple: 'Ежедневная головоломка с трюковым броском, нарисованная шариковой ручкой. Каждый промах остаётся на общем столе, и от чужих шариков можно отбиваться. Phaser, Devvit, Reddit.',
      rowPage100: 'Телетекст, воскрешённый: свежие новости, погода и курсы валют на экране 40 x 24, около 1 КБ на страницу, грузится даже на 2G. TypeScript, Vite.',
      rowBlink: 'NASA Space Apps 2026. Блинк-компаратор для NASA SPHEREx: вводишь точку на небе, снимки проигрываются как видео, и движущиеся объекты сразу видны. Python, JavaScript.',
      rowMachine: 'Автоответчик вернулся, теперь с мозгами. Незнакомцы звонят по ссылке, машина их проверяет, помечает мошенников и берёт подтверждённый номер для обратного звонка.',
      rowPos: 'Десктопная касса для магазина в Душанбе: касса, склад и менеджер в одном приложении вместо трёх старых программ для Windows. Electron, React, локальный Postgres.',
      rowDii: 'Студенческое приложение моего университета. Чистый HTML, CSS и JavaScript, без зависимостей.',
      scanDone: 'Nmap завершён: 15 хостов в сети, 0 отфильтровано. Сканирование заняло 5 лет.',
      scanMoreNote: 'Не показано: ещё 9 открытых портов.', scanMoreNoteAll: 'Показаны все 15 открытых портов.',
      scanMoreAll: 'nmap --all', scanMoreTop: 'nmap --top',
      pingPrivate: 'приватный, на VPS', pingGithub: 'исходники на github', pingWait: 'пингую...', pingNone: 'нет ответа',
      neoOS: 'Таджикистан, Душанбе', neoHost: 'DII, студент computer science', neoUptime: 'запускаю с 2021 года',
      neoSpace: 'NASA Space Apps 2026, команда Swarm', neoPkgs: '15 запущенных проектов', neoMode: 'соло: дизайн, код, деплой',
      neoArt: '93% горы. 100% онлайн.',
      ghRepos: (n) => `${n} публичных на GitHub`,
      ghPush: (when, repo) => `${when}, в ${repo}`,
      ghCommit: (msg, repo, when) => `«${msg}» в ${repo}, ${when}`,
      secH: 'Ломаю вещи специально, чтобы то, что я запускаю, держалось.',
      log1: 'Kali Linux как ежедневная лаборатория', log2: 'Burp Suite на своих же приложениях, раньше всех остальных',
      log3: 'Wireshark, Nmap и Ncat для сетевой части', log4: 'CTF и OSINT-задачи по выходным',
      log5: 'Эскроу и платёжные потоки проверены построчно',
      contactH: 'Есть идея продукта? Присылай.',
      contactLead: 'Хватит одного абзаца. Быстрее всего отвечаю в Telegram.',
      foot: '© 2026 Беха. Сделано руками, без шаблонов.',
      ready: 'готово. напиши help или sudo hire-me.',
      whoami1: 'Беха. Full-stack разработчик из Душанбе, студент DII, играю в CTF.',
      whoami2: 'Десять проектов с 2021 года, все в одиночку. NASA Space Apps 2026 с командой Swarm.',
      lastPush: (when, repo) => `последний пуш ${when}, в ${repo}`,
      nasa1: 'Lunar Site Navigator, NASA Space Apps Challenge 2026, команда Swarm, Душанбе.',
      nasa2: 'Ищет места посадки на южном полюсе Луны по солнечному свету и прямой видимости Земли.',
      nasa3: 'напиши open lunar, чтобы полететь туда.',
      langSet: 'язык: русский.',
      introSkip: 'нажми любую клавишу, чтобы пропустить',
      osBoot: (n) => `BEKHA-OS: запускаю ${n}...`,
      workHint: 'клик по порту запускает живой проект прямо тут, в окне. cmd+клик открывает вкладку.',
      rareSignal: '[!] редкий сигнал: зелёный люминофор. такое выпадает только 3% посетителей.',
      distKm: (n) => `${n} км до Душанбе`, distHome: 'Душанбе. дом.', homeTag: 'Душанбе',
      breachNote: 'Спокойно, ничего не случилось. А теперь найми того, кто это сделал: ',
      breachClose: 'закрыть  [esc]',
      ago: (n, unit) => {
        if (unit === 'now') return 'только что';
        const forms = {
          minute: ['минуту', 'минуты', 'минут'], hour: ['час', 'часа', 'часов'], day: ['день', 'дня', 'дней'],
          month: ['месяц', 'месяца', 'месяцев'], year: ['год', 'года', 'лет'],
        }[unit];
        const m10 = n % 10, m100 = n % 100;
        const f = m10 === 1 && m100 !== 11 ? forms[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? forms[1] : forms[2];
        return `${n} ${f} назад`;
      },
    },
  };

  const KEY = 'lang';
  const pick = () => {
    try { const saved = localStorage.getItem(KEY); if (saved === 'en' || saved === 'ru') return saved; } catch (e) { /* no storage */ }
    return (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  };
  let lang = pick();

  const t = (key, ...args) => {
    const v = DICT[lang][key] ?? DICT.en[key];
    return typeof v === 'function' ? v(...args) : (v ?? key);
  };

  function apply() {
    document.documentElement.lang = lang;
    document.title = t('title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('description'));
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const text = t(el.dataset.i18n);
      el.textContent = text;
      if (el.dataset.text !== undefined) el.dataset.text = text;   // the decrypt effect reads this
    });
    const btn = document.getElementById('langBtn');
    if (btn) {
      btn.textContent = lang === 'ru' ? 'RU / en' : 'EN / ru';
      btn.setAttribute('aria-label', lang === 'ru' ? 'Switch to English' : 'Переключить на русский');
    }
    document.dispatchEvent(new CustomEvent('bekha:lang', { detail: lang }));
  }

  /* ---------- the switch: matrix rain over the screen while every line decrypts into the other language ---------- */
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RAIN_MS = 1300;
  const RAIN_GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01АБВГДЖЗИКЛМНПРФЦЧШЩЭЮЯ<>/{}$#@';
  const SCRAMBLE_GLYPHS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯabcdefghkmnprstuvwxyz01<>/#$%';
  let switching = false;

  function rain() {
    const c = document.createElement('canvas');
    c.className = 'rain';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    const g = c.getContext('2d');
    if (!g) { c.remove(); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const fs = 18 * dpr;
    const cols = Math.ceil(c.width / fs);
    const drops = Array.from({ length: cols }, () => Math.random() * -40);
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--amber').trim() || '#ffb000';
    const hot = css.getPropertyValue('--amber-hot').trim() || '#ffd27a';
    const start = performance.now();
    g.font = `500 ${fs}px "IBM Plex Mono", monospace`;
    const frame = (now) => {
      const p = (now - start) / RAIN_MS;
      g.fillStyle = 'rgba(15, 10, 3, 0.18)';
      g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < cols; i++) {
        const ch = RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)];
        const y = drops[i] * fs;
        g.fillStyle = hot; g.fillText(ch, i * fs, y);
        g.fillStyle = ink; g.fillText(RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)], i * fs, y - fs);
        drops[i] += 0.9 + Math.random() * 0.6;
      }
      c.style.opacity = String(p < 0.65 ? 1 : Math.max(0, 1 - (p - 0.65) / 0.35));
      if (p < 1) requestAnimationFrame(frame); else c.remove();
    };
    requestAnimationFrame(frame);
    setTimeout(() => c.remove(), RAIN_MS + 250);   // rAF can stall in a background tab: never leave the rain up
  }

  function scrambleTo(el, text, ms, delay) {
    const startAt = performance.now() + delay;
    const len = Math.max(text.length, el.textContent.length);
    const tick = (now) => {
      if (now < startAt) { requestAnimationFrame(tick); return; }
      const p = Math.min(1, (now - startAt) / ms);
      const fixed = Math.floor(p * text.length);
      let s = text.slice(0, fixed);
      for (let k = fixed; k < Math.min(len, text.length + Math.ceil((1 - p) * 6)); k++) {
        const target = text[k];
        s += target === ' ' ? ' ' : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
      }
      el.textContent = s;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = text;
    };
    requestAnimationFrame(tick);
    setTimeout(() => { el.textContent = text; }, delay + ms + 300);   // rAF can stall in a background tab
  }

  function set(next) {
    if (next !== 'en' && next !== 'ru') return false;
    if (next === lang || switching) { if (next === lang) apply(); return true; }
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch (e) { /* not saved, still applied */ }
    if (REDUCED) { apply(); return true; }
    switching = true;
    rain();
    const els = Array.from(document.querySelectorAll('[data-i18n]'));
    const before = els.map((el) => el.textContent);
    apply();                                   /* titles, buttons, events and data-text switch at once */
    els.forEach((el, n) => {
      const text = el.textContent;
      el.textContent = before[n];
      scrambleTo(el, text, 650, 120 + (n % 12) * 35);
    });
    setTimeout(() => { switching = false; }, RAIN_MS);
    return true;
  }

  window.bekhaI18n = { t, set, get lang() { return lang; } };
  apply();
  document.getElementById('langBtn')?.addEventListener('click', () => set(lang === 'ru' ? 'en' : 'ru'));
})();

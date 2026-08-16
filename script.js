/* ============================================================
   BEKHA PORTFOLIO — script.js
   Custom cursor, magnetic buttons, counter, reveal,
   marquee pause, scroll-activated nav, drawer, glitch.
   ============================================================ */

// ===== PRELOADER =====
(function() {
  const pre    = document.getElementById('preloader');
  const preNum = document.getElementById('preNum');
  const preBar = document.getElementById('preBarFill');
  if (!pre) return;

  document.body.style.overflow = 'hidden';

  let p = 0;
  const GLITCH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%*';

  const tick = setInterval(() => {
    const speed = p < 70 ? (Math.random() * 2.5 + 0.5) : (Math.random() * 1.2 + 0.3);
    p = Math.min(p + speed, 100);

    const display = Math.floor(p);
    preBar.style.width = p + '%';

    // occasional glitch char on last digit
    const str = String(display).padStart(3, '0');
    if (Math.random() < 0.15) {
      preNum.textContent = str.slice(0, -1) + GLITCH[Math.floor(Math.random() * GLITCH.length)];
    } else {
      preNum.textContent = str;
    }

    if (p >= 100) {
      clearInterval(tick);
      preNum.textContent = '100';
      preBar.style.width = '100%';
      setTimeout(() => {
        pre.classList.add('exit');
        document.body.style.overflow = '';
        pre.addEventListener('animationend', () => {
          pre.style.display = 'none';
          // trigger scramble on hero chars
          _scrambleHero();
          // start counter animations after preloader is gone
          if (window._startCounters) window._startCounters();
        }, { once: true });
      }, 300);
    }
  }, 28);
})();

// ===== TEXT SCRAMBLE on BEKHA =====
function _scrambleHero() {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%';
  const heroChars = document.querySelectorAll('.hero__name .char');
  heroChars.forEach((el, i) => {
    const finalChar = el.getAttribute('data-char') || el.textContent;
    el.setAttribute('data-char', finalChar);
    const delay = i * 60;
    const duration = 500;
    let startTs = null;

    setTimeout(() => {
      (function frame(ts) {
        if (!startTs) startTs = ts;
        const elapsed = ts - startTs;
        if (elapsed < duration - 120) {
          el.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
          requestAnimationFrame(frame);
        } else {
          el.textContent = finalChar;
        }
      })(performance.now());
    }, delay);
  });

  // typewriter on hero label after scramble
  const label = document.getElementById('typewriterLabel');
  if (label) {
    const text = 'Full-Stack Developer & Builder';
    let i = 0;
    label.textContent = '';
    const typeInterval = setInterval(() => {
      label.textContent += text[i];
      i++;
      if (i >= text.length) clearInterval(typeInterval);
    }, 42);
  }
}

// ===== CURSOR =====
const cur = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx = -100, my = -100, rx = -100, ry = -100;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cur.style.left  = mx + 'px';
  cur.style.top   = my + 'px';
});

(function loopRing() {
  rx += (mx - rx) * 0.1;
  ry += (my - ry) * 0.1;
  ring.style.left = rx + 'px';
  ring.style.top  = ry + 'px';
  requestAnimationFrame(loopRing);
})();

// hover states
document.querySelectorAll('a, button, .project, .skill-cat, .contact-item, .tag').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});

// ===== MAGNETIC BUTTONS =====
document.querySelectorAll('.magnetic').forEach(btn => {
  const strength = parseInt(btn.dataset.strength) || 30;
  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    const dx = (e.clientX - cx) / (r.width  / 2);
    const dy = (e.clientY - cy) / (r.height / 2);
    btn.style.transform = `translate(${dx * strength * 0.4}px, ${dy * strength * 0.4}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

// ===== NAV STICKY + SCROLL HINT HIDE + PROGRESS + BACK TO TOP =====
const nav = document.getElementById('nav');
const scrollHint = document.getElementById('scrollHint');
const progressBar = document.getElementById('scrollProgress');
const backToTop = document.getElementById('backToTop');

// move button to document.body directly to escape any overflow clipping
if (backToTop && backToTop.parentElement !== document.body) {
  document.body.appendChild(backToTop);
}

let _scrollRafPending = false;
window.addEventListener('scroll', () => {
  nav.classList.toggle('sticky', window.scrollY > 60);
  if (scrollHint) {
    scrollHint.classList.toggle('hide', window.scrollY > 60);
  }
  if (backToTop) {
    backToTop.classList.toggle('visible', window.scrollY > 150);
  }
  if (progressBar && !_scrollRafPending) {
    _scrollRafPending = true;
    requestAnimationFrame(() => {
      const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
      progressBar.style.width = pct + '%';
      _scrollRafPending = false;
    });
  }
}, { passive: true });

// ===== MOBILE DRAWER =====
const toggle = document.getElementById('navToggle');
const drawer = document.getElementById('drawer');
let drawerOpen = false;

toggle.addEventListener('click', () => {
  drawerOpen = !drawerOpen;
  drawer.classList.toggle('open', drawerOpen);
  const [s1, s2] = toggle.querySelectorAll('span');
  if (drawerOpen) {
    s1.style.transform = 'translateY(7.5px) rotate(45deg)';
    s2.style.transform = 'translateY(-7.5px) rotate(-45deg)';
  } else {
    s1.style.transform = '';
    s2.style.transform = '';
  }
});

drawer.querySelectorAll('.drawer__link').forEach(l => {
  l.addEventListener('click', () => {
    drawerOpen = false;
    drawer.classList.remove('open');
    toggle.querySelectorAll('span').forEach(s => s.style.transform = '');
  });
});

// ===== SCROLL REVEAL =====
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((entry, _, obs) => {
    if (!entry.isIntersecting) return;
    const siblings = [...entry.target.parentElement.querySelectorAll('.reveal:not(.vis)')];
    let delay = 0;
    siblings.forEach(sib => {
      if (!sib.classList.contains('vis')) {
        sib.style.transitionDelay = delay + 'ms';
        delay += 90;
      }
    });
    entry.target.classList.add('vis');
    revealObs.unobserve(entry.target);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ===== COUNTER ANIMATION =====
const GLITCH_DIGITS = '0123456789#@$%&!?';

const counterObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.dataset.target);
    let start = 0;
    const duration = 1400;
    const step = timestamp => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const current = Math.floor(easeOut(progress) * target);

      // glitch: in the first 60% randomly replace with glitch char
      if (progress < 0.6 && Math.random() < 0.35) {
        el.textContent = GLITCH_DIGITS[Math.floor(Math.random() * GLITCH_DIGITS.length)];
      } else {
        el.textContent = current;
      }

      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target + '+';
    };
    requestAnimationFrame(step);
    counterObs.unobserve(el);
  });
}, { threshold: 0.5 });

// counters start only after preloader is gone (hero is always visible, observer fires immediately otherwise)
window._startCounters = function() {
  document.querySelectorAll('.counter').forEach(el => {
    const target = parseInt(el.dataset.target);
    let start = 0;
    const duration = 1400;
    const step = timestamp => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const current = Math.floor(easeOut(progress) * target);
      if (progress < 0.6 && Math.random() < 0.35) {
        el.textContent = GLITCH_DIGITS[Math.floor(Math.random() * GLITCH_DIGITS.length)];
      } else {
        el.textContent = current;
      }
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target + '+';
    };
    requestAnimationFrame(step);
  });
};

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ===== MARQUEE PAUSE ON HOVER =====
const marqueeInner = document.querySelector('.marquee__inner');
if (marqueeInner) {
  marqueeInner.addEventListener('mouseenter', () => {
    marqueeInner.style.animationPlayState = 'paused';
  });
  marqueeInner.addEventListener('mouseleave', () => {
    marqueeInner.style.animationPlayState = 'running';
  });
}

// ===== ACTIVE NAV LINK =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav__links a');

const activeObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const a = document.querySelector(`.nav__links a[href="#${entry.target.id}"]`);
      if (a) a.classList.add('active');
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => activeObs.observe(s));

// ===== PIXEL BLOCK RANDOM SHIFT =====
const pixelBlock = document.querySelector('.hero__pixel-block');
if (pixelBlock) {
  const colors = ['#7c3aed', '#a78bfa', '#06060a', '#4c1d95', '#6d28d9'];
  function randomPixel() {
    const shuffled = [...colors].sort(() => Math.random() - 0.5);
    const gradient = shuffled.map((c, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return `linear-gradient(${c} 0 0) ${col * 33}% ${row * 33}% / 33% 33%`;
    }).join(', ');
    pixelBlock.style.background = gradient;
    pixelBlock.style.backgroundRepeat = 'no-repeat';
  }
  setInterval(randomPixel, 600);
}

// ===== CONTACT CTA HOVER GLITCH =====
const ctaAccent = document.querySelector('.contact__cta-accent');
if (ctaAccent) {
  let glitchTimer;
  ctaAccent.addEventListener('mouseenter', () => {
    glitchTimer = setInterval(() => {
      ctaAccent.style.transform = `translate(${(Math.random()-0.5)*4}px, ${(Math.random()-0.5)*2}px)`;
      setTimeout(() => { ctaAccent.style.transform = ''; }, 80);
    }, 120);
  });
  ctaAccent.addEventListener('mouseleave', () => {
    clearInterval(glitchTimer);
    ctaAccent.style.transform = '';
  });
}

// ===== PROJECT HOVER CURSOR LABEL =====
const cursorLabel = document.getElementById('cursor-label');

document.querySelectorAll('.project').forEach(p => {
  p.addEventListener('mouseenter', () => {
    document.body.classList.add('cursor-view', 'hovering');
    if (cursorLabel) cursorLabel.textContent = 'VIEW →';
  });
  p.addEventListener('mouseleave', () => {
    document.body.classList.remove('cursor-view', 'hovering');
  });
});

// update cursor-label position alongside cursor-ring
const _spotlight = document.getElementById('spotlight');
let _spotTX = -600, _spotTY = -600, _spotCX = -600, _spotCY = -600;
(function _spotLoop() {
  _spotCX += (_spotTX - _spotCX) * 0.07;
  _spotCY += (_spotTY - _spotCY) * 0.07;
  if (_spotlight) _spotlight.style.background =
    `radial-gradient(circle 550px at ${_spotCX}px ${_spotCY}px, rgba(124,58,237,0.055) 0%, transparent 70%)`;
  requestAnimationFrame(_spotLoop);
})();

document.addEventListener('mousemove', e => {
  _spotTX = e.clientX; _spotTY = e.clientY;
  if (cursorLabel) {
    cursorLabel.style.left = e.clientX + 'px';
    cursorLabel.style.top  = e.clientY + 'px';
  }
});

// ===== SMOOTH HASH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = nav.offsetHeight + 20;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});

// ===== PARTICLE FIELD =====
(function() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  let mouseX = -9999, mouseY = -9999;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

  const COUNT = 70;
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);

    // draw connections
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      // connect to mouse
      const dm = Math.hypot(a.x - mouseX, a.y - mouseY);
      if (dm < 140) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = `rgba(167,139,250,${(1 - dm / 140) * 0.25})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      // connect to nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(124,58,237,${(1 - d / 100) * 0.15})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // draw dots
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(167,139,250,0.55)';
      ctx.fill();
    });

    requestAnimationFrame(drawParticles);
  }
  drawParticles();
})();

// ===== 3D TILT + SHINE ON PROJECT CARDS =====
document.querySelectorAll('.project').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 5}deg) scale(1.02)`;
    // shine follows cursor
    card.style.setProperty('--shine-x', (e.clientX - r.left) + 'px');
    card.style.setProperty('--shine-y', (e.clientY - r.top) + 'px');
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
    setTimeout(() => { card.style.transition = ''; }, 600);
  });
});

// ===== SECTION TITLE WORD-SPLIT REVEAL =====
(function() {
  const titleSplitObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const words = entry.target.querySelectorAll('.split-word__inner');
      words.forEach((w, i) => { w.style.transitionDelay = (i * 75) + 'ms'; });
      entry.target.classList.add('title-vis');
      titleSplitObs.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.section__title').forEach(title => {
    title.classList.remove('reveal'); // use split instead
    const lines = title.innerHTML.split(/<br\s*\/?>/i);
    title.innerHTML = lines.map(line =>
      line.trim().split(/\s+/).filter(Boolean)
        .map(w => `<span class="split-word"><span class="split-word__inner">${w}</span></span>`)
        .join(' ')
    ).join('<br>');
    titleSplitObs.observe(title);
  });
})();

// ===== BACK TO TOP =====
if (backToTop) {
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

// ===== TOAST HELPER =====
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ===== COPY ON CONTACT ITEMS =====
document.querySelectorAll('.contact-item--copy').forEach(el => {
  el.addEventListener('click', () => {
    const text = el.dataset.copy;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard');
      el.classList.add('copied');
      setTimeout(() => el.classList.remove('copied'), 1200);
    }).catch(() => showToast('Copy failed'));
  });
});

// ===== CURSOR TRAIL =====
(function() {
  const TRAIL = 8;
  const dots = [];
  let mx = -200, my = -200;
  const trail = document.getElementById('cursorTrail');
  if (!trail) return;

  for (let i = 0; i < TRAIL; i++) {
    const d = document.createElement('div');
    d.className = 'trail-dot';
    const size = Math.max(2, 7 - i);
    d.style.cssText = `width:${size}px;height:${size}px;opacity:${0.55 - i * 0.06};`;
    trail.appendChild(d);
    dots.push({ el: d, x: -200, y: -200 });
  }

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  (function loop() {
    let px = mx, py = my;
    dots.forEach((dot, i) => {
      const lag = 0.25 + i * 0.04;
      dot.x += (px - dot.x) * lag;
      dot.y += (py - dot.y) * lag;
      dot.el.style.left = dot.x + 'px';
      dot.el.style.top  = dot.y + 'px';
      px = dot.x; py = dot.y;
    });
    requestAnimationFrame(loop);
  })();
})();

// ===== BLUR REVEAL (Rauno-style) =====
const blurObs = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (!entry.isIntersecting) return;
    const siblings = [...entry.target.parentElement.querySelectorAll('.blur-in:not(.vis)')];
    let delay = 0;
    siblings.forEach(sib => {
      sib.style.transitionDelay = delay + 'ms';
      delay += 120;
    });
    entry.target.classList.add('vis');
    blurObs.unobserve(entry.target);
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.blur-in').forEach(el => blurObs.observe(el));

// ===== LIVE CLOCK (Tashkent) =====
(function() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  function update() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Dushanbe'
    });
    el.textContent = time + ' · Dushanbe';
  }
  update();
  setInterval(update, 1000);
})();

// ===== PARALLAX SECTION BG TEXT =====
(function() {
  const bgTexts = document.querySelectorAll('.section__bg-text');
  if (!bgTexts.length) return;

  let ticking = false;
  function updateParallax() {
    bgTexts.forEach(el => {
      const section = el.closest('section');
      if (!section) return;
      const rect = section.getBoundingClientRect();
      // offset = how far the section center is from viewport center
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const offset = (sectionCenter - viewportCenter) * 0.18;
      el.style.transform = `translateY(calc(-50% + ${offset}px))`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });

  updateParallax();
})();

// ===== LANGUAGE SWITCHER =====
(function() {
  const T = {
    en: {
      // nav
      'nav-about': 'About', 'nav-work': 'Work', 'nav-skills': 'Skills', 'nav-contact': 'Contact',
      // hero
      'hero-label': 'Full-Stack Developer & Builder',
      'hero-status': 'Available for projects',
      'hero-btn1': 'See my work', 'hero-btn2': "Let's talk",
      'hero-desc': 'I design and ship <strong>real products</strong> — AI platforms,<br>mobile apps, e-commerce, bots. Solo. Fast.',
      'meta-label-0': 'Projects shipped', 'meta-label-1': 'Languages', 'meta-label-2': 'Ideas',
      'scroll-hint': 'scroll down',
      // eyebrows
      'eyebrow-0': 'About', 'eyebrow-1': 'Work', 'eyebrow-2': 'Skills', 'eyebrow-3': 'Contact',
      // titles
      'title-about': 'Who I<br>Am', 'title-work': 'Selected<br>Projects', 'title-skills': 'My Arsenal',
      // about
      'about-p1': "I'm Bekha — a self-driven developer who builds things people actually use. Whether it's an AI trading assistant, a Flutter app for ordering lunch, or a luxury fashion store, I care about the full picture: <em>design, performance, and product thinking.</em>",
      'about-p2': "Started with Python, went deep into C, C++ and system programming. Now I ship <strong>full-stack products from scratch — solo.</strong> On the other side: I'm into cybersecurity and ethical hacking — understanding how systems break so I can build ones that don't.",
      'tag-0': 'Full-Stack', 'tag-1': 'C++ / Systems', 'tag-2': 'Ethical Hacking', 'tag-3': 'CTF Player', 'tag-4': 'AI Builder', 'tag-5': 'Mobile Dev',
      // skill cats
      'skill-cat-0': 'Languages', 'skill-cat-1': 'Frontend', 'skill-cat-2': 'Backend', 'skill-cat-3': 'Cloud & Tools', 'skill-cat-4': 'AI & APIs', 'skill-cat-5': 'Cybersecurity',
      // projects
      'proj-desc-0': 'AI-powered crypto and stock trading platform. TradingView-style charting, P&L calendar journal, Gemini AI market analysis, broker integration, paper trading, and PWA support. Fully deployed on GitHub Pages.',
      'proj-desc-1': 'Full Flutter mobile app for canteen ordering. Firebase backend, Riverpod state management, push notifications, admin panel, cart system, and real-time order tracking. Clean architecture, production-ready.',
      'proj-desc-2': 'Pixel-perfect luxury fashion e-commerce. Playfair Display typography, product catalog, admin panel, checkout flow, premium minimal aesthetic. Pure HTML/CSS/JS — zero dependencies.',
      'proj-desc-3': 'AI-powered Telegram trading signals bot. Real-time market analysis via OpenAI, audio/video processing with FFmpeg, runs 24/7 on VPS. Smart signal generation for traders.',
      'proj-desc-4': 'Modern, undetectable VPN using VLESS + Reality (Xray-core). Traffic mimics normal HTTPS — fully bypasses DPI censorship. Automated server setup, custom client configs.',
      'proj-desc-5': 'Custom CRM for real business use. Client management, deal tracking, modern frontend, structured backend. Built to replace expensive SaaS tools.',
      'proj-desc-6': 'Full-featured Flask microblogging platform. User auth, posts, follows, SQLAlchemy ORM, database migrations, email support. Solid, production-structured Flask app.',
      'proj-desc-7': 'Production Telegram bot with Flask webhooks and PostgreSQL message logging. Health check endpoints, structured database interactions, runs with uv package manager.',
      // contact
      'contact-cta': "Let's build<br><span class='contact__cta-accent'>something real.</span>",
      'contact-label-0': 'Email', 'contact-label-1': 'LinkedIn', 'contact-label-2': 'Telegram',
      // footer
      'footer-credit': 'Built without limits.',
      // bg text
      'bg-about': 'ABOUT', 'bg-work': 'WORK', 'bg-skills': 'SKILLS', 'bg-contact': 'CONTACT',
    },
    ru: {
      'nav-about': 'Обо мне', 'nav-work': 'Проекты', 'nav-skills': 'Навыки', 'nav-contact': 'Контакт',
      'hero-label': 'Full-Stack Разработчик',
      'hero-status': 'Открыт к проектам',
      'hero-btn1': 'Мои проекты', 'hero-btn2': 'Написать',
      'hero-desc': 'Строю <strong>реальные продукты</strong> — ИИ, мобайл, боты. Один. Быстро.',
      'meta-label-0': 'Проектов сдано', 'meta-label-1': 'Языков', 'meta-label-2': 'Идей',
      'scroll-hint': 'листай вниз',
      'eyebrow-0': 'Обо мне', 'eyebrow-1': 'Проекты', 'eyebrow-2': 'Навыки', 'eyebrow-3': 'Контакт',
      'title-about': 'Кто я<br>такой', 'title-work': 'Избранные<br>Проекты', 'title-skills': 'Мой Арсенал',
      'about-p1': "Я Беха — разработчик, который создаёт вещи которыми реально пользуются люди. Торговый ИИ-помощник, мобильное приложение для столовой, люксовый магазин — мне важна вся картина: <em>дизайн, производительность и продуктовое мышление.</em>",
      'about-p2': "Начал с Python, ушёл глубоко в C, C++ и системное программирование. Сейчас создаю <strong>full-stack продукты с нуля — один.</strong> Параллельно: кибербезопасность и этичный хакинг — понимаю как системы ломаются, чтобы строить те, которые не сломаются.",
      'tag-0': 'Full-Stack', 'tag-1': 'C++ / Системы', 'tag-2': 'Этичный Хакинг', 'tag-3': 'CTF Игрок', 'tag-4': 'ИИ Разработчик', 'tag-5': 'Мобильная разработка',
      'skill-cat-0': 'Языки', 'skill-cat-1': 'Фронтенд', 'skill-cat-2': 'Бэкенд', 'skill-cat-3': 'Облако и Инструменты', 'skill-cat-4': 'ИИ и API', 'skill-cat-5': 'Кибербезопасность',
      'proj-desc-0': 'Маркетплейс аккаунтов для игр и Steam в Таджикистане — от и до сделал один. Защищённые эскроу-сделки между покупателем и продавцом без посредника, дашборды продавца и покупателя для управления объявлениями. Next.js со статическим экспортом на бэкенде Supabase, развёрнут на GitHub Pages.',
      'proj-desc-1': 'ИИ-платформа для торговли криптой и акциями. Графики в стиле TradingView, P&L календарь, анализ рынка через Gemini AI, интеграция с брокерами, бумажная торговля и PWA.',
      'proj-desc-2': 'Pixel-perfect люксовый fashion e-commerce с нуля — чистый HTML, CSS и JavaScript, без единой зависимости. Типографика Playfair Display, полный каталог товаров, панель администратора, оформление заказа и бэкенд на Supabase для синхронизации корзины между устройствами.',
      'proj-desc-3': 'Система заказа еды в университетской столовой — два клиента на одном бэкенде Supabase: мобильное приложение на Expo/React Native и веб-клиент на Capacitor. Меню, бонусы, корзина и отслеживание заказов в реальном времени.',
      'proj-desc-4': 'Система учёта склада пиломатериалов: остатки по породам и сечениям в реальном времени, закупочные и продажные цены, журнал сделок, текущая прибыль. React, TypeScript, Vite, Tailwind CSS, CI/CD на GitHub Actions.',
      'proj-desc-5': 'Концепт и прототип платформы единого абонемента в залы: один абонемент — доступ в любой зал-партнёр. Проработана бизнес-модель — тарифы, выплаты залам за визит, B2B-доступ для компаний — на основе реального анализа рынка и цен, затем сделаны лендинг и интерактивный прототип приложения.',
      'proj-desc-6': 'Быстрый одностраничный сайт кампуса — чистый HTML, CSS и JavaScript без зависимостей, заточен под мгновенную загрузку и понятный интерфейс.',
      'proj-desc-7': 'ИИ-бот для торговых сигналов в Telegram. Анализ рынка через OpenAI API, обработка аудио и видео через FFmpeg, работает 24/7 на VPS с логированием и health-check.',
      'proj-desc-8': 'Самостоятельное исследование мирового рынка кибербезопасности: объём и прогнозы роста по регионам, переход от периметровой защиты к data-centric резилентности, бизнес-архитектуры и технические парадигмы, меняющие индустрию до 2030 года.',
      'proj-desc-9': 'Исследование операционных моделей private equity в Центральной Азии: геополитический контекст, регуляторная среда от национальных кодексов до AIFC, стратегия создания стоимости в портфельных компаниях под ESG-мандатами.',
      'contact-cta': "Давай создадим<br><span class='contact__cta-accent'>что-то реальное.</span>",
      'contact-label-0': 'Email', 'contact-label-1': 'LinkedIn', 'contact-label-2': 'Telegram',
      'footer-credit': 'Создано без ограничений.',
      'bg-about': 'ОБО МНЕ', 'bg-work': 'ПРОЕКТЫ', 'bg-skills': 'НАВЫКИ', 'bg-contact': 'КОНТАКТ',
    }
  };

  let lang = 'en';
  const btn = document.getElementById('langToggle');
  const cur = document.getElementById('langCurrent');
  if (!btn) return;

  const CHARS_RU = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзиклмнопрстуфхцчшщъыьэюя';
  const CHARS_EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$%&';

  function scrambleEl(el, finalHTML, duration = 480, isHTML = false, chars = CHARS_EN) {
    const finalText = isHTML
      ? finalHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      : finalHTML;

    let start = null;
    function frame(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      if (progress < 1) {
        const fixedLen = Math.floor(progress * finalText.length);
        let scrambled = finalText.slice(0, fixedLen);
        for (let i = fixedLen; i < finalText.length; i++) {
          scrambled += finalText[i] === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)];
        }
        el.textContent = scrambled;
        requestAnimationFrame(frame);
      } else {
        if (isHTML) {
          el.innerHTML = finalHTML;
        } else {
          el.textContent = finalHTML;
        }
      }
    }
    requestAnimationFrame(frame);
  }

  function applyLang(l) {
    const t = T[l];

    const allEls = [];

    // nav + drawer
    const navKeys = ['nav-about','nav-work','nav-skills','nav-contact'];
    document.querySelectorAll('.nav__links li a').forEach((a,i) => { if(t[navKeys[i]]) allEls.push([a, t[navKeys[i]], false]); });
    document.querySelectorAll('.drawer__link').forEach((a,i) => { if(t[navKeys[i]]) allEls.push([a, t[navKeys[i]], false]); });

    // hero desc
    const heroDesc = document.getElementById('heroDesc');
    if (heroDesc && t['hero-desc']) allEls.push([heroDesc, t['hero-desc'], true]);

    // hero label
    const heroLabel = document.getElementById('typewriterLabel');
    if (heroLabel) allEls.push([heroLabel, t['hero-label'], false]);

    // hero status
    const heroStatus = document.querySelector('.hero__status');
    if (heroStatus) allEls.push([heroStatus, '<span class="status-dot"></span>' + t['hero-status'], true]);

    // hero buttons
    const btns = document.querySelectorAll('.hero__actions .btn span');
    if (btns[0]) allEls.push([btns[0], t['hero-btn1'], false]);
    if (btns[1]) allEls.push([btns[1], t['hero-btn2'], false]);

    // meta labels
    document.querySelectorAll('.meta-label').forEach((el,i) => { if(t['meta-label-'+i]) allEls.push([el, t['meta-label-'+i], false]); });

    // scroll hint
    const scrollHintText = document.querySelector('.scroll-hint-text');
    if (scrollHintText) allEls.push([scrollHintText, t['scroll-hint'], false]);

    // eyebrows
    document.querySelectorAll('.section__eyebrow .label').forEach((el,i) => { if(t['eyebrow-'+i]) allEls.push([el, t['eyebrow-'+i], false]); });

    // section titles
    const titleEls = document.querySelectorAll('.section__title');
    const titleKeys = ['title-about','title-work','title-skills'];
    titleEls.forEach((el,i) => {
      if(t[titleKeys[i]]) {
        allEls.push([el, t[titleKeys[i]], true]);
      }
    });

    // about paragraphs
    const paras = document.querySelectorAll('.about__p');
    if(paras[0] && t['about-p1']) allEls.push([paras[0], t['about-p1'], true]);
    if(paras[1] && t['about-p2']) allEls.push([paras[1], t['about-p2'], true]);

    // about tags
    document.querySelectorAll('.about__tags .tag').forEach((el,i) => { if(t['tag-'+i]) allEls.push([el, t['tag-'+i], false]); });

    // skill categories
    document.querySelectorAll('.skill-cat__name').forEach((el,i) => { if(t['skill-cat-'+i]) allEls.push([el, t['skill-cat-'+i], false]); });

    // project descriptions
    document.querySelectorAll('.project__desc').forEach((el,i) => { if(t['proj-desc-'+i]) allEls.push([el, t['proj-desc-'+i], false]); });

    // contact
    const cta = document.querySelector('.contact__cta');
    if(cta && t['contact-cta']) allEls.push([cta, t['contact-cta'], true]);
    document.querySelectorAll('.contact-item__label').forEach((el,i) => { if(t['contact-label-'+i]) allEls.push([el, t['contact-label-'+i], false]); });

    // footer
    const credit = document.querySelector('.footer__credit');
    if(credit) allEls.push([credit, t['footer-credit'], false]);

    // bg texts
    document.querySelectorAll('.section__bg-text').forEach((el,i) => { if(t['bg-'+['about','work','skills','contact'][i]]) allEls.push([el, t['bg-'+['about','work','skills','contact'][i]], false]); });

    // lang button
    allEls.push([cur, l.toUpperCase(), false]);

    // fire all with staggered delay
    const chars = l === 'ru' ? CHARS_RU : CHARS_EN;
    allEls.forEach(([el, val, isHTML], idx) => {
      const delay = idx * 18;
      const dur = 320 + Math.random() * 200;
      setTimeout(() => scrambleEl(el, val, dur, isHTML, chars), delay);
    });

    // fix section titles after scramble
    setTimeout(() => {
      document.querySelectorAll('.section__title').forEach(el => {
        el.classList.remove('title-vis');
        setTimeout(() => el.classList.add('title-vis'), 50);
      });
    }, allEls.length * 18 + 500);
  }

  btn.addEventListener('click', () => {
    lang = lang === 'en' ? 'ru' : 'en';
    applyLang(lang);
    dismissLangHint();
  });

  // First-time nudge: show a tooltip + pulsing dot pointing at the
  // language switch so new visitors realize it's clickable, then never
  // bother them with it again once they've discovered it.
  const tip = document.getElementById('langTip');
  const dot = btn.querySelector('.nav__lang-dot');
  function dismissLangHint() {
    if (tip) tip.classList.remove('is-visible');
    if (dot) dot.classList.add('is-hidden');
    try { localStorage.setItem('langHintSeen', '1'); } catch (e) {}
  }
  try {
    if (!localStorage.getItem('langHintSeen') && tip) {
      setTimeout(() => tip.classList.add('is-visible'), 1400);
      setTimeout(dismissLangHint, 6000);
    } else if (dot) {
      dot.classList.add('is-hidden');
    }
  } catch (e) {}
})();

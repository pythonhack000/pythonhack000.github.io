/* The Earth on the first screen, in ASCII glyphs drawn from NASA's Blue Marble map,
   with a marker on Dushanbe. It turns slowly; a drag spins it; the pointer moves the Sun. */
(() => {
  'use strict';

  const CW = 7;                       // CSS pixels per glyph cell, wide
  const CH = 12;                      // and tall: a monospace glyph is about 0.6 as wide as it is tall
  const RAMP = ' .,:;-=+*%#@';
  const EARTH_R_KM = 6371;
  const SPIN = 0.0016;                // radians per frame when nobody touches it
  const SUN_SWAY = 0.9;
  const HOME = { name: 'dushanbe', lat: 38.56, lon: 68.77 };
  const DEG = Math.PI / 180;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let land = null;                    // Float32Array, 0 ocean .. 1 bright land or ice
  let mapW = 0, mapH = 0;

  /* land reads as warm and bright, ocean as blue and dark: keep the difference */
  function loadMap(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true });
        if (!g) { reject(new Error('no 2d context')); return; }
        g.drawImage(img, 0, 0);
        const px = g.getImageData(0, 0, c.width, c.height).data;
        const out = new Float32Array(c.width * c.height);
        for (let i = 0; i < out.length; i++) {
          const r = px[i * 4], gr = px[i * 4 + 1], b = px[i * 4 + 2];
          out[i] = Math.max(0, 0.65 * r + 0.45 * gr - 0.55 * b) / 255;
        }
        const sorted = Float32Array.from(out).sort();
        const lo = sorted[Math.floor(sorted.length * 0.05)];
        const hi = sorted[Math.floor(sorted.length * 0.985)];
        const span = Math.max(0.05, hi - lo);
        for (let i = 0; i < out.length; i++) out[i] = Math.min(1, Math.max(0, (out[i] - lo) / span));
        resolve({ data: out, w: c.width, h: c.height });
      };
      img.onerror = () => reject(new Error('earth map failed to load'));
      img.src = src;
    });
  }

  function sample(lon, lat) {
    if (!land) return 0.3;
    let u = (lon / (Math.PI * 2) + 0.5) % 1; if (u < 0) u += 1;
    const v = Math.min(0.999, Math.max(0, 0.5 - lat / Math.PI));
    const fx = u * mapW - 0.5, fy = v * mapH - 0.5;
    const x0 = Math.floor(fx), y0 = Math.max(0, Math.floor(fy));
    const tx = fx - x0, ty = fy - y0;
    const xa = (x0 + mapW) % mapW, xb = (x0 + 1) % mapW, yb = Math.min(mapH - 1, y0 + 1);
    const a = land[y0 * mapW + xa], b = land[y0 * mapW + xb], c = land[yb * mapW + xa], d = land[yb * mapW + xb];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }

  /* brightness of the disc at (x, y) in -1..1, or -1 outside it */
  function shade(x, y, rot, ct, st, sun) {
    const rr = x * x + y * y;
    if (rr > 1) return -1;
    const z = Math.sqrt(1 - rr);
    const light = Math.max(0, x * sun[0] + y * sun[1] + z * sun[2]);
    const ty = y * ct - z * st, tz = y * st + z * ct;
    const lon = Math.atan2(x, tz) + rot;
    const lat = Math.asin(Math.max(-1, Math.min(1, ty)));
    const l = sample(lon, lat);
    const k = Math.min(1, Math.max(0, (l - 0.22) / 0.4));
    const surface = 0.1 + 0.9 * k * k * (3 - 2 * k);  // smoothstep: crisp coasts, the ocean a faint dotted texture
    const v = surface * (0.1 + 0.9 * light) * (0.6 + 0.4 * Math.pow(z, 0.5));
    return Math.min(1, Math.pow(v, 0.62) * 1.15);
  }

  /* where Dushanbe sits on the disc right now, or null when it is round the back */
  function homeOnDisc(rot, ct, st) {
    const lat = HOME.lat * DEG, a = HOME.lon * DEG - rot;
    const x = Math.cos(lat) * Math.sin(a), ty = Math.sin(lat), tz = Math.cos(lat) * Math.cos(a);
    const y = ty * ct + tz * st, z = -ty * st + tz * ct;
    return z > 0.05 ? { x, y, z } : null;
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
    return 2 * EARTH_R_KM * Math.asin(Math.sqrt(h));
  }


  /* where the visitor probably is: the browser's time zone, nothing else (no IP lookup, no permission) */
  const TZ_CITIES = {
    'Asia/Dushanbe': [38.56, 68.77, 'Dushanbe', 'Душанбе'], 'Asia/Tashkent': [41.3, 69.24, 'Tashkent', 'Ташкент'],
    'Asia/Samarkand': [39.65, 66.96, 'Samarkand', 'Самарканд'], 'Asia/Almaty': [43.24, 76.89, 'Almaty', 'Алматы'],
    'Asia/Bishkek': [42.87, 74.59, 'Bishkek', 'Бишкек'], 'Asia/Ashgabat': [37.95, 58.38, 'Ashgabat', 'Ашхабад'],
    'Asia/Kabul': [34.53, 69.17, 'Kabul', 'Кабул'], 'Asia/Tehran': [35.69, 51.39, 'Tehran', 'Тегеран'],
    'Asia/Dubai': [25.2, 55.27, 'Dubai', 'Дубай'], 'Asia/Riyadh': [24.71, 46.68, 'Riyadh', 'Эр-Рияд'],
    'Asia/Baku': [40.41, 49.87, 'Baku', 'Баку'], 'Asia/Tbilisi': [41.72, 44.79, 'Tbilisi', 'Тбилиси'],
    'Asia/Yerevan': [40.18, 44.51, 'Yerevan', 'Ереван'], 'Europe/Istanbul': [41.01, 28.98, 'Istanbul', 'Стамбул'],
    'Asia/Istanbul': [41.01, 28.98, 'Istanbul', 'Стамбул'], 'Europe/Moscow': [55.75, 37.62, 'Moscow', 'Москва'],
    'Europe/Samara': [53.2, 50.15, 'Samara', 'Самара'], 'Asia/Yekaterinburg': [56.84, 60.6, 'Yekaterinburg', 'Екатеринбург'],
    'Asia/Omsk': [54.99, 73.37, 'Omsk', 'Омск'], 'Asia/Novosibirsk': [55.03, 82.92, 'Novosibirsk', 'Новосибирск'],
    'Asia/Krasnoyarsk': [56.01, 92.87, 'Krasnoyarsk', 'Красноярск'], 'Asia/Vladivostok': [43.12, 131.9, 'Vladivostok', 'Владивосток'],
    'Europe/Kaliningrad': [54.71, 20.51, 'Kaliningrad', 'Калининград'], 'Europe/Minsk': [53.9, 27.57, 'Minsk', 'Минск'],
    'Europe/Kyiv': [50.45, 30.52, 'Kyiv', 'Киев'], 'Europe/Kiev': [50.45, 30.52, 'Kyiv', 'Киев'],
    'Europe/Warsaw': [52.23, 21.01, 'Warsaw', 'Варшава'], 'Europe/Berlin': [52.52, 13.4, 'Berlin', 'Берлин'],
    'Europe/Paris': [48.86, 2.35, 'Paris', 'Париж'], 'Europe/London': [51.5, -0.13, 'London', 'Лондон'],
    'Europe/Madrid': [40.42, -3.7, 'Madrid', 'Мадрид'], 'Europe/Rome': [41.9, 12.5, 'Rome', 'Рим'],
    'Europe/Amsterdam': [52.37, 4.9, 'Amsterdam', 'Амстердам'], 'Europe/Prague': [50.08, 14.44, 'Prague', 'Прага'],
    'Asia/Karachi': [24.86, 67.0, 'Karachi', 'Карачи'], 'Asia/Kolkata': [28.61, 77.21, 'Delhi', 'Дели'],
    'Asia/Calcutta': [28.61, 77.21, 'Delhi', 'Дели'], 'Asia/Shanghai': [31.23, 121.47, 'Shanghai', 'Шанхай'],
    'Asia/Urumqi': [43.83, 87.62, 'Urumqi', 'Урумчи'], 'Asia/Tokyo': [35.68, 139.69, 'Tokyo', 'Токио'],
    'Asia/Seoul': [37.57, 126.98, 'Seoul', 'Сеул'], 'Asia/Singapore': [1.35, 103.82, 'Singapore', 'Сингапур'],
    'Asia/Bangkok': [13.75, 100.5, 'Bangkok', 'Бангкок'], 'Asia/Jakarta': [-6.2, 106.85, 'Jakarta', 'Джакарта'],
    'Africa/Cairo': [30.04, 31.24, 'Cairo', 'Каир'], 'Africa/Lagos': [6.52, 3.38, 'Lagos', 'Лагос'],
    'Africa/Johannesburg': [-26.2, 28.05, 'Johannesburg', 'Йоханнесбург'], 'America/New_York': [40.71, -74.0, 'New York', 'Нью-Йорк'],
    'America/Chicago': [41.88, -87.63, 'Chicago', 'Чикаго'], 'America/Denver': [39.74, -104.99, 'Denver', 'Денвер'],
    'America/Los_Angeles': [34.05, -118.24, 'Los Angeles', 'Лос-Анджелес'], 'America/Toronto': [43.65, -79.38, 'Toronto', 'Торонто'],
    'America/Mexico_City': [19.43, -99.13, 'Mexico City', 'Мехико'], 'America/Sao_Paulo': [-23.55, -46.63, 'São Paulo', 'Сан-Паулу'],
    'America/Argentina/Buenos_Aires': [-34.6, -58.38, 'Buenos Aires', 'Буэнос-Айрес'], 'Australia/Sydney': [-33.87, 151.21, 'Sydney', 'Сидней'],
  };
  function guessVisitor() {
    /* ?from=moscow (or any zone or city in the table) shows the page as a visitor from there sees it */
    let from = '';
    try { from = (new URLSearchParams(location.search).get('from') || '').toLowerCase(); } catch (e) { /* no override */ }
    if (from) {
      const hit = Object.entries(TZ_CITIES).find(([k, c]) => k.toLowerCase().includes(from) || c[2].toLowerCase().includes(from) || c[3].toLowerCase().includes(from));
      if (hit) return { lat: hit[1][0], lon: hit[1][1], en: hit[1][2], ru: hit[1][3], tz: hit[0] };
    }
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* no Intl: guess from the offset */ }
    const known = TZ_CITIES[tz];
    if (known) return { lat: known[0], lon: known[1], en: known[2], ru: known[3], tz };
    /* an unknown zone: put the visitor on its longitude, at a mid latitude, named after the zone */
    const lon = -new Date().getTimezoneOffset() / 4;
    const city = (tz.split('/').pop() || 'somewhere').replace(/_/g, ' ');
    return { lat: 40, lon: Math.max(-170, Math.min(170, lon)), en: city, ru: city, tz };
  }
  const VISITOR = guessVisitor();
  const visitorKm = () => distanceKm(VISITOR.lat * DEG, VISITOR.lon * DEG, HOME.lat * DEG, HOME.lon * DEG);

  /* a point on (or above) the globe, on the disc: x, y in -1..1, z > 0 facing us */
  function project(lat, lon, alt, rot, ct, st) {
    const a = lon - rot;
    const x = Math.cos(lat) * Math.sin(a), ty = Math.sin(lat), tz = Math.cos(lat) * Math.cos(a);
    const y = ty * ct + tz * st, z = -ty * st + tz * ct;
    return { x: x * alt, y: y * alt, z };
  }
  /* the great circle from the visitor to Dushanbe, as n points of [lat, lon, altitude] */
  function linkPath(n) {
    const toV = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
    const A = toV(VISITOR.lat * DEG, VISITOR.lon * DEG), B = toV(HOME.lat * DEG, HOME.lon * DEG);
    const omega = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = Math.sin(omega) || 1;
      const k1 = Math.sin((1 - t) * omega) / s, k2 = Math.sin(t * omega) / s;
      const v = [A[0] * k1 + B[0] * k2, A[1] * k1 + B[1] * k2, A[2] * k1 + B[2] * k2];
      out.push([Math.asin(Math.max(-1, Math.min(1, v[1]))), Math.atan2(v[0], v[2]), 1 + 0.16 * Math.sin(Math.PI * t) * Math.min(1, omega)]);
    }
    return out;
  }
  const LINK = linkPath(60);

  const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  function start(canvas) {
    const g = canvas.getContext('2d');
    if (!g) return;
    const far = visitorKm() > 150;
    const mid = LINK[Math.floor(LINK.length / 2)];
    let rot = far ? mid[1] : HOME.lon * DEG - 0.5;
    let tilt = far ? Math.max(-0.9, Math.min(0.9, -mid[0] * 0.85)) : -0.42;
    let vel = SPIN, dragging = false, lastX = 0, lastY = 0;
    let sun = unit([-0.55, 0.35, 0.8]);
    let visible = true, raf = 0, dirty = true;
    let size = 0, dpr = 1, ink = '#ffb000', hot = '#ffd27a';
    let cols = 0, rows = 0, mx = -1e4, my = -1e4;

    function fit() {
      size = Math.round(canvas.getBoundingClientRect().width) || 420;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      cols = Math.floor(size / CW);
      rows = Math.floor(size / CH);
      const css = getComputedStyle(document.documentElement);
      ink = css.getPropertyValue('--amber').trim() || ink;
      hot = css.getPropertyValue('--amber-hot').trim() || hot;
      dirty = true;
    }

    function draw(now) {
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const cw = (size / cols) * dpr, ch = (size / rows) * dpr;
      const last = RAMP.length - 1;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.font = `600 ${Math.round(ch * 0.98)}px "IBM Plex Mono", ui-monospace, monospace`;
      g.textBaseline = 'top';
      g.fillStyle = ink;
      for (let j = 0; j < rows; j++) {
        const y = -((j + 0.5) / rows * 2 - 1);
        for (let i = 0; i < cols; i++) {
          const v = shade((i + 0.5) / cols * 2 - 1, y, rot, ct, st, sun);
          if (v <= 0.03) continue;
          const glyph = RAMP[Math.min(last, Math.max(1, Math.round(v * last)))];
          g.globalAlpha = Math.min(1, 0.28 + v);
          g.fillText(glyph, i * cw, j * ch);
        }
      }

      /* the marker: a pulsing ring of glyphs around Dushanbe, and its name */
      const home = homeOnDisc(rot, ct, st);
      if (home) {
        const hx = (home.x + 1) / 2 * size * dpr, hy = (1 - home.y) / 2 * size * dpr;
        const pulse = REDUCED ? 0.5 : (now / 1400) % 1;
        const fade = Math.min(1, home.z * 3);
        g.fillStyle = hot;
        g.globalAlpha = fade * (1 - pulse);
        const r = (6 + pulse * 26) * dpr;
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          g.fillText('o', hx + Math.cos(a) * r - cw / 2, hy + Math.sin(a) * r * 0.9 - ch / 2);
        }
        g.globalAlpha = fade;
        g.font = `700 ${Math.round(ch * 1.3)}px "IBM Plex Mono", ui-monospace, monospace`;
        g.fillText('@', hx - cw * 0.65, hy - ch * 0.65);
        g.font = `500 ${Math.round(ch * 1.05)}px "IBM Plex Mono", ui-monospace, monospace`;
        const tag = window.bekhaI18n ? window.bekhaI18n.t('homeTag') : HOME.name;
        let label = `<- ${tag}`;
        let lw = g.measureText(label).width;
        let lx = hx + cw * 2.2;
        if (lx + lw + cw > canvas.width) {   /* near the right rim: put the tag on the left */
          label = `${tag} ->`;
          lw = g.measureText(label).width;
          lx = hx - cw * 2.2 - lw;
        }
        g.globalAlpha = fade * 0.85;
        g.fillStyle = '#0f0a03';
        g.fillRect(lx - cw * 0.4, hy - ch * 0.75, lw + cw * 0.8, ch * 1.5);
        g.globalAlpha = fade;
        g.fillStyle = hot;
        g.fillText(label, lx, hy - ch * 0.5);
      }
      drawLink(now, ct, st, cw, ch);
      drawReticle(ct, st, cw, ch);
      g.globalAlpha = 1;
      dirty = false;
    }


    /* the link: an arc from the visitor's city to Dushanbe, a packet running along it, and the visitor's tag */
    function drawLink(now, ct, st, cw, ch) {
      if (visitorKm() <= 150) return;
      const ru = window.bekhaI18n && window.bekhaI18n.lang === 'ru';
      const toPx = (p) => [(p.x + 1) / 2 * size * dpr, (1 - p.y) / 2 * size * dpr];
      const pts = LINK.map(([la, lo, al]) => project(la, lo, al, rot, ct, st));
      g.font = `700 ${Math.round(ch * 0.95)}px "IBM Plex Mono", ui-monospace, monospace`;
      g.fillStyle = hot;
      pts.forEach((p, i) => {
        if (p.z < -0.02 || i % 2) return;
        const [x, y] = toPx(p);
        g.globalAlpha = Math.min(1, 0.35 + p.z);
        g.fillText('.', x - cw / 2, y - ch * 0.7);
      });
      /* the packet: a bright head with a short tail, running visitor -> Dushanbe */
      const head = REDUCED ? LINK.length - 1 : Math.floor(((now / 1700) % 1) * LINK.length);
      for (let k = 0; k < 5; k++) {
        const p = pts[head - k];
        if (!p || p.z < -0.02) continue;
        const [x, y] = toPx(p);
        g.globalAlpha = 1 - k * 0.2;
        g.fillText(k ? '*' : '@', x - cw / 2, y - ch / 2);
      }
      /* the visitor's end */
      const v = pts[0];
      if (v.z > 0.05) {
        const [x, y] = toPx(v);
        const km = Math.round(visitorKm()).toLocaleString('en-US').replace(/,/g, ' ');
        const label = ru ? `ты: ${VISITOR.ru}, ${km} км` : `you: ${VISITOR.en}, ${km} km`;
        g.globalAlpha = 1;
        g.font = `700 ${Math.round(ch * 1.2)}px "IBM Plex Mono", ui-monospace, monospace`;
        g.fillText('+', x - cw * 0.55, y - ch * 0.6);
        g.font = `500 ${Math.round(ch * 1.0)}px "IBM Plex Mono", ui-monospace, monospace`;
        const lw = g.measureText(label).width;
        const lx = x - cw * 2 - lw < 0 ? x + cw * 1.8 : x - cw * 2 - lw;
        g.globalAlpha = 0.85; g.fillStyle = '#0f0a03';
        g.fillRect(lx - cw * 0.4, y - ch * 0.75, lw + cw * 0.8, ch * 1.5);
        g.globalAlpha = 1; g.fillStyle = hot;
        g.fillText(label, lx, y - ch * 0.5);
      }
      g.globalAlpha = 1;
    }

    /* the pointer over the disc: crosshair, the coordinates under it and the distance to Dushanbe */
    function drawReticle(ct, st, cw, ch) {
      const x = mx / size * 2 - 1, y = -(my / size * 2 - 1);
      const rr = x * x + y * y;
      if (rr > 1) return;
      const z = Math.sqrt(1 - rr);
      const ty = y * ct - z * st, tz = y * st + z * ct;
      const lat = Math.asin(Math.max(-1, Math.min(1, ty)));
      let lon = Math.atan2(x, tz) + rot;
      lon = Math.atan2(Math.sin(lon), Math.cos(lon));
      const km = distanceKm(lat, lon, HOME.lat * DEG, HOME.lon * DEG);

      const px = mx * dpr, py = my * dpr;
      const T = window.bekhaI18n ? window.bekhaI18n.t : (k, n) => (k === 'distKm' ? `${n} km to dushanbe` : 'dushanbe. home.');
      /* four small corner brackets, nothing across the planet */
      const r = 9 * dpr, arm = 4 * dpr;
      g.globalAlpha = 1;
      g.strokeStyle = hot;
      g.lineWidth = 1.5 * dpr;
      g.beginPath();
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        g.moveTo(px + sx * r, py + sy * (r - arm)); g.lineTo(px + sx * r, py + sy * r); g.lineTo(px + sx * (r - arm), py + sy * r);
      });
      g.stroke();
      g.fillStyle = hot;
      g.fillRect(px - dpr, py - dpr, 2 * dpr, 2 * dpr);

      const fmt = (v, pos, neg) => `${Math.abs(v / DEG).toFixed(1)}${v >= 0 ? pos : neg}`;
      const dist = km < 30 ? T('distHome') : T('distKm', Math.round(km).toLocaleString('en-US').replace(/,/g, ' '));
      const text = `${fmt(lat, 'N', 'S')} ${fmt(lon, 'E', 'W')}  ${dist}`;
      g.font = `500 ${Math.round(11 * dpr)}px "IBM Plex Mono", ui-monospace, monospace`;
      const w = g.measureText(text).width;
      const labelX = Math.min(canvas.width - w - 4 * dpr, Math.max(4 * dpr, px - w / 2));
      const labelY = py + r + 6 * dpr;
      g.shadowColor = '#0f0a03'; g.shadowBlur = 6 * dpr;
      g.fillText(text, labelX, labelY);
      g.fillText(text, labelX, labelY);
      g.shadowBlur = 0;
    }

    const loop = (now) => {
      if (!dragging && !REDUCED) { rot += vel; vel += (SPIN - vel) * 0.03; }
      draw(now);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      const dy = Math.max(-1, Math.min(1, -(e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      sun = unit([dx * SUN_SWAY, dy * SUN_SWAY, 0.8]);
      mx = e.clientX - r.left; my = e.clientY - r.top;
      if (dragging) {
        rot -= (e.clientX - lastX) * 0.01;
        tilt = Math.max(-1.1, Math.min(1.1, tilt + (e.clientY - lastY) * 0.006));
        vel = -(e.clientX - lastX) * 0.0012;
        lastX = e.clientX; lastY = e.clientY;
      }
      if (REDUCED) draw(performance.now());
    }, { passive: true });
    canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    const stop = () => { dragging = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('pointerleave', () => { mx = -1e4; my = -1e4; });
    window.addEventListener('resize', () => { fit(); draw(performance.now()); });
    new MutationObserver(() => { fit(); draw(performance.now()); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    fit();
    draw(performance.now());
    ready.then(() => draw(performance.now()));
    if (!REDUCED) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(canvas);
      raf = requestAnimationFrame(loop);
    }
  }

  /* the map loads once, for the hero globe and the intro alike */
  const ready = window.EARTH_MAP
    ? loadMap(window.EARTH_MAP).then((m) => { land = m.data; mapW = m.w; mapH = m.h; }).catch(() => { /* a plain globe */ })
    : Promise.resolve();

  window.bekhaGlobe = { start, frame: shade, shade, ready, HOME, RAMP, visitor: () => ({ ...VISITOR, km: Math.round(visitorKm()) }) };
  const el = document.getElementById('globe');
  if (el) start(el);
})();

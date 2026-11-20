/* Synthesised sound for the site: nothing is downloaded, everything is built with Web Audio.
   One master bus (gain → compressor) plus a generated stereo reverb keeps every sound in the same space.
   Three packs share the same events; the visitor switches with `sound pack <name>`. */
(() => {
  'use strict';

  const SOUND_KEY = 'sound';
  const PACK_KEY = 'sound-pack';
  const DEFAULT_PACK = 'retro';
  const MASTER_GAIN = 0.9;
  const REVERB_SECONDS = 2.2;
  const REVERB_WET = 0.3;
  const HOVER_MIN_GAP_MS = 45;

  let ctx = null;
  let bus = null;      // { master, wet }
  let lastHover = 0;
  let soundOn = false;
  let soundChosen = false;   // the visitor picked on/off themselves at some point
  let packName = DEFAULT_PACK;
  try {
    const saved = localStorage.getItem(SOUND_KEY);
    soundOn = saved === 'on';
    soundChosen = saved === 'on' || saved === 'off';
    packName = localStorage.getItem(PACK_KEY) || DEFAULT_PACK;
  } catch (e) { /* defaults: off until the first gesture, retro pack */ }

  /* ================= graph ================= */
  function impulse(a, seconds) {
    const len = Math.floor(a.sampleRate * seconds);
    const buf = a.createBuffer(2, len, a.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    }
    return buf;
  }

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5;
      comp.attack.value = 0.002; comp.release.value = 0.25;
      const master = ctx.createGain(); master.gain.value = MASTER_GAIN;
      const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, REVERB_SECONDS);
      const wet = ctx.createGain(); wet.gain.value = REVERB_WET;
      master.connect(comp);
      wet.connect(verb).connect(comp);
      comp.connect(ctx.destination);
      bus = { master, wet };
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* route a node to the dry bus (panned), and optionally into the reverb */
  function out(node, send = 0, pan = 0) {
    let head = node;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; head = node.connect(p); }
    head.connect(bus.master);
    if (send > 0) { const s = ctx.createGain(); s.gain.value = send; head.connect(s).connect(bus.wet); }
  }

  const rand = (min, max) => min + Math.random() * (max - min);
  const semis = (f, n) => f * Math.pow(2, n / 12);
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19];

  /* ================= building blocks ================= */
  const noiseCache = new Map();
  function noiseBuffer(seconds) {
    const key = Math.ceil(seconds * 10);
    if (!noiseCache.has(key)) {
      const len = Math.max(1, Math.floor(ctx.sampleRate * key / 10));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseCache.set(key, buf);
    }
    return noiseCache.get(key);
  }

  function env(g, at, dur, peak, attack) {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  }

  /* filtered noise; freqTo sweeps the filter; attack > 0 makes a swell (risers) */
  function noise({ at, dur, type = 'bandpass', freq, freqTo, q = 1, gain, attack = 0.001, send = 0, pan = 0, panTo }) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(dur);
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, at);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, at + dur);
    const g = ctx.createGain(); env(g, at, dur, gain, attack);
    src.connect(f).connect(g);
    if (panTo !== undefined && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.setValueAtTime(pan, at); p.pan.linearRampToValueAtTime(panTo, at + dur);
      g.connect(p); out(p, send);
    } else out(g, send, pan);
    src.start(at); src.stop(at + dur + 0.02);
  }

  /* one oscillator voice: pitch glide + envelope, optional low-pass */
  function tone({ at, dur, type = 'sine', freq, freqTo, gain, attack = 0.004, lowpass, lowpassTo, q = 0.7, send = 0, pan = 0, detune = 0 }) {
    const o = ctx.createOscillator(); o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(freq, at);
    if (freqTo) o.frequency.exponentialRampToValueAtTime(freqTo, at + dur);
    const g = ctx.createGain(); env(g, at, dur, gain, attack);
    let head = o;
    if (lowpass) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
      f.frequency.setValueAtTime(lowpass, at);
      if (lowpassTo) f.frequency.exponentialRampToValueAtTime(lowpassTo, at + dur);
      head = o.connect(f);
    }
    head.connect(g); out(g, send, pan);
    o.start(at); o.stop(at + dur + 0.03);
  }

  /* FM bell: a sine carrier modulated at `ratio`, the brightness (index) dies faster than the note */
  function bell({ at, dur, freq, ratio = 3.5, index = 3, gain, send = 0.5, pan = 0 }) {
    const c = ctx.createOscillator(); c.frequency.value = freq;
    const m = ctx.createOscillator(); m.frequency.value = freq * ratio;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(freq * index, at);
    mg.gain.exponentialRampToValueAtTime(freq * 0.05, at + dur * 0.6);
    m.connect(mg).connect(c.frequency);
    const g = ctx.createGain(); env(g, at, dur, gain, 0.002);
    c.connect(g); out(g, send, pan);
    c.start(at); m.start(at); c.stop(at + dur + 0.05); m.stop(at + dur + 0.05);
  }

  /* a wide chord of detuned saws behind an opening filter: the "braam" / pad swell */
  function swell({ at, dur, freqs, gain, from = 200, to = 3000, send = 0.6 }) {
    freqs.forEach((f, i) => [-12, 12].forEach((dt) => {
      tone({ at, dur, type: 'sawtooth', freq: f, gain: gain / freqs.length, attack: dur * 0.45, lowpass: from, lowpassTo: to, q: 2, detune: dt, send, pan: dt > 0 ? 0.5 : -0.5 });
    }));
  }

  const boom = (at, gain = 0.6, from = 110, to = 32, dur = 0.7) =>
    tone({ at, dur, type: 'sine', freq: from, freqTo: to, gain, attack: 0.003 });

  /* ================= packs ================= */
  const PACKS = {
    /* sci-fi HUD: glass ticks, FM bells, stereo whooshes, sub drops */
    cyber: {
      key(t, kind) {
        const big = kind === 'enter' || kind === 'space';
        tone({ at: t, dur: 0.025, type: 'sine', freq: rand(5200, 6400), gain: 0.05, attack: 0.001, pan: rand(-0.3, 0.3) });
        noise({ at: t, dur: 0.01, type: 'highpass', freq: 7000, gain: 0.06 });
        if (big) { bell({ at: t, dur: 0.25, freq: 1320, ratio: 2, index: 1.5, gain: 0.05, send: 0.4 }); bell({ at: t + 0.05, dur: 0.3, freq: 1760, ratio: 2, index: 1.5, gain: 0.04, send: 0.5 }); }
      },
      hover(t, i) {
        const pan = Math.max(-0.7, Math.min(0.7, (i - 4) * 0.17));
        bell({ at: t, dur: 0.35, freq: semis(1046, PENTA[i % PENTA.length]), ratio: 2.01, index: 1.2, gain: 0.045, send: 0.6, pan });
      },
      ping(t, ok, i) {
        if (!ok) { tone({ at: t, dur: 0.3, type: 'sawtooth', freq: 82, gain: 0.08, lowpass: 400 }); tone({ at: t, dur: 0.3, type: 'sawtooth', freq: 87, gain: 0.06, lowpass: 400 }); return; }
        bell({ at: t, dur: 1.4, freq: semis(784, [0, 4, 7, 11, 14, 16, 19][i % 7]), ratio: 3.5, index: 2.5, gain: 0.06, send: 1, pan: rand(-0.6, 0.6) });
      },
      open(t) {
        noise({ at: t, dur: 0.32, type: 'bandpass', freq: 300, freqTo: 7000, q: 1.2, gain: 0.12, attack: 0.25, send: 0.4, pan: -0.7, panTo: 0.7 });
        tone({ at: t, dur: 0.3, type: 'sine', freq: 200, freqTo: 1600, gain: 0.04, attack: 0.25 });
        boom(t + 0.3, 0.5, 90, 35, 0.5);
        bell({ at: t + 0.3, dur: 0.9, freq: 2093, ratio: 1.5, index: 2, gain: 0.05, send: 0.9 });
      },
      close(t) {
        noise({ at: t, dur: 0.25, type: 'bandpass', freq: 6000, freqTo: 250, q: 1.2, gain: 0.1, send: 0.3, pan: 0.6, panTo: -0.6 });
        tone({ at: t, dur: 0.25, type: 'sine', freq: 1400, freqTo: 120, gain: 0.05 });
        boom(t + 0.18, 0.3, 70, 30, 0.35);
      },
      thunk(t) {
        boom(t, 0.7, 120, 30, 1.2);
        noise({ at: t, dur: 0.6, type: 'lowpass', freq: 3000, freqTo: 200, gain: 0.15, send: 0.6 });
        swell({ at: t + 0.05, dur: 1.6, freqs: [110, 164.8, 220, 329.6], gain: 0.12, from: 150, to: 4000 });
        bell({ at: t + 0.7, dur: 1.5, freq: 1318.5, ratio: 3.5, index: 2, gain: 0.04, send: 1 });
      },
      data(t, ms) {
        const n = Math.max(3, Math.round(ms / 16));
        for (let i = 0; i < n; i++) tone({ at: t + i * 0.016, dur: 0.02, type: 'sine', freq: rand(1800, 6500), gain: 0.025, attack: 0.001, pan: rand(-0.8, 0.8), send: 0.2 });
      },
      blip(t, f) { bell({ at: t, dur: 0.25, freq: f, ratio: 2, index: 1.5, gain: 0.06, send: 0.4 }); },
      arp(t, freqs, step) { freqs.forEach((f, i) => bell({ at: t + i * step, dur: 0.6, freq: f * 2, ratio: 2, index: 2, gain: 0.055, send: 0.7, pan: (i / (freqs.length - 1 || 1)) * 1.2 - 0.6 })); },
    },

    /* cinematic: trailer hits, deep booms, braams, big tails */
    cinema: {
      key(t, kind) {
        const big = kind === 'enter' || kind === 'space';
        tone({ at: t, dur: big ? 0.14 : 0.07, type: 'triangle', freq: big ? 90 : rand(160, 200), freqTo: big ? 50 : 100, gain: big ? 0.3 : 0.16, attack: 0.002, lowpass: 900 });
        noise({ at: t, dur: 0.015, type: 'bandpass', freq: 1500, q: 1.5, gain: 0.08 });
      },
      hover(t, i) {
        tone({ at: t, dur: 0.5, type: 'sine', freq: semis(392, PENTA[i % PENTA.length]), gain: 0.04, attack: 0.01, send: 0.9, pan: (i - 4) * 0.12 });
        tone({ at: t, dur: 0.12, type: 'sine', freq: 120, freqTo: 60, gain: 0.08 });
      },
      ping(t, ok, i) {
        if (!ok) { boom(t, 0.4, 60, 30, 0.6); return; }
        tone({ at: t, dur: 1.8, type: 'sine', freq: semis(523, [0, 7, 12, 16, 19, 24, 28][i % 7]), gain: 0.05, attack: 0.01, send: 1.2, pan: rand(-0.5, 0.5) });
      },
      open(t) {
        noise({ at: t, dur: 0.45, type: 'highpass', freq: 400, freqTo: 5000, gain: 0.14, attack: 0.4, send: 0.5 });
        boom(t + 0.45, 0.8, 140, 28, 1.1);
        noise({ at: t + 0.45, dur: 0.5, type: 'lowpass', freq: 5000, freqTo: 300, gain: 0.25, send: 0.8 });
      },
      close(t) {
        boom(t, 0.5, 90, 30, 0.6);
        noise({ at: t, dur: 0.6, type: 'lowpass', freq: 2000, freqTo: 150, gain: 0.12, send: 0.8 });
      },
      thunk(t) {
        swell({ at: t, dur: 2.2, freqs: [55, 82.4, 110, 130.8], gain: 0.25, from: 120, to: 1800, send: 0.8 });
        boom(t + 0.9, 0.9, 120, 25, 1.4);
        noise({ at: t + 0.9, dur: 1.0, type: 'lowpass', freq: 6000, freqTo: 200, gain: 0.3, send: 1 });
      },
      data(t, ms) { noise({ at: t, dur: ms / 1000 + 0.1, type: 'bandpass', freq: 800, freqTo: 4000, q: 4, gain: 0.05, attack: 0.03, send: 0.6 }); },
      blip(t, f) { tone({ at: t, dur: 0.6, type: 'sine', freq: f / 2, gain: 0.08, attack: 0.005, send: 1 }); },
      arp(t, freqs, step) { freqs.forEach((f, i) => tone({ at: t + i * step * 1.6, dur: 1.4, type: 'triangle', freq: f, gain: 0.06, attack: 0.01, lowpass: 2500, send: 1 })); boom(t, 0.5); },
    },

    /* retro CRT: mechanical keys, relay ticks, modem data, 8-bit notes (no hum) */
    retro: {
      key(t, kind) {
        const big = kind === 'enter' || kind === 'space';
        const body = big ? rand(150, 175) : rand(240, 320);
        noise({ at: t, dur: 0.012, type: 'highpass', freq: rand(3200, 4200), gain: big ? 0.22 : 0.18 });
        tone({ at: t, dur: big ? 0.09 : 0.05, type: 'triangle', freq: body, freqTo: body * 0.55, gain: big ? 0.32 : 0.22, attack: 0.002, lowpass: 1600 });
        if (big) noise({ at: t + 0.055, dur: 0.02, type: 'bandpass', freq: 2200, q: 2, gain: 0.08 });
      },
      hover(t, i) {
        noise({ at: t, dur: 0.008, type: 'highpass', freq: 5000, gain: 0.07 });
        tone({ at: t, dur: 0.06, type: 'square', freq: semis(880, PENTA[i % PENTA.length]), gain: 0.025, attack: 0.002, lowpass: 2500, send: 0.3 });
      },
      ping(t, ok, i) {
        if (!ok) { tone({ at: t, dur: 0.22, type: 'square', freq: 98, gain: 0.05, lowpass: 600 }); return; }
        tone({ at: t, dur: 0.15, type: 'square', freq: semis(1046, [0, 4, 7, 12, 16, 19, 24][i % 7]), gain: 0.04, lowpass: 3000, send: 0.3 });
      },
      open(t) {
        tone({ at: t, dur: 0.22, type: 'square', freq: 140, freqTo: 1500, gain: 0.04, attack: 0.02, lowpass: 3000 });
        noise({ at: t + 0.2, dur: 0.03, type: 'highpass', freq: 2500, gain: 0.2 });
      },
      close(t) { tone({ at: t, dur: 0.2, type: 'square', freq: 1500, freqTo: 120, gain: 0.04, lowpass: 3000 }); },
      thunk(t) {
        noise({ at: t, dur: 0.03, type: 'bandpass', freq: 1800, q: 1.5, gain: 0.35 });
        tone({ at: t, dur: 0.35, type: 'sine', freq: 130, freqTo: 42, gain: 0.45, attack: 0.003 });
        noise({ at: t + 0.08, dur: 0.9, type: 'bandpass', freq: 7000, freqTo: 1200, q: 0.7, gain: 0.07, send: 0.3 });
      },
      data(t, ms) {
        const HOP = 0.012; const n = Math.max(3, Math.round(ms / 12));
        for (let i = 0; i < n; i++) tone({ at: t + i * HOP, dur: HOP, type: 'square', freq: Math.random() < 0.5 ? 1200 : 2200, gain: 0.02, attack: 0.001, lowpass: 2600 });
      },
      blip(t, f) { tone({ at: t, dur: 0.11, type: 'square', freq: f, gain: 0.05, lowpass: 2600, send: 0.2 }); },
      arp(t, freqs, step) { freqs.forEach((f, i) => tone({ at: t + i * step, dur: 0.16, type: 'square', freq: f, gain: 0.045, lowpass: 3000, send: 0.3 })); },
    },
  };
  if (!PACKS[packName]) packName = DEFAULT_PACK;

  /* ================= public API ================= */
  const play = (event) => (...args) => {
    if (!soundOn || !audio()) return;
    PACKS[packName][event](ctx.currentTime + 0.005, ...args);
  };

  const sound = {
    get on() { return soundOn; },
    get pack() { return packName; },
    packs: Object.keys(PACKS),
    set(on) {
      soundOn = on;
      soundChosen = true;
      try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch (e) { /* not saved */ }
      if (on) { audio(); sound.thunk(); }
      document.dispatchEvent(new CustomEvent('bekha:sound', { detail: on }));
    },
    /** @param {string} name @returns {boolean} whether the pack exists */
    setPack(name) {
      if (!PACKS[name]) return false;
      packName = name;
      try { localStorage.setItem(PACK_KEY, name); } catch (e) { /* not saved */ }
      return true;
    },
    /** play one event from another pack without changing the visitor's choice (the breach goes cinematic) */
    as(name, event, ...args) {
      if (!soundOn || !PACKS[name] || !audio()) return;
      PACKS[name][event](ctx.currentTime + 0.005, ...args);
    },
    key: play('key'),
    click() { sound.key('char'); },
    hover(index = 0) {
      const now = performance.now();
      if (now - lastHover < HOVER_MIN_GAP_MS) return;
      lastHover = now;
      play('hover')(index);
    },
    ping: (ok = true, index = 0) => play('ping')(ok, index),
    open: play('open'),
    close: play('close'),
    thunk: play('thunk'),
    data: (ms = 140) => play('data')(ms),
    blip: (freq = 660) => play('blip')(freq),
    arp: (freqs = [523, 659, 784, 1047], step = 0.07) => play('arp')(freqs, step),
  };

  /* browsers start audio only after a gesture. On the first one the sound comes on by itself
     unless the visitor switched it off before. The auto choice is not saved. */
  if (soundOn || !soundChosen) {
    const wake = (e) => {
      window.removeEventListener('pointerdown', wake, true);
      window.removeEventListener('keydown', wake, true);
      if (e.target?.closest?.('#soundBtn')) return;        // the switch handles itself
      if (!soundOn) {
        soundOn = true;
        document.dispatchEvent(new CustomEvent('bekha:sound', { detail: true }));
      }
      if (audio()) sound.data(220);
    };
    window.addEventListener('pointerdown', wake, true);
    window.addEventListener('keydown', wake, true);
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (soundOn) ctx.resume();
  });

  window.bekhaSound = sound;
})();

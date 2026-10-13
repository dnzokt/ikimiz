// Ses: oyun efektleri ve arka plan müziği. Hiç ses dosyası yok; her şey tarayıcıda üretilir (Web Audio).
// Müzik her cihazda yereldir: herkes kendi istasyonunu ve ses düzeyini seçer.
const Ses = (() => {
  const KEY = 'ikimiz:ses';
  const pref = Object.assign({ on: false, station: 'lofi', mvol: 0.5, svol: 0.8, auto: true },
    (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })());
  const savePref = () => { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) {} };
  let ctx = null, master, mBus, sBus, verb, sverb, noise, timer = null, cur = null, step = 0, next = 0, view = 'menu', mel = 0;
  const listeners = new Set();
  const emit = () => listeners.forEach((f) => f());

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    mBus = ctx.createGain(); mBus.gain.value = pref.on ? pref.mvol * 0.6 : 0.0001; mBus.connect(master);
    sBus = ctx.createGain(); sBus.gain.value = pref.svol; sBus.connect(master);
    // Yapay yankı: sönümlenen gürültüden oda etkisi
    const len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
    verb = ctx.createConvolver(); verb.buffer = ir;
    const vg = ctx.createGain(); vg.gain.value = 0.5; verb.connect(vg); vg.connect(mBus);
    sverb = ctx.createConvolver(); sverb.buffer = ir;
    const sg = ctx.createGain(); sg.gain.value = 0.4; sverb.connect(sg); sg.connect(sBus);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  // ---------- Yapı taşları ----------
  const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function osc(type, f, t, dur) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05); return o; }
  function amp(t, a, peak, dur) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.01));
    return g;
  }
  function noiseSrc(t, dur) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); return s; }
  function filt(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  function out(node, bus, wet) {
    node.connect(bus);
    if (wet) { const s = ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(bus === sBus ? sverb : verb); }
  }

  // Çalgılar
  const I = {
    pad(t, notes, dur, vol = 0.05, cut = 1200) {
      const g = amp(t, dur * 0.3, vol, dur), lp = filt('lowpass', cut, 0.7);
      lp.connect(g); out(g, mBus, 0.6);
      for (const m of notes) for (const det of [-8, 8]) { const o = osc('sawtooth', mtof(m), t, dur); o.detune.value = det; o.connect(lp); }
    },
    ep(t, m, dur, vol = 0.1) { // elektrik piyano: hafif FM
      const f = mtof(m), c = osc('sine', f, t, dur), mod = osc('sine', f * 2, t, dur), mg = ctx.createGain();
      mg.gain.setValueAtTime(f * 1.1, t); mg.gain.exponentialRampToValueAtTime(1, t + dur);
      mod.connect(mg); mg.connect(c.frequency);
      const g = amp(t, 0.008, vol, dur); c.connect(g); out(g, mBus, 0.35);
    },
    bass(t, m, dur, vol = 0.16) { const o = osc('triangle', mtof(m), t, dur), lp = filt('lowpass', 500), g = amp(t, 0.01, vol, dur); o.connect(lp); lp.connect(g); out(g, mBus, 0); },
    bell(t, m, vol = 0.05, dur = 3) {
      for (const [r, v] of [[1, 1], [2.76, 0.4], [5.4, 0.15]]) { const o = osc('sine', mtof(m) * r, t, dur), g = amp(t, 0.005, vol * v, dur / r); o.connect(g); out(g, mBus, 0.7); }
    },
    pluck(t, m, vol = 0.1) { // ud benzeri tel
      const f = mtof(m), o = osc('sawtooth', f, t, 1.2);
      o.frequency.setValueAtTime(f * 1.02, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      const lp = filt('lowpass', 3000, 2); lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.4);
      const g = amp(t, 0.004, vol, 1.1); o.connect(lp); lp.connect(g); out(g, mBus, 0.3);
    },
    kick(t, vol = 0.5, bus = mBus) { const o = osc('sine', 120, t, 0.4); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); const g = amp(t, 0.003, vol, 0.38); o.connect(g); out(g, bus, 0); },
    snare(t, vol = 0.1) { const n = noiseSrc(t, 0.2), bp = filt('bandpass', 1900, 0.8), g = amp(t, 0.002, vol, 0.18); n.connect(bp); bp.connect(g); out(g, mBus, 0.25); },
    hat(t, vol = 0.03) { const n = noiseSrc(t, 0.06), hp = filt('highpass', 7000), g = amp(t, 0.001, vol, 0.05); n.connect(hp); hp.connect(g); out(g, mBus, 0); },
    crackle(t) { const n = noiseSrc(t, 0.01), hp = filt('highpass', 2500), g = amp(t, 0.0005, 0.03 * Math.random() + 0.002, 0.008); n.connect(hp); hp.connect(g); out(g, mBus, 0); },
    doum(t, vol = 0.35) { const o = osc('sine', 95, t, 0.35); o.frequency.exponentialRampToValueAtTime(58, t + 0.2); const g = amp(t, 0.003, vol, 0.32); o.connect(g); out(g, mBus, 0.15); },
    tek(t, vol = 0.12) {
      const n = noiseSrc(t, 0.07), bp = filt('bandpass', 3200, 1.5), g = amp(t, 0.001, vol, 0.06); n.connect(bp); bp.connect(g); out(g, mBus, 0.2);
      const o = osc('sine', 680, t, 0.05), g2 = amp(t, 0.001, vol * 0.5, 0.04); o.connect(g2); out(g2, mBus, 0);
    },
    sweep(t) { const n = noiseSrc(t, 3.2), bp = filt('bandpass', 300, 6); bp.frequency.exponentialRampToValueAtTime(2400, t + 3); const g = amp(t, 1.5, 0.05, 3.1); n.connect(bp); bp.connect(g); out(g, mBus, 0.8); },
  };

  // ---------- İstasyonlar ----------
  const STATIONS = {
    lofi: { name: 'Lo-fi Akşam', desc: 'Yumuşak akorlar, plak cızırtısı', bpm: 76, step(s, t, d) {
      const ch = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]][Math.floor(s / 16) % 4], b = s % 16;
      if (s % 2) t += d * 0.18; // salınım
      if (b === 0) { ch.forEach((m, i) => I.ep(t + i * 0.025, m, 3.2, 0.06)); I.bass(t, ch[0] - 12, 1.4); }
      if (b === 10) I.bass(t, ch[0] - 5, 0.6, 0.1);
      if (b === 0 || b === 7 || b === 10) I.kick(t, 0.32);
      if (b === 4 || b === 12) I.snare(t, 0.06);
      if (s % 2 === 0) I.hat(t, 0.012 + Math.random() * 0.014);
      if (b % 4 === 2 && Math.random() < 0.35) I.ep(t, pick([72, 74, 76, 79, 81]), 1.2, 0.045);
      if (Math.random() < 0.4) I.crackle(t + Math.random() * d);
    } },
    gece: { name: 'Gece', desc: 'Sakin, uzun pedler ve çanlar', bpm: 56, step(s, t) {
      const ch = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]][Math.floor(s / 32) % 4];
      if (s % 32 === 0) { I.pad(t, [...ch, ch[0] - 12], 9.5, 0.028, 900); I.bass(t, ch[0] - 24, 8, 0.07); }
      if (s % 4 === 0 && Math.random() < 0.12) I.bell(t, pick([69, 72, 74, 76, 79, 81]) + 12, 0.025, 4);
    } },
    cay: { name: 'Çay Bahçesi', desc: 'Hicaz makamında ud ve darbuka', bpm: 92, step(s, t) {
      const sc = [62, 63, 66, 67, 69, 70, 72, 74, 75, 78], b = s % 16;
      if (s % 32 === 0) I.pad(t, [50, 57], 10, 0.016, 600);
      if (b === 0 || b === 8) I.doum(t, b ? 0.22 : 0.32);
      if (b === 2 || b === 6 || b === 12) I.tek(t, 0.09);
      if (b === 14 && Math.random() < 0.6) I.tek(t, 0.045);
      if (s % 2 === 0 && Math.random() < (s % 64 < 56 ? 0.62 : 0.12)) {
        mel = Math.max(0, Math.min(sc.length - 1, mel + pick([-1, -1, 1, 1, 0, -2, 2])));
        if (s % 64 === 54) mel = 0;
        I.pluck(t, sc[mel], 0.08);
        if (Math.random() < 0.2) I.pluck(t + 0.08, sc[mel], 0.045);
      }
    } },
    gerilim: { name: 'Gerilim', desc: 'Alçak uğultu, kalp atışı', bpm: 64, step(s, t) {
      const b = s % 16;
      if (s % 32 === 0) I.pad(t, [38, 45, 50], 10, 0.05, 380);
      if (b === 0) I.kick(t, 0.3);
      if (b === 3) I.kick(t, 0.18);
      if (b === 8 && Math.random() < 0.3) { const m = pick([74, 81, 86]); I.bell(t, m, 0.022, 5); I.bell(t + 0.02, m + 1, 0.018, 5); }
      if (b === 12 && Math.random() < 0.12) I.sweep(t);
      if (Math.random() < 0.15) I.crackle(t);
    } },
  };

  function tick() {
    if (!cur) return;
    const st = STATIONS[cur], d = 60 / st.bpm / 4;
    // Arka plandaki sekmede zamanlayıcı yavaşlar: daha ileriye kadar planla
    const ahead = document.hidden ? 1.6 : 0.15;
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + ahead) { st.step(step, next, d); next += d; step++; }
  }
  function play(id) {
    if (!init()) return;
    if (cur === id && timer) return;
    cur = id; step = 0; mel = 0; next = ctx.currentTime + 0.1;
    mBus.gain.cancelScheduledValues(ctx.currentTime);
    mBus.gain.setTargetAtTime(pref.mvol * 0.6, ctx.currentTime, 0.3);
    clearInterval(timer); timer = setInterval(tick, 30);
    emit();
  }
  function stop() {
    clearInterval(timer); timer = null; cur = null;
    if (ctx) { mBus.gain.cancelScheduledValues(ctx.currentTime); mBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); }
    emit();
  }
  const wanted = () => (pref.auto && view === 'fisek' ? 'gerilim' : pref.station);
  function sync() { if (pref.on) play(wanted()); else stop(); }

  // Tarayıcılar sesi ancak bir dokunuştan sonra açar: müzik açık bırakıldıysa ilk tıklamada başlar
  if (pref.on) {
    const go = () => { removeEventListener('pointerdown', go, true); removeEventListener('keydown', go, true); sync(); };
    addEventListener('pointerdown', go, true); addEventListener('keydown', go, true);
  }

  // ---------- Efektler ----------
  function tickNoise(t, f, vol, dur = 0.03, q = 2) { const n = noiseSrc(t, dur), bp = filt('bandpass', f, q), g = amp(t, 0.001, vol, dur); n.connect(bp); bp.connect(g); out(g, sBus, 0.2); }
  function tone(t, type, f, vol, dur, wet = 0.2, f2) { const o = osc(type, f, t, dur); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); const g = amp(t, 0.003, vol, dur); o.connect(g); out(g, sBus, wet); }
  function sfx(name) {
    if (!init() || pref.svol <= 0) return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'shot': {
        const n = noiseSrc(t, 1.3), lp = filt('lowpass', 6000);
        lp.frequency.setValueAtTime(7000, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.7);
        const g = amp(t, 0.002, 1, 1.2); n.connect(lp); lp.connect(g); out(g, sBus, 0.6);
        I.kick(t, 1, sBus); tone(t, 'sine', 70, 0.5, 0.6, 0, 30);
        break;
      }
      case 'click': tickNoise(t, 3500, 0.5, 0.025); tickNoise(t + 0.05, 2200, 0.35, 0.03); break;
      case 'rack': tickNoise(t, 1400, 0.6, 0.05, 1.5); tone(t, 'square', 180, 0.08, 0.05, 0); tickNoise(t + 0.16, 2600, 0.6, 0.05, 1.5); tone(t + 0.16, 'square', 240, 0.08, 0.05, 0); break;
      case 'insert': tickNoise(t, 1800, 0.35, 0.04); break;
      case 'shell': [0, 0.16, 0.27, 0.34].forEach((d, i) => { tone(t + d, 'sine', 2600 + i * 60, 0.12 / (i + 1), 0.15, 0.3); tone(t + d, 'sine', 3900, 0.05 / (i + 1), 0.1, 0.3); }); break;
      case 'beer': {
        tickNoise(t, 5000, 0.4, 0.04, 0.8);
        const n = noiseSrc(t + 0.03, 0.4), hp = filt('highpass', 3000), g = amp(t + 0.03, 0.01, 0.18, 0.35); n.connect(hp); hp.connect(g); out(g, sBus, 0.2);
        [0.5, 0.75, 1].forEach((d) => tone(t + d, 'sine', 220, 0.2, 0.16, 0.3, 140));
        break;
      }
      case 'saw': {
        const n = noiseSrc(t, 0.9), bp = filt('bandpass', 1300, 3), g = amp(t, 0.02, 0.35, 0.85);
        const lfo = osc('square', 9, t, 0.9), lg = ctx.createGain(); lg.gain.value = 0.25; lfo.connect(lg); lg.connect(g.gain);
        n.connect(bp); bp.connect(g); out(g, sBus, 0.2);
        break;
      }
      case 'cuff': [0, 0.06, 0.12, 0.3].forEach((d) => tickNoise(t + d, 4200, 0.4, 0.03, 3)); tone(t + 0.3, 'sine', 1800, 0.06, 0.6, 0.4); break;
      case 'lighter': tickNoise(t, 3000, 0.5, 0.02); { const n = noiseSrc(t + 0.1, 0.8), lp = filt('lowpass', 1600), g = amp(t + 0.1, 0.05, 0.12, 0.7); n.connect(lp); lp.connect(g); out(g, sBus, 0.3); } break;
      case 'peek': { const n = noiseSrc(t, 0.5), bp = filt('bandpass', 400, 4); bp.frequency.exponentialRampToValueAtTime(1800, t + 0.4); const g = amp(t, 0.1, 0.18, 0.45); n.connect(bp); bp.connect(g); out(g, sBus, 0.4); } break;
      case 'win': [60, 64, 67, 72].forEach((m, i) => tone(t + i * 0.12, 'triangle', mtof(m), 0.15, 0.9, 0.5)); break;
      case 'lose': [67, 63, 60, 55].forEach((m, i) => tone(t + i * 0.18, 'sine', mtof(m), 0.14, 1, 0.5)); break;
      case 'heal': tone(t, 'sine', 520, 0.1, 0.4, 0.4, 780); break;
    }
  }

  // ---------- Çalar arayüzü ----------
  function mountButton(btn) {
    const refresh = () => btn.classList.toggle('playing', !!cur);
    listeners.add(refresh); refresh();
    btn.onclick = (e) => { e.stopPropagation(); togglePanel(btn); };
  }
  let panel = null;
  function togglePanel(btn) {
    if (panel) { panel.remove(); panel = null; return; }
    const draw = () => {
      panel.innerHTML = '';
      const range = (label, key) => {
        const inp = h('input', { type: 'range', min: 0, max: 100, value: Math.round(pref[key] * 100), 'aria-label': label });
        inp.addEventListener('input', () => {
          pref[key] = inp.value / 100; savePref();
          if (ctx) {
            if (key === 'mvol' && cur) mBus.gain.setTargetAtTime(pref.mvol * 0.6, ctx.currentTime, 0.05);
            if (key === 'svol') sBus.gain.setTargetAtTime(pref.svol, ctx.currentTime, 0.05);
          }
        });
        if (key === 'svol') inp.addEventListener('change', () => sfx('click'));
        return h('label.mp-range', null, h('span', null, label), inp);
      };
      const auto = h('input', { type: 'checkbox', checked: pref.auto });
      auto.addEventListener('change', () => { pref.auto = auto.checked; savePref(); sync(); draw(); });
      panel.append(
        h('div.mp-head', null,
          h('div', null, h('h3', null, 'Müzik'), h('small', null, cur ? `Çalıyor: ${STATIONS[cur].name}` : 'Kapalı')),
          h('button.mp-play' + (cur ? '.on' : ''), { 'aria-label': cur ? 'Durdur' : 'Çal', onclick: () => { pref.on = !cur; savePref(); sync(); draw(); } },
            ic(cur ? 'pause' : 'play', 'fill'))),
        h('div.mp-stations', null, Object.entries(STATIONS).map(([id, s]) =>
          h('button.mp-st' + (cur === id ? '.on' : ''), { onclick: () => { pref.station = id; pref.on = true; savePref(); if (view === 'fisek' && pref.auto && id !== 'gerilim') { pref.auto = false; } savePref(); play(id); draw(); } },
            h('span.mp-eq', null, h('i'), h('i'), h('i')), h('b', null, s.name), h('small', null, s.desc)))),
        range('Müzik sesi', 'mvol'),
        range('Efekt sesi', 'svol'),
        h('label.mp-check', null, auto, 'Son Fişek açılınca gerilim müziğine geç'),
        h('p.mp-note', null, 'Müzik senin cihazında üretilir; karşı taraf kendi müziğini seçer.'));
    };
    panel = h('div.mp-pop', { role: 'dialog', 'aria-label': 'Müzik çalar', onclick: (e) => e.stopPropagation() });
    draw();
    document.body.append(panel);
    const r = btn.getBoundingClientRect();
    panel.style.top = r.bottom + 10 + 'px';
    panel.style.right = Math.max(8, innerWidth - r.right - 8) + 'px';
    const close = () => { if (panel) { panel.remove(); panel = null; } removeEventListener('click', close); };
    setTimeout(() => addEventListener('click', close));
    listeners.add(() => { if (panel) draw(); });
  }

  return {
    sfx, mountButton, stations: STATIONS,
    onView(v) { view = v; if (pref.on && ctx) play(wanted()); },
    get playing() { return cur; },
  };
})();

// Mızrak Düellosu: Worms tarzı sıra tabanlı atış. Açıyı ve gücü ayarla, rüzgârı hesaba kat, mızrağı fırlat.
// Atışı yapan cihaz yolu ve sonucu hesaplar, duruma yazar; iki taraf da aynı yolu aynı şekilde canlandırır.
(() => {
  const W = 1000, H = 560, GRAV = 0.25, R = 38, CRATER = 34, MAXMOVE = 72, STEP = 8;

  // Tohumlu rastgele sayı (iki cihazda aynı arazi)
  const rng = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Arazi yüksekliği: sinüs toplamı + ortada bir tepe
  const hCache = {};
  function heights(seed) {
    if (hCache[seed]) return hCache[seed];
    const r = rng(seed);
    const waves = Array.from({ length: 4 }, (_, i) => [r() * 6.28, (0.6 + r()) * (55 / (i + 1)), (i + 1) * (0.7 + r() * 0.6)]);
    const hill = 80 + r() * 130;
    const out = new Float32Array(W + 1);
    for (let x = 0; x <= W; x++) {
      let y = 165;
      for (const [ph, amp, f] of waves) y += amp * Math.sin(ph + (x / W) * f * Math.PI * 2);
      y += hill * Math.exp(-(((x - W / 2) / 160) ** 2));
      out[x] = Math.max(70, Math.min(H - 130, y));
    }
    return (hCache[seed] = out);
  }
  function solid(st, x, y, nc = st.craters.length) {
    if (x < 0 || x > W) return false;
    if (y >= H) return true;
    if (y < H - heights(st.seed)[Math.round(x)]) return false;
    for (let i = 0; i < nc; i++) {
      const c = st.craters[i];
      if ((x - c[0]) ** 2 + (y - c[1]) ** 2 < c[2] * c[2]) return false;
    }
    return true;
  }
  function surface(st, x, nc) {
    for (let y = 0; y < H; y += 2) if (solid(st, x, y, nc)) return y;
    return H;
  }

  function newWind() { return Math.round((Math.random() * 2 - 1) * 10 * Math.random()); }
  function newGame(score) {
    score = score || [0, 0];
    return {
      seed: Math.floor(Math.random() * 1e9), craters: [], hp: [100, 100],
      pos: [90 + Math.round(Math.random() * 130), 780 + Math.round(Math.random() * 130)],
      turn: (score[0] + score[1]) % 2, wind: newWind(), moved: 0, n: 0, shot: null, winner: null, score,
    };
  }

  // Mızrağın yolu: 4 alt adımla çarpışma kontrolü
  function simulate(st, s, a, p) {
    const rad = (a * Math.PI) / 180, v = p * 0.165;
    const px = st.pos.slice(), py = st.pos.map((x) => surface(st, x));
    let x = px[s] + Math.cos(rad) * 16, y = py[s] - 34 - Math.sin(rad) * 16;
    let vx = Math.cos(rad) * v, vy = -Math.sin(rad) * v;
    const path = [Math.round(x), Math.round(y)];
    for (let i = 0; i < 1400; i++) {
      vx += st.wind * 0.0032; vy += GRAV;
      for (let k = 1; k <= 4; k++) {
        const qx = x + (vx * k) / 4, qy = y + (vy * k) / 4;
        for (let t = 0; t < 2; t++) {
          if ((t !== s || i > 8) && Math.hypot(qx - px[t], qy - (py[t] - 20)) < 17) {
            path.push(Math.round(qx), Math.round(qy));
            return { path, hit: [qx, qy], direct: t };
          }
        }
        if (solid(st, qx, qy)) { path.push(Math.round(qx), Math.round(qy)); return { path, hit: [qx, qy], direct: null }; }
      }
      x += vx; y += vy;
      path.push(Math.round(x), Math.round(y));
      if (x < -80 || x > W + 80 || y > H + 60) break;
    }
    return { path, hit: null, direct: null };
  }

  // ---------------- Arayüz ----------------
  let el, A, cv, ctx, statusBox, ctlBox, raf = 0, lastN = 0, anim = null, bg = null, terr = null, cols = ['#1e4fa0', '#c23b2a'];
  let aim = { a: 50, p: 60 }, ghost = null, dragging = false, lastRt = 0;
  let parts = [], floats = [], shake = 0, clouds = [];
  const G = () => A.S.spear;
  const myTurn = () => { const st = G(); return st && st.turn === A.seat && st.winner == null && !anim; };
  const elev = (a) => (a <= 90 ? a : 180 - a);

  function bgCanvas(seed) {
    if (bg && bg.seed === seed) return bg.cv;
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const c = c2.getContext('2d'), r = rng(seed + 3);
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1b2b55'); sky.addColorStop(0.45, '#46508a'); sky.addColorStop(0.75, '#d98a64'); sky.addColorStop(1, '#f2c48a');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; c.fillRect(r() * W, r() * 160, 1.6, 1.6); }
    // Güneş
    const sx = 150 + r() * 700, sy = 250;
    const glow = c.createRadialGradient(sx, sy, 10, sx, sy, 160);
    glow.addColorStop(0, 'rgba(255,220,160,.9)'); glow.addColorStop(1, 'rgba(255,200,140,0)');
    c.fillStyle = glow; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffe2b0'; c.beginPath(); c.arc(sx, sy, 34, 0, 7); c.fill();
    // Uzak siluet: kubbeler ve minareler
    c.fillStyle = 'rgba(60,52,98,.75)';
    let x = -20;
    c.beginPath(); c.moveTo(0, H);
    while (x < W + 40) {
      const base = 330 + r() * 30;
      if (r() < 0.35) {
        const rw = 30 + r() * 40;
        c.lineTo(x, base); c.arc(x + rw, base, rw, Math.PI, 0); x += rw * 2;
      } else if (r() < 0.4) {
        c.lineTo(x, base); c.lineTo(x, base - 90 - r() * 50); c.lineTo(x + 4, base - 120 - r() * 40); c.lineTo(x + 8, base - 90); c.lineTo(x + 8, base); x += 8;
      } else { c.lineTo(x, base); x += 20 + r() * 30; c.lineTo(x, base); }
    }
    c.lineTo(W, H); c.closePath(); c.fill();
    // Yakın tepeler
    c.fillStyle = 'rgba(40,40,72,.85)';
    c.beginPath(); c.moveTo(0, H);
    for (let i = 0; i <= W; i += 10) c.lineTo(i, 390 + Math.sin(i / 90 + r() * 0.1) * 20 + Math.sin(i / 37) * 8);
    c.lineTo(W, H); c.closePath(); c.fill();
    bg = { seed, cv: c2 };
    clouds = Array.from({ length: 6 }, () => ({ x: r() * W, y: 40 + r() * 150, s: 0.6 + r() * 0.8 }));
    return c2;
  }

  function terrainCanvas(st, nc) {
    const key = st.seed + ':' + nc;
    if (terr && terr.key === key) return terr.cv;
    const c2 = (terr && terr.cv) || document.createElement('canvas');
    c2.width = W; c2.height = H;
    const c = c2.getContext('2d'), hs = heights(st.seed), r = rng(st.seed + 7);
    const top = (x) => H - hs[Math.min(W, x)];
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) c.lineTo(x, top(x));
    c.lineTo(W, H); c.closePath();
    const g = c.createLinearGradient(0, 120, 0, H);
    g.addColorStop(0, '#9a6a3e'); g.addColorStop(0.5, '#6e4528'); g.addColorStop(1, '#3a2414');
    c.fillStyle = g; c.fill();
    c.save(); c.clip();
    // Toprak katmanları ve taşlar
    for (let k = 1; k < 6; k++) {
      c.strokeStyle = `rgba(40,22,10,${0.12 + k * 0.02})`; c.lineWidth = 3;
      c.beginPath();
      for (let x = 0; x <= W; x += 8) c.lineTo(x, top(x) + k * 55 + Math.sin(x / 50 + k) * 6);
      c.stroke();
    }
    for (let i = 0; i < 320; i++) {
      c.fillStyle = r() < 0.5 ? `rgba(40,24,12,${0.2 + r() * 0.2})` : `rgba(214,176,124,${0.2 + r() * 0.25})`;
      c.beginPath(); c.ellipse(r() * W, 110 + r() * (H - 110), 2 + r() * 6, 1.5 + r() * 3, r() * 3, 0, 7); c.fill();
    }
    c.restore();
    // Çimen
    c.lineJoin = 'round'; c.lineCap = 'round';
    const grass = (off, w, col) => { c.beginPath(); for (let x = 0; x <= W; x += 4) c.lineTo(x, top(x) + off); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
    grass(4, 12, '#3b6f2a'); grass(1, 6, '#5e9f3e'); grass(-1, 2, '#9ccf6a');
    for (let x = 2; x < W; x += 5) {
      c.strokeStyle = r() < 0.5 ? '#4f8c34' : '#79b44c'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x, top(x)); c.lineTo(x + (r() - 0.5) * 4, top(x) - 3 - r() * 6); c.stroke();
    }
    // Kraterler: oy, kenarlarını kavur
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < nc; i++) { const k = st.craters[i]; c.beginPath(); c.arc(k[0], k[1], k[2], 0, 7); c.fill(); }
    c.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < nc; i++) {
      const k = st.craters[i];
      c.strokeStyle = 'rgba(25,12,4,.6)'; c.lineWidth = 8;
      c.beginPath(); c.arc(k[0], k[1], k[2] + 3, 0, 7); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    terr = { key, cv: c2 };
    return c2;
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  }

  // Savaşçı: miğfer, tunik, kalkan, elde mızrak
  function drawWarrior(c, x, y, col, a, holding, hurt) {
    const face = a <= 90 ? 1 : -1;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 0, 14, 3.5, 0, 0, 7); c.fill();
    c.strokeStyle = '#3a2a1e'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-4, -1); c.lineTo(-4, -12); c.moveTo(4, -1); c.lineTo(4, -12); c.stroke();
    c.fillStyle = hurt ? '#fff' : col;
    c.beginPath(); c.roundRect(-9, -27, 18, 17, 5); c.fill();
    c.fillStyle = '#c9a24a'; c.fillRect(-9, -14, 18, 3);
    // Kalkan (arkadaki kol)
    c.fillStyle = shade(col, 0.7); c.strokeStyle = '#d8b25a'; c.lineWidth = 2;
    c.beginPath(); c.arc(-face * 8, -19, 8, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#d8b25a'; c.beginPath(); c.arc(-face * 8, -19, 2, 0, 7); c.fill();
    // Baş ve miğfer
    c.fillStyle = '#e8c39e'; c.beginPath(); c.arc(0, -33, 6.5, 0, 7); c.fill();
    c.fillStyle = '#a7b0ba'; c.beginPath(); c.arc(0, -34, 7, Math.PI, 0); c.fill();
    c.fillRect(-7.5, -34.5, 15, 2.5);
    c.fillStyle = col; c.beginPath(); c.ellipse(-face * 2, -44, 3, 6, -face * 0.4, 0, 7); c.fill();
    c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(face * 3, -32, 1.1, 0, 7); c.fill();
    if (holding) {
      const rad = (a * Math.PI) / 180, cx = face * 3, cy = -22;
      const bx = cx - Math.cos(rad) * 16, by = cy + Math.sin(rad) * 16;
      const tx = cx + Math.cos(rad) * 26, ty = cy - Math.sin(rad) * 26;
      drawSpear(c, bx, by, tx, ty);
      c.fillStyle = '#e8c39e'; c.beginPath(); c.arc(cx, cy, 3, 0, 7); c.fill();
    }
    c.restore();
  }
  function drawSpear(c, bx, by, tx, ty) {
    const ang = Math.atan2(ty - by, tx - bx);
    c.strokeStyle = '#7a5230'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
    c.save(); c.translate(tx, ty); c.rotate(ang);
    c.fillStyle = '#cfd6dd'; c.strokeStyle = '#7d8894'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(9, 0); c.lineTo(-2, -3.5); c.lineTo(-1, 0); c.lineTo(-2, 3.5); c.closePath(); c.fill(); c.stroke();
    c.restore();
    // Kuyruk tüyü
    c.save(); c.translate(bx, by); c.rotate(ang);
    c.fillStyle = '#c23b2a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-6, -4); c.lineTo(-4, 0); c.lineTo(-6, 4); c.closePath(); c.fill();
    c.restore();
  }

  // Canlandırma süreye bağlı; sekme arka plandaysa (kare çizilmezse) zamanlayıcı yine de bitirir
  function startAnim(shot) {
    const a = { shot, i: 0, boom: 0, t0: performance.now() };
    anim = a;
    const ms = (shot.path.length / 2 / 132) * 1000 + 1300;
    setTimeout(() => { if (anim === a) { anim = null; renderUi(); } }, ms);
  }

  function draw() {
    const st = G();
    if (!st || !ctx) return;
    // Canlandırma ilerlet
    let nc = st.craters.length, hp = st.hp.slice(), flyer = null, thrower = null;
    if (anim) {
      const sh = anim.shot, pts = sh.path.length / 2;
      thrower = sh.s;
      if (!anim.boom) {
        anim.i = ((performance.now() - anim.t0) / 1000) * 132;
        if (anim.i >= pts - 1) {
          anim.boom = performance.now();
          anim.i = pts - 1;
          if (sh.hit) {
            shake = 12;
            for (let k = 0; k < 34; k++) {
              const ang = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 5;
              parts.push({ x: sh.hit[0], y: sh.hit[1], vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 3, life: 40 + Math.random() * 30, c: Math.random() < 0.3 ? '#ffcf6b' : (Math.random() < 0.5 ? '#6e4528' : '#3b6f2a') });
            }
            sh.dmg.forEach((d, t) => { if (d) floats.push({ x: st.pos[t], y: surface(st, st.pos[t]) - 64, text: '-' + d, col: cols[t], life: 70 }); });
            if (sh.direct != null) floats.push({ x: sh.hit[0], y: sh.hit[1] - 30, text: 'Tam isabet!', col: '#ffe2b0', life: 70 });
          } else {
            const lx = sh.path[sh.path.length - 2];
            floats.push({ x: Math.max(60, Math.min(W - 60, lx)), y: 120, text: 'Iska!', col: '#ffe2b0', life: 60 });
          }
        } else {
          if (sh.crater) nc--;
          hp = st.hp.map((v, t) => v + sh.dmg[t]);
          const i = Math.floor(anim.i) * 2;
          const j = Math.max(0, i - 6);
          flyer = [sh.path[j], sh.path[j + 1], sh.path[i], sh.path[i + 1]];
        }
      }
      if (anim.boom && performance.now() - anim.boom > 900) { anim = null; renderUi(); }
    }

    const c = ctx;
    c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    if (shake > 0.3) { c.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.88; }
    c.drawImage(bgCanvas(st.seed), 0, 0);
    // Rüzgârla sürüklenen bulutlar
    c.fillStyle = 'rgba(255,240,230,.55)';
    for (const k of clouds) {
      k.x += 0.08 + st.wind * 0.04 * k.s;
      if (k.x > W + 90) k.x = -90; if (k.x < -90) k.x = W + 90;
      c.beginPath();
      c.ellipse(k.x, k.y, 46 * k.s, 13 * k.s, 0, 0, 7);
      c.ellipse(k.x - 18 * k.s, k.y - 8 * k.s, 22 * k.s, 13 * k.s, 0, 0, 7);
      c.ellipse(k.x + 16 * k.s, k.y - 10 * k.s, 26 * k.s, 15 * k.s, 0, 0, 7);
      c.fill();
    }
    c.drawImage(terrainCanvas(st, nc), 0, 0);

    // Savaşçılar
    const now = performance.now();
    for (let t = 0; t < 2; t++) {
      const x = st.pos[t], y = surface(st, x, nc);
      const a = t === A.seat ? aim.a : (ghost ? ghost.a : (t === 0 ? 50 : 130));
      const holding = !(thrower === t) && st.hp[t] > 0 || (anim && anim.boom && thrower === t);
      const hurt = anim && anim.boom && anim.shot.dmg[t] && now - anim.boom < 300 && Math.floor((now - anim.boom) / 60) % 2 === 0;
      if (hp[t] <= 0 && !(anim && !anim.boom)) {
        // Yenilen: yere düşmüş miğfer ve mızrak
        c.fillStyle = '#a7b0ba'; c.beginPath(); c.arc(x, y - 4, 7, Math.PI, 0); c.fill();
        drawSpear(c, x - 20, y - 2, x + 18, y - 6);
      } else drawWarrior(c, x, y, cols[t], a, holding, hurt);
      // Ad ve can çubuğu
      c.font = '600 13px Figtree, sans-serif'; c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillText(A.nameOf(t), x + 1, y - 69);
      c.fillStyle = '#fff'; c.fillText(A.nameOf(t), x, y - 70);
      c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.roundRect(x - 24, y - 64, 48, 7, 3); c.fill();
      c.fillStyle = hp[t] > 50 ? '#5fc46a' : hp[t] > 25 ? '#f0b440' : '#e0533f';
      c.beginPath(); c.roundRect(x - 23, y - 63, 46 * Math.max(0, hp[t]) / 100, 5, 2.5); c.fill();
      // Sıra kimdeyse üstünde zıplayan ok
      if (st.turn === t && st.winner == null && !anim) {
        const by = y - 84 + Math.sin(now / 200) * 4;
        c.fillStyle = cols[t]; c.strokeStyle = '#fff'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x - 8, by - 10); c.lineTo(x + 8, by - 10); c.lineTo(x, by); c.closePath(); c.fill(); c.stroke();
      }
    }

    // Nişan önizlemesi (yalnızca ilk kısmı, rüzgârsız)
    if (myTurn()) {
      const s = A.seat, rad = (aim.a * Math.PI) / 180, v = aim.p * 0.165;
      let x = st.pos[s] + Math.cos(rad) * 16, y = surface(st, st.pos[s]) - 34 - Math.sin(rad) * 16;
      let vx = Math.cos(rad) * v, vy = -Math.sin(rad) * v;
      c.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 26; i++) {
        vy += GRAV; x += vx; y += vy;
        if (i % 2) { c.beginPath(); c.arc(x, y, 2.2 - i * 0.06, 0, 7); c.fill(); }
      }
    }

    if (flyer) drawSpear(c, flyer[0], flyer[1], flyer[2], flyer[3]);

    // Patlama halkası, toprak parçaları
    if (anim && anim.boom && anim.shot.hit) {
      const k = (now - anim.boom) / 400;
      if (k < 1) {
        c.strokeStyle = `rgba(255,230,170,${1 - k})`; c.lineWidth = 6 * (1 - k) + 1;
        c.beginPath(); c.arc(anim.shot.hit[0], anim.shot.hit[1], R * (0.4 + k), 0, 7); c.stroke();
        c.fillStyle = `rgba(255,200,110,${0.6 * (1 - k)})`;
        c.beginPath(); c.arc(anim.shot.hit[0], anim.shot.hit[1], R * 0.7 * (1 - k * 0.5), 0, 7); c.fill();
      }
    }
    parts = parts.filter((q) => q.life-- > 0);
    for (const q of parts) { q.vy += 0.2; q.x += q.vx; q.y += q.vy; c.fillStyle = q.c; c.fillRect(q.x - 2, q.y - 2, 4, 4); }
    floats = floats.filter((f) => f.life-- > 0);
    c.textAlign = 'center';
    for (const f of floats) {
      c.font = '400 26px Marcellus, serif';
      c.globalAlpha = Math.min(1, f.life / 20);
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillText(f.text, f.x + 1.5, f.y + 1.5);
      c.fillStyle = f.col; c.fillText(f.text, f.x, f.y);
      f.y -= 0.6;
      c.globalAlpha = 1;
    }

    // Rüzgâr göstergesi
    c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    c.fillStyle = 'rgba(15,20,40,.55)'; c.beginPath(); c.roundRect(W / 2 - 90, 12, 180, 40, 20); c.fill();
    c.fillStyle = '#fff'; c.font = '700 12px Figtree, sans-serif'; c.textAlign = 'center';
    c.fillText(st.wind ? `RÜZGÂR ${Math.abs(st.wind)}` : 'RÜZGÂR YOK', W / 2, 28);
    if (st.wind) {
      const len = 8 + Math.abs(st.wind) * 6, d = Math.sign(st.wind);
      c.strokeStyle = '#9fd3ff'; c.fillStyle = '#9fd3ff'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(W / 2 - (d * len) / 2, 40); c.lineTo(W / 2 + (d * len) / 2, 40); c.stroke();
      c.beginPath(); c.moveTo(W / 2 + (d * len) / 2 + d * 6, 40); c.lineTo(W / 2 + (d * len) / 2 - d * 2, 35); c.lineTo(W / 2 + (d * len) / 2 - d * 2, 45); c.closePath(); c.fill();
    }

    if (st.winner != null && !anim) {
      c.fillStyle = 'rgba(10,14,30,.55)'; c.fillRect(0, H / 2 - 50, W, 100);
      c.font = '400 44px Marcellus, serif'; c.fillStyle = '#fff';
      c.fillText(`${A.nameOf(st.winner)} kazandı!`, W / 2, H / 2 + 14);
    }
  }

  function loop() { raf = requestAnimationFrame(loop); draw(); }

  // ---------- Kontroller ----------
  function sendAim() {
    const now = Date.now();
    if (now - lastRt < 90) return;
    lastRt = now;
    Net.send({ t: 'rt', g: 'spear', a: aim.a, p: aim.p });
  }
  function setAim(a, p) {
    aim.a = Math.max(0, Math.min(180, Math.round(a)));
    aim.p = Math.max(5, Math.min(100, Math.round(p)));
    const ai = ctlBox && ctlBox.querySelector('[data-k=a]'), pi = ctlBox && ctlBox.querySelector('[data-k=p]');
    if (ai) { ai.value = elev(aim.a); ai.nextSibling.textContent = elev(aim.a) + '°'; }
    if (pi) { pi.value = aim.p; pi.nextSibling.textContent = aim.p; }
    sendAim();
  }
  function fire() {
    if (!myTurn()) return;
    const st = G(), s = A.seat;
    const res = simulate(st, s, aim.a, aim.p);
    const st2 = clone(st), dmg = [0, 0];
    if (res.hit) {
      const [hx, hy] = res.hit;
      for (let t = 0; t < 2; t++) {
        const d = Math.hypot(hx - st.pos[t], hy - (surface(st, st.pos[t]) - 18));
        dmg[t] = res.direct === t ? 50 : d < R + 16 ? Math.round(8 + 30 * (1 - d / (R + 16))) : 0;
      }
      st2.craters.push([Math.round(hx), Math.round(hy), CRATER]);
    }
    st2.hp = st.hp.map((v, t) => Math.max(0, v - dmg[t]));
    st2.n = (st.n || 0) + 1;
    st2.shot = { n: st2.n, s, path: res.path, hit: res.hit && res.hit.map(Math.round), dmg, direct: res.direct, crater: !!res.hit };
    const w = st2.hp[1 - s] <= 0 ? s : st2.hp[s] <= 0 ? 1 - s : null;
    if (w != null) {
      st2.winner = w; st2.score[w]++;
      if (w === s) setTimeout(() => A.act({ t: 'heart' }), 1800);
    } else { st2.turn = 1 - s; st2.wind = newWind(); st2.moved = 0; }
    A.set('spear', st2);
  }
  function walk(dir) {
    if (!myTurn()) return;
    const st = G(), s = A.seat;
    // Yürümek yüzünü de çevirir
    if ((dir > 0) !== (aim.a <= 90)) setAim(180 - aim.a, aim.p);
    if (st.moved >= MAXMOVE) { toast('Bu tur yürüme hakkın bitti'); return; }
    const x = st.pos[s], nx = Math.max(20, Math.min(W - 20, x + dir * STEP));
    if (nx === x) return;
    if (Math.abs(nx - st.pos[1 - s]) < 30) { toast('Rakibe çok yakın'); return; }
    if (surface(st, nx) < surface(st, x) - 14) { toast('Burası çok dik'); return; }
    const st2 = clone(st);
    st2.pos[s] = nx; st2.moved = st.moved + STEP;
    A.set('spear', st2);
  }

  function renderUi() {
    if (!el) return;
    const st = G();
    const mine = myTurn();
    let text;
    if (st.winner != null) text = `${A.nameOf(st.winner)} düelloyu kazandı!`;
    else if (anim) text = 'Mızrak havada…';
    else if (mine) text = 'Sıra sende: nişan al ve fırlat';
    else text = `${A.nameOf(st.turn)} nişan alıyor…`;
    turnPing('spear', mine);
    statusBox.innerHTML = '';
    statusBox.append(h('div.core.status', null,
      h('span' + (mine ? '.your-turn' : ''), null, text), h('span.spacer'),
      h('span.score', null, `Can ${st.hp[0]}-${st.hp[1]} · Skor ${st.score[0]}-${st.score[1]}`),
      statusMark(A, 'spear')));

    ctlBox.innerHTML = '';
    if (st.winner != null) {
      ctlBox.append(h('button.primary.big', { onclick: () => A.set('spear', newGame(st.score)) }, ic('sword'), 'Yeni düello'));
      return;
    }
    const slider = (k, label, min, max, val, suffix, on) => {
      const inp = h('input', { type: 'range', min, max, value: val, 'data-k': k, disabled: !mine, 'aria-label': label });
      inp.addEventListener('input', () => on(+inp.value));
      return h('label.spear-sl', null, h('span', null, label), inp, h('b', null, val + suffix));
    };
    const left = Math.max(0, (MAXMOVE - st.moved) / STEP);
    ctlBox.append(
      h('div.spear-walk', null,
        h('button', { onclick: () => walk(-1), disabled: !mine || !left, 'aria-label': 'Sola yürü' }, ic('caret-left')),
        h('span', null, h('b', null, left), ' adım'),
        h('button', { onclick: () => walk(1), disabled: !mine || !left, 'aria-label': 'Sağa yürü' }, ic('caret-right'))),
      slider('a', 'Açı', 0, 90, elev(aim.a), '°', (v) => setAim(aim.a <= 90 ? v : 180 - v, aim.p)),
      h('button', { onclick: () => setAim(180 - aim.a, aim.p), disabled: !mine, title: 'Yön değiştir', 'aria-label': 'Yön değiştir' }, ic('arrows-left-right')),
      slider('p', 'Güç', 5, 100, aim.p, '', (v) => setAim(aim.a, v)),
      h('button.primary.big.spear-fire', { onclick: fire, disabled: !mine }, ic('arrow-up-right'), 'Fırlat'),
      h('button', { 'aria-label': 'Baştan başla', title: 'Baştan başla',
        onclick: () => modal('Yeni düello?', 'Bu düello silinecek.', [['Evet', () => A.set('spear', newGame(st.score)), 'pink'], ['Vazgeç']]) }, ic('arrow-clockwise')));
  }

  function render() {
    const st = G();
    if (!st || !el) return;
    if (st.shot && st.shot.n !== lastN) startAnim(st.shot);
    lastN = st.shot ? st.shot.n : 0;
    renderUi();
  }

  // Fareyle nişan: savaşçıdan imlece doğru açı, uzaklık güç
  function pointer(e) {
    if (!myTurn()) return;
    const st = G(), rc = cv.getBoundingClientRect();
    const x = ((e.clientX - rc.left) / rc.width) * W, y = ((e.clientY - rc.top) / rc.height) * H;
    const wx = st.pos[A.seat], wy = surface(st, wx) - 34;
    const dx = x - wx, dy = wy - y;
    let a = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (a < 0) a = dx >= 0 ? 0 : 180;
    setAim(a, Math.hypot(dx, dy) / 2.2);
  }
  function onKey(e) {
    if (!el || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (!myTurn()) return;
    const k = e.key, step = e.shiftKey ? 5 : 1, up = aim.a <= 90 ? 1 : -1;
    // Yukarı/aşağı: baktığı tarafta yükseliş açısını 0-90° arasında değiştir
    const toA = (el2) => (up > 0 ? el2 : 180 - el2);
    if (k === 'ArrowUp') setAim(toA(Math.min(90, elev(aim.a) + step)), aim.p);
    else if (k === 'ArrowDown') setAim(toA(Math.max(0, elev(aim.a) - step)), aim.p);
    else if (k === 'w' || k === 'W') setAim(aim.a, aim.p + step);
    else if (k === 's' || k === 'S') setAim(aim.a, aim.p - step);
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') walk(-1);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') walk(1);
    else if (k === ' ' || k === 'Enter') fire();
    else return;
    e.preventDefault();
  }

  Games.spear = {
    id: 'spear', title: 'Mızrak Düellosu', icon: 'sword', desc: 'Açı ve güçle mızrak at, rüzgâra dikkat',
    status(S, A) {
      const st = S.spear;
      if (!st) return { text: 'Yeni düello' };
      const denom = [`${st.hp[0]}-${st.hp[1]}`, 'CAN'];
      if (st.winner != null) return { denom, text: `${A.nameOf(st.winner)} kazandı` };
      const mine = st.turn === A.seat;
      return { mine, denom, text: mine ? 'Nişan al ve fırlat' : `${A.nameOf(st.turn)} nişan alıyor` };
    },
    keys: ['spear'],
    mount(e, app) {
      el = e; A = app; anim = null; ghost = null; parts = []; floats = []; terr = null;
      const css = getComputedStyle(document.documentElement);
      cols = [0, 1].map((s) => (css.getPropertyValue('--p' + s).trim() || cols[s]));
      if (!/^#[0-9a-f]{6}$/i.test(cols[0])) cols[0] = '#1e4fa0';
      if (!/^#[0-9a-f]{6}$/i.test(cols[1])) cols[1] = '#c23b2a';
      aim = { a: A.seat === 0 ? 50 : 130, p: 60 };
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      cv = h('canvas.spear-cv', { width: W * dpr, height: H * dpr, 'aria-label': 'Düello alanı' });
      ctx = cv.getContext('2d');
      cv.addEventListener('pointerdown', (ev) => { dragging = true; cv.setPointerCapture(ev.pointerId); pointer(ev); });
      cv.addEventListener('pointermove', (ev) => { if (dragging) pointer(ev); });
      cv.addEventListener('pointerup', () => { dragging = false; });
      statusBox = h('div.shell');
      ctlBox = h('div.spear-ctl');
      el.append(h('div.game.spear', null, statusBox, h('div.spear-frame', null, cv), ctlBox));
      addEventListener('keydown', onKey);
      if (!A.S.spear) { lastN = 0; A.set('spear', newGame()); }
      else { lastN = A.S.spear.shot ? A.S.spear.shot.n : 0; render(); }
      cancelAnimationFrame(raf);
      loop();
    },
    onRealtime(msg, remote) { if (remote) ghost = { a: msg.a, p: msg.p }; },
    render() { if (el) render(); },
    unmount() { el = null; cancelAnimationFrame(raf); removeEventListener('keydown', onKey); },
    _logic: { simulate, surface, heights, newGame },
  };
})();

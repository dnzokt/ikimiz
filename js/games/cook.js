// Mutfak Telaşı: Overcooked tarzı, iki kişilik gerçek zamanlı mutfak oyunu.
// Oyunu odayı kuran (seat 0) yönetir: fizik, istasyonlar, siparişler onun cihazında hesaplanır.
// Misafir yalnızca tuşlarını gönderir; ev sahibi saniyede ~15 kez mutfağın durumunu yollar.
// Bu mesajlar 'rt' tipindedir: kaydedilmez. Sadece en yüksek skor ortak duruma (S.cook) yazılır.
(() => {
  // 13x9 mutfak. # tezgâh, . zemin, O soğan kasası, T domates kasası, C kesme tahtası,
  // S ocak (tencereli), P tabak yığını, W servis penceresi, X çöp
  const MAP = [
    '#O#T##S#S####',
    '#...........#',
    'C...........#',
    '#....###....W',
    'C....###....W',
    '#...........#',
    'P...........X',
    '#...........#',
    '##P##########',
  ];
  const COLS = MAP[0].length, ROWS = MAP.length;
  const TILE = 64;
  const ROUND = 180;      // saniye
  const COOK = 6, BURN = 10, CHOP = 1.6;
  const SPEED = 3.6;      // kare / saniye
  const R = 0.34;         // aşçı yarıçapı (kare)
  const SOUP = { onion: 'Soğan çorbası', tomato: 'Domates çorbası', mixed: 'Karışık çorba' };
  const ING = { onion: 'Soğan', tomato: 'Domates' };

  const tileAt = (x, y) => (y < 0 || y >= ROWS || x < 0 || x >= COLS ? '#' : MAP[y][x]);
  const walkable = (x, y) => tileAt(x, y) === '.';
  const key = (x, y) => x + ',' + y;

  // ---------------- Oyun durumu (yalnız ev sahibinde yaşar) ----------------
  function newRound() {
    const pots = {};
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (MAP[y][x] === 'S') pots[key(x, y)] = { items: [], t: 0, state: 'empty' };
    return {
      phase: 'play', time: ROUND, score: 0, served: 0, missed: 0,
      chefs: [
        { x: 3.5, y: 5.5, fx: 0, fy: -1, hold: null },
        { x: 9.5, y: 5.5, fx: 0, fy: -1, hold: null },
      ],
      items: {},           // "x,y" → tezgâh/tahta üstündeki eşya
      pots,
      orders: [newOrder(0), newOrder(0)],
      nextOrder: 16, oid: 2, msg: '', msgT: 0,
    };
  }
  let oidSeq = 0;
  function newOrder(elapsed) {
    return { id: oidSeq++, type: Math.random() < 0.5 ? 'onion' : 'tomato', left: 60, ttl: 60, born: elapsed };
  }

  // ---------------- Simülasyon ----------------
  function moveChef(G, i, inp, dt) {
    const c = G.chefs[i];
    let dx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), dy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
    if (!dx && !dy) return;
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    c.fx = dx; c.fy = dy;
    const other = G.chefs[1 - i];
    const free = (nx, ny) => {
      for (const [ox, oy] of [[-R, -R], [R, -R], [-R, R], [R, R]]) if (!walkable(Math.floor(nx + ox), Math.floor(ny + oy))) return false;
      return Math.hypot(nx - other.x, ny - other.y) >= R * 2;
    };
    const nx = c.x + dx * SPEED * dt, ny = c.y + dy * SPEED * dt;
    if (free(nx, c.y)) c.x = nx;
    if (free(c.x, ny)) c.y = ny;
  }

  function target(c) {
    const tx = Math.floor(c.x + c.fx * 0.85), ty = Math.floor(c.y + c.fy * 0.85);
    return walkable(tx, ty) ? null : { x: tx, y: ty, t: tileAt(tx, ty), k: key(tx, ty) };
  }

  function say(G, m) { G.msg = m; G.msgT = 2.2; }

  function interact(G, i) {
    const c = G.chefs[i];
    const tg = target(c);
    if (!tg) return;
    const here = G.items[tg.k];
    const h = c.hold;
    switch (tg.t) {
      case 'O': case 'T':
        if (!h) c.hold = { k: tg.t === 'O' ? 'onion' : 'tomato', chopped: false, chop: 0 };
        else if (!here) { /* kasaya bırakılmaz */ }
        return;
      case 'P':
        if (!h) c.hold = { k: 'plate', soup: null };
        return;
      case 'X':
        if (h && h.k === 'plate') { if (h.soup) { h.soup = null; say(G, 'Çorba çöpe gitti'); } }
        else if (h) { c.hold = null; }
        return;
      case 'W':
        if (h && h.k === 'plate' && h.soup) {
          const idx = G.orders.findIndex((o) => o.type === h.soup);
          if (idx >= 0) {
            const o = G.orders[idx];
            const pts = 20 + Math.round((o.left / o.ttl) * 10);
            G.score += pts; G.served++;
            G.orders.splice(idx, 1);
            say(G, `${SOUP[h.soup]} servis edildi! +${pts}`);
          } else {
            say(G, h.soup === 'mixed' ? 'Karışık çorba siparişte yok' : `${SOUP[h.soup]} siparişi yok`);
          }
          c.hold = null;
        }
        return;
      case 'S': {
        const pot = G.pots[tg.k];
        if (!h) {
          if (pot.state === 'burnt') { pot.items = []; pot.t = 0; pot.state = 'empty'; say(G, 'Yanan tencere boşaltıldı'); }
          return;
        }
        if (h.k !== 'plate' && h.chopped && pot.items.length < 3 && (pot.state === 'empty' || pot.state === 'filling')) {
          pot.items.push(h.k); c.hold = null;
          pot.state = pot.items.length === 3 ? 'cooking' : 'filling';
          pot.t = 0;
          return;
        }
        if (h.k !== 'plate' && !h.chopped) { say(G, 'Önce doğraman lazım'); return; }
        if (h.k === 'plate' && !h.soup && pot.state === 'done') {
          const same = pot.items.every((x) => x === pot.items[0]);
          h.soup = same ? pot.items[0] : 'mixed';
          pot.items = []; pot.t = 0; pot.state = 'empty';
          return;
        }
        return;
      }
      default: // tezgâh '#' ve kesme tahtası 'C'
        if (h && !here) { G.items[tg.k] = h; c.hold = null; }
        else if (!h && here) { c.hold = here; delete G.items[tg.k]; }
        else if (h && here && h.k === 'plate' && !h.soup && here.k === 'plate' && here.soup) { h.soup = here.soup; here.soup = null; }
    }
  }

  function step(G, inputs, dt) {
    if (G.phase !== 'play') return;
    G.time -= dt;
    if (G.msgT > 0) G.msgT -= dt;
    for (const i of [0, 1]) {
      const inp = inputs[i];
      moveChef(G, i, inp, dt);
      // Doğrama: elin boşken kesme tahtasındaki çiğ sebzeye bakıp tuşu basılı tut
      if (inp.chop && !G.chefs[i].hold) {
        const tg = target(G.chefs[i]);
        const it = tg && tg.t === 'C' && G.items[tg.k];
        if (it && it.k !== 'plate' && !it.chopped) {
          it.chop += dt / CHOP;
          if (it.chop >= 1) { it.chopped = true; it.chop = 1; }
        }
      }
      if (inp.acts > (inp.seen || 0)) { inp.seen = inp.acts; interact(G, i); }
    }
    for (const pot of Object.values(G.pots)) {
      if (pot.state === 'cooking' || pot.state === 'done') {
        pot.t += dt;
        if (pot.state === 'cooking' && pot.t >= COOK) pot.state = 'done';
        if (pot.t >= COOK + BURN) { pot.state = 'burnt'; say(G, 'Çorba yandı! Tencereyi boşalt'); }
      }
    }
    for (const o of G.orders) o.left -= dt;
    const expired = G.orders.filter((o) => o.left <= 0);
    if (expired.length) {
      G.orders = G.orders.filter((o) => o.left > 0);
      G.missed += expired.length; G.score = Math.max(0, G.score - 10 * expired.length);
      say(G, 'Bir sipariş kaçtı: -10');
    }
    G.nextOrder -= dt;
    if ((G.nextOrder <= 0 && G.orders.length < 4) || !G.orders.length) {
      G.orders.push(newOrder(ROUND - G.time));
      G.nextOrder = 14 + Math.random() * 6;
    }
    if (G.time <= 0) { G.time = 0; G.phase = 'over'; }
  }

  // ---------------- Arayüz ----------------
  let el, A, canvas, ctx, raf = 0, simTimer = 0, sendTick = 0;
  let G = null;              // ev sahibinde gerçek durum, misafirde son gelen anlık görüntü
  const view = [{ x: 0, y: 0 }, { x: 0, y: 0 }]; // çizimdeki yumuşatılmış aşçı konumları
  const inputs = [{ acts: 0 }, { acts: 0 }];
  const myInput = { u: false, d: false, l: false, r: false, chop: false, acts: 0 };
  let ordersEl, statusEl, overEl;

  const isHost = () => A.seat === 0;

  function sendInput() {
    if (isHost()) { Object.assign(inputs[0], myInput, { seen: inputs[0].seen }); return; }
    Net.send({ t: 'rt', g: 'cook', type: 'in', i: { ...myInput } });
  }

  function hostStart() {
    G = newRound();
    inputs[0] = { ...myInput, acts: myInput.acts, seen: myInput.acts };
    inputs[1] = { acts: inputs[1].acts || 0, seen: inputs[1].acts || 0 };
    view[0] = { x: G.chefs[0].x, y: G.chefs[0].y }; view[1] = { x: G.chefs[1].x, y: G.chefs[1].y };
    clearInterval(simTimer);
    // Sabit adımlı simülasyon: sekme arka planda yavaşlasa bile geçen gerçek süre kadar adım atılır
    let last = performance.now(), acc = 0;
    const DT = 1 / 30;
    simTimer = setInterval(() => {
      const now = performance.now();
      acc += Math.min(1.2, (now - last) / 1000); last = now;
      const was = G.phase;
      while (acc >= DT) { step(G, inputs, DT); acc -= DT; }
      if (++sendTick % 2 === 0 || G.phase !== was) Net.send({ t: 'rt', g: 'cook', type: 'st', s: G });
      renderHud();
      if (was === 'play' && G.phase === 'over') finish();
    }, 33);
    renderHud(true);
  }

  function finish() {
    clearInterval(simTimer);
    const prevBest = (A.S.cook && A.S.cook.best) || 0;
    const rec = { best: Math.max(prevBest, G.score), last: G.score, plays: ((A.S.cook && A.S.cook.plays) || 0) + 1 };
    A.set('cook', rec);
    if (G.score > prevBest && G.score > 0) setTimeout(() => A.act({ t: 'heart' }), 300);
    renderHud(true);
  }

  // ---------------- Çizim ----------------
  const C = {
    floorA: '#ece4d3', floorB: '#e2d8c3', counter: '#b9895a', counterTop: '#cfa274', edge: '#7a5634',
    stove: '#3a3f4b', pot: '#a9b2bc', board: '#e3c08a', crate: '#8a5a3c',
    onion: '#d9b26a', onionIn: '#f2e1b6', tomato: '#d8352a', plate: '#fbfaf6', window: '#2e7d6b', trash: '#59606b',
  };
  const SOUPC = { onion: '#e2b84f', tomato: '#d8452f', mixed: '#8f6b4a' };

  function drawItem(it, x, y, s = 1) {
    if (!it) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (it.k === 'plate') {
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 4, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.plate; ctx.strokeStyle = '#c9cfdb'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
      if (it.soup) { ctx.fillStyle = SOUPC[it.soup]; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fill(); }
    } else {
      const col = it.k === 'onion' ? C.onion : C.tomato;
      if (it.chopped) {
        for (const [dx, dy] of [[-6, -3], [5, -5], [0, 5], [7, 4], [-7, 5]]) {
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = it.k === 'onion' ? C.onionIn : '#f08a6e'; ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-4, -4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = it.k === 'onion' ? '#7a8c3a' : '#3f8a3a';
        ctx.beginPath(); ctx.ellipse(0, -12, 3, 6, 0.3, 0, Math.PI * 2); ctx.fill();
      }
      if (it.chop > 0 && it.chop < 1) bar(-18, 18, 36, it.chop, '#2e7d6b');
    }
    ctx.restore();
  }

  function bar(x, y, w, v, col) {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 1, y - 1, w + 2, 8);
    ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, v)), 6);
  }

  function drawTile(tx, ty, t) {
    const x = tx * TILE, y = ty * TILE;
    if (t === '.') {
      ctx.fillStyle = (tx + ty) % 2 ? C.floorA : C.floorB; ctx.fillRect(x, y, TILE, TILE);
      return;
    }
    // Tezgâh gövdesi
    ctx.fillStyle = C.edge; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = C.counterTop; ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 8);
    const cx = x + TILE / 2, cy = y + TILE / 2 - 2;
    if (t === 'O' || t === 'T') {
      ctx.fillStyle = C.crate; ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 18);
      ctx.strokeStyle = '#5b3a22'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, TILE - 16, TILE - 18);
      drawItem({ k: t === 'O' ? 'onion' : 'tomato' }, cx - 7, cy, 0.7); drawItem({ k: t === 'O' ? 'onion' : 'tomato' }, cx + 8, cy + 3, 0.7);
    } else if (t === 'C') {
      ctx.fillStyle = C.board; ctx.fillRect(x + 7, y + 10, TILE - 14, TILE - 24);
      ctx.fillStyle = '#c9cfdb'; ctx.fillRect(x + TILE - 22, y + 14, 4, 22); ctx.fillStyle = '#5b3a22'; ctx.fillRect(x + TILE - 23, y + 34, 6, 10);
    } else if (t === 'S') {
      ctx.fillStyle = C.stove; ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 12);
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.stroke();
    } else if (t === 'P') {
      for (let i = 0; i < 3; i++) drawItem({ k: 'plate' }, cx, cy + 4 - i * 4, 0.95);
    } else if (t === 'W') {
      ctx.fillStyle = C.window; ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 12);
      ctx.fillStyle = '#f6f4ee'; ctx.font = 'bold 11px Figtree, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('SERVİS', cx, cy + 4);
    } else if (t === 'X') {
      ctx.fillStyle = C.trash; ctx.beginPath(); ctx.moveTo(x + 18, y + 12); ctx.lineTo(x + TILE - 18, y + 12); ctx.lineTo(x + TILE - 22, y + TILE - 14); ctx.lineTo(x + 22, y + TILE - 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b3038'; ctx.fillRect(x + 15, y + 9, TILE - 30, 5);
    }
  }

  function drawPot(k, pot) {
    const [tx, ty] = k.split(',').map(Number);
    const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2 - 2;
    if (pot.state === 'cooking' || pot.state === 'done') {
      ctx.fillStyle = 'rgba(232,89,12,.55)'; ctx.beginPath(); ctx.arc(cx, cy, 22 + Math.sin(performance.now() / 120) * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#5b636e'; ctx.fillRect(cx - 26, cy - 3, 8, 6); ctx.fillRect(cx + 18, cy - 3, 8, 6);
    ctx.fillStyle = C.pot; ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pot.state === 'burnt' ? '#1b1b1b' : pot.items.length ? (pot.items.every((x) => x === pot.items[0]) ? SOUPC[pot.items[0]] : SOUPC.mixed) : '#6b737d';
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    // İçindeki malzeme sayısı
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < pot.items.length ? '#fff' : 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.arc(cx - 8 + i * 8, cy + 26, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (pot.state === 'cooking') bar(cx - 20, cy - 32, 40, pot.t / COOK, '#f2b705');
    if (pot.state === 'done') {
      bar(cx - 20, cy - 32, 40, 1 - (pot.t - COOK) / BURN, '#2e7d6b');
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { const o = (performance.now() / 300 + i) % 2; ctx.beginPath(); ctx.moveTo(cx + i * 7, cy - 10 - o * 6); ctx.quadraticCurveTo(cx + i * 7 + 4, cy - 16 - o * 6, cx + i * 7, cy - 22 - o * 6); ctx.stroke(); }
    }
    if (pot.state === 'burnt') {
      ctx.fillStyle = 'rgba(40,40,40,.55)';
      for (let i = 0; i < 3; i++) { const o = (performance.now() / 400 + i * 0.6) % 2; ctx.beginPath(); ctx.arc(cx - 6 + i * 6, cy - 14 - o * 12, 6 + o * 3, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  function drawChef(i, c, vx, vy) {
    const x = vx * TILE, y = vy * TILE;
    const col = i === 0 ? '#1e4fa0' : '#c23b2a';
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 16, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fbfaf6'; ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 19, Math.PI * 0.15, Math.PI * 0.85); ctx.fill(); // önlük
    ctx.strokeStyle = '#1b2236'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.stroke();
    // Aşçı şapkası
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c9cfdb';
    for (const [dx, dy, r] of [[-7, -10, 7], [0, -14, 8], [7, -10, 7]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillRect(x - 9, y - 9, 18, 6);
    // Yön göstergesi ve elindeki eşya
    const hx = x + c.fx * 24, hy = y + c.fy * 24;
    if (c.hold) drawItem(c.hold, hx, hy, 0.9);
    else { ctx.fillStyle = '#f1c7a0'; ctx.beginPath(); ctx.arc(x + c.fx * 20 - c.fy * 10, y + c.fy * 20 + c.fx * 10, 5, 0, Math.PI * 2); ctx.arc(x + c.fx * 20 + c.fy * 10, y + c.fy * 20 - c.fx * 10, 5, 0, Math.PI * 2); ctx.fill(); }
    // İsim
    ctx.font = 'bold 12px Figtree, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(27,34,54,.8)'; ctx.fillText(A.nameOf(i), x, y + 34);
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) drawTile(tx, ty, MAP[ty][tx]);
    if (!G) { renderHud(); return; }
    for (const [k, pot] of Object.entries(G.pots)) drawPot(k, pot);
    for (const [k, it] of Object.entries(G.items)) {
      const [tx, ty] = k.split(',').map(Number);
      drawItem(it, tx * TILE + TILE / 2, ty * TILE + TILE / 2 - 2, 1);
    }
    // Benim baktığım kareyi vurgula
    const mine = G.chefs[A.seat];
    const tg = mine && target(mine);
    if (tg && G.phase === 'play') {
      ctx.strokeStyle = A.seat === 0 ? '#1e4fa0' : '#c23b2a'; ctx.lineWidth = 3;
      ctx.strokeRect(tg.x * TILE + 3, tg.y * TILE + 3, TILE - 6, TILE - 6);
    }
    G.chefs.forEach((c, i) => {
      view[i].x += (c.x - view[i].x) * 0.35; view[i].y += (c.y - view[i].y) * 0.35;
      drawChef(i, c, view[i].x, view[i].y);
    });
    if (G.msgT > 0 && G.msg) {
      ctx.font = 'bold 18px Figtree, sans-serif'; ctx.textAlign = 'center';
      const w = ctx.measureText(G.msg).width + 28;
      ctx.fillStyle = 'rgba(27,34,54,.85)'; ctx.fillRect(canvas.width / 2 - w / 2, 10, w, 34);
      ctx.fillStyle = '#fff'; ctx.fillText(G.msg, canvas.width / 2, 33);
    }
    renderHud();
  }

  // Siparişler ve süre (her karede ucuz güncelleme)
  let hudKey = '';
  function renderHud(force) {
    if (!statusEl) return;
    const cook = A.S.cook || {};
    const t = G ? Math.ceil(G.time) : ROUND;
    const k = JSON.stringify([G && G.phase, G && G.score, t, G && G.orders.map((o) => [o.id, Math.ceil(o.left)]), cook.best]);
    if (k === hudKey && !force) return;
    hudKey = k;
    statusEl.innerHTML = '';
    statusEl.append(
      h('span.ck-time' + (t <= 20 && G && G.phase === 'play' ? '.low' : ''), null, ic('timer'), ` ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`),
      h('span.ck-score', null, 'Puan ', h('b', null, G ? G.score : 0)),
      h('span.spacer'),
      h('span.score', null, `En iyi: ${cook.best || 0}`));
    ordersEl.innerHTML = '';
    if (G) for (const o of G.orders) {
      ordersEl.append(h('div.ck-order.o-' + o.type + (o.left < 12 ? '.late' : ''), null,
        h('span.ck-bowl'), h('div', null, h('b', null, SOUP[o.type]), h('small', null, `3 ${ING[o.type].toLowerCase()}`)),
        h('span.ck-ttl', null, h('i', { style: { width: Math.max(0, (o.left / o.ttl) * 100) + '%' } }))));
    }
    // Başlangıç / bitiş katmanı
    overEl.innerHTML = '';
    const phase = G ? G.phase : 'lobby';
    overEl.classList.toggle('hidden', phase === 'play');
    if (phase !== 'play') {
      overEl.append(h('div.ck-card', null,
        phase === 'over'
          ? [h('h2', null, `Servis kapandı: ${G.score} puan`), h('p', null, `${G.served} çorba servis ettiniz, ${G.missed} sipariş kaçtı. En iyi skor: ${cook.best || G.score}.`)]
          : [h('h2', null, 'Mutfak Telaşı'), h('p', null, 'Siparişlere göre çorba yapın: kasadan sebze al, kesme tahtasında doğra, tencereye 3 tane at. Pişince tabağa koy ve servise götür. Yakmayın!')],
        h('ul.ck-keys', null,
          h('li', null, h('kbd', null, 'WASD'), ' / ', h('kbd', null, 'Oklar'), ' yürü'),
          h('li', null, h('kbd', null, 'Boşluk'), ' al / bırak / koy'),
          h('li', null, h('kbd', null, 'E'), ' basılı tut: doğra')),
        h('button.primary.big', { onclick: requestStart }, phase === 'over' ? 'Tekrar oyna' : 'Başla')));
    }
  }

  function requestStart() {
    if (isHost()) hostStart();
    else Net.send({ t: 'rt', g: 'cook', type: 'start' });
  }

  // ---------------- Klavye ve dokunmatik kontroller ----------------
  const KEYS = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', KeyE: 'chop', ShiftLeft: 'chop' };
  function onKey(e) {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const down = e.type === 'keydown';
    if (e.code === 'Space') {
      e.preventDefault();
      if (down && !e.repeat) { myInput.acts++; sendInput(); }
      return;
    }
    const k = KEYS[e.code];
    if (!k) return;
    e.preventDefault();
    if (myInput[k] !== down) { myInput[k] = down; sendInput(); }
  }
  function padBtn(label, k, cls = '', icon = null) {
    const b = h('button.ck-pad' + cls, { 'aria-label': label, type: 'button' }, icon ? ic(icon, 'fill') : null, icon && cls.match(/up|down|left|right/) ? null : label);
    const set = (v) => (e) => {
      e.preventDefault();
      if (k === 'act') { if (v) { myInput.acts++; sendInput(); } return; }
      if (myInput[k] !== v) { myInput[k] = v; sendInput(); }
    };
    b.addEventListener('pointerdown', set(true));
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
    return b;
  }

  function fit() {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const maxW = wrap.clientWidth, maxH = window.innerHeight - 290;
    const s = Math.min(maxW / canvas.width, Math.max(200, maxH) / canvas.height);
    canvas.style.width = Math.floor(canvas.width * s) + 'px';
  }

  Games.cook = {
    id: 'cook', title: 'Mutfak Telaşı', icon: 'cooking-pot', desc: 'Birlikte doğrayın, pişirin, servis edin',
    status(S) {
      const c = S.cook;
      if (!c || !c.plays) return { text: 'Henüz oynanmadı' };
      return { denom: [String(c.best), 'EN İYİ'], text: `Son tur ${c.last} puan` };
    },
    onRealtime(msg) {
      if (!el) return;
      if (isHost()) {
        if (msg.type === 'in') Object.assign(inputs[1], msg.i, { seen: inputs[1].seen });
        if (msg.type === 'start' && (!G || G.phase !== 'play')) hostStart();
      } else if (msg.type === 'st') {
        const first = !G || G.phase !== msg.s.phase;
        G = msg.s;
        if (first) { view[0] = { x: G.chefs[0].x, y: G.chefs[0].y }; view[1] = { x: G.chefs[1].x, y: G.chefs[1].y }; }
        renderHud(first);
      }
    },
    mount(e, app) {
      el = e; A = app; G = null; hudKey = '';
      canvas = h('canvas', { width: COLS * TILE, height: ROWS * TILE, 'aria-label': 'Mutfak' });
      ctx = canvas.getContext('2d');
      statusEl = h('div.core.status.ck-status');
      ordersEl = h('div.ck-orders', { 'aria-live': 'polite' });
      overEl = h('div.ck-over');
      el.append(h('div.game.ck-game', null,
        statusEl, ordersEl,
        h('div.ck-stage', null, canvas, overEl),
        h('div.ck-controls', null,
          h('div.ck-dpad', null, padBtn('Yukarı', 'u', '.up', 'caret-up'), padBtn('Sola', 'l', '.left', 'caret-left'),
            padBtn('Sağa', 'r', '.right', 'caret-right'), padBtn('Aşağı', 'd', '.down', 'caret-down')),
          h('div.ck-actions', null, padBtn('Doğra', 'chop', '.chop', 'knife'), padBtn('Al / Bırak', 'act', '.act', 'hand-grabbing')))));
      addEventListener('keydown', onKey);
      addEventListener('keyup', onKey);
      addEventListener('resize', fit);
      fit();
      renderHud(true);
      raf = requestAnimationFrame(frame);
    },
    render() {},
    get _G() { return G; }, // test/hata ayıklama için
    unmount() {
      cancelAnimationFrame(raf); clearInterval(simTimer);
      removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('resize', fit);
      Object.assign(myInput, { u: false, d: false, l: false, r: false, chop: false });
      if (isHost() && G && G.phase === 'play') { G.phase = 'lobby'; Net.send({ t: 'rt', g: 'cook', type: 'st', s: { ...G, phase: 'lobby' } }); }
      el = null; ctx = null; canvas = null; G = null; statusEl = ordersEl = overEl = null;
    },
  };
})();

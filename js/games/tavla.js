// Tavla: klasik kurallar (kapı/kırma, bar, toplama, mars = 2 puan).
// pts[i] > 0: 1. oyuncunun (seat 0) pulları, < 0: 2. oyuncunun. Seat 0, 23→0 yönünde ilerler.
(() => {
  const SGN = [1, -1];
  const DIR = [-1, 1];

  function newPosition() {
    const pts = Array(24).fill(0);
    pts[23] = 2; pts[12] = 5; pts[7] = 3; pts[5] = 5;
    pts[0] = -2; pts[11] = -5; pts[16] = -3; pts[18] = -5;
    return { pts, bar: [0, 0], off: [0, 0] };
  }
  function newGame(score) {
    return { ...newPosition(), turn: null, dice: [], left: [], phase: 'start', startRoll: null,
      winner: null, score: score || [0, 0], snap: null, msg: '' };
  }

  const owns = (v, s) => (s === 0 ? v > 0 : v < 0);
  const blocked = (v, s) => (s === 0 ? v <= -2 : v >= 2);

  function allHome(P, s) {
    if (P.bar[s]) return false;
    for (let i = 0; i < 24; i++) {
      const home = s === 0 ? i <= 5 : i >= 18;
      if (!home && owns(P.pts[i], s)) return false;
    }
    return true;
  }

  function singleMoves(P, s, d) {
    if (P.bar[s] > 0) {
      const to = s === 0 ? 24 - d : d - 1;
      return blocked(P.pts[to], s) ? [] : [{ from: 'bar', to, d }];
    }
    const res = [];
    const home = allHome(P, s);
    for (let i = 0; i < 24; i++) {
      if (!owns(P.pts[i], s)) continue;
      const to = i + DIR[s] * d;
      if (to >= 0 && to <= 23) {
        if (!blocked(P.pts[to], s)) res.push({ from: i, to, d });
      } else if (home) {
        const dist = s === 0 ? i + 1 : 24 - i;
        if (d === dist) res.push({ from: i, to: 'off', d });
        else if (d > dist) {
          // Daha büyük zarla toplama: sadece geride pul yoksa
          let behind = false;
          if (s === 0) { for (let j = i + 1; j <= 5; j++) if (owns(P.pts[j], 0)) behind = true; }
          else { for (let j = 18; j < i; j++) if (owns(P.pts[j], 1)) behind = true; }
          if (!behind) res.push({ from: i, to: 'off', d });
        }
      }
    }
    return res;
  }

  function applyMove(P, s, m) {
    const Q = { pts: P.pts.slice(), bar: P.bar.slice(), off: P.off.slice() };
    const g = SGN[s];
    if (m.from === 'bar') Q.bar[s]--; else Q.pts[m.from] -= g;
    if (m.to === 'off') Q.off[s]++;
    else {
      if (Q.pts[m.to] === -g) { Q.pts[m.to] = 0; Q.bar[1 - s]++; }
      Q.pts[m.to] += g;
    }
    return Q;
  }

  const without = (arr, v) => { const a = arr.slice(); a.splice(a.indexOf(v), 1); return a; };

  function maxDepth(P, s, dice) {
    if (!dice.length) return 0;
    let best = 0;
    for (const v of new Set(dice)) {
      for (const m of singleMoves(P, s, v)) {
        best = Math.max(best, 1 + maxDepth(applyMove(P, s, m), s, without(dice, v)));
        if (best === dice.length) return best;
      }
    }
    return best;
  }

  // Kurallara uygun ilk hamleler: mümkün olan en çok zarı kullanmalı; tek zar oynanabiliyorsa büyüğü.
  function legalMoves(P, s, dice) {
    const total = maxDepth(P, s, dice);
    if (!total) return [];
    let res = [];
    for (const v of new Set(dice)) {
      for (const m of singleMoves(P, s, v)) {
        if (1 + maxDepth(applyMove(P, s, m), s, without(dice, v)) === total) res.push(m);
      }
    }
    if (total === 1 && dice.length === 2 && dice[0] !== dice[1]) {
      const big = Math.max(...dice);
      if (res.some((m) => m.d === big)) res = res.filter((m) => m.d === big);
    }
    return res;
  }

  // ---------------- Arayüz ----------------
  let el, A, sel = null, lastDice = null;
  const G = () => A.S.tavla;
  const save = (st) => A.set('tavla', st);

  const COLX = (c) => (c < 6 ? 20 + c * 50 : 370 + (c - 6) * 50);
  const topIdx = (c) => (A.seat === 0 ? 12 + c : 11 - c);
  const botIdx = (c) => (A.seat === 0 ? 11 - c : 12 + c);

  function svgEl(tag, attrs) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    return e;
  }

  function checker(svg, x, y, s, label, glow) {
    // Gerçekçi pullar: masaya düşen yumuşak gölge, kenar kalınlığı, oluk halkaları ve parlama
    const P = s === 0 ? 'iv' : 'eb';
    svg.append(svgEl('ellipse', { cx: x + 2.5, cy: y + 5, rx: 21.5, ry: 20.5, fill: 'rgba(20,10,4,.55)', filter: 'url(#tv-blur)' }));
    svg.append(svgEl('circle', { cx: x, cy: y + 2.6, r: 21, fill: s === 0 ? '#bfae88' : '#080605' }));
    svg.append(svgEl('circle', { cx: x, cy: y, r: 21, fill: `url(#tv-${P})` }));
    svg.append(svgEl('circle', { cx: x, cy: y, r: 16.5, fill: 'none', stroke: s === 0 ? 'rgba(120,95,55,.35)' : 'rgba(255,255,255,.08)', 'stroke-width': 1.4 }));
    svg.append(svgEl('circle', { cx: x, cy: y, r: 11.5, fill: `url(#tv-${P}-in)`, stroke: s === 0 ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.5)', 'stroke-width': 1 }));
    svg.append(svgEl('ellipse', { cx: x - 6, cy: y - 8, rx: 9, ry: 5, fill: 'url(#tv-spec)', transform: `rotate(-28 ${x - 6} ${y - 8})` }));
    if (glow) svg.append(svgEl('circle', { cx: x, cy: y, r: 23, fill: 'none', stroke: '#f2c14e', 'stroke-width': 3.5, filter: 'url(#tv-glow)' }));
    if (label) {
      const t = svgEl('text', { x, y: y + 6, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 800,
        fill: s === 0 ? '#3b2a18' : '#f3ede1' });
      t.textContent = label;
      svg.append(t);
    }
  }

  function render() {
    const st = G();
    el.innerHTML = '';
    const me = A.seat, myTurn = st.turn === me;
    const moves = myTurn && st.phase === 'move' ? legalMoves(st, me, st.left) : [];
    const froms = new Set(moves.map((m) => m.from));
    const targets = sel != null ? moves.filter((m) => m.from === sel) : [];
    const tset = new Set(targets.map((m) => m.to));

    // Durum çubuğu
    let text;
    if (st.phase === 'start') text = st.msg || 'Kim başlayacak? Zarlar atılsın.';
    else if (st.phase === 'over') text = `${A.nameOf(st.winner)} kazandı! ${st.msg}`;
    else if (myTurn) text = st.phase === 'roll' ? 'Sıra sende, zar at' : (moves.length ? 'Sıra sende, pul seç' : (st.left.length ? 'Oynanacak hamle yok' : 'Hamlen bitti'));
    else text = `${A.nameOf(st.turn)} oynuyor…`;
    turnPing('tavla', myTurn && st.phase !== 'over');

    // Zarlar yeni atıldıysa dönerek gelsin
    const diceKey = JSON.stringify([st.dice, st.startRoll, st.turn]);
    const rolled = diceKey !== lastDice && (st.dice.length || st.startRoll);
    lastDice = diceKey;
    const dice = h('div.dice' + (rolled ? '.rolled' : ''), null, (st.phase === 'start' && st.startRoll)
      ? st.startRoll.map((d) => h('div.die', null, d))
      : st.dice.map((d) => {
        // kullanılmış zarı soluk göster (çiftlerde kalan sayı ayrıca yazılır)
        const used = st.dice[0] !== st.dice[1] && st.phase === 'move' && !st.left.includes(d);
        return h('div.die' + (used ? '.used' : ''), null, d);
      }));
    if (st.dice.length === 2 && st.dice[0] === st.dice[1] && st.phase === 'move') {
      dice.append(h('span.score', null, `×${st.left.length}`));
    }

    const btns = h('div.bar');
    if (st.phase === 'start') btns.append(h('button.primary', { onclick: startRoll }, ic('dice-five'), 'Başlangıç zarı'));
    if (myTurn && st.phase === 'roll') btns.append(h('button.primary', { onclick: roll }, ic('dice-five'), 'Zar at'));
    if (myTurn && st.phase === 'move') {
      btns.append(h('button', { onclick: undo, disabled: !st.snap || st.left.length === st.snap.left.length }, ic('arrow-counter-clockwise'), 'Geri al'));
      btns.append(h('button' + (moves.length ? '' : '.primary'), { onclick: endTurn, disabled: moves.length > 0 },
        moves.length ? 'Hamleni yap' : [ic('check'), 'Sırayı bitir']));
    }
    if (st.phase === 'over') btns.append(h('button.primary', { onclick: () => save(newGame(st.score)) }, 'Yeni oyun'));
    btns.append(h('span.spacer', { style: { flex: 1 } }));
    btns.append(h('button', { 'aria-label': 'Baştan başla', title: 'Baştan başla',
      onclick: () => modal('Yeni oyun?', 'Mevcut oyun silinecek.', [['Evet', () => save(newGame(st.score)), 'pink'], ['Vazgeç']]) }, ic('arrow-clockwise')));

    el.append(h('div.game', null,
      h('div.shell', null, h('div.core.status', null,
        h('span' + (myTurn ? '.your-turn' : ''), null, text), dice, h('span.spacer'),
        h('span.score', null, `${A.nameOf(0)} (beyaz) ${st.score[0]} - ${st.score[1]} ${A.nameOf(1)} (siyah)`),
        statusMark(A, 'tavla'))),
      btns,
      board(st, me, froms, tset),
      h('div.rotate-hint', null, 'Telefonu yan çevirirsen tahta büyür.')));
  }

  // Tahta malzemeleri: dokular dosyadan, ışık ve gölgeler degrade ve filtreyle
  const TV_DEFS = `
    <pattern id="tv-ceviz" patternUnits="userSpaceOnUse" width="1024" height="1024"><image href="assets/doku-ceviz.svg" width="1024" height="1024"/></pattern>
    <pattern id="tv-ceviz2" patternUnits="userSpaceOnUse" width="1024" height="1024" patternTransform="rotate(90)"><image href="assets/doku-ceviz.svg" width="1024" height="1024"/></pattern>
    <pattern id="tv-akca" patternUnits="userSpaceOnUse" width="1024" height="1024" patternTransform="rotate(90) scale(.7)"><image href="assets/doku-akcaagac.svg" width="1024" height="1024"/></pattern>
    <radialGradient id="tv-iv" cx="38%" cy="32%" r="72%"><stop offset="0" stop-color="#fffdf7"/><stop offset=".55" stop-color="#f1e6cb"/><stop offset="1" stop-color="#d6c39b"/></radialGradient>
    <radialGradient id="tv-iv-in" cx="60%" cy="65%" r="70%"><stop offset="0" stop-color="#f7eedb"/><stop offset="1" stop-color="#e2d2ad"/></radialGradient>
    <radialGradient id="tv-eb" cx="38%" cy="32%" r="72%"><stop offset="0" stop-color="#5b524c"/><stop offset=".5" stop-color="#2b2421"/><stop offset="1" stop-color="#110d0b"/></radialGradient>
    <radialGradient id="tv-eb-in" cx="60%" cy="65%" r="70%"><stop offset="0" stop-color="#3a322d"/><stop offset="1" stop-color="#1a1513"/></radialGradient>
    <radialGradient id="tv-spec" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="tv-red" x1="0" x2="1"><stop offset="0" stop-color="#7a2216"/><stop offset=".5" stop-color="#a8392a"/><stop offset="1" stop-color="#7a2216"/></linearGradient>
    <linearGradient id="tv-grn" x1="0" x2="1"><stop offset="0" stop-color="#1d4a3e"/><stop offset=".5" stop-color="#2f6b5b"/><stop offset="1" stop-color="#1d4a3e"/></linearGradient>
    <linearGradient id="tv-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dc8e"/><stop offset=".45" stop-color="#c89a3c"/><stop offset="1" stop-color="#7a5a1c"/></linearGradient>
    <linearGradient id="tv-sh-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1708" stop-opacity=".55"/><stop offset="1" stop-color="#2a1708" stop-opacity="0"/></linearGradient>
    <linearGradient id="tv-sh-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a1708" stop-opacity=".4"/><stop offset="1" stop-color="#2a1708" stop-opacity="0"/></linearGradient>
    <radialGradient id="tv-lamp" cx="50%" cy="20%" r="85%"><stop offset="0" stop-color="#fff3d6" stop-opacity=".16"/><stop offset=".55" stop-color="#fff3d6" stop-opacity="0"/><stop offset="1" stop-color="#0c0603" stop-opacity=".38"/></radialGradient>
    <filter id="tv-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter>
    <filter id="tv-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

  // İç gölge: oyun alanının üst ve sol kenarına çerçeveden düşen gölge
  function inset(svg, x, y, w, hh) {
    svg.append(svgEl('rect', { x, y, width: w, height: 16, fill: 'url(#tv-sh-t)', 'pointer-events': 'none' }));
    svg.append(svgEl('rect', { x, y, width: 12, height: hh, fill: 'url(#tv-sh-l)', 'pointer-events': 'none' }));
    svg.append(svgEl('rect', { x: x + .5, y: y + .5, width: w - 1, height: hh - 1, fill: 'none', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 1, 'pointer-events': 'none' }));
  }
  function board(st, me, froms, tset) {
    const svg = svgEl('svg', { viewBox: '0 0 760 540', class: 'tavla-svg' });
    // Gerçekçi ahşap tavla: ceviz kasa, akçaağaç zemin, iç gölgeler, pirinç menteşe, tepeden lamba ışığı
    const defs = svgEl('defs');
    defs.innerHTML = TV_DEFS;
    svg.append(defs);
    svg.append(svgEl('rect', { x: 0, y: 0, width: 760, height: 540, rx: 12, fill: 'url(#tv-ceviz)' }));
    // Kasa pahı: üst-sol ışık, alt-sağ gölge
    svg.append(svgEl('rect', { x: 1.5, y: 1.5, width: 757, height: 537, rx: 11, fill: 'none', stroke: 'rgba(255,214,160,.28)', 'stroke-width': 2 }));
    svg.append(svgEl('path', { d: 'M12 538.5H748a11 11 0 0 0 11-11V12', fill: 'none', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 2.5 }));
    for (const [x, w] of [[20, 300], [370, 300]]) svg.append(svgEl('rect', { x, y: 20, width: w, height: 500, fill: 'url(#tv-akca)' }));
    svg.append(svgEl('rect', { x: 680, y: 20, width: 62, height: 500, rx: 4, fill: '#2a170b' }));
    svg.append(svgEl('rect', { x: 680, y: 20, width: 62, height: 500, rx: 4, fill: 'url(#tv-ceviz2)', opacity: .45 }));

    const click = (target) => () => onClick(target, froms, tset);

    // Oklar
    for (let c = 0; c < 12; c++) {
      const x = COLX(c);
      for (const [row, idx] of [['top', topIdx(c)], ['bot', botIdx(c)]]) {
        const top = row === 'top';
        const base = top ? 20 : 520, tip = top ? 230 : 310;
        const red = (c + (top ? 0 : 1)) % 2;
        svg.append(svgEl('polygon', { points: `${x + 1},${base} ${x + 49},${base} ${x + 25},${tip}`, fill: red ? 'url(#tv-red)' : 'url(#tv-grn)' }));
        svg.append(svgEl('polyline', { points: `${x + 4},${base} ${x + 25},${tip + (top ? -6 : 6)} ${x + 46},${base}`, fill: 'none', stroke: 'rgba(255,240,210,.18)', 'stroke-width': 1 }));
        if (tset.has(idx)) svg.append(svgEl('polygon', { points: `${x + 4},${base} ${x + 46},${base} ${x + 25},${tip}`, fill: 'rgba(242,193,78,.6)' }));
      }
    }
    inset(svg, 20, 20, 300, 500); inset(svg, 370, 20, 300, 500);
    // Bar: ceviz, iki pirinç menteşe
    svg.append(svgEl('rect', { x: 320, y: 20, width: 50, height: 500, fill: 'url(#tv-ceviz2)' }));
    svg.append(svgEl('rect', { x: 320, y: 20, width: 50, height: 500, fill: 'none', stroke: 'rgba(0,0,0,.4)' }));
    for (const hy of [92, 428]) {
      svg.append(svgEl('rect', { x: 330, y: hy, width: 30, height: 22, rx: 3, fill: 'url(#tv-brass)', stroke: '#5a3f10', 'stroke-width': .8 }));
      svg.append(svgEl('rect', { x: 343.5, y: hy - 2, width: 3, height: 26, rx: 1.5, fill: '#8a6a24' }));
      for (const [sx, sy] of [[334, hy + 5], [356, hy + 5], [334, hy + 17], [356, hy + 17]]) svg.append(svgEl('circle', { cx: sx, cy: sy, r: 1.4, fill: '#5a3f10' }));
    }
    // Pullar ve tıklama alanları
    for (let c = 0; c < 12; c++) {
      const x = COLX(c);
      for (const [row, idx] of [['top', topIdx(c)], ['bot', botIdx(c)]]) {
        const top = row === 'top';
        const base = top ? 20 : 520;
        const v = st.pts[idx], n = Math.abs(v), s = v > 0 ? 0 : 1;
        const shown = Math.min(n, 5);
        for (let k = 0; k < shown; k++) {
          const cy = top ? base + 22 + k * 42 : base - 22 - k * 42;
          const isTop = k === shown - 1;
          checker(svg, x + 25, cy, s, isTop && n > 5 ? n : '', isTop && (froms.has(idx) || sel === idx));
        }
        svg.append(svgEl('rect', { x, y: top ? 20 : 290, width: 50, height: 230, fill: 'transparent', style: 'cursor:pointer', onclick: click(idx) }));
      }
    }
    // Bar: kendi kırık pulların altta, rakibinkiler üstte
    const other = 1 - me;
    for (let k = 0; k < Math.min(st.bar[other], 4); k++) checker(svg, 345, 60 + k * 42, other, k === 3 || (k === st.bar[other] - 1 && st.bar[other] > 1) ? st.bar[other] : '');
    for (let k = 0; k < Math.min(st.bar[me], 4); k++) checker(svg, 345, 480 - k * 42, me, k === Math.min(st.bar[me], 4) - 1 && st.bar[me] > 1 ? st.bar[me] : '', froms.has('bar'));
    svg.append(svgEl('rect', { x: 320, y: 270, width: 50, height: 250, fill: 'transparent', style: 'cursor:pointer', onclick: click('bar') }));

    // Toplanan pullar
    const tray = (s, bottom) => {
      for (let k = 0; k < st.off[s]; k++) {
        const y = bottom ? 510 - k * 15 : 30 + k * 15;
        svg.append(svgEl('rect', { x: 691, y: (bottom ? y - 12 : y) + 2, width: 42, height: 12, rx: 3, fill: 'rgba(0,0,0,.45)', filter: 'url(#tv-blur)' }));
        svg.append(svgEl('rect', { x: 690, y: bottom ? y - 12 : y, width: 42, height: 12, rx: 3,
          fill: s === 0 ? 'url(#tv-iv)' : 'url(#tv-eb)', stroke: '#000', 'stroke-opacity': .35 }));
      }
    };
    tray(other, false); tray(me, true);
    if (tset.has('off')) svg.append(svgEl('rect', { x: 680, y: 270, width: 62, height: 250, rx: 8, fill: 'rgba(242,193,78,.45)' }));
    svg.append(svgEl('rect', { x: 680, y: 20, width: 62, height: 500, fill: 'transparent', style: 'cursor:pointer', onclick: click('off') }));
    // Tepeden vuran lamba: ortası aydınlık, kenarlar koyulaşır (tıklamaları engellemez)
    svg.append(svgEl('rect', { x: 0, y: 0, width: 760, height: 540, rx: 12, fill: 'url(#tv-lamp)', 'pointer-events': 'none' }));
    return svg;
  }

  function onClick(target, froms, tset) {
    const st = G();
    if (st.turn !== A.seat || st.phase !== 'move') return;
    if (sel != null && tset.has(target)) {
      const m = legalMoves(st, A.seat, st.left).filter((m) => m.from === sel && m.to === target)
        .sort((a, b) => a.d - b.d)[0]; // aynı yere giden en küçük zarı kullan
      sel = null;
      doMove(m);
      return;
    }
    sel = froms.has(target) && sel !== target ? target : null;
    // Tek seçenek varsa: bar'dan girişte otomatik seç
    render();
  }

  function doMove(m) {
    const st = clone(G());
    const P = applyMove(st, A.seat, m);
    Object.assign(st, P);
    st.left = without(st.left, m.d);
    if (st.off[A.seat] === 15) {
      const lose = 1 - A.seat;
      const pts = st.off[lose] === 0 ? 2 : 1;
      st.score[A.seat] += pts;
      st.phase = 'over'; st.winner = A.seat; st.msg = pts === 2 ? 'Mars! (+2)' : '(+1)';
      setTimeout(() => A.act({ t: 'heart' }), 300);
    }
    save(st);
  }

  function startRoll() {
    const st = clone(G());
    const a = rollDie(), b = rollDie();
    st.startRoll = [a, b];
    if (a === b) { st.msg = `İkiniz de ${a} attınız, tekrar!`; save(st); return; }
    st.turn = a > b ? 0 : 1;
    st.phase = 'roll';
    st.msg = '';
    save(st);
    A.say(`Başlangıç zarı: ${A.nameOf(0)} ${a}, ${A.nameOf(1)} ${b}. ${A.nameOf(st.turn)} başlıyor.`);
  }

  function roll() {
    const st = clone(G());
    const a = rollDie(), b = rollDie();
    st.dice = [a, b];
    st.left = a === b ? [a, a, a, a] : [a, b];
    st.phase = 'move';
    st.snap = { pts: st.pts.slice(), bar: st.bar.slice(), off: st.off.slice(), left: st.left.slice() };
    save(st);
  }

  function undo() {
    const st = clone(G());
    if (!st.snap) return;
    Object.assign(st, { pts: st.snap.pts.slice(), bar: st.snap.bar.slice(), off: st.snap.off.slice(), left: st.snap.left.slice() });
    sel = null;
    save(st);
  }

  function endTurn() {
    const st = clone(G());
    st.turn = 1 - st.turn; st.phase = 'roll'; st.dice = []; st.left = []; st.snap = null;
    sel = null;
    save(st);
  }

  Games.tavla = {
    id: 'tavla', title: 'Tavla', icon: 'dice-five', desc: 'Klasik kurallar, mars 2 puan',
    status(S, A) {
      const st = S.tavla;
      if (!st || st.phase === "start") return { text: "Başlangıç zarı bekleniyor" };
      const denom = [`${st.score[0]}-${st.score[1]}`, 'SKOR'];
      if (st.phase === "over") return { denom, text: `${A.nameOf(st.winner)} kazandı` };
      const mine = st.turn === A.seat;
      return { mine, denom, text: mine ? (st.phase === 'roll' ? 'Zar at' : 'Pulunu oyna') : `${A.nameOf(st.turn)} oynuyor` };
    },
    keys: ['tavla'],
    mount(e, app) {
      el = e; A = app; sel = null;
      if (!A.S.tavla) A.set('tavla', newGame()); else render();
    },
    render() { if (el) render(); },
    unmount() { el = null; },
    _logic: { newPosition, legalMoves, applyMove },
  };
})();

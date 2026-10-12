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
    // Klasik pullar: oyuncu 1 fildişi, oyuncu 2 abanoz
    svg.append(svgEl('circle', { cx: x, cy: y + 2, r: 21, fill: 'rgba(0,0,0,.25)' }));
    svg.append(svgEl('circle', { cx: x, cy: y, r: 21, fill: s === 0 ? 'url(#tv-ivory)' : 'url(#tv-ebony)',
      stroke: glow ? '#2e7d6b' : (s === 0 ? '#b9ab8c' : '#000'), 'stroke-width': glow ? 4 : 1.5 }));
    svg.append(svgEl('circle', { cx: x, cy: y, r: 13, fill: 'none', stroke: s === 0 ? '#d8cbb0' : '#4a4038', 'stroke-width': 2 }));
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

  function board(st, me, froms, tset) {
    const svg = svgEl('svg', { viewBox: '0 0 760 540', class: 'tavla-svg' });
    // Klasik ahşap tavla: ceviz çerçeve, keten zemin, kırmızı-yeşil oklar
    const defs = svgEl('defs');
    const grad = (id, stops) => {
      const g = svgEl('radialGradient', { id, cx: '40%', cy: '35%', r: '70%' });
      stops.forEach(([o, c]) => g.append(svgEl('stop', { offset: o, 'stop-color': c })));
      return g;
    };
    const wood = svgEl('linearGradient', { id: 'tv-wood', x1: 0, y1: 0, x2: 1, y2: 1 });
    [['0', '#6e4528'], ['.5', '#5b3a22'], ['1', '#4a2c18']].forEach(([o, c]) => wood.append(svgEl('stop', { offset: o, 'stop-color': c })));
    defs.append(grad('tv-ivory', [['0', '#fffaf0'], ['1', '#e6d9bd']]), grad('tv-ebony', [['0', '#4d4540'], ['1', '#1c1816']]), wood);
    svg.append(defs);
    svg.append(svgEl('rect', { x: 0, y: 0, width: 760, height: 540, rx: 10, fill: 'url(#tv-wood)' }));
    svg.append(svgEl('rect', { x: 20, y: 20, width: 300, height: 500, fill: '#ecdcb8' }));
    svg.append(svgEl('rect', { x: 370, y: 20, width: 300, height: 500, fill: '#ecdcb8' }));
    svg.append(svgEl('rect', { x: 680, y: 20, width: 62, height: 500, rx: 4, fill: '#3e2615' }));

    const click = (target) => () => onClick(target, froms, tset);

    for (let c = 0; c < 12; c++) {
      const x = COLX(c);
      for (const [row, idx] of [['top', topIdx(c)], ['bot', botIdx(c)]]) {
        const top = row === 'top';
        const base = top ? 20 : 520, tip = top ? 230 : 310;
        const fill = (c + (top ? 0 : 1)) % 2 ? '#8c2f1f' : '#2f5d50';
        svg.append(svgEl('polygon', { points: `${x},${base} ${x + 50},${base} ${x + 25},${tip}`, fill }));
        if (tset.has(idx)) svg.append(svgEl('polygon', { points: `${x + 4},${base} ${x + 46},${base} ${x + 25},${tip}`, fill: 'rgba(242,193,78,.6)' }));
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
    svg.append(svgEl('rect', { x: 320, y: 20, width: 50, height: 500, fill: '#3e2615' }));
    const other = 1 - me;
    for (let k = 0; k < Math.min(st.bar[other], 4); k++) checker(svg, 345, 60 + k * 42, other, k === 3 || (k === st.bar[other] - 1 && st.bar[other] > 1) ? st.bar[other] : '');
    for (let k = 0; k < Math.min(st.bar[me], 4); k++) checker(svg, 345, 480 - k * 42, me, k === Math.min(st.bar[me], 4) - 1 && st.bar[me] > 1 ? st.bar[me] : '', froms.has('bar'));
    svg.append(svgEl('rect', { x: 320, y: 270, width: 50, height: 250, fill: 'transparent', style: 'cursor:pointer', onclick: click('bar') }));

    // Toplanan pullar
    const tray = (s, bottom) => {
      for (let k = 0; k < st.off[s]; k++) {
        const y = bottom ? 510 - k * 15 : 30 + k * 15;
        svg.append(svgEl('rect', { x: 690, y: bottom ? y - 12 : y, width: 42, height: 12, rx: 3,
          fill: s === 0 ? '#f3ede1' : '#2b2622', stroke: '#000', 'stroke-opacity': .3 }));
      }
    };
    tray(other, false); tray(me, true);
    if (tset.has('off')) svg.append(svgEl('rect', { x: 680, y: 270, width: 62, height: 250, rx: 8, fill: 'rgba(242,193,78,.45)' }));
    svg.append(svgEl('rect', { x: 680, y: 20, width: 62, height: 500, fill: 'transparent', style: 'cursor:pointer', onclick: click('off') }));
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

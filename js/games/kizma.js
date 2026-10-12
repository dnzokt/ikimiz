// Kızma Birader (iki kişilik): kırmızı (oyuncu 1) ve sarı (oyuncu 2), karşılıklı köşeler.
// Kurallar: piyonu çıkarmak için 6; 6 atınca tekrar atılır; hiç piyon dışarıda değilse 3 deneme hakkı.
// Rakibin üstüne gelen onu evine yollar; kendi piyonunun üstüne konulamaz; bitişe tam sayıyla girilir.
(() => {
  // 11x11 ızgarada 40 karelik yol (saat yönünde), oyuncu 1 başlangıcı [0,4]
  const TRACK = [
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0],
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
    [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10],
    [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5],
  ];
  const START = [0, 20];
  const FINISH = [
    [[1, 5], [2, 5], [3, 5], [4, 5]],
    [[9, 5], [8, 5], [7, 5], [6, 5]],
  ];
  const YARD = [
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[9, 9], [10, 9], [9, 10], [10, 10]],
  ];
  // Kullanılmayan iki renk (yeşil, mavi) tahtada dekor olarak durur
  const DECOR = [
    { yard: [[9, 0], [10, 0], [9, 1], [10, 1]], fin: [[5, 1], [5, 2], [5, 3], [5, 4]], start: [6, 0], c: '#2e8b57' },
    { yard: [[0, 9], [1, 9], [0, 10], [1, 10]], fin: [[5, 9], [5, 8], [5, 7], [5, 6]], start: [4, 10], c: '#1e63c4' },
  ];
  const COL = [
    { main: '#c62828', light: '#f6c7c2', dark: '#7f1717', name: 'kırmızı' },
    { main: '#f2b705', light: '#fbe7a6', dark: '#9a7300', name: 'sarı' },
  ];

  function newGame(score) {
    return { pos: [[-1, -1, -1, -1], [-1, -1, -1, -1]], turn: 0, die: null, tries: 0, phase: 'roll',
      winner: null, score: score || [0, 0], last: null, msg: '' };
  }

  const trackIdx = (s, p) => (START[s] + p) % 40;
  const onTrack = (st, s) => st.pos[s].some((p) => p >= 0 && p < 40);

  function legal(st, s, die) {
    const res = [];
    st.pos[s].forEach((p, i) => {
      if (p === -1) {
        if (die === 6 && !st.pos[s].includes(0)) res.push({ i, to: 0 });
        return;
      }
      if (p >= 44) return;
      const np = p + die;
      if (np > 43) return;
      if (st.pos[s].some((q, j) => j !== i && q === np)) return;
      res.push({ i, to: np });
    });
    return res;
  }

  // ---------------- Arayüz ----------------
  let el, A, lastRollKey = null;
  const G = () => A.S.kizma;
  const save = (st) => A.set('kizma', st);

  const svgEl = (tag, attrs) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    return e;
  };

  const S = 50, PAD = 18;
  const cx = (c) => PAD + c * S + S / 2;

  function cell(svg, [c, r], fill, stroke = '#3b2a18', w = 1.6) {
    svg.append(svgEl('circle', { cx: cx(c), cy: cx(r), r: 19, fill, stroke, 'stroke-width': w }));
  }

  function pawn(svg, [c, r], s, movable, onclick) {
    const g = svgEl('g', { style: movable ? 'cursor:pointer' : '', onclick: onclick || null });
    const x = cx(c), y = cx(r);
    if (movable) g.append(svgEl('circle', { cx: x, cy: y, r: 22, fill: 'none', stroke: '#2e7d6b', 'stroke-width': 4 }));
    g.append(svgEl('ellipse', { cx: x, cy: y + 13, rx: 13, ry: 4.5, fill: 'rgba(0,0,0,.25)' }));
    g.append(svgEl('path', { d: `M${x - 11} ${y + 12}Q${x - 11} ${y + 2} ${x - 5} ${y - 2}L${x + 5} ${y - 2}Q${x + 11} ${y + 2} ${x + 11} ${y + 12}Z`,
      fill: COL[s].main, stroke: COL[s].dark, 'stroke-width': 1.2 }));
    g.append(svgEl('circle', { cx: x, cy: y - 7, r: 7.5, fill: COL[s].main, stroke: COL[s].dark, 'stroke-width': 1.2 }));
    g.append(svgEl('circle', { cx: x - 2.5, cy: y - 9.5, r: 2.4, fill: 'rgba(255,255,255,.55)' }));
    svg.append(g);
  }

  function board(st, moves) {
    const size = PAD * 2 + S * 11;
    const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, class: 'kizma-svg' });
    svg.append(svgEl('rect', { x: 0, y: 0, width: size, height: size, rx: 14, fill: '#6b4226' }));
    svg.append(svgEl('rect', { x: 8, y: 8, width: size - 16, height: size - 16, rx: 8, fill: '#f3e6c4' }));
    // Kullanılmayan renkler
    for (const d of DECOR) {
      d.yard.forEach((p) => cell(svg, p, d.c, '#3b2a18', 1.2));
      d.fin.forEach((p) => cell(svg, p, d.c + '55'));
    }
    // Yol
    TRACK.forEach((p, i) => {
      let fill = '#fffaf0';
      if (i === START[0]) fill = COL[0].main;
      else if (i === START[1]) fill = COL[1].main;
      else if (i === 10) fill = DECOR[0].c;
      else if (i === 30) fill = DECOR[1].c;
      cell(svg, p, fill);
    });
    for (const s of [0, 1]) {
      FINISH[s].forEach((p) => cell(svg, p, COL[s].light, COL[s].dark));
      YARD[s].forEach((p) => cell(svg, p, COL[s].light, COL[s].dark));
    }
    // Ortada zar yeri
    svg.append(svgEl('circle', { cx: cx(5), cy: cx(5), r: 15, fill: '#e3d3a8', stroke: '#3b2a18', 'stroke-width': 1.2 }));

    // Piyonlar
    const movable = new Map(moves.map((m) => [m.i, m]));
    for (const s of [0, 1]) {
      st.pos[s].forEach((p, i) => {
        const mine = s === A.seat;
        const m = mine ? movable.get(i) : null;
        let at;
        if (p === -1) at = YARD[s][i];
        else if (p < 40) at = TRACK[trackIdx(s, p)];
        else at = FINISH[s][p - 40];
        pawn(svg, at, s, !!m, m ? () => doMove(m) : null);
      });
    }
    return svg;
  }

  function dieEl(n, rolled) {
    const pips = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[n] || [];
    return h('div.kz-die' + (rolled ? '.rolled' : ''), { 'aria-label': n ? `Zar: ${n}` : 'Zar' },
      Array.from({ length: 9 }, (_, k) => h('span' + (pips.includes(k + 1) ? '.pip' : ''))));
  }

  function render() {
    const st = G();
    el.innerHTML = '';
    const me = A.seat;
    const myTurn = st.turn === me && st.phase !== 'over';
    const moves = myTurn && st.phase === 'move' ? legal(st, me, st.die) : [];
    turnPing('kizma', myTurn);

    let text;
    if (st.phase === 'over') text = `${A.nameOf(st.winner)} kazandı!`;
    else if (myTurn) text = st.phase === 'roll' ? (st.tries ? `Zar at (${st.tries + 1}. deneme)` : 'Sıra sende, zar at') : 'Bir piyon seç';
    else text = `${A.nameOf(st.turn)} oynuyor…`;

    const key = JSON.stringify([st.die, st.turn, st.last]);
    const rolled = key !== lastRollKey && st.die != null;
    lastRollKey = key;

    const done = (s) => st.pos[s].filter((p) => p >= 40).length;
    const btns = h('div.bar');
    if (myTurn && st.phase === 'roll') btns.append(h('button.primary', { onclick: roll }, ic('dice-six'), 'Zar at'));
    if (st.phase === 'over') btns.append(h('button.primary', { onclick: () => save(newGame(st.score)) }, 'Yeni oyun'));
    btns.append(h('span', { style: { flex: 1 } }));
    btns.append(h('button', { 'aria-label': 'Baştan başla', title: 'Baştan başla',
      onclick: () => modal('Yeni oyun?', 'Mevcut oyun silinecek.', [['Evet', () => save(newGame(st.score)), 'pink'], ['Vazgeç']]) }, ic('arrow-clockwise')));

    el.append(h('div.game', null,
      h('div.shell', null, h('div.core.status', null,
        h('span' + (myTurn ? '.your-turn' : ''), null, text),
        dieEl(st.die, rolled),
        st.msg ? h('span.score', null, st.msg) : null,
        h('span.spacer'),
        h('span.score', null, `${A.nameOf(0)} (kırmızı) ${done(0)}/4 · ${A.nameOf(1)} (sarı) ${done(1)}/4 · Skor ${st.score[0]}-${st.score[1]}`),
        statusMark(A, 'kizma'))),
      btns,
      h('div.kizma-wrap', null, board(st, moves))));
  }

  function roll() {
    const st = clone(G());
    const die = rollDie();
    st.die = die; st.msg = '';
    const moves = legal(st, A.seat, die);
    if (moves.length) {
      st.phase = 'move';
    } else if (!onTrack(st, A.seat) && st.tries < 2) {
      st.tries++; st.phase = 'roll'; st.msg = `${die} geldi, tekrar dene`;
    } else {
      st.msg = `${die} geldi, oynanacak hamle yok`;
      st.turn = 1 - st.turn; st.phase = 'roll'; st.tries = 0;
    }
    save(st);
  }

  function doMove(m) {
    const st = clone(G());
    const s = A.seat, o = 1 - s;
    st.pos[s][m.i] = m.to;
    st.msg = '';
    if (m.to < 40) {
      const ti = trackIdx(s, m.to);
      st.pos[o].forEach((p, j) => {
        if (p >= 0 && p < 40 && trackIdx(o, p) === ti) { st.pos[o][j] = -1; st.msg = `${A.name} bir piyonu evine yolladı`; }
      });
    }
    st.last = { s, i: m.i, to: m.to };
    if (st.pos[s].every((p) => p >= 40)) {
      st.phase = 'over'; st.winner = s; st.score[s]++;
      setTimeout(() => A.act({ t: 'heart' }), 300);
    } else if (st.die === 6) {
      st.phase = 'roll'; st.tries = 0; st.msg = st.msg || '6 attın, bir daha at';
    } else {
      st.turn = o; st.phase = 'roll'; st.tries = 0;
    }
    save(st);
  }

  Games.kizma = {
    id: 'kizma', title: 'Kızma Birader', icon: 'circles-four', desc: 'Dört piyonunu ilk eve getiren kazanır',
    status(S, A) {
      const st = S.kizma;
      if (!st) return { text: 'Yeni oyun, kırmızı başlar' };
      const d = (s) => st.pos[s].filter((p) => p >= 40).length;
      const denom = [`${d(0)}-${d(1)}`, 'EVDE'];
      if (st.phase === 'over') return { denom, text: `${A.nameOf(st.winner)} kazandı` };
      const mine = st.turn === A.seat;
      return { mine, denom, text: mine ? (st.phase === 'roll' ? 'Zar at' : 'Piyonunu oynat') : `${A.nameOf(st.turn)} oynuyor` };
    },
    keys: ['kizma'],
    mount(e, app) {
      el = e; A = app;
      if (!A.S.kizma) A.set('kizma', newGame()); else render();
    },
    render() { if (el) render(); },
    unmount() { el = null; },
    _logic: { legal, TRACK },
  };
})();

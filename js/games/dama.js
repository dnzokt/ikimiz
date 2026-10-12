// Türk daması: taşlar ileri/yanlara düz gider, yeme zorunlu ve en çok taş alan hamle seçilmeli.
// Dama (kral) istediği kadar düz gider, uçarak yer; çoklu yemede 180° geri dönemez.
(() => {
  const FWD = [-1, 1]; // seat 0 yukarı (satır azalır), seat 1 aşağı
  const ALL = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const sideOf = (v) => (v > 0 ? 0 : v < 0 ? 1 : -1);

  function newBoard() {
    const B = Array.from({ length: 8 }, () => Array(8).fill(0));
    for (let c = 0; c < 8; c++) { B[1][c] = -1; B[2][c] = -1; B[5][c] = 1; B[6][c] = 1; }
    return B;
  }
  function newGame(score) {
    return { board: newBoard(), turn: 0, last: null, winner: null, score: score || [0, 0] };
  }

  const dirsFor = (v) => (Math.abs(v) === 2 ? ALL : [[FWD[sideOf(v)], 0], [0, -1], [0, 1]]);

  function captures(B, r0, c0) {
    const piece = B[r0][c0], s = sideOf(piece), king = Math.abs(piece) === 2;
    const out = [];
    const dfs = (B, r, c, last, path, caps) => {
      let found = false;
      for (const [dr, dc] of dirsFor(piece)) {
        if (last && dr === -last[0] && dc === -last[1]) continue;
        if (!king) {
          const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc;
          if (inB(r2, c2) && sideOf(B[r1][c1]) === 1 - s && B[r2][c2] === 0) {
            const B2 = B.map((row) => row.slice());
            B2[r][c] = 0; B2[r1][c1] = 0; B2[r2][c2] = piece;
            found = true;
            dfs(B2, r2, c2, [dr, dc], [...path, [r2, c2]], [...caps, [r1, c1]]);
          }
        } else {
          let r1 = r + dr, c1 = c + dc;
          while (inB(r1, c1) && B[r1][c1] === 0) { r1 += dr; c1 += dc; }
          if (!inB(r1, c1) || sideOf(B[r1][c1]) !== 1 - s) continue;
          let r2 = r1 + dr, c2 = c1 + dc;
          while (inB(r2, c2) && B[r2][c2] === 0) {
            const B2 = B.map((row) => row.slice());
            B2[r][c] = 0; B2[r1][c1] = 0; B2[r2][c2] = piece;
            found = true;
            dfs(B2, r2, c2, [dr, dc], [...path, [r2, c2]], [...caps, [r1, c1]]);
            r2 += dr; c2 += dc;
          }
        }
      }
      if (!found && caps.length) out.push({ from: [r0, c0], path, caps });
    };
    dfs(B, r0, c0, null, [], []);
    return out;
  }

  function allMoves(B, s) {
    let caps = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (sideOf(B[r][c]) === s) caps.push(...captures(B, r, c));
    }
    if (caps.length) {
      const max = Math.max(...caps.map((m) => m.caps.length));
      return caps.filter((m) => m.caps.length === max);
    }
    const res = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const v = B[r][c];
      if (sideOf(v) !== s) continue;
      for (const [dr, dc] of dirsFor(v)) {
        let r1 = r + dr, c1 = c + dc;
        while (inB(r1, c1) && B[r1][c1] === 0) {
          res.push({ from: [r, c], path: [[r1, c1]], caps: [] });
          if (Math.abs(v) !== 2) break;
          r1 += dr; c1 += dc;
        }
      }
    }
    return res;
  }

  function applyMove(B, m) {
    const B2 = B.map((row) => row.slice());
    const [fr, fc] = m.from;
    let piece = B2[fr][fc];
    B2[fr][fc] = 0;
    for (const [r, c] of m.caps) B2[r][c] = 0;
    const [tr, tc] = m.path[m.path.length - 1];
    if (Math.abs(piece) === 1 && ((piece > 0 && tr === 0) || (piece < 0 && tr === 7))) piece *= 2;
    B2[tr][tc] = piece;
    return B2;
  }

  // ---------------- Arayüz ----------------
  let el, A, sel = null, lastMove = null;
  const G = () => A.S.dama;
  const key = (r, c) => r * 8 + c;

  function render() {
    const st = G();
    el.innerHTML = '';
    const me = A.seat, myTurn = st.turn === me && st.winner == null;
    const moves = myTurn ? allMoves(st.board, me) : [];
    const movable = new Set(moves.map((m) => key(...m.from)));
    const mustCapture = moves.length && moves[0].caps.length;
    const dests = new Map();
    if (sel != null) for (const m of moves) {
      if (key(...m.from) === sel) dests.set(key(...m.path[m.path.length - 1]), m);
    }
    const lastSet = new Set(st.last ? [key(...st.last.from), key(...st.last.to)] : []);

    let text;
    if (st.winner != null) text = `${A.nameOf(st.winner)} kazandı!`;
    else if (myTurn) text = mustCapture ? `Sıra sende, yemek zorunlu (${moves[0].caps.length} taş)` : 'Sıra sende';
    else text = `${A.nameOf(st.turn)} düşünüyor…`;
    turnPing('dama', myTurn);

    // Son hamlede inen taş bir kez "konsun"
    const moveKey = st.last ? JSON.stringify(st.last) : null;
    const fresh = moveKey && moveKey !== lastMove;
    lastMove = moveKey;
    const landKey = st.last ? key(...st.last.to) : -1;

    const count = (s) => st.board.flat().filter((v) => sideOf(v) === s).length;
    const grid = h('div.dama-board');
    for (let dr = 0; dr < 8; dr++) for (let dc = 0; dc < 8; dc++) {
      const r = me === 0 ? dr : 7 - dr, c = me === 0 ? dc : 7 - dc;
      const k = key(r, c), v = st.board[r][c];
      const cls = ((dr + dc) % 2 ? '.b' : '.a') + (sel === k ? '.sel' : '') + (dests.has(k) ? '.can' : '') + (lastSet.has(k) ? '.last' : '');
      const sq = h('div.sq' + cls, { onclick: () => onClick(k, r, c, movable, dests) });
      if (v) {
        sq.append(h('div.piece' + (v > 0 ? '.w' : '.k') + (mustCapture && movable.has(k) ? '.movable' : '') + (fresh && k === landKey ? '.landed' : ''), null,
          Math.abs(v) === 2 ? ic('crown-simple', 'fill') : ''));
      }
      grid.append(sq);
    }

    el.append(h('div.game', null,
      h('div.shell', null, h('div.core.status', null,
        h('span' + (myTurn ? '.your-turn' : ''), null, text), h('span.spacer'),
        h('span.score', null, `${A.nameOf(0)} ${count(0)} taş, ${A.nameOf(1)} ${count(1)} taş · Skor ${st.score[0]}-${st.score[1]}`),
        statusMark(A, 'dama'))),
      h('div.bar', null,
        st.winner != null ? h('button.primary', { onclick: () => A.set('dama', newGame(st.score)) }, 'Yeni oyun') : null,
        st.winner == null ? h('button', { onclick: () => modal('Pes et?', 'Bu oyunu kaybetmiş sayılırsın.', [['Pes ediyorum', resign, 'pink'], ['Vazgeç']]) }, ic('flag'), 'Pes et') : null,
        h('span', { style: { flex: 1 } }),
        h('button', { 'aria-label': 'Baştan başla', title: 'Baştan başla',
          onclick: () => modal('Yeni oyun?', 'Mevcut oyun silinecek.', [['Evet', () => A.set('dama', newGame(st.score)), 'pink'], ['Vazgeç']]) }, ic('arrow-clockwise'))),
      grid));
  }

  function onClick(k, r, c, movable, dests) {
    const st = G();
    if (dests.has(k)) {
      const m = dests.get(k);
      const st2 = clone(st);
      st2.board = applyMove(st.board, m);
      st2.last = { from: m.from, to: m.path[m.path.length - 1] };
      st2.turn = 1 - st.turn;
      if (!allMoves(st2.board, st2.turn).length) { st2.winner = st.turn; st2.score[st.turn]++; setTimeout(() => A.act({ t: 'heart' }), 300); }
      sel = null;
      A.set('dama', st2);
      return;
    }
    sel = movable.has(k) && sel !== k ? k : null;
    render();
  }

  function resign() {
    const st = clone(G());
    st.winner = 1 - A.seat; st.score[st.winner]++;
    A.set('dama', st);
  }

  Games.dama = {
    id: 'dama', title: 'Dama', icon: 'checkerboard', desc: 'Türk daması, yemek zorunlu',
    status(S, A) {
      const st = S.dama;
      if (!st) return { text: "Yeni oyun, ilk hamle beyazın" };
      const n = (s) => st.board.flat().filter((v) => (s === 0 ? v > 0 : v < 0)).length;
      const denom = [`${n(0)}-${n(1)}`, 'TAŞ'];
      if (st.winner != null) return { denom, text: `${A.nameOf(st.winner)} kazandı` };
      const mine = st.turn === A.seat;
      return { mine, denom, text: mine ? 'Hamleni yap' : `${A.nameOf(st.turn)} düşünüyor` };
    },
    keys: ['dama'],
    mount(e, app) {
      el = e; A = app; sel = null;
      if (!A.S.dama) A.set('dama', newGame()); else render();
    },
    render() { if (el) render(); },
    unmount() { el = null; },
    _logic: { newBoard, allMoves, applyMove },
  };
})();

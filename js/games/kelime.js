// Kelime Masası: Kelimelik tarzı 15x15 kelime oyunu, Türkçe ya da Almanca (Deutsch).
// Kelimeler açık sözlük listeleriyle kontrol edilir; sözlükte olmayan bir kelime karşı tarafın onayıyla oynanabilir.
(() => {
  const N = 15, CENTER = 112;
  const LANGS = {
    tr: {
      name: 'Türkçe', flag: 'TR',
      url: 'https://cdn.jsdelivr.net/gh/CanNuhlar/Turkce-Kelime-Listesi@master/turkce_kelime_listesi.txt',
      up: (s) => s.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u').toLocaleUpperCase('tr'),
      ok: /^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{2,15}$/,
      proper: (w) => w[0] !== w[0].toLocaleLowerCase('tr'),
      letters: 'A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z'.split(' '),
      // harf: [adet, puan]
      dist: { A: [12, 1], B: [2, 3], C: [2, 4], 'Ç': [2, 4], D: [2, 3], E: [8, 1], F: [1, 7], G: [1, 5], 'Ğ': [1, 8], H: [1, 5], I: [4, 2], 'İ': [7, 1], J: [1, 10], K: [7, 1], L: [7, 1], M: [4, 2], N: [5, 1], O: [3, 2], 'Ö': [1, 7], P: [1, 5], R: [6, 1], S: [3, 2], 'Ş': [2, 4], T: [5, 1], U: [3, 2], 'Ü': [2, 3], V: [1, 7], Y: [2, 3], Z: [2, 4], '*': [2, 0] },
    },
    de: {
      name: 'Deutsch', flag: 'DE',
      url: 'https://cdn.jsdelivr.net/gh/enz/german-wordlist@master/words',
      up: (s) => s.replace(/ß/g, 'ss').toLocaleUpperCase('de'),
      ok: /^[A-ZÄÖÜ]{2,15}$/,
      proper: () => false,
      letters: 'A Ä B C D E F G H I J K L M N O Ö P Q R S T U Ü V W X Y Z'.split(' '),
      dist: { A: [5, 1], 'Ä': [1, 6], B: [2, 3], C: [2, 4], D: [4, 1], E: [15, 1], F: [2, 4], G: [3, 2], H: [4, 2], I: [6, 1], J: [1, 6], K: [2, 4], L: [3, 2], M: [4, 3], N: [9, 1], O: [3, 2], 'Ö': [1, 8], P: [1, 4], Q: [1, 10], R: [6, 1], S: [7, 1], T: [6, 1], U: [6, 1], 'Ü': [1, 6], V: [1, 6], W: [1, 3], X: [1, 8], Y: [1, 10], Z: [1, 3], '*': [2, 0] },
    },
  };

  // Ödüllü kareler: K³ kelime x3, K² kelime x2, H³ harf x3, H² harf x2
  const PREM = {};
  const put = (t, list) => list.forEach(([r, c]) => { PREM[r * N + c] = t; });
  put('K3', [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]]);
  put('K2', [[1, 1], [2, 2], [3, 3], [4, 4], [1, 13], [2, 12], [3, 11], [4, 10], [13, 1], [12, 2], [11, 3], [10, 4], [13, 13], [12, 12], [11, 11], [10, 10], [7, 7]]);
  put('H3', [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]]);
  put('H2', [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]]);
  const PREM_LABEL = { K3: 'K³', K2: 'K²', H3: 'H³', H2: 'H²' };

  // ---------- Sözlük ----------
  const dicts = {}, loading = {};
  function loadDict(lang) {
    if (dicts[lang]) return Promise.resolve(dicts[lang]);
    if (loading[lang]) return loading[lang];
    const L = LANGS[lang];
    loading[lang] = fetch(L.url).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((txt) => {
      const set = new Set();
      for (const raw of txt.split('\n')) {
        const w = raw.trim();
        if (w.length < 2 || w.length > 16 || L.proper(w)) continue;
        const u = L.up(w);
        if (L.ok.test(u)) set.add(u);
      }
      dicts[lang] = set;
      return set;
    }).catch((e) => { loading[lang] = null; throw e; });
    return loading[lang];
  }

  // ---------- Kurallar ----------
  const val = (lang, l, blank) => (blank ? 0 : (LANGS[lang].dist[l] || [0, 0])[1]);
  function newBag(lang) {
    const bag = [];
    for (const [l, [n]] of Object.entries(LANGS[lang].dist)) for (let i = 0; i < n; i++) bag.push(l);
    return shuffle(bag);
  }
  function draw(st, s) { while (st.racks[s].length < 7 && st.bag.length) st.racks[s].push(st.bag.pop()); }
  function newGame(lang, score) {
    const st = { lang, board: Array(N * N).fill(null), bag: newBag(lang), racks: [[], []], pts: [0, 0],
      turn: Math.random() < 0.5 ? 0 : 1, passes: 0, last: null, log: [], pending: null, over: false, winner: null, score: score || [0, 0], n: 0 };
    draw(st, 0); draw(st, 1);
    return st;
  }

  // Yerleştirilen taşlardan oluşan kelimeleri ve puanı bul; hata varsa {err}
  function evaluate(st, placed) {
    if (!placed.length) return { err: 'Önce taş koy.' };
    const at = (i) => { const p = placed.find((x) => x.i === i); return p ? p : st.board[i]; };
    const rows = new Set(placed.map((p) => Math.floor(p.i / N))), cols = new Set(placed.map((p) => p.i % N));
    if (rows.size > 1 && cols.size > 1) return { err: 'Taşlar aynı satırda ya da aynı sütunda olmalı.' };
    const empty = st.board.every((x) => !x);
    if (empty && !placed.some((p) => p.i === CENTER)) return { err: 'İlk kelime ortadaki yıldızdan geçmeli.' };
    let horiz = rows.size === 1 && (placed.length > 1 || (() => {
      const i = placed[0].i, c = i % N;
      return (c > 0 && at(i - 1)) || (c < N - 1 && at(i + 1));
    })());
    const step = horiz ? 1 : N;
    const lineOk = (i, j) => (horiz ? Math.floor(i / N) === Math.floor(j / N) : true);
    // Ana kelime: ilk taştan geriye, sonra ileriye
    const sorted = placed.map((p) => p.i).sort((a, b) => a - b);
    let start = sorted[0];
    while (start - step >= 0 && lineOk(start, start - step) && at(start - step)) start -= step;
    let end = start;
    while (end + step < N * N && lineOk(end, end + step) && at(end + step)) end += step;
    if (sorted[sorted.length - 1] > end) return { err: 'Taşların arasında boşluk olmamalı.' };
    const wordAt = (from, to, st2) => {
      const cells = [];
      for (let i = from; i <= to; i += st2) cells.push(i);
      return cells;
    };
    const lang = st.lang, words = [];
    const scoreCells = (cells) => {
      let sum = 0, mult = 1, text = '';
      for (const i of cells) {
        const t = at(i), fresh = placed.some((p) => p.i === i);
        let v = val(lang, t.l, t.b);
        if (fresh) {
          const pr = PREM[i];
          if (pr === 'H2') v *= 2; else if (pr === 'H3') v *= 3; else if (pr === 'K2') mult *= 2; else if (pr === 'K3') mult *= 3;
        }
        sum += v; text += t.l;
      }
      return { text, pts: sum * mult, cells };
    };
    const main = wordAt(start, end, step);
    if (main.length > 1) words.push(scoreCells(main));
    // Çapraz kelimeler
    const cstep = horiz ? N : 1;
    const clineOk = (i, j) => (!horiz ? Math.floor(i / N) === Math.floor(j / N) : true);
    for (const p of placed) {
      let a = p.i, b = p.i;
      while (a - cstep >= 0 && clineOk(a, a - cstep) && at(a - cstep)) a -= cstep;
      while (b + cstep < N * N && clineOk(b, b + cstep) && at(b + cstep)) b += cstep;
      if (b > a) words.push(scoreCells(wordAt(a, b, cstep)));
    }
    if (!words.length) return { err: 'En az iki harfli bir kelime oluşmalı.' };
    if (!empty && !words.some((w) => w.cells.some((i) => st.board[i]))) return { err: 'Kelime tahtadaki harflere değmeli.' };
    if (empty && placed.length < 2) return { err: 'İlk kelime en az iki harf olmalı.' };
    let pts = words.reduce((s, w) => s + w.pts, 0);
    const bingo = placed.length === 7;
    if (bingo) pts += 50;
    return { words, pts, bingo };
  }

  function rackValue(st, s) { return st.racks[s].reduce((t, l) => t + val(st.lang, l, l === '*'), 0); }
  function finish(st, out) {
    if (out != null) {
      const o = 1 - out, v = rackValue(st, o);
      st.pts[out] += v; st.pts[o] -= v;
    } else for (const s of [0, 1]) st.pts[s] -= rackValue(st, s);
    st.over = true;
    st.winner = st.pts[0] === st.pts[1] ? -1 : st.pts[0] > st.pts[1] ? 0 : 1;
    if (st.winner >= 0) st.score[st.winner]++;
  }
  function commit(st, by, cells, ev) {
    for (const c of cells) {
      st.board[c.i] = { l: c.l, b: !!c.b, s: by };
      const k = st.racks[by].indexOf(c.b ? '*' : c.l);
      if (k >= 0) st.racks[by].splice(k, 1);
    }
    draw(st, by);
    st.pts[by] += ev.pts;
    st.last = { cells: cells.map((c) => c.i), by, n: ++st.n };
    st.log.push({ s: by, w: ev.words.map((w) => w.text), p: ev.pts, bingo: ev.bingo });
    if (st.log.length > 40) st.log.shift();
    st.passes = 0; st.pending = null;
    if (!st.bag.length && !st.racks[by].length) finish(st, by);
    else st.turn = 1 - by;
  }

  // ---------------- Arayüz ----------------
  let el, A, temp = [], sel = null, order = null, rackKey = '', dictState = 'idle', drag = null, lastSeenN = -1;
  const G = () => A.S.kelime;
  const myTurn = () => { const st = G(); return st && !st.over && st.turn === A.seat && !st.pending; };

  function myRack() {
    const st = G(), r = st.racks[A.seat];
    const key = r.join('');
    if (key !== rackKey || !order || order.length !== r.length) { rackKey = key; order = r.map((_, i) => i); }
    return order.map((i) => ({ i, l: r[i] }));
  }
  const usedIdx = () => new Set(temp.map((t) => t.r));

  function placeAt(cell, rIdx) {
    const st = G(), l = st.racks[A.seat][rIdx];
    if (st.board[cell] || temp.some((t) => t.i === cell)) return;
    if (l === '*') {
      const L = LANGS[st.lang];
      const bg = h('div.modal-bg');
      bg.append(h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, h('div.core', null,
        h('h2', null, 'Joker hangi harf olsun?'),
        h('div.kl-pick', null, L.letters.map((x) => h('button', { onclick: () => { bg.remove(); temp.push({ i: cell, r: rIdx, l: x, b: true }); sel = null; render(); } }, x))),
        h('div.row', null, h('button', { onclick: () => bg.remove() }, 'Vazgeç')))));
      document.body.append(bg);
      return;
    }
    temp.push({ i: cell, r: rIdx, l, b: false });
    sel = null;
    render();
  }

  function submit(force) {
    const st = G();
    if (!myTurn() || !temp.length) return;
    const placed = temp.map((t) => ({ i: t.i, l: t.l, b: t.b }));
    const ev = evaluate(st, placed);
    if (ev.err) { toast(ev.err, 3000); return; }
    const dict = dicts[st.lang];
    const unknown = dict ? ev.words.map((w) => w.text).filter((w) => !dict.has(w)) : ev.words.map((w) => w.text);
    if (unknown.length && !force) {
      modal(dict ? 'Sözlükte bulunamadı' : 'Sözlük yüklenemedi',
        `${unknown.join(', ')} ${dict ? 'sözlükte yok' : 'kontrol edilemedi'}. İstersen ${A.nameOf(A.other)} onaylasın.`,
        [['Onaya gönder', () => submit(true), 'primary'], ['Vazgeç']]);
      return;
    }
    const st2 = clone(st);
    if (unknown.length) {
      st2.pending = { by: A.seat, cells: placed, words: ev.words.map((w) => w.text), unknown, pts: ev.pts, bingo: ev.bingo };
    } else {
      commit(st2, A.seat, placed, ev);
      temp = [];
    }
    A.set('kelime', st2);
  }
  function approve(ok) {
    const st = G(), p = st.pending;
    if (!p) return;
    const st2 = clone(st);
    if (ok) {
      const ev = evaluate(st, p.cells);
      if (ev.err) { st2.pending = null; A.set('kelime', st2); return; }
      commit(st2, p.by, p.cells, ev);
    } else {
      st2.pending = null;
      st2.log.push({ s: A.seat, rej: p.unknown });
    }
    A.set('kelime', st2);
  }
  function pass() {
    const st2 = clone(G());
    st2.passes++;
    st2.log.push({ s: A.seat, pass: true });
    temp = [];
    if (st2.passes >= 4) finish(st2, null); else st2.turn = 1 - A.seat;
    A.set('kelime', st2);
  }
  function exchange() {
    const st = G();
    if (st.bag.length < 7) { toast('Torbada 7\'den az taş var, değiştirilemez.'); return; }
    const picked = new Set();
    const bg = h('div.modal-bg');
    const grid = h('div.kl-rack.kl-swap');
    st.racks[A.seat].forEach((l, i) => {
      const b = h('button.kl-tile', { onclick: () => { if (picked.has(i)) picked.delete(i); else picked.add(i); b.classList.toggle('picked'); } },
        l === '*' ? '' : l, h('small', null, val(st.lang, l, l === '*')));
      grid.append(b);
    });
    bg.append(h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, h('div.core', null,
      h('h2', null, 'Hangi taşlar değişsin?'), h('p', null, 'Seçtiklerin torbaya döner, yerine yenileri gelir. Sıran biter.'), grid,
      h('div.row', null,
        h('button.primary', { onclick: () => {
          if (!picked.size) return;
          bg.remove();
          const st2 = clone(G()), r = st2.racks[A.seat];
          const out = [...picked].sort((a, b) => b - a).map((i) => r.splice(i, 1)[0]);
          draw(st2, A.seat);
          st2.bag.push(...out); shuffle(st2.bag);
          st2.passes++; st2.log.push({ s: A.seat, swap: out.length });
          temp = [];
          if (st2.passes >= 4) finish(st2, null); else st2.turn = 1 - A.seat;
          A.set('kelime', st2);
        } }, 'Değiştir'),
        h('button', { onclick: () => bg.remove() }, 'Vazgeç')))));
    document.body.append(bg);
  }

  // ---------- Sürükle bırak ----------
  function startDrag(e, from) {
    if (!myTurn()) return;
    e.preventDefault();
    const t0 = e.currentTarget;
    const ghost = t0.cloneNode(true);
    ghost.classList.add('kl-ghost');
    const rc = t0.getBoundingClientRect();
    ghost.style.width = rc.width + 'px'; ghost.style.height = rc.height + 'px';
    drag = { from, ghost, x0: e.clientX, y0: e.clientY, moved: false, dx: e.clientX - rc.left, dy: e.clientY - rc.top };
    const move = (ev) => {
      if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 6) return;
      if (!drag.moved) { drag.moved = true; document.body.append(ghost); t0.classList.add('kl-dragging'); }
      ghost.style.left = ev.clientX - drag.dx + 'px'; ghost.style.top = ev.clientY - drag.dy + 'px';
    };
    const up = (ev) => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      const d = drag; drag = null;
      ghost.remove(); t0.classList.remove('kl-dragging');
      if (!d.moved) { // tıklama
        if (from.rack != null) { sel = sel === from.rack ? null : from.rack; render(); }
        else { temp = temp.filter((t) => t.i !== from.cell); render(); }
        return;
      }
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const cellEl = target && target.closest('.kl-cell');
      const rIdx = from.rack != null ? from.rack : temp.find((t) => t.i === from.cell).r;
      if (from.cell != null) temp = temp.filter((t) => t.i !== from.cell);
      if (cellEl) placeAt(+cellEl.dataset.i, rIdx); else render();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }

  function tile(l, b, lang, cls = '') {
    return h('div.kl-tile' + cls, null, b ? h('span.kl-blank', null, l) : l, h('small', null, b ? '' : val(lang, l, false)));
  }

  function render() {
    const st = G();
    if (!el || !st) return;
    const me = A.seat, op = A.other, mine = myTurn();
    // Karşı taraf hamle yaptıysa geçersiz kalan geçici taşları geri al
    temp = temp.filter((t) => !st.board[t.i] && st.racks[me][t.r] != null);
    if (st.last && st.last.n !== lastSeenN) { lastSeenN = st.last.n; }
    turnPing('kelime', mine || !!(st.pending && st.pending.by === op));
    const L = LANGS[st.lang];
    const ev = temp.length ? evaluate(st, temp.map((t) => ({ i: t.i, l: t.l, b: t.b }))) : null;
    const dict = dicts[st.lang];
    const lastSet = new Set(st.last ? st.last.cells : []);
    const pend = st.pending ? new Map(st.pending.cells.map((c) => [c.i, c])) : new Map();

    // Durum çubuğu
    let text;
    if (st.over) text = st.winner === -1 ? 'Berabere bitti.' : `${A.nameOf(st.winner)} kazandı!`;
    else if (st.pending) text = st.pending.by === me ? `${A.nameOf(op)} onayını bekliyorsun…` : `${A.nameOf(op)} sözlükte olmayan bir kelime için onayını istiyor`;
    else if (mine) text = 'Sıra sende: kelimeni yerleştir';
    else text = `${A.nameOf(st.turn)} düşünüyor…`;

    // Tahta
    const board = h('div.kl-board' + (drag ? '.dragging' : ''));
    for (let i = 0; i < N * N; i++) {
      const t = st.board[i], tp = temp.find((x) => x.i === i), pd = pend.get(i), pr = PREM[i];
      const cell = h('div.kl-cell' + (pr ? '.' + pr.toLowerCase() : '') + (i === CENTER ? '.star' : '') + (sel != null && !t && !tp && mine ? '.can' : ''),
        { 'data-i': i, onclick: () => { if (sel != null && mine && !t && !tp) placeAt(i, sel); } });
      if (t) cell.append(tile(t.l, t.b, st.lang, lastSet.has(i) ? '.last' : ''));
      else if (tp) {
        const tt = tile(tp.l, tp.b, st.lang, '.temp' + (ev && !ev.err ? '' : '.bad'));
        tt.addEventListener('pointerdown', (e) => startDrag(e, { cell: i }));
        cell.append(tt);
      } else if (pd) cell.append(tile(pd.l, pd.b, st.lang, '.pend'));
      else if (pr) cell.append(h('span.kl-prem', null, i === CENTER ? '★' : PREM_LABEL[pr]));
      board.append(cell);
    }

    // Raf
    const used = usedIdx();
    const rack = h('div.kl-rack', null, myRack().filter((x) => !used.has(x.i)).map((x) => {
      const tt = tile(x.l === '*' ? '' : x.l, false, st.lang, (sel === x.i ? '.sel' : '') + (x.l === '*' ? '.joker' : ''));
      if (x.l === '*') tt.querySelector('small').textContent = '';
      tt.addEventListener('pointerdown', (e) => startDrag(e, { rack: x.i }));
      return tt;
    }));

    // Önizleme: oluşan kelimeler, sözlük durumu, puan
    let preview = null;
    if (ev && ev.err) preview = h('div.kl-prev.bad', null, ev.err);
    else if (ev) preview = h('div.kl-prev', null,
      ev.words.map((w) => {
        const known = dict ? dict.has(w.text) : null;
        return h('span.kl-word' + (known === false ? '.bad' : known ? '.ok' : ''), null, w.text, known === false ? ' ✗' : known ? ' ✓' : '');
      }),
      h('b.kl-pts', null, `+${ev.pts}`), ev.bingo ? h('span.kl-bingo', null, 'BİNGO +50') : null);

    const pendBox = st.pending && st.pending.by === op ? h('div.kl-approve.core', null,
      h('p', null, h('b', null, A.nameOf(op)), ` "${st.pending.words.join(', ')}" oynamak istiyor (+${st.pending.pts}). `,
        h('span.muted', null, `Sözlükte yok: ${st.pending.unknown.join(', ')}`)),
      h('div.row', null, h('button.primary', { onclick: () => approve(true) }, ic('check'), 'Kabul'), h('button', { onclick: () => approve(false) }, ic('x'), 'Reddet'))) : null;

    const logEl = h('ol.kl-log', null, st.log.slice(-6).reverse().map((e) => h('li', { style: { '--ink': `var(--p${e.s})` } },
      h('b', null, A.nameOf(e.s)), ' ',
      e.pass ? 'pas geçti' : e.swap ? `${e.swap} taş değiştirdi` : e.rej ? `"${e.rej.join(', ')}" kelimesini reddetti` : [h('span.kl-lw', null, e.w.join(', ')), ` +${e.p}`, e.bingo ? ' (bingo)' : ''])));

    el.innerHTML = '';
    el.append(h('div.game.kelime', null,
      h('div.shell', null, h('div.core.status', null,
        h('span' + (mine ? '.your-turn' : ''), null, text), h('span.spacer'),
        h('span.kl-lang', null, L.flag + ' ' + L.name),
        dictState === 'loading' ? h('span.muted', null, 'Sözlük yükleniyor…') : dictState === 'error' ? h('span.muted', null, 'Sözlük yüklenemedi, kelimeleri onaylarınız belirler') : null,
        statusMark(A, 'kelime'))),
      h('div.kl-wrap', null,
        board,
        h('div.kl-side', null,
          h('div.kl-scores', null, [me, op].map((s) => h('div.kl-sc' + (st.turn === s && !st.over ? '.turn' : ''), { style: { '--ink': `var(--p${s})` } },
            h('small', null, s === me ? 'Sen' : A.nameOf(s)), h('b', null, st.pts[s])))),
          h('div.kl-bag', null, ic('bag'), `Torbada ${st.bag.length} taş`, h('span.muted', null, ` · ${A.nameOf(op)}: ${st.racks[op].length} taş`)),
          pendBox, logEl)),
      h('div.kl-bottom', null,
        preview,
        rack,
        st.over
          ? h('div.kl-actions', null,
            h('button.primary.big', { onclick: () => askLang(st.score) }, ic('arrow-counter-clockwise'), 'Yeni oyun'))
          : h('div.kl-actions', null,
            h('button.primary.big', { onclick: () => submit(false), disabled: !mine || !temp.length }, ic('check'), 'Oyna'),
            h('button', { onclick: () => { temp = []; sel = null; render(); }, disabled: !temp.length, title: 'Taşları geri al', 'aria-label': 'Taşları geri al' }, ic('arrow-u-up-left')),
            h('button', { onclick: () => { order = shuffle(order.slice()); render(); }, title: 'Karıştır', 'aria-label': 'Karıştır' }, ic('shuffle')),
            h('button', { onclick: exchange, disabled: !mine }, ic('swap'), 'Değiştir'),
            h('button', { onclick: () => modal('Pas geç?', 'Sıran karşıya geçer.', [['Pas', pass, 'primary'], ['Vazgeç']]), disabled: !mine }, 'Pas'),
            h('button', { 'aria-label': 'Yeni oyun', title: 'Yeni oyun',
              onclick: () => modal('Yeni oyun?', 'Bu oyun silinecek.', [['Evet', () => askLang(st.score), 'pink'], ['Vazgeç']]) }, ic('arrow-clockwise'))))));
  }

  function askLang(score) {
    modal('Hangi dilde oynayalım?', 'Kelimeler o dilin sözlüğüyle kontrol edilir.', [
      ['Türkçe', () => start('tr', score), 'primary'],
      ['Deutsch', () => start('de', score), 'primary'],
      ['Vazgeç'],
    ]);
  }
  function start(lang, score) { temp = []; sel = null; A.set('kelime', newGame(lang, score)); }

  function ensureDict() {
    const st = G();
    if (!st || dicts[st.lang]) { dictState = 'ok'; return; }
    dictState = 'loading';
    loadDict(st.lang).then(() => { dictState = 'ok'; render(); }).catch(() => { dictState = 'error'; render(); });
  }

  Games.kelime = {
    id: 'kelime', title: 'Kelime Masası', icon: 'text-aa', desc: 'Kelimelik gibi, Türkçe ya da Deutsch',
    status(S, A) {
      const st = S.kelime;
      if (!st) return { text: 'Dil seç ve başla' };
      const denom = [`${st.pts[0]}-${st.pts[1]}`, 'PUAN'];
      if (st.over) return { denom, text: st.winner === -1 ? 'Berabere' : `${A.nameOf(st.winner)} kazandı` };
      if (st.pending) { const m = st.pending.by !== A.seat; return { mine: m, denom, text: m ? 'Kelimeyi onayla' : 'Onay bekleniyor' }; }
      const mine = st.turn === A.seat;
      return { mine, denom, text: mine ? 'Kelimeni yerleştir' : `${A.nameOf(st.turn)} düşünüyor` };
    },
    keys: ['kelime'],
    mount(e, app) {
      el = e; A = app; temp = []; sel = null; order = null;
      if (!A.S.kelime) {
        el.append(h('div.game.kelime', null, h('div.kl-start.core', null,
          h('h2', null, 'Kelime Masası'), h('p', null, 'Hangi dilde oynayalım? Kelimeler o dilin sözlüğüyle kontrol edilir.'),
          h('div.row', null,
            h('button.primary.big', { onclick: () => start('tr', null) }, 'TR  Türkçe'),
            h('button.primary.big', { onclick: () => start('de', null) }, 'DE  Deutsch')))));
        return;
      }
      ensureDict();
      render();
    },
    render() { if (el) { ensureDict(); render(); } },
    unmount() { el = null; },
    _logic: { evaluate, newGame, commit, loadDict, LANGS },
  };
})();

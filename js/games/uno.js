// UNO (iki kişilik). 108 kart: 4 renk (0 bir tane, 1-9 / Atla / Yön / +2 ikişer), 4 Joker, 4 Joker +4.
// İki kişide Yön Değiştir de Atla gibi çalışır: sıra yine sende. +2 ve +4'te rakip çeker ve sırası geçer.
// 2 kartın varken "UNO!" demeden 1 karta inersen rakibin "Yakala" ile sana 2 kart çektirebilir.
(() => {
  const COLORS = ['r', 'y', 'g', 'b'];
  const CNAME = { r: 'Kırmızı', y: 'Sarı', g: 'Yeşil', b: 'Mavi' };
  const CHEX = { r: '#d72600', y: '#ecd407', g: '#379711', b: '#0956bf', k: '#1b1b1b' };
  const LABEL = { skip: 'Atla', rev: 'Yön', d2: '+2', wild: 'Joker', w4: '+4' };

  function newDeck() {
    const d = [];
    let id = 0;
    for (const c of COLORS) {
      d.push({ id: id++, c, v: '0' });
      for (let i = 0; i < 2; i++) {
        for (let n = 1; n <= 9; n++) d.push({ id: id++, c, v: String(n) });
        for (const v of ['skip', 'rev', 'd2']) d.push({ id: id++, c, v });
      }
    }
    for (let i = 0; i < 4; i++) { d.push({ id: id++, c: 'k', v: 'wild' }); d.push({ id: id++, c: 'k', v: 'w4' }); }
    return shuffle(d);
  }

  function newGame(score, starter = 0) {
    const deck = newDeck();
    const hands = [[], []];
    for (let i = 0; i < 7; i++) { hands[0].push(deck.pop()); hands[1].push(deck.pop()); }
    // İlk açılan kart sayı olsun
    let top;
    do { top = deck.pop(); if (!/^\d$/.test(top.v)) deck.unshift(top); } while (!/^\d$/.test(top.v));
    return { deck, discard: [top], color: top.c, hands, turn: starter, starter, drawn: null, uno: [false, false],
      unoPending: null, winner: null, score: score || [0, 0], msg: '' };
  }

  const top = (st) => st.discard[st.discard.length - 1];
  const playable = (st, card) => card.c === 'k' || card.c === st.color || card.v === top(st).v;

  function drawCards(st, s, n) {
    for (let i = 0; i < n; i++) {
      if (!st.deck.length) {
        const t = st.discard.pop();
        st.deck = shuffle(st.discard);
        st.discard = [t];
      }
      if (st.deck.length) st.hands[s].push(st.deck.pop());
    }
  }

  // ---------------- Arayüz ----------------
  let el, A;
  const G = () => A.S.uno;
  const save = (st) => A.set('uno', st);

  function cardEl(card, opts = {}) {
    if (!card) return h('div.uno.empty');
    if (opts.back) return h('div.uno.back', null, h('span.uno-oval', null, h('b', null, 'UNO')));
    const isNum = /^\d$/.test(card.v);
    const big = isNum ? card.v : (card.v === 'skip' ? ic('prohibit', 'fill') : card.v === 'rev' ? ic('arrows-counter-clockwise', 'fill') : card.v === 'wild' ? '' : LABEL[card.v]);
    const corner = isNum ? card.v : (card.v === 'skip' ? 'Ø' : card.v === 'rev' ? '⇄' : card.v === 'wild' ? 'J' : LABEL[card.v]);
    const el = h('div.uno.c-' + card.c + (opts.play ? '.play' : '') + (opts.dim ? '.dim' : '') + (opts.fresh ? '.fresh' : ''), {
      onclick: opts.onclick || null, role: opts.onclick ? 'button' : null,
      'aria-label': `${CNAME[card.c] || 'Siyah'} ${LABEL[card.v] || card.v}`,
    },
      h('span.uno-corner.tl', null, corner),
      h('span.uno-oval', null, card.c === 'k' ? h('span.uno-wheel') : null, h('b', null, big)),
      h('span.uno-corner.br', null, corner));
    return el;
  }

  function chooseColor(fn) {
    const bg = h('div.modal-bg');
    const close = () => bg.remove();
    bg.append(h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, h('div.core', null,
      h('h2', null, 'Renk seç'),
      h('div.uno-colors', null, COLORS.map((c) => h('button', {
        style: { background: CHEX[c], borderColor: CHEX[c] }, 'aria-label': CNAME[c],
        onclick: () => { close(); fn(c); },
      }, CNAME[c]))))));
    document.body.append(bg);
  }

  function render() {
    const st = G();
    el.innerHTML = '';
    const me = A.seat, op = 1 - me;
    const myTurn = st.turn === me && st.winner == null;
    turnPing('uno', myTurn);
    const t = top(st);

    let text;
    if (st.winner != null) text = `${A.nameOf(st.winner)} kazandı!`;
    else if (myTurn) text = st.drawn != null ? 'Çektiğin kartı oynayabilir ya da pas geçebilirsin' : 'Sıra sende: renk ya da sayı tut, ya da çek';
    else text = `${A.nameOf(st.turn)} oynuyor…`;

    const hand = st.hands[me];
    const canPlay = (card) => myTurn && (st.drawn == null ? playable(st, card) : card.id === st.drawn && playable(st, card));

    const btns = h('div.bar', { style: { justifyContent: 'center' } });
    if (myTurn && st.drawn == null) btns.append(h('button', { onclick: draw }, ic('hand-grabbing'), 'Kart çek'));
    if (myTurn && st.drawn != null) btns.append(h('button', { onclick: pass }, 'Pas'));
    if (hand.length === 2 && myTurn && !st.uno[me]) btns.append(h('button.pink', { onclick: callUno }, 'UNO!'));
    if (st.unoPending === op) btns.append(h('button.pink', { onclick: catchUno }, ic('hand-palm'), `Yakala! ${A.nameOf(op)} UNO demedi`));
    if (st.winner != null) btns.append(h('button.primary', { onclick: () => save(newGame(st.score, 1 - st.starter)) }, 'Yeni el'));

    el.append(h('div.game', null,
      h('div.shell', null, h('div.core.status', null,
        h('span' + (myTurn ? '.your-turn' : ''), null, text), h('span.spacer'),
        h('span.score', null, `Renk: `, h('b', { style: { color: CHEX[st.color] === '#ecd407' ? '#a68f00' : CHEX[st.color] } }, CNAME[st.color]),
          ` · Kart ${A.nameOf(0)} ${st.hands[0].length}, ${A.nameOf(1)} ${st.hands[1].length} · Skor ${st.score[0]}-${st.score[1]}`),
        statusMark(A, 'uno'),
        h('button', { 'aria-label': 'Baştan başla', title: 'Baştan başla',
          onclick: () => modal('Yeni el?', 'Mevcut el silinecek.', [['Evet', () => save(newGame(st.score)), 'pink'], ['Vazgeç']]) }, ic('arrow-clockwise')))),
      h('div.uno-table', null,
        h('div.who', null, `${A.nameOf(op)} · ${st.hands[op].length} kart`, st.uno[op] && st.hands[op].length === 1 ? h('b.uno-said', null, ' UNO!') : null),
        h('div.uno-opp', null, st.hands[op].map(() => cardEl({}, { back: true }))),
        st.msg ? h('div.hint-line', null, st.msg) : null,
        h('div.uno-mid', null,
          h('div', null, st.deck.length ? cardEl({}, { back: true }) : cardEl(null), h('div.pile-label', null, `Deste (${st.deck.length})`)),
          h('div.uno-pile', { style: { '--ring': CHEX[st.color] } }, cardEl(t, { fresh: true }), h('div.pile-label', null, t.c === 'k' ? `Seçilen renk: ${CNAME[st.color]}` : 'Atılan'))),
        btns,
        h('div.uno-hand', null, hand.map((card) => {
          const ok = canPlay(card);
          return cardEl(card, { play: ok, dim: myTurn && !ok, onclick: ok ? () => play(card.id) : null });
        })),
        h('div.who', null, `${A.name} · ${hand.length} kart`, st.uno[me] && hand.length <= 2 ? h('b.uno-said', null, ' UNO dedin') : null))));
  }

  function play(id) {
    const st = clone(G());
    const me = A.seat, op = 1 - me;
    const idx = st.hands[me].findIndex((c) => c.id === id);
    const card = st.hands[me][idx];
    if (!card || !playable(st, card)) return;
    const finish = (color) => {
      st.hands[me].splice(idx, 1);
      st.discard.push(card);
      st.color = card.c === 'k' ? color : card.c;
      st.drawn = null;
      // Rakibin UNO yakalama hakkı, ben oynayınca biter
      if (st.unoPending === op) st.unoPending = null;
      if (st.hands[me].length === 1 && !st.uno[me]) st.unoPending = me;
      if (st.hands[me].length !== 1) st.uno[me] = false;
      let again = false;
      st.msg = `${A.name} ${CNAME[card.c] || ''} ${LABEL[card.v] || card.v} attı`.replace('  ', ' ');
      if (card.v === 'skip' || card.v === 'rev') again = true;
      if (card.v === 'd2') { drawCards(st, op, 2); again = true; st.msg += `, ${A.nameOf(op)} 2 kart çekti`; }
      if (card.v === 'w4') { drawCards(st, op, 4); again = true; st.msg += `, ${A.nameOf(op)} 4 kart çekti`; }
      if (card.c === 'k') st.msg += ` (renk: ${CNAME[color]})`;
      if (!st.hands[me].length) {
        st.winner = me; st.score[me]++; st.unoPending = null;
        setTimeout(() => A.act({ t: 'heart' }), 300);
      } else if (!again) st.turn = op;
      save(st);
    };
    if (card.c === 'k') chooseColor(finish); else finish(null);
  }

  function draw() {
    const st = clone(G());
    const me = A.seat, op = 1 - me;
    if (st.unoPending === op) st.unoPending = null;
    drawCards(st, me, 1);
    st.uno[me] = false;
    const card = st.hands[me][st.hands[me].length - 1];
    if (card && playable(st, card)) { st.drawn = card.id; st.msg = `${A.name} bir kart çekti`; }
    else { st.drawn = null; st.turn = op; st.msg = `${A.name} kart çekti, sıra geçti`; }
    save(st);
  }

  function pass() {
    const st = clone(G());
    st.drawn = null; st.turn = 1 - A.seat; st.msg = `${A.name} pas geçti`;
    save(st);
  }

  function callUno() {
    const st = clone(G());
    st.uno[A.seat] = true;
    st.msg = `${A.name}: UNO!`;
    save(st);
  }

  function catchUno() {
    const st = clone(G());
    const op = 1 - A.seat;
    drawCards(st, op, 2);
    st.unoPending = null;
    st.msg = `${A.nameOf(op)} UNO demeyi unuttu, 2 kart çekti`;
    save(st);
  }

  Games.uno = {
    id: 'uno', title: 'UNO', icon: 'cards-three', desc: 'Renk ya da sayı tut, elini ilk bitiren kazanır',
    status(S, A) {
      const st = S.uno;
      if (!st) return { text: 'Yeni el, 7şer kart' };
      const denom = [`${st.hands[0].length}-${st.hands[1].length}`, 'KART'];
      if (st.winner != null) return { denom, text: `${A.nameOf(st.winner)} kazandı` };
      const mine = st.turn === A.seat;
      return { mine, denom, text: mine ? 'Kartını at' : `${A.nameOf(st.turn)} oynuyor` };
    },
    keys: ['uno'],
    mount(e, app) {
      el = e; A = app;
      if (!A.S.uno) A.set('uno', newGame()); else render();
    },
    render() { if (el) render(); },
    unmount() { el = null; },
  };
})();

// Trash (Garbage) kart oyunu.
// Herkesin önünde kapalı 10 kart (A..10 yuvaları). Çektiğin kartı kendi yuvasına koy, altından çıkan kartla devam et.
// Papaz (K) joker: her kapalı yuvaya konabilir. Vale/Kız ve işe yaramayan kartlar atılır, sıra geçer.
// Eli ilk bitiren sonraki elde bir kart eksik alır; 1 kartlık eli bitiren oyunu kazanır.
(() => {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  const label = (c) => (RL[c.r] || c.r);
  const red = (c) => c.s === '♥' || c.s === '♦';

  function newDeck() {
    const d = [];
    for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ r, s });
    return shuffle(d);
  }
  function newRound(counts, starter, score) {
    const deck = newDeck();
    const slots = [0, 1].map((p) => Array.from({ length: counts[p] }, () => ({ card: deck.pop(), up: false })));
    return { deck, discard: [deck.pop()], slots, counts, turn: starter, starter, held: null,
      phase: 'draw', msg: '', winner: null, score: score || [0, 0] };
  }

  function targets(st, s, card) {
    if (!card) return [];
    const slots = st.slots[s];
    if (card.r === 13) return slots.map((x, i) => (x.up ? -1 : i)).filter((i) => i >= 0);
    if (card.r > slots.length) return [];
    const x = slots[card.r - 1];
    if (!x.up || x.card.r === 13) return [card.r - 1];
    return [];
  }

  // ---------------- Arayüz ----------------
  let el, A;
  const G = () => A.S.trash;
  const save = (st) => A.set('trash', st);

  // Yeni açılan kartlar bir kez dönerek açılsın
  let prevUp = null, prevHeld = null;

  function cardEl(c, opts = {}) {
    if (!c) return h('div.card.empty');
    const role = opts.onclick ? 'button' : null;
    if (opts.back) return h('div.card.back', { onclick: opts.onclick, role }, opts.slotNo ? h('div.slot-no', null, opts.slotNo) : null);
    return h('div.card' + (red(c) ? '.red' : '') + (opts.target ? '.target' : '') + (opts.flip ? '.flip' : ''), { onclick: opts.onclick, role },
      h('div', null, label(c)), h('div.c-suit', null, c.s),
      opts.slotNo ? h('div.slot-no', null, opts.slotNo) : null);
  }

  function slotsEl(st, s, tset, small) {
    return h('div.slots' + (small ? '.small' : ''),  null,
      st.slots[s].map((x, i) => {
        const no = RL[i + 1] || i + 1;
        const onclick = tset && tset.has(i) ? () => place(i) : null;
        if (!x.up) {
          const b = cardEl(x.card, { back: true, slotNo: no, onclick });
          if (onclick) b.classList.add('target');
          return b;
        }
        const flip = prevUp && prevUp[s] && prevUp[s].length === st.slots[s].length && !prevUp[s][i];
        return cardEl(x.card, { slotNo: no, target: !!onclick, onclick, flip });
      }));
  }

  function render() {
    const st = G();
    el.innerHTML = '';
    const me = A.seat, op = 1 - me;
    const myTurn = st.turn === me && (st.phase === 'draw' || st.phase === 'place');
    const tset = new Set(myTurn && st.phase === 'place' ? targets(st, me, st.held) : []);
    const top = st.discard[st.discard.length - 1];
    const canTakeDiscard = myTurn && st.phase === 'draw' && targets(st, me, top).length > 0;

    let text;
    if (st.phase === 'over') text = `${A.nameOf(st.winner)} oyunu kazandı!`;
    else if (st.phase === 'roundOver') text = `${A.nameOf(st.winner)} eli bitirdi! Sonraki elde ${st.counts[st.winner]} kart.`;
    else if (myTurn) text = st.phase === 'draw' ? 'Sıra sende, desteden çek' + (canTakeDiscard ? ' ya da yerdekini al' : '') :
      (tset.size ? 'Kartı yerleştir (yeşil çerçeveli yuvalar)' : 'Bu kart işe yaramıyor, at');
    else text = `${A.nameOf(st.turn)} oynuyor…`;
    turnPing('trash', myTurn);

    const deckEl = h('div', null,
      st.deck.length ? cardEl({}, { back: true, onclick: myTurn && st.phase === 'draw' ? draw : null }) : cardEl(null),
      h('div.pile-label', null, `Deste (${st.deck.length})`));
    const discEl = h('div', null,
      cardEl(top, { target: canTakeDiscard, onclick: canTakeDiscard ? takeDiscard : null }),
      h('div.pile-label', null, 'Yer'));
    const heldKey = st.held ? label(st.held) + st.held.s : null;
    const heldEl = h('div', null,
      st.held ? cardEl(st.held, { flip: heldKey !== prevHeld }) : cardEl(null),
      h('div.pile-label', null, st.turn === me ? 'Elindeki' : `${A.nameOf(st.turn)} elinde`));

    const btns = h('div.bar', { style: { justifyContent: 'center' } });
    if (myTurn && st.phase === 'draw') {
      btns.append(h('button.primary', { onclick: draw }, ic('cards'), 'Desteden çek'));
      if (canTakeDiscard) btns.append(h('button', { onclick: takeDiscard }, 'Yerdekini al'));
    }
    if (myTurn && st.phase === 'place' && !tset.size) btns.append(h('button.pink', { onclick: discard }, ic('trash'), 'At, sıra geçsin'));
    if (st.phase === 'roundOver') btns.append(h('button.primary', { onclick: nextRound }, 'Sonraki el'));
    if (st.phase === 'over') btns.append(h('button.primary', { onclick: () => save(newRound([10, 10], 1 - st.starter, st.score)) }, 'Yeni oyun'));

    el.append(h('div.game', null,
      h('div.shell', null, h('div.core.status', null, h('span' + (myTurn ? '.your-turn' : ''), null, text), h('span.spacer'),
        h('span.score', null, `Kart: ${A.nameOf(0)} ${st.counts[0]}, ${A.nameOf(1)} ${st.counts[1]} · Skor ${st.score[0]}-${st.score[1]}`),
        statusMark(A, 'trash'),
        h('button', { 'aria-label': 'Baştan başla', title: 'Baştan başla',
          onclick: () => modal('Yeni oyun?', 'Mevcut oyun silinecek.', [['Evet', () => save(newRound([10, 10], 0, st.score)), 'pink'], ['Vazgeç']]) }, ic('arrow-clockwise')))),
      h('div.shell', null, h('div.core.trash-area', null,
        h('div.who', null, A.nameOf(op)),
        slotsEl(st, op, null, true),
        st.msg ? h('div.hint-line', null, st.msg) : null,
        h('div.table-mid', null, deckEl, discEl, heldEl),
        btns,
        slotsEl(st, me, tset, false),
        h('div.hint-line', null, 'K joker, J ve Q sırayı bitirir.')))));

    prevUp = [0, 1].map((p) => st.slots[p].map((x) => x.up));
    prevHeld = heldKey;
  }

  function draw() {
    const st = clone(G());
    if (!st.deck.length) {
      const top = st.discard.pop();
      st.deck = shuffle(st.discard);
      st.discard = [top];
    }
    st.held = st.deck.pop();
    st.phase = 'place';
    st.msg = `${A.name} desteden ${label(st.held)}${st.held.s} çekti`;
    save(st);
  }

  function takeDiscard() {
    const st = clone(G());
    st.held = st.discard.pop();
    st.phase = 'place';
    st.msg = `${A.name} yerden ${label(st.held)}${st.held.s} aldı`;
    save(st);
  }

  function place(i) {
    const st = clone(G());
    const me = A.seat;
    const slot = st.slots[me][i];
    const prev = slot.card;
    st.slots[me][i] = { card: st.held, up: true };
    st.held = prev;
    st.msg = `${A.name} ${label(st.slots[me][i].card)}${st.slots[me][i].card.s} yerleştirdi, altından ${label(prev)}${prev.s} çıktı`;
    if (st.slots[me].every((x) => x.up)) {
      st.discard.push(st.held);
      st.held = null;
      st.winner = me;
      if (st.counts[me] === 1) { st.phase = 'over'; st.score[me]++; setTimeout(() => A.act({ t: 'heart' }), 300); }
      else { st.phase = 'roundOver'; st.counts = st.counts.slice(); st.counts[me]--; }
    }
    save(st);
  }

  function discard() {
    const st = clone(G());
    st.discard.push(st.held);
    st.msg = `${A.name} ${label(st.held)}${st.held.s} attı`;
    st.held = null;
    st.turn = 1 - st.turn;
    st.phase = 'draw';
    save(st);
  }

  function nextRound() {
    const st = G();
    save(newRound(st.counts, 1 - st.starter, st.score));
  }

  Games.trash = {
    id: 'trash', title: 'Trash', icon: 'cards', desc: 'Kartlarını sırayla aç, ilk bitiren kazanır',
    status(S, A) {
      const st = S.trash;
      if (!st) return { text: "Yeni oyun, 10ar kart" };
      if (st.phase === "over") return { text: `${A.nameOf(st.winner)} kazandı` };
      const mine = st.turn === A.seat && (st.phase === "draw" || st.phase === "place");
      const denom = [`${st.counts[0]}-${st.counts[1]}`, 'KART'];
      return { mine, denom, text: mine ? (st.phase === 'draw' ? 'Kart çek' : 'Kartını yerleştir') : `${A.nameOf(st.turn)} oynuyor` };
    },
    keys: ['trash'],
    mount(e, app) {
      el = e; A = app;
      if (!A.S.trash) A.set('trash', newRound([10, 10], 0)); else render();
    },
    render() { if (el) render(); },
    unmount() { el = null; },
  };
})();

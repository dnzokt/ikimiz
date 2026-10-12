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
      unoPending: null, winner: null, score: score || [0, 0], msg: '',
      dealAt: Date.now(), shuffles: 0 }; // dağıtma ve karıştırma animasyonları için
  }

  const top = (st) => st.discard[st.discard.length - 1];
  const playable = (st, card) => card.c === 'k' || card.c === st.color || card.v === top(st).v;

  function drawCards(st, s, n) {
    for (let i = 0; i < n; i++) {
      if (!st.deck.length) {
        const t = st.discard.pop();
        st.deck = shuffle(st.discard);
        st.discard = [t];
        st.shuffles = (st.shuffles || 0) + 1;
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
      onclick: opts.onclick || null, role: opts.onclick ? 'button' : null, 'data-id': opts.id != null ? opts.id : null,
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
    const rects = capture(); // animasyon için kartların eski konumları
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
          h('div.uno-deck', null, st.deck.length ? cardEl({}, { back: true }) : cardEl(null), h('div.pile-label', null, `Deste (${st.deck.length})`)),
          h('div.uno-pile', { style: { '--ring': CHEX[st.color] } }, cardEl(t, { fresh: true }), h('div.pile-label', null, t.c === 'k' ? `Seçilen renk: ${CNAME[st.color]}` : 'Atılan'))),
        btns,
        h('div.uno-hand', null, hand.map((card) => {
          const ok = canPlay(card);
          return cardEl(card, { id: card.id, play: ok, dim: myTurn && !ok, onclick: ok ? () => play(card.id) : null });
        })),
        h('div.who', null, `${A.name} · ${hand.length} kart`, st.uno[me] && hand.length <= 2 ? h('b.uno-said', null, ' UNO dedin') : null))));
    animate(st, rects);
  }

  // ---------------- Animasyonlar ----------------
  // Her çizimden önce kartların ekrandaki yerleri ölçülür; yeni durumla eskisi karşılaştırılır ve
  // değişen kartlar eski yerlerinden yeni yerlerine uçurulur (dağıtma, atma, çekme, karıştırma).
  let prev = null;
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function capture() {
    if (!el || !el.querySelector('.uno-table')) return null;
    const r = { cards: {} };
    const q = (s) => el.querySelector(s);
    r.deck = q('.uno-deck .uno') && q('.uno-deck .uno').getBoundingClientRect();
    r.pile = q('.uno-pile .uno') && q('.uno-pile .uno').getBoundingClientRect();
    r.opp = q('.uno-opp') && q('.uno-opp').getBoundingClientRect();
    el.querySelectorAll('.uno-hand .uno[data-id]').forEach((c) => { r.cards[c.dataset.id] = c.getBoundingClientRect(); });
    return r;
  }

  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width });

  // Bir kartı from konumundan bulunduğu yere uçur; istenirse yolda ters kapakla gelip açılır
  function fly(node, from, { delay = 0, dur = 560, rot = 0, cover = false } = {}) {
    if (!node || !from) return;
    const to = center(node.getBoundingClientRect());
    const f = from.x != null ? from : center(from);
    const dx = f.x - to.x, dy = f.y - to.y, s = f.w / to.w;
    node.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${rot}deg)`, zIndex: 5 },
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', zIndex: 5 },
    ], { duration: dur, delay, easing: EASE, fill: 'backwards' });
    if (cover) {
      const c = h('span.uno-cover', null, h('span.uno-oval', null, h('b', null, 'UNO')));
      node.append(c);
      c.animate([{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: 0 }], { duration: dur + 160, delay, fill: 'both' })
        .finished.then(() => c.remove()).catch(() => c.remove());
    }
  }

  // Deste karıştırma: iki yarı ayrılıp üç kez birbirine geçer
  function shuffleAnim(deckEl, delay = 0) {
    if (!deckEl) return 0;
    const r = deckEl.getBoundingClientRect();
    const halves = [-1, 1].map((side) => {
      const c = cardEl({}, { back: true });
      Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', margin: 0, zIndex: 30, pointerEvents: 'none' });
      document.body.append(c);
      const k = [];
      for (let i = 0; i < 3; i++) {
        k.push({ transform: 'translate(0,0) rotate(0deg)' });
        k.push({ transform: `translate(${side * r.width * 0.62}px, ${-6}px) rotate(${side * 9}deg)` });
      }
      k.push({ transform: 'translate(0,0) rotate(0deg)' });
      c.animate(k, { duration: 900, delay: delay + (side > 0 ? 70 : 0), easing: 'ease-in-out', fill: 'both' })
        .finished.then(() => c.remove()).catch(() => c.remove());
      return c;
    });
    return 1000 + delay + halves.length * 0;
  }

  // Ekranın ortasında büyük "UNO!" patlaması
  function unoPop(name) {
    const p = h('div.uno-pop', null, h('b', null, 'UNO!'), h('span', null, name));
    document.body.append(p);
    p.animate([
      { transform: 'translate(-50%, -50%) scale(.3) rotate(-18deg)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1.15) rotate(-6deg)', opacity: 1, offset: .35 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(-6deg)', opacity: 1, offset: .75 },
      { transform: 'translate(-50%, -60%) scale(1) rotate(-6deg)', opacity: 0 },
    ], { duration: 1500, easing: EASE }).finished.then(() => p.remove()).catch(() => p.remove());
  }

  function animate(st, rects) {
    const me = A.seat, op = 1 - me;
    const snap = { deal: st.dealAt, top: top(st).id, mine: st.hands[me].map((c) => c.id), opp: st.hands[op].length,
      shuffles: st.shuffles || 0, uno: st.uno.slice() };
    const p = prev;
    prev = snap;
    if (reduced()) return;
    const deckEl = el.querySelector('.uno-deck .uno');
    const pileEl = el.querySelector('.uno-pile .uno');
    const handEls = [...el.querySelectorAll('.uno-hand .uno')];
    const oppEls = [...el.querySelectorAll('.uno-opp .uno')];
    const deckFrom = deckEl ? center(deckEl.getBoundingClientRect()) : null;

    // Yeni el: karıştır, sonra bir sana bir ona dağıt, en son ortadaki kartı aç
    const freshDeal = p ? p.deal !== st.dealAt : st.dealAt && Date.now() - st.dealAt < 3000;
    if (freshDeal) {
      const start = shuffleAnim(deckEl);
      const n = Math.max(handEls.length, oppEls.length);
      let k = 0;
      for (let i = 0; i < n; i++) {
        if (oppEls[i]) fly(oppEls[i], deckFrom, { delay: start + k++ * 95, dur: 480, rot: 12 });
        if (handEls[i]) fly(handEls[i], deckFrom, { delay: start + k++ * 95, dur: 520, rot: -10, cover: true });
      }
      fly(pileEl, deckFrom, { delay: start + k * 95 + 120, dur: 620, rot: 24, cover: true });
      return;
    }
    if (!p) return;

    // Deste bitip atılanlar yeniden karıldı
    let after = 0;
    if (snap.shuffles > p.shuffles) after = shuffleAnim(deckEl);

    // Kart atıldı: benim elimden ya da rakibin elinden ortaya uçar
    if (snap.top !== p.top && pileEl) {
      const from = rects && rects.cards[snap.top];
      if (from) fly(pileEl, from, { dur: 520, rot: -14 });
      else if (rects && rects.opp) fly(pileEl, rects.opp, { dur: 560, rot: 16, cover: true });
    }

    // Bana gelen yeni kartlar desteden uçup açılır
    const newMine = handEls.filter((n) => !p.mine.includes(Number(n.dataset.id)));
    newMine.forEach((n, i) => fly(n, deckFrom, { delay: after + 120 + i * 140, dur: 560, rot: -8, cover: true }));

    // Rakibe giden yeni kartlar (çekme, +2, +4)
    const extra = snap.opp - p.opp;
    if (extra > 0) oppEls.slice(-extra).forEach((n, i) => fly(n, deckFrom, { delay: after + 120 + i * 140, dur: 480, rot: 10 }));

    // UNO dendi
    [0, 1].forEach((s) => { if (snap.uno[s] && !p.uno[s]) unoPop(A.nameOf(s)); });
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
    unmount() { el = null; prev = null; },
  };
})();

// Son Fişek: iki kişilik şans ve cesaret oyunu. Tüfeğe dolu ve boş fişekler karışık sırayla dizilir.
// Sıran gelince ya rakibine ya kendine ateş edersin; kendine boş sıkarsan sıra sende kalır.
// Eşyalar sırayı bitirmez. Canı önce biten kaybeder.
(() => {
  const ITEMS = {
    lup: { name: 'Büyüteç', desc: 'Sıradaki fişeğe gizlice bak', sfx: 'peek',
      svg: '<circle cx="20" cy="20" r="11" fill="rgba(170,210,255,.35)" stroke="#c9a24a" stroke-width="4"/><path d="M28 28l12 12" stroke="#5b3a22" stroke-width="6" stroke-linecap="round"/><path d="M14 17a7 7 0 0 1 6-6" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>' },
    bira: { name: 'Bira', desc: 'Sıradaki fişeği at, ikiniz de görürsünüz', sfx: 'beer',
      svg: '<rect x="14" y="8" width="20" height="32" rx="4" fill="#2f6e3a"/><rect x="14" y="8" width="20" height="4" rx="2" fill="#c9cfd6"/><rect x="14" y="36" width="20" height="4" rx="2" fill="#c9cfd6"/><rect x="16" y="18" width="16" height="10" fill="#e8c24a"/><path d="M19 13v22" stroke="#fff" opacity=".25" stroke-width="2"/>' },
    testere: { name: 'Testere', desc: 'Namluyu kes: sonraki atış 2 hasar', sfx: 'saw',
      svg: '<path d="M4 32 32 16l5 9-29 15Z" fill="#c9cfd6" stroke="#7d8894"/><path d="M8 40l2-4 2 3 2-4 2 3 2-4 2 3 2-4 2 3 2-4 2 3 2-4" fill="none" stroke="#7d8894" stroke-width="1.3"/><path d="M32 12h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-4l-7-13Z" fill="#8a5a3c"/><circle cx="39" cy="19" r="3" fill="#2b1a10"/>' },
    kelepce: { name: 'Kelepçe', desc: 'Rakip bir sonraki sırasını kaçırır', sfx: 'cuff',
      svg: '<circle cx="15" cy="29" r="9" fill="none" stroke="#b8c0c8" stroke-width="4"/><circle cx="33" cy="29" r="9" fill="none" stroke="#b8c0c8" stroke-width="4"/><path d="M19 18h10" stroke="#8a929c" stroke-width="3"/><rect x="10" y="15" width="9" height="6" rx="1.5" fill="#8a929c"/><rect x="29" y="15" width="9" height="6" rx="1.5" fill="#8a929c"/>' },
    sigara: { name: 'Sigara', desc: '1 can geri kazan', sfx: 'lighter',
      svg: '<rect x="12" y="14" width="24" height="28" rx="2" fill="#f2efe6"/><rect x="12" y="14" width="24" height="9" fill="#b3262a"/><rect x="15" y="5" width="5" height="11" fill="#f2efe6"/><rect x="15" y="5" width="5" height="3" fill="#d9a35a"/><rect x="22" y="8" width="5" height="8" fill="#f2efe6"/><rect x="22" y="8" width="5" height="3" fill="#d9a35a"/><path d="M16 32h16" stroke="#c9c2b0" stroke-width="2"/>' },
  };
  const KINDS = Object.keys(ITEMS);
  const itemSvg = (k) => `<svg viewBox="0 0 48 48" aria-hidden="true">${ITEMS[k].svg}</svg>`;
  const shellSvg = (live) => `<svg viewBox="0 0 20 48" aria-hidden="true">
    <defs><linearGradient id="fs-b${live}" x1="0" x2="1"><stop offset="0" stop-color="${live ? '#7d1414' : '#1d3d78'}"/><stop offset=".45" stop-color="${live ? '#d23a2e' : '#3f74c9'}"/><stop offset="1" stop-color="${live ? '#6a1010' : '#173266'}"/></linearGradient>
    <linearGradient id="fs-br" x1="0" x2="1"><stop offset="0" stop-color="#8a6420"/><stop offset=".45" stop-color="#f0c868"/><stop offset="1" stop-color="#7a5418"/></linearGradient></defs>
    <rect x="2" y="2" width="16" height="34" rx="3" fill="url(#fs-b${live})"/><path d="M4 8h12M4 30h12" stroke="rgba(0,0,0,.25)"/>
    <rect x="1" y="34" width="18" height="13" rx="2" fill="url(#fs-br)"/><path d="M1 38h18" stroke="rgba(0,0,0,.25)"/></svg>`;
  const BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-2 8 9-12h-7Z"/></svg>';
  const GUN = `<svg viewBox="0 0 320 70" aria-hidden="true">
    <defs>
      <linearGradient id="fs-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b6236"/><stop offset=".5" stop-color="#6e3f1e"/><stop offset="1" stop-color="#4a2812"/></linearGradient>
      <linearGradient id="fs-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d747c"/><stop offset=".35" stop-color="#c3c9cf"/><stop offset=".6" stop-color="#4b5158"/><stop offset="1" stop-color="#22262b"/></linearGradient>
      <linearGradient id="fs-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#454b52"/><stop offset="1" stop-color="#16191c"/></linearGradient>
    </defs>
    <path d="M4 38 C10 30 40 26 92 24 L104 24 L104 46 L92 46 C70 48 36 56 12 62 C4 64 0 58 4 38Z" fill="url(#fs-wood)" stroke="#2b170a" stroke-width="1.5"/>
    <path d="M14 44 C30 40 60 36 92 34" stroke="rgba(255,220,180,.18)" stroke-width="2" fill="none"/>
    <path d="M100 20 H166 V44 H100Z" fill="url(#fs-dark)" stroke="#0e1012" stroke-width="1.5"/>
    <path d="M118 44 q6 14 18 12 q6-1 6-12" fill="none" stroke="#2a2e33" stroke-width="3"/>
    <path d="M128 44 v8" stroke="#1a1d20" stroke-width="3"/>
    <rect x="106" y="24" width="20" height="5" rx="1" fill="#0c0e10"/>
    <g class="fs-barrel">
      <rect x="164" y="20" width="150" height="11" rx="2" fill="url(#fs-steel)" stroke="#16191c"/>
      <rect x="164" y="32" width="112" height="8" rx="2" fill="url(#fs-dark)" stroke="#0e1012"/>
      <rect x="186" y="29" width="52" height="15" rx="4" fill="url(#fs-wood)" stroke="#2b170a"/>
      <path d="M192 31v11M200 31v11M208 31v11M216 31v11M224 31v11M232 31v11" stroke="rgba(0,0,0,.35)"/>
      <rect x="308" y="18" width="6" height="15" rx="1" fill="#2a2e33"/>
    </g>
  </svg>`;
  const FIGURE = (col) => `<svg viewBox="0 0 220 150" aria-hidden="true">
    <defs><filter id="fs-glow"><feGaussianBlur stdDeviation="3"/></filter>
    <radialGradient id="fs-body" cx=".5" cy=".2" r=".9"><stop offset="0" stop-color="#1c2030"/><stop offset="1" stop-color="#07080d"/></radialGradient></defs>
    <path d="M20 150 C24 108 56 92 84 88 L136 88 C164 92 196 108 200 150Z" fill="none" stroke="${col}" stroke-width="5" filter="url(#fs-glow)" opacity=".8"/>
    <circle cx="110" cy="52" r="34" fill="none" stroke="${col}" stroke-width="5" filter="url(#fs-glow)" opacity=".8"/>
    <path d="M20 150 C24 108 56 92 84 88 L136 88 C164 92 196 108 200 150Z" fill="url(#fs-body)"/>
    <circle cx="110" cy="52" r="34" fill="url(#fs-body)"/>
    <ellipse cx="98" cy="54" rx="4" ry="2.4" fill="#e9e2cf" opacity=".85"/><ellipse cx="122" cy="54" rx="4" ry="2.4" fill="#e9e2cf" opacity=".85"/>
  </svg>`;

  const rid = () => Math.random().toString(36).slice(2, 9);
  const pickItem = () => KINDS[Math.floor(Math.random() * KINDS.length)];

  function reload(st) {
    const n = 2 + Math.floor(Math.random() * 7);
    const live = Math.max(1, Math.min(n - 1, Math.round(n * (0.35 + Math.random() * 0.3))));
    st.shells = shuffle([...Array(live).fill(1), ...Array(n - live).fill(0)]);
    st.load = { id: rid(), live, blank: n - live };
    for (const s of [0, 1]) for (let i = 0; i < 2 && st.items[s].length < 8; i++) st.items[s].push(pickItem());
  }
  function newGame(score) {
    const max = 3 + Math.floor(Math.random() * 3);
    const st = { hp: [max, max], max, shells: [], load: null, items: [[], []], saw: false, cuffed: [false, false],
      turn: Math.random() < 0.5 ? 0 : 1, ev: null, winner: null, score: score || [0, 0] };
    reload(st);
    return st;
  }
  // Sıra karşıya geçer; karşı taraf kelepçeliyse bir kez atlanır
  function passTurn(st, from) {
    const to = 1 - from;
    if (st.cuffed[to]) { st.cuffed[to] = false; st.turn = from; } else st.turn = to;
  }

  // ---------------- Arayüz ----------------
  let el, A, room, statusBox, oppBox, meBox, oppItems, myItems, hud, tray, gunWrap, gunInner, logBox, over, actBox, center;
  let queue = Promise.resolve(), busy = 0, seenEv = null, seenLoad = null, shownHp = null, peek = null, alive = 0;
  const G = () => A.S.fisek;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const canAct = () => { const st = G(); return st && st.turn === A.seat && st.winner == null && !busy; };
  const nm = (s) => (s === A.seat ? 'Sen' : A.nameOf(s));

  function enqueue(fn) {
    busy++;
    const gen = alive;
    queue = queue.then(() => (gen === alive && el ? fn() : null)).catch((e) => console.error(e)).then(() => { if (gen === alive) { busy--; update(); } });
    update();
  }

  function shoot(target) {
    if (!canAct()) return;
    const st = clone(G()), s = A.seat;
    const live = st.shells.shift();
    const dmg = live ? (st.saw ? 2 : 1) : 0;
    st.saw = false;
    st.hp[target] = Math.max(0, st.hp[target] - dmg);
    st.ev = { id: rid(), type: 'shot', by: s, target, live, dmg };
    if (st.hp[target] === 0) { st.winner = 1 - target; st.score[st.winner]++; }
    else {
      if (!(target === s && !live)) passTurn(st, s);
      if (!st.shells.length) reload(st);
    }
    A.set('fisek', st);
  }
  function useItem(i) {
    if (!canAct()) return;
    const st = clone(G()), s = A.seat, o = 1 - s, kind = st.items[s][i];
    if (kind === 'testere' && st.saw) return toast('Namlu zaten kesik');
    if (kind === 'kelepce' && st.cuffed[o]) return toast('Rakip zaten kelepçeli');
    if (kind === 'sigara' && st.hp[s] >= st.max) return toast('Canın zaten tam');
    st.items[s].splice(i, 1);
    const ev = { id: rid(), type: 'item', item: kind, by: s };
    if (kind === 'lup') ev.peek = st.shells[0];
    if (kind === 'bira') { ev.shell = st.shells.shift(); if (!st.shells.length) reload(st); }
    if (kind === 'testere') st.saw = true;
    if (kind === 'kelepce') st.cuffed[o] = true;
    if (kind === 'sigara') st.hp[s]++;
    st.ev = ev;
    A.set('fisek', st);
  }

  // ---------- Canlandırmalar ----------
  function say(t) { logBox.textContent = t; logBox.classList.remove('pop'); void logBox.offsetWidth; logBox.classList.add('pop'); }
  function announce(html, cls, ms = 1300) {
    const n = h('div.fs-ann.' + cls, { html });
    over.append(n);
    setTimeout(() => n.remove(), ms);
  }
  function floatOn(seat, text) {
    const box = seat === A.seat ? meBox : oppBox;
    const f = h('div.fs-float', null, text);
    box.append(f);
    setTimeout(() => f.remove(), 1500);
  }
  function eject(live) {
    const s = h('div.fs-casing', { html: shellSvg(live ? 1 : 0) });
    center.append(s);
    const dx = (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 80);
    s.animate([
      { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% - 110px)) rotate(${dx * 2}deg)`, opacity: 1, offset: 0.4 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + 70px)) rotate(${dx * 5}deg)`, opacity: 0.9 },
    ], { duration: 900, easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'forwards' });
    setTimeout(() => Ses.sfx('shell'), 650);
    setTimeout(() => s.remove(), 2400);
  }

  async function playEv(ev) {
    const me = A.seat;
    if (ev.type === 'shot') {
      const st = G();
      shownHp = st.hp.slice(); shownHp[ev.target] = Math.min(st.max, shownHp[ev.target] + ev.dmg);
      update();
      const selfShot = ev.target === ev.by;
      say(ev.by === me
        ? (selfShot ? 'Namluyu kendine doğrulttun…' : `Namluyu ${A.nameOf(ev.target)} tarafına doğrulttun…`)
        : (selfShot ? `${A.nameOf(ev.by)} namluyu kendine doğrulttu…` : `${A.nameOf(ev.by)} namluyu sana doğrulttu…`));
      gunWrap.className = 'fs-gun ' + (ev.target === me ? 'down' : 'up');
      Ses.sfx('rack');
      await wait(1300);
      if (ev.live) {
        Ses.sfx('shot');
        gunInner.classList.add('fire');
        room.classList.add('shake');
        if (ev.target === me) room.classList.add('hurt');
        setTimeout(() => { gunInner.classList.remove('fire'); room.classList.remove('shake', 'hurt'); }, 650);
        shownHp = null; update();
        floatOn(ev.target, '-' + ev.dmg);
        announce('DOLU', 'live');
        say(ev.target === me ? `DOLU! ${ev.dmg} can kaybettin.` : `DOLU! ${A.nameOf(ev.target)} ${ev.dmg} can kaybetti.`);
      } else {
        Ses.sfx('click');
        shownHp = null; update();
        announce('BOŞ', 'blank');
        say(selfShot ? `Boş çıktı. Sıra yine ${ev.by === me ? 'sende' : A.nameOf(ev.by) + "'de"}.` : 'Boş çıktı. Klik.');
      }
      await wait(650);
      eject(ev.live);
      await wait(700);
      gunWrap.className = 'fs-gun';
      await wait(500);
      if (G().winner != null && G().ev && G().ev.id === ev.id) Ses.sfx(G().winner === me ? 'win' : 'lose');
      return;
    }
    // Eşya
    const it = ITEMS[ev.item], who = ev.by === me ? 'Sen' : A.nameOf(ev.by), o = 1 - ev.by;
    Ses.sfx(it.sfx);
    if (ev.item === 'sigara') { const st = G(); shownHp = st.hp.slice(); shownHp[ev.by] = Math.max(0, shownHp[ev.by] - 1); update(); }
    let text;
    if (ev.item === 'lup') {
      if (ev.by === me) {
        const st = G();
        peek = { load: st.load.id, left: st.shells.length, live: ev.peek };
        text = `Sıradaki fişek: <b class="${ev.peek ? 'live' : 'blank'}">${ev.peek ? 'DOLU' : 'BOŞ'}</b>`;
      } else text = `${who} büyüteçle sıradaki fişeğe baktı.`;
    } else if (ev.item === 'bira') {
      text = `${who} birayı içti. Atılan fişek: <b class="${ev.shell ? 'live' : 'blank'}">${ev.shell ? 'DOLU' : 'BOŞ'}</b>`;
      setTimeout(() => eject(ev.shell), 500);
    } else if (ev.item === 'testere') text = `${who} namluyu kesti. Sonraki atış <b class="live">2 hasar</b>.`;
    else if (ev.item === 'kelepce') text = `${who} ${o === me ? 'seni' : A.nameOf(o) + "'i"} kelepçeledi. Bir tur pas!`;
    else text = `${who} bir sigara yaktı. <b class="heal">+1 can</b>`;
    announce(`<div class="fs-ann-item">${itemSvg(ev.item)}</div><div>${text}</div>`, 'item', 1900);
    say(text.replace(/<[^>]+>/g, ''));
    await wait(ev.item === 'sigara' ? 700 : 400);
    if (ev.item === 'sigara') { shownHp = null; update(); floatOn(ev.by, '+1'); Ses.sfx('heal'); }
    await wait(1200);
  }

  async function playLoad(load) {
    const shells = [...Array(load.live).fill(1), ...Array(load.blank).fill(0)];
    say(`Tüfek dolduruluyor: ${load.live} dolu, ${load.blank} boş.`);
    tray.innerHTML = '';
    const row = h('div.fs-tray-row', null, shells.map((l, i) => h('div.fs-shell', { html: shellSvg(l), style: { animationDelay: i * 90 + 'ms' } })));
    tray.append(h('div.fs-tray-label', null, h('b.live', null, `${load.live} DOLU`), ' · ', h('b.blank', null, `${load.blank} BOŞ`)), row);
    tray.classList.add('show');
    shells.forEach((_, i) => setTimeout(() => Ses.sfx('insert'), 200 + i * 90));
    await wait(2600);
    const gc = gunWrap.getBoundingClientRect(), gx = gc.left + gc.width / 2, gy = gc.top + gc.height / 2;
    [...row.children].forEach((e, i) => {
      const r = e.getBoundingClientRect();
      e.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${gx - (r.left + r.width / 2)}px, ${gy - (r.top + r.height / 2)}px) scale(.3)`, opacity: 0 }],
        { duration: 380, delay: i * 120, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => Ses.sfx('insert'), i * 120 + 330);
    });
    await wait(shells.length * 120 + 500);
    Ses.sfx('rack');
    tray.classList.remove('show');
    await wait(350);
    tray.innerHTML = '';
  }

  // ---------- Çizim ----------
  function seat(box, s, hp, mine) {
    const st = G();
    box.innerHTML = '';
    box.classList.toggle('turn', st.turn === s && st.winner == null);
    if (!mine) box.append(h('div.fs-figure', { html: FIGURE(getComputedStyle(document.documentElement).getPropertyValue('--p' + s).trim() || '#c23b2a') }));
    box.append(h('div.fs-plate', { style: { '--ink': `var(--p${s})` } },
      h('b', null, mine ? `${A.nameOf(s)} (sen)` : A.nameOf(s)),
      h('div.fs-lives', { 'aria-label': `${hp} can` }, Array.from({ length: st.max }, (_, i) => h('span.fs-cell' + (i < hp ? '.on' : ''), { html: BOLT }))),
      st.cuffed[s] ? h('span.fs-cuffed', { title: 'Kelepçeli: bir sonraki sırasını kaçırır', html: itemSvg('kelepce') }) : null));
  }
  function items(box, list, mine, can) {
    box.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const k = list[i];
      if (!k) { box.append(h('div.fs-slot')); continue; }
      const it = ITEMS[k];
      box.append(h((mine ? 'button' : 'div') + '.fs-slot.full', {
        html: itemSvg(k), title: `${it.name}: ${it.desc}`, 'aria-label': `${it.name}: ${it.desc}`,
        disabled: mine ? !can : null, onclick: mine ? () => useItem(i) : null,
      }));
    }
  }

  function update() {
    if (!el) return;
    const st = G();
    if (!st) return;
    const me = A.seat, op = A.other, hp = shownHp || st.hp, can = canAct();
    turnPing('fisek', st.turn === me && st.winner == null);

    let text;
    if (st.winner != null && !busy) text = st.winner === me ? 'Kazandın!' : `${A.nameOf(st.winner)} kazandı.`;
    else if (busy) text = 'Herkes nefesini tuttu…';
    else if (st.turn === me) text = 'Sıra sende: tetik senin';
    else text = `${A.nameOf(st.turn)} düşünüyor…`;
    statusBox.innerHTML = '';
    statusBox.append(h('div.core.status', null,
      h('span' + (can ? '.your-turn' : ''), null, text), h('span.spacer'),
      h('span.score', null, `Skor ${st.score[0]}-${st.score[1]}`), statusMark(A, 'fisek')));

    seat(oppBox, op, hp[op], false);
    seat(meBox, me, hp[me], true);
    items(oppItems, st.items[op], false, false);
    items(myItems, st.items[me], true, can);
    gunInner.classList.toggle('sawed', !!st.saw);

    const pk = peek && st.load && peek.load === st.load.id && peek.left === st.shells.length ? peek : null;
    hud.innerHTML = '';
    if (!busy || !tray.classList.contains('show')) hud.append(...[
      h('span', null, h('b', null, st.shells.length), ' fişek namluda'),
      st.load ? h('span.muted', null, `Bu doldurma: ${st.load.live} dolu, ${st.load.blank} boş`) : null,
      st.saw ? h('span.fs-badge.live', null, 'Kesik namlu: 2 hasar') : null,
      pk ? h('span.fs-badge.' + (pk.live ? 'live' : 'blank'), null, `Büyüteç: sıradaki ${pk.live ? 'DOLU' : 'BOŞ'}`) : null].filter(Boolean));

    actBox.innerHTML = '';
    if (st.winner != null && !busy) {
      actBox.append(h('button.primary.big', { onclick: () => { peek = null; A.set('fisek', newGame(st.score)); } }, ic('arrow-counter-clockwise'), 'Yeni oyun'));
      if (!over.querySelector('.fs-end')) over.append(h('div.fs-end', null, h('b', null, st.winner === me ? 'Kazandın' : `${A.nameOf(st.winner)} kazandı`), h('small', null, `Skor ${st.score[me]} - ${st.score[op]}`)));
    } else {
      const end = over.querySelector('.fs-end'); if (end) end.remove();
      actBox.append(
        h('button.big.fs-shoot.opp', { onclick: () => shoot(op), disabled: !can }, ic('crosshair'), `${A.nameOf(op)} tarafına ateş et`),
        h('button.big.fs-shoot.self', { onclick: () => shoot(me), disabled: !can }, ic('arrow-u-down-left'), 'Kendine ateş et'),
        h('span.fs-hint', null, can ? 'Eşyalarına tıklayarak kullanabilirsin; sıranı bitirmez.' : ''),
        h('button', { 'aria-label': 'Baştan başla', title: 'Baştan başla',
          onclick: () => modal('Yeni oyun?', 'Bu oyun silinecek.', [['Evet', () => { peek = null; A.set('fisek', newGame(st.score)); }, 'pink'], ['Vazgeç']]) }, ic('arrow-clockwise')));
    }
  }

  function render() {
    const st = G();
    if (!st || !el) return;
    if (st.ev && st.ev.id !== seenEv) {
      const ev = st.ev;
      seenEv = ev.id;
      enqueue(() => playEv(ev));
    }
    if (st.load && st.load.id !== seenLoad) {
      const ld = clone(st.load);
      seenLoad = ld.id;
      enqueue(() => playLoad(ld));
    }
    update();
  }

  Games.fisek = {
    id: 'fisek', title: 'Son Fişek', icon: 'skull', desc: 'Dolu mu boş mu? Tetik sende',
    status(S, A) {
      const st = S.fisek;
      if (!st) return { text: 'Yeni oyun' };
      const denom = [`${st.score[0]}-${st.score[1]}`, 'SKOR'];
      if (st.winner != null) return { denom, text: `${A.nameOf(st.winner)} kazandı` };
      const mine = st.turn === A.seat;
      return { mine, denom, text: mine ? 'Tetik sende' : `${A.nameOf(st.turn)} düşünüyor` };
    },
    keys: ['fisek'],
    mount(e, app) {
      el = e; A = app; alive++; busy = 0; queue = Promise.resolve(); shownHp = null;
      statusBox = h('div.shell');
      oppBox = h('div.fs-seat.top'); meBox = h('div.fs-seat.bottom');
      oppItems = h('div.fs-items.top'); myItems = h('div.fs-items.bottom');
      hud = h('div.fs-hud'); tray = h('div.fs-tray'); logBox = h('div.fs-log', null, 'Masaya hoş geldin.');
      gunInner = h('div.fs-gun-in', { html: GUN }, h('div.fs-flash'));
      gunWrap = h('div.fs-gun', null, gunInner);
      center = h('div.fs-center', null, tray, gunWrap);
      over = h('div.fs-over');
      actBox = h('div.fs-actions');
      room = h('div.fs-room', null,
        h('div.fs-lamp'), h('div.fs-smoke.a'), h('div.fs-smoke.b'), h('div.fs-smoke.c'),
        oppBox,
        h('div.fs-table', null, oppItems, h('div.fs-felt'), myItems),
        center, hud, meBox, logBox, h('div.fs-hit'), over, h('div.fs-grain'));
      el.append(h('div.game.fisek', null, statusBox, room, actBox));
      const st = A.S.fisek;
      if (!st) { seenEv = null; seenLoad = null; A.set('fisek', newGame()); }
      else { seenEv = st.ev ? st.ev.id : null; seenLoad = st.load ? st.load.id : null; render(); }
    },
    render() { if (el) render(); },
    unmount() { el = null; alive++; },
    _logic: { newGame, reload, passTurn },
  };
})();

// Kimim Ben?: herkesin alnında bir kart var; kendi kartını göremezsin, karşınınkini görürsün.
// Sırayla evet/hayır soruları sorulur, karşı taraf cevaplar. Kartını ilk bilen turu kazanır.
(() => {
  const CATS = {
    'Hayvanlar': ['Kedi', 'Köpek', 'Fil', 'Zürafa', 'Penguen', 'Aslan', 'Kaplumbağa', 'Yunus', 'Kartal', 'Tavşan', 'Ayı', 'Maymun', 'Timsah', 'Baykuş', 'Kanguru', 'Ahtapot', 'Sincap', 'At', 'İnek', 'Arı', 'Kelebek', 'Köpekbalığı', 'Panda', 'Deve', 'Horoz', 'Kirpi', 'Flamingo', 'Kurbağa'],
    'Meslekler': ['Doktor', 'Öğretmen', 'Aşçı', 'Pilot', 'İtfaiyeci', 'Polis', 'Berber', 'Avukat', 'Astronot', 'Fırıncı', 'Dişçi', 'Ressam', 'Çiftçi', 'Garson', 'Hemşire', 'Mimar', 'Kaptan', 'Futbolcu', 'Şarkıcı', 'Postacı', 'Kasap', 'Terzi', 'Dedektif', 'Bahçıvan'],
    'Yiyecekler': ['Lahmacun', 'Baklava', 'Pizza', 'Sushi', 'Mantı', 'Simit', 'Dondurma', 'Karpuz', 'Muz', 'Kebap', 'Menemen', 'Çikolata', 'Hamburger', 'Lokum', 'Kokoreç', 'Börek', 'Pilav', 'Çilek', 'Ayran', 'Kahve', 'Patlıcan', 'Midye', 'Künefe', 'Gözleme'],
    'Eşyalar': ['Şemsiye', 'Buzdolabı', 'Gözlük', 'Anahtar', 'Yastık', 'Saat', 'Ayna', 'Makas', 'Telefon', 'Bavul', 'Mum', 'Merdiven', 'Kaşık', 'Fotoğraf makinesi', 'Diş fırçası', 'Çaydanlık', 'Bisiklet', 'Gitar', 'Kumanda', 'Halı', 'Lamba', 'Çanta', 'Terlik', 'Süpürge'],
    'Karakterler': ['Harry Potter', 'Örümcek Adam', 'Batman', 'Süpermen', 'Shrek', 'Pinokyo', 'Külkedisi', 'Pamuk Prenses', 'Keloğlan', 'Nasreddin Hoca', 'Kral Şakir', 'Pikachu', 'Sünger Bob', 'Elsa', 'Mickey Mouse', 'Gargamel', 'Kırmızı Başlıklı Kız', 'Temel Reis', 'Pembe Panter', 'Hulk', 'Yoda', 'Sherlock Holmes', 'Drakula', 'Barbie'],
    'Ünlüler': ['Tarkan', 'Sezen Aksu', 'Barış Manço', 'Kemal Sunal', 'Cem Yılmaz', 'Şener Şen', 'Müslüm Gürses', 'Ajda Pekkan', 'Messi', 'Cristiano Ronaldo', 'Einstein', 'Michael Jackson', 'Taylor Swift', 'Shakira', 'Leonardo DiCaprio', 'Mr. Bean', 'Charlie Chaplin', 'Beyoncé', 'Kenan İmirzalıoğlu', 'Hande Yener', 'Arda Güler', 'Mozart', 'Picasso', 'Zeki Müren'],
    'Yerler': ['Paris', 'İstanbul', 'Mısır', 'Japonya', 'Kapadokya', 'Venedik', 'New York', 'Antarktika', 'Sahra Çölü', 'Everest', 'Hawaii', 'Londra', 'Pamukkale', 'Roma', 'Brezilya', 'Hindistan', 'Hollanda', 'Kuzey Kutbu', 'Efes', 'Çin Seddi', 'Ay', 'Mars', 'Amazon Ormanı', 'Galata Kulesi'],
  };
  const MIX = 'Karışık';
  const ANS = [['evet', 'Evet', 'check'], ['hayir', 'Hayır', 'x'], ['belki', 'Kısmen', 'circle-half'], ['bilmem', 'Bilmiyorum', 'question']];

  function pick(cat, not) {
    const pool = cat === MIX ? Object.values(CATS).flat() : CATS[cat];
    let w;
    do { w = pool[Math.floor(Math.random() * pool.length)]; } while (not && w === not && pool.length > 1);
    return w;
  }
  function newRound(prev, cat) {
    cat = cat || (prev && prev.cat) || MIX;
    const a = pick(cat), b = pick(cat, a);
    const round = prev ? prev.round + 1 : 1;
    return { round, cat, words: [a, b], turn: (round + 1) % 2, pending: null, log: [], winner: null, asked: [0, 0], score: prev ? prev.score : [0, 0] };
  }

  // Tahmin karşılaştırma: Türkçe harfleri sadeleştir, noktalamayı at; çok kelimeliyse ayırt edici kelime de yeter
  const norm = (s) => normTr(s).replace(/[^a-z0-9 ]/g, '').trim();
  function matches(guess, word) {
    const g = norm(guess), w = norm(word);
    if (!g) return false;
    if (g === w || g.replace(/ /g, '') === w.replace(/ /g, '')) return true;
    const parts = w.split(' ').filter((p) => p.length >= 4);
    return parts.length > 1 && parts.includes(g);
  }

  let el, A, catSel = null;
  const G = () => A.S.kimim;

  function act(fn) {
    const st = clone(G());
    fn(st);
    A.set('kimim', st);
  }
  function ask(q) {
    q = q.trim();
    if (!q) return;
    if (!/\?$/.test(q)) q += '?';
    act((st) => { st.pending = { s: A.seat, q }; st.asked[A.seat]++; });
  }
  function answer(code) {
    act((st) => {
      st.log.push({ s: st.pending.s, k: 'q', q: st.pending.q, a: code });
      st.pending = null;
      st.turn = A.seat; // cevaplayan şimdi soruyor
    });
  }
  function guess(x) {
    x = x.trim();
    if (!x) return;
    act((st) => {
      const ok = matches(x, st.words[A.seat]);
      st.log.push({ s: A.seat, k: 'g', q: x, a: ok ? 'dogru' : 'yanlis' });
      if (ok) { st.winner = A.seat; st.score[A.seat]++; setTimeout(() => A.act({ t: 'heart' }), 300); }
      else st.turn = 1 - A.seat;
    });
  }
  function giveUp() {
    act((st) => {
      st.log.push({ s: A.seat, k: 'g', q: 'Pes etti', a: 'pes' });
      st.winner = 1 - A.seat; st.score[st.winner]++;
    });
  }

  // Alnına yapıştırılmış kart: kendininki arkadan, karşınınki önden
  function forehead(seat, show) {
    const st = G(), word = st.words[seat];
    const me = seat === A.seat;
    return h('div.kim-side' + (me ? '.me' : ''), { style: { '--ink': `var(--p${seat})` } },
      h('div.kim-card' + (show ? '.front' : '.back') + (st.winner === seat ? '.won' : ''), null,
        show ? [h('small', null, st.cat === MIX ? 'Kart' : st.cat), h('b', null, word)] : h('span', null, '?')),
      h('div.kim-head', null, (A.nameOf(seat)[0] || '?').toLocaleUpperCase('tr')),
      h('div.kim-name', null, me ? 'Sen' : A.nameOf(seat), h('small', null, `${st.asked[seat]} soru`)));
  }

  function render() {
    const st = G();
    el.innerHTML = '';
    const me = A.seat, you = A.other, over = st.winner != null;
    const myTurn = !over && st.turn === me && !st.pending;
    const mustAnswer = !over && st.pending && st.pending.s === you;
    turnPing('kimim', myTurn || mustAnswer);

    let text;
    if (over) text = st.log.length && st.log[st.log.length - 1].a === 'pes' ? `${A.nameOf(st.winner)} turu aldı (pes edildi)` : `${A.nameOf(st.winner)} bildi!`;
    else if (mustAnswer) text = `${A.nameOf(you)} soruyor, cevapla`;
    else if (st.pending) text = `${A.nameOf(you)} cevaplıyor…`;
    else if (myTurn) text = 'Sıra sende: soru sor ya da tahmin et';
    else text = `${A.nameOf(st.turn)} soru düşünüyor…`;

    const ansLabel = (a) => ({ evet: 'Evet', hayir: 'Hayır', belki: 'Kısmen', bilmem: 'Bilmiyorum', dogru: 'Doğru!', yanlis: 'Yanlış', pes: 'Pes' })[a];
    const log = h('ol.kim-log', null, st.log.length ? st.log.map((e) =>
      h('li' + (e.s === me ? '.me' : ''), { style: { '--ink': `var(--p${e.s})` } },
        h('span.kim-q', null, h('b', null, (e.s === me ? 'Sen' : A.nameOf(e.s)) + (e.k === 'g' ? ' tahmin: ' : ': ')), e.q),
        h('span.kim-a.' + e.a, null, ansLabel(e.a)))) : h('li.muted', null, 'Henüz soru yok. "Canlı mıyım?", "Yenir mi?" gibi başla.'));

    const qIn = h('input', { placeholder: 'Evet/hayır sorusu sor… (ör. Hayvan mıyım?)', maxLength: 120, 'aria-label': 'Soru' });
    const gIn = h('input', { placeholder: 'Tahminin…', maxLength: 40, 'aria-label': 'Tahmin' });
    qIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(qIn.value); });
    gIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') guess(gIn.value); });

    let panel;
    if (over) {
      const cats = [MIX, ...Object.keys(CATS)];
      panel = h('div.kim-panel.core', null,
        h('h3', null, `Kartlar: sen "${st.words[me]}", ${A.nameOf(you)} "${st.words[you]}"`),
        h('p.muted', null, 'Yeni tur için kategori seç:'),
        h('div.kim-cats', null, cats.map((c) => h('button' + ((catSel || st.cat) === c ? '.on' : ''), { onclick: () => { catSel = c; render(); } }, c))),
        h('button.primary.big', { onclick: () => { A.set('kimim', newRound(st, catSel || st.cat)); catSel = null; } }, ic('cards'), 'Yeni tur'));
    } else if (mustAnswer) {
      panel = h('div.kim-panel.core.ask', null,
        h('p.kim-pending', null, h('b', null, A.nameOf(you) + ' soruyor: '), `“${st.pending.q}”`),
        h('p.muted', null, `Onun kartı: ${st.words[you]}`),
        h('div.kim-ans', null, ANS.map(([code, label, icon]) => h('button.' + code, { onclick: () => answer(code) }, ic(icon), label))));
    } else if (myTurn) {
      panel = h('div.kim-panel.core', null,
        h('div.kim-row', null, qIn, h('button.primary', { onclick: () => ask(qIn.value) }, ic('chat-circle-dots'), 'Sor')),
        h('div.kim-row', null, gIn, h('button', { onclick: () => guess(gIn.value) }, ic('lightbulb'), 'Tahmin et')),
        h('button.linkish', { onclick: () => modal('Pes et?', 'Kartın açılır, tur karşı tarafa yazılır.', [['Pes ediyorum', giveUp, 'pink'], ['Vazgeç']]) }, 'Pes et'));
    } else {
      panel = h('div.kim-panel.core', null, h('p.kim-wait', null, ic('hourglass-medium'), st.pending ? `Sorun gitti: “${st.pending.q}” Cevap bekleniyor…` : `${A.nameOf(st.turn)} soru soracak. Onun kartı: ${st.words[you]}`));
    }

    el.append(h('div.game.kimim', null,
      h('div.shell', null, h('div.core.status', null,
        h('span' + (myTurn || mustAnswer ? '.your-turn' : ''), null, text), h('span.spacer'),
        h('span.score', null, `Tur ${st.round} · ${st.cat} · Skor ${st.score[0]}-${st.score[1]}`),
        statusMark(A, 'kimim'))),
      h('div.kim-table', null, forehead(me, over), h('div.kim-vs', null, 'Kimim ben?'), forehead(you, true)),
      panel, log));
    const lg = el.querySelector('.kim-log');
    lg.scrollTop = lg.scrollHeight;
    if (myTurn) qIn.focus({ preventScroll: true });
  }

  Games.kimim = {
    id: 'kimim', title: 'Kimim Ben?', icon: 'user-focus', desc: 'Alnındaki kartı sorularla bul',
    status(S, A) {
      const st = S.kimim;
      if (!st) return { text: 'Yeni tur' };
      const denom = [`${st.score[0]}-${st.score[1]}`, 'SKOR'];
      if (st.winner != null) return { denom, text: `${A.nameOf(st.winner)} bildi` };
      if (st.pending) { const mine = st.pending.s !== A.seat; return { mine, denom, text: mine ? 'Soruyu cevapla' : 'Cevap bekleniyor' }; }
      const mine = st.turn === A.seat;
      return { mine, denom, text: mine ? 'Soru sor' : `${A.nameOf(st.turn)} soruyor` };
    },
    keys: ['kimim'],
    mount(e, app) {
      el = e; A = app; catSel = null;
      if (!A.S.kimim) A.set('kimim', newRound(null)); else render();
    },
    render() { if (el) render(); },
    unmount() { el = null; },
    _logic: { matches, newRound },
  };
})();

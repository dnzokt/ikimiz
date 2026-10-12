// Ortak çizim tahtası + "Çiz & Tahmin Et" modu.
// Çizgiler parça parça (dpt mesajları) gönderilir, böylece karşı taraf çizimi canlı görür.
(() => {
  const W = 1200, H = 800;
  const COLORS = ['#1b2236', '#1e4fa0', '#4f8fd0', '#2e7d6b', '#c23b2a', '#e8a33d', '#7a4fa0', '#8a5a3c', '#d97a9a', '#ffffff'];
  const SIZES = [4, 10, 22];
  const WORDS = ['kedi', 'köpek', 'ev', 'ağaç', 'güneş', 'ay', 'yıldız', 'araba', 'bisiklet', 'uçak', 'gemi', 'balık',
    'kalp', 'çiçek', 'pizza', 'dondurma', 'kahve', 'çay', 'pasta', 'elma', 'muz', 'karpuz', 'şemsiye', 'gözlük',
    'saat', 'telefon', 'gitar', 'piyano', 'top', 'kale', 'deniz', 'dağ', 'bulut', 'yağmur', 'kar', 'kardan adam',
    'tavşan', 'fil', 'zürafa', 'aslan', 'penguen', 'kelebek', 'arı', 'örümcek', 'yılan', 'kaplumbağa', 'tavuk',
    'yumurta', 'ekmek', 'simit', 'çatal', 'kaşık', 'bardak', 'yatak', 'kanepe', 'televizyon', 'kitap', 'kalem',
    'mektup', 'hediye', 'yüzük', 'taç', 'robot', 'roket', 'uzaylı', 'hayalet', 'korsan', 'deniz kızı', 'ejderha',
    'gökkuşağı', 'şimşek', 'ateş', 'çadır', 'kamp', 'plaj', 'havuz', 'tren', 'otobüs', 'köprü', 'fener', 'balon',
    'uçurtma', 'salıncak', 'kaykay', 'öpücük', 'sarılmak', 'dans', 'uyumak', 'yemek yapmak', 'sinema', 'patlamış mısır'];

  let el, A, canvas, ctx, header;
  let color = COLORS[0], size = SIZES[1];
  let drawing = null, buffer = [], flushTimer = null;
  let myStrokes = [];

  function strokeTo(s, from) {
    const p = s.p;
    if (p.length < 2) return;
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const i0 = Math.max(0, from - 2);
    ctx.moveTo(p[i0], p[i0 + 1]);
    if (p.length === 2 || i0 + 2 >= p.length) ctx.lineTo(p[i0] + 0.1, p[i0 + 1]);
    for (let i = i0 + 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.stroke();
  }
  function redraw() {
    if (!ctx) return;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    for (const s of A.S.draw.strokes) strokeTo(s, 0);
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return [Math.round((e.clientX - r.left) / r.width * W), Math.round((e.clientY - r.top) / r.height * H)];
  }

  function flush() {
    flushTimer = null;
    if (!drawing || !buffer.length) return;
    A.act({ t: 'dpt', id: drawing.id, c: drawing.c, w: drawing.w, p: buffer });
    buffer = [];
  }

  function canDraw() {
    const g = A.S.drawGame;
    return !g || g.drawer === A.seat;
  }

  function onDown(e) {
    if (!canDraw()) { toast('Şu an tahmin etme sırası sende'); return; }
    canvas.setPointerCapture(e.pointerId);
    const id = A.seat + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    drawing = { id, c: color, w: color === '#ffffff' ? size * 2.5 : size };
    myStrokes.push(id);
    buffer = pos(e);
    const s = { ...drawing, p: buffer.slice() };
    strokeTo(s, 0);
    drawing.local = s;
    flush();
  }
  function onMove(e) {
    if (!drawing) return;
    let evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (!evs.length) evs = [e];
    for (const ev of evs) {
      const [x, y] = pos(ev);
      const lp = drawing.local.p;
      if (Math.abs(lp[lp.length - 2] - x) + Math.abs(lp[lp.length - 1] - y) < 2) continue;
      lp.push(x, y); buffer.push(x, y);
      strokeTo(drawing.local, lp.length - 2);
    }
    if (!flushTimer) flushTimer = setTimeout(flush, 40);
  }
  function onUp() {
    if (!drawing) return;
    clearTimeout(flushTimer); flush();
    drawing = null;
  }

  function renderHeader() {
    header.innerHTML = '';
    const g = A.S.drawGame;
    const isEraser = (c) => c === '#ffffff';
    const tools = h('div.shell', null, h('div.core.toolbar', null,
      COLORS.map((c) => h('button.swatch' + (c === color ? '.on' : ''), {
        style: { background: isEraser(c) ? 'var(--surface)' : c, color: 'var(--ink)' },
        title: isEraser(c) ? 'Silgi' : 'Renk', 'aria-label': isEraser(c) ? 'Silgi' : 'Renk ' + c,
        onclick: () => { color = c; renderHeader(); },
      }, isEraser(c) ? ic('eraser') : '')),
      h('span.sep'),
      SIZES.map((s, i) => h('button.size-btn' + (s === size ? '.on' : ''), { onclick: () => { size = s; renderHeader(); } }, ['İnce', 'Orta', 'Kalın'][i])),
      h('span', { style: { flex: 1 } }),
      h('button.icon', { onclick: undo, title: 'Son çizgimi geri al', 'aria-label': 'Geri al' }, ic('arrow-counter-clockwise')),
      h('button.icon', { onclick: () => modal('Tahtayı temizle?', 'İkinizin ekranından da silinecek.', [['Temizle', () => A.act({ t: 'dclear' }), 'pink'], ['Vazgeç']]), title: 'Temizle', 'aria-label': 'Temizle' }, ic('trash')),
      h('button.icon', { onclick: savePng, title: 'Resmi indir', 'aria-label': 'Resmi indir' }, ic('download-simple'))));

    const score = () => h('span.score', null, `${A.nameOf(0)} ${g.scores[0]} - ${g.scores[1]} ${A.nameOf(1)}`);
    let game;
    if (!g) {
      game = h('div.core.status', null, h('span', null, 'Serbest çizim. İkiniz aynı anda çizebilirsiniz.'), h('span.spacer'),
        h('button.primary', { onclick: startGame }, ic('target'), 'Çiz & Tahmin Et'));
    } else if (g.drawer === A.seat) {
      game = h('div.core.status', null, h('span', null, 'Bunu çiz:'), h('span.word-box', null, g.word), h('span.spacer'),
        score(),
        h('button', { onclick: () => newRound(g, g.drawer, false) }, ic('skip-forward'), 'Pas'),
        h('button', { onclick: () => A.set('drawGame', null) }, 'Bitir'));
    } else {
      const inp = h('input', { placeholder: 'Tahminin…', 'aria-label': 'Tahmin', style: { maxWidth: '220px', borderRadius: '999px' } });
      const send = () => { const x = inp.value.trim(); if (x) { guess(x); inp.value = ''; } };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
      game = h('div.core.status', null,
        h('span', null, `${A.nameOf(g.drawer)} çiziyor:`),
        h('span.word-box', null, g.word.replace(/\S/g, '_ ').trim()),
        h('span.spacer'),
        score(),
        inp, h('button.primary', { onclick: send }, 'Tahmin et'),
        h('button', { onclick: () => A.set('drawGame', null) }, 'Bitir'));
    }
    header.append(h('div.shell', null, game), tools);
  }

  function startGame() {
    newRound({ scores: [0, 0], round: 0 }, A.seat, true);
  }
  function newRound(g, drawer, clear) {
    let word;
    do { word = WORDS[Math.floor(Math.random() * WORDS.length)]; } while (word === g.word);
    A.set('drawGame', { drawer, word, scores: g.scores, round: (g.round || 0) + 1 });
    A.act({ t: 'dclear' });
  }
  function guess(x) {
    const g = A.S.drawGame;
    if (!g) return;
    if (normTr(x) === normTr(g.word)) {
      A.say(`${A.name} bildi: "${g.word}"`);
      const scores = g.scores.slice();
      scores[A.seat]++; scores[g.drawer]++;
      // Bilen kişi şimdi çizer
      newRound({ ...g, scores }, A.seat, true);
      toast('Bildin! Şimdi çizme sırası sende.');
    } else {
      A.say(`Tahmin: ${x}`);
    }
  }
  function undo() {
    const strokes = A.S.draw.strokes;
    while (myStrokes.length) {
      const id = myStrokes.pop();
      if (strokes.some((s) => s.id === id)) { A.act({ t: 'dundo', id }); return; }
    }
    // Sayfa yenilendiyse: bana ait son çizgiyi bul
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes[i].id.startsWith(A.seat + '-')) { A.act({ t: 'dundo', id: strokes[i].id }); return; }
    }
  }
  function savePng() {
    const a = h('a', { href: canvas.toDataURL('image/png'), download: 'ikimiz-cizim.png' });
    document.body.append(a); a.click(); a.remove();
  }

  Games.draw = {
    id: 'draw', title: 'Birlikte Çiz', icon: 'paint-brush', desc: 'Aynı tahtaya birlikte çizin ya da birbirinize kelime çizip tahmin ettirin.',
    status(S, A) {
      const g = S.drawGame;
      if (g) return g.drawer === A.seat ? { mine: true, text: "Çizme sırası sende" } : { text: `${A.nameOf(g.drawer)} çiziyor, tahmin et` };
      const n = (S.draw && S.draw.strokes.length) || 0;
      return { text: n ? `Tahtada ${n} çizgi` : "Tahta boş" };
    },
    reduce(S, msg) {
      const d = S.draw || (S.draw = { strokes: [] });
      if (msg.t === 'dpt') {
        let s = null;
        for (let i = d.strokes.length - 1; i >= 0 && i >= d.strokes.length - 30; i--) if (d.strokes[i].id === msg.id) { s = d.strokes[i]; break; }
        if (s) s.p.push(...msg.p);
        else d.strokes.push({ id: msg.id, c: msg.c, w: msg.w, p: msg.p.slice() });
      } else if (msg.t === 'dundo') {
        d.strokes = d.strokes.filter((s) => s.id !== msg.id);
      } else if (msg.t === 'dclear') {
        d.strokes = [];
      }
    },
    onMsg(msg, remote) {
      if (msg.t === 'dpt' && remote) {
        const d = A.S.draw.strokes;
        const s = d.find((x) => x.id === msg.id);
        if (s) strokeTo(s, s.p.length - msg.p.length);
      } else if (msg.t === 'dundo' || msg.t === 'dclear') {
        redraw();
      } else if (msg.t === 'set' && msg.k === 'drawGame') {
        renderHeader();
      }
    },
    mount(e, app) {
      el = e; A = app;
      header = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
      canvas = h('canvas', { width: W, height: H });
      ctx = canvas.getContext('2d');
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      el.append(h('div.game', null, header, h('div.draw-wrap', null, canvas)));
      renderHeader();
      redraw();
    },
    onChat(x) {
      // Tahmin modunda sohbetten yazılanlar da tahmin sayılır
      const g = A.S.drawGame;
      if (g && g.drawer !== A.seat) { guess(x); return true; }
      return false;
    },
    render() { if (el) { renderHeader(); redraw(); } },
    unmount() { onUp(); el = null; ctx = null; },
  };
})();

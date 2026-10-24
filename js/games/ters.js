// Ters Ses: biri bir cümle yazıp sesini kaydeder; öbürü kaydın tersini dinleyip taklit eder,
// kendi taklidinin tersini dinleyerek asıl cümleyi tahmin eder.
// Kayıt (MediaRecorder) ve ters çevirme (Web Audio) tamamen tarayıcıda; ses durumla birlikte karşıya gider.
(() => {
  const MAX_MS = 8000;
  const IDEAS = {
    'Filmler ve diziler': ['Yüzüklerin Efendisi', 'Harry Potter', 'Ezel', 'Kurtlar Vadisi', 'Titanik', 'Aslan Kral', 'Hababam Sınıfı', 'Recep İvedik', 'Karayip Korsanları', 'Buz Devri', 'Arka Sokaklar', 'Yahşi Batı'],
    'Şarkılar': ['Şımarık', 'Bir Derdim Var', 'Kuzu Kuzu', 'Dudu', 'Gülpembe', 'Hadi Bakalım', 'Firuze', 'Despacito', 'Bohemian Rhapsody', 'Shape of You', 'Seni Kimler Aldı', 'Unutamazsın'],
    'Atasözleri': ['Damlaya damlaya göl olur', 'Sakla samanı gelir zamanı', 'Ayağını yorganına göre uzat', 'Üzüm üzüme baka baka kararır', 'Sabrın sonu selamettir', 'İşleyen demir ışıldar'],
    'Tekerlemeler': ['Şu köşe yaz köşesi', 'Bir berber bir berbere', 'Dal sarkar kartal kalkar', 'Çekoslovakyalılaştıramadıklarımızdan', 'Kırk küp kırkının da kulpu kırık'],
    'Tatlı sözler': ['Seni çok seviyorum', 'Günaydın uykucu', 'Bugün çok güzelsin', 'Benim minik ayıcığım', 'Bana pizza ısmarla', 'Özledim seni'],
  };
  const ALL = Object.values(IDEAS).flat();

  // Tahmin karşılaştırma: Türkçe harfleri sadeleştir, boşluk ve noktalamayı at, küçük yazım hatalarına izin ver
  const norm = (s) => normTr(s).replace(/[^a-z0-9]/g, '');
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  function close(guess, phrase) {
    const g = norm(guess), p = norm(phrase);
    if (!g) return false;
    if (g === p) return true;
    return p.length >= 4 && 1 - lev(g, p) / Math.max(g.length, p.length) >= 0.8;
  }

  function newRound(prev, by) {
    return { n: prev ? prev.n + 1 : 1, by, turn: by, phase: 'write', phrase: '', orig: null, mimic: null, tries: [], result: null,
      score: prev ? prev.score : [0, 0] };
  }

  // ---------- Ses ----------
  let actx = null;
  const ctx = () => actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
  const bufCache = new Map(), revCache = new Map(), peakCache = new Map();
  async function decode(url) {
    if (bufCache.has(url)) return bufCache.get(url);
    const ab = await (await fetch(url)).arrayBuffer();
    const buf = await ctx().decodeAudioData(ab);
    bufCache.set(url, buf);
    return buf;
  }
  async function getBuf(url, rev) {
    const buf = await decode(url);
    if (!rev) return buf;
    if (!revCache.has(url)) {
      const r = ctx().createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
      for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch).slice(); d.reverse(); r.copyToChannel(d, ch); }
      revCache.set(url, r);
    }
    return revCache.get(url);
  }
  function peaks(buf, key, n) {
    const k = key + ':' + n;
    if (peakCache.has(k)) return peakCache.get(k);
    const d = buf.getChannelData(0), step = Math.max(1, Math.floor(d.length / n)), out = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step, e = Math.min(d.length, j + step); j < e; j++) { const v = Math.abs(d[j]); if (v > m) m = v; } out[i] = m; }
    let mx = 0; for (const v of out) mx = Math.max(mx, v);
    if (mx > 0) for (let i = 0; i < n; i++) out[i] /= mx;
    peakCache.set(k, out);
    return out;
  }

  let el, A, playing = null, rec = null, draft = null, deck = null, raf = 0, phraseDraft = '', guessDraft = '', cat = 'Filmler ve diziler';
  const G = () => A.S.ters;

  async function play(url, rev, label) {
    stopPlay();
    try {
      const c = ctx();
      if (c.state === 'suspended') await c.resume();
      const buf = await getBuf(url, rev);
      const src = c.createBufferSource();
      src.buffer = buf; src.connect(c.destination); src.start();
      playing = { src, url, rev, t0: c.currentTime, dur: buf.duration };
      deck = { url, rev, label, buf };
      src.onended = () => { if (playing && playing.src === src) { playing = null; refresh(); } };
      refresh(); loop();
    } catch (e) { toast('Bu kayıt çalınamadı. Tarayıcın bu ses biçimini açamıyor olabilir.', 3500); }
  }
  function stopPlay() { if (playing) { try { playing.src.stop(); } catch (e) {} playing = null; } }

  async function startRec() {
    stopPlay();
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Bu tarayıcı ses kaydını desteklemiyor.', 3500); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { toast('Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden izin verebilirsin.', 4500); return; }
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
    const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
    const chunks = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/webm' });
      const fr = new FileReader();
      fr.onload = () => { draft = fr.result; rec = null; deck = null; refresh(); decode(draft).then((b) => { deck = { url: draft, rev: false, label: 'Yeni kaydın', buf: b }; refresh(); }).catch(() => {}); };
      fr.readAsDataURL(blob);
    };
    const c = ctx();
    if (c.state === 'suspended') await c.resume();
    const an = c.createAnalyser(); an.fftSize = 1024;
    c.createMediaStreamSource(stream).connect(an);
    rec = { mr, an, t0: performance.now(), levels: [] };
    draft = null;
    mr.start(200);
    rec.timer = setTimeout(stopRec, MAX_MS);
    refresh(); loop();
  }
  function stopRec() { if (rec && rec.mr.state !== 'inactive') { clearTimeout(rec.timer); rec.mr.stop(); } }

  // ---------- Bant ekranı (dalga formu) ----------
  function drawWave() {
    const cv = el && el.querySelector('.ts-wave');
    if (!cv) return;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, mid = H / 2;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255, 176, 64, .07)';
    for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 1, H);
    g.fillRect(0, mid, W, 1);
    const bars = (vals, col, prog) => {
      const n = vals.length, bw = W / n;
      for (let i = 0; i < n; i++) {
        const v = Math.max(.02, vals[i]), hh = v * (H * .44);
        g.fillStyle = prog != null && i / n <= prog ? '#ffd27a' : col;
        g.fillRect(i * bw + 1, mid - hh, Math.max(1, bw - 2), hh * 2);
      }
    };
    if (rec) {
      const d = new Float32Array(rec.an.fftSize);
      rec.an.getFloatTimeDomainData(d);
      let s = 0; for (const v of d) s += v * v;
      rec.levels.push(Math.min(1, Math.sqrt(s / d.length) * 5));
      const n = 96, vals = rec.levels.slice(-n);
      while (vals.length < n) vals.unshift(0);
      bars(vals, '#ff6a4d');
      const left = Math.max(0, MAX_MS - (performance.now() - rec.t0));
      const tm = el.querySelector('.ts-time');
      if (tm) tm.textContent = (left / 1000).toFixed(1) + ' sn';
      return;
    }
    if (deck && deck.buf) {
      let prog = null;
      if (playing && playing.url === deck.url && playing.rev === deck.rev) prog = Math.min(1, (ctx().currentTime - playing.t0) / playing.dur);
      bars(peaks(deck.buf, deck.url.length + (deck.rev ? 'r' : 'd') + deck.url.slice(-24), 96), 'rgba(255, 176, 64, .55)', prog);
    } else {
      g.fillStyle = 'rgba(255, 176, 64, .35)';
      g.fillRect(0, mid - 1, W, 2);
    }
  }
  function loop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      drawWave();
      if (rec || playing) raf = requestAnimationFrame(tick);
    };
    tick();
  }
  // Makaralar ve etiket: tam çizim yapmadan güncelle
  function refresh() {
    if (!el) return;
    render();
  }

  const REEL = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="#3a2414"/><circle cx="50" cy="50" r="46" fill="url(#ts-bant)"/>
    <circle cx="50" cy="50" r="24" fill="#d9d4c7" stroke="#8a857a" stroke-width="1.5"/>
    <g fill="#2a2522"><path d="M50 30l7 12h-14Z"/><path d="M50 30l7 12h-14Z" transform="rotate(120 50 50)"/><path d="M50 30l7 12h-14Z" transform="rotate(240 50 50)"/></g>
    <circle cx="50" cy="50" r="7" fill="#8a857a"/><circle cx="50" cy="50" r="3" fill="#2a2522"/>
    <defs><radialGradient id="ts-bant" cx="50%" cy="50%" r="50%"><stop offset=".5" stop-color="#4a2e1c"/><stop offset=".52" stop-color="#2e1c10"/><stop offset=".8" stop-color="#4a2e1c"/><stop offset="1" stop-color="#25160c"/></radialGradient></defs>
  </svg>`;

  function deckEl(controls, label) {
    const spin = rec || playing;
    const rev = playing && playing.rev;
    return h('div.ts-deck' + (spin ? '.spin' : '') + (rev ? '.ters' : '') + (rec ? '.rec' : ''), null,
      h('span.ts-screw.tl'), h('span.ts-screw.tr'), h('span.ts-screw.bl'), h('span.ts-screw.br'),
      h('div.ts-reels', null,
        h('span.ts-reel', { html: REEL }),
        h('div.ts-window', null,
          h('canvas.ts-wave', { width: 640, height: 120, 'aria-label': 'Ses dalgası' }),
          h('div.ts-label', null,
            rec ? [h('span.ts-dot'), 'KAYIT'] : (playing ? [ic(playing.rev ? 'rewind' : 'play', 'fill'), playing.rev ? 'TERS ÇALIYOR' : 'ÇALIYOR'] : (label || 'HAZIR')),
            h('span.ts-time', null, deck && deck.buf && !rec ? deck.buf.duration.toFixed(1) + ' sn' : ''))),
        h('span.ts-reel', { html: REEL })),
      h('div.ts-controls', null, controls));
  }
  const btn = (cls, icon, text, onclick, disabled) => h('button' + cls, { onclick, disabled: !!disabled }, icon ? ic(icon, 'fill') : null, text);
  const recBtns = () => rec
    ? [btn('.ts-stop', 'stop', 'Durdur', stopRec)]
    : [btn('.ts-rec', 'record', draft ? 'Tekrar kaydet' : 'Kaydet', startRec),
      draft ? btn('', 'play', 'Düz dinle', () => play(draft, false, 'Yeni kaydın')) : null,
      draft ? btn('', 'rewind', 'Ters dinle', () => play(draft, true, 'Yeni kaydın · ters')) : null];

  function steps(st) {
    const order = ['write', 'mimic', 'guess', 'done'];
    const names = ['Yaz ve kaydet', 'Tersini taklit et', 'Tahmin et', 'Sonuç'];
    const at = order.indexOf(st.phase);
    return h('ol.ts-steps', null, names.map((n, i) => h('li' + (i === at ? '.on' : i < at ? '.ok' : ''), null, h('b', null, i + 1), n)));
  }

  // ---------- Hamleler ----------
  function sendOrig() {
    const ph = phraseDraft.trim();
    if (!ph) { toast('Önce ne söyleyeceğini yaz.'); return; }
    if (!draft) { toast('Önce sesini kaydet.'); return; }
    const st = clone(G());
    st.phrase = ph; st.orig = draft; st.phase = 'mimic'; st.turn = 1 - st.by;
    draft = null; deck = null; phraseDraft = '';
    A.set('ters', st);
  }
  function sendMimic() {
    if (!draft) { toast('Önce taklidini kaydet.'); return; }
    const st = clone(G());
    st.mimic = draft; st.phase = 'guess';
    draft = null; deck = null;
    A.set('ters', st);
  }
  function guess(x) {
    x = x.trim();
    if (!x) return;
    const st = clone(G());
    const ok = close(x, st.phrase);
    st.tries.push({ x, ok });
    guessDraft = '';
    if (ok) { st.result = 'bildi'; st.score[1 - st.by]++; st.phase = 'done'; st.turn = null; setTimeout(() => A.act({ t: 'heart' }), 300); }
    else if (st.tries.length >= 3) { st.result = 'bilemedi'; st.score[st.by]++; st.phase = 'done'; st.turn = null; }
    A.set('ters', st);
  }
  function giveUp() {
    const st = clone(G());
    st.result = 'pes'; st.score[st.by]++; st.phase = 'done'; st.turn = null;
    A.set('ters', st);
  }

  function render() {
    const st = G();
    if (!el || !st) return;
    const me = A.seat, op = A.other, author = st.by === me;
    const mine = st.turn === me;
    turnPing('ters', mine);
    let text, body;

    if (st.phase === 'write') {
      if (author) {
        text = 'Sıra sende: bir şey yaz ve sesini kaydet';
        const inp = h('input.ts-phrase', { value: phraseDraft, maxLength: 60, placeholder: 'Ne söyleyeceksin? (ör. Damlaya damlaya göl olur)', 'aria-label': 'Cümle' });
        inp.addEventListener('input', () => { phraseDraft = inp.value; });
        for (const t of ['keydown', 'keyup']) inp.addEventListener(t, (e) => e.stopPropagation());
        body = h('div.ts-body', null,
          h('div.ts-card.core', null,
            h('label.ts-lbl', null, 'Söyleyeceğin', inp),
            h('div.ts-ideas', null,
              h('div.ts-cats', null, Object.keys(IDEAS).map((c) => h('button' + (c === cat ? '.on' : ''), { onclick: () => { cat = c; render(); } }, c))),
              h('button.linkish', { onclick: () => { const list = IDEAS[cat] || ALL; phraseDraft = list[Math.floor(Math.random() * list.length)]; render(); } }, ic('shuffle'), 'Bu kategoriden rastgele öner')),
            h('p.ts-tip', null, ic('lightbulb'), `Yüksek sesle ve tane tane söyle. En fazla ${MAX_MS / 1000} saniye. ${A.nameOf(op)} cümleni görmeyecek, yalnızca kaydının tersini duyacak.`)),
          deckEl([...recBtns(), btn('.primary.ts-send', 'paper-plane-tilt', 'Gönder', sendOrig, !draft || rec)]));
      } else {
        text = `${A.nameOf(st.by)} bir şey yazıp kaydediyor…`;
        body = h('div.ts-body', null, h('div.ts-card.core.ts-wait', null, ic('microphone'), h('p', null, `${A.nameOf(st.by)} gizli bir cümle seçip sesini kaydediyor. Sonra kaydın tersini sana gönderecek.`)), deckEl([], 'BEKLENİYOR'));
      }
    } else if (st.phase === 'mimic') {
      if (!author) {
        text = 'Sıra sende: tersini dinle ve taklit et';
        body = h('div.ts-body', null,
          h('div.ts-card.core', null,
            h('h3', null, `${A.nameOf(st.by)} bir şey söyledi. İşte tersten hali:`),
            h('button.big.primary.ts-big', { onclick: () => play(st.orig, true, 'Asıl kayıt · ters') }, ic('rewind', 'fill'), 'Tersini dinle'),
            h('p.ts-tip', null, ic('lightbulb'), 'Kaç kez istersen dinle. Duyduğun anlamsız sesi olabildiğince aynı taklit edip kaydet. Sonra senin taklidin tersten çalınınca asıl cümle ortaya çıkacak.')),
          deckEl([...recBtns().filter((b) => !b || !/Ters dinle/.test(b.textContent)), btn('.primary.ts-send', 'paper-plane-tilt', 'Taklidi gönder', sendMimic, !draft || rec)]));
      } else {
        text = `${A.nameOf(op)} kaydının tersini taklit ediyor…`;
        body = h('div.ts-body', null,
          h('div.ts-card.core', null, h('p', null, `Gizli cümlen: `, h('b', null, `“${st.phrase}”`)), h('p.muted', null, `${A.nameOf(op)} şu an kaydının tersini dinleyip taklit ediyor.`),
            h('div.ts-plays', null,
              btn('', 'play', 'Kaydım', () => play(st.orig, false, 'Asıl kayıt')),
              btn('', 'rewind', 'Kaydımın tersi', () => play(st.orig, true, 'Asıl kayıt · ters')))),
          deckEl([], 'BEKLENİYOR'));
      }
    } else if (st.phase === 'guess') {
      if (!author) {
        text = 'Sıra sende: taklidinin tersini dinle ve tahmin et';
        const inp = h('input', { value: guessDraft, maxLength: 60, placeholder: 'Ne dediğini tahmin et…', 'aria-label': 'Tahmin' });
        inp.addEventListener('input', () => { guessDraft = inp.value; });
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') guess(inp.value); });
        body = h('div.ts-body', null,
          h('div.ts-card.core', null,
            h('button.big.primary.ts-big', { onclick: () => play(st.mimic, true, 'Taklidin · ters') }, ic('rewind', 'fill'), 'Taklidinin tersini dinle'),
            h('div.ts-plays', null,
              btn('', 'rewind', 'Asıl kaydın tersi', () => play(st.orig, true, 'Asıl kayıt · ters')),
              btn('', 'play', 'Taklidin', () => play(st.mimic, false, 'Taklidin'))),
            h('div.ts-guess', null, inp, h('button.primary', { onclick: () => guess(inp.value) }, ic('lightbulb'), 'Tahmin et')),
            h('p.muted', null, `${3 - st.tries.length} hakkın kaldı.`, st.tries.length ? h('span', null, ' Yanlışlar: ', st.tries.map((t) => `“${t.x}”`).join(', ')) : null),
            h('button.linkish', { onclick: () => modal('Pes et?', 'Cümle açılır, tur karşı tarafa yazılır.', [['Pes ediyorum', giveUp, 'pink'], ['Vazgeç']]) }, 'Pes et')),
          deckEl([]));
      } else {
        text = `${A.nameOf(op)} tahmin ediyor…`;
        body = h('div.ts-body', null,
          h('div.ts-card.core', null, h('p', null, 'Gizli cümlen: ', h('b', null, `“${st.phrase}”`)),
            h('p.muted', null, st.tries.length ? `Tahminleri: ${st.tries.map((t) => `“${t.x}”`).join(', ')}` : `${A.nameOf(op)} taklidini kaydetti. Sen de dinle:`),
            h('div.ts-plays', null,
              btn('', 'play', 'Onun taklidi', () => play(st.mimic, false, 'Taklit')),
              btn('', 'rewind', 'Taklidin tersi', () => play(st.mimic, true, 'Taklit · ters')))),
          deckEl([]));
      }
    } else {
      const guesser = 1 - st.by;
      const win = st.result === 'bildi';
      text = win ? `${A.nameOf(guesser)} bildi!` : `${A.nameOf(guesser)} bilemedi, tur ${A.nameOf(st.by)}'a.`;
      body = h('div.ts-body', null,
        h('div.ts-card.core.ts-reveal' + (win ? '.win' : ''), null,
          h('small', null, 'Gizli cümle'),
          h('h2', null, `“${st.phrase}”`),
          st.tries.length ? h('p.muted', null, 'Tahminler: ', st.tries.map((t) => `“${t.x}”`).join(', ')) : null,
          h('div.ts-plays.four', null,
            btn('', 'play', 'Asıl kayıt', () => play(st.orig, false, 'Asıl kayıt')),
            btn('', 'rewind', 'Asıl kaydın tersi', () => play(st.orig, true, 'Asıl kayıt · ters')),
            st.mimic ? btn('', 'play', 'Taklit', () => play(st.mimic, false, 'Taklit')) : null,
            st.mimic ? btn('', 'rewind', 'Taklidin tersi', () => play(st.mimic, true, 'Taklit · ters')) : null),
          h('button.primary.big', { onclick: () => { draft = null; deck = null; stopPlay(); A.set('ters', newRound(st, 1 - st.by)); } }, ic('arrow-counter-clockwise'),
            1 - st.by === me ? 'Yeni tur: sen söyle' : `Yeni tur: ${A.nameOf(1 - st.by)} söylesin`)),
        deckEl([]));
    }

    el.innerHTML = '';
    el.append(h('div.game.ters', null,
      h('div.shell', null, h('div.core.status', null,
        h('span' + (mine ? '.your-turn' : ''), null, text), h('span.spacer'),
        h('span.score', null, `Tur ${st.n} · Skor ${st.score[0]}-${st.score[1]}`), statusMark(A, 'ters'))),
      steps(st), body));
    drawWave();
  }

  Games.ters = {
    id: 'ters', title: 'Ters Ses', icon: 'microphone', desc: 'Kaydın tersini taklit et, cümleyi bul',
    status(S, A) {
      const st = S.ters;
      if (!st) return { text: 'Yeni tur' };
      const denom = [`${st.score[0]}-${st.score[1]}`, 'SKOR'];
      if (st.phase === 'done') return { denom, text: st.result === 'bildi' ? 'Bilindi' : 'Bilinemedi' };
      const mine = st.turn === A.seat;
      const t = { write: 'Yaz ve kaydet', mimic: 'Tersini taklit et', guess: 'Tahmin et' }[st.phase];
      return { mine, denom, text: mine ? t : `${A.nameOf(st.turn)}: ${t.toLocaleLowerCase('tr')}` };
    },
    keys: ['ters'],
    mount(e, app) {
      el = e; A = app;
      if (!A.S.ters) A.set('ters', newRound(null, A.seat)); else render();
    },
    render() { if (el) render(); },
    unmount() { el = null; stopPlay(); stopRec(); cancelAnimationFrame(raf); },
    _logic: { close, newRound },
  };
})();

// Ortak yapboz: kendi fotoğrafınız ya da rastgele bir resim. İkiniz aynı anda parça taşıyabilirsiniz.
// Parçalar doğru yere yaklaşınca yerine oturur ve kilitlenir.
(() => {
  let el, A, stage, board, scale = 1, ghost = false, dragging = null, sendTimer = null, onResize;
  const nodes = [];
  const P = () => A.S.puzzle;

  // ---------- Yapboz şekli ----------
  const TAB = [
    ['L', 0.34, 0],
    ['C', 0.40, 0.00, 0.40, 0.08, 0.37, 0.14],
    ['C', 0.32, 0.24, 0.42, 0.30, 0.50, 0.30],
    ['C', 0.58, 0.30, 0.68, 0.24, 0.63, 0.14],
    ['C', 0.60, 0.08, 0.60, 0.00, 0.66, 0],
    ['L', 1, 0],
  ];
  function edgePath(p0, p1, out, sign, s) {
    if (!sign) return `L ${p1[0]} ${p1[1]} `;
    const pt = (u, v) => {
      const x = p0[0] + (p1[0] - p0[0]) * u + out[0] * v * s * sign;
      const y = p0[1] + (p1[1] - p0[1]) * u + out[1] * v * s * sign;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    };
    let d = '';
    for (const [cmd, ...n] of TAB) {
      d += cmd + ' ';
      for (let i = 0; i < n.length; i += 2) d += pt(n[i], n[i + 1]) + ' ';
    }
    return d;
  }
  function piecePath(pz, r, c) {
    const { pw, ph, tab: t } = pz;
    const s = Math.min(pw, ph);
    const top = r === 0 ? 0 : -pz.hE[r - 1][c];
    const bottom = r === pz.rows - 1 ? 0 : pz.hE[r][c];
    const left = c === 0 ? 0 : -pz.vE[r][c - 1];
    const right = c === pz.cols - 1 ? 0 : pz.vE[r][c];
    const A_ = [t, t], B = [t + pw, t], C = [t + pw, t + ph], D = [t, t + ph];
    return `M ${t} ${t} ` + edgePath(A_, B, [0, -1], top, s) + edgePath(B, C, [1, 0], right, s) +
      edgePath(C, D, [0, 1], bottom, s) + edgePath(D, A_, [-1, 0], left, s) + 'Z';
  }

  // ---------- Yeni yapboz ----------
  function create(img, iw, ih, count) {
    const aspect = iw / ih;
    const cols = Math.max(2, Math.round(Math.sqrt(count * aspect)));
    const rows = Math.max(2, Math.round(count / cols));
    const pw = iw / cols, ph = ih / rows;
    const tab = Math.ceil(Math.min(pw, ph) * 0.32);
    const rnd = () => (Math.random() < 0.5 ? 1 : -1);
    const hE = Array.from({ length: rows - 1 }, () => Array.from({ length: cols }, rnd));
    const vE = Array.from({ length: rows }, () => Array.from({ length: cols - 1 }, rnd));
    // Parçaları çerçevenin çevresindeki boş yuvalara dağıt (üst üste yığılmasın).
    // Yuva yetmezse masayı biraz büyüt ve yeniden say.
    const n = rows * cols;
    const cw = pw * 1.06, chh = ph * 1.06;
    let bw, bh, ox, oy, slots, grow = 1;
    do {
      bw = Math.round(Math.max(iw * 1.8, 1000) * grow);
      bh = Math.round(Math.max(ih * 1.75, 700) * grow);
      ox = Math.round((bw - iw) / 2); oy = Math.round((bh - ih) / 2);
      slots = [];
      for (let y = tab; y + ph + tab <= bh; y += chh) {
        for (let x = tab; x + pw + tab <= bw; x += cw) {
          const overlaps = x + pw + 8 > ox && x - 8 < ox + iw && y + ph + 8 > oy && y - 8 < oy + ih;
          if (!overlaps) slots.push([x, y]);
        }
      }
      grow += 0.12;
    } while (slots.length < n && grow < 2);
    shuffle(slots);
    const pieces = [];
    for (let i = 0; i < n; i++) {
      const jitter = () => (Math.random() - 0.5) * tab * 0.3;
      const [x, y] = slots[i] || [tab + Math.random() * (bw - pw - 2 * tab), tab + Math.random() * (bh - ph - 2 * tab)];
      pieces.push({ x: Math.round(x + jitter()), y: Math.round(y + jitter()), z: i, lock: false });
    }
    A.set('puzzle', { img, iw, ih, cols, rows, pw, ph, tab, hE, vE, bw, bh, ox, oy, pieces });
  }

  function loadPhoto(file, count) {
    const reader = new FileReader();
    reader.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 900 / Math.max(im.width, im.height));
        const w = Math.round(im.width * k), hgt = Math.round(im.height * k);
        const cv = h('canvas', { width: w, height: hgt });
        cv.getContext('2d').drawImage(im, 0, 0, w, hgt);
        const data = cv.toDataURL('image/jpeg', 0.82);
        const k2 = Math.min(1, 760 / w, 560 / hgt); // yapboz alanının mantıksal boyutu
        create(data, Math.round(w * k2), Math.round(hgt * k2), count);
      };
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function setupScreen(cancelable) {
    el.innerHTML = '';
    let count = 24;
    const countRow = h('div.bar', { style: { justifyContent: 'center' } },
      [12, 24, 48, 80].map((n) => h('button.size-btn' + (n === count ? '.on' : ''), {
        onclick: (e) => { count = n; for (const b of countRow.children) b.classList.remove('on'); e.target.classList.add('on'); },
      }, n + ' parça')));
    const file = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' },
      onchange: () => file.files[0] && loadPhoto(file.files[0], count) });
    el.append(h('div.game.setup', null, h('div.shell', null, h('div.core', null,
      h('h3', null, 'Yeni yapboz'),
      h('p', null, 'Bir fotoğrafınızı seçin ya da rastgele bir resim gelsin. Parçaları ikiniz aynı anda taşıyabilirsiniz.'),
      countRow,
      file,
      h('button.primary.big', { onclick: () => file.click() }, ic('image'), 'Fotoğraf seç'),
      h('button.big', { onclick: () => {
        const seed = Math.random().toString(36).slice(2, 8);
        create(`https://picsum.photos/seed/${seed}/760/520`, 760, 520, count);
      } }, ic('shuffle'), 'Rastgele resim'),
      cancelable ? h('button', { onclick: render, style: { justifyContent: 'center' } }, 'Vazgeç') : null))));
  }

  // ---------- Çizim ----------
  function placeNode(i) {
    const pz = P(), p = pz.pieces[i], n = nodes[i];
    if (!n) return;
    n.style.left = (p.x - pz.tab) + 'px';
    n.style.top = (p.y - pz.tab) + 'px';
    n.style.zIndex = p.lock ? 0 : p.z + 1;
    n.classList.toggle('locked', !!p.lock);
  }

  function fit() {
    const pz = P();
    if (!pz || !stage) return;
    scale = stage.clientWidth / pz.bw;
    stage.style.height = Math.round(pz.bh * scale) + 'px';
    board.style.transform = `scale(${scale})`;
  }

  function lockedCount() { return P().pieces.filter((p) => p.lock).length; }

  function render() {
    const pz = P();
    el.innerHTML = '';
    nodes.length = 0;
    if (!pz) { setupScreen(false); return; }
    const total = pz.pieces.length;
    const info = h('span#pz-info', null, `${lockedCount()} / ${total} parça yerinde`);
    stage = h('div.pz-stage');
    board = h('div.pz-board', { style: { width: pz.bw + 'px', height: pz.bh + 'px' } });
    board.append(h('div.pz-frame', { style: { left: pz.ox + 'px', top: pz.oy + 'px', width: pz.iw + 'px', height: pz.ih + 'px' } }));
    if (ghost) board.append(h('div.pz-ghost', { style: { left: pz.ox + 'px', top: pz.oy + 'px', width: pz.iw + 'px', height: pz.ih + 'px', backgroundImage: `url("${pz.img}")` } }));
    pz.pieces.forEach((p, i) => {
      const r = Math.floor(i / pz.cols), c = i % pz.cols;
      const inner = h('div', { style: {
        backgroundImage: `url("${pz.img}")`,
        backgroundSize: `${pz.iw}px ${pz.ih}px`,
        backgroundPosition: `${pz.tab - c * pz.pw}px ${pz.tab - r * pz.ph}px`,
        clipPath: `path('${piecePath(pz, r, c)}')`,
      } });
      const n = h('div.pz-piece', { style: { width: (pz.pw + 2 * pz.tab) + 'px', height: (pz.ph + 2 * pz.tab) + 'px' } }, inner);
      inner.addEventListener('pointerdown', (e) => onDown(e, i));
      nodes[i] = n;
      board.append(n);
      placeNode(i);
    });
    stage.append(board);
    el.append(h('div.game', null,
      h('div.shell', null, h('div.core.status', null, info, h('span.spacer'),
        h('button', { onclick: () => { ghost = !ghost; render(); } }, ic(ghost ? 'eye-slash' : 'eye'), ghost ? 'İpucunu gizle' : 'İpucu'),
        h('button', { onclick: () => setupScreen(true) }, ic('puzzle-piece'), 'Yeni yapboz'))),
      stage));
    fit();
  }

  // ---------- Sürükleme ----------
  function onDown(e, i) {
    const pz = P(), p = pz.pieces[i];
    if (p.lock) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = board.getBoundingClientRect();
    const mx = (e.clientX - r.left) / scale, my = (e.clientY - r.top) / scale;
    const z = Math.max(...pz.pieces.map((q) => q.z)) + 1;
    dragging = { i, dx: mx - p.x, dy: my - p.y, z, target: e.currentTarget };
    nodes[i].classList.add('dragging');
    p.z = z; placeNode(i);
    e.currentTarget.onpointermove = onMove;
    e.currentTarget.onpointerup = e.currentTarget.onpointercancel = onUp;
  }
  function onMove(e) {
    if (!dragging) return;
    const pz = P(), p = pz.pieces[dragging.i];
    const r = board.getBoundingClientRect();
    const mx = (e.clientX - r.left) / scale, my = (e.clientY - r.top) / scale;
    p.x = Math.round(Math.max(-pz.pw / 2, Math.min(pz.bw - pz.pw / 2, mx - dragging.dx)));
    p.y = Math.round(Math.max(-pz.ph / 2, Math.min(pz.bh - pz.ph / 2, my - dragging.dy)));
    placeNode(dragging.i);
    if (!sendTimer) sendTimer = setTimeout(() => {
      sendTimer = null;
      if (dragging) { const q = pz.pieces[dragging.i]; Net.send({ t: 'pz', i: dragging.i, x: q.x, y: q.y, z: q.z, drag: 1 }); }
    }, 50);
  }
  function onUp() {
    if (!dragging) return;
    const { i, target } = dragging;
    target.onpointermove = target.onpointerup = target.onpointercancel = null;
    dragging = null;
    clearTimeout(sendTimer); sendTimer = null;
    const pz = P(), p = pz.pieces[i];
    const r = Math.floor(i / pz.cols), c = i % pz.cols;
    const cx = pz.ox + c * pz.pw, cy = pz.oy + r * pz.ph;
    const snap = Math.hypot(p.x - cx, p.y - cy) < Math.min(pz.pw, pz.ph) * 0.28;
    nodes[i] && nodes[i].classList.remove('dragging');
    A.act({ t: 'pz', i, x: snap ? Math.round(cx) : p.x, y: snap ? Math.round(cy) : p.y, z: p.z, lock: snap });
  }

  function onPiece(msg, remote) {
    const pz = P();
    if (!pz || !nodes[msg.i]) return;
    if (dragging && dragging.i === msg.i && remote) return; // ben tutuyorum
    placeNode(msg.i);
    nodes[msg.i].classList.toggle('remote', remote && !!msg.drag);
    const info = $('#pz-info');
    const done = lockedCount();
    if (info) info.textContent = `${done} / ${pz.pieces.length} parça yerinde`;
    if (msg.lock && done === pz.pieces.length) {
      toast('Yapboz tamamlandı!', 3500);
      if (!remote) A.act({ t: 'heart' });
    }
  }

  Games.puzzle = {
    id: 'puzzle', title: 'Yapboz', icon: 'puzzle-piece', desc: 'Kendi fotoğrafınızla, aynı anda',
    status(S) {
      const pz = S.puzzle;
      if (!pz) return { text: "Henüz yapboz seçilmedi" };
      const done = pz.pieces.filter((p) => p.lock).length;
      return { denom: [`${done}/${pz.pieces.length}`, 'PARÇA'], text: done === pz.pieces.length ? "Tamamlandı" : 'Parçalar masada' };
    },
    reduce(S, msg) {
      if (msg.t !== 'pz' || !S.puzzle) return;
      const p = S.puzzle.pieces[msg.i];
      if (!p || (p.lock && !msg.lock)) return;
      Object.assign(p, { x: msg.x, y: msg.y, z: msg.z, lock: !!msg.lock });
    },
    onMsg(msg, remote) {
      if (msg.t === 'pz') onPiece(msg, remote);
      else if (msg.t === 'set' && msg.k === 'puzzle') render();
    },
    mount(e, app) {
      el = e; A = app;
      onResize = () => fit();
      addEventListener('resize', onResize);
      render();
    },
    render() { if (el) render(); },
    unmount() { removeEventListener('resize', onResize); el = null; stage = null; dragging = null; },
  };

  // Sürükleme sırasındaki ara mesajlar (drag:1) Net.send ile doğrudan gider; App.apply bunları da reduce eder.
})();

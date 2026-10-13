// Uygulama çekirdeği: oda, ortak durum, menü, sohbet.
// Ortak durum (S) iki cihazda da aynı tutulur. Her değişiklik bir mesajdır:
// önce yerelde uygulanır, sonra karşıya gönderilir; karşı taraf aynı şekilde uygular.
// Test için: ?local=a / ?local=b (ya da ?p=b) sekmeleri birbirinin kaydını ezmesin
const _qs = new URLSearchParams(location.search);
const STORE_KEY = 'ikimiz:v1' + (_qs.get('local') || _qs.get('p') || '');
const Games = window.Games || (window.Games = {});

const App = {
  S: null,
  seat: 0,          // 0 = odayı kuran, 1 = katılan
  name: '',
  current: null,    // açık oyun modülü
  unread: 0,

  get other() { return 1 - this.seat; },
  nameOf(seat) { return this.S.names[seat] || (seat === 0 ? 'Oyuncu 1' : 'Oyuncu 2'); },

  // Yerelde uygula + karşıya gönder
  act(msg) { this.apply(msg, false); Net.send(msg); },
  set(k, v) { this.act({ t: 'set', k, v }); },
};

function freshState() {
  return { view: 'menu', names: ['', ''], chat: [], draw: { strokes: [], game: null } };
}

// ---------- Kalıcılık ----------
function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 600);
}
// Sayfa kapanırken bekleyen kayıt kaybolmasın
addEventListener('pagehide', () => { if (saveTimer) saveNow(); });
function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!App.S) return;
  {
    const st = loadStore();
    st.name = App.name;
    st.role = App.seat === 0 ? 'host' : 'guest';
    st.code = Net.code;
    st.pass = App.pass;
    st.state = App.S;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); }
    catch (e) {
      // Kota dolduysa büyük parçaları (yapboz resmi, çizimler) dışarıda bırak
      const slim = { ...App.S, puzzle: null, draw: { strokes: [], game: App.S.draw.game } };
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...st, state: slim })); } catch (e2) {}
    }
  }
}

// ---------- Mesajları uygulama ----------
App.apply = function (msg, remote) {
  const S = this.S;
  // Gerçek zamanlı oyun mesajları (saniyede birçok kez): kaydedilmez, doğrudan oyuna gider
  if (msg.t === 'rt') {
    const g = Games[msg.g];
    if (g && g.onRealtime) g.onRealtime(msg, remote);
    return;
  }
  switch (msg.t) {
    case 'hello': // misafir bağlandı → ev sahibi şifreyi kontrol eder, doğruysa tüm durumu yollar
      if (this.seat === 0) {
        if (this.pass && msg.pass !== this.pass) {
          Net.send({ t: 'denied' });
          setTimeout(() => Net.kick(), 300);
          return;
        }
        this.authed = true;
        toast(`${msg.name} bağlandı.`);
      }
      S.names[1] = msg.name;
      if (S.view === 'menu') setTimeout(() => route(true));
      if (this.seat === 0) Net.send({ t: 'sync', state: S });
      break;
    case 'denied': // misafir: şifre yanlış
      Net.stop();
      {
        const s = loadStore(); delete s.code; delete s.role; delete s.state; delete s.pass;
        try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
      }
      show('start');
      $('#start-msg').textContent = 'Oda şifresi yanlış. Şifreyi kontrol edip tekrar katıl.';
      $('#in-pass').focus();
      return;
    case 'sync':
      this.S = msg.state;
      this.S.names[1] = this.name;
      route(true);
      save();
      updatePresence();
      return;
    case 'set':
      S[msg.k] = msg.v;
      if (msg.k === 'view') { route(); save(); return; }
      markMove(SET_TO_GAME[msg.k], remote);
      break;
    case 'chat':
      S.chat.push(msg.m);
      if (S.chat.length > 300) S.chat.splice(0, S.chat.length - 300);
      renderChat();
      if (remote && $('#chat').classList.contains('hidden')) {
        this.unread++; updateBadge();
        toast(`${msg.m.n}: ${msg.m.x}`);
      }
      break;
    case 'heart':
      hearts();
      break;
    case 'name': // biri adını değiştirdi
      S.names[msg.s] = msg.n;
      if (remote) toast(`Karşı taraf artık "${msg.n}"`);
      if (S.view === 'menu') setTimeout(() => route(true));
      break;
    default:
      // Oyunlara özel artımlı mesajlar (çizim noktaları, yapboz parçaları…)
      for (const g of Object.values(Games)) g.reduce && g.reduce(S, msg);
      if (msg.t === 'yt') markMove('watch', remote);
      if (msg.t === 'pz' && !msg.drag) markMove('puzzle', remote);
      if (msg.t === 'dclear' || msg.t === 'dpt') markMove('draw', remote);
  }
  save();
  updatePresence();
  updateNav();
  if (this.current) {
    if (this.current.onMsg) this.current.onMsg(msg, remote);
    else if (msg.t === 'set' && this.current.keys && this.current.keys.includes(msg.k)) this.current.render();
    if (msg.t !== 'dpt' && !(msg.t === 'pz' && msg.drag)) renderArena();
  } else if (S.view === 'menu' && msg.t !== 'dpt' && !(msg.t === 'pz' && msg.drag)) {
    // Menüde pulların durum satırı canlı kalsın
    clearTimeout(menuTimer);
    menuTimer = setTimeout(() => { if (App.S.view === 'menu') route(true); }, 250);
  }
};

// Her hamlede ilgili pula damga: zaman ve kimden geldiği
const SET_TO_GAME = { tavla: 'tavla', dama: 'dama', trash: 'trash', puzzle: 'puzzle', yt: 'watch', drawGame: 'draw', kizma: 'kizma', uno: 'uno', cook: 'cook', spear: 'spear', kimim: 'kimim' };
let menuTimer = null;
App.lastPost = null; // { id, at } yalnızca karşıdan gelen son hamle (damga "tak" animasyonu için)
function markMove(id, remote) {
  if (!id) return;
  const S = App.S;
  S.posted = S.posted || {};
  S.posted[id] = { at: Date.now(), by: remote ? App.other : App.seat };
  if (remote) App.lastPost = { id, at: Date.now() };
}

// ---------- Ekranlar ----------
function show(screen) {
  for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
  $('#screen-' + screen).classList.remove('hidden');
}

function route(force) {
  const view = App.S.view || 'menu';
  const viewEl = $('#view');
  if (!force && App.current && App.current.id === view) return;
  if (!force && !App.current && view === 'menu' && viewEl.dataset.view === 'menu') return;
  if (App.current && App.current.unmount) App.current.unmount();
  App.current = null;
  viewEl.innerHTML = '';
  viewEl.dataset.view = view;
  const g = Games[view];
  // Menü başlığında açık sayfayı işaretle
  for (const a of document.querySelectorAll('#mainnav button')) {
    a.classList.toggle('on', a.dataset.id === view);
    if (a.dataset.id === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  if (!g) { renderMenu(viewEl); return; }
  // Oyun ekranı: solda skor tablosu, ortada çerçeveli masa, sağda sohbet ve kurallar
  const main = h('div.arena-main', null, ['tl', 'tr', 'bl', 'br'].map((p) => h('span.arena-corner.' + p, { html: ROZET_SVG })));
  const stage = h('div.arena-stage');
  main.append(stage);
  viewEl.append(h('div.arena', null, h('aside.arena-left#arena-left', { 'aria-label': 'Skor tablosu' }), main,
    h('aside.arena-right#arena-right', { 'aria-label': 'Sohbet ve kurallar' })));
  App.current = g;
  g.mount(stage, App);
  renderArena(true);
}

// ---------- Oyun ekranı yan panelleri ----------
const RULES = {
  draw: ['İkiniz aynı anda çizebilirsiniz.', 'Çiz & Tahmin Et: biri gizli kelimeyi çizer, diğeri tahmin eder; bilen ikinize de puan.'],
  trash: ['Desteden ya da yerden kart al, yuvasına (A-10) koy; altından çıkanla devam et.', 'K joker; J ve Q sırayı bitirir.', 'Eli bitiren bir sonraki elde bir kart eksik alır.'],
  puzzle: ['Parçaları sürükle; doğru yere yaklaşınca oturur.', 'İkiniz aynı anda taşıyabilirsiniz.'],
  watch: ['Linki yapıştır, ikinizde aynı anda açılır.', 'Durdurma ve ileri sarma iki tarafta eşitlenir.'],
  tavla: ['Zar at, pul seç, gideceği yere tıkla.', 'Kırılan pul önce bardan girer.', 'Rakip hiç pul toplamadan bitirirsen mars: 2 puan.'],
  dama: ['Taşlar ileri ve yana gider; yemek zorunludur.', 'En çok taş alan hamle seçilmeli.', 'Son sıraya ulaşan dama olur, uzağa gider.'],
  kizma: ['Piyon çıkarmak için 6 lazım; 6 atınca tekrar at.', 'Rakibin üstüne gelirsen onu evine yollarsın.', '4 piyonunu ilk bitiren kazanır.'],
  uno: ['Renk ya da sayı tut; +2, +4, Atla ve Yön sonrası sıra sende kalır.', '2 kartın kalınca UNO! demeyi unutma.'],
  cook: ['WASD/oklar yürü, Boşluk al/bırak, E doğra.', '3 sebzeyi doğrayıp tencereye at, pişince tabağa al, servise götür.', 'Bekletirsen yanar!'],
  spear: ['Alana tıklayıp sürükle ya da kaydırıcılarla nişan al: yön açı, uzaklık güç.', 'Klavye: ↑↓ açı, W/S güç, ←→ yürü, Boşluk fırlat.', 'Rüzgâr mızrağı saptırır; tam isabet 50 can götürür.'],
  kimim: ['Alnındaki kartı göremezsin, onunkini görürsün.', 'Sırayla evet/hayır soruları sorun.', 'Tahminini yaz; bilen turu kazanır.'],
};

function gameScore(id) {
  const S = App.S;
  if (id === 'draw') return S.drawGame ? S.drawGame.scores : null;
  if (id === 'cook') return null;
  const st = S[id === 'watch' ? 'yt' : id];
  return st && Array.isArray(st.score) ? st.score : null;
}
function gameTurn(id) {
  const S = App.S;
  if (id === 'draw') return S.drawGame ? S.drawGame.drawer : null;
  const st = S[id];
  if (!st || st.winner != null || st.phase === 'over') return null;
  if (id === 'kimim' && st.pending) return 1 - st.pending.s;
  return typeof st.turn === 'number' ? st.turn : null;
}

let arenaChatKey = '';
function renderArena(force) {
  const left = $('#arena-left'), right = $('#arena-right');
  if (!left || !App.current) return;
  const id = App.current.id, g = App.current, S = App.S;
  const st = (g.status && g.status(S, App)) || {};
  const score = gameScore(id), turn = gameTurn(id);
  const lead = score && score[0] !== score[1] ? (score[0] > score[1] ? 0 : 1) : null;
  const card = (s) => {
    const me = s === App.seat;
    const online = me || Net.connected;
    return h('div.sb-player' + (turn === s ? '.turn' : ''), { style: { '--ink': `var(--p${s})` } },
      h('div.sb-avatar', null, (App.nameOf(s)[0] || '?').toLocaleUpperCase('tr'), lead === s ? h('span.sb-crown', null, ic('crown-simple', 'fill')) : null),
      h('div.sb-who', null,
        h('b', null, App.nameOf(s)),
        h('small', null, h('span.dot' + (online ? '' : '.off')), me ? ' sen' : (Net.connected ? ' bağlı' : ' çevrimdışı'))),
      score ? h('div.sb-score', null, score[s]) : null,
      turn === s ? h('div.sb-turn', null, me ? 'Sıra sende' : 'Sırası') : null);
  };
  left.innerHTML = '';
  left.append(
    h('div.sb-head', null, h('span.sb-icon', null, ic(g.icon)), h('h2', null, g.title)),
    h('div.sb-players', null, card(App.seat), h('div.sb-vs', null, 'VS'), card(App.other)),
    h('div.sb-status' + (st.mine ? '.mine' : ''), null, st.mine ? `Sıra sende. ${st.text || ''}` : (st.text || '')),
    st.denom ? h('div.sb-denom', null, h('b', null, st.denom[0]), h('small', null, st.denom[1])) : null,
    h('button.sb-home', { onclick: () => App.set('view', 'menu') }, ic('house'), 'Ana sayfa'));

  // Sağ panel: mini sohbet (yalnızca değişince yeniden çizilir, yazılan mesaj kaybolmasın) ve kurallar
  const ck = JSON.stringify([id, S.chat.length, S.chat.length && S.chat[S.chat.length - 1].ts]);
  if (!force && ck === arenaChatKey && right.childElementCount) return;
  arenaChatKey = ck;
  const typed = right.querySelector('input') ? right.querySelector('input').value : '';
  right.innerHTML = '';
  const log = h('div.ap-log', null, S.chat.length ? S.chat.slice(-8).map((m) =>
    h('p', null, h('b.ink' + m.s, null, m.n + ': '), m.x)) : h('p.muted', null, 'Henüz mesaj yok.'));
  const inp = h('input', { placeholder: 'Mesaj yaz…', 'aria-label': 'Mesaj', value: typed, maxLength: 200 });
  const send = () => { const x = inp.value.trim(); if (x) { inp.value = ''; if (!(App.current && App.current.onChat && App.current.onChat(x))) App.say(x); } };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.stopPropagation(); send(); } });
  for (const t of ['keydown', 'keyup']) inp.addEventListener(t, (e) => e.stopPropagation()); // oyun tuşlarına karışmasın
  right.append(
    h('section.ap-box', null, h('h3', null, ic('chat-circle'), 'Sohbet'), log,
      h('div.ap-react', null, ['😂', '😍', '👏', '😮', '😤'].map((e) => h('button', { onclick: () => App.say(e), 'aria-label': 'Tepki ' + e }, e)),
        h('button', { onclick: () => App.act({ t: 'heart' }), 'aria-label': 'Kalp gönder' }, ic('heart', 'fill'))),
      h('div.ap-send', null, inp, h('button.primary', { onclick: send, 'aria-label': 'Gönder' }, ic('paper-plane-tilt')))),
    RULES[id] ? h('section.ap-box', null, h('h3', null, ic('book-open'), 'Kurallar'),
      h('ul.ap-rules', null, RULES[id].map((r) => h('li', null, r)))) : null);
  log.scrollTop = log.scrollHeight;
}

// Menü başlığı: her aktivite bir menü öğesi; sıra sendeyse küçük bir nokta
function buildNav() {
  const nav = $('#mainnav');
  nav.innerHTML = '';
  for (const [id, g] of Object.entries(Games)) {
    nav.append(h('button.nav-item', { 'data-id': id, onclick: () => App.set('view', id), title: g.title },
      ic(g.icon), h('span', null, ({ draw: 'Çiz', watch: 'İzle', kizma: 'Kızma', cook: 'Mutfak', spear: 'Mızrak', kimim: 'Kimim' })[id] || g.title), h('span.nav-dot')));
  }
  updateNav();
}
function updateNav() {
  for (const a of document.querySelectorAll('#mainnav button')) {
    const g = Games[a.dataset.id];
    const st = g.status && g.status(App.S, App);
    a.classList.toggle('mine', !!(st && st.mine));
  }
}

// Aktivite satırı: solda kemerli çizim, ortada ad ve açıklama, sağda canlı durum ve son hamle rozeti.
function actRow(id, g) {
  const S = App.S;
  const st = (g.status && g.status(S, App)) || { text: g.desc };
  const post = S.posted && S.posted[id];
  const fresh = App.lastPost && App.lastPost.id === id && Date.now() - App.lastPost.at < 4000;
  return h('li', null, h('button.act-row', { onclick: () => App.set('view', id), 'aria-label': `${g.title}: ${st.text}` },
    h('div.act-art', { html: ART[id] || '' }),
    h('div.act-text', null,
      h('div.act-name', null, g.title),
      h('div.act-desc', null, g.desc),
      h('div.act-status' + (st.mine ? '.mine' : ''), null, st.mine ? `Sıra sende. ${st.text}` : st.text)),
    h('div.act-meta', null,
      st.denom ? h('div.deger', null, st.denom[0], h('small', null, st.denom[1])) : null,
      post ? rozet(post.at, { by: post.by, fresh }) : null),
    h('span.act-go', null, ic('caret-right'))));
}

// "Kaldığın yerden devam": en son hamle yapılan aktivite, yoksa sırası sende olan
function lastActivity() {
  const S = App.S;
  const mine = Object.entries(Games).find(([, g]) => { const st = g.status && g.status(S, App); return st && st.mine; });
  if (mine) return mine[0];
  const posted = Object.entries(S.posted || {}).sort((a, b) => b[1].at - a[1].at)[0];
  return posted ? posted[0] : null;
}

function renderMenu(el) {
  const S = App.S, me = App.seat, you = App.other;
  const pn = S.names[you];
  const cont = lastActivity();
  const recent = S.chat.slice(-2);
  el.append(h('div.home', null,
    // Karşılama: solda metin ve eylemler, sağda çini kemerli pencere
    h('section.hero', null,
      h('div.hero-text', null,
        h('h1', null, pn ? `Bu akşam ne yapalım, ${pn}?` : `Hoş geldin, ${App.name}.`),
        h('p.hero-sub', null, Net.connected
          ? 'Menüden ya da aşağıdan bir aktivite seç; ikinizde de aynı anda açılır.'
          : (App.seat === 1 ? `Oda ${Net.code} için bağlanılıyor… Odayı kuran kişinin sayfası açık olmalı.` : `Odan hazır (kod ${Net.code}). Davet linkini gönder. Karşı tarafın ekranında farklı bir oda kodu görünüyorsa o başka bir odadadır: sağ üstteki bağlantı düğmesinden "Odadan çık" deyip senin linkinle girsin.`)),
        h('div.hero-actions', null,
          Net.connected && cont
            ? h('button.primary.big', { onclick: () => App.set('view', cont) }, ic(Games[cont].icon), `Devam et: ${Games[cont].title}`)
            : null,
          h('button.big' + (Net.connected ? '' : '.primary'), { onclick: invite }, ic('link-simple'), Net.connected ? 'Davet linki' : 'Davet linkini gönder')),
        h('dl.hero-room', null,
          h('div', null, h('dt', null, 'Oda'), h('dd', null, h('code', null, Net.code))),
          h('div', null, h('dt', null, 'Siz'), h('dd', null,
            h('span', { style: { color: `var(--p${me})` } }, App.name), ' & ',
            h('span', { style: { color: `var(--p${you})` } }, pn || 'henüz kimse'))),
          h('div', null, h('dt', null, 'Rolün'), h('dd', null, App.seat === 0 ? 'Odanın sahibi' : 'Misafir')),
          h('div', null, h('dt', null, 'Durum'), h('dd', null, h('span.dot' + (Net.connected ? '' : '.off')), Net.connected ? (Net.mode === 'relay' ? ' bağlı (aktarma)' : ' bağlı') : ' çevrimdışı'))),
        recent.length ? h('div.hero-msgs', null,
          recent.map((m) => h('p', null, h('b.ink' + m.s, null, m.n + ': '), m.x)),
          h('button.linkish', { onclick: () => $('#btn-chat').click() }, 'Sohbeti aç')) : null),
      h('div.hero-art', { html: ART.hero })),
    // Aktiviteler: kart değil, görselli satırlar
    h('section.acts', null,
      h('h2.acts-title', null, 'Aktiviteler'),
      h('ul.act-list', null, Object.entries(Games).map(([id, g]) => actRow(id, g))))));
}

// ---------- Sohbet ----------
function renderChat() {
  const log = $('#chat-log');
  log.innerHTML = '';
  if (!App.S.chat.length) log.append(h('div.chat-empty', null, 'Henüz mesaj yok. İlk mesajı sen yaz.'));
  for (const m of App.S.chat.slice(-150)) {
    const me = m.s === App.seat;
    log.append(h('div.bubble' + (me ? '.me' : ''), null,
      me ? null : h('small', null, m.n), m.x));
  }
  log.scrollTop = log.scrollHeight;
}
function updateBadge() {
  const b = $('#chat-badge');
  b.textContent = App.unread;
  b.classList.toggle('hidden', !App.unread);
}
App.say = (text) => {
  App.act({ t: 'chat', m: { s: App.seat, n: App.name, x: text, ts: Date.now() } });
};

function hearts() {
  const box = $('#hearts');
  for (let i = 0; i < 8; i++) {
    // Kalpler iki mürekkeple: mavi ve kırmızı
    const el = h('div.heart', { style: { left: (10 + Math.random() * 80) + '%', animationDelay: (i * 0.12) + 's', color: `var(--p${i % 2})` } },
      ic('heart', 'fill'));
    box.append(el);
    setTimeout(() => el.remove(), 3200);
  }
}

// ---------- Bağlantı durumu ----------
function updatePresence() {
  const on = Net.connected;
  $('#partner-dot').classList.toggle('off', !on);
  const pn = App.S.names[App.other];
  const me = $('#me-name');
  me.textContent = App.name;
  me.style.color = `var(--p${App.seat})`;
  const you = $('#partner-name');
  you.textContent = on ? (pn || 'bağlı') : (pn ? pn + ' (çevrimdışı)' : (App.seat === 1 ? 'bağlanılıyor…' : 'bekleniyor…'));
  you.style.color = `var(--p${App.other})`;
  renderArena();
}

function inviteLink() {
  const u = new URL(location.href);
  // Şifre linkin # kısmında: sunuculara hiç gitmez, linke tıklayan doğrudan girer
  u.hash = Net.code + (App.pass ? '~' + encodeURIComponent(App.pass) : '');
  return u.toString();
}
async function invite() {
  const link = inviteLink();
  if (navigator.share) {
    try { await navigator.share({ title: 'İkimiz', text: 'Gel, birlikte oynayalım.', url: link }); return; } catch (e) {}
  }
  try { await navigator.clipboard.writeText(link); toast('Link kopyalandı'); }
  catch (e) { prompt('Bu linki gönder:', link); }
}

// ---------- Başlatma ----------
function genCode() {
  const ch = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => ch[Math.floor(Math.random() * ch.length)]).join('');
}

function enterRoom(role, code, savedState, pass) {
  App.seat = role === 'host' ? 0 : 1;
  App.pass = pass || '';
  App.authed = false;
  App.S = savedState || freshState();
  App.S.names[App.seat] = App.name;
  if (!App.S.draw) App.S.draw = { strokes: [], game: null };
  // "Sıra sende" gibi ipuçları izleyenin kendi mürekkebiyle yazılır
  document.documentElement.style.setProperty('--me', `var(--p${App.seat})`);

  Net.onMessage = (msg) => {
    // Ev sahibi, şifreyi doğrulamamış bir bağlantıdan selamdan başka mesaj kabul etmez
    if (App.seat === 0 && !App.authed && msg.t !== 'hello') return;
    App.apply(msg, true);
  };
  Net.onOpen = () => {
    if (App.seat === 1) Net.send({ t: 'hello', name: App.name, pass: App.pass });
    updatePresence();
    if (App.S.view === 'menu') route(true);
  };
  Net.onClose = () => {
    App.authed = false;
    updatePresence(); toast('Bağlantı koptu, bekleniyor…');
    if (App.S.view === 'menu') route(true);
  };
  Net.onError = (t) => { $('#partner-name').textContent = t.length > 40 ? 'bağlanılıyor…' : t; toast(t, 3500); };

  buildNav();
  if (role === 'host') Net.host(code, App.pass); else Net.join(code, App.pass);
  history.replaceState(null, '', location.pathname + location.search + '#' + code);
  show('room');
  renderChat();
  route(true);
  updatePresence();
  save();
}

// Oda içindeyken adı değiştir; karşı tarafa da gider ve kaydedilir
function askName() {
  const bg = h('div.modal-bg');
  const close = () => bg.remove();
  const inp = h('input', { value: App.name, maxLength: 20, 'aria-label': 'Yeni adın', autocomplete: 'nickname' });
  const msg = h('p.msg');
  const ok = () => {
    const n = inp.value.trim();
    if (!n) { msg.textContent = 'Adın boş olamaz.'; return; }
    App.name = n;
    App.act({ t: 'name', s: App.seat, n });
    saveNow();
    updatePresence();
    close();
    toast(`Adın artık "${n}"`);
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
  bg.append(h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, h('div.core', null,
    h('h2', null, 'Adını değiştir'), inp, msg,
    h('div.row', null, h('button.primary', { onclick: ok }, 'Kaydet'), h('button', { onclick: close }, 'Vazgeç')))));
  document.body.append(bg);
  inp.focus(); inp.select();
}

function boot() {
  $('#brand-rozet').innerHTML = ROZET_SVG;
  $('#top-rozet').innerHTML = ROZET_SVG;
  $('#btn-home').onclick = () => App.set('view', 'menu');
  $('#me-name').onclick = () => { if (App.S) askName(); };
  $('#me-name').title = 'Adını değiştir';
  const st = loadStore();
  // Davet linki: #KOD~şifre
  const [rawCode = '', rawPass = ''] = location.hash.slice(1).split('~');
  const hashCode = rawCode.toUpperCase();
  let hashPass = '';
  try { hashPass = decodeURIComponent(rawPass); } catch (e) {}
  $('#in-name').value = st.name || '';
  if (hashCode) $('#in-code').value = hashCode;
  if (hashPass) $('#in-pass').value = hashPass;

  // Davet linkiyle gelindiyse yalnızca "Odaya katıl" görünsün (yanlışlıkla ikinci bir oda kurulmasın)
  const setInviteMode = (on) => {
    $('#invite-note').classList.toggle('hidden', !on);
    $('#btn-join-invite').classList.toggle('hidden', !on);
    $('#btn-newroom').classList.toggle('hidden', !on);
    for (const s of ['#btn-host', '#or-line', '#join-row']) $(s).classList.toggle('hidden', on);
    $('#pass-label').classList.toggle('hidden', on && !!hashPass);
    $('#in-pass').placeholder = on ? 'Davet edenin verdiği şifre' : 'Odayı kuruyorsan belirle, katılıyorsan yaz';
  };
  if (hashCode) {
    $('#invite-note').textContent = `Bir odaya davet edildin (oda ${hashCode}). Adını yaz ve katıl.`;
    setInviteMode(true);
  }
  $('#btn-newroom').onclick = () => {
    setInviteMode(false);
    $('#in-pass').value = '';
    history.replaceState(null, '', location.pathname + location.search);
  };

  const needName = () => {
    const n = $('#in-name').value.trim();
    if (!n) { $('#start-msg').textContent = 'Önce adını yaz.'; $('#in-name').focus(); return null; }
    App.name = n;
    return n;
  };

  $('#btn-host').onclick = () => {
    if (!needName()) return;
    const resume = st.role === 'host' && st.code;
    const pass = $('#in-pass').value.trim() || (resume ? st.pass : '');
    if (!pass) { $('#start-msg').textContent = 'Odan için bir şifre belirle.'; $('#in-pass').focus(); return; }
    enterRoom('host', resume ? st.code : genCode(), resume ? st.state : null, pass);
  };
  $('#btn-join').onclick = () => {
    if (!needName()) return;
    const code = $('#in-code').value.trim().toUpperCase();
    if (code.length < 4) { $('#start-msg').textContent = 'Oda kodunu yaz.'; return; }
    const same = st.role === 'guest' && st.code === code;
    const pass = $('#in-pass').value.trim() || (same ? st.pass : '');
    if (!pass) { $('#start-msg').textContent = 'Odanın şifresini yaz.'; $('#in-pass').focus(); return; }
    enterRoom('guest', code, same ? st.state : null, pass);
  };
  $('#btn-join-invite').onclick = () => $('#btn-join').onclick();
  $('#in-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') (hashCode && !$('#btn-join-invite').classList.contains('hidden') ? $('#btn-join-invite') : $('#btn-host')).click();
  });

  // Kaldığın yerden devam: aynı oda varsa doğrudan gir; davet linkiyle gelen şifreyle katılır
  if (st.name && st.code && (!hashCode || hashCode === st.code)) {
    App.name = st.name;
    enterRoom(st.role, st.code, st.state, hashPass || st.pass);
  } else if (st.name && hashCode && hashPass) {
    App.name = st.name;
    enterRoom('guest', hashCode, null, hashPass);
  }

  $('#btn-back').onclick = () => App.set('view', 'menu');
  $('#btn-invite').onclick = () => {
    modal('Oda ' + Net.code, 'Davet linkini paylaşabilir, adını değiştirebilir ya da odadan çıkabilirsin.', [
      ['Linki paylaş', invite, 'primary'],
      ['Adını değiştir', askName],
      ['Odadan çık', () => {
        const s = loadStore(); delete s.code; delete s.role; delete s.state;
        localStorage.setItem(STORE_KEY, JSON.stringify(s));
        location.href = location.pathname + location.search;
      }],
      ['Kapat'],
    ]);
  };
  $('#btn-heart').onclick = () => App.act({ t: 'heart' });
  $('#btn-chat').onclick = () => {
    $('#chat').classList.toggle('hidden');
    App.unread = 0; updateBadge(); renderChat();
    if (!$('#chat').classList.contains('hidden')) $('#chat-in').focus();
  };
  $('#btn-chat-close').onclick = () => $('#chat').classList.add('hidden');
  $('#chat-form').onsubmit = (e) => {
    e.preventDefault();
    const x = $('#chat-in').value.trim();
    if (!x) return;
    $('#chat-in').value = '';
    if (App.current && App.current.onChat && App.current.onChat(x)) return;
    App.say(x);
  };
}

boot();

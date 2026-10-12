// İki cihaz arasındaki bağlantı. İki yol var:
//  1) Doğrudan (eşler arası, PeerJS/WebRTC): en hızlısı. Ev sahibi "ikimiz-cg-<KOD>" kimliğiyle kaydolur.
//  2) Aktarma (MQTT): doğrudan yol 8 saniyede kurulamazsa misafir buna geçer. Ev sahibi her zaman dinler.
//     Herkese açık ücretsiz MQTT sunucuları kullanılır; bu yüzden her mesaj oda şifresinden türetilen
//     anahtarla uçtan uca şifrelenir (AES-GCM) ve kanal adı da şifreden türetilir.
// Adreste ?local varsa ikisi yerine BroadcastChannel kullanılır (aynı tarayıcıda iki sekmeyle test için).
const Net = (() => {
  const PREFIX = 'ikimiz-cg-';
  const local = new URLSearchParams(location.search).has('local');
  let peer = null, conn = null, bc = null;
  let isHost = false, code = '', pass = '', retryTimer = null, closed = false;
  let mode = null; // 'p2p' | 'relay'

  const api = {
    onMessage: () => {},   // (msg) => void
    onOpen: () => {},      // bağlantı kuruldu
    onClose: () => {},     // bağlantı koptu
    onError: () => {},     // (text) => void
    get isHost() { return isHost; },
    get code() { return code; },
    get mode() { return local ? 'local' : mode; },
    get connected() {
      if (local) return !!bc && api._localOpen;
      return (mode === 'p2p' && !!(conn && conn.open)) || (mode === 'relay' && relay.open);
    },
    _localOpen: false,
  };

  function send(msg) {
    if (local) { if (bc) bc.postMessage({ from: isHost ? 'h' : 'g', msg }); return; }
    if (mode === 'p2p' && conn && conn.open) conn.send(msg);
    else if (relay.open) relaySend(msg);
  }
  api.send = send;

  // ---------- BroadcastChannel (yerel test) ----------
  function localStart(asHost) {
    bc = new BroadcastChannel(PREFIX + code);
    const me = asHost ? 'h' : 'g';
    bc.onmessage = (e) => {
      const { from, msg } = e.data;
      if (from === me) return;
      if (msg.t === '__hello') {
        if (asHost) { api._localOpen = true; bc.postMessage({ from: me, msg: { t: '__hello' } }); api.onOpen(); }
        else if (!api._localOpen) { api._localOpen = true; api.onOpen(); }
        return;
      }
      if (msg.t === '__bye') { api._localOpen = false; api.onClose(); return; }
      if (msg.t === '__hostup') { if (!asHost) bc.postMessage({ from: me, msg: { t: '__hello' } }); api._localOpen = false; return; }
      api.onMessage(msg);
    };
    if (!asHost) bc.postMessage({ from: me, msg: { t: '__hello' } });
    else bc.postMessage({ from: me, msg: { t: '__hostup' } });
    addEventListener('beforeunload', () => bc.postMessage({ from: me, msg: { t: '__bye' } }));
  }

  // ---------- 1) Doğrudan bağlantı: PeerJS ----------
  const PEER_OPTS = {
    config: {
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
        { urls: 'stun:stun.cloudflare.com:3478' },
      ],
    },
  };
  let fallbackTimer = null;

  function attach(c) {
    if (conn && conn !== c) { try { conn.close(); } catch (e) {} }
    conn = c;
    c.on('open', () => {
      if (conn !== c) return;
      // Aktarma zaten kurulduysa doğrudan bağlantıya geçmeye gerek yok
      if (mode === 'relay' && relay.open) { try { c.close(); } catch (e) {} return; }
      clearTimeout(fallbackTimer);
      mode = 'p2p';
      api.onOpen();
    });
    c.on('data', (msg) => { if (conn === c && mode === 'p2p') api.onMessage(msg); });
    c.on('close', () => {
      if (conn !== c || mode !== 'p2p') return;
      mode = null;
      api.onClose();
      if (!isHost && !closed) { scheduleRetry(); armFallback(); }
    });
    c.on('error', () => {});
  }

  function scheduleRetry(ms = 2500) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connectToHost, ms);
  }

  function connectToHost() {
    if (!peer || peer.destroyed || closed || mode === 'relay') return;
    if (peer.disconnected) { peer.reconnect(); }
    attach(peer.connect(PREFIX + code, { reliable: true }));
  }

  // Misafir: doğrudan yol 8 saniyede açılmazsa aktarmaya geç
  function armFallback() {
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(() => {
      if (api.connected || closed) return;
      relay.wantJoin = true;
      relayJoinPing();
    }, 8000);
  }

  // ---------- 2) Aktarma: şifreli MQTT ----------
  const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
  const relay = {
    clients: [], open: false, wantJoin: false, key: null, inTopic: '', outTopic: '',
    lastSeen: 0, txq: Promise.resolve(), rxq: Promise.resolve(), seen: new Map(), parts: {}, beat: null,
  };
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (buf) => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  async function relayStart() {
    if (typeof mqtt === 'undefined' || !crypto.subtle || !pass) return;
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    relay.key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('ikimiz:' + code), iterations: 120000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(code + ':' + pass + ':ikimiz-kanal'));
    const hex = [...new Uint8Array(hash)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
    const root = 'ikimiz/v1/' + hex;
    relay.inTopic = root + (isHost ? '/h' : '/g');
    relay.outTopic = root + (isHost ? '/g' : '/h');
    // İki sunucuya birden bağlan: biri çalışmasa da diğeri taşır; mesajlar kimlikle tekilleştirilir
    for (const url of BROKERS) {
      try {
        const cl = mqtt.connect(url, { clientId: 'ikimiz_' + rid(), keepalive: 30, reconnectPeriod: 3000, connectTimeout: 8000, clean: true });
        cl.on('connect', () => cl.subscribe(relay.inTopic, { qos: 0 }));
        cl.on('message', (_t, payload) => onRelayRaw(payload.toString()));
        cl.on('error', () => {});
        relay.clients.push(cl);
      } catch (e) {}
    }
    clearInterval(relay.beat);
    relay.beat = setInterval(() => {
      if (relay.open) relaySendCtl('__ping');
      else if (relay.wantJoin) relayJoinPing();
      if (relay.open && Date.now() - relay.lastSeen > 15000) {
        relay.open = false;
        if (mode === 'relay') { mode = null; api.onClose(); if (!isHost) relay.wantJoin = true; }
      }
    }, 4000);
  }

  function relayJoinPing() { if (relay.key) relaySendCtl('__rjoin'); }
  function relaySendCtl(t) { relayPublish({ t }); }
  function relaySend(msg) { relayPublish(msg); }

  function relayPublish(obj) {
    relay.txq = relay.txq.then(async () => {
      if (!relay.key) return;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, relay.key, enc.encode(JSON.stringify(obj)));
      const data = new Uint8Array(12 + ct.byteLength);
      data.set(iv, 0); data.set(new Uint8Array(ct), 12);
      const d = b64(data);
      const m = rid();
      const CH = 48000; // büyük mesajlar (ör. yapboz fotoğrafı) parça parça gider
      const n = Math.ceil(d.length / CH) || 1;
      for (let i = 0; i < n; i++) {
        const piece = JSON.stringify(n === 1 ? { m, d } : { m, i, n, d: d.slice(i * CH, (i + 1) * CH) });
        for (const cl of relay.clients) if (cl.connected) cl.publish(relay.outTopic, piece, { qos: 0 });
      }
    }).catch(() => {});
  }

  function onRelayRaw(text) {
    let w;
    try { w = JSON.parse(text); } catch (e) { return; }
    const tag = w.m + ':' + (w.i || 0);
    if (relay.seen.has(tag)) return; // iki sunucudan gelen kopya
    relay.seen.set(tag, Date.now());
    if (relay.seen.size > 2000) { const cut = Date.now() - 60000; for (const [k, t] of relay.seen) if (t < cut) relay.seen.delete(k); }
    let d = w.d;
    if (w.n) {
      const p = relay.parts[w.m] || (relay.parts[w.m] = { got: 0, arr: new Array(w.n) });
      if (!p.arr[w.i]) { p.arr[w.i] = w.d; p.got++; }
      if (p.got < w.n) return;
      d = p.arr.join(''); delete relay.parts[w.m];
    }
    relay.rxq = relay.rxq.then(async () => {
      const bytes = unb64(d);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, relay.key, bytes.slice(12));
      onRelayMsg(JSON.parse(dec.decode(pt)));
    }).catch(() => {}); // şifre tutmayan (yanlış anahtar) mesajlar sessizce atılır
  }

  function onRelayMsg(msg) {
    relay.lastSeen = Date.now();
    if (msg.t === '__rjoin') { // ev sahibi: misafir aktarma üzerinden geldi
      if (!isHost) return;
      relaySendCtl('__rack');
      if (!relay.open) {
        relay.open = true;
        if (!(mode === 'p2p' && conn && conn.open)) { mode = 'relay'; api.onOpen(); }
      }
      return;
    }
    if (msg.t === '__rack') { // misafir: ev sahibi aktarmayı kabul etti
      if (isHost || relay.open) return;
      relay.open = true; relay.wantJoin = false;
      if (!(mode === 'p2p' && conn && conn.open)) {
        mode = 'relay';
        clearTimeout(retryTimer);
        api.onOpen();
      }
      return;
    }
    if (msg.t === '__ping') {
      if (!relay.open && isHost) { relay.open = true; if (mode !== 'p2p') { mode = 'relay'; api.onOpen(); } }
      return;
    }
    if (mode === 'relay') api.onMessage(msg);
  }

  // ---------- Dışa açık işlemler ----------
  api.host = (roomCode, roomPass) => {
    isHost = true; code = roomCode; pass = roomPass || '';
    if (local) { localStart(true); return; }
    const start = () => {
      peer = new Peer(PREFIX + code, PEER_OPTS);
      peer.on('connection', attach);
      peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer.reconnect(), 1500); });
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          api.onError('Oda kodu meşgul, tekrar deneniyor…');
          peer.destroy();
          setTimeout(start, 4000);
        }
      });
    };
    start();
    relayStart();
  };

  api.join = (roomCode, roomPass) => {
    isHost = false; code = roomCode; pass = roomPass || '';
    if (local) { localStart(false); return; }
    // Test için: ?relay → doğrudan yolu hiç denemeden aktarmayla bağlan
    if (new URLSearchParams(location.search).has('relay')) {
      relay.wantJoin = true;
      relayStart().then(relayJoinPing);
      return;
    }
    peer = new Peer(PEER_OPTS);
    peer.on('open', connectToHost);
    peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer.reconnect(), 1500); });
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        if (mode !== 'relay') api.onError('Odayı kuranın sayfası açık değil gibi görünüyor, tekrar deneniyor…');
        scheduleRetry(4000);
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        scheduleRetry(4000);
      }
    });
    armFallback();
    relayStart();
  };

  // Ev sahibi: şifresi tutmayan misafiri düşür
  api.kick = () => { if (conn) { try { conn.close(); } catch (e) {} } };
  // Misafir: şifre reddedildi, yeniden denemeyi bırak
  api.stop = () => {
    closed = true; clearTimeout(retryTimer); clearTimeout(fallbackTimer); clearInterval(relay.beat);
    try { if (peer) peer.destroy(); } catch (e) {}
    try { if (bc) bc.close(); } catch (e) {}
    for (const cl of relay.clients) { try { cl.end(true); } catch (e) {} }
  };

  return api;
})();

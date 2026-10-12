// İki cihaz arasında doğrudan (eşler arası) bağlantı.
// Ev sahibi "cg-<KOD>" kimliğiyle PeerJS'e kaydolur, misafir bu kimliğe bağlanır.
// Adreste ?local varsa PeerJS yerine BroadcastChannel kullanılır (aynı tarayıcıda iki sekmeyle test için).
const Net = (() => {
  const PREFIX = 'ikimiz-cg-';
  const local = new URLSearchParams(location.search).has('local');
  let peer = null, conn = null, bc = null;
  let isHost = false, code = '', retryTimer = null, closed = false;

  const api = {
    onMessage: () => {},   // (msg) => void
    onOpen: () => {},      // bağlantı kuruldu
    onClose: () => {},     // bağlantı koptu
    onError: () => {},     // (text) => void
    get isHost() { return isHost; },
    get code() { return code; },
    get connected() { return local ? !!bc && api._localOpen : !!(conn && conn.open); },
    _localOpen: false,
  };

  function send(msg) {
    if (local) { if (bc) bc.postMessage({ from: isHost ? 'h' : 'g', msg }); return; }
    if (conn && conn.open) conn.send(msg);
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

  // ---------- PeerJS ----------
  function attach(c) {
    if (conn && conn !== c) { try { conn.close(); } catch (e) {} }
    conn = c;
    c.on('open', () => { if (conn === c) api.onOpen(); });
    c.on('data', (msg) => { if (conn === c) api.onMessage(msg); });
    c.on('close', () => {
      if (conn !== c) return;
      api.onClose();
      if (!isHost && !closed) scheduleRetry();
    });
    c.on('error', () => {});
  }

  function scheduleRetry(ms = 2500) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connectToHost, ms);
  }

  function connectToHost() {
    if (!peer || peer.destroyed) return;
    if (peer.disconnected) { peer.reconnect(); }
    attach(peer.connect(PREFIX + code, { reliable: true }));
  }

  api.host = (roomCode) => {
    isHost = true; code = roomCode;
    if (local) { localStart(true); return; }
    const start = () => {
      peer = new Peer(PREFIX + code);
      peer.on('open', () => {});
      peer.on('connection', attach);
      peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer.reconnect(), 1500); });
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          // Önceki oturum hâlâ kayıtlı olabilir; biraz bekleyip tekrar dene.
          api.onError('Oda kodu meşgul, tekrar deneniyor…');
          peer.destroy();
          setTimeout(start, 4000);
        } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
          api.onError('Sunucuya ulaşılamadı, tekrar bağlanılıyor…');
        }
      });
    };
    start();
  };

  // Ev sahibi: şifresi tutmayan misafiri düşür
  api.kick = () => { if (conn) { try { conn.close(); } catch (e) {} } };
  // Misafir: şifre reddedildi, yeniden denemeyi bırak
  api.stop = () => {
    closed = true; clearTimeout(retryTimer);
    try { if (peer) peer.destroy(); } catch (e) {}
    try { if (bc) bc.close(); } catch (e) {}
  };

  api.join = (roomCode) => {
    isHost = false; code = roomCode;
    if (local) { localStart(false); return; }
    peer = new Peer();
    peer.on('open', connectToHost);
    peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer.reconnect(), 1500); });
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        api.onError('Oda bulunamadı. Ev sahibi uygulamayı açık tutmalı, tekrar deneniyor…');
        scheduleRetry(4000);
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        api.onError('Sunucuya ulaşılamadı, tekrar bağlanılıyor…');
        scheduleRetry(4000);
      }
    });
  };

  return api;
})();

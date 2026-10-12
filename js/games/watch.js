// YouTube'u birlikte izle: oynat/duraklat/ileri sar iki tarafta eşitlenir.
(() => {
  let el, A, player = null, ready = false, suppressUntil = 0, poll = null, apiLoading = null;

  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiLoading) return apiLoading;
    apiLoading = new Promise((res) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
      document.head.append(h('script', { src: 'https://www.youtube.com/iframe_api' }));
    });
    return apiLoading;
  }

  function parseId(s) {
    s = s.trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    try {
      const u = new URL(s);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12);
      if (u.searchParams.get('v')) return u.searchParams.get('v').slice(0, 11);
      const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
      if (m) return m[2];
    } catch (e) {}
    return null;
  }

  const Y = () => A.S.yt;
  const expected = (y) => (y.playing ? y.t + (Date.now() - y.at) / 1000 : y.t);

  function broadcast(playing) {
    if (!player || !ready) return;
    const id = Y() && Y().id;
    if (!id) return;
    A.act({ t: 'yt', v: { id, playing, t: player.getCurrentTime() } });
  }

  function syncToState() {
    const y = Y();
    if (!y || !y.id) return;
    if (!player) { makePlayer(); return; }
    if (!ready) return;
    suppressUntil = Date.now() + 1500;
    const exp = expected(y);
    const curId = player.getVideoData && player.getVideoData().video_id;
    if (curId !== y.id) {
      player.loadVideoById({ videoId: y.id, startSeconds: exp });
      if (!y.playing) setTimeout(() => player.pauseVideo(), 800);
      return;
    }
    if (Math.abs(player.getCurrentTime() - exp) > 1.2) player.seekTo(exp, true);
    if (y.playing) player.playVideo(); else player.pauseVideo();
  }

  async function makePlayer() {
    await loadApi();
    if (!el || player) return;
    const y = Y();
    const box = $('#yt-player');
    if (!box) return;
    box.innerHTML = '';
    const target = h('div');
    box.append(target);
    ready = false;
    player = new YT.Player(target, {
      videoId: y.id,
      playerVars: { playsinline: 1, rel: 0, start: Math.floor(expected(y)), autoplay: y.playing ? 1 : 0 },
      events: {
        onReady: () => { ready = true; syncToState(); },
        onStateChange: (e) => {
          if (Date.now() < suppressUntil) return;
          if (e.data === YT.PlayerState.PLAYING) broadcast(true);
          else if (e.data === YT.PlayerState.PAUSED) broadcast(false);
        },
      },
    });
  }

  function open(id) {
    A.act({ t: 'yt', v: { id, playing: true, t: 0 } });
  }

  function render() {
    el.innerHTML = '';
    player && player.destroy && player.destroy();
    player = null; ready = false;
    const inp = h('input', { placeholder: 'YouTube linkini yapıştır…' });
    const go = () => {
      const id = parseId(inp.value);
      if (!id) { toast('Geçerli bir YouTube linki değil'); return; }
      inp.value = '';
      open(id);
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    const y = Y();
    el.append(h('div.game', null,
      h('div.shell', null, h('div.core.url-bar', null,
        inp,
        h('button.icon', { onclick: syncToState, title: 'Diğer tarafla eşitle', 'aria-label': 'Eşitle' }, ic('arrows-clockwise')),
        h('button.primary', { onclick: go }, 'Aç'))),
      h('div.yt-box', null, h('div#yt-player', null,
        y && y.id ? null : h('div.yt-empty', null, ic('youtube-logo', 'fill'),
          h('p', null, 'Bir YouTube linki yapıştırın, ikinizde aynı anda açılsın. Biri durdurunca ya da ileri sarınca diğerinde de olur.')))),
      h('p.note', null,
        'Telefonda ilk açılışta oynat tuşuna bir kez dokunmak gerekebilir; tarayıcılar sesli videonun kendiliğinden başlamasını engelliyor.')));
    if (y && y.id) makePlayer();
  }

  Games.watch = {
    id: 'watch', title: 'Birlikte İzle', icon: 'television-simple', desc: 'YouTube, ikinizde aynı saniyede',
    status(S) {
      const y = S.yt;
      if (!y || !y.id) return { text: "Henüz video açılmadı" };
      return { text: y.playing ? "Oynatılıyor" : "Duraklatıldı" };
    },
    reduce(S, msg) {
      if (msg.t === 'yt') S.yt = { ...msg.v, at: Date.now() };
    },
    onMsg(msg, remote) {
      if (msg.t === 'yt' && remote) syncToState();
      else if (msg.t === 'yt' && !remote && !player) makePlayer();
      else if (msg.t === 'yt' && !remote && player && ready) {
        // Yeni videoyu ben açtıysam yükle
        const curId = player.getVideoData && player.getVideoData().video_id;
        if (curId !== msg.v.id) syncToState();
      }
    },
    mount(e, app) {
      el = e; A = app;
      render();
      // İleri/geri sarmayı yakala (YouTube'un ayrı bir "seek" olayı yok)
      poll = setInterval(() => {
        const y = Y();
        if (!player || !ready || !y || Date.now() < suppressUntil) return;
        const st = player.getPlayerState();
        if (st !== YT.PlayerState.PLAYING && st !== YT.PlayerState.PAUSED) return;
        if (Math.abs(player.getCurrentTime() - expected(y)) > 2.5) broadcast(st === YT.PlayerState.PLAYING);
      }, 1000);
    },
    render() {},
    get _player() { return player; }, // test/hata ayıklama için
    unmount() {
      clearInterval(poll);
      try { player && player.destroy(); } catch (e) {}
      player = null; ready = false; el = null;
    },
  };
})();

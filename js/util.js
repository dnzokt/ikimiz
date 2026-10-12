// Küçük yardımcılar: tüm modüller global olarak kullanır.
const $ = (sel, root = document) => root.querySelector(sel);

// h('div.cls#id', {onclick}, children...)
function h(tag, attrs, ...kids) {
  const [, name = 'div', rest = ''] = tag.match(/^([a-z0-9]*)(.*)$/i);
  const el = document.createElement(name || 'div');
  rest.replace(/([.#])([\w-]+)/g, (_, k, v) => {
    if (k === '.') el.classList.add(v); else el.id = v;
  });
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') { for (const [p, val] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val; } }
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const k of kids.flat()) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(k));
  }
  return el;
}

function toast(text, ms = 2200) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const rollDie = () => 1 + Math.floor(Math.random() * 6);

// Phosphor ikonu: ic('dice-five'), dolu stil için ic('heart', 'fill')
const ic = (name, weight = 'light') => h(`i.ph-${weight}.ph-${name}`, { 'aria-hidden': 'true' });

function modal(title, text, buttons) {
  const bg = h('div.modal-bg', { onclick: (e) => { if (e.target === bg) close(); } });
  const close = () => bg.remove();
  bg.append(h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, h('div.core', null,
    h('h2', null, title),
    text ? h('p', null, text) : null,
    h('div.row', null,
      buttons.map(([label, fn, cls]) => h('button' + (cls ? '.' + cls : ''), {
        onclick: () => { close(); fn && fn(); }
      }, label)))
  )));
  document.body.append(bg);
  return close;
}

// Sıra karşıdan bana geçince: titreşim + sekme başlığı
const _turnState = {};
function turnPing(key, myTurn) {
  const was = _turnState[key];
  _turnState[key] = myTurn;
  if (was === false && myTurn) {
    if (navigator.vibrate) navigator.vibrate(25);
    if (document.hidden) {
      document.title = '● Sıra sende · İkimiz';
      addEventListener('visibilitychange', () => { document.title = 'İkimiz'; }, { once: true });
    }
  }
}

// Türkçe karakterleri sadeleştir (tahmin karşılaştırması için)
function normTr(s) {
  return s.toLocaleLowerCase('tr').trim()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/\s+/g, ' ');
}

// Çini rozeti: son hamlenin saati, hamleyi yapanın renginde. Yeni geldiyse fırçayla boyanır.
const ROZET_SVG = (() => {
  let petals = "";
  for (let i = 0; i < 8; i++) {
    petals += `<ellipse cx="32" cy="14" rx="5.5" ry="11" transform="rotate(${i * 45} 32 32)" opacity="${i % 2 ? 0.55 : 1}"/>`;
  }
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" stroke-width="1.5"/>` +
    `<g fill="currentColor">${petals}</g><circle cx="32" cy="32" r="8" fill="var(--surface)"/><circle cx="32" cy="32" r="4.5" fill="#c23b2a"/></svg>`;
})();
function rozet(ts, { by = null, fresh = false, time = true } = {}) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
  const el = h("div.rozet" + (fresh ? ".paint" : ""), {
    title: `Son hamle ${hh}:${mm}`, "aria-label": `Son hamle ${hh}:${mm}`,
    style: by != null ? { "--pm": `var(--p${by})` } : null,
    html: ROZET_SVG,
  });
  if (time) el.append(h("span.rozet-time", null, `${hh}:${mm}`));
  return el;
}

// Oyun durum çubuğundaki küçük damga; karşıdan yeni geldiyse "tak" diye basılır
function statusMark(A, id) {
  const p = A.S.posted && A.S.posted[id];
  if (!p) return null;
  const fresh = A.lastPost && A.lastPost.id === id && Date.now() - A.lastPost.at < 1500;
  return rozet(p.at, { by: p.by, fresh });
}

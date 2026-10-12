// Elle çizilmiş vektör görseller (İkimiz, 2026). Her biri bir kemer (sivri olmayan yuvarlak tepe) içinde.
// Palet arayüzle aynı: kobalt, firuze, mercan, sır beyazı; oyun nesneleri kendi klasik renklerinde.
const ART = (() => {
  const K = '#1e4fa0', T = '#2a9aa8', R = '#c23b2a', G = '#f6f4ee', INK = '#1b2236';

  // Kemer çerçevesi: dış kobalt çizgi, iç firuze çizgi, içerik kemere kırpılır
  const arch = (id, bg, body) => `
<svg viewBox="0 0 200 160" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
  <defs><clipPath id="a-${id}"><path d="M14 158V70Q14 18 100 12Q186 18 186 70V158Z"/></clipPath></defs>
  <path d="M14 158V70Q14 18 100 12Q186 18 186 70V158Z" fill="${bg}"/>
  <g clip-path="url(#a-${id})">${body}</g>
  <path d="M14 158V70Q14 18 100 12Q186 18 186 70V158Z" fill="none" stroke="${K}" stroke-width="3.5"/>
  <path d="M21 158V72Q21 26 100 19Q179 26 179 72V158" fill="none" stroke="${T}" stroke-width="1.4"/>
</svg>`;

  // ---------- Birlikte Çiz: şövale, tuvalde kalp ve kobalt dalga, yanında fırça ----------
  const draw = arch('draw', '#e7eef9', `
    <path d="M0 132H200V160H0Z" fill="#dfe6f2"/>
    <g stroke="#8a5a3c" stroke-width="4" stroke-linecap="round">
      <path d="M100 52 74 150"/><path d="M100 52 126 150"/><path d="M100 52V150"/><path d="M80 126H120"/>
    </g>
    <g transform="rotate(-3 100 82)">
      <rect x="56" y="44" width="88" height="70" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
      <path d="M100 102C82 90 82 72 95 74C99 75 100 79 100 81C100 79 101 75 105 74C118 72 118 90 100 102Z" fill="${R}"/>
      <path d="M64 62C72 54 80 70 88 62S104 54 112 62" fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="128" cy="58" r="6" fill="${T}"/>
    </g>
    <g transform="rotate(38 150 112)">
      <rect x="147" y="84" width="6" height="44" rx="3" fill="#8a5a3c"/>
      <rect x="146" y="80" width="8" height="8" fill="#c9cfdb"/>
      <path d="M146 80C146 68 150 62 150 58C150 62 154 68 154 80Z" fill="${K}"/>
    </g>
    <circle cx="44" cy="112" r="10" fill="${G}" stroke="${INK}" stroke-width="1.2"/>
    <circle cx="40" cy="109" r="2.6" fill="${R}"/><circle cx="46" cy="107" r="2.6" fill="${K}"/><circle cx="47" cy="114" r="2.6" fill="${T}"/>`);

  // ---------- Trash: yelpaze iskambil, öndeki kart kupa ası ----------
  const card = (rot, front) => `
    <g transform="rotate(${rot} 100 168)">
      <rect x="72" y="52" width="56" height="80" rx="6" fill="${front ? '#fff' : '#b3262a'}" stroke="${front ? '#c9cfdb' : '#7f1a1d'}" stroke-width="1.5"/>
      ${front
        ? `<text x="80" y="70" font-family="Georgia, serif" font-size="15" font-weight="700" fill="${R}">A</text>
           <path d="M100 106C88 98 88 86 96 88C99 89 100 91 100 93C100 91 101 89 104 88C112 86 112 98 100 106Z" fill="${R}"/>`
        : `<rect x="77" y="57" width="46" height="70" rx="3" fill="none" stroke="#fff" stroke-width="1.4"/>
           <path d="M77 57L123 127M123 57L77 127M100 57L77 92L100 127L123 92Z" stroke="#e7a3a5" stroke-width=".9" fill="none"/>`}
    </g>`;
  const trash = arch('trash', '#f4e9e4', `
    <path d="M0 136H200V160H0Z" fill="#2f5d50"/>
    <path d="M0 136H200" stroke="#244a40" stroke-width="2"/>
    ${card(-22, false)}${card(-7, false)}${card(9, false)}${card(24, true)}`);

  // ---------- Yapboz: tepeli manzara, bir parça yerinden kalkmış ----------
  const puzzle = arch('puzzle', '#e5f1ee', `
    <g>
      <rect x="34" y="44" width="132" height="96" rx="4" fill="#bfe0ea"/>
      <circle cx="132" cy="70" r="12" fill="#f2c14e"/>
      <path d="M34 112Q70 80 104 108T166 100V140H34Z" fill="#3f8f6b"/>
      <path d="M34 124Q80 104 120 126T166 120V140H34Z" fill="#2f6f53"/>
      <path d="M100 44V74c-9 0-9 14 0 14V140M34 92H58c0-9 14-9 14 0H166" fill="none" stroke="${G}" stroke-width="2.5"/>
      <path d="M100 44H166V92H124c0 9-14 9-14 0H100V88c-9 0-9-14 0-14Z" fill="#d6e6ea"/>
      <rect x="34" y="44" width="132" height="96" rx="4" fill="none" stroke="${INK}" stroke-width="1.5"/>
    </g>
    <g transform="translate(18 -18) rotate(10 133 68)">
      <path d="M100 44H166V92H124c0 9-14 9-14 0H100V88c-9 0-9-14 0-14Z" fill="#000" opacity=".15" transform="translate(4 6)"/>
      <path d="M100 44H166V92H124c0 9-14 9-14 0H100V88c-9 0-9-14 0-14Z" fill="#bfe0ea" stroke="${INK}" stroke-width="1.5"/>
      <circle cx="132" cy="70" r="12" fill="#f2c14e"/>
    </g>`);

  // ---------- Birlikte İzle: gece, ekran, kanepede yan yana iki kişi ----------
  const watch = arch('watch', '#15223f', `
    <circle cx="40" cy="40" r="1.4" fill="${G}"/><circle cx="160" cy="34" r="1.2" fill="${G}"/><circle cx="172" cy="58" r="1" fill="${G}"/>
    <rect x="44" y="38" width="112" height="70" rx="6" fill="#0b1328" stroke="#8fb0ff" stroke-width="2"/>
    <rect x="50" y="44" width="100" height="58" rx="3" fill="#24407a"/>
    <path d="M50 92Q80 70 110 88T150 80V102H50Z" fill="#2a9aa8" opacity=".7"/>
    <path d="M93 62V84L112 73Z" fill="${G}"/>
    <path d="M30 160V136Q30 122 46 122H154Q170 122 170 136V160Z" fill="${R}"/>
    <path d="M38 160V140Q38 132 48 132H152Q162 132 162 140V160Z" fill="#a8301f"/>
    <circle cx="88" cy="118" r="11" fill="#0b1328"/><path d="M72 160V140Q72 128 88 128Q104 128 104 140V160Z" fill="#0b1328"/>
    <circle cx="112" cy="120" r="10" fill="#0b1328"/><path d="M98 160V141Q98 130 112 130Q126 130 126 141V160Z" fill="#0b1328"/>
    <path d="M100 104C94 100 94 95 97.5 95.5C99 96 100 97 100 98C100 97 101 96 102.5 95.5C106 95 106 100 100 104Z" fill="#ff806e"/>`);

  // ---------- Tavla: üstten açık tahta, pullar ve iki zar ----------
  let pts = '';
  for (let i = 0; i < 6; i++) {
    const c = i % 2 ? '#2f5d50' : '#8c2f1f';
    const c2 = i % 2 ? '#8c2f1f' : '#2f5d50';
    const x1 = 40 + i * 9.5, x2 = 108 + i * 9.5;
    pts += `<path d="M${x1} 52h9.5l-4.75 34Z" fill="${c}"/><path d="M${x2} 52h9.5l-4.75 34Z" fill="${c}"/>`;
    pts += `<path d="M${x1} 136h9.5l-4.75-34Z" fill="${c2}"/><path d="M${x2} 136h9.5l-4.75-34Z" fill="${c2}"/>`;
  }
  const chk = (x, y, w) => `<circle cx="${x}" cy="${y}" r="4.4" fill="${w ? '#f3ede1' : '#2b2622'}" stroke="${w ? '#b9ab8c' : '#000'}" stroke-width=".8"/>`;
  const tavla = arch('tavla', '#efe4d2', `
    <path d="M0 140H200V160H0Z" fill="#d9c7a9"/>
    <rect x="30" y="44" width="140" height="100" rx="4" fill="#5b3a22"/>
    <rect x="36" y="50" width="62" height="88" fill="#ecdcb8"/><rect x="104" y="50" width="62" height="88" fill="#ecdcb8"/>
    ${pts}
    ${chk(44.75, 57, true)}${chk(44.75, 66, true)}${chk(92, 131, false)}${chk(92, 122, false)}${chk(112.75, 131, true)}${chk(160, 57, false)}${chk(160, 66, false)}${chk(160, 75, false)}
    <g transform="rotate(-12 118 150)"><rect x="108" y="140" width="18" height="18" rx="3" fill="#fff" stroke="${INK}" stroke-width="1"/>
      <circle cx="113" cy="145" r="1.6" fill="${INK}"/><circle cx="117" cy="149" r="1.6" fill="${INK}"/><circle cx="121" cy="153" r="1.6" fill="${INK}"/></g>
    <g transform="rotate(14 142 150)"><rect x="132" y="140" width="18" height="18" rx="3" fill="#fff" stroke="${INK}" stroke-width="1"/>
      <circle cx="137" cy="145" r="1.6" fill="${INK}"/><circle cx="145" cy="153" r="1.6" fill="${INK}"/><circle cx="137" cy="153" r="1.6" fill="${INK}"/><circle cx="145" cy="145" r="1.6" fill="${INK}"/></g>`);

  // ---------- Dama: tahta köşesi, taşlar ve bir dama (kral) ----------
  let sq = '';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
    sq += `<rect x="${34 + c * 22}" y="${40 + r * 22}" width="22" height="22" fill="${(r + c) % 2 ? '#b58863' : '#f0d9b5'}"/>`;
  }
  const pc = (cx, cy, w) => `<circle cx="${cx}" cy="${cy}" r="8.5" fill="${w ? '#f3ede1' : '#2b2622'}" stroke="${w ? '#b9ab8c' : '#000'}" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="${w ? '#d8cbb0' : '#4a4038'}" stroke-width="1"/>`;
  const dama = arch('dama', '#f3eadb', `
    <g transform="rotate(-6 100 95)">
      <rect x="28" y="34" width="144" height="122" rx="3" fill="#6b4226"/>
      ${sq}
      ${pc(45, 51, false)}${pc(89, 51, false)}${pc(133, 51, false)}${pc(67, 73, false)}
      ${pc(45, 117, true)}${pc(89, 117, true)}${pc(155, 117, true)}${pc(111, 95, true)}
      <path d="M126 68l3-6 3 4 3-4 3 4 3-4 3 6Z" fill="#e8a33d" stroke="#a9711b" stroke-width=".8" transform="translate(-28 22)"/>
    </g>`);

  // ---------- Karşılama: çini kemerli pencereden akşam İstanbul'u, sehpada tavla ve iki çay ----------
  const glass = (x) => `
    <g transform="translate(${x} 0)">
      <ellipse cx="0" cy="338" rx="17" ry="4.5" fill="#d9c7a9" stroke="#b9a37f" stroke-width="1"/>
      <path d="M-9 296H9C9 306 3 311 4 320C5 328 9 331 7 336H-7C-9 331-5 328-4 320C-3 311-9 306-9 296Z" fill="#fff" fill-opacity=".55" stroke="#c9cfdb" stroke-width="1"/>
      <path d="M-8 302H8C8 308 3 312 4 320C5 328 8 331 6.4 335H-6.4C-8 331-5 328-4 320C-3 312-8 308-8 302Z" fill="#b5311f"/>
      <path d="M-2 290c-4-6 4-10 0-16M4 288c-4-6 4-10 0-16" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>
    </g>`;
  const hero = `
<svg viewBox="0 0 560 400" role="img" aria-label="Çini kemerli pencereden akşam manzarası, sehpada tavla ve iki çay" preserveAspectRatio="xMidYMax meet">
  <defs>
    <pattern id="h-karo" width="44" height="44" patternUnits="userSpaceOnUse"><image href="assets/cini-karo.svg" width="44" height="44"/></pattern>
    <linearGradient id="h-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#163b7a"/><stop offset=".55" stop-color="#5d6fb0"/><stop offset=".85" stop-color="#e8a7a0"/><stop offset="1" stop-color="#f3c9a6"/>
    </linearGradient>
    <clipPath id="h-win"><path d="M66 400V176Q66 64 280 54Q494 64 494 176V400Z"/></clipPath>
  </defs>
  <path d="M40 400V170Q40 38 280 28Q520 38 520 170V400Z" fill="url(#h-karo)"/>
  <path d="M40 400V170Q40 38 280 28Q520 38 520 170V400Z" fill="none" stroke="${K}" stroke-width="5"/>
  <path d="M66 400V176Q66 64 280 54Q494 64 494 176V400Z" fill="url(#h-sky)"/>
  <g clip-path="url(#h-win)">
    <circle cx="150" cy="110" r="2" fill="${G}"/><circle cx="210" cy="86" r="1.5" fill="${G}"/><circle cx="330" cy="96" r="1.6" fill="${G}"/>
    <circle cx="420" cy="122" r="1.4" fill="${G}"/><circle cx="250" cy="130" r="1.2" fill="${G}"/><circle cx="380" cy="80" r="1.2" fill="${G}"/>
    <path d="M392 118a26 26 0 1 1-26-34a20 20 0 1 0 26 34Z" fill="${G}"/>
    <!-- Boğaz kıyısı silüeti: kubbeler ve minareler -->
    <g fill="#1d3166">
      <path d="M66 300V268h40v-10q20-26 40 0v10h20v32Z"/>
      <rect x="196" y="186" width="7" height="100"/><path d="M196 186l3.5-18 3.5 18Z"/>
      <path d="M214 300V262q0-4 4-4h20q0-50 62-58q62 8 62 58h20q4 0 4 4V300Z"/>
      <rect x="396" y="176" width="7" height="110"/><path d="M396 176l3.5-20 3.5 20Z"/>
      <path d="M244 258q0-22 26-26q26 4 26 26Z"/><path d="M304 258q0-22 26-26q26 4 26 26Z"/>
      <path d="M420 300V272h24q0-24 24-28q22 4 22 28h4V300Z"/>
    </g>
    <path d="M66 296H494V400H66Z" fill="#163b7a"/>
    <path d="M66 312q40-6 80 0t80 0t80 0t80 0t80 0t48 0" fill="none" stroke="#8fb0ff" stroke-opacity=".5" stroke-width="2"/>
    <path d="M96 332q40-5 80 0t80 0t80 0t80 0t80 0" fill="none" stroke="#8fb0ff" stroke-opacity=".35" stroke-width="2"/>
  </g>
  <!-- pencere pervazı -->
  <rect x="30" y="356" width="500" height="18" rx="3" fill="${G}" stroke="${K}" stroke-width="2"/>
  <rect x="30" y="374" width="500" height="26" fill="#e3e9f4" stroke="${K}" stroke-width="2"/>
  <!-- sehpa üstünde açık tavla -->
  <path d="M150 352h150l-8-14h-134Z" fill="#5b3a22"/>
  <path d="M160 338l8-22h56l6 22Z" fill="#ecdcb8" stroke="#5b3a22" stroke-width="4" stroke-linejoin="round"/>
  <path d="M226 338l4-22h56l6 22Z" fill="#ecdcb8" stroke="#5b3a22" stroke-width="4" stroke-linejoin="round"/>
  <path d="M172 334l5-14 5 14M186 334l5-14 5 14M200 334l4-14 4 14M240 334l4-14 4 14M254 334l4-14 4 14M268 334l4-14 4 14" fill="#8c2f1f" stroke="#8c2f1f" stroke-width="1"/>
  <circle cx="190" cy="330" r="4.5" fill="#f3ede1" stroke="#b9ab8c"/><circle cx="262" cy="330" r="4.5" fill="#2b2622"/>
  ${glass(352)}${glass(394)}
  <rect x="318" y="340" width="12" height="12" rx="2" fill="#fff" stroke="${INK}" transform="rotate(-14 324 346)"/>
</svg>`;

  return { hero, draw, trash, puzzle, watch, tavla, dama };
})();

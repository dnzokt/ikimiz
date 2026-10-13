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

  // ---------- Kızma Birader: tahta köşesi, yol, piyonlar ve zar ----------
  const kzCell = (x, y, f) => `<circle cx="${x}" cy="${y}" r="8" fill="${f}" stroke="#3b2a18" stroke-width="1.2"/>`;
  const kzPawn = (x, y, c, d) => `<ellipse cx="${x}" cy="${y + 9}" rx="9" ry="3" fill="rgba(0,0,0,.25)"/>
    <path d="M${x - 8} ${y + 8}Q${x - 8} ${y + 1} ${x - 4} ${y - 2}H${x + 4}Q${x + 8} ${y + 1} ${x + 8} ${y + 8}Z" fill="${c}" stroke="${d}"/>
    <circle cx="${x}" cy="${y - 6}" r="5.5" fill="${c}" stroke="${d}"/><circle cx="${x - 2}" cy="${y - 8}" r="1.6" fill="#fff" opacity=".6"/>`;
  let kzPath = '';
  [[40, 64], [58, 64], [76, 64], [94, 64], [94, 46], [94, 28], [112, 28], [130, 28], [130, 46], [130, 64], [148, 64], [166, 64]]
    .forEach(([x, y], i) => { kzPath += kzCell(x, y, i === 0 ? '#c62828' : i === 7 ? '#2e8b57' : '#fffaf0'); });
  let kzRow = '';
  [[40, 100], [58, 100], [76, 100], [94, 100], [130, 100], [148, 100], [166, 100]].forEach(([x, y]) => { kzRow += kzCell(x, y, '#fffaf0'); });
  const kizma = arch('kizma', '#f3eadb', `
    <rect x="22" y="14" width="160" height="150" rx="6" fill="#6b4226"/>
    <rect x="27" y="19" width="150" height="140" rx="4" fill="#f3e6c4"/>
    ${kzPath}${kzRow}
    ${kzCell(112, 82, '#f6c7c2')}${kzCell(112, 100, '#f6c7c2')}
    ${kzCell(40, 132, '#fbe7a6')}${kzCell(58, 132, '#fbe7a6')}${kzCell(40, 150, '#fbe7a6')}${kzCell(58, 150, '#fbe7a6')}
    ${kzPawn(76, 62, '#c62828', '#7f1717')}${kzPawn(130, 44, '#f2b705', '#9a7300')}${kzPawn(40, 130, '#f2b705', '#9a7300')}${kzPawn(148, 98, '#c62828', '#7f1717')}
    <g transform="rotate(-14 150 140)"><rect x="138" y="128" width="24" height="24" rx="4" fill="#fff" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="144" cy="134" r="2" fill="${INK}"/><circle cx="156" cy="134" r="2" fill="${INK}"/><circle cx="144" cy="140" r="2" fill="${INK}"/>
      <circle cx="156" cy="140" r="2" fill="${INK}"/><circle cx="144" cy="146" r="2" fill="${INK}"/><circle cx="156" cy="146" r="2" fill="${INK}"/></g>`);

  // ---------- UNO: yelpaze renkli kartlar ----------
  const unoCard = (rot, col, label, dx = 0) => `
    <g transform="rotate(${rot} 100 172) translate(${dx} 0)">
      <rect x="74" y="50" width="52" height="78" rx="7" fill="#fff" stroke="#c9cfdb"/>
      <rect x="78" y="54" width="44" height="70" rx="5" fill="${col}"/>
      <ellipse cx="100" cy="89" rx="17" ry="27" transform="rotate(28 100 89)" fill="#fff"/>
      <text x="100" y="97" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="22" font-weight="900" fill="${col}">${label}</text>
    </g>`;
  const uno = arch('uno', '#e9eef7', `
    <path d="M0 140H200V160H0Z" fill="#244a40"/>
    ${unoCard(-30, '#0956bf', '7')}${unoCard(-12, '#379711', '2')}${unoCard(6, '#ecd407', '+2')}${unoCard(24, '#d72600', '5')}`);

  // ---------- Mutfak Telaşı: ocakta buharı tüten tencere, doğranmış domates ve soğan, bıçak ----------
  const cook = arch('cook', '#f6ede0', `
    <path d="M0 118H200V160H0Z" fill="#b9895a"/><path d="M0 118H200" stroke="#7a5634" stroke-width="3"/>
    <rect x="58" y="104" width="84" height="12" rx="3" fill="#3a3f4b"/>
    <path d="M70 104c0-6 6-8 6-14M100 104c0-6 6-8 6-14M130 104c0-6 6-8 6-14" stroke="#e8590c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M60 70h80v26q0 12-12 12H72q-12 0-12-12Z" fill="#a9b2bc" stroke="#5b636e" stroke-width="2"/>
    <rect x="48" y="72" width="12" height="7" rx="3" fill="#5b636e"/><rect x="140" y="72" width="12" height="7" rx="3" fill="#5b636e"/>
    <ellipse cx="100" cy="70" rx="40" ry="8" fill="#d8452f" stroke="#5b636e" stroke-width="2"/>
    <circle cx="90" cy="69" r="3" fill="#f08a6e"/><circle cx="108" cy="71" r="2.6" fill="#f2e1b6"/>
    <path d="M86 58c-6-8 6-12 0-22M100 56c-6-8 6-12 0-22M114 58c-6-8 6-12 0-22" stroke="#fff" stroke-opacity=".85" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="22" y="126" width="60" height="22" rx="4" fill="#e3c08a" stroke="#a9711b"/>
    <circle cx="36" cy="137" r="5" fill="#d8352a"/><circle cx="36" cy="137" r="2.4" fill="#f08a6e"/>
    <circle cx="50" cy="133" r="5" fill="#d9b26a"/><circle cx="50" cy="133" r="2.4" fill="#f2e1b6"/>
    <circle cx="64" cy="139" r="5" fill="#d8352a"/><circle cx="64" cy="139" r="2.4" fill="#f08a6e"/>
    <path d="M120 140l46-12 2 6-46 10Z" fill="#c9cfdb" stroke="#8a929c"/><rect x="164" y="124" width="16" height="7" rx="2" transform="rotate(-14 172 128)" fill="#5b3a22"/>
    <g transform="translate(150 30)"><path d="M0 18q-10 0-10-10q0-8 8-8q2-8 10-8q8 0 10 8q8 0 8 8q0 10-10 10Z" fill="#fff" stroke="#c9cfdb"/><rect x="-6" y="16" width="20" height="8" fill="#fff" stroke="#c9cfdb"/></g>`);

  // ---------- Mızrak Düellosu: gün batımında iki tepe, havada süzülen mızrak ----------
  const spear = arch('spear', '#f2c48a', `
    <defs><linearGradient id="sp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46508a"/><stop offset=".7" stop-color="#d98a64"/><stop offset="1" stop-color="#f2c48a"/></linearGradient></defs>
    <path d="M0 0H200V160H0Z" fill="url(#sp-sky)"/>
    <circle cx="100" cy="98" r="18" fill="#ffe2b0"/>
    <path d="M0 112q30-26 60-6t40 2q20-20 50-10t50 4V160H0Z" fill="#3c3462" opacity=".8"/>
    <path d="M0 126q24-30 54-14q16 8 26 48H0Z" fill="#6e4528"/><path d="M0 126q24-30 54-14q16 8 26 48" fill="none" stroke="#5e9f3e" stroke-width="4"/>
    <path d="M200 124q-26-26-56-10q-14 8-24 46H200Z" fill="#6e4528"/><path d="M200 124q-26-26-56-10q-14 8-24 46" fill="none" stroke="#5e9f3e" stroke-width="4"/>
    <path d="M44 96q50-74 112-2" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 5" opacity=".8"/>
    <g transform="translate(100 50) rotate(4)"><path d="M-22 0H18" stroke="#7a5230" stroke-width="3" stroke-linecap="round"/><path d="M18-4l10 4-10 4Z" fill="#cfd6dd" stroke="#7d8894"/><path d="M-22 0l-6-4 2 4-2 4Z" fill="${R}"/></g>
    <g transform="translate(36 111)"><rect x="-6" y="-16" width="12" height="12" rx="3" fill="${K}"/><circle cy="-21" r="5" fill="#e8c39e"/><path d="M-5.5-22a5.5 5.5 0 0 1 11 0Z" fill="#a7b0ba"/><circle cx="-7" cy="-11" r="5.5" fill="#173c7a" stroke="#d8b25a" stroke-width="1.5"/></g>
    <g transform="translate(164 109)"><rect x="-6" y="-16" width="12" height="12" rx="3" fill="${R}"/><circle cy="-21" r="5" fill="#e8c39e"/><path d="M-5.5-22a5.5 5.5 0 0 1 11 0Z" fill="#a7b0ba"/><circle cx="7" cy="-11" r="5.5" fill="#8e2a1e" stroke="#d8b25a" stroke-width="1.5"/></g>`);

  // ---------- Kimim Ben?: alnında kart olan iki yüz, aralarında soru işareti ----------
  const kimim = arch('kimim', '#e7eef9', `
    <path d="M0 136H200V160H0Z" fill="#dfe6f2"/>
    <g transform="translate(62 108)"><circle r="26" fill="${K}"/><circle cx="-8" cy="4" r="2.6" fill="${G}"/><circle cx="8" cy="4" r="2.6" fill="${G}"/><path d="M-8 13q8 6 16 0" fill="none" stroke="${G}" stroke-width="2.4" stroke-linecap="round"/>
      <g transform="translate(0 -38) rotate(-6)"><rect x="-17" y="-20" width="34" height="40" rx="4" fill="#fff" stroke="${INK}" stroke-width="1.4"/><text y="8" text-anchor="middle" font-family="Marcellus, serif" font-size="24" fill="${R}">?</text></g></g>
    <g transform="translate(140 108)"><circle r="26" fill="${R}"/><circle cx="-8" cy="4" r="2.6" fill="${G}"/><circle cx="8" cy="4" r="2.6" fill="${G}"/><path d="M-8 14q8-4 16 0" fill="none" stroke="${G}" stroke-width="2.4" stroke-linecap="round"/>
      <g transform="translate(0 -38) rotate(6)"><rect x="-17" y="-20" width="34" height="40" rx="4" fill="#fff" stroke="${INK}" stroke-width="1.4"/><circle cy="-2" r="8" fill="#e8a33d"/><path d="M-7-9l3 4M7-9l-3 4" stroke="#8a5a3c" stroke-width="2"/><path d="M-6 12h12" stroke="${INK}" stroke-width="1.5"/></g></g>
    <g fill="${T}"><circle cx="101" cy="40" r="3.5"/><circle cx="90" cy="54" r="2.2"/><circle cx="112" cy="54" r="2.2"/></g>`);

  // ---------- Son Fişek: lamba altında yeşil masa, tüfek ve dolu/boş fişekler ----------
  const fisek = arch('fisek', '#14110d', `
    <defs><radialGradient id="fs-lampg" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#ffd68c" stop-opacity=".55"/><stop offset="1" stop-color="#ffd68c" stop-opacity="0"/></radialGradient></defs>
    <path d="M0 0H200V160H0Z" fill="url(#fs-lampg)"/>
    <path d="M86 12h28l6 10H80Z" fill="#2a2622"/><ellipse cx="100" cy="23" rx="9" ry="3" fill="#ffe7b0"/>
    <path d="M18 160 40 92H160l22 68Z" fill="#3a2112"/><path d="M30 156 48 98H152l18 58Z" fill="#245038"/>
    <g transform="translate(46 116) rotate(-8)">
      <path d="M0 10C4 6 16 4 30 4H34V14H30C22 14 10 18 2 20Z" fill="#7a4520"/>
      <rect x="33" y="3" width="22" height="9" fill="#2a2e33"/>
      <rect x="54" y="3" width="54" height="4" rx="1" fill="#b9c0c7"/><rect x="54" y="8" width="40" height="3" fill="#3b4148"/>
      <rect x="62" y="7" width="18" height="5" rx="1.5" fill="#7a4520"/>
    </g>
    <g transform="translate(120 128)"><rect width="7" height="16" rx="1.5" fill="#d23a2e"/><rect y="12" width="7" height="5" fill="#e8b85a"/></g>
    <g transform="translate(131 130) rotate(12)"><rect width="7" height="16" rx="1.5" fill="#3f74c9"/><rect y="12" width="7" height="5" fill="#e8b85a"/></g>
    <g transform="translate(142 127)"><rect width="7" height="16" rx="1.5" fill="#d23a2e"/><rect y="12" width="7" height="5" fill="#e8b85a"/></g>
    <g fill="#8dff9e"><path d="M30 60l-5 7h4l-1 5 5-7h-4Z"/><path d="M40 60l-5 7h4l-1 5 5-7h-4Z"/><path d="M50 60l-5 7h4l-1 5 5-7h-4Z" opacity=".25"/></g>
    <g fill="#8dff9e"><path d="M160 60l-5 7h4l-1 5 5-7h-4Z"/><path d="M170 60l-5 7h4l-1 5 5-7h-4Z" opacity=".25"/><path d="M180 60l-5 7h4l-1 5 5-7h-4Z" opacity=".25"/></g>`);

  // ---------- Kelime Masası: mavi tahta üstünde çapraz kelimeler ----------
  const kt = (x, y, l, v) => `<g transform="translate(${x} ${y})"><rect width="20" height="20" rx="3" fill="#f6ecd0" stroke="#c9b27a"/><text x="10" y="15" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="800" font-size="13" fill="#2a1d0e">${l}</text><text x="17" y="18" text-anchor="end" font-family="Figtree, sans-serif" font-weight="700" font-size="5.5" fill="#2a1d0e">${v}</text></g>`;
  let kgrid = '';
  for (let r = 0; r < 7; r++) for (let c = 0; c < 9; c++) {
    const pr = (r + c) % 6 === 0 ? '#c23b2a' : (r * c) % 7 === 3 ? '#2f6fd0' : (r + 2 * c) % 9 === 1 ? '#a3cbe9' : '#e9e4d4';
    kgrid += `<rect x="${12 + c * 22}" y="${24 + r * 22}" width="20" height="20" rx="2" fill="${pr}"/>`;
  }
  const kelime = arch('kelime', '#1f4a86', `
    <path d="M0 0H200V160H0Z" fill="#183a6b"/>
    ${kgrid}
    ${kt(34, 68, 'O', 2)}${kt(56, 68, 'Y', 3)}${kt(78, 68, 'U', 2)}${kt(100, 68, 'N', 1)}
    ${kt(78, 90, 'N', 1)}${kt(78, 112, 'D', 1)}${kt(144, 24, 'W', 3)}${kt(144, 46, 'O', 2)}${kt(144, 68, 'R', 1)}${kt(144, 90, 'T', 1)}
    <path d="M0 136H200V160H0Z" fill="#5a3418"/>
    ${kt(50, 139, 'K', 1)}${kt(74, 139, 'E', 1)}${kt(98, 139, 'L', 1)}${kt(122, 139, 'İ', 1)}${kt(146, 139, 'M', 2)}`);

  // ---------- Pano (ana sayfa sağ sütun): sivri kemerde gece, zincirden sarkan kandil, altta lale çinileri ----------
  const lale = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 22V4" stroke="${'#2e7d6b'}" stroke-width="2"/>
      <path d="M0 16C-7 12-9 6-8 2C-4 6-2 10 0 14Z" fill="#2e7d6b"/><path d="M0 18C7 14 9 8 8 4C4 8 2 12 0 16Z" fill="#2e7d6b"/>
      <path d="M0 4C-6 2-7-6-5-12C-3-8-2-7 0-11C2-7 3-8 5-12C7-6 6 2 0 4Z" fill="${R}"/>
    </g>`;
  let tiles = '';
  for (let i = 0; i < 4; i++) {
    const x = 51 + i * 46;
    tiles += `<rect x="${x - 21}" y="318" width="42" height="42" fill="${G}" stroke="${K}" stroke-width="1.5"/>
      <path d="M${x - 21} 339L${x} 318L${x + 21} 339L${x} 360Z" fill="none" stroke="${T}" stroke-width="1"/>${lale(x, 340, 0.9)}`;
  }
  let stars = '';
  for (const [x, y, r] of [[60, 70, 1.4], [92, 52, 1], [170, 96, 1.2], [150, 58, 1.6], [48, 132, 1], [190, 150, 1.1], [72, 190, 0.9], [176, 214, 1], [40, 236, 1.2]]) stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".8"/>`;
  const pano = `
<svg viewBox="0 0 240 400" role="img" aria-hidden="true">
  <defs>
    <clipPath id="pano-c"><path d="M12 398V150Q12 60 120 8Q228 60 228 150V398Z"/></clipPath>
    <linearGradient id="pano-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14224a"/><stop offset=".7" stop-color="#2c3f7a"/><stop offset="1" stop-color="#3b4f8c"/></linearGradient>
    <radialGradient id="pano-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd98a" stop-opacity=".75"/><stop offset=".4" stop-color="#ffb84a" stop-opacity=".25"/><stop offset="1" stop-color="#ffb84a" stop-opacity="0"/></radialGradient>
    <linearGradient id="pano-glass" x1="0" x2="1"><stop offset="0" stop-color="${K}"/><stop offset=".5" stop-color="#4f86d9"/><stop offset="1" stop-color="${K}"/></linearGradient>
  </defs>
  <g clip-path="url(#pano-c)">
    <path d="M0 0H240V400H0Z" fill="url(#pano-sky)"/>
    ${stars}
    <path d="M176 44a17 17 0 1 0 12 28a13 13 0 1 1-12-28Z" fill="#f6e7b8"/>
    <path d="M0 300Q40 270 70 282T130 276T190 280T240 272V320H0Z" fill="#1e2c58"/>
    <path d="M24 300V250L30 238L36 250V300M200 300V244L206 230L212 244V300" fill="#1e2c58"/>
    <path d="M96 300V276A24 24 0 0 1 144 276V300Z" fill="#1e2c58"/>
    <path d="M120 8V98" stroke="#c9a24a" stroke-width="1.6" stroke-dasharray="4 3"/>
    <circle class="kandil-glow" cx="120" cy="160" r="70" fill="url(#pano-glow)"/>
    <g>
      <path d="M100 98H140L134 108H106Z" fill="#c9a24a"/>
      <path d="M106 108H134C152 124 154 162 138 182H102C86 162 88 124 106 108Z" fill="url(#pano-glass)" opacity=".92"/>
      <path d="M96 140H144" stroke="${T}" stroke-width="5" opacity=".9"/>
      <path d="M98 128H142M98 152H142" stroke="${G}" stroke-width="1.2" opacity=".7"/>
      <g fill="${G}" opacity=".85"><circle cx="106" cy="140" r="2"/><circle cx="120" cy="140" r="2"/><circle cx="134" cy="140" r="2"/></g>
      <path class="kandil-flame" d="M120 158C114 152 116 146 120 138C124 146 126 152 120 158Z" fill="#ffd98a"/>
      <path d="M102 182H138L130 196H110Z" fill="#c9a24a"/>
      <path d="M120 196V214" stroke="#c9a24a" stroke-width="2"/><circle cx="120" cy="218" r="4" fill="${R}"/>
    </g>
    <path d="M0 312H240V400H0Z" fill="${G}"/>
    ${tiles}
    <path d="M0 312H240" stroke="${K}" stroke-width="3"/>
    <path d="M0 366H240" stroke="${K}" stroke-width="3"/>
    <g fill="${K}">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 20 + 10} 372l6 8-6 8-6-8Z"/>`).join('')}</g>
  </g>
  <path d="M12 398V150Q12 60 120 8Q228 60 228 150V398Z" fill="none" stroke="${K}" stroke-width="4"/>
  <path d="M20 398V152Q20 68 120 18Q220 68 220 152V398" fill="none" stroke="${T}" stroke-width="1.5"/>
</svg>`;

  return { hero, draw, trash, puzzle, watch, tavla, dama, kizma, uno, cook, spear, kimim, fisek, kelime, pano };
})();

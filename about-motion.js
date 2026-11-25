/* HJF "who we are" motion graphic.
   One SVG stage, 5 scenes over a 32s loop, driven by a single rAF clock.
   Pauses when off-screen; shows the final frame for reduced-motion users. */
{
  const host = document.getElementById("hjfMotion");
  if (host) {
    const NS = "http://www.w3.org/2000/svg";
    const T = 32; // seconds per loop
    const el = (tag, attrs = {}, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    };
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const ease = x => 1 - Math.pow(1 - x, 3);
    const easeIO = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const bounce = x => { const n = 7.5625, d = 2.75;
      if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75;
      if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375; return n * (x -= 2.625 / d) * x + .984375; };
    const mix = (a, b, k) => a + (b - a) * k;
    const mixC = (c1, c2, k) => "rgb(" + [0, 1, 2].map(i => Math.round(mix(c1[i], c2[i], k))).join(",") + ")";

    const svg = el("svg", { viewBox: "0 0 400 500", "aria-hidden": "true" }, host);
    const defs = el("defs", {}, svg);
    const lg = (id, stops, x2 = 0, y2 = 1) => { const g = el("linearGradient", { id, x1: 0, y1: 0, x2, y2 }, defs);
      stops.forEach(([o, c, op = 1]) => el("stop", { offset: o, "stop-color": c, "stop-opacity": op }, g)); return g; };
    lg("cu", [[0, "#C98A58"], [.5, "#F6D3A6"], [1, "#C07B48"]], 1, 1);
    lg("stone", [[0, "#F1E4D1"], [1, "#D9C3A6"]]);
    lg("stone2", [[0, "#E6D3B9"], [1, "#C9AE8C"]]);
    lg("glass", [[0, "#3A4C57"], [1, "#1C262D"]]);
    lg("glassLit", [[0, "#FFE2A8"], [1, "#F2B866"]]);
    lg("wood", [[0, "#9A6440"], [1, "#6E4128"]], 1, 0);
    lg("ground", [[0, "#3A2A26"], [1, "#1E1513"]]);
    lg("phone", [[0, "#2A1A1C"], [1, "#120A0B"]]);
    const skyG = lg("sky", [[0, "#F3D9B8"], [1, "#F8EBDD"]]);
    const skyStops = skyG.querySelectorAll("stop");
    const glow = el("radialGradient", { id: "sun", cx: .5, cy: .5, r: .5 }, defs);
    el("stop", { offset: 0, "stop-color": "#FFF1D6" }, glow); el("stop", { offset: 1, "stop-color": "#FFF1D6", "stop-opacity": 0 }, glow);
    const shadow = el("filter", { id: "sh", x: "-20%", y: "-20%", width: "140%", height: "160%" }, defs);
    el("feDropShadow", { dx: 0, dy: 6, stdDeviation: 6, "flood-color": "#2A0A10", "flood-opacity": .35 }, shadow);

    /* ---------- background ---------- */
    el("rect", { width: 400, height: 500, fill: "url(#sky)" }, svg);
    const stars = el("g", { opacity: 0 }, svg);
    for (let i = 0; i < 40; i++) el("circle", { cx: (i * 97) % 400, cy: 20 + ((i * 53) % 220), r: i % 5 ? .8 : 1.4, fill: "#FFF4E0" }, stars);
    const sun = el("g", {}, svg);
    el("circle", { cx: 0, cy: 0, r: 60, fill: "url(#sun)" }, sun);
    const sunDisc = el("circle", { cx: 0, cy: 0, r: 20, fill: "#FCE7C7" }, sun);
    const clouds = el("g", { fill: "#FFFFFF", opacity: .55 }, svg);
    const cloud = (x, y, s) => { const g = el("g", { transform: `translate(${x},${y}) scale(${s})` }, clouds);
      [[0, 0, 18], [18, -6, 22], [40, 0, 16], [22, 6, 20]].forEach(([cx, cy, r]) => el("circle", { cx, cy, r }, g)); return g; };
    const c1 = cloud(40, 120, .8), c2 = cloud(260, 80, .6), c3 = cloud(160, 150, .5);

    // far skyline (generic Riyadh-like towers)
    const sky1 = el("g", { fill: "#C9A98C", opacity: .55 }, svg);
    [[10, 310, 30], [44, 280, 22], [70, 300, 26], [300, 260, 18], [322, 290, 30], [356, 270, 24], [385, 300, 20]]
      .forEach(([x, y, w]) => el("rect", { x, y, width: w, height: 400 - y }, sky1));
    el("path", { d: "M100 400V250q14-40 28 0V400z", fill: "#BE9C7E", opacity: .55 }, svg); // slim tower
    el("path", { d: "M262 400V215l10-18 10 18V400z", fill: "#BE9C7E", opacity: .55 }, svg);
    // dunes
    el("path", { d: "M0 372q80-24 160-6t140-4 100 8V400H0z", fill: "#E2C9A8", opacity: .7 }, svg);

    /* ---------- blueprint tower (off-plan) ---------- */
    const bp = el("g", { fill: "none", stroke: "url(#cu)", "stroke-width": 1.4, opacity: 0 }, svg);
    const bpLines = [];
    const bpPath = (d, w = 1.4) => { const p = el("path", { d, "stroke-width": w }, bp); bpLines.push(p); return p; };
    bpPath("M300 400V140l22-26 22 26V400", 1.8);
    for (let y = 160; y < 395; y += 22) bpPath(`M306 ${y}h32`, .8);
    bpPath("M322 114V92", 1);
    const bpGrid = el("g", { stroke: "#E5C3A0", "stroke-opacity": .18, "stroke-width": .6 }, bp);
    for (let x = 290; x <= 360; x += 10) el("path", { d: `M${x} 120V400` }, bpGrid);
    bpLines.forEach(p => { const L = 900; p.setAttribute("stroke-dasharray", L); p.setAttribute("stroke-dashoffset", L); });
    const bpTag = el("g", { opacity: 0 }, svg);
    el("rect", { x: 292, y: 70, width: 74, height: 22, rx: 11, fill: "#5E1622" }, bpTag);
    el("text", { x: 329, y: 85, "text-anchor": "middle", "font-size": 10.5, fill: "#F6D3A6", "font-weight": 700 }, bpTag).textContent = "على الخارطة";

    /* ---------- ground & street ---------- */
    el("rect", { x: 0, y: 400, width: 400, height: 100, fill: "url(#ground)" }, svg);
    el("rect", { x: 0, y: 400, width: 400, height: 8, fill: "#CDB497" }, svg);
    const dash = el("g", { fill: "#E5C3A0", opacity: .5 }, svg);
    for (let x = 0; x < 400; x += 34) el("rect", { x, y: 452, width: 18, height: 3, rx: 1.5 }, dash);
    // plot outline
    const plot = el("rect", { x: 104, y: 392, width: 192, height: 8, fill: "none", stroke: "url(#cu)", "stroke-width": 1.5, "stroke-dasharray": 400, "stroke-dashoffset": 400 }, svg);

    /* ---------- palms (facility mgmt) ---------- */
    const palm = (x, flip) => {
      const g = el("g", { transform: `translate(${x},400)` }, svg);
      const inner = el("g", {}, g);
      el("path", { d: "M-2 0q-3-30 2-62h4q-2 32 2 62z", fill: "#8A5A3A" }, inner);
      for (let i = 0; i < 6; i++) {
        const a = -150 + i * 30 * (flip ? -1 : 1);
        el("path", { d: "M0 -62q16 -10 34 2q-16 -2 -34 2z", fill: i % 2 ? "#3E6B4A" : "#2F5A3C", transform: `rotate(${a + (flip ? 180 : 0)} 0 -62)` }, inner);
      }
      return inner;
    };
    const palmL = palm(86, false), palmR = palm(316, true);

    /* ---------- the building (development) ---------- */
    const bld = el("g", { filter: "url(#sh)" }, svg);
    const floors = [];
    const mkFloor = (y, h, build) => { const g = el("g", {}, bld); build(g); floors.push({ g, y, h }); return g; };
    const winLit = [];
    const win = (g, x, y, w, h) => { el("rect", { x: x - 2, y: y - 2, width: w + 4, height: h + 4, fill: "url(#cu)" }, g);
      el("rect", { x, y, width: w, height: h, fill: "url(#glass)" }, g);
      const lit = el("rect", { x, y, width: w, height: h, fill: "url(#glassLit)", opacity: 0 }, g); winLit.push(lit);
      el("path", { d: `M${x + w * .2} ${y + h}L${x + w * .6} ${y}`, stroke: "#fff", "stroke-opacity": .15, "stroke-width": 3 }, g); };
    // ground floor blocks
    mkFloor(330, 70, g => {
      el("rect", { x: 118, y: 330, width: 164, height: 70, fill: "url(#stone)" }, g);
      for (let x = 118; x < 282; x += 20.5) el("path", { d: `M${x} 330v70`, stroke: "#CDB497", "stroke-width": .6 }, g);
      el("rect", { x: 186, y: 346, width: 30, height: 54, fill: "url(#wood)" }, g);
      el("circle", { cx: 210, cy: 375, r: 1.6, fill: "#F6D3A6" }, g);
      el("rect", { x: 182, y: 342, width: 38, height: 4, fill: "url(#cu)" }, g);
      win(g, 130, 348, 40, 34); win(g, 232, 348, 40, 34);
      el("rect", { x: 114, y: 326, width: 172, height: 5, fill: "#C9AE8C" }, g);
    });
    // first floor (cantilever + wood slats)
    mkFloor(262, 64, g => {
      el("rect", { x: 126, y: 262, width: 170, height: 64, fill: "url(#stone2)" }, g);
      for (let x = 132; x < 178; x += 5) el("rect", { x, y: 268, width: 3, height: 52, fill: "url(#wood)" }, g);
      win(g, 190, 274, 90, 40);
      el("path", { d: "M235 274v40", stroke: "url(#cu)", "stroke-width": 2 }, g);
      el("rect", { x: 122, y: 258, width: 178, height: 5, fill: "#BFA182" }, g);
    });
    // penthouse
    mkFloor(212, 46, g => {
      el("rect", { x: 150, y: 212, width: 104, height: 46, fill: "url(#stone)" }, g);
      win(g, 160, 222, 36, 28); win(g, 206, 222, 38, 28);
      el("rect", { x: 144, y: 206, width: 116, height: 6, fill: "url(#cu)" }, g);
    });
    // crane
    const crane = el("g", { opacity: 0 }, svg);
    const craneG = el("g", { fill: "none", stroke: "#B8743F", "stroke-width": 2 }, crane);
    el("path", { d: "M350 400V120" }, craneG);
    for (let y = 130; y < 400; y += 18) el("path", { d: `M344 ${y}l12 9M356 ${y}l-12 9`, "stroke-width": 1 }, craneG);
    const jib = el("g", {}, crane);
    el("path", { d: "M350 120H170M350 120h28M350 120l-10-16h20z", stroke: "#B8743F", "stroke-width": 2.2, fill: "#B8743F" }, jib);
    el("rect", { x: 370, y: 114, width: 12, height: 12, fill: "#5E5E5E" }, jib);
    const hookLine = el("path", { d: "M200 120V140", stroke: "#4A3A30", "stroke-width": 1 }, crane);
    const hook = el("path", { d: "M196 140h8l-4 6z", fill: "#4A3A30" }, crane);

    /* ---------- marketing ---------- */
    const sign = el("g", { opacity: 0 }, svg);
    el("rect", { x: 323, y: 336, width: 3, height: 64, fill: "#6E4128" }, sign);
    el("rect", { x: 300, y: 306, width: 50, height: 34, rx: 4, fill: "#5E1622", stroke: "url(#cu)", "stroke-width": 1.5 }, sign);
    const signTxt = el("text", { x: 325, y: 328, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#F6D3A6" }, sign);
    signTxt.textContent = "للبيع";
    const phone = el("g", { opacity: 0 }, svg);
    el("rect", { x: 22, y: 190, width: 78, height: 148, rx: 12, fill: "url(#phone)", stroke: "url(#cu)", "stroke-width": 1.5 }, phone);
    el("rect", { x: 28, y: 202, width: 66, height: 120, rx: 4, fill: "#F3E6D4" }, phone);
    el("rect", { x: 30, y: 206, width: 62, height: 44, rx: 3, fill: "#E9D3B5" }, phone);
    el("rect", { x: 46, y: 214, width: 30, height: 34, fill: "url(#stone2)" }, phone);
    el("rect", { x: 52, y: 220, width: 18, height: 10, fill: "url(#glass)" }, phone);
    el("rect", { x: 30, y: 256, width: 46, height: 5, rx: 2.5, fill: "#5E1622" }, phone);
    el("rect", { x: 30, y: 266, width: 58, height: 4, rx: 2, fill: "#C9AE8C" }, phone);
    el("rect", { x: 30, y: 274, width: 40, height: 4, rx: 2, fill: "#C9AE8C" }, phone);
    el("rect", { x: 30, y: 290, width: 62, height: 18, rx: 9, fill: "#B87A4B" }, phone);
    el("text", { x: 61, y: 302.5, "text-anchor": "middle", "font-size": 8.5, "font-weight": 700, fill: "#fff" }, phone).textContent = "تواصل الآن";
    const hearts = el("g", {}, svg); const heartList = [];
    for (let i = 0; i < 7; i++) heartList.push(el("path", { d: "M0 3c-4-4-9 1-4 5l4 4 4-4c5-4 0-9-4-5z", fill: i % 2 ? "#E0506A" : "#F6D3A6", opacity: 0 }, hearts));
    const flash = el("rect", { width: 400, height: 500, fill: "#fff", opacity: 0 }, svg);

    /* ---------- property management ---------- */
    const key = el("g", { opacity: 0 }, svg);
    el("circle", { cx: 0, cy: 0, r: 9, fill: "none", stroke: "url(#cu)", "stroke-width": 4 }, key);
    el("path", { d: "M8 0h24v6M26 0v5", fill: "none", stroke: "url(#cu)", "stroke-width": 4, "stroke-linecap": "round" }, key);
    const doc = el("g", { opacity: 0 }, svg);
    el("rect", { x: 24, y: 196, width: 74, height: 96, rx: 6, fill: "#FFFDF8", stroke: "#DCCBB4" }, doc);
    el("rect", { x: 32, y: 206, width: 40, height: 6, rx: 3, fill: "#5E1622" }, doc);
    for (let i = 0; i < 5; i++) el("rect", { x: 32, y: 220 + i * 10, width: 58 - (i % 2) * 14, height: 3.5, rx: 1.7, fill: "#D9C3A6" }, doc);
    const stamp = el("g", { opacity: 0 }, doc);
    el("circle", { cx: 76, cy: 274, r: 13, fill: "none", stroke: "#2F7A55", "stroke-width": 2.5 }, stamp);
    el("path", { d: "M69 274l5 5 9-10", fill: "none", stroke: "#2F7A55", "stroke-width": 3, "stroke-linecap": "round" }, stamp);
    const coins = el("g", {}, svg); const coinList = [];
    for (let i = 0; i < 5; i++) { const c = el("g", { opacity: 0 }, coins);
      el("ellipse", { cx: 0, cy: 0, rx: 9, ry: 9, fill: "url(#cu)", stroke: "#A86A3C" }, c);
      el("text", { x: 0, y: 3.5, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: "#6E4128" }, c).textContent = "﷼"; coinList.push(c); }

    /* ---------- facility management ---------- */
    const gear = el("g", { opacity: 0 }, svg);
    const gearShape = el("g", {}, gear);
    for (let i = 0; i < 8; i++) el("rect", { x: -3, y: -16, width: 6, height: 8, rx: 1, fill: "url(#cu)", transform: `rotate(${i * 45})` }, gearShape);
    el("circle", { r: 11, fill: "url(#cu)" }, gearShape); el("circle", { r: 4.5, fill: "#5E1622" }, gearShape);
    const sparkles = el("g", {}, svg); const spark = [];
    for (let i = 0; i < 8; i++) spark.push(el("path", { d: "M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5z", fill: "#FFF1D6", opacity: 0 }, sparkles));
    const lamps = el("g", { opacity: 0 }, svg);
    [[60, 400], [340, 400]].forEach(([x]) => { el("rect", { x: x - 1.5, y: 352, width: 3, height: 48, fill: "#3A2A26" }, lamps);
      el("circle", { cx: x, cy: 352, r: 4, fill: "#FFE2A8" }, lamps); el("circle", { cx: x, cy: 352, r: 16, fill: "url(#sun)", opacity: .8 }, lamps); });

    /* ---------- HJF mark & captions ---------- */
    const mark = el("image", { href: "img/mark-metal.png", x: 172, y: 140, width: 56, height: 63, opacity: 0 }, svg);
    const capBox = el("g", {}, svg);
    el("rect", { x: 0, y: 0, width: 400, height: 92, fill: "#3F0C15", opacity: .0 }, capBox);
    const cTitle = el("text", { x: 200, y: 48, "text-anchor": "middle", "font-size": 26, "font-weight": 800, fill: "#5E1622" }, capBox);
    const cSub = el("text", { x: 200, y: 74, "text-anchor": "middle", "font-size": 13.5, "font-weight": 500, fill: "#7A4A3C" }, capBox);
    const bars = el("g", {}, svg); const barFill = [];
    for (let i = 0; i < 5; i++) { el("rect", { x: 112 + i * 36, y: 478, width: 30, height: 4, rx: 2, fill: "#E5C3A0", opacity: .3 }, bars);
      barFill.push(el("rect", { x: 112 + i * 36, y: 478, width: 0, height: 4, rx: 2, fill: "url(#cu)" }, bars)); }

    const SCENES = [
      [0, 7.5, "التطوير العقاري", "نبني مشاريع سكنية وتجارية من الأرض للمفتاح"],
      [7.5, 13.5, "التسويق العقاري", "نوصّل عقارك للناس الصح، بإعلانات مرخّصة"],
      [13.5, 19.5, "إدارة الأملاك", "عقود موثّقة، تحصيل منتظم، وراحة بال للمالك"],
      [19.5, 25, "إدارة المرافق", "صيانة ونظافة وتشغيل يحافظ على قيمة عقارك"],
      [25, 32, "البيع على الخارطة", "مع شركائنا من المطورين، نبيع المستقبل اليوم"]
    ];
    const FINAL = ["هجف العقارية", "عقار بثقة، وقيمةٌ تُدار."];
    let lastCap = -1;

    function render(t) {
      // sky: day -> golden -> dusk -> night
      const dusk = seg(t, 19, 26), night = seg(t, 25, 29), back = seg(t, 31.2, 32);
      const k1 = clamp(dusk - back), k2 = clamp(night - back);
      skyStops[0].setAttribute("stop-color", k2 ? mixC([214, 140, 110], [42, 14, 30], k2) : mixC([243, 217, 184], [214, 140, 110], k1));
      skyStops[1].setAttribute("stop-color", k2 ? mixC([240, 190, 150], [94, 22, 34], k2) : mixC([248, 235, 221], [240, 190, 150], k1));
      stars.setAttribute("opacity", k2);
      const sx = mix(60, 330, t / T), sy = 150 - Math.sin(Math.PI * t / T) * 70 + k1 * 130;
      sun.setAttribute("transform", `translate(${sx},${sy})`); sun.setAttribute("opacity", 1 - k2);
      [c1, c2, c3].forEach((c, i) => { const base = [40, 260, 160][i], y = [120, 80, 150][i], s = [.8, .6, .5][i];
        c.setAttribute("transform", `translate(${(base + t * (6 + i * 3)) % 460 - 40},${y}) scale(${s})`); });
      clouds.setAttribute("opacity", .55 * (1 - k2));

      // development
      plot.setAttribute("stroke-dashoffset", 400 * (1 - ease(seg(t, .2, 1.4))));
      const dropT = [[1.4, 2.8], [2.9, 4.3], [4.4, 5.8]];
      floors.forEach((f, i) => { const p = seg(t, ...dropT[i]);
        const off = (1 - bounce(p)) * -(f.y + 60);
        f.g.setAttribute("transform", `translate(0,${off})`); f.g.setAttribute("opacity", p > 0 ? 1 : 0); });
      const cv = seg(t, .8, 1.4) * (1 - seg(t, 6.4, 7.2));
      crane.setAttribute("opacity", cv);
      const active = dropT.findIndex(([a, b]) => t >= a - .4 && t < b);
      const hy = active >= 0 ? clamp(mix(140, floors[active].y - 20, seg(t, dropT[active][0], dropT[active][1]) * .9), 140, 330) : 140;
      hookLine.setAttribute("d", `M200 120V${hy}`); hook.setAttribute("d", `M196 ${hy}h8l-4 6z`);

      // marketing
      const mk = seg(t, 7.8, 8.6) * (1 - seg(t, 13.2, 13.8));
      phone.setAttribute("opacity", mk); phone.setAttribute("transform", `translate(${(1 - ease(seg(t, 7.8, 8.6))) * -90},0)`);
      const sg = seg(t, 8.4, 9.2); sign.setAttribute("opacity", sg && t < 31.5 ? 1 : 0);
      sign.setAttribute("transform", `translate(325,400) scale(${t < 31.5 ? .2 + .8 * bounce(sg) : 0}) translate(-325,-400)`);
      signTxt.textContent = t > 16 ? "للإيجار" : "للبيع";
      flash.setAttribute("opacity", Math.max(0, .7 - Math.abs(t - 9.6) * 3) + Math.max(0, .5 - Math.abs(t - 11.2) * 3));
      heartList.forEach((h, i) => { const p = seg(t, 9.4 + i * .45, 11.2 + i * .45) * (t < 13.6 ? 1 : 0);
        h.setAttribute("opacity", p > 0 && p < 1 ? 1 - p : 0);
        h.setAttribute("transform", `translate(${70 + Math.sin(i * 2 + p * 6) * 14},${300 - p * 120}) scale(${.8 + p * .5})`); });

      // property management
      const pm = seg(t, 13.8, 14.6) * (1 - seg(t, 19.2, 19.8));
      doc.setAttribute("opacity", pm); doc.setAttribute("transform", `translate(0,${(1 - ease(seg(t, 13.8, 14.6))) * 40})`);
      stamp.setAttribute("opacity", seg(t, 15.6, 15.9)); stamp.setAttribute("transform", `translate(76,274) scale(${1 + (1 - ease(seg(t, 15.6, 16))) * 1.5}) translate(-76,-274)`);
      const kp = ease(seg(t, 16.2, 17.6));
      key.setAttribute("opacity", seg(t, 16, 16.3) * (1 - seg(t, 18.4, 18.8)));
      key.setAttribute("transform", `translate(${mix(120, 196, kp)},${mix(250, 372, kp)}) rotate(${kp * 360 + (t > 17.6 ? seg(t, 17.6, 18) * 90 : 0)}) scale(.7)`);
      coinList.forEach((c, i) => { const p = seg(t, 17 + i * .3, 18.4 + i * .3);
        c.setAttribute("opacity", p > 0 && p < 1 ? 1 : 0);
        c.setAttribute("transform", `translate(${mix(200, 62 + i * 6, ease(p))},${mix(380, 250 - i * 8, ease(p))}) scale(${.6 + .4 * p})`); });

      // facility management
      const fm = seg(t, 19.6, 21.2);
      [palmL, palmR].forEach((p, i) => p.setAttribute("transform", `scale(${clamp(ease(seg(t, 19.6 + i * .3, 21 + i * .3)) - back)}) rotate(${Math.sin(t * 1.6 + i) * 2})`));
      gear.setAttribute("opacity", fm * (1 - seg(t, 24.4, 25)));
      gear.setAttribute("transform", `translate(64,250)`); gearShape.setAttribute("transform", `rotate(${t * 90})`);
      spark.forEach((s, i) => { const ph = (t * 1.3 + i * .37) % 1, on = t > 20.5 && t < 25;
        s.setAttribute("opacity", on ? Math.sin(ph * Math.PI) : 0);
        s.setAttribute("transform", `translate(${[130, 270, 160, 240, 205, 140, 280, 190][i]},${[300, 290, 240, 236, 360, 360, 360, 270][i]}) scale(${.5 + Math.sin(ph * Math.PI)})`); });
      lamps.setAttribute("opacity", clamp(seg(t, 22, 23) - back));
      winLit.forEach((w, i) => w.setAttribute("opacity", clamp(seg(t, 21.5 + i * .35, 22.2 + i * .35) - back) * .95));

      // off-plan + finale
      const op = seg(t, 25, 27.5);
      bp.setAttribute("opacity", clamp(seg(t, 25, 25.4) - back));
      bpLines.forEach((p, i) => p.setAttribute("stroke-dashoffset", 900 * (1 - easeIO(clamp(op * 1.4 - i * .03)))));
      bpTag.setAttribute("opacity", clamp(seg(t, 27, 27.5) - seg(t, 29.2, 29.6)));
      const fin = seg(t, 29.2, 30);
      mark.setAttribute("opacity", clamp(fin - back));
      mark.setAttribute("transform", `translate(200,171) scale(${.6 + .4 * ease(fin)}) translate(-200,-171)`);

      // captions
      let ci = SCENES.findIndex(([a, b]) => t >= a && t < b);
      const isFinal = t >= 29.2;
      const capKey = isFinal ? 99 : ci;
      if (capKey !== lastCap) { lastCap = capKey;
        const [ti, su] = isFinal ? FINAL : [SCENES[ci][2], SCENES[ci][3]];
        cTitle.textContent = ti; cSub.textContent = su; }
      const a = isFinal ? seg(t, 29.2, 29.8) * (1 - seg(t, 31.4, 32)) : Math.min(seg(t, SCENES[ci][0], SCENES[ci][0] + .5), 1 - seg(t, SCENES[ci][1] - .4, SCENES[ci][1]));
      const night2 = k2 > .2;
      cTitle.setAttribute("fill", night2 ? "#F6D3A6" : "#5E1622"); cSub.setAttribute("fill", night2 ? "#EAD9D3" : "#7A4A3C");
      capBox.setAttribute("opacity", a); capBox.setAttribute("transform", `translate(0,${(1 - a) * 8})`);
      barFill.forEach((b, i) => { const [s0, s1] = SCENES[i]; b.setAttribute("width", 30 * clamp((t - s0) / (s1 - s0))); });
    }

    window.__hjfRender = render; // for screenshots
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { render(30.4); }
    else {
      let start = null, raf = null, visible = false, elapsed = 0;
      const loop = now => { if (start === null) start = now - elapsed * 1000;
        elapsed = ((now - start) / 1000) % T; render(elapsed); raf = requestAnimationFrame(loop); };
      const io = new IntersectionObserver(es => es.forEach(e => {
        visible = e.isIntersecting;
        if (visible && !raf) { start = null; raf = requestAnimationFrame(loop); }
        if (!visible && raf) { cancelAnimationFrame(raf); raf = null; }
      }), { threshold: .15 });
      io.observe(host);
      render(0);
    }
  }
}

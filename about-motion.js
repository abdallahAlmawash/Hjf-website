/* HJF "who we are" motion.
   A real (invented) tower on King Fahd Road is assembled block by block as a
   technical wireframe, then turns into a real street scene and holds there.
   Canvas 2D + a small perspective projector, no libraries. One rAF clock,
   paused off-screen; reduced-motion users get the finished still. */
{
  const host = document.getElementById("hjfMotion");
  if (host) {
    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.dir = "ltr"; cv.style.direction = "ltr";
    host.appendChild(cv);
    const g0 = cv.getContext("2d"); g0.direction = "ltr"; let g = g0;
    const cache = document.createElement("canvas"); let cacheOK = false;
    const T = 16; // loop seconds
    const HOLD = 9.7; // the real scene holds still (camera-wise) from here

    /* ---------- tiny math ---------- */
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const eOut = x => 1 - Math.pow(1 - x, 3);
    const eIO = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const eBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
    const mix = (a, b, k) => a + (b - a) * k;
    const mixv = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
    const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
    const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    let rs = 11; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
    const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 1442695041) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const lerpP = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];

    const CU = [214, 160, 118];
    const BG = [36, 9, 15];
    const cu = a => `rgba(${CU[0]},${CU[1]},${CU[2]},${a})`;
    const S = .5;          // block size in world units (1 world unit = 3.2 m → block = 1.6 m)
    const M = 3.2;         // metres per world unit

    /* ---------- the building, in blocks ---------- */
    // materials
    const GL = 1, GD = 2, SP = 3, ST = 4, SL = 5, MT = 6, LV = 7, RF = 8;
    const vox = new Map();
    const K = (x, y, z) => ((x + 128) * 512 + y) * 512 + (z + 128);
    const put = (x, y, z, m) => vox.set(K(x, y, z), { x, y, z, m });
    // hollow shell with a roof slab and a few structural slabs (what you see while it rises)
    const shell = (x0, x1, y0, y1, z0, z1, mat, o = {}) => {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) {
        const edgeX = x === x0 || x === x1 - 1, edgeZ = z === z0 || z === z1 - 1;
        if (o.chamfer && edgeX && edgeZ) continue;
        const wall = edgeX || edgeZ, roof = y === y1 - 1, slab = o.slab && (y - y0) % o.slab === o.slab - 1;
        if (!(wall || roof || slab)) continue;
        if (o.chamfer && (roof || slab) && !wall) { /* fine */ }
        put(x, y, z, wall && !roof ? mat(x, y, z) : RF);
      }
    };
    // podium: double-height glass retail base, limestone above
    shell(-14, 12, 0, 6, -8, 8, (x, y) => (y < 4 ? ((x + 14) % 4 === 0 ? ST : GD) : (y === 4 && (x + 14) % 4 !== 0 ? GD : ST)));
    for (let x = -7; x < 5; x++) for (let z = -11; z < -8; z++) put(x, 4, z, MT);           // entrance canopy
    for (const x of [-7, 4]) for (let y = 0; y < 4; y++) put(x, y, -10, MT);                // canopy columns
    // tower: chamfered, glass with spandrel bands, limestone fins, open crown
    const TX0 = -11, TX1 = 1, TZ0 = -6, TZ1 = 4, TY0 = 6, TY1 = 52;
    shell(TX0, TX1, TY0, TY1, TZ0, TZ1, (x, y) => ((y - TY0) % 2 === 1 ? SP : GL), { chamfer: 1, slab: 12 });
    for (let y = TY0; y < TY1 + 6; y++) {
      for (let x = TX0 + 1; x < TX1 - 1; x++) if ((x - TX0) % 3 === 1) { put(x, y, TZ0 - 1, SL); put(x, y, TZ1, SL); }
      for (let z = TZ0 + 1; z < TZ1 - 1; z++) if ((z - TZ0) % 3 === 1) { put(TX0 - 1, y, z, SL); put(TX1, y, z, SL); }
    }
    for (let x = TX0 - 1; x <= TX1; x++) { put(x, TY1 + 5, TZ0 - 1, SL); put(x, TY1 + 5, TZ1, SL); }   // crown ring
    for (let z = TZ0 - 1; z <= TZ1; z++) { put(TX0 - 1, TY1 + 5, z, SL); put(TX1, TY1 + 5, z, SL); }
    shell(-8, -2, TY1, TY1 + 3, -3, 1, () => ST);                                                // rooftop plant
    // residential wing: balconies with timber louvres
    shell(3, 12, 6, 26, -5, 5, (x, y, z) => (z === -5 ? ((x % 3 === 0) ? LV : GL) : ((y % 2) ? SP : GL)));
    for (let y = 7; y < 26; y += 2) for (let x = 3; x < 12; x++) { put(x, y, -6, SL); if (x === 3 || x === 11) put(x, y + 1, -6, SL); }
    const V = [...vox.values()];

    // which faces stay visible once everything has landed
    const DIRS = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    const CORN = [
      [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]],
      [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
      [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]];
    const WSH = [.30, .05, .18, .12, .15, .22];
    V.forEach(v => { v.f = []; for (let i = 0; i < 6; i++) { const d = DIRS[i];
      if (!vox.has(K(v.x + d[0], v.y + d[1], v.z + d[2]))) v.f.push(i); } v.up = vox.get(K(v.x, v.y + 1, v.z)); });
    // assembly order: bottom-up waves that sweep around, with jitter
    V.forEach(v => { v.o = v.y + (Math.atan2(v.z, v.x + 2) + Math.PI) * .9 + rnd() * 3; });
    V.sort((a, b) => a.o - b.o);
    const B0 = 1.2, B1 = 6.7, DUR = .36;
    V.forEach((v, i) => { v.t0 = B0 + (B1 - B0) * (i / V.length); v.dx = (rnd() - .5) * 2.4; v.dz = (rnd() - .5) * 2.4; v.p = 0; v.h = hash(v.x, v.y, v.z); });
    const TOPM = (TY1 + 6) * S * M;

    const FP = [[-14, 12, -8, 8, 6], [TX0 - 1, TX1 + 1, TZ0 - 1, TZ1 + 1, TY1 + 6], [3, 12, -6, 5, 26]];

    /* ---------- context: King Fahd Road, neighbours, skyline ---------- */
    const NB = []; // neighbouring buildings (world units)
    [[-34, -22, 10, 22, 9], [-20, -12, 12, 20, 14], [16, 26, 10, 20, 7], [28, 40, 8, 18, 12], [-48, -36, 6, 16, 5],
     [44, 56, 10, 22, 16], [-10, 2, 26, 36, 20], [6, 16, 24, 34, 11], [-30, -18, 30, 42, 26], [20, 32, 28, 40, 18],
     [-60, -48, 20, 32, 10], [58, 70, 26, 38, 9]].forEach(([x0, x1, z0, z1, h], i) =>
      NB.push({ x0, x1, z0, z1, h, c: [[222, 214, 200], [206, 200, 192], [230, 224, 212], [190, 186, 180], [214, 202, 184]][i % 5], gl: i % 3 === 1 }));
    const LANES = [[-11, 1, 7], [-13, 1, 6], [-16, 1, 9.5], [-18, 1, 8.5], [-20, 1, 10.5], [-24.5, -1, 9], [-26.5, -1, 10], [-28.5, -1, 8.2]];
    const CARC = [[236, 236, 234], [226, 226, 224], [40, 42, 46], [168, 170, 174], [120, 124, 130], [244, 242, 236], [200, 192, 176], [96, 24, 30], [28, 30, 34], [190, 194, 198]];
    const CARS = []; LANES.forEach(([z, dir, sp], li) => { for (let k = 0; k < 3; k++)
      CARS.push({ z, dir, sp: sp * (.9 + rnd() * .2), off: rnd() * 120, c: CARC[(li * 3 + k) % CARC.length], suv: rnd() > .6 }); });
    // procedural cloud layer (fBm noise, made once): soft, irregular, photographic
    const clouds = document.createElement("canvas"); clouds.width = 384; clouds.height = 128;
    { const cw = 384, ch = 128, cx = clouds.getContext("2d"), id = cx.createImageData(cw, ch);
      const G = 64, grid = new Float32Array(G * G); for (let i = 0; i < grid.length; i++) grid[i] = rnd();
      const sm = x => x * x * (3 - 2 * x);
      const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
        const a = grid[(yi & 63) * G + (xi & 63)], b = grid[(yi & 63) * G + ((xi + 1) & 63)], c = grid[((yi + 1) & 63) * G + (xi & 63)], d = grid[((yi + 1) & 63) * G + ((xi + 1) & 63)];
        return mix(mix(a, b, xf), mix(c, d, xf), yf); };
      const fbm = (x, y) => { let v = 0, a = .5; for (let o = 0; o < 5; o++) { v += a * vn(x, y); x *= 2.03; y *= 2.03; a *= .5; } return v; };
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const u = x / cw * 9, w = y / ch * 3, n = fbm(u, w * 1.6), n2 = fbm(u, w * 1.6 - .08);
        const edge = Math.sin(Math.PI * y / ch);                       // fade top & bottom of the strip
        const dens = Math.pow(clamp((n - .47) * 5.5), .8) * edge;
        const lightK = clamp(.55 + (n2 - n) * 14);                       // lit tops, greyer bellies
        const c = mixv([178, 188, 202], [255, 255, 255], lightK);
        const i = (y * cw + x) * 4; id.data[i] = c[0]; id.data[i + 1] = c[1]; id.data[i + 2] = c[2]; id.data[i + 3] = dens * 245;
      }
      cx.putImageData(id, 0, 0); }
    const CITY = []; for (let i = 0; i < 90; i++) CITY.push([rnd(), .004 + rnd() * .03, .006 + rnd() * .02, rnd()]);
    // film grain tile
    const grain = document.createElement("canvas"); grain.width = grain.height = 96;
    { const gx = grain.getContext("2d"), id = gx.createImageData(96, 96);
      for (let i = 0; i < id.data.length; i += 4) { const n = rnd() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = n; id.data[i + 3] = 255; }
      gx.putImageData(id, 0, 0); }
    let grainPat = null;

    /* ---------- camera ---------- */
    let W = 0, H = 0, DPR = 1;
    const cam = { yaw: 0, pitch: .5, dist: 40, tx: -1, ty: 9, tz: 0, f: 1 };
    let cy, sy, cp, sp;
    const setCam = () => { cy = Math.cos(cam.yaw); sy = Math.sin(cam.yaw); cp = Math.cos(cam.pitch); sp = Math.sin(cam.pitch); };
    const P = (x, y, z) => {
      x -= cam.tx; y -= cam.ty; z -= cam.tz;
      const rx = x * cy - z * sy, rz = x * sy + z * cy;
      const ry = y * cp + rz * sp, d = -y * sp + rz * cp + cam.dist;
      const k = cam.f / d;
      return [W / 2 + rx * k, H * .56 - ry * k, d];
    };
    const camPos = () => { const rz = -cam.dist * cp; return [rz * sy + cam.tx, cam.dist * sp + cam.ty, rz * cy + cam.tz]; };
    const resize = () => {
      const r = host.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, W < 500 ? 1.75 : 2);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      cache.width = cv.width; cache.height = cv.height; cacheOK = false;
      cam.f = Math.min(W, H * .8) * 1.6;
      grainPat = g.createPattern(grain, "repeat");
    };

    /* ---------- drawing helpers ---------- */
    const line = (a, b, w, s) => { g.lineWidth = w; g.strokeStyle = s; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    const path = pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
    const poly = (pts, fill, stroke, w = .8) => { path(pts); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = w; g.strokeStyle = stroke; g.stroke(); } };
    const mono = (s, x, y, a, size = 9, align = "left") => {
      g.font = `500 ${size}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
      g.textAlign = align; g.fillStyle = cu(a); g.fillText(s, x, y);
    };
    const front = pts => !pts.some(p => p[2] <= 1);
    const SUN = (() => { const v = [-.6, .62, -.5], l = Math.hypot(...v); return v.map(c => c / l); })();
    const lam = n => Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]);
    const HAZE = [226, 220, 208], SKYTOP = [92, 140, 190], SKYMID = [150, 184, 214];
    const fogK = d => clamp((d - 40) / 260) * .7;
    const MATC = { [GL]: [72, 100, 120], [GD]: [42, 52, 60], [SP]: [88, 94, 100], [ST]: [220, 208, 188],
      [SL]: [236, 228, 214], [MT]: [64, 64, 66], [LV]: [150, 104, 66], [RF]: [176, 168, 156] };

    // a box as depth-sorted faces (neighbours, cars)
    const boxFaces = (out, x0, x1, y0, y1, z0, z1, col, E, extra) => {
      for (let i = 0; i < 6; i++) { const n = DIRS[i];
        const fx = n[0] ? (n[0] > 0 ? x1 : x0) : (x0 + x1) / 2, fy = n[1] ? (n[1] > 0 ? y1 : y0) : (y0 + y1) / 2, fz = n[2] ? (n[2] > 0 ? z1 : z0) : (z0 + z1) / 2;
        if ((E[0] - fx) * n[0] + (E[1] - fy) * n[1] + (E[2] - fz) * n[2] <= 0) continue;
        const pts = CORN[i].map(c => P(c[0] ? x1 : x0, c[1] ? y1 : y0, c[2] ? z1 : z0)); if (!front(pts)) continue;
        out.push({ k: 2, pts, d: (pts[0][2] + pts[2][2]) / 2, n, col, i, h: y1 - y0, extra }); }
    };

    /* ---------- frame ---------- */
    function scene(t, mode) {
      const tc = Math.min(t, HOLD), tb = mode === "dyn" ? tc : t;   // camera time; backdrop time
      const real = eIO(seg(tc, 8.3, 9.7));
      const wire = 1 - real;
      // camera: orbiting build → low street-level hero shot that holds
      const yW = -.95 + tc * .1, yR = .3 + (tc - 9) * .02;
      cam.yaw = mix(yW, yR, real);
      cam.pitch = mix(.4 + .07 * Math.sin(tc * .45), .085, real);
      cam.dist = mix(66 - 10 * eIO(seg(tc, 0, 7)), 58 - (tc - 9) * .5, real);
      cam.ty = mix(13.5, 12.5, real); cam.tx = mix(-1, 1.5, real);
      setCam();
      const E = camPos();
      const hor = H * .56 - cam.f * Math.tan(cam.pitch);

      if (mode !== "dyn") {
      /* --- backdrop --- */
      g.fillStyle = rgb(BG); g.fillRect(0, 0, W, H);
      if (wire > 0) { const rg = g.createRadialGradient(W * .5, H * .55, 0, W * .5, H * .55, Math.max(W, H) * .75);
        rg.addColorStop(0, `rgba(120,40,52,${.38 * wire})`); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
      if (real > 0) {
        g.globalAlpha = real;
        const sg = g.createLinearGradient(0, hor - H * 1.1, 0, hor);
        sg.addColorStop(0, rgb(SKYTOP)); sg.addColorStop(.6, rgb(SKYMID)); sg.addColorStop(.92, "rgb(214,220,222)"); sg.addColorStop(1, rgb(HAZE));
        g.fillStyle = sg; g.fillRect(0, 0, W, hor + 2);
        // sun glare from the light direction
        const sp2 = P(E[0] + SUN[0] * 900, E[1] + SUN[1] * 900, E[2] + SUN[2] * 900);
        const sx = sp2[2] > 1 ? sp2[0] : -W * .3, syy = sp2[2] > 1 ? sp2[1] : -H * .2;
        const gl = g.createRadialGradient(sx, syy, 0, sx, syy, Math.max(W, H) * .9);
        gl.addColorStop(0, "rgba(255,250,236,.55)"); gl.addColorStop(.04, "rgba(255,244,222,.32)"); gl.addColorStop(.3, "rgba(255,240,214,.14)"); gl.addColorStop(1, "rgba(255,240,214,0)");
        g.fillStyle = gl; g.fillRect(0, 0, W, hor + 2);
        // two cloud decks, the far one squashed toward the horizon
        const drift = (tb * 3) % (W * 2.2);
        g.globalAlpha = real * .95; g.drawImage(clouds, -drift, hor - H * .78, W * 2.2, H * .5); g.drawImage(clouds, W * 2.2 - drift, hor - H * .78, W * 2.2, H * .5);
        g.globalAlpha = real * .7; g.drawImage(clouds, -W * .4 - drift * .5, hor - H * .3, W * 1.8, H * .2);
        g.globalAlpha = real;
        // ground beyond the street
        const gg = g.createLinearGradient(0, hor, 0, H);
        gg.addColorStop(0, "rgb(206,198,184)"); gg.addColorStop(.3, "rgb(176,166,150)"); gg.addColorStop(1, "rgb(128,120,108)");
        g.fillStyle = gg; g.fillRect(0, hor, W, H - hor);
        /* Riyadh skyline in the haze: low city band, Al Faisaliah, Kingdom Centre, KAFD */
        g.save(); g.beginPath(); g.rect(0, 0, W, hor + 1); g.clip();
        CITY.forEach(([u, w, h2, r]) => { const bx = u * W * 1.4 - W * .2 - (cam.yaw - .3) * W * .6, bw = w * W * 3, bh = h2 * H * 1.6;
          g.fillStyle = rgb(mixv([160, 156, 150], HAZE, .55 + r * .25)); g.fillRect(bx, hor - bh, bw, bh + 1); });
        const far = (ang, R, hM) => { const a = yR + ang, X = cam.tx + Math.sin(a) * R, Z = cam.tz + Math.cos(a) * R;
          const b = P(X, 0, Z), tp = P(X, hM / M, Z); return b[2] > 1 ? { x: b[0], y: hor, h: b[1] - tp[1] } : null; };
        const tone = (k, warm) => rgb(mixv(warm ? [120, 118, 110] : [92, 104, 116], HAZE, k));
        // Al Faisaliah: four tapering legs to a point, golden sphere, spire
        let L = far(-.17, 520, 267);
        if (L) { const { x, y, h } = L, w = h * .24;
          g.fillStyle = tone(.5); g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w * .06, y - h * .9); g.lineTo(x, y - h); g.lineTo(x + w * .06, y - h * .9); g.lineTo(x + w / 2, y); g.fill();
          g.fillStyle = rgb(mixv([206, 168, 104], HAZE, .32)); g.beginPath(); g.arc(x, y - h * .73, w * .13, 0, 6.3); g.fill();
          g.fillStyle = tone(.62); for (let k = 1; k < 7; k++) { const yy = y - h * k * .1, ww = w * (1 - k * .1) * .5; g.fillRect(x - ww, yy, ww * 2, Math.max(.6, h * .006)); } }
        // Kingdom Centre: tapered body, parabolic void at the top, sky bridge
        L = far(.14, 640, 302);
        if (L) { const { x, y, h } = L, w = h * .25;
          g.fillStyle = tone(.48); g.beginPath(); g.moveTo(x - w / 2, y);
          g.bezierCurveTo(x - w * .5, y - h * .55, x - w * .42, y - h * .85, x - w * .27, y - h);
          g.quadraticCurveTo(x - w * .12, y - h * .7, x, y - h * .66); g.quadraticCurveTo(x + w * .12, y - h * .7, x + w * .27, y - h);
          g.bezierCurveTo(x + w * .42, y - h * .85, x + w * .5, y - h * .55, x + w / 2, y); g.closePath(); g.fill();
          g.fillStyle = tone(.42); g.fillRect(x - w * .23, y - h * .855, w * .46, Math.max(1, h * .02));
          g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(x - w * .1, y - h * .64, w * .08, h * .62); }
        // KAFD cluster: faceted towers with sloped crowns
        [[.24, 900, 385, .2, .14], [.27, 940, 300, .16, .1], [.205, 980, 260, .17, .2], [.3, 1000, 220, .15, .05], [-.27, 880, 180, .18, .12], [.33, 960, 190, .14, .16]].forEach(([a, R, hM, wr, sl]) => {
          const q = far(a, R, hM); if (!q) return; const { x, y, h } = q, w = h * wr;
          g.fillStyle = tone(.58); g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h * (1 - sl)); g.lineTo(x + w * .2, y - h); g.lineTo(x + w / 2, y - h * (1 - sl * .4)); g.lineTo(x + w / 2, y); g.fill(); });
        g.restore();
        const hz = g.createLinearGradient(0, hor - H * .08, 0, hor + H * .06);
        hz.addColorStop(0, "rgba(226,220,208,0)"); hz.addColorStop(.6, "rgba(226,220,208,.55)"); hz.addColorStop(1, "rgba(226,220,208,0)");
        g.fillStyle = hz; g.fillRect(0, hor - H * .08, W, H * .14);
        g.globalAlpha = 1;
      }

      /* --- technical layer (fades out on the reveal) --- */
      if (wire > .01) {
        const gr = eOut(seg(t, 0, 1.3)) * wire, N = 16;
        for (let i = -N; i <= N; i++) { const major = i % 4 === 0, a = (major ? .2 : .08) * gr, L2 = N * gr;
          if (Math.abs(i) > L2) continue;
          line(P(i, 0, -L2), P(i, 0, L2), major ? .8 : .5, cu(a)); line(P(-L2, 0, i), P(L2, 0, i), major ? .8 : .5, cu(a)); }
        const ax = eOut(seg(t, .3, 1.4)) * wire;
        if (ax > 0) { line(P(-N * ax, 0, -6), P(N * ax, 0, -6), 1, cu(.55 * ax)); line(P(-9, 0, -N * ax), P(-9, 0, N * ax), 1, cu(.55 * ax));
          for (let i = -N; i <= N; i += 2) line(P(i, 0, -6), P(i, 0, -6.35), 1, cu(.5 * ax)); }
        const fp = seg(t, .6, 1.6), gh = seg(t, 1, 2.2) * (1 - seg(t, 6.6, 7.8));
        FP.forEach(([a0, a1, b0, b1, hh], i) => {
          const k = eOut(clamp(fp * 1.6 - i * .15)) * wire; if (k <= 0) return;
          const c = [[a0 * S, b0 * S], [a1 * S, b0 * S], [a1 * S, b1 * S], [a0 * S, b1 * S]], H2 = hh * S;
          g.setLineDash([4, 3]);
          for (let j = 0; j < 4; j++) { const p = c[j], q = c[(j + 1) % 4]; line(P(p[0], 0, p[1]), P(p[0] + (q[0] - p[0]) * k, 0, p[1] + (q[1] - p[1]) * k), 1, cu(.75 * k)); }
          g.setLineDash([]);
          if (gh > 0) { const a = .2 * eOut(clamp(gh * 1.5 - i * .1)) * wire, y = H2 * eOut(gh);
            c.forEach(p => line(P(p[0], 0, p[1]), P(p[0], y, p[1]), .6, cu(a)));
            for (let j = 0; j < 4; j++) { const p = c[j], q = c[(j + 1) % 4]; line(P(p[0], y, p[1]), P(q[0], y, q[1]), .6, cu(a)); } }
          c.forEach(p => { const s = P(p[0], 0, p[1]), r = 4 * k; line([s[0] - r, s[1]], [s[0] + r, s[1]], .8, cu(.6 * k)); line([s[0], s[1] - r], [s[0], s[1] + r], .8, cu(.6 * k)); });
        });
        const dm = eOut(seg(t, 7, 7.9)) * wire;
        if (dm > 0) { const X = (TX0 - 2.5) * S, Z = TZ0 * S, h = (TY1 + 6) * S * dm, a1 = P(X, h, Z);
          line(P(X, 0, Z), a1, .9, cu(.9 * dm));
          [0, h].forEach(y => { const p = P(X, y, Z); line([p[0] - 5, p[1]], [p[0] + 5, p[1]], .9, cu(.9 * dm)); });
          mono("+" + (TOPM * dm).toFixed(1) + "m", a1[0] - 8, a1[1] - 6, .95 * dm, 10, "right");
          for (let fl = 5; fl * 2 * S <= h; fl += 5) { const p = P(X, fl * 2 * S, Z); line([p[0] - 3, p[1]], [p[0] + 3, p[1]], .8, cu(.6 * dm)); mono("L" + String(fl).padStart(2, "0"), p[0] - 8, p[1] + 3, .55 * dm, 8, "right"); }
          const b0 = P(-14 * S, 0, -9 * S - 1.2), b1 = P((-14 + 26 * dm) * S, 0, -9 * S - 1.2);
          line(b0, b1, .9, cu(.8 * dm)); [b0, b1].forEach(p => line([p[0], p[1] - 4], [p[0], p[1] + 4], .9, cu(.8 * dm)));
          mono((26 * S * M * dm).toFixed(1) + "m", (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2 + 14, .8 * dm, 9, "center"); }
      }

      /* --- street furniture on the ground (real) --- */
      if (real > 0) {
        g.globalAlpha = real;
        const strip = (z0, z1, col, x0 = -90, x1 = 90, y = .01) => { for (let x = x0; x < x1; x += 10) {
          const pts = [P(x, y, z0), P(x + 10, y, z0), P(x + 10, y, z1), P(x, y, z1)]; if (front(pts)) poly(pts, col, col, .6); } };
        strip(-9.2, 14, "rgb(196,188,174)");                 // urban block ground
        strip(-9.2, -4.4, "rgb(212,206,196)", -40, 40, .02); // plaza paving
        for (let x = -40; x < 40; x += 2) { const pts = [P(x, .025, -9.2), P(x + .05, .025, -9.2), P(x + .05, .025, -4.4), P(x, .025, -4.4)]; if (front(pts)) poly(pts, "rgba(150,140,126,.35)"); }
        strip(-10.1, -9.2, "rgb(222,218,210)", -90, 90, .08);  // kerb + pavement
        strip(-14.2, -10.1, "rgb(74,74,74)");                  // service road
        strip(-15.1, -14.2, "rgb(206,200,188)", -90, 90, .08); // island
        strip(-21.4, -15.1, "rgb(66,66,67)");                  // main carriageway
        strip(-22.6, -21.4, "rgb(200,194,182)", -90, 90, .1);  // median
        strip(-29.6, -22.6, "rgb(68,68,69)");                  // opposite carriageway
        strip(-31, -29.6, "rgb(214,210,202)", -90, 90, .08);
        // lane markings
        [[-12.15, 1], [-17.15, 1], [-19.25, 1], [-24.6, 1], [-26.6, 1]].forEach(([z]) => { for (let x = -90; x < 90; x += 4) {
          const pts = [P(x, .03, z - .07), P(x + 2, .03, z - .07), P(x + 2, .03, z + .07), P(x, .03, z + .07)]; if (front(pts)) poly(pts, "rgba(240,238,230,.9)"); } });
        [-15.25, -21.25, -22.75, -29.45, -10.25, -14.05].forEach(z => strip(z - .06, z + .06, "rgba(236,226,190,.85)", -90, 90, .03));
        // contact shadows of the masses (sun from the front-left)
        g.save(); g.globalAlpha = real * .32; g.fillStyle = "#2c241c";
        const shadowOf = (x0, x1, z0, z1, h) => { const dx = -SUN[0] / SUN[1] * h, dz = -SUN[2] / SUN[1] * h;
          const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].flatMap(([x, z]) => [P(x, .04, z), P(x + dx, .04, z + dz)]);
          if (!front(pts)) return; pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
          const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
          for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
          for (const p of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
          path(lo.slice(0, -1).concat(up.slice(0, -1))); g.fill(); };
        shadowOf(-14 * S, 12 * S, -8 * S, 8 * S, 6 * S); shadowOf(TX0 * S, TX1 * S, TZ0 * S, TZ1 * S, (TY1 + 6) * S); shadowOf(3 * S, 12 * S, -5 * S, 5 * S, 26 * S);
        NB.forEach(b => shadowOf(b.x0, b.x1, b.z0, b.z1, b.h));
        g.restore(); g.globalAlpha = 1;
      }
      } // end static backdrop

      /* --- the depth-sorted scene: building blocks, neighbours, cars, lamps --- */
      const items = []; let placed = 0, top = 0;
      for (const v of V) { v.p = seg(t, v.t0, v.t0 + DUR); if (v.p >= 1) { placed++; if (v.y + 1 > top) top = v.y + 1; } }
      for (const v of V) {
        const p = v.p; if (p <= 0 || mode === "dyn") continue;
        const k = eBack(p), ox = v.dx * (1 - eOut(p)), oy = 5 * (1 - k), oz = v.dz * (1 - eOut(p));
        const alpha = clamp(p * 3), bx = v.x * S + ox, by = v.y * S + oy, bz = v.z * S + oz, settled = p >= 1;
        const list = settled ? v.f : [0, 1, 2, 3, 4, 5];
        const topOpen = settled && v.up && v.up.p < 1;
        for (let q = 0; q < list.length + (topOpen ? 1 : 0); q++) {
          const i = q < list.length ? list[q] : 0, n = DIRS[i];
          const fx = bx + S * (.5 + n[0] * .5), fy = by + S * (.5 + n[1] * .5), fz = bz + S * (.5 + n[2] * .5);
          if ((E[0] - fx) * n[0] + (E[1] - fy) * n[1] + (E[2] - fz) * n[2] <= 0) continue;
          const pts = CORN[i].map(c => P(bx + c[0] * S, by + c[1] * S, bz + c[2] * S)); if (!front(pts)) continue;
          items.push({ k: 1, pts, d: (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4, i, v, alpha, fresh: settled ? 0 : 1 - p });
        }
      }
      if (real > 0) {
        if (mode !== "dyn") NB.forEach(b => boxFaces(items, b.x0, b.x1, 0, b.h, b.z0, b.z1, b.c, E, b));
        if (mode !== "static") CARS.forEach(c => {
          const x = ((c.off + t * c.sp * c.dir) % 140 + 140) % 140 - 70, L = c.suv ? 1.55 : 1.45, Wd = .6, Hb = c.suv ? .36 : .3;
          const x0 = x - L / 2, x1 = x + L / 2, z0 = c.z - Wd / 2, z1 = c.z + Wd / 2;
          const sh = [P(x0 - .05, .02, z0 - .04), P(x1 + .05, .02, z0 - .04), P(x1 + .05, .02, z1 + .04), P(x0 - .05, .02, z1 + .04)];
          if (front(sh)) items.push({ k: 4, pts: sh, d: (sh[0][2] + sh[2][2]) / 2 + .5 });
          boxFaces(items, x0, x1, .1, .1 + Hb, z0, z1, c.c, E, { car: c, part: 0 });
          const cx0 = c.dir > 0 ? x0 + L * .28 : x0 + L * .18, cx1 = c.dir > 0 ? x1 - L * .18 : x1 - L * .28;
          boxFaces(items, cx0, cx1, .1 + Hb, .1 + Hb + (c.suv ? .24 : .2), z0 + .05, z1 - .05, [34, 40, 48], E, { car: c, part: 1 });
        });
        if (mode !== "static") for (let x = -84; x <= 84; x += 9) { const b = P(x, 0, -22), tp = P(x, 3.4, -22); if (b[2] > 1) items.push({ k: 3, b, tp, d: b[2] - .1, x }); }
      }
      items.sort((a, b) => b.d - a.d);

      for (const f of items) {
        if (f.k === 1) {                         // a building block face
          const v = f.v, s = WSH[f.i], n = DIRS[f.i];
          const wc = [36 + 150 * s, 10 + 70 * s, 16 + 50 * s];
          if (real <= 0) { poly(f.pts, rgb(wc, .96 * f.alpha), cu((.5 + .5 * f.fresh) * f.alpha), .55 + f.fresh * .7); continue; }
          let m = v.m; if (n[1] !== 0 && (m === GL || m === SP || m === GD || m === LV)) m = RF;
          const lit = .44 + .56 * lam(n) + (n[1] > 0 ? .08 : 0);
          let c = mul(MATC[m], lit);
          if (m === GL || m === GD) {          // glass: sky reflection rises with height, a soft sheen sweeps across
            const hgt = clamp(v.y / (TY1 + 4)), sx = (f.pts[0][0] + f.pts[2][0]) / 2;
            const sheen = Math.exp(-Math.pow((sx - W * (.35 + .1 * Math.sin(t * .3))) / (W * .12), 2)) * .25;
            c = mixv(c, mixv([150, 176, 200], [206, 222, 236], hgt), clamp(.18 + hgt * .45 + sheen + (v.h - .5) * .12));
            if (m === GD) c = mul(c, .7);
          } else c = mul(c, .97 + v.h * .06);
          c = mixv(c, HAZE, fogK(f.d));
          const out = rgb(mixv(wc, c, real), f.alpha);
          const edge = (m === GL || m === GD) ? rgb(mixv(CU, mul(c, .62), real), (.5 + .5 * real) * f.alpha) : (wire > .02 ? cu(.5 * wire * f.alpha) : out);
          poly(f.pts, out, edge, (m === GL || m === GD) ? .45 : .6);
        } else if (f.k === 2) {                  // neighbours & cars
          const n = f.n, lit = .45 + .55 * lam(n) + (n[1] > 0 ? .06 : 0);
          let c = mul(f.col, lit);
          if (f.extra && f.extra.car) { if (f.extra.part === 1 && n[1] === 0) c = mixv(c, [150, 176, 200], .3 + .2 * lam(n)); if (n[1] > 0 && f.extra.part === 0) c = mixv(c, [255, 255, 255], .15); }
          c = mixv(c, HAZE, fogK(f.d));
          g.globalAlpha = real; poly(f.pts, rgb(c), rgb(c), .5);
          if (n[1] === 0) {
            const [a, b, cc, d] = f.pts, vAB = CORN[f.i][0][1] !== CORN[f.i][1][1];
            const bl = a, tl = vAB ? b : d, tr = cc, br = vAB ? d : b;
            const pt = (u, w) => lerpP(lerpP(bl, br, u), lerpP(tl, tr, u), w);
            if (!f.extra.car) {                  // ribbon windows per floor + mullions on neighbours
              const fl = Math.round(f.h), fg = fogK(f.d);
              const wc2 = rgb(mixv(mul(f.extra.gl ? [86, 110, 128] : [92, 100, 108], .6 + .5 * lam(n)), HAZE, fg), .9);
              for (let j = 0; j < fl; j++) { const k0 = (j + .3) / fl, k1 = (j + (f.extra.gl ? .92 : .72)) / fl;
                poly([pt(0, k0), pt(1, k0), pt(1, k1), pt(0, k1)], wc2); }
              const cols = Math.max(2, Math.round(Math.hypot(br[0] - bl[0], br[1] - bl[1]) / 9));
              for (let j = 1; j < cols; j++) line(pt(j / cols, 0), pt(j / cols, 1), .5, rgb(mixv(mul(f.col, lit), HAZE, fg), .85));
            } else if (f.extra.part === 0 && n[0] !== 0) {   // head / tail lights
              const head = (n[0] > 0) === (f.extra.car.dir > 0), col = head ? "rgba(255,250,232,.95)" : "rgba(200,24,24,.95)";
              [[.06, .22], [.78, .94]].forEach(([u0, u1]) => poly([pt(u0, .5), pt(u1, .5), pt(u1, .8), pt(u0, .8)], col));
            }
          }
          g.globalAlpha = 1;
        } else if (f.k === 3) {                  // street lamp on the median
          g.globalAlpha = real; const w = Math.max(.6, cam.f / f.d * .07);
          line(f.b, f.tp, w, "rgb(92,94,96)");
          const l1 = P(f.x - .9, 3.3, -22), l2 = P(f.x + .9, 3.3, -22);
          line(f.tp, l1, w * .8, "rgb(92,94,96)"); line(f.tp, l2, w * .8, "rgb(92,94,96)");
          g.globalAlpha = 1;
        } else if (f.k === 4) { g.globalAlpha = real * .5; poly(f.pts, "rgb(20,18,16)"); g.globalAlpha = 1; }
      }

      if (mode !== "all") return;
      /* scan plane */
      const sc = seg(t, 6.8, 8.1);
      if (sc > 0 && sc < 1 && wire > 0) { const y = ((TY1 + 6) * S + .3) * eIO(sc), a = Math.sin(sc * Math.PI) * .5 * wire;
        const q = [P(-8, y, -6), P(7.5, y, -6), P(7.5, y, 5), P(-8, y, 5)]; if (front(q)) poly(q, cu(a * .16), cu(a), 1); }

      /* HUD */
      const hud = seg(t, .1, .8) * wire;
      if (hud > .01) {
        const m = 14, r = 12;
        g.lineWidth = 1; g.strokeStyle = cu(.6 * hud);
        [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, a, b]) => {
          g.beginPath(); g.moveTo(x, y + r * b); g.lineTo(x, y); g.lineTo(x + r * a, y); g.stroke(); });
        mono("HJF · KING FAHD RD", m + 4, m + 20, .75 * hud, 9);
        mono("24.71N 46.67E", W - m - 4, m + 20, .45 * hud, 9, "right");
        mono("BLOCKS " + String(placed).padStart(4, "0") + " / " + V.length, m + 4, H - m - 8, .7 * hud, 9);
        mono("ELEV +" + (top * S * M).toFixed(1).padStart(5, "0") + "m", W - m - 4, H - m - 8, .7 * hud, 9, "right");
        const bp = seg(t, B0, B1 + DUR);
        line([m + 4, H - m - 22], [W - m - 4, H - m - 22], 1, cu(.15 * hud));
        line([m + 4, H - m - 22], [m + 4 + (W - 2 * m - 8) * bp, H - m - 22], 1, cu(.8 * hud));
      }

    }

    function render(t) {
      const real = eIO(seg(Math.min(t, HOLD), 8.3, 9.7));
      if (t >= HOLD) {           // hold: cached still + live traffic, with a slow push-in
        if (!cacheOK) { g = cache.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0); scene(HOLD, "static"); g = g0; cacheOK = true; }
        const z = 1 + (t - HOLD) * .014;
        g.save(); g.translate(W / 2, H * .56); g.scale(z, z); g.translate(-W / 2, -H * .56);
        g.drawImage(cache, 0, 0, W, H); scene(t, "dyn"); g.restore();
      } else scene(t, "all");
      /* photographic finish: grade, vignette, grain */
      if (real > 0) {
        g.fillStyle = `rgba(255,226,186,${.06 * real})`; g.fillRect(0, 0, W, H);
        const vg = g.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .4, W / 2, H * .5, Math.max(W, H) * .8);
        vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(30,22,14,${.28 * real})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
        if (grainPat) { g.save(); g.globalAlpha = .045 * real; g.globalCompositeOperation = "overlay";
          g.translate((t * 977) % 96, (t * 613) % 96); g.fillStyle = grainPat; g.fillRect(-96, -96, W + 192, H + 192); g.restore(); }
      }
      const fade = Math.max(seg(t, T - .35, T), 1 - seg(t, 0, .3));
      if (fade > 0) { g.fillStyle = rgb(BG, fade); g.fillRect(0, 0, W, H); }
    }

    resize();
    window.__hjfRender = render; window.__hjfBlocks = V.length; // for screenshots
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const still = () => render(12.5);
    if (reduce) { still(); addEventListener("resize", () => { resize(); still(); }); }
    else {
      let start = null, raf = null, elapsed = 0;
      const loop = now => { if (start === null) start = now - elapsed * 1000;
        elapsed = ((now - start) / 1000) % T; render(elapsed); raf = requestAnimationFrame(loop); };
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && !raf) { start = null; raf = requestAnimationFrame(loop); }
        if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
      }), { threshold: .1 }).observe(host);
      addEventListener("resize", () => { resize(); render(elapsed); });
      render(0);
    }
  }
}

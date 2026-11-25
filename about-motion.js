/* HJF "who we are" motion — a real building, assembled block by block as a
   technical wireframe, then revealed as a real place in the last seconds.
   Canvas 2D + a small perspective projector. One rAF clock, paused off-screen. */
{
  const host = document.getElementById("hjfMotion");
  if (host) {
    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.dir = "ltr"; cv.style.direction = "ltr";
    host.appendChild(cv);
    const g = cv.getContext("2d"); g.direction = "ltr";
    const T = 15; // loop seconds

    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const eOut = x => 1 - Math.pow(1 - x, 3);
    const eIO = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const eBack = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
    const mix = (a, b, k) => a + (b - a) * k;
    const mixv = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
    const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    let rs = 7; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
    const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) ^ 0x5bf03635;
      h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

    const CU = [214, 160, 118];               // copper line
    const BG = [36, 9, 15];
    const cu = a => `rgba(${CU[0]},${CU[1]},${CU[2]},${a})`;
    const U = 3.2;                            // metres per block

    /* ---------- massing: a real residential tower over a retail podium ---------- */
    const vox = new Map(); const key = (x, y, z) => x + "," + y + "," + z;
    const box = (x0, x1, y0, y1, z0, z1, m) => {
      for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++)
        vox.set(key(x, y, z), { x, y, z, m });
    };
    // m: 0 stone podium · 1 glass tower · 2 copper balcony/fin · 3 slab/roof · 4 wing
    box(-6, 5, 0, 2, -4, 4, 0);        // podium (retail base)
    box(-1, 3, 2, 3, 4, 5, 2);         // entrance canopy
    box(-5, -1, 2, 14, -3, 1, 1);      // tower shaft
    box(-5, -2, 14, 18, -3, 0, 1);     // tower setback / crown
    box(-5, -2, 18, 19, -3, 0, 3);     // crown slab
    for (let y = 3; y < 17; y += 2) box(-6, -5, y, y + 1, -2, 0, 2);   // balcony stack, west
    for (let y = 4; y < 14; y += 2) box(-5, -1, y, y + 1, 1, 2, 2);    // balcony stack, south
    box(1, 5, 2, 7, -3, 2, 4);         // mid-rise wing
    box(2, 4, 7, 8, -3, 0, 3);         // wing roof plant room
    box(6, 9, 0, 3, 0, 4, 4);          // annex
    box(6, 9, 3, 4, 0, 4, 3);          // annex roof
    const V = [...vox.values()];
    V.forEach(v => { v.o = v.y * 1.0 + (Math.atan2(v.z, v.x) + Math.PI) * .25 + rnd() * 1.4; });
    V.sort((a, b) => a.o - b.o);
    const B0 = 1.3, B1 = 7.4, DUR = .42;
    V.forEach((v, i) => { v.t0 = B0 + (B1 - B0) * (i / V.length); v.dx = (rnd() - .5) * 3; v.dz = (rnd() - .5) * 3; });
    const TOPY = 19;

    // footprints for the blueprint phase
    const FP = [[-6, 5, -4, 4, 2], [-5, -1, -3, 1, 19], [1, 5, -3, 2, 8], [6, 9, 0, 4, 4]];

    // distant skyline (for the realistic reveal)
    const SKY = []; for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, r = 42 + rnd() * 34;
      SKY.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w: 3 + rnd() * 5, d: 3 + rnd() * 5, h: 3 + rnd() * 13 }); }

    /* ---------- camera ---------- */
    let W = 0, H = 0, DPR = 1;
    const cam = { yaw: 0, pitch: .5, dist: 34, tx: -.5, ty: 7.5, tz: 0, f: 1 };
    const camY = r => 7.5 + 1.5 * r;
    let cy, sy, cp, sp;
    const setCam = () => { cy = Math.cos(cam.yaw); sy = Math.sin(cam.yaw); cp = Math.cos(cam.pitch); sp = Math.sin(cam.pitch); };
    const P = (x, y, z) => {
      x -= cam.tx; y -= cam.ty; z -= cam.tz;
      const rx = x * cy - z * sy, rz = x * sy + z * cy;
      const ry = y * cp + rz * sp, d = -y * sp + rz * cp + cam.dist;
      const k = cam.f / d;
      return [W / 2 + rx * k, H * .54 - ry * k, d];
    };
    const camPos = () => { const rz = -cam.dist * cp;
      return [rz * sy + cam.tx, cam.dist * sp + cam.ty, rz * cy + cam.tz]; };

    const resize = () => {
      const r = host.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      cam.f = Math.min(W, H * .8) * 1.55;
    };

    /* ---------- drawing helpers ---------- */
    const line = (a, b, w, s) => { g.lineWidth = w; g.strokeStyle = s; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    const path = pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
    const poly = (pts, fill, stroke, w = .8) => { path(pts); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = w; g.strokeStyle = stroke; g.stroke(); } };
    const mono = (s, x, y, a, size = 9, align = "left") => {
      g.font = `500 ${size}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
      g.textAlign = align; g.fillStyle = cu(a); g.fillText(s, x, y);
    };
    const lerpP = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];

    const FACES = [ // normal, corners, wireframe shade
      [[0, 1, 0], [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], .30],
      [[0, -1, 0], [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]], .05],
      [[1, 0, 0], [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]], .18],
      [[-1, 0, 0], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]], .12],
      [[0, 0, 1], [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]], .15],
      [[0, 0, -1], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], .22],
    ];
    const SUN = (() => { const v = [-.55, .72, .42], l = Math.hypot(...v); return v.map(c => c / l); })();
    const MAT = { // base colours for the realistic pass
      0: [214, 198, 176], 1: [92, 118, 134], 2: [196, 136, 88], 3: [166, 156, 142], 4: [206, 188, 164],
    };
    const SKY_T = [138, 172, 204], SKY_H = [238, 214, 186];

    /* ---------- frame ---------- */
    function render(t) {
      g.clearRect(0, 0, W, H);
      const real = eIO(seg(t, 12.4, 14.1));      // wireframe → reality
      const wire = 1 - real;

      cam.yaw = -.78 + t * .082;
      cam.pitch = (.40 + .09 * Math.sin(t * .4)) * (1 - real) + .115 * real;
      cam.dist = 42 - 7 * eIO(seg(t, 0, 7.5)) + 16 * real;
      cam.ty = camY(real);
      setCam();
      const E = camPos();
      const hor = H * .54 - cam.f * Math.tan(cam.pitch);   // horizon line

      /* sky */
      g.fillStyle = rgb(BG); g.fillRect(0, 0, W, H);
      const rg = g.createRadialGradient(W * .5, H * .55, 0, W * .5, H * .55, Math.max(W, H) * .75);
      rg.addColorStop(0, `rgba(120,40,52,${.38 * wire})`); rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      if (real > 0) {
        g.globalAlpha = real;
        const sg = g.createLinearGradient(0, Math.min(0, hor - H), 0, hor);
        sg.addColorStop(0, "#3F74AC"); sg.addColorStop(.5, "#7FA8CC"); sg.addColorStop(.86, "#C9D4DA"); sg.addColorStop(1, rgb(SKY_H));
        g.fillStyle = sg; g.fillRect(0, 0, W, Math.max(0, hor));
        // sun + glow, placed from the light direction
        const sp2 = P(E[0] + SUN[0] * 60, E[1] + SUN[1] * 60 - 8, E[2] + SUN[2] * 60);
        if (sp2[2] > 1) { const gl = g.createRadialGradient(sp2[0], sp2[1], 0, sp2[0], sp2[1], Math.max(W, H) * .34);
          gl.addColorStop(0, "rgba(255,248,228,.9)"); gl.addColorStop(.08, "rgba(255,238,204,.34)"); gl.addColorStop(1, "rgba(255,238,204,0)");
          g.fillStyle = gl; g.fillRect(0, 0, W, Math.max(0, hor)); }
        // soft clouds
        for (let i = 0; i < 7; i++) {
          const cx = ((i * 211 + t * 7) % (W + 360)) - 180, cyy = hor - 60 - (i % 3) * 70 - 40, rw = 90 + (i % 4) * 46, rh = 16 + (i % 3) * 8;
          const cg = g.createRadialGradient(cx, cyy, 0, cx, cyy, rw);
          cg.addColorStop(0, "rgba(255,255,255,.72)"); cg.addColorStop(1, "rgba(255,255,255,0)");
          g.save(); g.translate(cx, cyy); g.scale(1, rh / rw); g.translate(-cx, -cyy);
          g.fillStyle = cg; g.beginPath(); g.arc(cx, cyy, rw, 0, 7); g.fill(); g.restore();
        }
        // ground plane + haze at the horizon
        const gg = g.createLinearGradient(0, hor, 0, H);
        gg.addColorStop(0, "#C9B79C"); gg.addColorStop(.25, "#AE9A80"); gg.addColorStop(1, "#7E6B55");
        g.fillStyle = gg; g.fillRect(0, Math.max(0, hor), W, H - Math.max(0, hor));
        if (hor > 0 && hor < H) { g.save(); g.beginPath(); g.rect(0, 0, W, hor + 1); g.clip();
          for (let i = 0; i < 44; i++) { const r1 = hash(i, 3, 11), r2b = hash(i, 9, 5);
            const bw = 10 + r1 * 34, bx = -40 + i * (W + 80) / 44 + r2b * 10, bh = 6 + r2b * 38;
            g.fillStyle = rgb(mixv([150, 146, 142], SKY_H, .62 + r1 * .2)); g.fillRect(bx, hor - bh, bw, bh + 2); }
          g.restore(); }
        const hz = g.createLinearGradient(0, hor - 40, 0, hor + 60);
        hz.addColorStop(0, "rgba(238,222,200,0)"); hz.addColorStop(.4, "rgba(232,220,202,.35)"); hz.addColorStop(1, "rgba(238,222,200,0)");
        g.fillStyle = hz; g.fillRect(0, hor - 40, W, 100);
        g.globalAlpha = 1;
      }

      /* ground grid (technical) */
      const gr = eOut(seg(t, 0, 1.3)) * wire, N = 14;
      for (let i = -N; i <= N; i++) {
        const major = i % 4 === 0, a = (major ? .2 : .08) * gr, L = N * gr;
        if (Math.abs(i) > L) continue;
        line(P(i, 0, -L), P(i, 0, L), major ? .8 : .5, cu(a));
        line(P(-L, 0, i), P(L, 0, i), major ? .8 : .5, cu(a));
      }
      const ax = eOut(seg(t, .3, 1.4)) * wire;
      if (ax > 0) {
        line(P(-N * ax, 0, 6), P(N * ax, 0, 6), 1, cu(.55 * ax));
        line(P(-9, 0, -N * ax), P(-9, 0, N * ax), 1, cu(.55 * ax));
        for (let i = -N; i <= N; i += 2) line(P(i, 0, 6), P(i, 0, 6.35), 1, cu(.5 * ax));
      }

      /* footprints + ghost volumes */
      const fp = seg(t, .6, 1.6), gh = seg(t, 1, 2.2) * (1 - seg(t, 7, 8.5));
      FP.forEach(([x0, x1, z0, z1, h], i) => {
        const k = eOut(clamp(fp * 1.6 - i * .15)) * wire; if (k <= 0) return;
        const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
        g.setLineDash([4, 3]);
        for (let j = 0; j < 4; j++) { const a = c[j], b = c[(j + 1) % 4];
          line(P(a[0], 0, a[1]), P(a[0] + (b[0] - a[0]) * k, 0, a[1] + (b[1] - a[1]) * k), 1, cu(.75 * k)); }
        g.setLineDash([]);
        if (gh > 0) { const a = .22 * eOut(clamp(gh * 1.5 - i * .1)) * wire, hh = h * eOut(gh);
          c.forEach(p => line(P(p[0], 0, p[1]), P(p[0], hh, p[1]), .6, cu(a)));
          for (let j = 0; j < 4; j++) { const p = c[j], q = c[(j + 1) % 4]; line(P(p[0], hh, p[1]), P(q[0], hh, q[1]), .6, cu(a)); } }
        c.forEach(p => { const s = P(p[0], 0, p[1]), r = 4 * k, a = .6 * k;
          line([s[0] - r, s[1]], [s[0] + r, s[1]], .8, cu(a)); line([s[0], s[1] - r], [s[0], s[1] + r], .8, cu(a)); });
      });

      /* dimensions (under the mass, so the building occludes them) */
      const dm = eOut(seg(t, 8.4, 9.6)) * wire;
      if (dm > 0) {
        const h = TOPY * dm, a1 = P(-5.9, h, -3);
        line(P(-5.9, 0, -3), a1, .9, cu(.9 * dm));
        [0, h].forEach(y => { const p = P(-5.9, y, -3); line([p[0] - 5, p[1]], [p[0] + 5, p[1]], .9, cu(.9 * dm)); });
        mono("+" + (h * U).toFixed(1) + "m", a1[0] - 8, a1[1] - 6, .95 * dm, 10, "right");
        for (let y = 4; y <= TOPY * dm; y += 4) { const p = P(-5.9, y, -3);
          line([p[0] - 3, p[1]], [p[0] + 3, p[1]], .8, cu(.6 * dm)); mono("L" + String(y).padStart(2, "0"), p[0] - 8, p[1] + 3, .55 * dm, 8, "right"); }
        const b0 = P(-6, 0, 5.2), b1 = P(-6 + 11 * dm, 0, 5.2);
        line(b0, b1, .9, cu(.8 * dm));
        [b0, b1].forEach(p => line([p[0], p[1] - 4], [p[0], p[1] + 4], .9, cu(.8 * dm)));
        mono((11 * U * dm).toFixed(1) + "m", (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2 + 14, .8 * dm, 9, "center");
      }

      /* ---- realistic ground furniture: roads, shadow, distant city ---- */
      const quad = (pts, fill, stroke, lw) => { if (pts.some(p => p[2] <= 1.2)) return; poly(pts, fill, stroke, lw); };
      if (real > 0) {
        g.globalAlpha = real;
        // asphalt road (z 6.5 → 11) and pavements
        const road = (z0, z1, fill) => { for (let x = -30; x < 30; x += 6)
          quad([P(x, .02, z0), P(x + 6, .02, z0), P(x + 6, .02, z1), P(x, .02, z1)], fill); };
        road(5.6, 6.4, "#BFB09A"); road(6.4, 11.2, "#4B4845"); road(11.2, 12, "#BFB09A");
        for (let x = -30; x < 30; x += 3) quad([P(x, .04, 8.75), P(x + 1.6, .04, 8.75), P(x + 1.6, .04, 8.95), P(x, .04, 8.95)], "rgba(236,226,196,.85)");
        road(-13, -12.2, "#9C8F7B");
        for (let x = -12; x < 12; x += 4) for (let z = -8; z < 6; z += 4) {
          const pts = [P(x, .01, z), P(x + 4, .01, z), P(x + 4, .01, z + 4), P(x, .01, z + 4)];
          quad(pts, (((x / 4 + z / 4) & 1) ? "#B9AB94" : "#C2B49D"));
        }
        // contact shadow of the mass
        g.save(); g.globalAlpha = real * .34; g.fillStyle = "#2E2419";
        [[-6, 5, -4, 4], [-5, -1, -3, 1], [1, 5, -3, 2], [6, 9, 0, 4]].forEach(([x0, x1, z0, z1]) => {
          const o = 2.6, oz = -1.6, pts = [P(x0 + o, .03, z0 + oz), P(x1 + o, .03, z0 + oz), P(x1 + o, .03, z1 + oz), P(x0 + o, .03, z1 + oz)];
          if (!pts.some(p => p[2] <= 1.2)) { path(pts); g.fill(); } });
        g.restore();
        g.globalAlpha = 1;
      }

      /* ---- the mass ---- */
      const faces = []; let placed = 0, top = 0;
      const landed = new Set();
      for (const v of V) { v.p = seg(t, v.t0, v.t0 + DUR);
        if (v.p >= 1) { landed.add(key(v.x, v.y, v.z)); placed++; top = Math.max(top, v.y + 1); } }
      for (const v of V) {
        const p = v.p; if (p <= 0) continue;
        const k = eBack(p);
        const ox = v.dx * (1 - eOut(p)), oy = 7 * (1 - k), oz = v.dz * (1 - eOut(p));
        const alpha = clamp(p * 3), bx = v.x + ox, by = v.y + oy, bz = v.z + oz, settled = p >= 1;
        for (const [n, cs, shade] of FACES) {
          if (settled && landed.has(key(v.x + n[0], v.y + n[1], v.z + n[2]))) continue;
          const fx = bx + .5 + n[0] * .5, fy = by + .5 + n[1] * .5, fz = bz + .5 + n[2] * .5;
          if ((E[0] - fx) * n[0] + (E[1] - fy) * n[1] + (E[2] - fz) * n[2] <= 0) continue;
          const pts = cs.map(c => P(bx + c[0], by + c[1], bz + c[2]));
          if (pts.some(q => q[2] <= 1.2)) continue;
          faces.push({ pts, d: (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4, shade, alpha,
            n, v, fresh: p < 1 ? 1 - p : 0 });
        }
      }
      // distant skyline + cars, as part of the same depth-sorted scene
      if (real > 0) {
        const CARS = [[0, 7.4, 7, [196,198,202]], [0, 7.4, -17, [40,44,52]], [0, 7.4, 31, [150,152,158]], [1, 10.2, -6, [168,172,178]], [1, 10.2, 18, [120,60,62]], [1, 10.2, -29, [70,74,82]]];
        CARS.forEach(([dir, z, off, col], i) => {
          const sgn = dir ? -1 : 1, x = ((t * (dir ? 7.5 : 6.4) * sgn + off + 36) % 72 + 72) % 72 - 36;
          const w = 1.95, h = .66, d2 = .95, y0 = .06;
          const body = [[x, x + w, y0, y0 + h, z, z + d2], [x + .45, x + w - .5, y0 + h, y0 + h + .4, z + .1, z + d2 - .1]];
          body.forEach((b, bi) => {
            for (const [n, cs, shade] of FACES) {
              const fx = b[0] + (b[1] - b[0]) * .5 + n[0] * (b[1] - b[0]) * .5;
              const fy = b[2] + (b[3] - b[2]) * .5 + n[1] * (b[3] - b[2]) * .5;
              const fz = b[4] + (b[5] - b[4]) * .5 + n[2] * (b[5] - b[4]) * .5;
              if ((E[0] - fx) * n[0] + (E[1] - fy) * n[1] + (E[2] - fz) * n[2] <= 0) continue;
              const pts = cs.map(c => P(b[0] + c[0] * (b[1] - b[0]), b[2] + c[1] * (b[3] - b[2]), b[4] + c[2] * (b[5] - b[4])));
              if (pts.some(q => q[2] <= 1.2)) continue;
              const lit = .4 + .6 * Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]);
              const base = bi ? [40, 48, 58] : col;
              faces.push({ pts, d: (pts[0][2] + pts[2][2]) / 2, car: true, alpha: real,
                fill: rgb(mixv(base.map(c => c * lit), SKY_H, clamp((pts[0][2] - 30) / 90) * .6)) });
            }
          });
        });
      }
      faces.sort((a, b) => b.d - a.d);

      for (const f of faces) {
        if (f.car) { g.globalAlpha = f.alpha; poly(f.pts, f.fill, f.soft ? null : "rgba(20,20,24,.35)", .5); g.globalAlpha = 1; continue; }
        const s = f.shade, [a, b, c, d] = f.pts;
        const wireFill = `rgba(${36 + 150 * s},${10 + 70 * s},${16 + 50 * s},${.96 * f.alpha})`;
        if (real <= 0) { poly(f.pts, wireFill, cu((.55 + .45 * f.fresh) * f.alpha), .7 + f.fresh * .8);
          if (f.n[1] === 0 && f.alpha > .5) line(lerpP(a, d, .5), lerpP(b, c, .5), .4, cu(.25 * f.alpha));
          continue; }
        // realistic shading
        const m = f.v.m, isGlass = m === 1 && f.n[1] === 0, up = f.n[1] === 1;
        const lit = .36 + .64 * Math.max(0, f.n[0] * SUN[0] + f.n[1] * SUN[1] + f.n[2] * SUN[2]);
        let base = MAT[m] || MAT[0];
        if (isGlass) base = mixv([74, 100, 118], SKY_T, .3 + .35 * lit);
        else if (up) base = mixv(base, [255, 248, 232], .25);
        const fog = clamp((f.d - 28) / 110) * .55;
        const blend = mixv([36 + 150 * s, 10 + 70 * s, 16 + 50 * s], mixv(base.map(x => x * lit), SKY_H, fog), real);
        poly(f.pts, rgb(blend, f.alpha),
          cu((.55 + .45 * f.fresh) * f.alpha * wire), .7 + f.fresh * .8);
        if (real > .25) {
          g.globalAlpha = real * f.alpha;
          if (isGlass) { // window grid, a few panes lit
            for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
              const p0 = lerpP(lerpP(a, b, i / 2), lerpP(d, c, i / 2), j / 2);
              const p1 = lerpP(lerpP(a, b, (i + 1) / 2), lerpP(d, c, (i + 1) / 2), j / 2);
              const p2 = lerpP(lerpP(a, b, (i + 1) / 2), lerpP(d, c, (i + 1) / 2), (j + 1) / 2);
              const p3 = lerpP(lerpP(a, b, i / 2), lerpP(d, c, i / 2), (j + 1) / 2);
              const r2 = hash(f.v.x * 7 + i, f.v.y * 13 + j, f.v.z * 3 + f.n[0] * 5 + f.n[2]);
              const refl = clamp(.1 + (f.v.y / TOPY) * .5 + r2 * .25);
              const pane = false ? mixv([255, 230, 186], SKY_H, fog) : mixv(mixv(base.map(x => x * lit), SKY_T, refl * .55), [255, 255, 255], r2 * .08);
              poly([p0, p1, p2, p3], rgb(pane), "rgba(30,36,42,.5)", .5);
            }
          } else if (f.n[1] === 0) { // slab / parapet lines
            line(lerpP(a, d, .12), lerpP(b, c, .12), .6, "rgba(60,52,44,.35)");
            line(lerpP(a, d, .88), lerpP(b, c, .88), .6, "rgba(255,250,240,.3)");
          }
          g.globalAlpha = 1;
        }
      }

      /* scan plane */
      const sc = seg(t, 7.6, 9.6);
      if (sc > 0 && sc < 1) { const y = (TOPY + .5) * eIO(sc), a = Math.sin(sc * Math.PI) * .5 * wire;
        quad([P(-7.5, y, -5), P(10, y, -5), P(10, y, 6), P(-7.5, y, 6)], cu(a * .18), cu(a), 1); }

      /* HUD */
      const hud = seg(t, .1, .8) * wire;
      if (hud > .01) {
        const m = 14, r = 12;
        g.lineWidth = 1; g.strokeStyle = cu(.6 * hud);
        [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx2, sy2]) => {
          g.beginPath(); g.moveTo(x, y + r * sy2); g.lineTo(x, y); g.lineTo(x + r * sx2, y); g.stroke(); });
        mono("HJF · RIYADH", m + 4, m + 20, .75 * hud, 9);
        mono("24.71N 46.67E", W - m - 4, m + 20, .45 * hud, 9, "right");
        mono("BLOCKS " + String(placed).padStart(3, "0") + " / " + V.length, m + 4, H - m - 8, .7 * hud, 9);
        mono("ELEV +" + (top * U).toFixed(1).padStart(5, "0"), W - m - 4, H - m - 8, .7 * hud, 9, "right");
        const bp = seg(t, B0, B1 + DUR);
        line([m + 4, H - m - 22], [W - m - 4, H - m - 22], 1, cu(.15 * hud));
        line([m + 4, H - m - 22], [m + 4 + (W - 2 * m - 8) * bp, H - m - 22], 1, cu(.8 * hud));
      }

      /* warm grade over the realistic frames, and a clean fade at the seam */
      if (real > 0) { g.fillStyle = `rgba(255,214,164,${.05 * real})`; g.fillRect(0, 0, W, H);
        const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
        vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(28,16,10,${.2 * real})`);
        g.fillStyle = vg; g.fillRect(0, 0, W, H); }
      const fade = Math.max(seg(t, 14.72, 15), 1 - seg(t, 0, .28));
      if (fade > 0) { g.fillStyle = rgb(BG, fade); g.fillRect(0, 0, W, H); }
    }

    resize();
    window.__hjfRender = render; // for screenshots
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const still = () => render(14.3);
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

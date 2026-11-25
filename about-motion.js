/* HJF "who we are" motion — architectural wireframe assembled block by block.
   Canvas 2D + a tiny perspective projector (no libraries). One rAF clock,
   paused off-screen; reduced-motion users get the finished still. */
{
  const host = document.getElementById("hjfMotion");
  if (host) {
    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    host.appendChild(cv);
    cv.dir = "ltr"; cv.style.direction = "ltr";
    const g = cv.getContext("2d"); g.direction = "ltr";
    const T = 15; // loop seconds

    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const eOut = x => 1 - Math.pow(1 - x, 3);
    const eIO = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const eBack = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
    let rs = 7; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);

    const CU = [214, 160, 118];               // copper line
    const BG = "#24090F";
    const cu = a => `rgba(${CU[0]},${CU[1]},${CU[2]},${a})`;

    /* ---------- the massing: unit blocks ---------- */
    const vox = new Map(); const key = (x, y, z) => x + "," + y + "," + z;
    const box = (x0, x1, y0, y1, z0, z1, tag) => {
      for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++)
        vox.set(key(x, y, z), { x, y, z, tag });
    };
    box(-5, 4, 0, 2, -3, 3, 0);          // podium
    box(-4, 0, 2, 12, -2, 2, 1);         // tower A
    box(-3, 0, 12, 16, -2, 1, 1);        // tower A crown (setback)
    box(1, 4, 2, 9, -2, 1, 2);           // tower B
    box(5, 8, 0, 5, 1, 4, 3);            // pavilion
    box(5, 7, 0, 2, -3, 0, 3);           // annex
    const V = [...vox.values()];
    // assembly order: bottom-up in waves, swirling, with jitter → reads as block-by-block, fast
    V.forEach(v => { v.o = v.y * 1.0 + (Math.atan2(v.z, v.x) + Math.PI) * .25 + rnd() * 1.4; });
    V.sort((a, b) => a.o - b.o);
    const B0 = 1.3, B1 = 7.4, DUR = .42;
    V.forEach((v, i) => { v.t0 = B0 + (B1 - B0) * (i / V.length); v.dx = (rnd() - .5) * 3; v.dz = (rnd() - .5) * 3; v.out = rnd(); });

    // footprints (blueprint outlines drawn before the build)
    const FP = [[-5, 4, -3, 3, 2], [-4, 0, -2, 2, 16], [1, 4, -2, 1, 9], [5, 8, 1, 4, 5], [5, 7, -3, 0, 2]];

    /* ---------- camera ---------- */
    let W = 0, H = 0, DPR = 1;
    const cam = { yaw: 0, pitch: .5, dist: 34, tx: .5, ty: 6.2, tz: 0, f: 1 };
    let cy, sy, cp, sp;
    const setCam = () => { cy = Math.cos(cam.yaw); sy = Math.sin(cam.yaw); cp = Math.cos(cam.pitch); sp = Math.sin(cam.pitch); };
    // world → [screenX, screenY, depth]
    const P = (x, y, z) => {
      x -= cam.tx; y -= cam.ty; z -= cam.tz;
      const rx = x * cy - z * sy, rz = x * sy + z * cy;          // yaw
      const ry = y * cp + rz * sp, d = -y * sp + rz * cp + cam.dist; // pitch (eye above)
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
    const poly = (pts, fill, stroke, w = .8) => {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = w; g.strokeStyle = stroke; g.stroke(); }
    };
    const mono = (s, x, y, a, size = 9, align = "left") => {
      g.font = `500 ${size}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
      g.textAlign = align; g.fillStyle = cu(a); g.fillText(s, x, y);
    };

    // faces of a unit cube: [normal, corner offsets, shade]
    const FACES = [
      [[0, 1, 0], [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], .30],
      [[0, -1, 0], [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]], .05],
      [[1, 0, 0], [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]], .18],
      [[-1, 0, 0], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]], .12],
      [[0, 0, 1], [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]], .15],
      [[0, 0, -1], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], .22],
    ];

    /* ---------- frame ---------- */
    function render(t) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = BG; g.fillRect(0, 0, W, H);
      const rg = g.createRadialGradient(W * .5, H * .55, 0, W * .5, H * .55, Math.max(W, H) * .75);
      rg.addColorStop(0, "rgba(120,40,52,.38)"); rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);

      // camera: continuous orbit + push-in during the build, pull-out at the end
      cam.yaw = -.75 + t * .085;
      cam.pitch = .42 + .1 * Math.sin(t * .4);
      cam.dist = 40 - 7 * eIO(seg(t, 0, 7.5)) + 5 * eIO(seg(t, 12.6, 15));
      setCam();
      const E = camPos();

      const out = eIO(seg(t, 12.4, 14.4)); // disassembly

      /* ground grid, revealed radially */
      const gr = eOut(seg(t, 0, 1.3)) * (1 - .5 * out), N = 14;
      for (let i = -N; i <= N; i++) {
        const major = i % 4 === 0, a = (major ? .2 : .08) * gr;
        const L = N * gr;
        if (Math.abs(i) > L) continue;
        line(P(i, 0, -L), P(i, 0, L), major ? .8 : .5, cu(a));
        line(P(-L, 0, i), P(L, 0, i), major ? .8 : .5, cu(a));
      }
      // site axes with ticks
      const ax = eOut(seg(t, .3, 1.4)) * (1 - out);
      if (ax > 0) {
        line(P(-N * ax, 0, 6), P(N * ax, 0, 6), 1, cu(.55 * ax));
        line(P(-9, 0, -N * ax), P(-9, 0, N * ax), 1, cu(.55 * ax));
        for (let i = -N; i <= N; i += 2) { const a = P(i, 0, 6), b = P(i, 0, 6.35); line(a, b, 1, cu(.5 * ax)); }
      }

      /* footprints + ghost volumes (blueprint) */
      const fp = seg(t, .6, 1.6), gh = seg(t, 1, 2.2) * (1 - seg(t, 7, 8.5));
      FP.forEach(([x0, x1, z0, z1, h], i) => {
        const k = eOut(clamp(fp * 1.6 - i * .15)); if (k <= 0) return;
        const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
        g.setLineDash([4, 3]);
        for (let j = 0; j < 4; j++) { const a = c[j], b = c[(j + 1) % 4];
          const m = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
          line(P(a[0], 0, a[1]), P(m[0], 0, m[1]), 1, cu(.75 * (1 - out))); }
        g.setLineDash([]);
        if (gh > 0) { // ghost wireframe of the final mass
          const a = .22 * eOut(clamp(gh * 1.5 - i * .1)), hh = h * eOut(gh);
          c.forEach(p => line(P(p[0], 0, p[1]), P(p[0], hh, p[1]), .6, cu(a)));
          for (let j = 0; j < 4; j++) { const p = c[j], q = c[(j + 1) % 4]; line(P(p[0], hh, p[1]), P(q[0], hh, q[1]), .6, cu(a)); }
        }
        c.forEach(p => { const s = P(p[0], 0, p[1]); const r = 4 * k, a = .6 * k * (1 - out);
          line([s[0] - r, s[1]], [s[0] + r, s[1]], .8, cu(a)); line([s[0], s[1] - r], [s[0], s[1] + r], .8, cu(a)); });
      });

      /* dimensions (drawn under the blocks so the mass occludes them) */
      const dm = eOut(seg(t, 8.4, 9.6)) * (1 - out);
      if (dm > 0) {
        const h = 16 * dm, a0 = P(-4.8, 0, -2), a1 = P(-4.8, h, -2);
        line(a0, a1, .9, cu(.9 * dm));
        [0, h].forEach(y => { const p = P(-4.8, y, -2); line([p[0] - 5, p[1]], [p[0] + 5, p[1]], .9, cu(.9 * dm)); });
        mono("+" + (h * 3.2).toFixed(1) + "m", a1[0] - 8, a1[1] - 6, .95 * dm, 10, "right");
        for (let y = 4; y <= 16 * dm; y += 4) { const p = P(-4.8, y, -2); line([p[0] - 3, p[1]], [p[0] + 3, p[1]], .8, cu(.6 * dm)); mono("L" + String(y).padStart(2, "0"), p[0] - 8, p[1] + 3, .55 * dm, 8, "right"); }
        const b0 = P(-5, 0, 4.2), b1 = P(-5 + 9 * dm, 0, 4.2);
        line(b0, b1, .9, cu(.8 * dm));
        [b0, b1].forEach(p => line([p[0], p[1] - 4], [p[0], p[1] + 4], .9, cu(.8 * dm)));
        mono((28.8 * dm).toFixed(1) + "m", (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2 + 14, .8 * dm, 9, "center");
      }

      /* blocks */
      const faces = []; let placed = 0, top = 0;
      const landed = new Set();
      for (const v of V) {
        v.p = seg(t, v.t0, v.t0 + DUR);
        if (v.p >= 1) { landed.add(key(v.x, v.y, v.z)); placed++; top = Math.max(top, v.y + 1); }
      }
      for (const v of V) {
        const p = v.p; if (p <= 0) continue;
        const k = eBack(p);
        let ox = v.dx * (1 - eOut(p)), oy = 7 * (1 - k), oz = v.dz * (1 - eOut(p));
        let alpha = clamp(p * 3);
        if (out > 0) { // lift-off from the top down
          const d = clamp(out * 1.8 - (1 - v.y / 16) * .8 - v.out * .25);
          const e = d * d; oy += e * 9; ox += v.dx * e * 2; oz += v.dz * e * 2; alpha *= 1 - d;
        }
        if (alpha <= .01) continue;
        const bx = v.x + ox, by = v.y + oy, bz = v.z + oz, settled = p >= 1 && out === 0;
        for (const [n, cs, shade] of FACES) {
          if (settled && landed.has(key(v.x + n[0], v.y + n[1], v.z + n[2]))) continue; // internal face
          const fx = bx + .5 + n[0] * .5, fy = by + .5 + n[1] * .5, fz = bz + .5 + n[2] * .5;
          if ((E[0] - fx) * n[0] + (E[1] - fy) * n[1] + (E[2] - fz) * n[2] <= 0) continue; // back-face
          const pts = cs.map(c => P(bx + c[0], by + c[1], bz + c[2]));
          const d = (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4;
          faces.push({ pts, d, shade, alpha, n, fresh: p < 1 ? 1 - p : 0 });
        }
      }
      faces.sort((a, b) => b.d - a.d);
      for (const f of faces) {
        const s = f.shade;
        const fill = `rgba(${Math.round(36 + 150 * s)},${Math.round(10 + 70 * s)},${Math.round(16 + 50 * s)},${.96 * f.alpha})`;
        poly(f.pts, fill, cu((.55 + .45 * f.fresh) * f.alpha), .7 + f.fresh * .8);
        if (f.n[1] === 0 && f.alpha > .5) { // mullion detail on facades
          const [a, b, c, d] = f.pts, m = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
          line(m(a, d, .5), m(b, c, .5), .4, cu(.25 * f.alpha));
        }
      }

      /* post-build overlays: laser scan, dimensions, levels */
      const sc = seg(t, 7.6, 9.6);
      if (sc > 0 && sc < 1) {
        const y = 16.4 * eIO(sc), a = Math.sin(sc * Math.PI) * .5;
        poly([P(-6.5, y, -4.5), P(9, y, -4.5), P(9, y, 5), P(-6.5, y, 5)], cu(a * .18), cu(a), 1);
      }
      /* HUD — thin technical frame */
      const hud = seg(t, .1, .8) * (1 - seg(t, 14.4, 15));
      const m = 14, r = 12;
      g.lineWidth = 1; g.strokeStyle = cu(.6 * hud);
      [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx2, sy2]) => {
        g.beginPath(); g.moveTo(x, y + r * sy2); g.lineTo(x, y); g.lineTo(x + r * sx2, y); g.stroke(); });
      mono("HJF · RIYADH", m + 4, m + 20, .75 * hud, 9);
      mono("24.71°N 46.67°E", W - m - 4, m + 20, .45 * hud, 9, "right");
      mono("BLOCKS " + String(placed).padStart(3, "0") + " / " + V.length, m + 4, H - m - 8, .7 * hud, 9);
      mono("ELEV +" + (top * 3.2).toFixed(1).padStart(5, "0"), W - m - 4, H - m - 8, .7 * hud, 9, "right");
      const bp = seg(t, B0, B1 + DUR) * (1 - out);
      line([m + 4, H - m - 22], [W - m - 4, H - m - 22], 1, cu(.15 * hud));
      line([m + 4, H - m - 22], [m + 4 + (W - 2 * m - 8) * bp, H - m - 22], 1, cu(.8 * hud));
    }

    resize();
    window.__hjfRender = render; // for screenshots
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const still = () => render(10.5);
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

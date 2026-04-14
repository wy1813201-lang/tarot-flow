import { useEffect, useRef, useCallback } from 'react';

interface StardomeAnimationProps {
  cardCount: number;
  onComplete: () => void;
}

export function StardomeAnimation({ cardCount, onComplete }: StardomeAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const cardCountRef = useRef(cardCount);
  const skipBtnRef = useRef<HTMLButtonElement>(null);
  onCompleteRef.current = onComplete;
  cardCountRef.current = cardCount;

  const handleSkip = useCallback(() => {
    cancelledRef.current = true;
    onCompleteRef.current();
  }, []);

  // Single stable effect — no deps that change
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    cancelledRef.current = false;
    let animId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const timers: number[] = []; // track all setInterval/setTimeout for cleanup

    /* ═══ Utils ═══ */
    const safeSleep = (ms: number) => new Promise<void>(r => {
      const id = window.setTimeout(r, ms);
      timers.push(id);
    });
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const TAU = Math.PI * 2;
    const PHI = (1 + Math.sqrt(5)) / 2;
    const easeIO = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const easeInExpo = (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10);
    const easeOutBack = (t: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    /* ═══ State ═══ */
    let W = 0, H = 0;
    let startedAt = performance.now();
    const getT = () => (performance.now() - startedAt) / 1000; // real-time seconds
    const cam = { x: 0, y: 0, z: 1, shakeX: 0, shakeY: 0 };
    let camAnim: any = null;

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
    }

    function moveCam(tx: number, ty: number, tz: number, dur: number, easeFn?: (t: number) => number) {
      const fn = easeFn || easeIO;
      return new Promise<void>(resolve => {
        camAnim = { sx: cam.x, sy: cam.y, sz: cam.z, tx, ty, tz, start: getT(), dur, easeFn: fn, resolve };
      });
    }
    function updateCam() {
      if (!camAnim) return;
      const T = getT();
      const t = clamp01((T - camAnim.start) / camAnim.dur);
      const e = camAnim.easeFn(t);
      cam.x = lerp(camAnim.sx, camAnim.tx, e);
      cam.y = lerp(camAnim.sy, camAnim.ty, e);
      cam.z = camAnim.sz * Math.pow(camAnim.tz / camAnim.sz, e);
      const shakeAmt = Math.sin(t * Math.PI) * 2.5 * (cam.z > 3 ? 1 : 0);
      cam.shakeX = Math.sin(T * 17) * shakeAmt;
      cam.shakeY = Math.cos(T * 11) * shakeAmt;
      if (t >= 1) { cam.x = camAnim.tx; cam.y = camAnim.ty; cam.z = camAnim.tz; cam.shakeX = 0; cam.shakeY = 0; const r = camAnim.resolve; camAnim = null; r(); }
    }

    /* ═══ Water Drop ═══ */
    let waterDropStart = -1;
    let splashStart = -1;
    let rippleStarts: number[] = [];

    function drawWaterDrop() {
      if (waterDropStart < 0) return;
      const T = getT();
      const cx = W / 2, cy = H * 0.38;
      const dropDur = 1.2;
      const p = clamp01((T - waterDropStart) / dropDur);

      if (p < 1.0) {
        const fallP = clamp01(p / 0.8);
        const ease = 1 - Math.pow(1 - fallP, 2);
        const dropY = cy - 40 + ease * 40;
        const squash = p > 0.8 ? 1 + (p - 0.8) / 0.2 * 0.6 : 1;
        const stretch = p > 0.8 ? 1 - (p - 0.8) / 0.2 * 0.3 : 1;
        const alpha = p > 0.9 ? 1 - (p - 0.9) / 0.1 : 0.9;
        ctx.save(); ctx.translate(cx, dropY); ctx.scale(squash, stretch);
        ctx.beginPath(); ctx.ellipse(0, 0, 3, 4.5, 0, 0, TAU);
        const dg = ctx.createRadialGradient(-1, -1.5, 0, 0, 0, 4.5);
        dg.addColorStop(0, `rgba(160,200,255,${0.95 * alpha})`);
        dg.addColorStop(0.5, `rgba(80,140,220,${0.6 * alpha})`);
        dg.addColorStop(1, `rgba(20,60,160,${0.3 * alpha})`);
        ctx.fillStyle = dg; ctx.fill();
        ctx.beginPath(); ctx.ellipse(-1, -2, 1, 0.8, -0.3, 0, TAU);
        ctx.fillStyle = `rgba(255,255,255,${0.4 * alpha})`; ctx.fill();
        ctx.restore();
      }

      // Splash
      if (splashStart >= 0) {
        const sp = clamp01((T - splashStart) / 0.9);
        if (sp < 1) {
          const angles = [-60, -20, 20, 55];
          for (const ang of angles) {
            const rad = ang * Math.PI / 180;
            const dist = 18 * sp;
            const dx = Math.cos(rad) * dist, dy = Math.sin(rad) * dist - 8 * sp;
            const alpha = sp < 0.2 ? sp / 0.2 * 0.9 : 0.9 * (1 - (sp - 0.2) / 0.8);
            ctx.beginPath(); ctx.arc(cx + dx, cy + dy, Math.max(0.3, 1.5 * (1 - sp * 0.7)), 0, TAU);
            ctx.fillStyle = `rgba(140,190,255,${Math.max(0, alpha)})`; ctx.fill();
          }
        }
      }

      // Central flash on impact
      if (splashStart >= 0) {
        const flashP = clamp01((T - splashStart) / 0.4);
        if (flashP < 1) {
          const flashA = (1 - flashP) * 0.6;
          const flashR = 20 + flashP * 60;
          const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
          fg.addColorStop(0, `rgba(180,220,255,${flashA})`);
          fg.addColorStop(0.3, `rgba(120,160,255,${flashA * 0.4})`);
          fg.addColorStop(1, 'transparent');
          ctx.fillStyle = fg; ctx.fillRect(cx - flashR, cy - flashR, flashR * 2, flashR * 2);
        }
      }

      // Ripples
      for (const rs of rippleStarts) {
        const rp = clamp01((T - rs) / 3.0);
        if (rp <= 0 || rp >= 1) continue;
        ctx.beginPath(); ctx.arc(cx, cy, rp * 180, 0, TAU);
        ctx.strokeStyle = `rgba(140,190,255,${0.5 * (1 - rp)})`; ctx.lineWidth = 1 - rp * 0.5; ctx.stroke();
      }
    }

    /* ═══ D20 Icosahedron ═══ */
    const D20_RAW = [
      [0, 1, PHI], [0, 1, -PHI], [0, -1, PHI], [0, -1, -PHI],
      [1, PHI, 0], [1, -PHI, 0], [-1, PHI, 0], [-1, -PHI, 0],
      [PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, 1], [-PHI, 0, -1]
    ];
    const D20_V = D20_RAW.map(v => { const m = Math.hypot(...v); return v.map(c => c / m); });
    const D20_F = [
      [0, 2, 8], [0, 8, 4], [0, 4, 6], [0, 6, 10], [0, 10, 2],
      [3, 5, 2], [3, 2, 7], [3, 7, 11], [3, 11, 9], [3, 9, 5],
      [1, 4, 8], [1, 8, 9], [1, 9, 11], [1, 11, 6], [1, 6, 4],
      [2, 5, 8], [5, 9, 8], [7, 2, 10], [7, 10, 11], [6, 11, 10]
    ];
    const rotXm = (v: number[], a: number) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
    const rotYm = (v: number[], a: number) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
    const rotZm = (v: number[], a: number) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
    const d20 = { active: false, opacity: 0, fadeOut: false, scale: 65 };

    function drawD20(cx: number, cy: number) {
      if (!d20.active || d20.opacity <= 0) return;
      const T = getT();
      const rx = T * 0.7, ry = T * 1.1, rz = T * 0.3;
      const rotated = D20_V.map(v => { let r = rotXm(v, rx); r = rotYm(r, ry); r = rotZm(r, rz); return r; });
      const faces = D20_F.map(f => ({
        idx: f, z: (rotated[f[0]][2] + rotated[f[1]][2] + rotated[f[2]][2]) / 3
      })).sort((a, b) => a.z - b.z);
      const sc = d20.scale, op = d20.opacity;
      const ld = [0.4, 0.6, 0.8]; const lm = Math.hypot(...ld); const ln = ld.map(c => c / lm);

      ctx.save(); ctx.translate(cx, cy);
      const glow = ctx.createRadialGradient(0, 0, sc * 0.3, 0, 0, sc * 2.5);
      glow.addColorStop(0, `rgba(200,170,60,${0.12 * op})`); glow.addColorStop(0.5, `rgba(120,100,40,${0.04 * op})`); glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(-sc * 2.5, -sc * 2.5, sc * 5, sc * 5);

      for (const face of faces) {
        const [i0, i1, i2] = face.idx;
        const p0 = rotated[i0], p1 = rotated[i1], p2 = rotated[i2];
        const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
        const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
        const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        const nm = Math.hypot(nx, ny, nz) || 1;
        if (nz / nm < -0.05) continue;
        const diffuse = Math.max(0, (nx * ln[0] + ny * ln[1] + nz * ln[2]) / nm);
        const reflZ = 2 * nz / nm * (nx * ln[0] + ny * ln[1] + nz * ln[2]) / nm - ln[2];
        const spec = Math.pow(Math.max(0, reflZ), 12) * 0.6;
        const bright = 0.12 + diffuse * 0.6 + spec;
        const r = Math.floor(220 * bright + spec * 80), g = Math.floor(185 * bright + spec * 60), b = Math.floor(70 * bright + spec * 100);
        ctx.beginPath(); ctx.moveTo(p0[0] * sc, p0[1] * sc); ctx.lineTo(p1[0] * sc, p1[1] * sc); ctx.lineTo(p2[0] * sc, p2[1] * sc); ctx.closePath();
        ctx.fillStyle = `rgba(${r},${g},${b},${op * 0.85})`; ctx.fill();
        ctx.strokeStyle = `rgba(255,220,100,${op * 0.25})`; ctx.lineWidth = 0.6; ctx.stroke();
      }
      for (const v of rotated) {
        if (v[2] > 0.2) { ctx.beginPath(); ctx.arc(v[0] * sc, v[1] * sc, 1.2, 0, TAU); ctx.fillStyle = `rgba(255,240,180,${op * 0.5 * v[2]})`; ctx.fill(); }
      }
      const sweep = T * 2;
      const sg = ctx.createLinearGradient(-sc * Math.cos(sweep), -sc * Math.sin(sweep), sc * Math.cos(sweep), sc * Math.sin(sweep));
      sg.addColorStop(0, 'transparent'); sg.addColorStop(0.45, `rgba(255,255,255,${0.03 * op})`); sg.addColorStop(0.55, `rgba(255,255,255,${0.06 * op})`); sg.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, sc * 1.1, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.restore();
    }

    /* ═══ Starfield ═══ */
    type Star = { x: number; y: number; r: number; layer: number; hue: number; sat: number; base: number; ph: number; fr1: number; fr2: number; emerged: boolean; emergeTime?: number; phase?: string; animProg?: number; glowR?: number; glowG?: number; glowB?: number; isDestiny?: boolean; fillColor?: string; fillColorGlow?: string; strokeColor?: string; };
    let stars: Star[] = [], shootingStars: any[] = [];
    let chosenStar: Star = null!; // primary star (beam source)
    let destinyStars: Star[] = []; // one per card
    let emergedCount = 0;
    let nebulaClouds: any[] = [];
    // Falling star trails: each destiny star flies to its card position
    type FallingTrail = { fromX: number; fromY: number; toX: number; toY: number; startT: number; dur: number; idx: number };
    let fallingTrails: FallingTrail[] = [];

    function initCosmos() {
      resize();
      cam.x = W / 2; cam.y = H / 2;
      stars = []; nebulaClouds = [];
      const mwA = -.35, mwCx = W * .5, mwCy = H * .4, mwW = H * .2;

      for (let i = 0; i < 8; i++) {
        const inMW = Math.random() < 0.5;
        let cx: number, cy: number;
        if (inMW) { const along = rand(-0.5, 0.5) * W; cx = mwCx + Math.cos(mwA) * along; cy = mwCy + Math.sin(mwA) * along; }
        else { cx = rand(W * 0.1, W * 0.9); cy = rand(H * 0.1, H * 0.9); }
        nebulaClouds.push({ x: cx, y: cy, r: rand(80, 220), hue: rand(180, 280), sat: rand(30, 60), alpha: rand(0.015, 0.04), ph: rand(0, TAU), speed: rand(0.003, 0.008) });
      }

      for (let i = 0; i < 1600; i++) {
        const layer = i < 700 ? 0 : i < 1250 ? 1 : 2;
        const baseR = [.2, .5, 1.0][layer];
        const r = baseR + Math.pow(Math.random(), 2.5) * [.4, .7, 1.3][layer];
        const warm = Math.random() < .12, red = Math.random() < .03, blue = Math.random() < .06;
        const hue = red ? rand(0, 15) : warm ? rand(20, 50) : blue ? rand(180, 210) : rand(210, 245);
        const sat = red ? 70 : warm ? 55 : blue ? 50 : rand(15, 45);
        let x = Math.random() * W, y = Math.random() * H;
        if (Math.random() < .38) {
          const along = rand(-.65, .65) * Math.max(W, H); const perp = (Math.random() - .5) * mwW;
          x = mwCx + Math.cos(mwA) * along - Math.sin(mwA) * perp; y = mwCy + Math.sin(mwA) * along + Math.cos(mwA) * perp;
          x = ((x % W) + W) % W; y = ((y % H) + H) % H;
        }
        const star: Star = { x, y, r, layer, hue, sat, base: [.4, .6, .85][layer] + Math.random() * .12, ph: Math.random() * TAU, fr1: [.4, .8, 1.5][layer] + Math.random() * 1.2, fr2: .08 + Math.random() * .2, emerged: false };
        // Warm/red/blue stars get lower lightness so hue is visible
        const lum = red ? 82 : warm ? 85 : blue ? 88 : 94;
        const lumGlow = red ? 70 : warm ? 75 : blue ? 78 : 86;
        star.fillColor = `hsl(${hue},${sat}%,${lum}%)`;
        star.fillColorGlow = `hsla(${hue},${sat}%,${lumGlow}%,.15)`;
        star.strokeColor = `hsla(${hue},40%,90%,.25)`;
        stars.push(star);
      }
      // Create N destiny stars (one per card) spread across upper sky
      const n = cardCountRef.current;
      const starHues = [210, 260, 180, 30, 330]; // blue, violet, cyan, gold, pink
      const starColors = [
        [140, 200, 255], [180, 140, 255], [100, 220, 220], [255, 200, 120], [255, 150, 200],
      ];
      destinyStars = [];
      const spreadW = Math.min(W * 0.6, n * 120);
      const startSX = (W - spreadW) / 2 + spreadW / (n + 1);
      for (let i = 0; i < n; i++) {
        const sx = n === 1 ? W * 0.5 : startSX + i * (spreadW / (n - 1 || 1));
        const sy = H * rand(0.1, 0.22);
        const hue = starHues[i % starHues.length];
        const [gr, gg, gb] = starColors[i % starColors.length];
        const ds: Star = {
          x: sx, y: sy, r: 2.8 + i * 0.2, layer: 2,
          hue, sat: 55, base: 0, ph: i * 1.3, fr1: 0.5 + i * 0.1, fr2: 0.1,
          emerged: false, glowR: gr, glowG: gg, glowB: gb, isDestiny: true,
        };
        destinyStars.push(ds);
        stars.push(ds);
      }
      // Primary chosen star is the center one (for beam + camera)
      chosenStar = destinyStars[Math.floor(n / 2)];

      // Initialize earth elements (terrain, dust, sparkles)
      initEarth();
    }

    /* ═══ Fire Element — Firework Particles (火) ═══ */
    type FireSpark = {
      x: number; y: number; vx: number; vy: number;
      r: number; cr: number; cg: number; cb: number;
      life: number; maxLife: number; gravity: number; drag: number;
      trail: { x: number; y: number }[];
    };
    const fireworkSparks: FireSpark[] = [];

    function launchFirework(ox: number, oy: number, count: number, palette?: { r: number; g: number; b: number }[]) {
      const pal = palette || [
        { r: 255, g: 100, b: 30 }, { r: 255, g: 180, b: 40 }, { r: 255, g: 60, b: 20 },
        { r: 255, g: 220, b: 80 }, { r: 255, g: 140, b: 60 }, { r: 220, g: 80, b: 255 },
      ];
      for (let i = 0; i < count; i++) {
        const ang = TAU * i / count + rand(-0.15, 0.15);
        const speed = rand(1.5, 5.5);
        const c = pal[Math.floor(Math.random() * pal.length)];
        fireworkSparks.push({
          x: ox, y: oy, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - rand(0.5, 1.5),
          r: rand(0.8, 2.2), cr: c.r, cg: c.g, cb: c.b,
          life: 0, maxLife: rand(50, 110), gravity: 0.025 + Math.random() * 0.02,
          drag: 0.985 + Math.random() * 0.01, trail: [],
        });
      }
      // Inner bright core particles
      for (let i = 0; i < Math.floor(count * 0.3); i++) {
        const ang = rand(0, TAU);
        const speed = rand(0.8, 3.0);
        fireworkSparks.push({
          x: ox, y: oy, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - rand(0.3, 1),
          r: rand(0.5, 1.2), cr: 255, cg: 245, cb: 200,
          life: 0, maxLife: rand(25, 55), gravity: 0.02, drag: 0.98, trail: [],
        });
      }
    }

    function drawFireworks() {
      if (fireworkSparks.length === 0) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = fireworkSparks.length - 1; i >= 0; i--) {
        const s = fireworkSparks[i];
        s.life++; s.vx *= s.drag; s.vy *= s.drag; s.vy += s.gravity;
        s.x += s.vx; s.y += s.vy;
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 12) s.trail.shift();
        const prog = s.life / s.maxLife;
        if (prog >= 1) { fireworkSparks.splice(i, 1); continue; }
        const fade = prog < 0.1 ? prog / 0.1 : 1 - Math.pow((prog - 0.1) / 0.9, 1.5);
        const rShrink = 1 - prog * 0.6;
        // Trail
        if (s.trail.length > 2) {
          ctx.beginPath(); ctx.moveTo(s.trail[0].x, s.trail[0].y);
          for (let j = 1; j < s.trail.length; j++) ctx.lineTo(s.trail[j].x, s.trail[j].y);
          ctx.strokeStyle = `rgba(${s.cr},${s.cg},${s.cb},${fade * 0.3})`;
          ctx.lineWidth = s.r * rShrink * 0.5; ctx.lineCap = 'round'; ctx.stroke();
        }
        // Core particle
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * rShrink, 0, TAU);
        ctx.fillStyle = `rgba(${s.cr},${s.cg},${s.cb},${fade * 0.9})`; ctx.fill();
        // Glow halo
        if (s.r > 1.0 && fade > 0.3) {
          const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4 * rShrink);
          hg.addColorStop(0, `rgba(${s.cr},${s.cg},${s.cb},${fade * 0.25})`);
          hg.addColorStop(1, 'transparent');
          ctx.fillStyle = hg; ctx.fillRect(s.x - s.r * 4, s.y - s.r * 4, s.r * 8, s.r * 8);
        }
      }
      ctx.restore();
    }

    /* ═══ Earth Element — Terrain, Dust, Mineral Sparkles (土) ═══ */
    type TerrainLayer = {
      pts: { x: number; y: number }[];
      yBase: number; amp: number; r: number; g: number; b: number; a: number;
    };
    type EarthDust = {
      x: number; y: number; r: number;
      hue: number; sat: number; light: number; alpha: number;
      vx: number; vy: number; ph: number; fr: number; drift: number;
    };
    type MineralSparkle = {
      x: number; y: number; r: number;
      hue: number; sat: number;
      ph: number; fr: number; burstFr: number; burstPh: number; peak: number;
    };
    let terrainLayers: TerrainLayer[] = [];
    let earthDust: EarthDust[] = [];
    let mineralSparkles: MineralSparkle[] = [];

    function initEarth() {
      terrainLayers = [];
      const layerCfg = [
        { yBase: 0.82, amp: 0.035, freq: 3, seg: 60, r: 45, g: 35, b: 50, a: 0.25 },
        { yBase: 0.87, amp: 0.028, freq: 4, seg: 70, r: 35, g: 28, b: 40, a: 0.35 },
        { yBase: 0.91, amp: 0.022, freq: 5, seg: 80, r: 25, g: 18, b: 30, a: 0.50 },
        { yBase: 0.95, amp: 0.015, freq: 6, seg: 90, r: 12, g: 8, b: 18, a: 0.70 },
      ];
      for (const cfg of layerCfg) {
        const pts: { x: number; y: number }[] = [];
        const seed = rand(0, 1000);
        for (let i = 0; i <= cfg.seg; i++) {
          const t = i / cfg.seg; const x = t * W;
          let h = Math.sin(t * Math.PI * cfg.freq + seed) * cfg.amp * H;
          h += Math.sin(t * Math.PI * cfg.freq * 2.3 + seed * 1.7) * cfg.amp * H * 0.4;
          h += Math.sin(t * Math.PI * cfg.freq * 4.1 + seed * 2.3) * cfg.amp * H * 0.15;
          pts.push({ x, y: cfg.yBase * H - h });
        }
        terrainLayers.push({ pts, yBase: cfg.yBase, amp: cfg.amp, r: cfg.r, g: cfg.g, b: cfg.b, a: cfg.a });
      }

      earthDust = [];
      for (let i = 0; i < 120; i++) {
        const near = Math.random() < 0.6;
        earthDust.push({
          x: rand(0, W), y: rand(H * 0.55, H),
          r: rand(0.3, near ? 1.8 : 0.8),
          hue: rand(20, 50), sat: rand(30, 65), light: rand(50, 75),
          alpha: rand(0.08, near ? 0.35 : 0.15),
          vx: rand(-0.15, 0.15), vy: rand(-0.08, 0.04),
          ph: rand(0, TAU), fr: rand(0.2, 0.8), drift: rand(5, 20),
        });
      }

      mineralSparkles = [];
      for (let i = 0; i < 35; i++) {
        mineralSparkles.push({
          x: rand(W * 0.05, W * 0.95), y: rand(H * 0.78, H * 0.96),
          r: rand(0.4, 1.2), hue: rand(30, 60), sat: rand(40, 80),
          ph: rand(0, TAU), fr: rand(0.5, 2.5),
          burstFr: rand(3, 8), burstPh: rand(0, TAU), peak: rand(0.5, 1.0),
        });
      }
    }

    function drawEarth() {
      const T = getT();
      // Terrain layers
      for (const layer of terrainLayers) {
        ctx.beginPath();
        ctx.moveTo(layer.pts[0].x, layer.pts[0].y);
        for (let i = 1; i < layer.pts.length; i++) {
          const p0 = layer.pts[i - 1], p1 = layer.pts[i];
          const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
        }
        const last = layer.pts[layer.pts.length - 1];
        ctx.lineTo(last.x, last.y); ctx.lineTo(W, H + 10); ctx.lineTo(0, H + 10); ctx.closePath();
        const mg = ctx.createLinearGradient(0, layer.yBase * H - layer.amp * H * 1.5, 0, H);
        mg.addColorStop(0, `rgba(${layer.r + 20},${layer.g + 15},${layer.b + 25},${layer.a * 0.6})`);
        mg.addColorStop(0.3, `rgba(${layer.r},${layer.g},${layer.b},${layer.a})`);
        mg.addColorStop(1, `rgba(${Math.floor(layer.r * 0.5)},${Math.floor(layer.g * 0.4)},${Math.floor(layer.b * 0.6)},${layer.a * 1.2})`);
        ctx.fillStyle = mg; ctx.fill();
        // Ridge highlight
        ctx.beginPath(); ctx.moveTo(layer.pts[0].x, layer.pts[0].y);
        for (let i = 1; i < layer.pts.length; i++) {
          const p0 = layer.pts[i - 1], p1 = layer.pts[i];
          ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
        }
        ctx.strokeStyle = `rgba(${layer.r + 60},${layer.g + 50},${layer.b + 40},${layer.a * 0.25})`;
        ctx.lineWidth = 0.8; ctx.stroke();
      }

      // Horizon fog
      const fogY = H * 0.78;
      const fogG = ctx.createLinearGradient(0, fogY, 0, H);
      fogG.addColorStop(0, 'transparent');
      fogG.addColorStop(0.3, `rgba(40,30,50,${0.04 + 0.02 * Math.sin(T * 0.3)})`);
      fogG.addColorStop(0.6, `rgba(35,25,45,${0.08 + 0.03 * Math.sin(T * 0.2 + 1)})`);
      fogG.addColorStop(1, `rgba(20,15,30,${0.12})`);
      ctx.fillStyle = fogG; ctx.fillRect(0, fogY, W, H - fogY);

      // Floating dust particles
      for (const d of earthDust) {
        d.x += d.vx + Math.sin(T * 0.5 + d.ph) * 0.1;
        d.y += d.vy + Math.cos(T * 0.3 + d.ph * 1.3) * 0.05;
        if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
        if (d.y < H * 0.5) d.y = H; if (d.y > H + 10) d.y = H * 0.55;
        const flicker = 0.6 + 0.4 * Math.sin(T * d.fr + d.ph);
        const driftX = Math.sin(T * 0.15 + d.ph) * d.drift;
        const px = d.x + driftX, py = d.y;
        ctx.globalAlpha = d.alpha * flicker * globalAlpha;
        ctx.beginPath(); ctx.arc(px, py, d.r, 0, TAU);
        ctx.fillStyle = `hsl(${d.hue},${d.sat}%,${d.light}%)`; ctx.fill();
        if (d.r > 1.0) {
          ctx.beginPath(); ctx.arc(px, py, d.r * 3, 0, TAU);
          ctx.fillStyle = `hsla(${d.hue},${d.sat}%,${d.light}%,${d.alpha * flicker * 0.15})`; ctx.fill();
        }
      }
      ctx.globalAlpha = globalAlpha;

      // Mineral sparkles
      for (const m of mineralSparkles) {
        const twinkle = Math.sin(T * m.fr + m.ph) * 0.5 + 0.5;
        const burst = Math.pow(Math.max(0, Math.sin(T * m.burstFr + m.burstPh)), 8) * m.peak;
        const alpha = (twinkle * 0.3 + burst * 0.7);
        if (alpha < 0.05) continue;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * (0.5 + burst), 0, TAU);
        ctx.fillStyle = `hsla(${m.hue},${m.sat}%,90%,${alpha * 0.9})`; ctx.fill();
        if (burst > 0.3) {
          ctx.strokeStyle = `hsla(${m.hue},${m.sat - 10}%,95%,${burst * 0.5})`;
          ctx.lineWidth = 0.3;
          const sL = m.r * (2 + burst * 4);
          ctx.beginPath(); ctx.moveTo(m.x - sL, m.y); ctx.lineTo(m.x + sL, m.y);
          ctx.moveTo(m.x, m.y - sL); ctx.lineTo(m.x, m.y + sL); ctx.stroke();
        }
        const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 5);
        hg.addColorStop(0, `hsla(${m.hue},${m.sat}%,80%,${alpha * 0.2})`);
        hg.addColorStop(1, 'transparent');
        ctx.fillStyle = hg; ctx.fillRect(m.x - m.r * 5, m.y - m.r * 5, m.r * 10, m.r * 10);
        ctx.restore();
      }
    }

    /* ═══ Light Beam + Cosmic Tree ═══ */
    let beamPts: { x: number; y: number }[] = [];
    let beamTanX: Float32Array = new Float32Array(0); // pre-computed normals
    let beamTanY: Float32Array = new Float32Array(0);
    let beamReady = false, beamProg = 0;

    // Tree branch system
    type TreeBranch = {
      startIdx: number; // index on trunk where branch begins
      side: number; // +1 or -1
      len: number; // branch length in world units
      angle: number; // deviation from perpendicular (radians)
      thickness: number;
      hue: number;
      // Sub-branches
      subs: { t: number; side: number; len: number; angle: number }[];
      // Leaf/blossom particles at tip
      leaves: { ox: number; oy: number; r: number; hue: number; ph: number }[];
    };
    let treeBranches: TreeBranch[] = [];

    function generateLightBeam() {
      beamPts = [];
      const sx = chosenStar.x, sy = chosenStar.y, ex = W / 2, ey = H * 0.52;
      const cp1x = lerp(sx, ex, 0.3) + rand(-150, 150), cp1y = lerp(sy, ey, 0.3) + rand(-80, 80);
      const cp2x = lerp(sx, ex, 0.7) + rand(-150, 150), cp2y = lerp(sy, ey, 0.7) + rand(-80, 80);
      for (let t = 0; t <= 1; t += 0.002) {
        const m = 1 - t, m2 = m * m, m3 = m2 * m, t2 = t * t, t3 = t2 * t;
        beamPts.push({ x: m3 * sx + 3 * m2 * t * cp1x + 3 * m * t2 * cp2x + t3 * ex, y: m3 * sy + 3 * m2 * t * cp1y + 3 * m * t2 * cp2y + t3 * ey });
      }
      // Pre-compute perpendicular normals
      const n = beamPts.length;
      beamTanX = new Float32Array(n);
      beamTanY = new Float32Array(n);
      for (let i = 0; i < n - 1; i++) {
        const dx = beamPts[i + 1].x - beamPts[i].x;
        const dy = beamPts[i + 1].y - beamPts[i].y;
        const d = Math.hypot(dx, dy) || 1;
        beamTanX[i] = -dy / d;
        beamTanY[i] = dx / d;
      }
      if (n > 1) { beamTanX[n - 1] = beamTanX[n - 2]; beamTanY[n - 1] = beamTanY[n - 2]; }

      // Generate tree branches along the trunk
      treeBranches = [];
      const branchCount = 18 + Math.floor(Math.random() * 8);
      for (let b = 0; b < branchCount; b++) {
        const t = 0.08 + (b / branchCount) * 0.82; // spread along 8%-90% of trunk
        const idx = Math.floor(t * (n - 1));
        const side = (b % 2 === 0 ? 1 : -1) * (Math.random() > 0.15 ? 1 : -1); // mostly alternating
        const depthFactor = Math.sin(t * Math.PI); // branches longest in the middle
        const len = (1.5 + rand(0.5, 2.5) * depthFactor) * (1 / cam.z || 1) * 40;
        const angle = rand(-0.4, 0.4); // slight angle variation from perpendicular
        const thickness = 0.04 + depthFactor * 0.08;
        const hue = rand(150, 260);

        // Generate sub-branches
        const subCount = Math.floor(1 + Math.random() * 3 * depthFactor);
        const subs = [];
        for (let s = 0; s < subCount; s++) {
          subs.push({
            t: 0.3 + Math.random() * 0.6, // position along parent branch
            side: Math.random() < 0.5 ? 1 : -1,
            len: len * rand(0.3, 0.6),
            angle: rand(-0.6, 0.6),
          });
        }

        // Leaf particles at tip
        const leafCount = 2 + Math.floor(Math.random() * 4);
        const leaves = [];
        for (let l = 0; l < leafCount; l++) {
          leaves.push({
            ox: rand(-0.8, 0.8), oy: rand(-0.8, 0.8),
            r: rand(0.08, 0.2), hue: rand(140, 280),
            ph: rand(0, TAU),
          });
        }

        treeBranches.push({ startIdx: idx, side, len, angle, thickness, hue, subs, leaves });
      }

      // Generate dense root system at trunk base (75%-100%)
      // Multiple roots per anchor point, radiating in a fan pattern
      const rootAnchors = 8 + Math.floor(Math.random() * 4); // anchor points along trunk
      for (let a = 0; a < rootAnchors; a++) {
        const anchorT = 0.75 + (a / rootAnchors) * 0.24;
        const anchorIdx = Math.floor(anchorT * (n - 1));
        const depthInRoot = (anchorT - 0.75) / 0.25;
        // Each anchor spawns 2-5 roots fanning out
        const fanCount = 2 + Math.floor(Math.random() * 4 * (0.5 + depthInRoot));
        for (let f = 0; f < fanCount; f++) {
          // Fan angles spread widely from each anchor
          const fanAngle = ((f / (fanCount - 1 || 1)) - 0.5) * 1.6 + rand(-0.3, 0.3);
          const side = (a + f) % 2 === 0 ? 1 : -1;
          const spreadFactor = 0.5 + depthInRoot * 1.0;
          const len = (2.0 + rand(1.5, 5.5) * spreadFactor) * (1 / cam.z || 1) * 40;
          const angle = fanAngle + side * (0.3 + depthInRoot * 0.5);
          const thickness = 0.06 + spreadFactor * 0.12;
          const hue = rand(18, 60);

          const subCount = 2 + Math.floor(Math.random() * 4 * spreadFactor);
          const subs = [];
          for (let s = 0; s < subCount; s++) {
            const subT = 0.15 + Math.random() * 0.7;
            subs.push({
              t: subT, side: Math.random() < 0.5 ? 1 : -1,
              len: len * rand(0.15, 0.45) * (1 - subT * 0.3),
              angle: rand(-1.2, 1.2),
            });
          }

          const leafCount = 1 + Math.floor(Math.random() * 2);
          const leaves = [];
          for (let l = 0; l < leafCount; l++) {
            leaves.push({
              ox: rand(-0.3, 0.3), oy: rand(-0.3, 0.3),
              r: rand(0.03, 0.09), hue: rand(15, 55), ph: rand(0, TAU),
            });
          }

          treeBranches.push({ startIdx: anchorIdx, side, len, angle, thickness, hue, subs, leaves });
        }
      }

      beamProg = 0; beamReady = true;
    }

    function drawLightBeam() {
      if (!beamReady || beamPts.length === 0) return;
      const clampedProg = clamp01(beamProg);
      const visN = Math.max(1, Math.ceil(beamPts.length * clampedProg));
      if (cam.z > 6) drawCosmicTree(visN); else drawExternalBeam(visN, clampedProg);
    }

    function drawCosmicTree(visN: number) {
      const T = getT();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const tailLen = Math.floor(beamPts.length * 0.2);
      const startIdx = Math.max(0, visN - tailLen);
      const span = visN - startIdx;
      if (span < 2) { ctx.restore(); return; }

      // === Trunk: thick glowing core along beam path ===
      ctx.beginPath();
      ctx.moveTo(beamPts[startIdx].x, beamPts[startIdx].y);
      for (let i = startIdx + 1; i < visN; i += 2) ctx.lineTo(beamPts[i].x, beamPts[i].y);
      // Wide diffuse outer glow
      ctx.strokeStyle = 'rgba(60,150,100,0.08)';
      ctx.lineWidth = 3.0;
      ctx.stroke();
      // Visible green glow
      ctx.strokeStyle = 'rgba(80,180,120,0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Mid bright
      ctx.strokeStyle = 'rgba(140,220,180,0.5)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // Bright core
      ctx.strokeStyle = 'rgba(220,255,230,0.9)';
      ctx.lineWidth = 0.18;
      ctx.stroke();

      // === Companion energy ribbons weaving around trunk (3 ribbons) ===
      const ribbonColors = [
        { hue: 160, sat: 70, lit: 65 }, // cyan-green
        { hue: 220, sat: 60, lit: 70 }, // blue
        { hue: 280, sat: 50, lit: 65 }, // purple
      ];
      for (let ribbon = 0; ribbon < 3; ribbon++) {
        const phase = ribbon * TAU / 3;
        const rc = ribbonColors[ribbon];
        ctx.beginPath();
        let isFirst = true;
        for (let i = startIdx; i < visN; i += 2) {
          const p = beamPts[i];
          const nx = beamTanX[i], ny = beamTanY[i];
          const localT = (i - startIdx) / (span || 1);
          const amp = (0.3 + 1.2 * Math.sin(localT * Math.PI)) * (1 - localT * 0.2);
          const wave = Math.sin(i * 0.1 + T * 5 + phase) * amp;
          const px = p.x + nx * wave, py = p.y + ny * wave;
          if (isFirst) { ctx.moveTo(px, py); isFirst = false; } else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `hsla(${rc.hue},${rc.sat}%,${rc.lit}%,0.2)`;
        ctx.lineWidth = 0.25;
        ctx.stroke();
        ctx.strokeStyle = `hsla(${rc.hue},${rc.sat}%,${rc.lit + 15}%,0.45)`;
        ctx.lineWidth = 0.08;
        ctx.stroke();
      }

      // Energy particles flowing along trunk and ribbons
      for (let i = startIdx; i < visN; i += 5) {
        const p = beamPts[i];
        const nx = beamTanX[i], ny = beamTanY[i];
        const flow = Math.sin(i * 0.15 - T * 6);
        if (flow > 0.4) {
          const offset = Math.sin(i * 0.1 + T * 5) * 0.8;
          ctx.beginPath();
          ctx.arc(p.x + nx * offset, p.y + ny * offset, 0.04 + flow * 0.03, 0, TAU);
          ctx.fillStyle = `rgba(180,255,200,${0.4 * (flow - 0.4)})`;
          ctx.fill();
        }
      }

      // === Branches & Roots ===
      for (let b = 0; b < treeBranches.length; b++) {
        const br = treeBranches[b];
        if (br.startIdx >= visN) continue;

        const isRoot = br.hue < 70; // roots have warm hue < 70
        const growProg = clamp01((visN - br.startIdx) / (beamPts.length * (isRoot ? 0.06 : 0.08)));
        const branchLen = br.len * growProg;
        if (branchLen < 0.5) continue;

        const tp = beamPts[br.startIdx];
        const nx = beamTanX[br.startIdx];
        const ny = beamTanY[br.startIdx];

        const dirX = nx * br.side * Math.cos(br.angle) - ny * br.side * Math.sin(br.angle);
        const dirY = ny * br.side * Math.cos(br.angle) + nx * br.side * Math.sin(br.angle);

        // Roots: slower, heavier sway. Canopy: lighter sway
        const swayAmp = isRoot ? 0.03 : 0.06;
        const swayFreq = isRoot ? 0.7 : 1.5;
        const sway = Math.sin(T * swayFreq + b * 1.7) * swayAmp;
        const swayDirX = dirX * Math.cos(sway) - dirY * Math.sin(sway);
        const swayDirY = dirX * Math.sin(sway) + dirY * Math.cos(sway);

        if (isRoot) {
          // === ROOT RENDERING: organic S-curve with tapering thickness ===
          // Roots use cubic bezier for more organic twisting shape
          const twist1 = Math.sin(b * 3.7 + T * 0.4) * branchLen * 0.15;
          const twist2 = Math.cos(b * 2.1 + T * 0.3) * branchLen * 0.1;
          const q1X = tp.x + swayDirX * branchLen * 0.33 + ny * br.side * twist1;
          const q1Y = tp.y + swayDirY * branchLen * 0.33 - nx * br.side * twist1;
          const q2X = tp.x + swayDirX * branchLen * 0.66 - ny * br.side * twist2;
          const q2Y = tp.y + swayDirY * branchLen * 0.66 + nx * br.side * twist2;
          const endX = tp.x + swayDirX * branchLen;
          const endY = tp.y + swayDirY * branchLen;

          const brAlpha = 0.25 + 0.35 * growProg;

          // Wide warm outer glow
          ctx.beginPath();
          ctx.moveTo(tp.x, tp.y);
          ctx.bezierCurveTo(q1X, q1Y, q2X, q2Y, endX, endY);
          ctx.strokeStyle = `hsla(${br.hue},60%,45%,${brAlpha * 0.25})`;
          ctx.lineWidth = br.thickness * 8;
          ctx.stroke();
          // Mid warm layer
          ctx.strokeStyle = `hsla(${br.hue},70%,60%,${brAlpha * 0.5})`;
          ctx.lineWidth = br.thickness * 3.5;
          ctx.stroke();
          // Core vein
          ctx.strokeStyle = `hsla(${br.hue},80%,80%,${brAlpha * 0.9})`;
          ctx.lineWidth = br.thickness * 1.0;
          ctx.stroke();

          // Energy pulse traveling along root
          const pulseT = (T * 0.8 + b * 0.5) % 1;
          const pulseX = tp.x * (1-pulseT)*(1-pulseT)*(1-pulseT) + q1X * 3*(1-pulseT)*(1-pulseT)*pulseT + q2X * 3*(1-pulseT)*pulseT*pulseT + endX * pulseT*pulseT*pulseT;
          const pulseY = tp.y * (1-pulseT)*(1-pulseT)*(1-pulseT) + q1Y * 3*(1-pulseT)*(1-pulseT)*pulseT + q2Y * 3*(1-pulseT)*pulseT*pulseT + endY * pulseT*pulseT*pulseT;
          const pulseAlpha = Math.sin(pulseT * Math.PI) * 0.6 * growProg;
          if (pulseAlpha > 0.05) {
            ctx.beginPath(); ctx.arc(pulseX, pulseY, br.thickness * 2, 0, TAU);
            ctx.fillStyle = `hsla(${br.hue + 10},80%,75%,${pulseAlpha})`;
            ctx.fill();
          }

          // === Root sub-branches (tendrils) ===
          for (let s = 0; s < br.subs.length; s++) {
            const sub = br.subs[s];
            if (growProg < sub.t + 0.05) continue;
            const subGrow = clamp01((growProg - sub.t) / 0.35);
            const st = sub.t;
            // Cubic bezier interpolation for parent position
            const m = 1 - st;
            const parentX = m*m*m*tp.x + 3*m*m*st*q1X + 3*m*st*st*q2X + st*st*st*endX;
            const parentY = m*m*m*tp.y + 3*m*m*st*q1Y + 3*m*st*st*q2Y + st*st*st*endY;

            const subDirX = swayDirX * Math.cos(sub.angle) - swayDirY * Math.sin(sub.angle);
            const subDirY = swayDirX * Math.sin(sub.angle) + swayDirY * Math.cos(sub.angle);
            const subLen = sub.len * subGrow * sub.side;
            // Tendrils curve slightly
            const tendrilBend = Math.sin(b * 5 + s * 3) * Math.abs(subLen) * 0.2;
            const subMidX = parentX + subDirX * subLen * 0.5 + ny * tendrilBend;
            const subMidY = parentY + subDirY * subLen * 0.5 - nx * tendrilBend;
            const subEndX = parentX + subDirX * subLen;
            const subEndY = parentY + subDirY * subLen;

            ctx.beginPath();
            ctx.moveTo(parentX, parentY);
            ctx.quadraticCurveTo(subMidX, subMidY, subEndX, subEndY);
            ctx.strokeStyle = `hsla(${br.hue + 15},65%,55%,${0.3 * subGrow})`;
            ctx.lineWidth = br.thickness * 1.8;
            ctx.stroke();
            ctx.strokeStyle = `hsla(${br.hue + 15},75%,75%,${0.5 * subGrow})`;
            ctx.lineWidth = br.thickness * 0.5;
            ctx.stroke();
          }

          // === Root tip glow nodes ===
          if (growProg > 0.5) {
            const tipAlpha = clamp01((growProg - 0.5) / 0.5);
            for (let l = 0; l < br.leaves.length; l++) {
              const lf = br.leaves[l];
              const pulse = 0.6 + 0.4 * Math.sin(T * 1.5 + lf.ph);
              const lx = endX + lf.ox;
              const ly = endY + lf.oy;
              const lr = lf.r * pulse * tipAlpha;
              // Warm diffuse glow
              ctx.beginPath(); ctx.arc(lx, ly, lr * 4, 0, TAU);
              ctx.fillStyle = `hsla(${lf.hue},70%,60%,${0.1 * tipAlpha * pulse})`;
              ctx.fill();
              ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU);
              ctx.fillStyle = `hsla(${lf.hue},80%,80%,${0.6 * tipAlpha * pulse})`;
              ctx.fill();
            }
          }
        } else {
          // === CANOPY BRANCH RENDERING (original) ===
          const midBend = Math.sin(T * 0.8 + b * 2.3) * branchLen * 0.08;
          const endX = tp.x + swayDirX * branchLen;
          const endY = tp.y + swayDirY * branchLen;
          const midX = tp.x + swayDirX * branchLen * 0.5 + ny * br.side * midBend;
          const midY = tp.y + swayDirY * branchLen * 0.5 - nx * br.side * midBend;

          const brAlpha = 0.3 + 0.3 * growProg;
          ctx.beginPath();
          ctx.moveTo(tp.x, tp.y);
          ctx.quadraticCurveTo(midX, midY, endX, endY);
          ctx.strokeStyle = `hsla(${br.hue},70%,60%,${brAlpha * 0.3})`;
          ctx.lineWidth = br.thickness * 6;
          ctx.stroke();
          ctx.strokeStyle = `hsla(${br.hue},80%,75%,${brAlpha * 0.7})`;
          ctx.lineWidth = br.thickness * 2;
          ctx.stroke();
          ctx.strokeStyle = `hsla(${br.hue},90%,90%,${brAlpha})`;
          ctx.lineWidth = br.thickness * 0.8;
          ctx.stroke();

          // Sub-branches
          for (let s = 0; s < br.subs.length; s++) {
            const sub = br.subs[s];
            if (growProg < sub.t + 0.1) continue;
            const subGrow = clamp01((growProg - sub.t) / 0.4);
            const st = sub.t;
            const parentX = tp.x * (1 - st) * (1 - st) + midX * 2 * st * (1 - st) + endX * st * st;
            const parentY = tp.y * (1 - st) * (1 - st) + midY * 2 * st * (1 - st) + endY * st * st;
            const subDirX = swayDirX * Math.cos(sub.angle) - swayDirY * Math.sin(sub.angle);
            const subDirY = swayDirX * Math.sin(sub.angle) + swayDirY * Math.cos(sub.angle);
            const subLen = sub.len * subGrow * sub.side;
            const subEndX = parentX + subDirX * subLen;
            const subEndY = parentY + subDirY * subLen;
            ctx.beginPath(); ctx.moveTo(parentX, parentY); ctx.lineTo(subEndX, subEndY);
            ctx.strokeStyle = `hsla(${br.hue + 20},70%,70%,${0.4 * subGrow})`;
            ctx.lineWidth = br.thickness * 1.2; ctx.stroke();
            ctx.strokeStyle = `hsla(${br.hue + 20},85%,85%,${0.6 * subGrow})`;
            ctx.lineWidth = br.thickness * 0.4; ctx.stroke();
          }

          // Leaf/blossom particles at branch tip
          if (growProg > 0.6) {
            const leafAlpha = clamp01((growProg - 0.6) / 0.4);
            for (let l = 0; l < br.leaves.length; l++) {
              const lf = br.leaves[l];
              const pulse = 0.7 + 0.3 * Math.sin(T * 2.5 + lf.ph);
              const lx = endX + lf.ox * (1 + 0.2 * Math.sin(T * 1.8 + lf.ph));
              const ly = endY + lf.oy * (1 + 0.2 * Math.cos(T * 1.8 + lf.ph));
              const lr = lf.r * pulse * leafAlpha;
              ctx.beginPath(); ctx.arc(lx, ly, lr * 3, 0, TAU);
              ctx.fillStyle = `hsla(${lf.hue},80%,70%,${0.15 * leafAlpha * pulse})`;
              ctx.fill();
              ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU);
              ctx.fillStyle = `hsla(${lf.hue},90%,90%,${0.8 * leafAlpha * pulse})`;
              ctx.fill();
            }
          }
        }
      }

      // === Floating pollen/energy motes near branches ===
      ctx.globalCompositeOperation = 'screen';
      for (let b = 0; b < treeBranches.length; b += 3) {
        const br = treeBranches[b];
        if (br.startIdx >= visN) continue;
        const tp = beamPts[br.startIdx];
        const nx = beamTanX[br.startIdx] * br.side;
        const ny = beamTanY[br.startIdx] * br.side;
        const drift = Math.sin(T * 1.2 + b * 0.9);
        const mx = tp.x + nx * br.len * 0.6 + drift * 0.5;
        const my = tp.y + ny * br.len * 0.6 + Math.cos(T * 0.9 + b) * 0.4;
        const mAlpha = 0.3 + 0.3 * Math.sin(T * 3 + b * 1.5);
        ctx.beginPath();
        ctx.arc(mx, my, 0.04, 0, TAU);
        ctx.fillStyle = `rgba(200,255,220,${mAlpha})`;
        ctx.fill();
      }

      ctx.restore();
    }

    function drawExternalBeam(visN: number, prog: number) {
      const T = getT();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const w = 2.0; const tailLen = Math.floor(beamPts.length * 0.3); const startIdx = Math.max(0, visN - tailLen);
      const alpha = prog < 1 ? 1 : Math.max(0, 1 - (beamProg - 1.0) * 4);
      if (alpha <= 0) { ctx.restore(); return; }

      // Main beam core
      ctx.beginPath(); ctx.moveTo(beamPts[startIdx].x, beamPts[startIdx].y);
      for (let i = startIdx + 1; i < visN; i += 2) ctx.lineTo(beamPts[i].x, beamPts[i].y);
      ctx.strokeStyle = `rgba(100,160,255,${0.4 * alpha})`; ctx.lineWidth = w * 7; ctx.stroke();
      ctx.strokeStyle = `rgba(160,210,255,${0.7 * alpha})`; ctx.lineWidth = w * 3; ctx.stroke();
      ctx.strokeStyle = `rgba(230,245,255,${0.95 * alpha})`; ctx.lineWidth = w * 1.0; ctx.stroke();

      // Companion energy ribbons weaving around main beam
      for (let ribbon = 0; ribbon < 2; ribbon++) {
        const phase = ribbon * Math.PI; // opposite sides
        const ribbonHue = ribbon === 0 ? 200 : 270; // blue vs purple
        ctx.beginPath();
        let isFirst = true;
        for (let i = startIdx; i < visN; i += 3) {
          const p = beamPts[i];
          const nx = beamTanX[i], ny = beamTanY[i];
          const localT = (i - startIdx) / (visN - startIdx || 1);
          const waveAmp = (4 + 8 * Math.sin(localT * Math.PI)) * (1 - localT * 0.3);
          const wave = Math.sin(i * 0.08 + T * 4 + phase) * waveAmp;
          const px = p.x + nx * wave, py = p.y + ny * wave;
          if (isFirst) { ctx.moveTo(px, py); isFirst = false; } else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `hsla(${ribbonHue},70%,70%,${0.3 * alpha})`;
        ctx.lineWidth = w * 2; ctx.stroke();
        ctx.strokeStyle = `hsla(${ribbonHue},80%,85%,${0.5 * alpha})`;
        ctx.lineWidth = w * 0.6; ctx.stroke();
      }

      // Scattered energy particles along the beam
      for (let i = startIdx; i < visN; i += 6) {
        const p = beamPts[i];
        const nx = beamTanX[i], ny = beamTanY[i];
        const spark = Math.sin(i * 0.4 + T * 8);
        if (spark > 0.6) {
          const offset = Math.sin(i * 0.2 + T * 3) * 6;
          ctx.beginPath();
          ctx.arc(p.x + nx * offset, p.y + ny * offset, 0.8 + spark, 0, TAU);
          ctx.fillStyle = `rgba(200,230,255,${(spark - 0.6) * alpha})`;
          ctx.fill();
        }
      }

      // Bright head with enhanced glow
      if (prog < 1 && visN > 0) {
        const head = beamPts[visN - 1];
        // Outer halo
        const g2 = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, w * 20);
        g2.addColorStop(0, `rgba(180,220,255,${0.7 * alpha})`);
        g2.addColorStop(0.3, `rgba(120,170,255,${0.2 * alpha})`);
        g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2; ctx.fillRect(head.x - w * 20, head.y - w * 20, w * 40, w * 40);
        // Core
        ctx.beginPath(); ctx.arc(head.x, head.y, w * 3, 0, TAU);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
        // Cross flare at head
        const flareLen = w * 12 * (0.8 + 0.2 * Math.sin(T * 6));
        ctx.strokeStyle = `rgba(220,240,255,${0.6 * alpha})`; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(head.x - flareLen, head.y); ctx.lineTo(head.x + flareLen, head.y);
        ctx.moveTo(head.x, head.y - flareLen); ctx.lineTo(head.x, head.y + flareLen);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ═══ Card Birth System ═══ */
    type CardGhost = {
      x: number; y: number; w: number; h: number; tilt: number;
      birthTime: number; opacity: number; scale: number; born: boolean;
      nebClouds: { x: number; y: number; r: number; hue: number; ph: number; sp: number }[];
      nebStars: { x: number; y: number; r: number; a: number; ph: number; fr: number }[];
    };
    type NovaRing = { x: number; y: number; startT: number; delay: number; maxR: number };
    type BirthDust = { x: number; y: number; vx: number; vy: number; startT: number; dur: number; r: number };
    type EntangleParticle = { fromIdx: number; toIdx: number; t: number; speed: number; hue: number; size: number };

    let cardGhosts: CardGhost[] = [];
    let novaRings: NovaRing[] = [];
    let birthDusts: BirthDust[] = [];
    let cardsActive = false;
    let entangleActive = false;
    let entangleParticles: EntangleParticle[] = [];
    let entangleStart = -1;
    let beamImpactTime = -1; // for shockwave when beam hits card zone

    function initCardGhosts() {
      const cw = 116, ch = 200;
      const n = cardCountRef.current;
      const gap = 32;
      const totalW = n * cw + (n - 1) * gap;
      const startX = (W - totalW) / 2 + cw / 2;
      const cy = H * 0.52;
      const tilts = n === 1 ? [0] : n === 2 ? [-1.5, 1.5] : n === 3 ? [-1.8, 0.5, 2.2] : Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 1.5);
      cardGhosts = [];
      for (let i = 0; i < n; i++) {
        let seed = (i + 1) * 1664525 + 1013904223;
        const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const clouds = Array.from({ length: 5 }, () => ({ x: rng() * cw, y: rng() * ch, r: 30 + rng() * 50, hue: 200 + rng() * 80, ph: rng() * TAU, sp: .003 + rng() * .005 }));
        const pts = Array.from({ length: 40 }, () => ({ x: rng() * cw, y: rng() * ch, r: rng() * .9, a: .2 + rng() * .6, ph: rng() * TAU, fr: .4 + rng() * 1.2 }));
        cardGhosts.push({ x: startX + i * (cw + gap), y: cy, w: cw, h: ch, tilt: tilts[i], birthTime: -1, opacity: 0, scale: 0.85, born: false, nebClouds: clouds, nebStars: pts });
      }
    }

    function birthCard(idx: number) {
      const card = cardGhosts[idx];
      const T = getT();
      card.born = true; card.birthTime = T;
      for (let k = 0; k < 2; k++) novaRings.push({ x: card.x, y: card.y, startT: T, delay: k * 0.15, maxR: 130 });
      for (let i = 0; i < 16; i++) {
        const a = TAU / 16 * i, d = rand(40, 90);
        birthDusts.push({ x: card.x, y: card.y, vx: Math.cos(a) * d, vy: Math.sin(a) * d, startT: T, dur: rand(0.8, 1.4), r: rand(1, 2.5) });
      }
      // Fire element: firework burst at card birth
      launchFirework(card.x, card.y, 80, [
        { r: 255, g: 215, b: 0 }, { r: 255, g: 170, b: 0 }, { r: 255, g: 69, b: 0 }, { r: 255, g: 255, b: 220 },
      ]);
    }

    function drawCardGhosts() {
      if (!cardsActive) return;
      const T = getT();

      // Nova rings
      for (let i = novaRings.length - 1; i >= 0; i--) {
        const ring = novaRings[i];
        const elapsed = T - ring.startT - ring.delay;
        if (elapsed < 0) continue;
        const p = clamp01(elapsed / 1.0);
        if (p >= 1) { novaRings[i] = novaRings[novaRings.length - 1]; novaRings.length--; continue; }
        ctx.beginPath(); ctx.arc(ring.x, ring.y, p * ring.maxR, 0, TAU);
        ctx.strokeStyle = `rgba(200,200,255,${(1 - p) * 0.7})`; ctx.lineWidth = 2; ctx.stroke();
      }

      // Birth dust
      for (let i = birthDusts.length - 1; i >= 0; i--) {
        const d = birthDusts[i];
        const p = clamp01((T - d.startT) / d.dur);
        if (p >= 1) { birthDusts[i] = birthDusts[birthDusts.length - 1]; birthDusts.length--; continue; }
        const ep = easeOutExpo(p);
        const px = d.x + d.vx * ep, py = d.y + d.vy * ep;
        const alpha = p < 0.1 ? p / 0.1 * 0.9 : 0.9 * (1 - (p - 0.1) / 0.9);
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.3, d.r * (1 - p * 0.7)), 0, TAU);
        ctx.fillStyle = `rgba(200,200,255,${Math.max(0, alpha)})`; ctx.fill();
      }

      // Cards
      for (const card of cardGhosts) {
        if (!card.born) continue;
        const elapsed = T - card.birthTime;

        // Flash
        if (elapsed < 0.2) {
          const flashAlpha = (1 - elapsed / 0.2) * 0.5;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const fg = ctx.createRadialGradient(card.x, card.y, 0, card.x, card.y, 120);
          fg.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
          fg.addColorStop(0.2, `rgba(220,200,120,${flashAlpha * 0.6})`);
          fg.addColorStop(0.5, `rgba(120,140,200,${flashAlpha * 0.2})`);
          fg.addColorStop(1, 'transparent');
          ctx.fillStyle = fg; ctx.fillRect(card.x - 120, card.y - 120, 240, 240);
          ctx.restore();
        }

        if (elapsed > 0.2) {
          const scaleP = clamp01((elapsed - 0.2) / 1.0);
          card.scale = 0.85 + easeOutBack(scaleP) * 0.15;
          card.opacity = clamp01((elapsed - 0.2) / 0.4);
        }
        if (card.opacity <= 0) continue;

        ctx.save();
        ctx.translate(card.x, card.y);
        ctx.rotate(card.tilt * Math.PI / 180);
        ctx.scale(card.scale, card.scale);
        ctx.globalAlpha = card.opacity;
        const hw = card.w / 2, hh = card.h / 2;

        // Clip card shape
        ctx.save();
        const cr = 8;
        ctx.beginPath();
        ctx.moveTo(-hw + cr, -hh); ctx.lineTo(hw - cr, -hh);
        ctx.arcTo(hw, -hh, hw, -hh + cr, cr); ctx.lineTo(hw, hh - cr);
        ctx.arcTo(hw, hh, hw - cr, hh, cr); ctx.lineTo(-hw + cr, hh);
        ctx.arcTo(-hw, hh, -hw, hh - cr, cr); ctx.lineTo(-hw, -hh + cr);
        ctx.arcTo(-hw, -hh, -hw + cr, -hh, cr);
        ctx.closePath(); ctx.clip();

        ctx.fillStyle = 'rgba(2,3,18,0.96)'; ctx.fillRect(-hw, -hh, card.w, card.h);

        // Nebula clouds
        for (const cl of card.nebClouds) {
          const px = cl.x - hw + 6 * Math.sin(T * cl.sp * 1.3 + cl.ph);
          const py = cl.y - hh + 4 * Math.cos(T * cl.sp + cl.ph * 1.2);
          const a = .12 + .05 * Math.sin(T * cl.sp * 3 + cl.ph);
          const rr = cl.r * (1 + .08 * Math.sin(T * cl.sp * 2));
          if (rr > 0) {
            const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
            g.addColorStop(0, `hsla(${cl.hue},60%,55%,${a})`);
            g.addColorStop(0.5, `hsla(${cl.hue - 20},50%,35%,${a * 0.5})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, cl.r, 0, TAU); ctx.fill();
          }
        }

        // Stars inside card
        for (const p of card.nebStars) {
          const tw = 0.55 + 0.45 * Math.sin(T * p.fr * 0.5 + p.ph);
          const sc2 = Math.sin(T * p.fr * 2.3 + p.ph * 3.1);
          const twinkle = tw * (sc2 > 0.85 ? 1 + (sc2 - 0.85) * 3 : 1); // occasional bright flash
          ctx.globalAlpha = card.opacity * p.a * Math.min(1, twinkle);
          const sr = Math.max(0.1, p.r * (1 + 0.15 * Math.sin(T * p.fr * 0.3 + p.ph)));
          ctx.beginPath(); ctx.arc(p.x - hw, p.y - hh, sr, 0, TAU);
          ctx.fillStyle = '#d0c8f8'; ctx.fill();
        }
        ctx.globalAlpha = card.opacity;

        // Inner border
        ctx.strokeStyle = 'rgba(120,140,200,0.12)'; ctx.lineWidth = 1;
        ctx.strokeRect(-hw + 5, -hh + 5, card.w - 10, card.h - 10);

        // Breathing glow
        const bg = ctx.createRadialGradient(0, -hh * 0.2, 0, 0, 0, Math.max(hw, hh));
        bg.addColorStop(0, `rgba(140,160,240,${0.05 * (0.5 + 0.5 * Math.sin(T))})`);
        bg.addColorStop(1, 'transparent');
        ctx.fillStyle = bg; ctx.fillRect(-hw, -hh, card.w, card.h);
        ctx.restore(); // unclip

        // Card border
        ctx.beginPath();
        ctx.moveTo(-hw + cr, -hh); ctx.lineTo(hw - cr, -hh);
        ctx.arcTo(hw, -hh, hw, -hh + cr, cr); ctx.lineTo(hw, hh - cr);
        ctx.arcTo(hw, hh, hw - cr, hh, cr); ctx.lineTo(-hw + cr, hh);
        ctx.arcTo(-hw, hh, -hw, hh - cr, cr); ctx.lineTo(-hw, -hh + cr);
        ctx.arcTo(-hw, -hh, -hw + cr, -hh, cr); ctx.closePath();
        ctx.strokeStyle = `rgba(140,160,210,${0.35 * card.opacity})`; ctx.lineWidth = 1; ctx.stroke();

        ctx.restore(); // card transform
      }

      // Beam impact shockwave
      if (beamImpactTime > 0) {
        const elapsed = T - beamImpactTime;
        if (elapsed < 1.5) {
          const p = clamp01(elapsed / 1.5);
          const r = easeOutExpo(p) * Math.max(W, H) * 0.4;
          const alpha = (1 - p) * 0.4;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath(); ctx.arc(W / 2, H * 0.52, r, 0, TAU);
          ctx.strokeStyle = `rgba(160,200,255,${alpha})`; ctx.lineWidth = 3 * (1 - p);
          ctx.stroke();
          // Inner bright ring
          const r2 = easeOutExpo(clamp01(elapsed / 0.8)) * Math.max(W, H) * 0.2;
          const a2 = clamp01(1 - elapsed / 0.8) * 0.6;
          ctx.beginPath(); ctx.arc(W / 2, H * 0.52, r2, 0, TAU);
          ctx.strokeStyle = `rgba(220,240,255,${a2})`; ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Quantum entanglement lines + particles between cards
      if (entangleActive && cardGhosts.length > 1) {
        const elapsed = T - entangleStart;
        const fadeIn = clamp01(elapsed / 1.2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';

        // Build connection pairs: adjacent + cross-card (weaker)
        type EntPair = { ai: number; bi: number; strength: number };
        const pairs: EntPair[] = [];
        for (let i = 0; i < cardGhosts.length - 1; i++) {
          pairs.push({ ai: i, bi: i + 1, strength: 1.0 });
        }
        // Cross connections for 3+ cards (skip-one pairs)
        for (let i = 0; i < cardGhosts.length - 2; i++) {
          pairs.push({ ai: i, bi: i + 2, strength: 0.35 });
        }

        for (const pair of pairs) {
          const a = cardGhosts[pair.ai], b = cardGhosts[pair.bi];
          if (!a.born || !b.born) continue;
          const pairAlpha = fadeIn * pair.strength * Math.min(a.opacity, b.opacity);
          if (pairAlpha <= 0.01) continue;

          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = -dy / dist, ny = dx / dist;

          // Wave amplitude scales with distance, breathing pulse
          const breathPulse = 0.8 + 0.2 * Math.sin(T * 1.8 + pair.ai * 1.5);
          const waveAmp = Math.min(18, dist * 0.06) * breathPulse;
          // Non-integer wave count looks more organic
          const waveFreq = 2.3 + pair.ai * 0.4;
          const tShift = T * 2.5;

          // Primary wave
          ctx.beginPath();
          for (let s = 0; s <= 1; s += 0.015) {
            const px = lerp(a.x, b.x, s), py = lerp(a.y, b.y, s);
            const envelope = Math.sin(s * Math.PI); // zero at endpoints
            const wave = Math.sin(s * Math.PI * waveFreq + tShift) * waveAmp * envelope;
            const fx = px + nx * wave, fy = py + ny * wave;
            if (s === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
          }
          ctx.strokeStyle = `rgba(140,180,255,${0.25 * pairAlpha})`;
          ctx.lineWidth = 1.5; ctx.stroke();

          // Complementary entangled wave (phase-inverted)
          ctx.beginPath();
          for (let s = 0; s <= 1; s += 0.015) {
            const px = lerp(a.x, b.x, s), py = lerp(a.y, b.y, s);
            const envelope = Math.sin(s * Math.PI);
            const wave = Math.sin(s * Math.PI * waveFreq + tShift + Math.PI) * waveAmp * envelope;
            const fx = px + nx * wave, fy = py + ny * wave;
            if (s === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
          }
          ctx.strokeStyle = `rgba(180,120,255,${0.18 * pairAlpha})`;
          ctx.lineWidth = 1; ctx.stroke();

          // Pulsing glow nodes along the connection (3 nodes)
          for (let n = 1; n <= 3; n++) {
            const nodeT = n / 4;
            const nodeX = lerp(a.x, b.x, nodeT);
            const nodeY = lerp(a.y, b.y, nodeT);
            const nodePulse = 0.5 + 0.5 * Math.sin(T * 2.2 + n * 2.1 + pair.ai);
            const nodeR = 12 + nodePulse * 10;
            const nodeA = pairAlpha * 0.15 * nodePulse;
            ctx.beginPath(); ctx.arc(nodeX, nodeY, nodeR, 0, TAU);
            ctx.fillStyle = `rgba(160,180,255,${nodeA})`; ctx.fill();
          }

          // Central midpoint glow — breathing
          const mgPulse = 0.6 + 0.4 * Math.sin(T * 1.5 + pair.ai * 2);
          const mgR = 25 + mgPulse * 12;
          ctx.beginPath(); ctx.arc(mx, my, mgR, 0, TAU);
          ctx.fillStyle = `rgba(180,200,255,${pairAlpha * 0.12 * mgPulse})`; ctx.fill();
        }

        // Flowing particles — spawn between any connected pair (capped)
        const maxParticles = 30 + pairs.length * 5;
        const spawnRate = elapsed < 1.5 ? 0.7 : 0.35;
        if (elapsed > 0.3 && entangleParticles.length < maxParticles && Math.random() < spawnRate && pairs.length > 0) {
          const pair = pairs[Math.floor(Math.random() * pairs.length)];
          const a = cardGhosts[pair.ai], b = cardGhosts[pair.bi];
          if (a.born && b.born) {
            // Randomly pick direction
            const forward = Math.random() < 0.5;
            entangleParticles.push({
              fromIdx: forward ? pair.ai : pair.bi,
              toIdx: forward ? pair.bi : pair.ai,
              t: 0, speed: rand(0.25, 0.7),
              hue: rand(180, 280), size: rand(1.2, 2.8),
            });
          }
        }

        // Update & draw particles
        for (let i = entangleParticles.length - 1; i >= 0; i--) {
          const ep = entangleParticles[i];
          ep.t += ep.speed / 60;
          if (ep.t > 1) { entangleParticles[i] = entangleParticles[entangleParticles.length - 1]; entangleParticles.length--; continue; }
          const a = cardGhosts[ep.fromIdx], b = cardGhosts[ep.toIdx];
          const px = lerp(a.x, b.x, ep.t), py = lerp(a.y, b.y, ep.t);
          const ddx = b.x - a.x, ddy = b.y - a.y;
          const ddist = Math.hypot(ddx, ddy) || 1;
          const pnx = -ddy / ddist, pny = ddx / ddist;
          // Particle follows wave but with its own phase offset
          const envelope = Math.sin(ep.t * Math.PI);
          const pWave = Math.sin(ep.t * Math.PI * 2.3 + T * 2.5 + ep.hue * 0.1) * Math.min(18, ddist * 0.06) * envelope;
          // Add slight perpendicular drift for organic feel
          const drift = Math.sin(T * 3.5 + ep.hue * 0.05) * 3 * envelope;
          const fx = px + pnx * (pWave + drift);
          const fy = py + pny * (pWave + drift);
          const pAlpha = fadeIn * envelope * 0.85;

          // Core
          ctx.beginPath(); ctx.arc(fx, fy, ep.size, 0, TAU);
          ctx.fillStyle = `hsla(${ep.hue},70%,80%,${pAlpha})`; ctx.fill();
          // Soft glow
          ctx.beginPath(); ctx.arc(fx, fy, ep.size * 3.5, 0, TAU);
          ctx.fillStyle = `hsla(${ep.hue},60%,85%,${pAlpha * 0.15})`; ctx.fill();
          // Tiny trail behind particle
          if (ep.t > 0.05) {
            const trailT = ep.t - 0.04;
            const tpx = lerp(a.x, b.x, trailT), tpy = lerp(a.y, b.y, trailT);
            const tEnv = Math.sin(trailT * Math.PI);
            const tWave = Math.sin(trailT * Math.PI * 2.3 + T * 2.5 + ep.hue * 0.1) * Math.min(18, ddist * 0.06) * tEnv;
            const tDrift = Math.sin(T * 3.5 + ep.hue * 0.05) * 3 * tEnv;
            const tfx = tpx + pnx * (tWave + tDrift), tfy = tpy + pny * (tWave + tDrift);
            ctx.beginPath(); ctx.moveTo(tfx, tfy); ctx.lineTo(fx, fy);
            ctx.strokeStyle = `hsla(${ep.hue},60%,80%,${pAlpha * 0.4})`; ctx.lineWidth = ep.size * 0.6; ctx.stroke();
          }
        }

        ctx.restore();
      }
    }

    /* ═══ Falling Star Trails ═══ */
    function drawFallingTrails() {
      if (fallingTrails.length === 0) return;
      const T = getT();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = fallingTrails.length - 1; i >= 0; i--) {
        const tr = fallingTrails[i];
        const p = clamp01((T - tr.startT) / tr.dur);
        if (p >= 1) { fallingTrails[i] = fallingTrails[fallingTrails.length - 1]; fallingTrails.length--; continue; }

        // Current head position (ease out)
        const ep = easeOutExpo(p);
        const hx = lerp(tr.fromX, tr.toX, ep);
        const hy = lerp(tr.fromY, tr.toY, ep);

        // Tail (lagging behind)
        const tp = easeOutExpo(Math.max(0, p - 0.15));
        const tx = lerp(tr.fromX, tr.toX, tp);
        const ty = lerp(tr.fromY, tr.toY, tp);

        const ds = destinyStars[tr.idx];
        const hue = ds?.hue ?? 210;
        const alpha = p < 0.8 ? 1 : (1 - (p - 0.8) / 0.2);

        // Trail line
        const lg = ctx.createLinearGradient(tx, ty, hx, hy);
        lg.addColorStop(0, 'transparent');
        lg.addColorStop(0.3, `hsla(${hue},60%,70%,${0.3 * alpha})`);
        lg.addColorStop(1, `hsla(${hue},70%,85%,${0.8 * alpha})`);
        ctx.strokeStyle = lg; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();

        // Head glow
        const headR = 4 * (1 - p * 0.5);
        const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, headR * 5);
        hg.addColorStop(0, `hsla(${hue},70%,95%,${0.9 * alpha})`);
        hg.addColorStop(0.3, `hsla(${hue},60%,75%,${0.3 * alpha})`);
        hg.addColorStop(1, 'transparent');
        ctx.fillStyle = hg; ctx.fillRect(hx - headR * 5, hy - headR * 5, headR * 10, headR * 10);
        ctx.beginPath(); ctx.arc(hx, hy, headR, 0, TAU);
        ctx.fillStyle = `hsla(${hue},50%,97%,${0.95 * alpha})`; ctx.fill();
      }
      ctx.restore();
    }

    /* ═══ Destiny Text ═══ */
    let destinyTextAlpha = 0;
    function drawDestinyText() {
      if (destinyTextAlpha <= 0) return;
      const text = '星河的流转只为你停留 · 翻开命运之牌';
      ctx.save();
      ctx.globalAlpha = destinyTextAlpha * globalAlpha;
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,190,220,0.65)';
      ctx.letterSpacing = '4px';
      ctx.fillText(text, W / 2, H - 42);
      ctx.restore();
    }

    /* ═══ Breath Veil ═══ */
    function drawBreathVeil() {
      const T = getT();
      const breath = 0.09 + 0.06 * Math.sin(T * 1.3);
      const maxDim = Math.max(W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, maxDim * 0.85);
      g.addColorStop(0, 'transparent'); g.addColorStop(1, `rgba(3,3,16,${breath})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    /* ═══ Draw Loop (with error protection) ═══ */
    let globalAlpha = 1; // for final fade

    function draw() {
      if (cancelledRef.current) return;
      try {
        const T = getT();
        updateCam();

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = globalAlpha;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#030310'; ctx.fillRect(0, 0, W, H);

        // World-space (camera transformed)
        ctx.save();
        ctx.translate(W / 2 + cam.shakeX, H / 2 + cam.shakeY);
        ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);

        // Nebula clouds
        for (const nc of nebulaClouds) {
          const drift = Math.sin(T * nc.speed + nc.ph) * 15; const breath = 1 + .08 * Math.sin(T * nc.speed * 2 + nc.ph);
          const rr = nc.r * breath;
          if (rr > 0) {
            const g = ctx.createRadialGradient(nc.x + drift, nc.y + drift * .6, 0, nc.x + drift, nc.y + drift * .6, rr);
            g.addColorStop(0, `hsla(${nc.hue},${nc.sat}%,45%,${nc.alpha})`); g.addColorStop(0.5, `hsla(${nc.hue + 15},${nc.sat - 10}%,30%,${nc.alpha * 0.4})`); g.addColorStop(1, 'transparent');
            ctx.fillStyle = g; ctx.fillRect(nc.x - rr + drift - 10, nc.y - rr + drift * .6 - 10, rr * 2 + 20, rr * 2 + 20);
          }
        }

        // Stars — viewport culling
        const maxStarR = 3.5;
        const cullMargin = maxStarR * 3;
        const wLeft = cam.x - (W / 2) / cam.z - cullMargin;
        const wRight = cam.x + (W / 2) / cam.z + cullMargin;
        const wTop = cam.y - (H / 2) / cam.z - cullMargin;
        const wBottom = cam.y + (H / 2) / cam.z + cullMargin;

        for (const s of stars) {
          if (!s.emerged) continue;
          if (s.x < wLeft || s.x > wRight || s.y < wTop || s.y > wBottom) continue;

          // Fade-in when star first emerges (1.2s fade)
          const emergeAge = s.emergeTime ? T - s.emergeTime : 999;
          const emergeFade = clamp01(emergeAge / 1.2);
          if (emergeFade <= 0) continue;

          // Twinkle: layer-differentiated with natural variance
          const layerSpeed = [1.0, 1.4, 2.0][s.layer]; // distant stars twinkle faster
          const layerAmp = [0.5, 0.4, 0.3][s.layer];   // distant stars twinkle more
          const wave1 = Math.sin(T * s.fr1 * layerSpeed + s.ph);
          const wave2 = Math.sin(T * s.fr2 * 0.7 + s.ph * 2.7);
          const wave3 = Math.sin(T * s.fr1 * 2.3 + s.ph * 3.1) * 0.15; // extra variance
          const scint = Math.sin(T * s.fr1 * 3.2 + s.ph * 5.1); // gentler scintillation
          const spike = scint > 0.92 ? Math.pow((scint - 0.92) / 0.08, 2) * 0.35 : 0; // softer bright flash
          const fl = s.base * (1 - layerAmp + layerAmp * wave1) * (.85 + .15 * wave2) + wave3 + spike;
          const sizeMod = 1 + 0.10 * wave1 + 0.04 * wave2; // gentler size breathing
          const apparent = s.r * cam.z;

          if (s.isDestiny) {
            let rMult = 1, alphaMult = 1, emergePulse = 0;
            if (s.phase === 'emerge') { s.animProg = Math.min(1, (s.animProg || 0) + 0.008); alphaMult = easeIO(s.animProg); rMult = 0.2 + easeOutExpo(s.animProg) * 0.8; emergePulse = (1 - s.animProg) * 5; }
            else if (s.phase === 'shrink') { s.animProg = Math.min(1, (s.animProg || 0) + 0.015); rMult = 1 - easeIO(s.animProg) * 0.9; }
            else if (s.phase === 'burst') { s.animProg = Math.min(1, (s.animProg || 0) + 0.015); rMult = 1 + easeIO(s.animProg) * 5; alphaMult = 1 - easeIO(s.animProg); }
            if (alphaMult <= 0) continue;
            const baseR = Math.max(0.01, s.r * rMult);
            const pulse = 1 + (s.phase === 'emerge' ? emergePulse * 0.08 * (0.5 + 0.5 * Math.sin(T * 2.5 + s.ph)) : .04 * Math.sin(T * 1.2 + s.ph));
            const glowR = Math.max(0.01, baseR * 3.5 * pulse);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
            gr.addColorStop(0, `hsla(${s.hue},${s.sat}%,97%,${.95 * alphaMult})`); gr.addColorStop(.1, `hsla(${s.hue},${s.sat}%,90%,${.6 * alphaMult})`);
            gr.addColorStop(.3, `hsla(${s.hue},${s.sat}%,75%,${.18 * alphaMult})`); gr.addColorStop(1, 'transparent');
            ctx.fillStyle = gr; ctx.fillRect(s.x - glowR, s.y - glowR, glowR * 2, glowR * 2);
            ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(0.01, baseR * pulse * .8), 0, TAU);
            ctx.fillStyle = `hsla(${s.hue},${s.sat}%,100%,${.97 * alphaMult})`; ctx.fill();
            const screenApparent = s.r * cam.z * rMult;
            if (screenApparent > 1.0 && s.phase !== 'burst') {
              const flareAlpha = s.phase === 'emerge' ? alphaMult * (0.5 + 0.3 * Math.sin(T * 1.8 + s.ph * 3)) : .35 * alphaMult;
              ctx.strokeStyle = `hsla(${s.hue},25%,95%,${flareAlpha})`; ctx.lineWidth = Math.max(0.01, .4 * rMult / cam.z);
              const sL = baseR * (3 + (s.phase === 'emerge' ? emergePulse * 0.3 : 0)) * pulse;
              ctx.beginPath(); ctx.moveTo(s.x - sL, s.y); ctx.lineTo(s.x + sL, s.y); ctx.moveTo(s.x, s.y - sL); ctx.lineTo(s.x, s.y + sL); ctx.stroke();
            }
            if (s.phase === 'emerge' || s.phase === 'shrink' || s.phase === 'burst') {
              ctx.lineWidth = Math.max(0.01, 2.0 / cam.z);
              if (s.phase === 'emerge') {
                // Sacred geometry: nested rotating hexagons + light rays
                const prog = s.animProg || 0;
                const maxR = s.r * 14 * prog * pulse;
                const lw = Math.max(0.01, 1.5 / cam.z);

                // 3 nested hexagons, each rotating at different speeds
                for (let ring = 0; ring < 3; ring++) {
                  const ringR = maxR * (0.4 + ring * 0.3);
                  if (ringR < 0.05) continue;
                  const sides = 6;
                  const rot = T * (1.2 - ring * 0.3) * (ring % 2 === 0 ? 1 : -1) + s.ph + ring * 0.5;
                  const ringAlpha = prog * alphaMult * (0.6 - ring * 0.15);

                  ctx.beginPath();
                  for (let v = 0; v <= sides; v++) {
                    const a = rot + (v / sides) * TAU;
                    const vx = s.x + Math.cos(a) * ringR;
                    const vy = s.y + Math.sin(a) * ringR;
                    if (v === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
                  }
                  ctx.strokeStyle = `rgba(${s.glowR},${s.glowG},${s.glowB},${ringAlpha * 0.3})`;
                  ctx.lineWidth = lw * 2.5; ctx.stroke();
                  ctx.strokeStyle = `rgba(${s.glowR},${s.glowG},${s.glowB},${ringAlpha * 0.7})`;
                  ctx.lineWidth = lw * 0.8; ctx.stroke();
                }

                // 6 radiating light rays from center
                const rayLen = maxR * 1.2;
                if (rayLen > 0.1) {
                  const rayRot = T * 0.6 + s.ph * 2;
                  const rayAlpha = prog * alphaMult * 0.5;
                  for (let ray = 0; ray < 6; ray++) {
                    const a = rayRot + (ray / 6) * TAU;
                    const tipX = s.x + Math.cos(a) * rayLen;
                    const tipY = s.y + Math.sin(a) * rayLen;
                    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tipX, tipY);
                    ctx.strokeStyle = `rgba(${s.glowR},${s.glowG},${s.glowB},${rayAlpha * 0.4})`;
                    ctx.lineWidth = lw * 1.5; ctx.stroke();
                    // Bright dot at ray tip
                    const tipPulse = 0.6 + 0.4 * Math.sin(T * 1.8 + ray);
                    ctx.beginPath(); ctx.arc(tipX, tipY, Math.max(0.01, s.r * 0.3 * tipPulse), 0, TAU);
                    ctx.fillStyle = `rgba(${s.glowR},${s.glowG},${s.glowB},${rayAlpha * tipPulse})`;
                    ctx.fill();
                  }
                }
              } else {
                // Shrink/burst: collapsing hexagon
                const ap = s.animProg || 0;
                const hexR = Math.max(0, s.r * 8 * (s.phase === 'shrink' ? 1 - ap : 0.1 + ap * 10));
                const rot = T * 2 + s.ph;
                ctx.beginPath();
                for (let v = 0; v <= 6; v++) {
                  const a = rot + (v / 6) * TAU;
                  const vx = s.x + Math.cos(a) * hexR;
                  const vy = s.y + Math.sin(a) * hexR;
                  if (v === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
                }
                ctx.strokeStyle = `rgba(${s.glowR},${s.glowG},${s.glowB},${0.5 * alphaMult})`;
                ctx.lineWidth = Math.max(0.01, 1.5 / cam.z);
                ctx.stroke();
              }
            }
            ctx.restore(); continue;
          }
          if (apparent < .12) continue;
          ctx.globalAlpha = Math.min(1, fl) * emergeFade * globalAlpha;
          const drawR = s.r * sizeMod;
          if (apparent > .6) { ctx.beginPath(); ctx.arc(s.x, s.y, drawR * 2.2, 0, TAU); ctx.fillStyle = s.fillColorGlow!; ctx.fill(); }
          ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(drawR * .55, .12), 0, TAU); ctx.fillStyle = s.fillColor!; ctx.fill();
          // Scintillation spike: brief starburst rays
          if (spike > 0.1) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const rayCount = 4;
            const rayLen = drawR * (3 + spike * 5);
            const rayRot = s.ph + T * 0.2; // slow rotation
            ctx.lineWidth = Math.max(0.03, drawR * 0.25 * spike);
            ctx.strokeStyle = `hsla(${s.hue},${s.sat}%,92%,${spike * 0.4})`;
            ctx.beginPath();
            for (let ray = 0; ray < rayCount; ray++) {
              const a = rayRot + (ray / rayCount) * TAU;
              ctx.moveTo(s.x, s.y);
              ctx.lineTo(s.x + Math.cos(a) * rayLen, s.y + Math.sin(a) * rayLen);
            }
            ctx.stroke();
            // Central bright dot
            ctx.beginPath(); ctx.arc(s.x, s.y, drawR * (1.2 + spike * 1.5), 0, TAU);
            ctx.fillStyle = `hsla(${s.hue},${s.sat}%,95%,${spike * 0.25})`; ctx.fill();
            ctx.restore();
          }
          if (apparent > 3.5) {
            ctx.strokeStyle = s.strokeColor!; ctx.lineWidth = .15; const sL = drawR * 2.8;
            ctx.beginPath(); ctx.moveTo(s.x - sL, s.y); ctx.lineTo(s.x + sL, s.y); ctx.moveTo(s.x, s.y - sL); ctx.lineTo(s.x, s.y + sL); ctx.stroke();
          }
          ctx.globalAlpha = globalAlpha;
        }

        // Earth element: terrain, dust, mineral sparkles (behind beam)
        drawEarth();

        if (beamReady) drawLightBeam();
        ctx.restore(); // camera

        // Screen-space overlays
        drawD20(W / 2, H / 2);
        drawFireworks(); // Fire element: firework particles
        drawFallingTrails();
        drawCardGhosts();
        drawWaterDrop();
        drawBreathVeil();
        drawDestinyText();

        // Shooting stars
        if (cam.z < 2) {
          if (Math.random() < .015 && emergedCount > 0) {
            if (shootingStars.length < 3) shootingStars.push({ x: rand(0, W * .85), y: rand(0, H * .3), vx: rand(5, 12), vy: rand(2, 5), life: 0, maxL: rand(25, 50), len: rand(55, 130), w: rand(.5, 1.8) });
          }
          for (let i = shootingStars.length - 1; i >= 0; i--) {
            const m = shootingStars[i]; m.x += m.vx; m.y += m.vy; m.life++;
            const pr = m.life / m.maxL; if (pr >= 1) { shootingStars[i] = shootingStars[shootingStars.length - 1]; shootingStars.length--; continue; }
            const al = pr < .2 ? pr / .2 : 1 - (pr - .2) / .8; const tl = m.len * Math.min(pr * 3, 1); const nrm = Math.hypot(m.vx, m.vy) || 1;
            ctx.save(); ctx.lineCap = 'round';
            const lg = ctx.createLinearGradient(m.x, m.y, m.x - m.vx / nrm * tl, m.y - m.vy / nrm * tl);
            lg.addColorStop(0, `rgba(230,240,255,${al * .85})`); lg.addColorStop(1, 'transparent');
            ctx.strokeStyle = lg; ctx.lineWidth = m.w; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx / nrm * tl, m.y - m.vy / nrm * tl); ctx.stroke();
            ctx.beginPath(); ctx.arc(m.x, m.y, m.w * 1.2, 0, TAU); ctx.fillStyle = `rgba(255,255,255,${al * .5})`; ctx.fill(); ctx.restore();
          }
        }

        ctx.restore(); // dpr
      } catch (e) {
        console.error('[StardomeAnimation] draw error:', e);
      }
      animId = requestAnimationFrame(draw);
    }

    /* ═══ Star Emergence ═══ */
    async function emergeStars() {
      const cx = W / 2, cy = H / 2;
      const sorted = [...stars].sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
      for (let i = 0; i < sorted.length; i++) {
        if (cancelledRef.current) return;
        sorted[i].emerged = true;
        sorted[i].emergeTime = getT();
        emergedCount++;
        if (i % 15 === 0) await safeSleep(16);
      }
    }

    /* ═══ Main Sequence ═══ */
    async function main() {
      if (cancelledRef.current) return;
      initCardGhosts();

      // 1. Water drop
      waterDropStart = getT();
      await safeSleep(1100);
      if (cancelledRef.current) return;
      const ripT = getT();
      for (let i = 0; i < 4; i++) rippleStarts.push(ripT + i * 0.16);
      splashStart = ripT;

      // 2. Stars emerge + gentle drift
      emergeStars();
      // Slow drift while stars appear
      moveCam(W / 2 + rand(-30, 30), H / 2 + rand(-20, 20), 1.05, 3.0, easeIO);
      await safeSleep(1200);
      if (cancelledRef.current) return;
      if (skipBtnRef.current) skipBtnRef.current.style.opacity = '1';

      // 3. D20 dice — drift back to center
      moveCam(W / 2, H / 2, 1.0, 2.0, easeIO);
      d20.active = true;
      const d20In = window.setInterval(() => { d20.opacity = Math.min(1, d20.opacity + 0.025); }, 16);
      timers.push(d20In);
      await safeSleep(2000);
      if (cancelledRef.current) return;
      clearInterval(d20In); d20.opacity = 1;

      // D20 fade out — gentle zoom to fill visual gap
      d20.fadeOut = true;
      moveCam(W / 2, H / 2, 1.08, 1.2, easeIO);
      const d20Out = window.setInterval(() => {
        d20.opacity = Math.max(0, d20.opacity - 0.015); d20.scale *= 0.995;
        if (d20.opacity <= 0) { clearInterval(d20Out); d20.active = false; }
      }, 16);
      timers.push(d20Out);
      await safeSleep(800);
      if (cancelledRef.current) return;

      // 3.5 Transition pause — gentle camera drift to let the scene breathe
      moveCam(W / 2 + rand(-15, 15), H / 2 + rand(-10, 10), 1.02, 1.5, easeIO);
      await safeSleep(600);
      if (cancelledRef.current) return;

      // 4. All destiny stars ignite (sequentially with slight delay)
      for (let i = 0; i < destinyStars.length; i++) {
        destinyStars[i].emerged = true;
        destinyStars[i].phase = 'emerge';
        destinyStars[i].animProg = 0;
        if (i < destinyStars.length - 1) await safeSleep(200);
        if (cancelledRef.current) return;
      }
      await safeSleep(1000);
      if (cancelledRef.current) return;

      // 5. Camera rush to star
      await moveCam(chosenStar.x, chosenStar.y, 8.0, 1.5, easeIO);
      if (cancelledRef.current) return;
      await safeSleep(300);
      if (cancelledRef.current) return;

      // 6. Light beam + DNA traversal
      generateLightBeam();
      const flyDur = 2400; const flyStart = performance.now();
      await new Promise<void>(resolve => {
        function track() {
          if (cancelledRef.current) { resolve(); return; }
          let p = (performance.now() - flyStart) / flyDur;
          if (p > 1.25) p = 1.25;
          beamProg = p;
          const clampedP = clamp01(p);
          const headIdx = Math.min(beamPts.length - 1, Math.floor(beamPts.length * clampedP));
          if (p < 0.4) {
            const lp = p / 0.4; const ci = Math.max(0, headIdx - 30); const cp = beamPts[ci] || chosenStar;
            cam.x = lerp(chosenStar.x, cp.x, easeIO(lp)); cam.y = lerp(chosenStar.y, cp.y, easeIO(lp)); cam.z = lerp(8.0, 22.0, easeIO(lp));
          } else if (p < 0.75) {
            const lp = (p - 0.4) / 0.35; const ci = Math.max(0, headIdx - Math.floor(lerp(30, 80, lp))); const cp = beamPts[ci] || beamPts[0];
            cam.x = cp.x; cam.y = cp.y; cam.z = lerp(22.0, 3.5, easeIO(lp));
          } else if (p < 1) {
            const lp = (p - 0.75) / 0.25;
            cam.x = lerp(cam.x, W / 2, easeIO(lp)); cam.y = lerp(cam.y, H * 0.5, easeIO(lp)); cam.z = lerp(3.5, 1.0, easeIO(lp));
          }
          if (p < 1.25) requestAnimationFrame(track);
          else { beamReady = false; chosenStar.phase = 'shrink'; chosenStar.animProg = 0; resolve(); }
        }
        requestAnimationFrame(track);
      });
      if (cancelledRef.current) return;

      // 7. Beam impact shockwave + fireworks + destiny stars fall to card positions
      beamImpactTime = getT();
      cardsActive = true;
      // Fire element: triple-wave firework burst at beam impact
      launchFirework(W / 2, H * 0.5, 120, [
        { r: 255, g: 215, b: 0 }, { r: 255, g: 170, b: 0 }, { r: 255, g: 69, b: 0 },
        { r: 255, g: 240, b: 180 }, { r: 255, g: 100, b: 30 },
      ]);
      const fw2 = window.setTimeout(() => launchFirework(W / 2, H * 0.5, 80, [
        { r: 255, g: 200, b: 60 }, { r: 255, g: 120, b: 40 }, { r: 255, g: 255, b: 255 },
      ]), 150);
      timers.push(fw2);
      const fw3 = window.setTimeout(() => launchFirework(W / 2, H * 0.5, 60, [
        { r: 255, g: 255, b: 240 }, { r: 200, g: 160, b: 255 }, { r: 255, g: 180, b: 80 },
      ]), 350);
      timers.push(fw3);
      await safeSleep(300);
      if (cancelledRef.current) return;

      // Launch each destiny star as a falling trail to its card position
      const fallT = getT();
      for (let i = 0; i < cardGhosts.length; i++) {
        const ds = destinyStars[i];
        if (ds) { ds.phase = 'shrink'; ds.animProg = 0; } // star gently shrinks away
        fallingTrails.push({
          fromX: ds ? ds.x : W / 2, fromY: ds ? ds.y : H * 0.15,
          toX: cardGhosts[i].x, toY: cardGhosts[i].y,
          startT: fallT + i * 0.2, dur: 0.8, idx: i,
        });
      }
      // Wait for first trail to land (trail dur=0.8s), then birth cards in sync with arrivals
      await safeSleep(850);
      if (cancelledRef.current) return;

      for (let i = 0; i < cardGhosts.length; i++) {
        if (cancelledRef.current) return;
        birthCard(i);
        if (i < cardGhosts.length - 1) await safeSleep(300);
      }

      // 8. Quantum entanglement activates after all cards born
      await safeSleep(300);
      if (cancelledRef.current) return;
      entangleActive = true;
      entangleStart = getT();

      // 9. Destiny text fades in
      await safeSleep(400);
      if (cancelledRef.current) return;
      const textFadeStart = performance.now();
      const textFadeDur = 1200;
      await new Promise<void>(resolve => {
        function textFade() {
          if (cancelledRef.current) { resolve(); return; }
          const p = clamp01((performance.now() - textFadeStart) / textFadeDur);
          destinyTextAlpha = p;
          if (p < 1) requestAnimationFrame(textFade); else resolve();
        }
        requestAnimationFrame(textFade);
      });
      if (cancelledRef.current) return;

      // 10. Let everything settle
      await safeSleep(800);
      if (cancelledRef.current) return;

      // 11. Fade out (performance.now based, no dependency on draw loop)
      const fadeStart = performance.now();
      const fadeDur = 1000;
      await new Promise<void>(resolve => {
        function fadeLoop() {
          if (cancelledRef.current) { resolve(); return; }
          const p = clamp01((performance.now() - fadeStart) / fadeDur);
          globalAlpha = 1 - p;
          if (p < 1) requestAnimationFrame(fadeLoop);
          else resolve();
        }
        requestAnimationFrame(fadeLoop);
      });

      if (!cancelledRef.current) onCompleteRef.current();
    }

    /* ═══ Init ═══ */
    initCosmos();
    animId = requestAnimationFrame(draw);
    main();

    // Only resize canvas dimensions, don't reinitialize cosmos
    const handleResize = () => { resize(); };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelledRef.current = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      timers.forEach(id => { clearTimeout(id); clearInterval(id); });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable — uses refs for mutable props

  return (
    <div ref={wrapperRef} style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#030310' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <button
        ref={skipBtnRef}
        onClick={handleSkip}
        style={{
          position: 'absolute', bottom: 32, right: 32, zIndex: 10,
          background: 'none', border: '1px solid rgba(140,160,210,0.25)',
          borderRadius: 999, padding: '8px 20px',
          color: 'rgba(160,175,220,0.6)', fontSize: 12, letterSpacing: '0.15em',
          cursor: 'pointer', transition: 'all 0.3s', opacity: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(160,175,220,0.9)'; e.currentTarget.style.borderColor = 'rgba(140,160,210,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(160,175,220,0.6)'; e.currentTarget.style.borderColor = 'rgba(140,160,210,0.25)'; }}
      >
        跳过动画
      </button>
    </div>
  );
}

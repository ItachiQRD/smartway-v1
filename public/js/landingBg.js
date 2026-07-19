// Fond anime de la landing : scene generative dessinee au <canvas>,
// rendue frame par frame en fonction de la progression du scroll (0 → 1).
// Le scroll agit comme timeline : sol en perspective qui avance, circuit
// lumineux qui se trace, particules en parallaxe, couleurs qui evoluent.

const TAU = Math.PI * 2;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);

// Palette par etapes de scroll : bleu nuit → teal → emeraude.
const PALETTE = [
  { top: [5, 14, 28], mid: [10, 32, 50], bot: [7, 20, 36], accent: [56, 189, 248], glow: [14, 159, 110] },
  { top: [4, 22, 32], mid: [8, 44, 52], bot: [6, 28, 35], accent: [45, 212, 191], glow: [16, 185, 129] },
  { top: [3, 24, 22], mid: [7, 48, 40], bot: [5, 30, 26], accent: [74, 222, 128], glow: [20, 200, 120] },
];

function mixColor(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}

function samplePalette(p) {
  const pos = clamp(p) * (PALETTE.length - 1);
  const i = Math.min(Math.floor(pos), PALETTE.length - 2);
  const t = smooth(pos - i);
  const a = PALETTE[i];
  const b = PALETTE[i + 1];
  return {
    top: mixColor(a.top, b.top, t),
    mid: mixColor(a.mid, b.mid, t),
    bot: mixColor(a.bot, b.bot, t),
    accent: mixColor(a.accent, b.accent, t),
    glow: mixColor(a.glow, b.glow, t),
  };
}

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Pseudo-aleatoire deterministe (fond identique a chaque visite).
function seeded(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Circuits "rayons de magasin" en coordonnees normalisees, traces au scroll.
const THREADS = [
  {
    start: 0.02,
    end: 0.4,
    width: 2.2,
    pts: [[-0.04, 0.88], [0.14, 0.88], [0.14, 0.46], [0.34, 0.46], [0.34, 0.72], [0.55, 0.72], [0.55, 0.4], [0.8, 0.4]],
  },
  {
    start: 0.28,
    end: 0.68,
    width: 1.6,
    pts: [[1.04, 0.3], [0.82, 0.3], [0.82, 0.62], [0.6, 0.62], [0.6, 0.88], [0.36, 0.88], [0.36, 0.58], [0.18, 0.58]],
  },
  {
    start: 0.55,
    end: 0.96,
    width: 2.6,
    pts: [[-0.04, 0.52], [0.22, 0.52], [0.22, 0.78], [0.48, 0.78], [0.48, 0.5], [0.72, 0.5], [0.72, 0.82], [1.04, 0.82]],
  },
];

const PARTICLE_COUNT = 80;

export function createScrollBackground(canvas, { reduce = false } = {}) {
  const ctx = canvas.getContext("2d");
  let W = 0;
  let H = 0;
  let raf = 0;
  let target = 0;
  let current = 0;
  const t0 = performance.now();

  // Particules : position de base, profondeur (parallaxe) et scintillement.
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: seeded(i * 3 + 1),
    y: seeded(i * 3 + 2),
    depth: 0.25 + seeded(i * 3 + 3) * 0.75,
    r: 0.6 + seeded(i * 7 + 4) * 1.6,
    tw: seeded(i * 11 + 5) * TAU,
  }));

  // Points pixel + longueurs cumulees de chaque circuit (recalcules au resize).
  let threads = [];

  function buildThreads() {
    threads = THREADS.map((th) => {
      const pts = th.pts.map(([x, y]) => [x * W, y * H]);
      let total = 0;
      const segs = [];
      for (let i = 1; i < pts.length; i++) {
        const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        segs.push(d);
        total += d;
      }
      return { ...th, pts, segs, total };
    });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildThreads();
    render(current, reduce ? 0 : (performance.now() - t0) / 1000);
  }

  // --- Couches de la scene ---

  function drawSky(pal) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(pal.top, 1));
    g.addColorStop(0.55, rgba(pal.mid, 1));
    g.addColorStop(1, rgba(pal.bot, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawOrbs(pal, p, time) {
    ctx.globalCompositeOperation = "lighter";
    const orbs = [
      { x: lerp(0.85, 0.15, p) * W, y: lerp(0.08, 0.55, p) * H + Math.sin(time * 0.4) * 14, r: W * 0.38, c: pal.glow, a: 0.16 },
      { x: lerp(0.08, 0.9, p) * W, y: lerp(0.9, 0.25, p) * H + Math.cos(time * 0.33) * 16, r: W * 0.32, c: pal.accent, a: 0.12 },
    ];
    for (const o of orbs) {
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, rgba(o.c, o.a));
      g.addColorStop(1, rgba(o.c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // Sol de magasin en perspective : les lignes avancent avec le scroll.
  function drawFloor(pal, p, time) {
    const horizon = H * 0.42;
    const vpX = W * (0.5 + (p - 0.5) * 0.14);
    const rows = 22;
    const travel = p * 16 + time * 0.4;

    ctx.lineWidth = 1;
    for (let k = 1; k <= rows; k++) {
      const z = k - (travel % 1);
      if (z <= 0.08) continue;
      const y = horizon + (H - horizon) / z;
      if (y > H + 40 || y < horizon) continue;
      const fade = clamp(1 - z / rows);
      ctx.strokeStyle = rgba(pal.accent, 0.028 + fade * 0.075);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const cols = 9;
    for (let j = -cols; j <= cols; j++) {
      const xB = vpX + (j / cols) * W * 1.25;
      ctx.strokeStyle = rgba(pal.accent, 0.05);
      ctx.beginPath();
      ctx.moveTo(lerp(vpX, xB, 0.04), horizon + 1);
      ctx.lineTo(xB, H);
      ctx.stroke();
    }

    // Lueur d'horizon qui s'intensifie avec la progression.
    const hg = ctx.createLinearGradient(0, horizon - 60, 0, horizon + 90);
    hg.addColorStop(0, rgba(pal.glow, 0));
    hg.addColorStop(0.5, rgba(pal.glow, 0.05 + p * 0.09));
    hg.addColorStop(1, rgba(pal.glow, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizon - 60, W, 150);
  }

  function drawParticles(pal, p, time) {
    for (const pt of particles) {
      // Parallaxe : monte avec le scroll selon la profondeur, derive douce avec le temps.
      const y = (((pt.y - p * pt.depth * 0.6 + Math.sin(time * 0.12 + pt.tw) * 0.012) % 1) + 1) % 1;
      const x = (((pt.x + Math.cos(time * 0.09 + pt.tw) * 0.008) % 1) + 1) % 1;
      const twinkle = 0.35 + 0.3 * Math.sin(time * 0.8 + pt.tw);
      ctx.fillStyle = rgba(pal.accent, twinkle * pt.depth * 0.5);
      ctx.beginPath();
      ctx.arc(x * W, y * H, pt.r * pt.depth, 0, TAU);
      ctx.fill();
    }
  }

  // Trace progressif d'un circuit + tete lumineuse (le "client" qui avance).
  function drawThread(th, pal, p) {
    const local = smooth(clamp((p - th.start) / (th.end - th.start)));
    if (local <= 0) return;
    const drawn = th.total * local;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (const pass of [
      { width: th.width * 4.5, alpha: 0.08 },
      { width: th.width, alpha: 0.55 },
    ]) {
      ctx.strokeStyle = rgba(pal.glow, pass.alpha * (0.4 + local * 0.6));
      ctx.lineWidth = pass.width;
      ctx.beginPath();
      ctx.moveTo(th.pts[0][0], th.pts[0][1]);
      let rest = drawn;
      let head = th.pts[0];
      for (let i = 0; i < th.segs.length && rest > 0; i++) {
        const [x1, y1] = th.pts[i];
        const [x2, y2] = th.pts[i + 1];
        if (rest >= th.segs[i]) {
          ctx.lineTo(x2, y2);
          head = th.pts[i + 1];
        } else {
          const t = rest / th.segs[i];
          head = [lerp(x1, x2, t), lerp(y1, y2, t)];
          ctx.lineTo(head[0], head[1]);
        }
        rest -= th.segs[i];
      }
      ctx.stroke();
      th._head = head;
    }

    if (local < 1 && th._head) {
      const [hx, hy] = th._head;
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26);
      g.addColorStop(0, rgba(pal.glow, 0.8));
      g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(hx - 26, hy - 26, 52, 52);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#eafff5";
      ctx.beginPath();
      ctx.arc(hx, hy, th.width + 1, 0, TAU);
      ctx.fill();
    }
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(2,8,16,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Une frame complete = f(progression, temps).
  function render(p, time) {
    const pal = samplePalette(p);
    drawSky(pal);
    drawOrbs(pal, p, time);
    drawFloor(pal, p, time);
    drawParticles(pal, p, time);
    for (const th of threads) drawThread(th, pal, p);
    drawVignette();
  }

  function frame(now) {
    // Lissage : le rendu "rattrape" la cible pour un scrub fluide.
    current += (target - current) * 0.09;
    if (Math.abs(target - current) < 0.0004) current = target;
    render(current, (now - t0) / 1000);
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  if (!reduce) raf = requestAnimationFrame(frame);

  return {
    setProgress(p) {
      target = clamp(p);
      if (reduce) {
        current = target;
        render(current, 0);
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    },
  };
}

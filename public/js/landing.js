// SmartWay - Landing immersive "scroll-telling" (inspiration GTA VI) :
// hero epingle anime au scroll, sections revelees, et apercu du circuit
// dans un mockup de telephone ou le parcours se trace au fil du scroll.

import { h } from "./ui.js";

// Icones SVG (trait uniforme) : plus nettes et coherentes que des emojis.
const ICONS = {
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M3 3h2.2l2.4 12.2a1.4 1.4 0 0 0 1.4 1.1h7.9a1.4 1.4 0 0 0 1.4-1.1L20 7H6"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8.2 12 3 3 8.2v7.6L12 21l9-5.2z"/><path d="M3 8.2 12 13l9-4.8M12 13v8"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16h16"/><path d="m7.5 14.5 4-4 3 3 5-6"/></svg>`,
  route: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/></svg>`,
  scan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h.5M11 12h2.5M17 12h.5"/></svg>`,
  help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8 8 0 0 1-8 8c-1.2 0-2.3-.2-3.3-.7L4 20l1.2-4.2A8 8 0 1 1 21 11.5z"/><path d="M10.2 9.6a2 2 0 0 1 3.9.6c0 1.3-1.9 1.6-1.9 2.7"/><path d="M12.2 15.8h.01"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>`,
  heatmap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" fill="currentColor" opacity="0.28" stroke="none"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" fill="currentColor" opacity="0.6" stroke="none"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg>`,
};

// Mini-illustration pour la carte "Pilotage temps reel".
function miniKpiSvg() {
  const heights = [34, 52, 42, 66, 50, 78, 60];
  const bars = heights
    .map((hh, i) => `<rect class="mf-bar" x="${22 + i * 32}" y="${104 - hh}" width="16" height="${hh}" rx="4"/>`)
    .join("");
  return `<svg viewBox="0 0 260 120" fill="none" preserveAspectRatio="xMidYMid meet">
    ${bars}
    <path class="mf-line" d="M30 78 L62 60 L94 68 L126 46 L158 58 L190 32 L222 46"/>
    <circle class="mf-dot" cx="190" cy="32" r="4"/>
  </svg>`;
}

const STOPS = [
  { frac: 0.1, n: 1, rayon: "Fruits & Legumes", aisle: "Allee A" },
  { frac: 0.3, n: 2, rayon: "Cremerie & Frais", aisle: "Allee B" },
  { frac: 0.52, n: 3, rayon: "Epicerie salee", aisle: "Allee C" },
  { frac: 0.72, n: 4, rayon: "Boissons", aisle: "Allee D" },
  { frac: 0.99, n: 5, rayon: "Caisse rapide", aisle: "Scan & Go" },
];

const ROUTE_D =
  "M40,590 L40,180 L105,180 L105,555 L175,555 L175,180 L245,180 L245,555 L305,555 L305,610 L200,610";

function shelfRects() {
  const cols = [70, 140, 210, 280];
  let rects = "";
  for (const cx of cols) {
    rects += `<rect class="lp-shelf" x="${cx - 17}" y="175" width="34" height="120" rx="6"/>`;
    rects += `<rect class="lp-shelf" x="${cx - 17}" y="330" width="34" height="150" rx="6"/>`;
  }
  return rects;
}

function checkoutRects() {
  const xs = [60, 120, 180, 240];
  let r = xs
    .map((x) => `<rect class="lp-checkout" x="${x - 14}" y="600" width="28" height="22" rx="5"/>`)
    .join("");
  r += `<rect class="lp-scango" x="${290 - 14}" y="600" width="28" height="22" rx="5"/>`;
  return r;
}

export function mountLanding(root, { onSelectRole, onStartDemo, onStartGuided }) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const view = h(`
    <div class="lp">
      <div class="lp-progress" id="lp-progress"></div>
      <div class="lp-bg" id="lp-bg">
        <div class="lp-bg-img" data-bg="aisle" style="background-image:url('img/landing/aisle-blur.png')"></div>
        <div class="lp-bg-img" data-bg="cart" style="background-image:url('img/landing/cart-spotlight.png')"></div>
        <div class="lp-bg-img" data-bg="route" style="background-image:url('img/landing/route-plan.png')"></div>
        <div class="lp-bg-img" data-bg="aerial" style="background-image:url('img/landing/store-aerial.png')"></div>
        <div class="lp-bg-scrim"></div>
      </div>

      <nav class="lp-nav" id="lp-nav">
        <div class="logo"><span class="logo-mark">S</span> SmartWay</div>
        <button class="btn btn-primary btn-sm" id="lp-cta-top">Essayer la demo</button>
        <button class="btn btn-ghost btn-sm lp-cta-guided" id="lp-cta-guided">▶ Presentation guidee</button>
      </nav>

      <!-- HERO -->
      <section class="lp-scene lp-hero-scene">
        <div class="lp-hero" id="lp-hero">
          <div class="lp-hero-inner">
            <span class="lp-eyebrow">RetailTech · Experience V1</span>
            <h1 class="lp-title">SMART<span class="lp-title-accent">WAY</span></h1>
            <p class="lp-tagline">Le magasin intelligent, pour tous ses acteurs.</p>
            <p class="lp-slogan">« Chaque pas compte. »</p>
            <div class="lp-hero-profiles">
              <button class="lp-prof client" data-role="client"><span class="lp-prof-ico">${ICONS.cart}</span><b>Client</b><small>Gagner du temps</small></button>
              <button class="lp-prof collaborateur" data-role="collaborateur"><span class="lp-prof-ico">${ICONS.box}</span><b>Collaborateur</b><small>Gagner en efficacite</small></button>
              <button class="lp-prof manager" data-role="manager"><span class="lp-prof-ico">${ICONS.chart}</span><b>Manager</b><small>Piloter le magasin</small></button>
            </div>
          </div>
          <button class="lp-scroll-hint" id="lp-hint" aria-label="Defiler vers le bas">
            <span class="lp-mouse"><span class="lp-wheel"></span></span>
            <span class="lp-hint-txt">Decouvrir l'experience</span>
          </button>
        </div>
      </section>

      <!-- STATEMENTS (le fond plein ecran illustre chaque message) -->
      <section class="lp-scene lp-statements" id="lp-statements">
        <div class="lp-statement reveal">
          <div class="lp-stat-txt"><span class="lp-stat-num">−30%</span><h2>de temps perdu en magasin</h2><p>Le bon produit, le bon chemin, la bonne caisse — sans hesiter.</p></div>
        </div>
        <div class="lp-statement reveal" data-align="right">
          <div class="lp-stat-txt"><span class="lp-stat-num">+1</span><h2>collaborateur augmente</h2><p>Demandes clients, ruptures et reassorts priorises en temps reel.</p></div>
        </div>
        <div class="lp-statement reveal">
          <div class="lp-stat-txt"><span class="lp-stat-num">360°</span><h2>de vision pour le manager</h2><p>Frequentation, performance des rayons et heatmap des flux.</p></div>
        </div>
      </section>

      <!-- CIRCUIT (pinned, route drawn on scroll) -->
      <section class="lp-scene lp-circuit" id="lp-circuit">
        <div class="lp-circuit-stage">
          <div class="lp-circuit-copy">
            <span class="lp-eyebrow">Le circuit, dans votre poche</span>
            <h2>Suivez le <span class="lp-title-accent">chemin le plus court</span>.</h2>
            <p>Votre liste devient un parcours optimise. SmartWay trace l'itineraire, arret par arret, jusqu'a la caisse la plus rapide.</p>
            <div class="lp-circuit-kpis">
              <div><b id="lp-eta">12</b><span>min estimees</span></div>
              <div><b id="lp-count">0/5</b><span>arrets</span></div>
              <div><b id="lp-dist">320</b><span>m</span></div>
            </div>
          </div>

          <div class="lp-phone">
            <div class="lp-phone-notch"></div>
            <div class="lp-phone-screen">
              <div class="lp-app-bar"><span class="logo-mark sm">S</span><div><b>Mon parcours</b><small id="lp-next">Direction Fruits &amp; Legumes</small></div><span class="lp-app-eta" id="lp-app-eta">12 min</span></div>
              <svg class="lp-map" viewBox="0 0 340 660" preserveAspectRatio="xMidYMid meet">
                <rect x="0" y="0" width="340" height="660" rx="18" class="lp-floor"/>
                ${shelfRects()}
                ${checkoutRects()}
                <circle cx="40" cy="590" r="11" class="lp-entrance"/>
                <text x="40" y="594" class="lp-entrance-t">IN</text>
                <path id="lp-route" d="${ROUTE_D}" class="lp-route"/>
                <g id="lp-stops"></g>
                <circle id="lp-shopper" class="lp-shopper" r="9" cx="40" cy="590"/>
              </svg>
              <div class="lp-app-foot" id="lp-foot">Prochain arret : <b>Fruits &amp; Legumes</b></div>
            </div>
          </div>

          <div class="lp-circuit-steps" id="lp-steps">
            ${STOPS.map((s) => `<div class="lp-step" data-n="${s.n}"><span class="lp-step-num">${s.n}</span><div><b>${s.rayon}</b><small>${s.aisle}</small></div></div>`).join("")}
          </div>
        </div>
      </section>

      <!-- FONCTIONNALITES -->
      <section class="lp-scene lp-features">
        <span class="lp-eyebrow reveal">Sous le capot</span>
        <h2 class="lp-section-title reveal">Tout ce que SmartWay orchestre en coulisses.</h2>
        <div class="lp-feature-grid">
          <div class="lp-feature wide reveal">
            <div class="lp-feature-viz photo"><img src="img/landing/route-plan.png" alt="Plan de magasin avec itineraires lumineux" loading="lazy" /></div>
            <div class="lp-feature-body">
              <span class="f-icon">${ICONS.route}</span>
              <h3>Parcours optimise</h3>
              <p>La liste de courses devient un itineraire calcule rayon par rayon, jusqu'a la caisse la plus rapide.</p>
            </div>
          </div>
          <div class="lp-feature wide reveal">
            <div class="lp-feature-viz">${miniKpiSvg()}</div>
            <div class="lp-feature-body">
              <span class="f-icon">${ICONS.chart}</span>
              <h3>Pilotage temps reel</h3>
              <p>Frequentation, performance des rayons et heatmap des flux, rafraichis en continu pour le manager.</p>
            </div>
          </div>
          <div class="lp-feature reveal">
            <span class="f-icon">${ICONS.scan}</span>
            <h3>Scan &amp; Go</h3>
            <p>Le client scanne, paie et sort — zero file d'attente.</p>
          </div>
          <div class="lp-feature reveal">
            <span class="f-icon">${ICONS.help}</span>
            <h3>Aide en rayon</h3>
            <p>Une demande client arrive directement au collaborateur le plus proche.</p>
          </div>
          <div class="lp-feature reveal">
            <span class="f-icon">${ICONS.alert}</span>
            <h3>Alertes stock</h3>
            <p>Ruptures detectees et reassorts priorises automatiquement.</p>
          </div>
          <div class="lp-feature reveal">
            <span class="f-icon">${ICONS.heatmap}</span>
            <h3>Heatmap des flux</h3>
            <p>Les zones chaudes du magasin, visibles d'un coup d'oeil.</p>
          </div>
        </div>
      </section>

      <!-- CTA / PROFILS -->
      <section class="lp-scene profiles lp-final" id="profiles">
        <span class="lp-eyebrow reveal">A vous de jouer</span>
        <h2 class="reveal">Choisissez votre role, entrez dans le magasin.</h2>
        <p class="sub reveal">Trois espaces, une meme experience — la demo est ouverte.</p>
        <div class="profile-grid">
          <button class="profile-card client reveal" data-role="client"><div class="p-icon">${ICONS.cart}</div><h3>Client</h3><p>Je prepare ma liste, je lance mon parcours et je fais mes courses plus vite.</p><span class="enter">Entrer →</span></button>
          <button class="profile-card collaborateur reveal" data-role="collaborateur"><div class="p-icon">${ICONS.box}</div><h3>Collaborateur</h3><p>Je traite les demandes clients et je gere stocks et reassorts.</p><span class="enter">Entrer →</span></button>
          <button class="profile-card manager reveal" data-role="manager"><div class="p-icon">${ICONS.chart}</div><h3>Manager</h3><p>Je pilote l'activite, j'analyse les rayons et je suis les alertes.</p><span class="enter">Entrer →</span></button>
        </div>
        <div class="lp-footer">SmartWay · « Chaque pas compte. » · Demonstration — donnees fictives.</div>
      </section>
    </div>
  `);
  root.appendChild(view);

  // --- Wiring profils (hero + CTA final) ---
  view.querySelectorAll("[data-role]").forEach((c) =>
    c.addEventListener("click", () => onSelectRole(c.dataset.role))
  );
  view.querySelector("#lp-cta-top").addEventListener("click", () => onStartDemo?.());
  view.querySelector("#lp-cta-guided").addEventListener("click", () => onStartGuided?.());
  view.querySelector("#lp-hint").addEventListener("click", () =>
    view.querySelector("#lp-circuit").scrollIntoView({ behavior: "smooth" })
  );

  // --- Construction des arrets sur le trace ---
  const routeEl = view.querySelector("#lp-route");
  const stopsG = view.querySelector("#lp-stops");
  const shopper = view.querySelector("#lp-shopper");
  const len = routeEl.getTotalLength();
  routeEl.style.strokeDasharray = len;
  routeEl.style.strokeDashoffset = len;

  const stopEls = STOPS.map((s) => {
    const pt = routeEl.getPointAtLength(len * s.frac);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "lp-stop");
    g.innerHTML = `<circle cx="${pt.x}" cy="${pt.y}" r="13"/><text x="${pt.x}" y="${pt.y + 4}">${s.n === 5 ? "★" : s.n}</text>`;
    stopsG.appendChild(g);
    return { ...s, el: g, pt };
  });
  const stepEls = [...view.querySelectorAll(".lp-step")];

  // --- Fond photo : une image par section, fondu enchaine + lent zoom ---
  const bgImgs = new Map(
    [...view.querySelectorAll(".lp-bg-img")].map((el) => [el.dataset.bg, el])
  );
  let activeBg = null;
  function setBg(key) {
    if (key === activeBg) return;
    activeBg = key;
    bgImgs.forEach((el, k) => el.classList.toggle("on", k === key));
  }

  // --- Reveal au scroll ---
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
    { threshold: 0.25 }
  );
  view.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // --- Elements animes ---
  const nav = view.querySelector("#lp-nav");
  const hero = view.querySelector("#lp-hero");
  const heroScene = view.querySelector(".lp-hero-scene");
  const circuit = view.querySelector("#lp-circuit");
  const progressBar = view.querySelector("#lp-progress");
  const etaEl = view.querySelector("#lp-eta");
  const countEl = view.querySelector("#lp-count");
  const appEta = view.querySelector("#lp-app-eta");
  const nextEl = view.querySelector("#lp-next");
  const footEl = view.querySelector("#lp-foot");

  // Section → image de fond.
  const bgSections = [
    { el: heroScene, key: "aisle" },
    { el: view.querySelector("#lp-statements"), key: "cart" },
    { el: circuit, key: "route" },
    { el: view.querySelector(".lp-features"), key: "aerial" },
    { el: view.querySelector("#profiles"), key: "aisle" },
  ];

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  let ticking = false;

  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;
    const scrollY = window.scrollY;
    const sp = clamp(scrollY / (docH || 1));
    progressBar.style.transform = `scaleX(${sp})`;
    nav.classList.toggle("solid", scrollY > vh * 0.6);
    view.style.setProperty("--sp", sp.toFixed(4));

    // Fond : l'image correspond a la section visible (transition en CSS).
    const probe = scrollY + vh * 0.5;
    let key = "aisle";
    for (const s of bgSections) {
      if (probe >= s.el.offsetTop) key = s.key;
    }
    setBg(key);

    // Hero : zoom + fondu au scroll.
    if (!reduce) {
      const hp = clamp(scrollY / (heroScene.offsetHeight - vh || 1));
      hero.style.setProperty("--hp", hp);
    }

    // Circuit : trace du parcours selon la progression dans la scene.
    const cRect = circuit.getBoundingClientRect();
    const cTop = scrollY + cRect.top;
    const p = clamp((scrollY - cTop) / (circuit.offsetHeight - vh || 1));
    routeEl.style.strokeDashoffset = len * (1 - p);
    const pt = routeEl.getPointAtLength(len * p);
    shopper.setAttribute("cx", pt.x);
    shopper.setAttribute("cy", pt.y);

    let done = 0;
    let current = null;
    stopEls.forEach((s, i) => {
      const on = p >= s.frac;
      s.el.classList.toggle("on", on);
      stepEls[i]?.classList.toggle("on", on);
      if (on) done = s.n;
      if (!on && !current) current = s;
    });
    const eta = Math.max(0, Math.round(12 * (1 - p)));
    etaEl.textContent = eta;
    appEta.textContent = `${eta} min`;
    countEl.textContent = `${done >= 5 ? 5 : done}/5`;
    if (current) {
      nextEl.textContent = `Direction ${current.rayon}`;
      footEl.innerHTML = `Prochain arret : <b>${current.rayon}</b>`;
    } else {
      nextEl.textContent = "Parcours termine";
      footEl.innerHTML = `🎉 Caisse la plus rapide atteinte`;
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    io.disconnect();
  };
}

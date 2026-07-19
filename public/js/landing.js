// SmartWay - Landing immersive "scroll-telling" :
// hero epingle, sections revelées, circuit dans un mockup telephone.

import { h } from "./ui.js";
import { createScrollBackground } from "./landingBg.js";

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
      <div class="lp-bg" aria-hidden="true">
        <div class="lp-photo lp-photo-1"></div>
        <div class="lp-photo lp-photo-2"></div>
        <div class="lp-photo lp-photo-3"></div>
        <canvas class="lp-bg-canvas" id="lp-bg-canvas"></canvas>
        <div class="lp-scrim"></div>
      </div>

      <nav class="lp-nav" id="lp-nav">
        <div class="logo"><span class="logo-mark">S</span> SmartWay</div>
        <div class="lp-nav-actions">
          <button class="btn btn-ghost btn-sm lp-cta-guided" id="lp-cta-guided" type="button">Presentation</button>
          <button class="btn btn-primary btn-sm" id="lp-cta-top" type="button">Essayer la demo</button>
        </div>
      </nav>

      <section class="lp-scene lp-hero-scene">
        <div class="lp-hero" id="lp-hero">
          <div class="lp-hero-inner">
            <h1 class="lp-title">Smart<span class="lp-title-accent">Way</span></h1>
            <p class="lp-tagline">Le magasin intelligent, pour tous ses acteurs.</p>
            <p class="lp-slogan">Chaque pas compte.</p>
            <div class="lp-hero-profiles">
              <button class="lp-prof" data-role="client" type="button">
                <span class="lp-prof-label">Client</span>
                <span class="lp-prof-desc">Gagner du temps</span>
              </button>
              <button class="lp-prof" data-role="collaborateur" type="button">
                <span class="lp-prof-label">Collaborateur</span>
                <span class="lp-prof-desc">Gagner en efficacite</span>
              </button>
              <button class="lp-prof" data-role="manager" type="button">
                <span class="lp-prof-label">Manager</span>
                <span class="lp-prof-desc">Piloter le magasin</span>
              </button>
            </div>
          </div>
          <button class="lp-scroll-hint" id="lp-hint" type="button" aria-label="Defiler vers le bas">
            <span class="lp-mouse"><span class="lp-wheel"></span></span>
            <span class="lp-hint-txt">Decouvrir</span>
          </button>
        </div>
      </section>

      <section class="lp-scene lp-statements">
        <div class="lp-statement reveal">
          <span class="lp-stat-num">−30%</span>
          <h2>de temps perdu en magasin</h2>
          <p>Le bon produit, le bon chemin, la bonne caisse — sans hesiter.</p>
        </div>
        <div class="lp-statement reveal" data-align="right">
          <span class="lp-stat-num">+1</span>
          <h2>collaborateur augmente</h2>
          <p>Demandes clients, ruptures et reassorts priorises en temps reel.</p>
        </div>
        <div class="lp-statement reveal">
          <span class="lp-stat-num">360°</span>
          <h2>de vision pour le manager</h2>
          <p>Frequentation, performance des rayons et heatmap des flux.</p>
        </div>
      </section>

      <section class="lp-scene lp-circuit" id="lp-circuit">
        <div class="lp-circuit-stage">
          <div class="lp-circuit-copy">
            <p class="lp-kicker">Le parcours</p>
            <h2>Suivez le chemin le plus court.</h2>
            <p>Votre liste devient un parcours optimise. SmartWay trace l'itineraire, arret par arret, jusqu'a la caisse la plus rapide.</p>
            <div class="lp-circuit-kpis">
              <div><b id="lp-eta">12</b><span>min estimees</span></div>
              <div><b id="lp-count">0/5</b><span>arrets</span></div>
              <div><b id="lp-dist">320</b><span>metres</span></div>
            </div>
          </div>

          <div class="lp-phone">
            <div class="lp-phone-notch"></div>
            <div class="lp-phone-screen">
              <div class="lp-app-bar">
                <span class="logo-mark sm">S</span>
                <div><b>Mon parcours</b><small id="lp-next">Direction Fruits &amp; Legumes</small></div>
                <span class="lp-app-eta" id="lp-app-eta">12 min</span>
              </div>
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

      <section class="lp-scene lp-pillars">
        <h2 class="lp-section-title reveal">Trois espaces. Une meme plateforme.</h2>
        <p class="lp-section-sub reveal">Chaque profil voit exactement ce dont il a besoin pour agir.</p>
        <div class="lp-pillar-grid">
          <div class="lp-pillar reveal">
            <h3>Client</h3>
            <p>Liste de courses, parcours optimise, caisse recommandee et demande d'aide.</p>
          </div>
          <div class="lp-pillar reveal">
            <h3>Collaborateur</h3>
            <p>Demandes clients, alertes stock et taches de reassort priorisees.</p>
          </div>
          <div class="lp-pillar reveal">
            <h3>Manager</h3>
            <p>KPIs temps reel, performance des rayons, heatmap et alertes operationnelles.</p>
          </div>
        </div>
      </section>

      <section class="lp-scene lp-final" id="profiles">
        <h2 class="reveal">Entrez dans la demonstration</h2>
        <p class="sub reveal">Choisissez un profil pour explorer SmartWay.</p>
        <div class="profile-grid">
          <button class="profile-card reveal" data-role="client" type="button">
            <h3>Client</h3>
            <p>Je prepare ma liste, je lance mon parcours et je fais mes courses plus vite.</p>
            <span class="enter">Entrer</span>
          </button>
          <button class="profile-card reveal" data-role="collaborateur" type="button">
            <h3>Collaborateur</h3>
            <p>Je traite les demandes clients et je gere stocks et reassorts.</p>
            <span class="enter">Entrer</span>
          </button>
          <button class="profile-card reveal" data-role="manager" type="button">
            <h3>Manager</h3>
            <p>Je pilote l'activite, j'analyse les rayons et je suis les alertes.</p>
            <span class="enter">Entrer</span>
          </button>
        </div>
        <div class="lp-footer">SmartWay · Chaque pas compte. · Demonstration — donnees fictives.</div>
      </section>
    </div>
  `);
  root.appendChild(view);

  view.querySelectorAll("[data-role]").forEach((c) =>
    c.addEventListener("click", () => onSelectRole(c.dataset.role))
  );
  view.querySelector("#lp-cta-top").addEventListener("click", () => onStartDemo?.());
  view.querySelector("#lp-cta-guided").addEventListener("click", () => onStartGuided?.());
  view.querySelector("#lp-hint").addEventListener("click", () =>
    view.querySelector("#lp-circuit").scrollIntoView({ behavior: "smooth" })
  );

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

  const bg = createScrollBackground(view.querySelector("#lp-bg-canvas"), { reduce });

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
    { threshold: 0.25 }
  );
  view.querySelectorAll(".reveal").forEach((el) => io.observe(el));

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
  const photo1 = view.querySelector(".lp-photo-1");
  const photo2 = view.querySelector(".lp-photo-2");
  const photo3 = view.querySelector(".lp-photo-3");

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  let ticking = false;

  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;
    const scrollY = window.scrollY;
    const sp = clamp(scrollY / (docH || 1));
    progressBar.style.transform = `scaleX(${sp})`;
    nav.classList.toggle("solid", scrollY > vh * 0.55);
    view.style.setProperty("--sp", sp.toFixed(4));
    bg.setProgress(sp);

    // Fond photo : fondu croise sur 3 plans selon le scroll.
    if (photo1) photo1.style.opacity = String(clamp(1 - sp * 2.2));
    if (photo2) photo2.style.opacity = String(clamp(1 - Math.abs(sp - 0.45) * 3.2));
    if (photo3) photo3.style.opacity = String(clamp((sp - 0.55) * 2.4));

    if (!reduce) {
      const hp = clamp(scrollY / (heroScene.offsetHeight - vh || 1));
      hero.style.setProperty("--hp", hp);
    }

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
      footEl.innerHTML = `Caisse la plus rapide atteinte`;
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
    bg.destroy();
  };
}

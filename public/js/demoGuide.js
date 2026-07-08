// Parcours de demonstration guide (~90 s) : client → collaborateur → manager.
// Panneau flottant non bloquant : l'application reste entierement visible.

import { api } from "./api.js";
import { h, toast } from "./ui.js";
import { state, addToCart, setRoute, markRouteProgress } from "./state.js";

const DEMO_PRODUCT_IDS = [9, 5, 19, 11]; // Lait, Baguette, Penne, Yaourt

const STEPS = [
  { id: "intro", title: "Bienvenue", text: "SmartWay en 90 secondes : temps gagne cote client, efficacite collaborateur, pilotage manager." },
  { id: "client-cart", title: "Liste prete", text: "Alex prepare sa liste avec des produits en promo. SmartWay estime budget et parcours." },
  { id: "client-route", title: "Parcours optimise", text: "Le plan du magasin trace l'itineraire le plus court, arret par arret." },
  { id: "client-help", title: "Demande d'aide", text: "Un produit introuvable ? Un collaborateur est alerte en temps reel." },
  { id: "staff", title: "Espace collaborateur", text: "Sophie voit la demande, accepte et cloture l'intervention." },
  { id: "manager", title: "Espace manager", text: "Lea pilote l'activite : frequentation, files caisse, heatmap des flux." },
  { id: "done", title: "Demo terminee", text: "Explorez librement les 3 espaces via les boutons en haut." },
];

export function createGuidedDemo(callbacks) {
  let dock = null;
  let progressBar = null;
  let running = false;
  let aborted = false;
  let helpId = null;
  let collapsed = false;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitForPage(role, pageKey, tries = 40) {
    for (let i = 0; i < tries; i++) {
      const hash = location.hash.replace(/^#/, "");
      if (hash === `${role}/${pageKey}`) return true;
      await wait(120);
    }
    return false;
  }

  function updateProgressBar(index) {
    if (!progressBar) return;
    const pct = ((index + 1) / STEPS.length) * 100;
    progressBar.style.width = `${pct}%`;
  }

  function showStep(index, extra = "") {
    const step = STEPS[index];
    if (!dock) return;
    dock.querySelector("#guide-title").textContent = step.title;
    dock.querySelector("#guide-text").textContent = step.text + (extra ? ` ${extra}` : "");
    dock.querySelectorAll(".guide-dot").forEach((d, i) => {
      d.classList.toggle("active", i === index);
      d.classList.toggle("done", i < index);
    });
    dock.querySelector("#guide-progress").textContent = `${index + 1}/${STEPS.length}`;
    const miniProg = dock.querySelector("#guide-progress-mini");
    if (miniProg) miniProg.textContent = `${index + 1}/${STEPS.length}`;
    dock.querySelector("#guide-mini-label").textContent = step.title;
    updateProgressBar(index);
  }

  function setCollapsed(value) {
    collapsed = value;
    document.body.classList.toggle("guide-collapsed", collapsed);
    dock?.querySelector("#guide-toggle")?.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function mountDock() {
    progressBar = h(`<div class="guide-progress-track" aria-hidden="true"><div class="guide-progress-fill"></div></div>`);
    document.body.appendChild(progressBar);
    progressBar = progressBar.querySelector(".guide-progress-fill");

    dock = h(`
      <div class="guide-dock" id="guide-dock" role="complementary" aria-label="Mode presentation">
        <div class="guide-dock-panel">
          <div class="guide-dock-head">
            <span class="guide-badge">Presentation</span>
            <span id="guide-progress" class="guide-step-count">1/${STEPS.length}</span>
            <button type="button" class="guide-icon-btn" id="guide-toggle" aria-expanded="true" title="Reduire">—</button>
            <button type="button" class="guide-icon-btn" id="guide-close" title="Quitter">✕</button>
          </div>
          <div class="guide-dock-body">
            <div class="guide-dots">${STEPS.map((_, i) => `<i class="guide-dot ${i === 0 ? "active" : ""}"></i>`).join("")}</div>
            <h2 id="guide-title">${STEPS[0].title}</h2>
            <p id="guide-text">${STEPS[0].text}</p>
            <div class="guide-actions">
              <button class="btn btn-ghost btn-sm" id="guide-skip" type="button">Passer</button>
              <button class="btn btn-primary btn-sm" id="guide-next" type="button">Continuer</button>
            </div>
          </div>
          <button type="button" class="guide-dock-mini" id="guide-expand">
            <span class="guide-badge">Demo</span>
            <span id="guide-mini-label">${STEPS[0].title}</span>
            <span id="guide-progress-mini" class="guide-step-count">1/${STEPS.length}</span>
          </button>
        </div>
      </div>
    `);
    document.body.appendChild(dock);

    dock.querySelector("#guide-close").addEventListener("click", () => stop(true));
    dock.querySelector("#guide-skip").addEventListener("click", () => stop(true));
    dock.querySelector("#guide-toggle").addEventListener("click", () => setCollapsed(true));
    dock.querySelector("#guide-expand").addEventListener("click", () => setCollapsed(false));
    dock.querySelector("#guide-next").addEventListener("click", () => {
      dock.querySelector("#guide-next").disabled = true;
      runFromCurrent().finally(() => {
        if (dock) dock.querySelector("#guide-next").disabled = false;
      });
    });
  }

  function unmountDock() {
    dock?.remove();
    dock = null;
    document.querySelector(".guide-progress-track")?.remove();
    progressBar = null;
    document.body.classList.remove("guide-collapsed");
  }

  function stop(skipped = false) {
    aborted = true;
    running = false;
    unmountDock();
    document.body.classList.remove("guide-running");
    if (skipped) toast("Presentation interrompue — exploration libre");
    callbacks.onEnd?.(skipped);
  }

  let stepIndex = 0;

  async function runFromCurrent() {
    if (!running || aborted) return;
    if (stepIndex >= STEPS.length - 1) {
      showStep(STEPS.length - 1);
      await wait(900);
      stop(false);
      toast("Presentation terminee — explorez les 3 espaces");
      return;
    }
    stepIndex += 1;
    showStep(stepIndex);
    setCollapsed(false);
    await runStep(STEPS[stepIndex].id);
    if (!aborted) dock.querySelector("#guide-next")?.focus();
  }

  async function runStep(id) {
    switch (id) {
      case "client-cart": {
        await callbacks.ensureRole("client");
        await waitForPage("client", "home");
        state.cart.clear();
        for (const pid of DEMO_PRODUCT_IDS) {
          const p = await api.product(pid);
          addToCart(p);
        }
        callbacks.refreshNav?.();
        await callbacks.navigate("list");
        await waitForPage("client", "list");
        await wait(1100);
        break;
      }
      case "client-route": {
        const route = await api.route(DEMO_PRODUCT_IDS);
        setRoute(route);
        await callbacks.navigate("parcours");
        await waitForPage("client", "parcours");
        await wait(600);
        const stops = route.stops.slice(0, 2);
        for (const s of stops) {
          markRouteProgress(s.id);
          callbacks.refreshPage?.();
          await wait(700);
        }
        await wait(600);
        break;
      }
      case "client-help": {
        const productId = DEMO_PRODUCT_IDS[0];
        state.helpProductId = productId;
        const created = await api.createHelp({
          productId,
          urgence: "Normale",
          message: "Demo SmartWay — besoin d'aide pour localiser le produit",
        });
        helpId = created.id;
        await callbacks.navigate("aide");
        await waitForPage("client", "aide");
        await wait(1000);
        break;
      }
      case "staff": {
        await callbacks.switchRole("collaborateur");
        await waitForPage("collaborateur", "dashboard");
        await wait(700);
        await callbacks.navigate("demandes");
        await waitForPage("collaborateur", "demandes");
        await wait(800);
        if (helpId) {
          await api.helpStatus(helpId, { status: "Acceptee" });
          callbacks.refreshPage?.();
          await wait(500);
          await api.helpStatus(helpId, { status: "En cours" });
          callbacks.refreshPage?.();
          await wait(500);
          await api.helpStatus(helpId, { status: "Cloturee", comment: "Produit trouve — demo SmartWay" });
          callbacks.refreshPage?.();
        }
        await wait(900);
        break;
      }
      case "manager": {
        await callbacks.switchRole("manager");
        await waitForPage("manager", "dashboard");
        await wait(1000);
        await callbacks.navigate("heatmap");
        await waitForPage("manager", "heatmap");
        await wait(1100);
        break;
      }
      case "done":
        break;
      default:
        break;
    }
  }

  async function start() {
    if (running) return;
    aborted = false;
    running = true;
    stepIndex = 0;
    collapsed = false;
    document.body.classList.add("guide-running");
    try {
      await api.demoReset();
    } catch {
      /* ignore */
    }
    mountDock();
    showStep(0);
    await callbacks.ensureRole("client");
    await waitForPage("client", "home");
  }

  return { start, stop, isRunning: () => running };
}

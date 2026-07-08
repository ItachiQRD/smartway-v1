// Parcours de demonstration guide (~90 s) : client → collaborateur → manager.

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
  { id: "done", title: "Demo terminee", text: "Vous pouvez explorer librement les 3 espaces via les boutons en haut." },
];

export function createGuidedDemo(callbacks) {
  let overlay = null;
  let running = false;
  let aborted = false;
  let helpId = null;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitForPage(role, pageKey, tries = 30) {
    for (let i = 0; i < tries; i++) {
      const hash = location.hash.replace(/^#/, "");
      if (hash === `${role}/${pageKey}`) return true;
      await wait(120);
    }
    return false;
  }

  function showStep(index, extra = "") {
    const step = STEPS[index];
    if (!overlay) return;
    overlay.querySelector("#guide-title").textContent = step.title;
    overlay.querySelector("#guide-text").textContent = step.text + (extra ? ` ${extra}` : "");
    overlay.querySelectorAll(".guide-dot").forEach((d, i) => {
      d.classList.toggle("active", i === index);
      d.classList.toggle("done", i < index);
    });
    overlay.querySelector("#guide-progress").textContent = `Etape ${index + 1} / ${STEPS.length}`;
  }

  function mountOverlay() {
    overlay = h(`
      <div class="guide-overlay" id="guide-overlay">
        <div class="guide-card">
          <div class="guide-top">
            <span class="guide-badge">Mode presentation</span>
            <span id="guide-progress" class="guide-step-count">Etape 1 / ${STEPS.length}</span>
          </div>
          <div class="guide-dots">${STEPS.map((_, i) => `<i class="guide-dot ${i === 0 ? "active" : ""}"></i>`).join("")}</div>
          <h2 id="guide-title">${STEPS[0].title}</h2>
          <p id="guide-text">${STEPS[0].text}</p>
          <div class="guide-actions">
            <button class="btn btn-ghost btn-sm" id="guide-skip">Passer</button>
            <button class="btn btn-primary btn-sm" id="guide-next">Continuer</button>
          </div>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);
    overlay.querySelector("#guide-skip").addEventListener("click", () => stop(true));
    overlay.querySelector("#guide-next").addEventListener("click", () => {
      overlay.querySelector("#guide-next").disabled = true;
      runFromCurrent().finally(() => {
        if (overlay) overlay.querySelector("#guide-next").disabled = false;
      });
    });
    return overlay;
  }

  function unmountOverlay() {
    overlay?.remove();
    overlay = null;
  }

  function stop(skipped = false) {
    aborted = true;
    running = false;
    unmountOverlay();
    document.body.classList.remove("guide-running");
    if (skipped) toast("Presentation interrompue — exploration libre");
    callbacks.onEnd?.(skipped);
  }

  let stepIndex = 0;

  async function runFromCurrent() {
    if (!running || aborted) return;
    if (stepIndex >= STEPS.length - 1) {
      showStep(STEPS.length - 1);
      await wait(1200);
      stop(false);
      toast("Presentation terminee — explorez les 3 espaces");
      return;
    }
    stepIndex += 1;
    showStep(stepIndex);
    await runStep(STEPS[stepIndex].id);
    if (!aborted) overlay.querySelector("#guide-next").focus();
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
        await wait(700);
        break;
      }
      case "client-route": {
        const route = await api.route(DEMO_PRODUCT_IDS);
        setRoute(route);
        await callbacks.navigate("parcours");
        await waitForPage("client", "parcours");
        await wait(500);
        const stops = route.stops.slice(0, 2);
        for (const s of stops) {
          markRouteProgress(s.id);
          await wait(450);
        }
        callbacks.refreshPage?.();
        await wait(500);
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
        await wait(700);
        break;
      }
      case "staff": {
        await callbacks.switchRole("collaborateur");
        await waitForPage("collaborateur", "demandes");
        await callbacks.navigate("demandes");
        await waitForPage("collaborateur", "demandes");
        await wait(600);
        if (helpId) {
          await api.helpStatus(helpId, { status: "Acceptee" });
          await wait(350);
          await api.helpStatus(helpId, { status: "En cours" });
          await wait(350);
          await api.helpStatus(helpId, { status: "Cloturee", comment: "Produit trouve — demo SmartWay" });
          callbacks.refreshPage?.();
        }
        await wait(700);
        break;
      }
      case "manager": {
        await callbacks.switchRole("manager");
        await waitForPage("manager", "dashboard");
        await wait(800);
        await callbacks.navigate("heatmap");
        await waitForPage("manager", "heatmap");
        await wait(900);
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
    document.body.classList.add("guide-running");
    try {
      await api.demoReset();
    } catch {
      /* ignore */
    }
    mountOverlay();
    showStep(0);
    await callbacks.ensureRole("client");
    await waitForPage("client", "home");
  }

  return { start, stop, isRunning: () => running };
}

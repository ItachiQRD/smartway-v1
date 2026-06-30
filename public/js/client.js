// Espace CLIENT : accueil, recherche, detail produit, liste de courses,
// parcours optimise, panier, caisses, demande d'aide.

import { api } from "./api.js";
import { h, money, fmtTime, toast, escapeHtml, statusClass } from "./ui.js";
import {
  state,
  cartItems,
  cartCount,
  cartTotal,
  cartSavings,
  addToCart,
  setQty,
  removeFromCart,
  replaceInCart,
} from "./state.js";
import { drawStore } from "./map.js";

function statusTag(p) {
  if (p.status === "rupture" || p.inStock === false) return `<span class="tag rupture">Rupture</span>`;
  if (p.status === "bas") return `<span class="tag bas">Stock faible</span>`;
  return `<span class="tag ok">En stock</span>`;
}

function priceHtml(p) {
  if (p.promo) {
    return `<span class="price"><span class="old">${money(p.promo.oldPrice)}</span>${money(p.price)}</span>`;
  }
  return `<span class="price">${money(p.price)}</span>`;
}

function productRow(p, opts = {}) {
  const inCart = state.cart.has(p.id);
  return `
    <div class="row-item" data-product="${p.id}">
      <div class="grow" data-open="${p.id}" style="cursor:pointer">
        <div class="title">${escapeHtml(p.name)} ${p.promo ? `<span class="tag promo">-${p.promo.percent}%</span>` : ""}</div>
        <div class="meta">${escapeHtml(p.brand)} · ${escapeHtml(p.rayon)} · ${escapeHtml(p.aisle)}</div>
      </div>
      <div style="text-align:right">${priceHtml(p)}<div>${statusTag(p)}</div></div>
      ${opts.noAdd ? "" : `<button class="icon-btn" data-add="${p.id}" ${inCart ? "disabled" : ""}>+</button>`}
    </div>`;
}

// Barre d'actions de navigation (retour, liste, panier, parcours).
function actionsBar() {
  const n = cartCount();
  return `
    <div class="page-actions">
      <button class="btn btn-ghost btn-sm" data-act="back">← Retour</button>
      <span class="spacer"></span>
      <button class="btn btn-secondary btn-sm" data-act="search">🔍 Recherche</button>
      <button class="btn btn-secondary btn-sm" data-act="list">📝 Ma liste${n ? ` (${n})` : ""}</button>
      <button class="btn btn-secondary btn-sm" data-act="panier">🛒 Panier</button>
      <button class="btn btn-primary btn-sm" data-act="parcours">🧭 Parcours</button>
    </div>`;
}

function bindActions(scope, ctx) {
  scope.querySelectorAll(".page-actions [data-act]").forEach((b) =>
    b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "back") return history.length > 1 ? history.back() : ctx.navigate("home");
      if (a === "parcours") return state.route ? ctx.navigate("parcours") : launchRoute(ctx);
      ctx.navigate(a);
    })
  );
}

// ---------- ACCUEIL ----------
async function renderHome(body, ctx) {
  const promos = ctx.bootstrap?.promotions || [];
  const route = state.route;
  body.innerHTML = `
    <div class="banner green">Bonjour <strong>${escapeHtml(ctx.session.name)}</strong> 👋 — pret pour des courses plus rapides ?</div>
    <div class="grid cols-3" style="margin-bottom:18px">
      <div class="kpi"><div class="k-label">⏱️ Parcours estime</div><div class="k-value">${route ? route.estimate.totalMinutes : "—"} <span style="font-size:15px">${route ? "min" : ""}</span></div><div class="k-sub">${route ? `${route.stops.length} arrets · ${route.distanceMeters} m` : "Creez votre liste"}</div></div>
      <div class="kpi"><div class="k-label">💶 Budget estime</div><div class="k-value">${money(cartTotal())}</div><div class="k-sub">${cartCount()} article(s)</div></div>
      <div class="kpi"><div class="k-label">🏷️ Economies promos</div><div class="k-value" style="color:var(--green-700)">${money(cartSavings())}</div><div class="k-sub">${promos.length} promotions en cours</div></div>
    </div>
    <div class="grid cols-2" style="margin-bottom:18px">
      <button class="btn btn-primary" id="go-list" style="padding:18px">📝 Creer ma liste</button>
      <button class="btn btn-secondary" id="go-route" style="padding:18px">🧭 Lancer mon parcours</button>
    </div>
    <div class="card">
      <h3>Promotions du moment</h3>
      <div class="list">
        ${promos.length ? promos.map((p) => `
          <div class="row-item">
            <div class="grow"><div class="title">${escapeHtml(p.name)} <span class="tag promo">-${p.percent}%</span></div><div class="meta">${escapeHtml(p.brand)} · ${escapeHtml(p.rayon)}</div></div>
            <span class="price"><span class="old">${money(p.oldPrice)}</span>${money(p.price)}</span>
            <button class="icon-btn" data-add="${p.id}">+</button>
          </div>`).join("") : `<p class="empty">Aucune promotion.</p>`}
      </div>
    </div>`;
  body.querySelector("#go-list").addEventListener("click", () => ctx.navigate("list"));
  body.querySelector("#go-route").addEventListener("click", () => launchRoute(ctx));
  body.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", async () => {
      const p = await api.product(Number(b.dataset.add));
      addToCart(p);
      toast(`${p.name} ajoute a la liste`);
      ctx.refreshNav();
    })
  );
}

// ---------- RECHERCHE ----------
async function renderSearch(body, ctx) {
  const rayons = ctx.bootstrap?.rayons || [];
  body.innerHTML = `
    ${actionsBar()}
    <div class="card" style="margin-bottom:16px">
      <input id="q" type="search" placeholder="Rechercher un produit ou une marque (ex: lait, Danone, Coca)..." />
      <div class="chip-row" style="margin-top:12px" id="rayon-chips">
        <button class="chip active" data-rayon="">Tous</button>
        ${rayons.map((r) => `<button class="chip" data-rayon="${r.id}">${r.icon} ${escapeHtml(r.name)}</button>`).join("")}
      </div>
    </div>
    <div id="results" class="list"></div>`;
  const resultsEl = body.querySelector("#results");
  const qEl = body.querySelector("#q");
  let rayon = "";

  async function run() {
    const items = await api.products({ q: qEl.value.trim(), rayon });
    resultsEl.innerHTML = items.length
      ? items.map((p) => productRow(p)).join("")
      : `<p class="empty">Aucun produit trouve.</p>`;
    bindRows(resultsEl, ctx);
  }
  qEl.addEventListener("input", run);
  body.querySelectorAll("#rayon-chips .chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      body.querySelectorAll("#rayon-chips .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      rayon = chip.dataset.rayon;
      run();
    })
  );
  bindActions(body, ctx);
  await run();
}

function bindRows(container, ctx) {
  container.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      const p = await api.product(Number(b.dataset.add));
      addToCart(p);
      toast(`${p.name} ajoute`);
      b.disabled = true;
      ctx.refreshNav();
    })
  );
  container.querySelectorAll("[data-open]").forEach((el) =>
    el.addEventListener("click", () => {
      state.selectedProductId = Number(el.dataset.open);
      ctx.navigate("product");
    })
  );
}

// ---------- DETAIL PRODUIT ----------
async function renderProduct(body, ctx) {
  const id = state.selectedProductId;
  if (!id) {
    body.innerHTML = `<div class="banner amber">Aucun produit selectionne.</div><button class="btn btn-secondary" id="back">← Recherche</button>`;
    body.querySelector("#back").addEventListener("click", () => ctx.navigate("search"));
    return;
  }
  const p = await api.product(id);
  body.innerHTML = `
    ${actionsBar()}
    <div class="card">
      <h3>${escapeHtml(p.name)} ${p.promo ? `<span class="tag promo">-${p.promo.percent}%</span>` : ""}</h3>
      <div class="meta" style="color:var(--text-dim);margin-bottom:14px">${escapeHtml(p.brand)}</div>
      <div class="grid cols-3" style="margin-bottom:16px">
        <div class="kpi"><div class="k-label">Prix</div><div class="k-value" style="font-size:22px">${money(p.price)}</div>${p.promo ? `<div class="k-sub"><span class="old" style="text-decoration:line-through">${money(p.promo.oldPrice)}</span></div>` : ""}</div>
        <div class="kpi"><div class="k-label">Disponibilite</div><div class="k-value" style="font-size:18px">${p.inStock ? "En stock" : "Rupture"}</div><div class="k-sub">${p.stock} en rayon</div></div>
        <div class="kpi"><div class="k-label">Emplacement</div><div class="k-value" style="font-size:18px">${escapeHtml(p.aisle)}</div><div class="k-sub">${escapeHtml(p.rayon)}</div></div>
      </div>
      ${p.promo ? `<div class="banner green">${escapeHtml(p.promo.label)}</div>` : ""}
      ${p.inStock
        ? `<button class="btn btn-primary btn-block" id="add">Ajouter a ma liste</button>`
        : `<div class="banner red">Produit indisponible. Voici des alternatives :</div><div class="list" id="alts">${(p.alternatives || []).map((a) => productRow(a)).join("") || `<p class="empty">Aucune alternative.</p>`}</div>`}
    </div>`;
  bindActions(body, ctx);
  body.querySelector("#add")?.addEventListener("click", () => {
    addToCart(p);
    toast(`${p.name} ajoute a la liste`);
    ctx.refreshNav();
  });
  const alts = body.querySelector("#alts");
  if (alts) bindRows(alts, ctx);
}

// ---------- LISTE DE COURSES ----------
async function renderList(body, ctx) {
  function draw() {
    const items = cartItems();
    if (!items.length) {
      body.innerHTML = `
        <div class="card"><p class="empty">Votre liste est vide.<br/>Ajoutez des produits depuis la recherche.</p>
        <button class="btn btn-primary btn-block" id="to-search" style="margin-top:8px">🔍 Rechercher des produits</button></div>`;
      body.querySelector("#to-search").addEventListener("click", () => ctx.navigate("search"));
      return;
    }
    // Groupement par rayon.
    const byRayon = {};
    for (const it of items) (byRayon[it.product.rayon] ||= []).push(it);
    const oos = items.filter((it) => !it.product.inStock);

    body.innerHTML = `
      <div class="grid cols-3" style="margin-bottom:16px">
        <div class="kpi"><div class="k-label">Articles</div><div class="k-value">${cartCount()}</div></div>
        <div class="kpi"><div class="k-label">Total estime</div><div class="k-value" style="font-size:22px">${money(cartTotal())}</div></div>
        <div class="kpi"><div class="k-label">Rayons</div><div class="k-value">${Object.keys(byRayon).length}</div></div>
      </div>
      ${oos.length ? `<div class="banner amber">⚠ ${oos.length} produit(s) indisponible(s). Une alternative peut etre proposee.</div>` : ""}
      <div class="list" style="gap:18px">
        ${Object.entries(byRayon).map(([rayon, list]) => `
          <div class="card">
            <h3>${escapeHtml(rayon)}</h3>
            <div class="list">
              ${list.map((it) => `
                <div class="row-item ${it.product.inStock ? "" : ""}">
                  <div class="grow">
                    <div class="title">${escapeHtml(it.product.name)} ${it.product.inStock ? "" : `<span class="tag rupture">Rupture</span>`}</div>
                    <div class="meta">${escapeHtml(it.product.brand)} · ${escapeHtml(it.product.aisle)} · ${money(it.product.price)}</div>
                    ${it.product.inStock ? "" : `<button class="btn btn-secondary btn-sm" data-alt="${it.product.id}" style="margin-top:6px">Proposer une alternative</button>`}
                  </div>
                  <div class="qty"><button data-dec="${it.product.id}">−</button><span>${it.qty}</span><button data-inc="${it.product.id}">+</button></div>
                  <button class="icon-btn danger" data-del="${it.product.id}">×</button>
                </div>`).join("")}
            </div>
          </div>`).join("")}
      </div>
      <button class="btn btn-primary btn-block" id="launch" style="margin-top:18px;padding:16px">🧭 Lancer mon parcours optimise</button>`;

    body.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => { const id = Number(b.dataset.inc); setQty(id, (state.cart.get(id)?.qty || 0) + 1); draw(); ctx.refreshNav(); }));
    body.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => { const id = Number(b.dataset.dec); setQty(id, (state.cart.get(id)?.qty || 0) - 1); draw(); ctx.refreshNav(); }));
    body.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { removeFromCart(Number(b.dataset.del)); draw(); ctx.refreshNav(); }));
    body.querySelectorAll("[data-alt]").forEach((b) => b.addEventListener("click", async () => {
      const id = Number(b.dataset.alt);
      const detail = await api.product(id);
      const alt = (detail.alternatives || [])[0];
      if (alt) { replaceInCart(id, alt); toast(`Remplace par ${alt.name}`); draw(); ctx.refreshNav(); }
      else toast("Aucune alternative disponible");
    }));
    body.querySelector("#launch").addEventListener("click", () => launchRoute(ctx));
  }
  draw();
}

async function launchRoute(ctx) {
  const items = cartItems();
  if (!items.length) {
    toast("Ajoutez d'abord des produits a votre liste");
    ctx.navigate("list");
    return;
  }
  try {
    const route = await api.route(items.map((i) => i.product.id));
    state.route = route;
    state.routeProgress = new Set();
    ctx.navigate("parcours");
  } catch (err) {
    toast(err.message);
  }
}

// ---------- PARCOURS ----------
async function renderParcours(body, ctx) {
  const route = state.route;
  if (!route) {
    body.innerHTML = `${actionsBar()}<div class="card"><p class="empty">Aucun parcours actif.</p><button class="btn btn-primary btn-block" id="go" style="margin-top:8px">Creer mon parcours</button></div>`;
    body.querySelector("#go").addEventListener("click", () => ctx.navigate("list"));
    bindActions(body, ctx);
    return;
  }
  body.innerHTML = `
    ${actionsBar()}
    <div class="split grid">
      <div>
        <div class="card" id="progress-card"></div>
      </div>
      <div class="card">
        <h3>Plan du magasin</h3>
        <div class="map-wrap"><canvas class="store" id="canvas"></canvas></div>
        <div class="legend">
          <span><i class="dot" style="background:#0e9f6e"></i> Entree / valide</span>
          <span><i class="dot" style="background:#cbd5e1"></i> Rayons</span>
          <span><i class="dot" style="background:#6d28d9"></i> Caisses</span>
          <span><i class="dot" style="background:#f59e0b"></i> Arrets</span>
        </div>
      </div>
    </div>`;
  const canvas = body.querySelector("#canvas");
  const progressCard = body.querySelector("#progress-card");

  function redraw() {
    drawStore(canvas, ctx.bootstrap, route, state.routeProgress);
    const stops = route.stops;
    const doneCount = stops.filter((s) => state.routeProgress.has(s.id)).length;
    const remaining = stops.length - doneCount;
    const current = stops.find((s) => !state.routeProgress.has(s.id));
    const frac = stops.length ? remaining / stops.length : 0;
    const remainSec = route.estimate.checkoutSeconds + (route.estimate.walkSeconds + route.estimate.pickupSeconds) * frac;

    progressCard.innerHTML = `
      <h3>Mon parcours <span class="tag ok">${doneCount}/${stops.length}</span></h3>
      <div class="grid cols-2" style="margin-bottom:14px">
        <div class="kpi"><div class="k-label">⏱️ Temps restant</div><div class="k-value" style="font-size:22px">${Math.max(0, Math.round(remainSec / 60))} min</div></div>
        <div class="kpi"><div class="k-label">📍 Prochain arret</div><div class="k-value" style="font-size:16px">${current ? escapeHtml(current.rayon) : "Caisses"}</div><div class="k-sub">${current ? escapeHtml(current.aisle) : "Direction caisse"}</div></div>
      </div>
      ${current ? `<div class="banner green">Prochain produit : <strong>${escapeHtml(current.name)}</strong> (${escapeHtml(current.aisle)})</div>` : `<div class="banner green">🎉 Tous vos produits sont recuperes ! Direction la caisse.</div>`}
      <div class="steps">
        ${stops.map((s) => {
          const done = state.routeProgress.has(s.id);
          const isCurrent = current && s.id === current.id;
          return `<div class="step ${done ? "done" : ""} ${isCurrent ? "current" : ""}">
            <span class="num">${done ? "✓" : s.order}</span>
            <div class="grow"><div class="title">${escapeHtml(s.name)}</div><div class="meta">${escapeHtml(s.rayon)} · ${escapeHtml(s.aisle)} · ${money(s.price)}</div></div>
            ${!s.inStock ? `<span class="tag rupture">Rupture</span>` : ""}
          </div>`;
        }).join("")}
      </div>
      <div class="grid cols-2" style="margin-top:14px">
        <button class="btn btn-primary" id="found" ${current ? "" : "disabled"}>✓ Produit trouve</button>
        <button class="btn btn-secondary" id="skip" ${current ? "" : "disabled"}>Passer ce produit</button>
      </div>
      <button class="btn btn-ghost btn-block" id="help" style="margin-top:8px">🆘 Demander de l'aide</button>
      ${!current ? `<button class="btn btn-primary btn-block" id="to-caisses" style="margin-top:8px">💳 Voir les caisses</button>` : ""}`;

    progressCard.querySelector("#found")?.addEventListener("click", () => { if (current) { state.routeProgress.add(current.id); redraw(); } });
    progressCard.querySelector("#skip")?.addEventListener("click", () => { if (current) { state.routeProgress.add(current.id); toast(`${current.name} passe`); redraw(); } });
    progressCard.querySelector("#help")?.addEventListener("click", () => {
      if (current) state.helpProductId = current.id;
      ctx.navigate("aide");
    });
    progressCard.querySelector("#to-caisses")?.addEventListener("click", () => ctx.navigate("caisses"));
  }
  bindActions(body, ctx);
  redraw();
}

// ---------- PANIER ----------
async function renderPanier(body, ctx) {
  const items = cartItems();
  if (!items.length) {
    body.innerHTML = `${actionsBar()}<div class="card"><p class="empty">Votre panier est vide.</p><button class="btn btn-primary btn-block" id="go-search" style="margin-top:8px">🔍 Trouver des produits</button></div>`;
    body.querySelector("#go-search").addEventListener("click", () => ctx.navigate("search"));
    bindActions(body, ctx);
    return;
  }
  // Suggestions : produits en promo non presents dans le panier.
  const promos = (ctx.bootstrap?.promotions || []).filter((p) => !state.cart.has(p.id)).slice(0, 3);
  body.innerHTML = `
    ${actionsBar()}
    <div class="split grid">
      <div class="card">
        <h3>Recapitulatif</h3>
        <div class="list">
          ${items.map((it) => `
            <div class="row-item">
              <div class="grow"><div class="title">${escapeHtml(it.product.name)} ×${it.qty}</div><div class="meta">${escapeHtml(it.product.rayon)}${it.product.promo ? ` · <span style="color:var(--green-700)">promo -${it.product.promo.percent}%</span>` : ""}</div></div>
              <span class="price">${money(it.product.price * it.qty)}</span>
            </div>`).join("")}
        </div>
        <div class="summary-line"><span>Sous-total</span><span>${money(cartTotal() + cartSavings())}</span></div>
        <div class="summary-line"><span style="color:var(--green-700)">Economies promotions</span><span style="color:var(--green-700)">− ${money(cartSavings())}</span></div>
        <div class="summary-line total"><span>Total estime</span><span>${money(cartTotal())}</span></div>
        <button class="btn btn-primary btn-block" id="to-caisses" style="margin-top:14px">💳 Voir les caisses</button>
      </div>
      <div class="card">
        <h3>Suggestions pour vous</h3>
        <div class="list">
          ${promos.length ? promos.map((p) => `
            <div class="row-item"><div class="grow"><div class="title">${escapeHtml(p.name)} <span class="tag promo">-${p.percent}%</span></div><div class="meta">${escapeHtml(p.brand)}</div></div>
            <span class="price"><span class="old">${money(p.oldPrice)}</span>${money(p.price)}</span>
            <button class="icon-btn" data-add="${p.id}">+</button></div>`).join("") : `<p class="empty">Aucune suggestion.</p>`}
        </div>
      </div>
    </div>`;
  body.querySelector("#to-caisses").addEventListener("click", () => ctx.navigate("caisses"));
  bindActions(body, ctx);
  body.querySelectorAll(".card [data-add]").forEach((b) => b.addEventListener("click", async () => {
    const p = await api.product(Number(b.dataset.add));
    addToCart(p);
    toast(`${p.name} ajoute`);
    renderPanier(body, ctx);
    ctx.refreshNav();
  }));
}

// ---------- CAISSES ----------
async function renderCaisses(body, ctx) {
  const data = await api.checkouts(cartCount() || 8);
  const reco = data.recommended;
  body.innerHTML = `
    ${actionsBar()}
    ${reco ? `<div class="banner green">⚡ Caisse recommandee : <strong>${escapeHtml(reco.name)}</strong> — attente ~ ${reco.waitMin} min</div>` : ""}
    <div class="grid cols-2">
      ${data.checkouts.map((c) => `
        <div class="card" style="${reco && c.id === reco.id ? "border-color:var(--green);box-shadow:0 8px 24px rgba(14,159,110,.15)" : ""}">
          <h3>${c.type === "scango" ? "📲 " : "💳 "}${escapeHtml(c.name)} ${reco && c.id === reco.id ? `<span class="tag ok">Recommandee</span>` : ""}</h3>
          <div class="grid cols-2">
            <div class="kpi" style="box-shadow:none;border:none;padding:0"><div class="k-label">Attente estimee</div><div class="k-value" style="font-size:22px">${c.open ? c.waitMin + " min" : "Fermee"}</div></div>
            <div class="kpi" style="box-shadow:none;border:none;padding:0"><div class="k-label">File</div><div class="k-value" style="font-size:22px">${c.queueLength}</div></div>
          </div>
          ${c.type === "scango" ? `<div class="banner green" style="margin:10px 0 0">Scannez vos produits avec votre mobile et payez sans attendre.</div>` : ""}
        </div>`).join("")}
    </div>
    <button class="btn btn-primary btn-block" id="finish" style="margin-top:18px;padding:16px">✅ Finaliser mon parcours</button>`;
  bindActions(body, ctx);
  body.querySelector("#finish").addEventListener("click", () => {
    toast("🎉 Parcours finalise. Merci d'avoir utilise SmartWay !");
    state.cart.clear();
    state.route = null;
    state.routeProgress = new Set();
    ctx.refreshNav();
    ctx.navigate("home");
  });
}

// ---------- DEMANDE D'AIDE ----------
async function renderAide(body, ctx) {
  // Produits proposes : ceux de la liste, sinon recherche rapide.
  const listProducts = cartItems().map((i) => i.product);
  let options = listProducts;
  if (!options.length) options = await api.products({});
  const preselected = state.helpProductId || options[0]?.id;

  body.innerHTML = `
    <div class="split grid">
      <div class="card">
        <h3>Demander de l'aide</h3>
        <label>Produit concerne</label>
        <select id="product">
          ${options.map((p) => `<option value="${p.id}" ${p.id === preselected ? "selected" : ""}>${escapeHtml(p.name)} — ${escapeHtml(p.rayon)}</option>`).join("")}
        </select>
        <label>Niveau d'urgence</label>
        <div class="chip-row" id="urg">
          <button type="button" class="chip" data-urg="Faible">Faible</button>
          <button type="button" class="chip active" data-urg="Normale">Normale</button>
          <button type="button" class="chip" data-urg="Urgente">Urgente</button>
        </div>
        <label>Message (optionnel)</label>
        <textarea id="message" placeholder="Decrivez votre besoin..."></textarea>
        <button class="btn btn-primary btn-block" id="send" style="margin-top:16px">Envoyer la demande</button>
      </div>
      <div class="card">
        <h3>Mes demandes <span class="tag ok" id="mine-count">—</span></h3>
        <div class="list" id="mine"></div>
      </div>
    </div>`;

  let urgence = "Normale";
  body.querySelectorAll("#urg .chip").forEach((c) => c.addEventListener("click", () => {
    body.querySelectorAll("#urg .chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active");
    urgence = c.dataset.urg;
  }));

  body.querySelector("#send").addEventListener("click", async () => {
    const productId = Number(body.querySelector("#product").value);
    const message = body.querySelector("#message").value;
    try {
      await api.createHelp({ productId, message, urgence });
      toast("Demande envoyee a l'equipe");
      body.querySelector("#message").value = "";
      state.helpProductId = null;
      await loadMine();
    } catch (err) {
      toast(err.message);
    }
  });

  const mineEl = body.querySelector("#mine");
  async function loadMine() {
    const mine = await api.help();
    body.querySelector("#mine-count").textContent = mine.length;
    mineEl.innerHTML = mine.length
      ? mine.map((r) => `
        <div class="row-item">
          <div class="grow"><div class="title">${escapeHtml(r.productName)}</div><div class="meta">${escapeHtml(r.rayon)} · ${escapeHtml(r.aisle)}</div></div>
          <span class="pill ${statusClass(r.status)}">${r.status}</span>
        </div>`).join("")
      : `<p class="empty">Aucune demande pour le moment.</p>`;
  }
  await loadMine();
  const timer = setInterval(loadMine, 4000);
  return () => clearInterval(timer);
}

// ---------- MODULE ----------
export const clientModule = {
  nav: [
    { key: "home", label: "Accueil", icon: "🏠" },
    { key: "search", label: "Recherche", icon: "🔍" },
    { key: "list", label: "Ma liste", icon: "📝", badge: () => cartCount() || null },
    { key: "parcours", label: "Parcours", icon: "🧭" },
    { key: "panier", label: "Panier", icon: "🛒", badge: () => cartCount() || null },
    { key: "caisses", label: "Caisses", icon: "💳" },
    { key: "aide", label: "Demande d'aide", icon: "🆘" },
  ],
  pages: {
    home: { title: "Accueil", subtitle: "Votre visite en un coup d'oeil", render: renderHome },
    search: { title: "Recherche produit", subtitle: "Trouvez prix, stock, rayon et allee", render: renderSearch },
    product: { title: "Detail produit", subtitle: "Informations et disponibilite", render: renderProduct },
    list: { title: "Ma liste de courses", subtitle: "Organisee par rayon", render: renderList },
    parcours: { title: "Parcours optimise", subtitle: "Suivez le chemin le plus rapide", render: renderParcours },
    panier: { title: "Mon panier", subtitle: "Budget, economies et suggestions", render: renderPanier },
    caisses: { title: "Caisses", subtitle: "Choisissez la file la plus rapide", render: renderCaisses },
    aide: { title: "Demande d'aide", subtitle: "Un collaborateur vous repond", render: renderAide },
  },
};

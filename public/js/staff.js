// Espace COLLABORATEUR : dashboard, demandes clients, stocks & reassorts,
// taches, alertes operationnelles.

import { api } from "./api.js";
import { toast, escapeHtml, statusClass } from "./ui.js";

const staffStats = { openHelp: 0, ruptures: 0 };

function urgPill(u) {
  return `<span class="pill urg-${u}">${u}</span>`;
}

// ---------- DASHBOARD ----------
async function renderDashboard(body, ctx) {
  async function load() {
    const d = await api.staffDashboard();
    staffStats.openHelp = d.helpOpen.length;
    staffStats.ruptures = d.ruptures.length;
    ctx.refreshNav();
    body.innerHTML = `
      <div class="grid cols-4" style="margin-bottom:18px">
        <div class="kpi"><div class="k-label">🆘 Demandes en cours</div><div class="k-value live">${d.helpOpen.length}</div><div class="k-sub">${d.urgentCount} urgente(s)</div></div>
        <div class="kpi"><div class="k-label">🔴 Ruptures</div><div class="k-value" style="color:#b91c1c">${d.ruptures.length}</div></div>
        <div class="kpi"><div class="k-label">🟠 Stock faible</div><div class="k-value" style="color:#b45309">${d.lowStock.length}</div></div>
        <div class="kpi"><div class="k-label">📋 Taches ouvertes</div><div class="k-value">${d.openTasks.length}</div></div>
      </div>
      <div class="grid cols-2">
        <div class="card">
          <h3>Demandes clients <button class="btn btn-secondary btn-sm" id="see-help">Tout voir</button></h3>
          <div class="list">
            ${d.helpOpen.slice(0, 5).map((hreq) => `
              <div class="row-item">
                <div class="grow"><div class="title">${escapeHtml(hreq.productName)} ${urgPill(hreq.urgence)}</div><div class="meta">${escapeHtml(hreq.clientName)} · ${escapeHtml(hreq.rayon)} · ${escapeHtml(hreq.aisle)}</div></div>
                <span class="pill ${statusClass(hreq.status)}">${hreq.status}</span>
              </div>`).join("") || `<p class="empty">Aucune demande en cours.</p>`}
          </div>
        </div>
        <div class="card">
          <h3>Rayons prioritaires</h3>
          <div class="list">
            ${d.priorityRayons.map((r) => `
              <div class="row-item">
                <div class="grow"><div class="title">${r.icon} ${escapeHtml(r.name)}</div><div class="meta">${r.help} demande(s) · ${r.stockIssues} alerte(s) stock</div></div>
                <span class="tag ${r.score >= 4 ? "rupture" : "bas"}">Priorite ${r.score}</span>
              </div>`).join("") || `<p class="empty">Aucun rayon prioritaire.</p>`}
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:18px">
        <h3>Alertes stock <button class="btn btn-secondary btn-sm" id="see-stock">Gerer les stocks</button></h3>
        <div class="list">
          ${[...d.ruptures, ...d.lowStock].slice(0, 6).map((p) => `
            <div class="row-item">
              <div class="grow"><div class="title">${escapeHtml(p.name)}</div><div class="meta">${escapeHtml(p.rayon)} · ${escapeHtml(p.aisle)} · ${p.stock} en rayon</div></div>
              <span class="tag ${p.status}">${p.status === "rupture" ? "Rupture" : "Stock faible"}</span>
            </div>`).join("") || `<p class="empty">Stocks au vert.</p>`}
        </div>
      </div>`;
    body.querySelector("#see-help").addEventListener("click", () => ctx.navigate("demandes"));
    body.querySelector("#see-stock").addEventListener("click", () => ctx.navigate("stocks"));
  }
  await load();
  const timer = setInterval(load, 5000);
  const unsub = api.subscribeEvents((ev) => {
    if (ev.type === "state" || ev.type === "reset") load();
  });
  return () => {
    clearInterval(timer);
    unsub();
  };
}

// ---------- DEMANDES CLIENTS ----------
async function renderDemandes(body, ctx) {
  async function load() {
    const all = await api.help();
    staffStats.openHelp = all.filter((h) => h.status !== "Cloturee").length;
    ctx.refreshNav();
    body.innerHTML = `<div class="list">${
      all.length
        ? all.map((r) => `
          <div class="card" data-id="${r.id}">
            <div class="row-item" style="border:none;padding:0;background:none">
              <div class="grow">
                <div class="title">${escapeHtml(r.productName)} ${urgPill(r.urgence)}</div>
                <div class="meta">👤 ${escapeHtml(r.clientName)} · ${escapeHtml(r.rayon)} · ${escapeHtml(r.aisle)}</div>
                ${r.message ? `<div class="meta" style="margin-top:6px">« ${escapeHtml(r.message)} »</div>` : ""}
                ${r.comment ? `<div class="meta" style="margin-top:4px;color:var(--green-700)">Note interne : ${escapeHtml(r.comment)}</div>` : ""}
              </div>
              <span class="pill ${statusClass(r.status)}">${r.status}</span>
            </div>
            <div class="grid cols-3" style="margin-top:12px">
              <button class="btn btn-secondary btn-sm" data-act="Acceptee" data-id="${r.id}" ${r.status !== "Envoyee" ? "disabled" : ""}>Accepter</button>
              <button class="btn btn-secondary btn-sm" data-act="En cours" data-id="${r.id}" ${r.status === "Cloturee" || r.status === "Envoyee" ? "disabled" : ""}>En cours</button>
              <button class="btn btn-primary btn-sm" data-act="Cloturee" data-id="${r.id}" ${r.status === "Cloturee" ? "disabled" : ""}>Cloturer</button>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <input type="text" placeholder="Ajouter un commentaire interne..." data-comment="${r.id}" />
              <button class="btn btn-secondary btn-sm" data-savecomment="${r.id}">Noter</button>
            </div>
          </div>`).join("")
        : `<p class="empty">Aucune demande client.</p>`
    }</div>`;

    body.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => {
      await api.helpStatus(Number(b.dataset.id), { status: b.dataset.act });
      toast(`Demande mise a jour : ${b.dataset.act}`);
      await load();
    }));
    body.querySelectorAll("[data-savecomment]").forEach((b) => b.addEventListener("click", async () => {
      const id = Number(b.dataset.savecomment);
      const input = body.querySelector(`[data-comment="${id}"]`);
      await api.helpStatus(id, { comment: input.value });
      toast("Commentaire enregistre");
      await load();
    }));
  }
  await load();
  const timer = setInterval(load, 5000);
  const unsub = api.subscribeEvents((ev) => {
    if (ev.type === "state" || ev.type === "reset") load();
  });
  return () => {
    clearInterval(timer);
    unsub();
  };
}

// ---------- STOCKS & REASSORTS ----------
async function renderStocks(body, ctx) {
  let filter = "all";
  async function load() {
    const data = await api.stock();
    const items = filter === "all" ? data.items : data.items.filter((i) => i.status === filter);
    body.innerHTML = `
      <div class="page-actions">
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" data-go="taches">✅ Voir les taches</button>
        <button class="btn btn-secondary btn-sm" data-go="alertes">🔔 Alertes</button>
      </div>
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="kpi"><div class="k-label">References</div><div class="k-value">${data.summary.total}</div></div>
        <div class="kpi"><div class="k-label">Ruptures</div><div class="k-value" style="color:#b91c1c">${data.summary.rupture}</div></div>
        <div class="kpi"><div class="k-label">Stock faible</div><div class="k-value" style="color:#b45309">${data.summary.bas}</div></div>
        <div class="kpi"><div class="k-label">OK</div><div class="k-value" style="color:var(--green-700)">${data.summary.ok}</div></div>
      </div>
      <div class="chip-row" style="margin-bottom:14px">
        ${["all", "rupture", "bas", "ok"].map((f) => `<button class="chip ${filter === f ? "active" : ""}" data-filter="${f}">${{ all: "Tous", rupture: "Ruptures", bas: "Stock faible", ok: "OK" }[f]}</button>`).join("")}
      </div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Produit</th><th>Rayon</th><th>Niveau</th><th>Stock</th><th>Etat</th><th></th></tr></thead>
        <tbody>
          ${items.map((i) => `
            <tr>
              <td><strong>${escapeHtml(i.name)}</strong><div class="meta">${escapeHtml(i.brand)}</div></td>
              <td>${escapeHtml(i.rayon)}<div class="meta">${escapeHtml(i.aisle)}</div></td>
              <td><div class="bar"><span style="width:${i.fillRatio}%;background:${i.status === "rupture" ? "#ef4444" : i.status === "bas" ? "#f59e0b" : "#0e9f6e"}"></span></div></td>
              <td>${i.stock}/${i.capacity}</td>
              <td><span class="tag ${i.status}">${i.status === "rupture" ? "Rupture" : i.status === "bas" ? "Faible" : "OK"}</span></td>
              <td style="text-align:right">
                ${i.status !== "ok" ? `<button class="btn btn-primary btn-sm" data-restock="${i.id}">Reassort</button> <button class="btn btn-secondary btn-sm" data-task="${i.id}">+ Tache</button>` : ""}
              </td>
            </tr>`).join("")}
        </tbody>
      </table></div></div>`;

    body.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => ctx.navigate(b.dataset.go)));
    body.querySelectorAll("[data-filter]").forEach((c) => c.addEventListener("click", () => { filter = c.dataset.filter; load(); }));
    body.querySelectorAll("[data-restock]").forEach((b) => b.addEventListener("click", async () => { await api.restock(Number(b.dataset.restock)); toast("Produit reapprovisionne"); load(); }));
    body.querySelectorAll("[data-task]").forEach((b) => b.addEventListener("click", async () => { await api.createTask(Number(b.dataset.task)); toast("Tache de reassort creee"); }));
  }
  await load();
  const timer = setInterval(load, 6000);
  const unsub = api.subscribeEvents((ev) => {
    if (ev.type === "state" || ev.type === "reset") load();
  });
  return () => {
    clearInterval(timer);
    unsub();
  };
}

// ---------- TACHES ----------
async function renderTaches(body, ctx) {
  async function load() {
    const tasks = await api.tasks();
    const open = tasks.filter((t) => t.status === "ouverte");
    const done = tasks.filter((t) => t.status === "terminee");
    body.innerHTML = `
      <div class="page-actions">
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" data-go="stocks">📦 Gerer les stocks</button>
        <button class="btn btn-secondary btn-sm" data-go="dashboard">📋 Tableau de bord</button>
      </div>
      <div class="card" style="margin-bottom:18px">
        <h3>Taches ouvertes <span class="tag bas">${open.length}</span></h3>
        <div class="list">
          ${open.map((t) => `
            <div class="row-item">
              <div class="grow"><div class="title">${escapeHtml(t.productName)}</div><div class="meta">${escapeHtml(t.rayon)} · ${escapeHtml(t.aisle)} · assignee a ${escapeHtml(t.assignee)}</div></div>
              <button class="btn btn-primary btn-sm" data-done="${t.id}">Marquer terminee</button>
            </div>`).join("") || `<p class="empty">Aucune tache ouverte.</p>`}
        </div>
      </div>
      <div class="card">
        <h3>Taches terminees <span class="tag ok">${done.length}</span></h3>
        <div class="list">
          ${done.map((t) => `<div class="row-item" style="opacity:.6"><div class="grow"><div class="title">${escapeHtml(t.productName)}</div><div class="meta">${escapeHtml(t.rayon)}</div></div><span class="tag ok">Terminee</span></div>`).join("") || `<p class="empty">Aucune tache terminee.</p>`}
        </div>
      </div>`;
    body.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => ctx.navigate(b.dataset.go)));
    body.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => { await api.completeTask(Number(b.dataset.done)); toast("Tache terminee — produit reapprovisionne"); load(); }));
  }
  await load();
  const timer = setInterval(load, 6000);
  const unsub = api.subscribeEvents((ev) => {
    if (ev.type === "state" || ev.type === "reset") load();
  });
  return () => {
    clearInterval(timer);
    unsub();
  };
}

// ---------- ALERTES ----------
async function renderAlertes(body, ctx) {
  async function load() {
    const d = await api.staffDashboard();
    const alerts = [];
    for (const p of d.ruptures) alerts.push({ priority: "haute", icon: "🔴", title: `Rupture : ${p.name}`, detail: `${p.rayon} · ${p.aisle}` });
    for (const h of d.helpOpen.filter((x) => x.urgence === "Urgente")) alerts.push({ priority: "haute", icon: "🆘", title: `Demande urgente : ${h.productName}`, detail: `${h.clientName} · ${h.rayon}` });
    for (const p of d.lowStock) alerts.push({ priority: "moyenne", icon: "🟠", title: `Stock faible : ${p.name}`, detail: `${p.stock} restants · ${p.rayon}` });
    const order = { haute: 0, moyenne: 1, basse: 2 };
    alerts.sort((a, b) => order[a.priority] - order[b.priority]);
    body.innerHTML = `
      <div class="page-actions">
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" data-go="demandes">🆘 Demandes clients</button>
        <button class="btn btn-secondary btn-sm" data-go="stocks">📦 Gerer les stocks</button>
      </div>
      <div class="banner ${alerts.some((a) => a.priority === "haute") ? "red" : "green"}">${alerts.length} alerte(s) a traiter sur votre perimetre.</div>
      <div class="list">
        ${alerts.map((a) => `
          <div class="row-item">
            <span style="font-size:20px">${a.icon}</span>
            <div class="grow"><div class="title">${escapeHtml(a.title)}</div><div class="meta">${escapeHtml(a.detail)}</div></div>
            <span class="pill prio-${a.priority}">${a.priority}</span>
          </div>`).join("") || `<p class="empty">Aucune alerte.</p>`}
      </div>`;
    body.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => ctx.navigate(b.dataset.go)));
  }
  await load();
  const timer = setInterval(load, 4000);
  const unsub = api.subscribeEvents((ev) => {
    if (ev.type === "state" || ev.type === "reset") load();
  });
  return () => {
    clearInterval(timer);
    unsub();
  };
}

export const staffModule = {
  nav: [
    { key: "dashboard", label: "Tableau de bord", icon: "📋" },
    { key: "demandes", label: "Demandes clients", icon: "🆘", badge: () => staffStats.openHelp || null },
    { key: "stocks", label: "Stocks & reassorts", icon: "📦" },
    { key: "taches", label: "Taches", icon: "✅" },
    { key: "alertes", label: "Alertes", icon: "🔔", badge: () => staffStats.ruptures || null },
  ],
  pages: {
    dashboard: { title: "Tableau de bord collaborateur", subtitle: "Vos priorites du moment", render: renderDashboard },
    demandes: { title: "Demandes clients", subtitle: "Traitez les demandes en temps reel", render: renderDemandes },
    stocks: { title: "Stocks & reassorts", subtitle: "Disponibilite produit", render: renderStocks },
    taches: { title: "Taches de reassort", subtitle: "Suivi des actions", render: renderTaches },
    alertes: { title: "Alertes", subtitle: "Sur votre perimetre", render: renderAlertes },
  },
};

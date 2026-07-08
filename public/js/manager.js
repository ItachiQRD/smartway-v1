// Espace MANAGER : tableau de bord, performance rayons, heatmap des flux,
// alertes operationnelles, suivi des demandes clients.

import { api } from "./api.js";
import { money, escapeHtml } from "./ui.js";
import { drawHeatmap } from "./map.js";

// ---------- DASHBOARD ----------
async function renderDashboard(body, ctx) {
  body.innerHTML = `
    <div class="page-actions">
      <span class="spacer"></span>
      <button class="btn btn-secondary btn-sm" data-go="rayons">🏷️ Rayons</button>
      <button class="btn btn-secondary btn-sm" data-go="heatmap">🗺️ Heatmap</button>
      <button class="btn btn-secondary btn-sm" data-go="alertes">🚨 Alertes</button>
    </div>
    <div class="grid cols-4" id="kpis" style="margin-bottom:18px"></div>
    <div class="grid cols-2" style="margin-bottom:18px">
      <div class="card"><h3>Frequentation (clients en magasin)</h3><canvas class="chart" id="footfall"></canvas></div>
      <div class="card"><h3>Affluence par heure</h3><canvas class="chart" id="hourly"></canvas></div>
    </div>
    <div class="grid cols-2">
      <div class="card"><h3>Chiffre d'affaires cumule</h3><canvas class="chart" id="sales"></canvas></div>
      <div class="card"><h3>Caisses · files & cadence</h3><div id="checkouts"></div></div>
    </div>
    <div class="card" style="margin-top:18px"><h3>Suivi des demandes clients</h3><div id="help-track"></div></div>`;

  body.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => ctx.navigate(b.dataset.go)));
  const kpisEl = body.querySelector("#kpis");
  const checkoutsEl = body.querySelector("#checkouts");
  const helpEl = body.querySelector("#help-track");

  async function load() {
    const a = await api.managerDashboard();
    kpisEl.innerHTML = `
      <div class="kpi"><div class="k-label">👥 Visiteurs</div><div class="k-value live">${a.visitors}</div><div class="k-sub">${a.peopleInStore} en magasin</div></div>
      <div class="kpi"><div class="k-label">🛒 Panier moyen</div><div class="k-value">${money(a.avgBasket)}</div><div class="k-sub">CA ${a.salesToday.toLocaleString("fr-FR")} €</div></div>
      <div class="kpi"><div class="k-label">⏱️ Temps de visite</div><div class="k-value">${a.avgVisitMin} <span style="font-size:14px">min</span></div><div class="k-sub">attente caisse ${a.avgWaitMin} min</div></div>
      <div class="kpi"><div class="k-label">😊 Satisfaction</div><div class="k-value" style="color:var(--green-700)">${a.satisfaction}%</div><div class="k-sub">${a.ruptures} rupture(s)</div></div>`;

    checkoutsEl.innerHTML = a.checkouts.map((c) => {
      const max = c.type === "scango" ? 4 : 9;
      const cells = Array.from({ length: max }, (_, i) => `<i style="width:12px;height:16px;border-radius:3px;background:${i < c.queueLength ? "#f59e0b" : "#e5eaf1"}"></i>`).join("");
      return `<div class="row-item" style="border:none;padding:8px 0">
        <div style="width:120px"><strong>${escapeHtml(c.name)}</strong><div class="meta">${c.open ? c.throughputPerMin + " art./min" : "fermee"}</div></div>
        <div style="display:flex;gap:3px;flex:1">${cells}</div>
        <div style="width:70px;text-align:right" class="meta">~ ${c.estWaitMin} min</div>
      </div>`;
    }).join("");

    helpEl.innerHTML = `<div class="grid cols-4">
      <div class="kpi"><div class="k-label">Total demandes</div><div class="k-value">${a.helpTotal}</div></div>
      <div class="kpi"><div class="k-label">Ouvertes</div><div class="k-value" style="color:#b45309">${a.helpOpen}</div></div>
      <div class="kpi"><div class="k-label">Cloturees</div><div class="k-value" style="color:var(--green-700)">${a.helpClosed}</div></div>
      <div class="kpi"><div class="k-label">Tps moyen traitement</div><div class="k-value">${a.avgTreatMin} <span style="font-size:14px">min</span></div></div>
    </div>`;

    drawLine(body.querySelector("#footfall"), a.footfallSeries, "people", "#0e9f6e", true);
    drawLine(body.querySelector("#sales"), a.salesSeries, "sales", "#3b82f6", false);
    drawBars(body.querySelector("#hourly"), a.hourlyFootfall, a.currentHour);
  }
  await load();
  const timer = setInterval(load, 2500);
  const unsub = api.subscribeEvents((ev) => {
    if (ev.type === "tick" || ev.type === "reset") load();
  });
  return () => {
    clearInterval(timer);
    unsub();
  };
}

// ---------- PERFORMANCE RAYONS ----------
async function renderRayons(body, ctx) {
  async function load() {
    const d = await api.managerRayons();
    const maxVisits = Math.max(1, ...d.rayons.map((r) => r.visits));
    body.innerHTML = `
      <div class="card" style="margin-bottom:18px">
        <h3>Frequentation par rayon</h3>
        <div class="list">
          ${[...d.rayons].sort((a, b) => b.visits - a.visits).map((r) => `
            <div class="row-item" style="border:none;padding:6px 0">
              <div style="width:200px"><strong>${r.icon} ${escapeHtml(r.name)}</strong><div class="meta">${escapeHtml(r.aisle)}</div></div>
              <div class="bar" style="flex:1;width:auto"><span style="width:${(r.visits / maxVisits) * 100}%;background:linear-gradient(90deg,#0e9f6e,#14b8a6)"></span></div>
              <div style="width:80px;text-align:right" class="meta">${r.visits} visites</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="grid cols-3">
        <div class="card"><h3>Top recherches</h3><div class="list">${d.topSearched.map((p) => `<div class="row-item"><div class="grow"><div class="title">${escapeHtml(p.name)}</div><div class="meta">${escapeHtml(p.rayon)}</div></div><span class="tag">${p.searches}</span></div>`).join("")}</div></div>
        <div class="card"><h3>Souvent introuvables</h3><div class="list">${d.oftenNotFound.map((p) => `<div class="row-item"><div class="grow"><div class="title">${escapeHtml(p.name)}</div><div class="meta">${escapeHtml(p.rayon)} · stock ${p.stock}</div></div><span class="tag rupture">${p.notFound}</span></div>`).join("")}</div></div>
        <div class="card"><h3>Rayons les + demandes</h3><div class="list">${d.mostHelp.map((r) => `<div class="row-item"><div class="grow"><div class="title">${r.icon} ${escapeHtml(r.name)}</div></div><span class="tag bas">${r.helpCount} demandes</span></div>`).join("")}</div></div>
      </div>
      <div class="grid cols-2" style="margin-top:18px">
        <div class="card"><h3>Rayons les plus visites</h3><div class="list">${d.mostVisited.map((r, i) => `<div class="row-item"><span class="num" style="width:24px;height:24px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700">${i + 1}</span><div class="grow"><div class="title">${r.icon} ${escapeHtml(r.name)}</div></div><span class="meta">${r.visits}</span></div>`).join("")}</div></div>
        <div class="card"><h3>Rayons les moins visites</h3><div class="list">${d.leastVisited.map((r) => `<div class="row-item"><div class="grow"><div class="title">${r.icon} ${escapeHtml(r.name)}</div></div><span class="meta">${r.visits}</span></div>`).join("")}</div></div>
      </div>`;
  }
  await load();
  const timer = setInterval(load, 6000);
  return () => clearInterval(timer);
}

// ---------- HEATMAP ----------
async function renderHeatmap(body, ctx) {
  body.innerHTML = `
    <div class="split grid">
      <div class="card">
        <h3>Synthese des flux</h3>
        <div id="reco"></div>
        <div class="list" id="zone-list" style="margin-top:12px"></div>
      </div>
      <div class="card">
        <h3>Carte d'affluence</h3>
        <div class="map-wrap"><canvas class="store" id="heat"></canvas></div>
        <div class="legend">
          <span><i class="dot" style="background:#3b82f6"></i> Zone froide</span>
          <span><i class="dot" style="background:#0e9f6e"></i> Moderee</span>
          <span><i class="dot" style="background:#f59e0b"></i> Chargee</span>
          <span><i class="dot" style="background:#ef4444"></i> Congestion</span>
        </div>
      </div>
    </div>`;
  const canvas = body.querySelector("#heat");
  const recoEl = body.querySelector("#reco");
  const zoneListEl = body.querySelector("#zone-list");

  async function load() {
    const d = await api.managerHeatmap();
    drawHeatmap(canvas, ctx.bootstrap, d.zones);
    recoEl.innerHTML = `
      <div class="banner ${d.congested.length ? "red" : "green"}">💡 ${escapeHtml(d.recommendation)}</div>
      <div class="grid cols-3" style="margin-top:10px">
        <div class="kpi"><div class="k-label">🔥 Zones chaudes</div><div class="k-value" style="font-size:20px">${d.hot.length}</div></div>
        <div class="kpi"><div class="k-label">❄️ Zones froides</div><div class="k-value" style="font-size:20px">${d.cold.length}</div></div>
        <div class="kpi"><div class="k-label">🚧 Congestions</div><div class="k-value" style="font-size:20px;color:#b91c1c">${d.congested.length}</div></div>
      </div>`;
    const sorted = [...d.zones].sort((a, b) => b.shoppers - a.shoppers);
    const max = Math.max(1, ...sorted.map((z) => z.shoppers));
    zoneListEl.innerHTML = sorted.map((z) => `
      <div class="row-item" style="border:none;padding:6px 0">
        <div style="width:170px"><strong>${z.icon} ${escapeHtml(z.name)}</strong><div class="meta">${z.shoppers} client(s) · ${z.level}</div></div>
        <div class="bar" style="flex:1;width:auto"><span style="width:${(z.shoppers / max) * 100}%;background:${z.congestion ? "#ef4444" : z.level === "chaude" ? "#f59e0b" : z.level === "moderee" ? "#0e9f6e" : "#3b82f6"}"></span></div>
      </div>`).join("");
  }
  await load();
  const timer = setInterval(load, 3000);
  const unsub = api.subscribeEvents((ev) => {
    if (ev.type === "tick" || ev.type === "reset") load();
  });
  return () => {
    clearInterval(timer);
    unsub();
  };
}

// ---------- ALERTES OPERATIONNELLES ----------
async function renderAlertes(body, ctx) {
  async function load() {
    const alerts = await api.managerAlerts();
    const counts = { haute: alerts.filter((a) => a.priority === "haute").length, moyenne: alerts.filter((a) => a.priority === "moyenne").length };
    const icon = { rupture: "🔴", stock: "🟠", caisse: "💳", congestion: "🚧", demande: "🆘" };
    body.innerHTML = `
      <div class="page-actions">
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" data-go="heatmap">🗺️ Voir la heatmap</button>
        <button class="btn btn-secondary btn-sm" data-go="dashboard">📊 Tableau de bord</button>
      </div>
      <div class="grid cols-3" style="margin-bottom:16px">
        <div class="kpi"><div class="k-label">Total alertes</div><div class="k-value live">${alerts.length}</div></div>
        <div class="kpi"><div class="k-label">Priorite haute</div><div class="k-value" style="color:#b91c1c">${counts.haute}</div></div>
        <div class="kpi"><div class="k-label">Priorite moyenne</div><div class="k-value" style="color:#b45309">${counts.moyenne}</div></div>
      </div>
      <div class="list">
        ${alerts.map((a) => `
          <div class="row-item">
            <span style="font-size:20px">${icon[a.type] || "⚠️"}</span>
            <div class="grow"><div class="title">${escapeHtml(a.title)}</div><div class="meta">${escapeHtml(a.detail)}</div></div>
            <span class="pill prio-${a.priority}">${a.priority}</span>
          </div>`).join("") || `<p class="empty">Aucune alerte operationnelle.</p>`}
      </div>`;
    body.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => ctx.navigate(b.dataset.go)));
  }
  await load();
  const timer = setInterval(load, 4000);
  const unsub = api.subscribeEvents((ev) => {
    if (ev.type === "state" || ev.type === "tick" || ev.type === "reset") load();
  });
  return () => {
    clearInterval(timer);
    unsub();
  };
}

// ---------- CHARTS ----------
function drawLine(canvas, series, key, color, minZero) {
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = 200 * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const W = canvas.clientWidth, H = 200;
  ctx.clearRect(0, 0, W, H);
  if (series.length < 2) { ctx.fillStyle = "#94a3b8"; ctx.font = "13px Inter"; ctx.fillText("Collecte des donnees...", 12, 24); return; }
  const values = series.map((s) => s[key]);
  const min = minZero ? 0 : Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 30, plotW = W - pad * 2, plotH = H - pad * 2;
  ctx.strokeStyle = "#eef2f7"; ctx.fillStyle = "#94a3b8"; ctx.font = "10px Inter";
  for (let i = 0; i <= 3; i++) {
    const y = pad + (plotH / 3) * i;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    ctx.fillText(String(Math.round(max - (range / 3) * i)), 2, y + 3);
  }
  const x = (i) => pad + (plotW / (series.length - 1)) * i;
  const y = (v) => pad + plotH - ((v - min) / range) * plotH;
  const grad = ctx.createLinearGradient(0, pad, 0, H - pad);
  grad.addColorStop(0, color + "44"); grad.addColorStop(1, color + "00");
  ctx.beginPath(); ctx.moveTo(x(0), y(values[0]));
  values.forEach((v, i) => ctx.lineTo(x(i), y(v)));
  ctx.lineTo(x(values.length - 1), H - pad); ctx.lineTo(x(0), H - pad); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); values.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.stroke();
  const lx = x(values.length - 1), ly = y(values[values.length - 1]);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
}

function drawBars(canvas, data, highlightHour) {
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = 200 * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const W = canvas.clientWidth, H = 200;
  ctx.clearRect(0, 0, W, H);
  const open = data.filter((d) => d.hour >= 8 && d.hour <= 21);
  const max = Math.max(1, ...open.map((d) => d.count));
  const pad = 26, plotW = W - pad * 2, plotH = H - pad * 2, bw = plotW / open.length;
  ctx.font = "10px Inter";
  open.forEach((d, i) => {
    const bh = (d.count / max) * plotH;
    const x = pad + i * bw, y = pad + plotH - bh;
    ctx.fillStyle = d.hour === highlightHour ? "#0e9f6e" : "#dbe3ee";
    const r = Math.min(3, bh);
    ctx.beginPath();
    ctx.moveTo(x + 2, y + bh); ctx.lineTo(x + 2, y + r);
    ctx.arcTo(x + 2, y, x + 2 + r, y, r); ctx.lineTo(x + bw - 2 - r, y);
    ctx.arcTo(x + bw - 2, y, x + bw - 2, y + r, r); ctx.lineTo(x + bw - 2, y + bh);
    ctx.closePath(); ctx.fill();
    if (d.hour % 2 === 0) { ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.fillText(`${d.hour}h`, x + bw / 2, H - 8); }
  });
}

export const managerModule = {
  nav: [
    { key: "dashboard", label: "Tableau de bord", icon: "📊" },
    { key: "rayons", label: "Performance rayons", icon: "🏷️" },
    { key: "heatmap", label: "Heatmap des flux", icon: "🗺️" },
    { key: "alertes", label: "Alertes operationnelles", icon: "🚨" },
  ],
  pages: {
    dashboard: { title: "Tableau de bord", subtitle: "Pilotage temps reel du magasin", render: renderDashboard },
    rayons: { title: "Performance des rayons", subtitle: "Visites, recherches et demandes", render: renderRayons },
    heatmap: { title: "Heatmap des flux", subtitle: "Zones chaudes, froides et congestions", render: renderHeatmap },
    alertes: { title: "Alertes operationnelles", subtitle: "Priorisez les actions", render: renderAlertes },
  },
};

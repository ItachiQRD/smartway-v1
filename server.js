import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import { buildStore } from "./src/storeData.js";
import { planRoute } from "./src/pathfinding.js";
import { createSimulation } from "./src/simulation.js";
import { initPersistence, schedulePersist, persistNow, resetMutableState } from "./src/persist.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const store = buildStore();
initPersistence(store);
const sim = createSimulation(store);
const ROLES = ["client", "collaborateur", "manager"];
const AUTH_SECRET = process.env.SMARTWAY_AUTH_SECRET || "smartway-demo-v1";
const sseClients = new Set();

function touchStore(area = "state") {
  schedulePersist(store);
  broadcastEvent("state", { area });
}

function broadcastEvent(type, data = {}) {
  const msg = `data: ${JSON.stringify({ type, t: Date.now(), ...data })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(msg);
    } catch {
      sseClients.delete(res);
    }
  }
}

setInterval(() => {
  sim.tick();
  broadcastEvent("tick");
}, 2000);

// Sauvegarde periodique de secours.
setInterval(() => persistNow(store), 30000);

// Jeton signe sans etat serveur (compatible Vercel / serverless).
function signToken(name, role) {
  const payload = Buffer.from(JSON.stringify({ name, role }), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function parseToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.name || !ROLES.includes(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

function auth(requiredRole) {
  return (req, res, next) => {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const session = parseToken(token);
    if (!session) return res.status(401).json({ error: "Non authentifie" });
    if (requiredRole && session.role !== requiredRole) {
      return res.status(403).json({ error: "Acces refuse pour ce role" });
    }
    req.session = session;
    next();
  };
}

function publicProduct(p) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    rayonId: p.rayonId,
    rayon: p.rayon,
    aisle: p.aisle,
    price: p.price,
    basePrice: p.basePrice,
    promo: p.promo,
    stock: p.stock,
    status: sim.stockStatus(p),
    inStock: p.stock > 0,
  };
}

// --- Auth ---
app.post("/api/login", (req, res) => {
  const { name, role } = req.body || {};
  if (!name || !ROLES.includes(role)) {
    return res.status(400).json({ error: "Nom et role valides requis" });
  }
  res.json({ token: signToken(name, role), name, role });
});

app.post("/api/logout", (_req, res) => {
  res.json({ ok: true });
});

// Flux temps reel (rafraichissement staff / manager sans polling agressif).
app.get("/api/events", (req, res) => {
  const token = (req.query.token || "").toString() || (req.headers.authorization || "").replace("Bearer ", "");
  const session = parseToken(token);
  if (!session) return res.status(401).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: "connected", role: session.role })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// Reinitialise l'etat mutable de la demo (utile avant une presentation).
app.post("/api/demo/reset", auth(), (_req, res) => {
  resetMutableState(store);
  broadcastEvent("reset");
  res.json({ ok: true });
});

// --- Bootstrap commun ---
app.get("/api/bootstrap", auth(), (req, res) => {
  res.json({
    meta: store.meta,
    rayons: store.rayons,
    entrance: store.entrance,
    grid: store.grid,
    width: store.width,
    height: store.height,
    checkouts: store.checkouts.map((c) => ({ id: c.id, name: c.name, type: c.type, marker: c.marker, open: c.open })),
    clients: store.clients,
    collaborators: store.collaborators.map((c) => ({ id: c.id, name: c.name, online: c.online })),
    promotions: store.products
      .filter((p) => p.promo)
      .map((p) => ({ id: p.id, name: p.name, brand: p.brand, rayon: p.rayon, price: p.price, oldPrice: p.promo.oldPrice, percent: p.promo.percent, label: p.promo.label })),
  });
});

// --- Produits ---
app.get("/api/products", auth(), (req, res) => {
  const q = (req.query.q || "").toString().trim().toLowerCase();
  const rayon = req.query.rayon != null ? Number(req.query.rayon) : null;
  let items = store.products;
  if (rayon != null && !Number.isNaN(rayon)) items = items.filter((p) => p.rayonId === rayon);
  if (q) items = items.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.rayon.toLowerCase().includes(q));
  res.json(items.map(publicProduct));
});

app.get("/api/products/:id", auth(), (req, res) => {
  const p = store.products.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: "Produit introuvable" });
  const alternatives = p.stock === 0
    ? store.products
        .filter((x) => x.rayonId === p.rayonId && x.id !== p.id && x.stock > 0)
        .slice(0, 3)
        .map(publicProduct)
    : [];
  res.json({ ...publicProduct(p), shelf: p.shelf, alternatives });
});

// --- CLIENT : parcours ---
app.post("/api/route", auth("client"), (req, res) => {
  const { productIds } = req.body || {};
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: "Liste de courses vide" });
  }
  const route = planRoute(store, productIds);
  const selected = productIds.map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
  route.budget = Math.round(selected.reduce((s, p) => s + p.price, 0) * 100) / 100;
  route.savings = Math.round(selected.reduce((s, p) => s + (p.promo ? p.promo.oldPrice - p.price : 0), 0) * 100) / 100;
  res.json(route);
});

// --- Caisses ---
app.get("/api/checkouts", auth(), (req, res) => {
  const itemCount = Number(req.query.items) || 8;
  const list = sim.checkoutsView().map((c) => {
    const waitMin = c.open ? Math.round((c.estWaitMin + (itemCount * (c.type === "scango" ? 2.25 : 4.5)) / 60) * 10) / 10 : null;
    return { ...c, waitMin };
  });
  const open = list.filter((c) => c.open);
  const fastest = open.reduce((b, c) => (c.waitMin < b.waitMin ? c : b), open[0]);
  res.json({ checkouts: list, recommended: fastest ? { id: fastest.id, name: fastest.name, waitMin: fastest.waitMin } : null });
});

// --- Demandes d'aide ---
app.post("/api/help", auth("client"), (req, res) => {
  const { productId, message, urgence } = req.body || {};
  const p = store.products.find((x) => x.id === Number(productId));
  if (!p) return res.status(400).json({ error: "Produit invalide" });
  const now = Date.now();
  const reqObj = {
    id: ++store.seq.help,
    clientName: req.session.name,
    productId: p.id,
    productName: p.name,
    rayonId: p.rayonId,
    rayon: p.rayon,
    aisle: p.aisle,
    urgence: ["Faible", "Normale", "Urgente"].includes(urgence) ? urgence : "Normale",
    status: "Envoyee",
    message: (message || "").toString().slice(0, 200),
    comment: "",
    createdAt: now,
    updatedAt: now,
  };
  store.helpRequests.unshift(reqObj);
  touchStore("help");
  res.json(reqObj);
});

app.get("/api/help", auth(), (req, res) => {
  if (req.session.role === "client") {
    return res.json(store.helpRequests.filter((h) => h.clientName === req.session.name));
  }
  res.json(store.helpRequests);
});

app.post("/api/help/:id/status", auth("collaborateur"), (req, res) => {
  const h = store.helpRequests.find((x) => x.id === Number(req.params.id));
  if (!h) return res.status(404).json({ error: "Demande introuvable" });
  const { status, comment } = req.body || {};
  const valid = ["Envoyee", "Acceptee", "En cours", "Cloturee"];
  if (status && valid.includes(status)) h.status = status;
  if (comment != null) h.comment = comment.toString().slice(0, 300);
  h.updatedAt = Date.now();
  touchStore("help");
  res.json(h);
});

// --- COLLABORATEUR : dashboard ---
app.get("/api/staff/dashboard", auth("collaborateur"), (req, res) => {
  const openHelp = store.helpRequests.filter((h) => h.status !== "Cloturee");
  const urgent = openHelp.filter((h) => h.urgence === "Urgente");
  const ruptures = store.products.filter((p) => p.stock === 0).map(publicProduct);
  const low = store.products.filter((p) => sim.stockStatus(p) === "bas").map(publicProduct);
  // Rayons prioritaires : agrege demandes + alertes stock.
  const priority = store.rayons
    .map((r) => {
      const help = openHelp.filter((h) => h.rayonId === r.id).length;
      const stockIssues = store.products.filter((p) => p.rayonId === r.id && p.stock <= p.capacity * 0.2).length;
      return { id: r.id, name: r.name, icon: r.icon, aisle: r.aisle, score: help * 2 + stockIssues, help, stockIssues };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  res.json({
    helpOpen: openHelp,
    urgentCount: urgent.length,
    ruptures,
    lowStock: low,
    openTasks: store.tasks.filter((t) => t.status === "ouverte"),
    priorityRayons: priority,
  });
});

// --- Stocks ---
app.get("/api/stock", auth("collaborateur"), (req, res) => {
  const items = store.products
    .map((p) => ({
      ...publicProduct(p),
      capacity: p.capacity,
      dailySales: p.dailySales,
      fillRatio: Math.round((p.stock / p.capacity) * 100),
      suggestRestock: p.stock <= p.capacity * 0.2 ? p.capacity - p.stock : 0,
    }))
    .sort((a, b) => a.fillRatio - b.fillRatio);
  res.json({
    items,
    summary: {
      total: items.length,
      rupture: items.filter((i) => i.status === "rupture").length,
      bas: items.filter((i) => i.status === "bas").length,
      ok: items.filter((i) => i.status === "ok").length,
    },
  });
});

app.post("/api/stock/:id/restock", auth("collaborateur"), (req, res) => {
  const p = store.products.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: "Produit introuvable" });
  const qty = Number(req.body?.quantity) || p.capacity - p.stock;
  p.stock = Math.min(p.capacity, p.stock + Math.max(0, qty));
  touchStore("stock");
  res.json({ id: p.id, stock: p.stock, status: sim.stockStatus(p) });
});

// --- Taches de reassort ---
app.get("/api/tasks", auth("collaborateur"), (req, res) => {
  res.json(store.tasks);
});

app.post("/api/tasks", auth("collaborateur"), (req, res) => {
  const p = store.products.find((x) => x.id === Number(req.body?.productId));
  if (!p) return res.status(400).json({ error: "Produit invalide" });
  const task = {
    id: ++store.seq.task,
    productId: p.id,
    productName: p.name,
    rayonId: p.rayonId,
    rayon: p.rayon,
    aisle: p.aisle,
    status: "ouverte",
    assignee: req.session.name,
    createdAt: Date.now(),
  };
  store.tasks.unshift(task);
  touchStore("tasks");
  res.json(task);
});

app.post("/api/tasks/:id/complete", auth("collaborateur"), (req, res) => {
  const t = store.tasks.find((x) => x.id === Number(req.params.id));
  if (!t) return res.status(404).json({ error: "Tache introuvable" });
  t.status = "terminee";
  // Reassort automatique du produit lie.
  const p = store.products.find((x) => x.id === t.productId);
  if (p) p.stock = p.capacity;
  touchStore("tasks");
  res.json(t);
});

// --- MANAGER ---
app.get("/api/manager/dashboard", auth("manager"), (req, res) => res.json(sim.managerDashboard()));
app.get("/api/manager/rayons", auth("manager"), (req, res) => res.json(sim.rayonPerformance()));
app.get("/api/manager/heatmap", auth("manager"), (req, res) => res.json(sim.heatmap()));
app.get("/api/manager/alerts", auth("manager"), (req, res) => res.json(sim.operationalAlerts()));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`SmartWay demarree sur http://localhost:${PORT}`);
  });
}

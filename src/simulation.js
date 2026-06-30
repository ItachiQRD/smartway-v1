// SmartWay V1 - Simulation temps reel.
// Fait evoluer l'activite (clients, ventes, files, stocks, recherches) et
// produit les indicateurs pour les espaces manager et collaborateur.

const LOW_STOCK_RATIO = 0.2;
const MAX_SERIES_POINTS = 40;

export function createSimulation(store) {
  const rayonCount = store.rayons.length;
  const state = {
    peopleInStore: 24,
    visitorsToday: 312,
    exitsToday: 288,
    salesToday: 4180.5,
    transactionsToday: 198,
    satisfaction: 92, // %
    avgVisitMin: 23,
    zoneWeights: store.rayons.map((_, i) => 0.6 + ((i * 0.11) % 0.8)),
    rayonVisits: store.rayons.map((_, i) => 120 + Math.round(i % 3 === 0 ? 220 : 90 + i * 18)),
    footfallSeries: [],
    salesSeries: [],
    hourlyFootfall: Array.from({ length: 24 }, (_, h) => {
      const base = 6 + 40 * Math.exp(-((h - 12) ** 2) / 8) + 55 * Math.exp(-((h - 18) ** 2) / 5);
      return Math.round(h < 8 || h > 21 ? 0 : base);
    }),
    startedAt: Date.now(),
  };

  function tick() {
    const now = Date.now();
    const hour = new Date().getHours();
    const peak = hour >= 11 && hour <= 13 ? 1.5 : hour >= 17 && hour <= 19 ? 1.9 : 1;

    const arrivals = Math.round(Math.random() * 5 * peak);
    const departures = Math.round(Math.random() * 5);
    state.visitorsToday += arrivals;
    state.exitsToday += departures;
    state.peopleInStore = Math.max(5, Math.min(140, state.peopleInStore + arrivals - departures));
    state.hourlyFootfall[hour] += arrivals;

    for (let i = 0; i < rayonCount; i++) {
      const drift = (Math.random() - 0.5) * 0.3;
      state.zoneWeights[i] = Math.max(0.15, Math.min(1.7, state.zoneWeights[i] + drift));
    }
    // Visites rayons : reparties selon l'attractivite.
    const totalW = state.zoneWeights.reduce((s, w) => s + w, 0) || 1;
    for (let i = 0; i < rayonCount; i++) {
      state.rayonVisits[i] += Math.round((arrivals * state.zoneWeights[i]) / totalW * rayonCount);
    }

    // Caisses.
    for (const c of store.checkouts) {
      if (!c.open) {
        c.queueLength = 0;
        continue;
      }
      const incoming = Math.random() < 0.5 * peak ? 1 : 0;
      const served = Math.random() < 0.6 ? 1 : 0;
      c.queueLength = Math.max(0, c.queueLength + incoming - served);
      if (served) {
        c.processed += 1;
        state.transactionsToday += 1;
        const basket = c.type === "scango" ? 5 + Math.random() * 8 : 14 + Math.random() * 30;
        state.salesToday += Math.round(basket * 100) / 100;
      }
      c.queueLength = Math.min(c.queueLength, c.type === "scango" ? 4 : 9);
    }

    // Ventes : baisse de stock + recherches.
    const sells = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < sells; i++) {
      const p = store.products[Math.floor(Math.random() * store.products.length)];
      p.searches += Math.random() < 0.5 ? 1 : 0;
      if (p.stock > 0) {
        const qty = 1 + Math.floor(Math.random() * 2);
        p.stock = Math.max(0, p.stock - qty);
        p.dailySales += qty;
      } else if (Math.random() < 0.4) {
        p.notFound += 1; // recherche d'un produit en rupture
      }
    }

    // Satisfaction : derive selon ruptures et attente caisse.
    const ruptures = store.products.filter((p) => p.stock === 0).length;
    const avgWait = avgCheckoutWaitMin();
    let target = 96 - ruptures * 1.2 - Math.max(0, avgWait - 3) * 2;
    target = Math.max(70, Math.min(99, target));
    state.satisfaction += (target - state.satisfaction) * 0.1 + (Math.random() - 0.5);
    state.satisfaction = Math.max(60, Math.min(100, state.satisfaction));

    state.avgVisitMin = Math.max(16, Math.min(34, state.avgVisitMin + (Math.random() - 0.5) * 0.5));

    state.footfallSeries.push({ t: now, people: state.peopleInStore });
    state.salesSeries.push({ t: now, sales: Math.round(state.salesToday) });
    if (state.footfallSeries.length > MAX_SERIES_POINTS) state.footfallSeries.shift();
    if (state.salesSeries.length > MAX_SERIES_POINTS) state.salesSeries.shift();
  }

  function stockStatus(p) {
    if (p.stock === 0) return "rupture";
    if (p.stock <= p.capacity * LOW_STOCK_RATIO) return "bas";
    return "ok";
  }

  function avgCheckoutWaitMin() {
    const open = store.checkouts.filter((c) => c.open);
    if (!open.length) return 0;
    const total = open.reduce((s, c) => s + (c.queueLength * 12 * c.secPerItem) / 60, 0);
    return total / open.length;
  }

  // Repartition des clients presents par rayon (pour la heatmap).
  function zones() {
    const totalWeight = state.zoneWeights.reduce((s, w) => s + w, 0) || 1;
    let assigned = 0;
    const z = store.rayons.map((r, i) => {
      const share = state.zoneWeights[i] / totalWeight;
      const shoppers = Math.round(state.peopleInStore * share);
      assigned += shoppers;
      return { id: r.id, name: r.name, icon: r.icon, aisle: r.aisle, bounds: r.bounds, shoppers };
    });
    if (z.length) {
      const diff = state.peopleInStore - assigned;
      const top = z.reduce((a, b) => (b.shoppers > a.shoppers ? b : a), z[0]);
      top.shoppers = Math.max(0, top.shoppers + diff);
    }
    const max = Math.max(1, ...z.map((x) => x.shoppers));
    for (const x of z) {
      x.intensity = Math.round((x.shoppers / max) * 100) / 100;
      x.level = x.intensity >= 0.75 ? "chaude" : x.intensity >= 0.4 ? "moderee" : "froide";
      x.congestion = x.shoppers >= 7;
    }
    return z;
  }

  function checkoutsView() {
    return store.checkouts.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      open: c.open,
      queueLength: c.queueLength,
      processed: c.processed,
      throughputPerMin: c.open ? Math.round(60 / c.secPerItem) : 0,
      estWaitMin: c.open ? Math.round(((c.queueLength * 12 * c.secPerItem) / 60) * 10) / 10 : 0,
    }));
  }

  function managerDashboard() {
    const open = store.helpRequests.filter((h) => h.status !== "Cloturee");
    const closed = store.helpRequests.filter((h) => h.status === "Cloturee");
    const treatTimes = closed.map((h) => (h.updatedAt - h.createdAt) / 60000);
    const avgTreat = treatTimes.length
      ? Math.round((treatTimes.reduce((s, t) => s + t, 0) / treatTimes.length) * 10) / 10
      : 0;
    return {
      visitors: state.visitorsToday,
      peopleInStore: state.peopleInStore,
      avgBasket: state.transactionsToday
        ? Math.round((state.salesToday / state.transactionsToday) * 100) / 100
        : 0,
      avgVisitMin: Math.round(state.avgVisitMin * 10) / 10,
      avgWaitMin: Math.round(avgCheckoutWaitMin() * 10) / 10,
      satisfaction: Math.round(state.satisfaction),
      helpTotal: store.helpRequests.length,
      helpOpen: open.length,
      helpClosed: closed.length,
      avgTreatMin: avgTreat,
      ruptures: store.products.filter((p) => p.stock === 0).length,
      salesToday: Math.round(state.salesToday * 100) / 100,
      transactionsToday: state.transactionsToday,
      footfallSeries: state.footfallSeries,
      salesSeries: state.salesSeries,
      hourlyFootfall: state.hourlyFootfall.map((count, h) => ({ hour: h, count })),
      currentHour: new Date().getHours(),
      checkouts: checkoutsView(),
    };
  }

  function rayonPerformance() {
    const byRayon = store.rayons.map((r) => {
      const prods = store.products.filter((p) => p.rayonId === r.id);
      const helpCount = store.helpRequests.filter((h) => h.rayonId === r.id).length;
      return {
        id: r.id,
        name: r.name,
        icon: r.icon,
        aisle: r.aisle,
        visits: state.rayonVisits[r.id],
        sales: prods.reduce((s, p) => s + p.dailySales, 0),
        helpCount,
      };
    });
    const sortedVisits = [...byRayon].sort((a, b) => b.visits - a.visits);
    const topSearched = [...store.products]
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 6)
      .map((p) => ({ id: p.id, name: p.name, brand: p.brand, rayon: p.rayon, searches: p.searches }));
    const oftenNotFound = [...store.products]
      .sort((a, b) => b.notFound - a.notFound)
      .slice(0, 6)
      .map((p) => ({ id: p.id, name: p.name, rayon: p.rayon, notFound: p.notFound, stock: p.stock }));
    const mostHelp = [...byRayon].sort((a, b) => b.helpCount - a.helpCount).slice(0, 5);
    return {
      rayons: byRayon,
      mostVisited: sortedVisits.slice(0, 5),
      leastVisited: sortedVisits.slice(-5).reverse(),
      topSearched,
      oftenNotFound,
      mostHelp,
    };
  }

  function heatmap() {
    const z = zones();
    const hot = z.filter((x) => x.level === "chaude").map((x) => x.name);
    const cold = z.filter((x) => x.level === "froide").map((x) => x.name);
    const congested = z.filter((x) => x.congestion).map((x) => x.name);
    let reco = "Flux equilibres dans le magasin.";
    if (congested.length) {
      reco = `Zone(s) congestionnee(s) : ${congested.join(", ")}. Ouvrir une caisse supplementaire et fluidifier l'allee.`;
    } else if (cold.length) {
      reco = `Zone(s) peu frequentee(s) : ${cold.join(", ")}. Mettre en avant des promotions pour attirer le flux.`;
    }
    return { zones: z, hot, cold, congested, recommendation: reco };
  }

  function operationalAlerts() {
    const alerts = [];
    let id = 1;
    for (const p of store.products) {
      const s = stockStatus(p);
      if (s === "rupture") {
        alerts.push({ id: id++, type: "rupture", priority: "haute", title: `Rupture : ${p.name}`, detail: `${p.rayon} · ${p.aisle}`, rayonId: p.rayonId });
      } else if (s === "bas") {
        alerts.push({ id: id++, type: "stock", priority: "moyenne", title: `Stock faible : ${p.name}`, detail: `${p.stock} restants · ${p.rayon}`, rayonId: p.rayonId });
      }
    }
    for (const c of store.checkouts) {
      if (c.open && c.queueLength >= (c.type === "scango" ? 3 : 6)) {
        alerts.push({ id: id++, type: "caisse", priority: "haute", title: `Caisse saturee : ${c.name}`, detail: `${c.queueLength} clients en file` });
      }
    }
    for (const z of zones()) {
      if (z.congestion) {
        alerts.push({ id: id++, type: "congestion", priority: "moyenne", title: `Rayon congestionne : ${z.name}`, detail: `${z.shoppers} clients · ${z.aisle}`, rayonId: z.id });
      }
    }
    // Forte demande client par rayon.
    const helpByRayon = {};
    for (const h of store.helpRequests) {
      if (h.status === "Cloturee") continue;
      helpByRayon[h.rayonId] = (helpByRayon[h.rayonId] || 0) + 1;
    }
    for (const [rid, count] of Object.entries(helpByRayon)) {
      if (count >= 2) {
        const r = store.rayons.find((x) => x.id === Number(rid));
        alerts.push({ id: id++, type: "demande", priority: "moyenne", title: `Forte demande : ${r?.name}`, detail: `${count} demandes clients en cours` });
      }
    }
    const order = { haute: 0, moyenne: 1, basse: 2 };
    alerts.sort((a, b) => order[a.priority] - order[b.priority]);
    return alerts;
  }

  return {
    state,
    tick,
    stockStatus,
    zones,
    checkoutsView,
    managerDashboard,
    rayonPerformance,
    heatmap,
    operationalAlerts,
  };
}

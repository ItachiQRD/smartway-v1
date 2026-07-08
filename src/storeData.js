// SmartWay V1 - Modele de donnees simule.
// 1 magasin, 8 rayons, 30 produits, 4 caisses + Scan&Go, 5 collaborateurs,
// 10 clients, 5 demandes clients, promotions, taches, alertes, plan + heatmap.
// Grille : 0 = allee (accessible), 1 = rayon (obstacle), 2 = caisse (affichage).

export const GRID_WIDTH = 24;
export const GRID_HEIGHT = 18;

export const CELL_METERS = 1.3;
export const WALK_SPEED_MPS = 1.1;
export const SECONDS_PER_CELL = CELL_METERS / WALK_SPEED_MPS;
export const PICKUP_SECONDS = 20;
export const SECONDS_PER_ITEM_SCAN = 4.5;

// 4 blocs de rayons doubles, chacun coupe en haut/bas => 8 rayons.
const RACKS = [
  { baseX: 3, letter: "A" },
  { baseX: 8, letter: "B" },
  { baseX: 13, letter: "C" },
  { baseX: 18, letter: "D" },
];
const TOP_ROWS = [3, 5];
const BOTTOM_ROWS = [10, 12];

// 8 rayons (2 par bloc : haut puis bas).
const RAYONS = [
  { id: 0, rack: 0, half: "top", name: "Fruits & Legumes", icon: "🥕" },
  { id: 1, rack: 0, half: "bottom", name: "Boulangerie", icon: "🥖" },
  { id: 2, rack: 1, half: "top", name: "Cremerie & Frais", icon: "🧀" },
  { id: 3, rack: 1, half: "bottom", name: "Boucherie & Traiteur", icon: "🍗" },
  { id: 4, rack: 2, half: "top", name: "Epicerie salee", icon: "🍝" },
  { id: 5, rack: 2, half: "bottom", name: "Epicerie sucree", icon: "🍫" },
  { id: 6, rack: 3, half: "top", name: "Boissons", icon: "🥤" },
  { id: 7, rack: 3, half: "bottom", name: "Hygiene & Entretien", icon: "🧴" },
];

// 30 produits (marque, prix). rayonId reference RAYONS.
const PRODUCTS_DEF = [
  // Fruits & Legumes (0)
  { name: "Pommes Gala", brand: "Le Verger", rayonId: 0, price: 2.49 },
  { name: "Bananes", brand: "Chiquita", rayonId: 0, price: 1.89 },
  { name: "Tomates grappe", brand: "Prince de Bretagne", rayonId: 0, price: 2.99 },
  { name: "Salade en sachet", brand: "Florette", rayonId: 0, price: 1.59 },
  // Boulangerie (1)
  { name: "Baguette tradition", brand: "Maison", rayonId: 1, price: 1.1 },
  { name: "Pain de mie complet", brand: "Harry's", rayonId: 1, price: 1.95 },
  { name: "Croissants x6", brand: "Maison", rayonId: 1, price: 3.2 },
  { name: "Brioche tranchee", brand: "Pasquier", rayonId: 1, price: 2.45 },
  // Cremerie & Frais (2)
  { name: "Lait demi-ecreme 1L", brand: "Lactel", rayonId: 2, price: 1.15 },
  { name: "Beurre doux 250g", brand: "President", rayonId: 2, price: 2.35 },
  { name: "Yaourt nature x8", brand: "Danone", rayonId: 2, price: 2.8 },
  { name: "Oeufs plein air x12", brand: "Matines", rayonId: 2, price: 3.49 },
  // Boucherie & Traiteur (3)
  { name: "Filet de poulet", brand: "Le Gaulois", rayonId: 3, price: 6.9 },
  { name: "Jambon blanc x4", brand: "Herta", rayonId: 3, price: 3.15 },
  { name: "Saumon fume", brand: "Labeyrie", rayonId: 3, price: 5.49 },
  // Epicerie salee (4)
  { name: "Penne 500g", brand: "Barilla", rayonId: 4, price: 1.45 },
  { name: "Riz Basmati 1kg", brand: "Taureau Aile", rayonId: 4, price: 3.2 },
  { name: "Huile d'olive 75cl", brand: "Puget", rayonId: 4, price: 6.75 },
  { name: "Sauce tomate basilic", brand: "Panzani", rayonId: 4, price: 1.99 },
  // Epicerie sucree (5)
  { name: "Chocolat noir 70%", brand: "Lindt", rayonId: 5, price: 2.1 },
  { name: "Cafe moulu 250g", brand: "Carte Noire", rayonId: 5, price: 3.6 },
  { name: "Cereales miel", brand: "Kellogg's", rayonId: 5, price: 3.25 },
  { name: "Confiture fraise", brand: "Bonne Maman", rayonId: 5, price: 2.9 },
  // Boissons (6)
  { name: "Eau minerale 6x1.5L", brand: "Evian", rayonId: 6, price: 3.9 },
  { name: "Jus d'orange 1L", brand: "Tropicana", rayonId: 6, price: 2.65 },
  { name: "Soda cola 1.5L", brand: "Coca-Cola", rayonId: 6, price: 1.85 },
  { name: "Capsules cafe x10", brand: "Nespresso", rayonId: 6, price: 4.3 },
  // Hygiene & Entretien (7)
  { name: "Shampoing 250ml", brand: "Dove", rayonId: 7, price: 2.95 },
  { name: "Dentifrice", brand: "Signal", rayonId: 7, price: 1.75 },
  { name: "Lessive liquide", brand: "Ariel", rayonId: 7, price: 7.5 },
];

// Promotions (5) : productName -> remise %.
const PROMOS_DEF = [
  { name: "Bananes", percent: 20, label: "-20% cette semaine" },
  { name: "Croissants x6", percent: 15, label: "Offre boulangerie -15%" },
  { name: "Yaourt nature x8", percent: 10, label: "-10% fidelite" },
  { name: "Penne 500g", percent: 25, label: "Lot -25%" },
  { name: "Soda cola 1.5L", percent: 30, label: "Promo -30%" },
];

// Stocks initiaux particuliers (sinon calcule). 0 = rupture.
const STOCK_OVERRIDES = {
  "Saumon fume": 0,
  "Oeufs plein air x12": 0,
  "Soda cola 1.5L": 0,
  "Lessive liquide": 0,
  "Croissants x6": 0,
  "Bananes": 6,
  "Beurre doux 250g": 5,
  "Cafe moulu 250g": 4,
  "Eau minerale 6x1.5L": 7,
};

const COLLABORATORS = [
  { id: 1, name: "Sophie", rayonId: 0, online: true },
  { id: 2, name: "Karim", rayonId: 2, online: true },
  { id: 3, name: "Elodie", rayonId: 4, online: true },
  { id: 4, name: "Mathieu", rayonId: 6, online: false },
  { id: 5, name: "Ines", rayonId: 7, online: true },
];

const CLIENTS = [
  { id: 1, prenom: "Alex" },
  { id: 2, prenom: "Julie" },
  { id: 3, prenom: "Marc" },
  { id: 4, prenom: "Fatima" },
  { id: 5, prenom: "Lucas" },
  { id: 6, prenom: "Chloe" },
  { id: 7, prenom: "Hugo" },
  { id: 8, prenom: "Nadia" },
  { id: 9, prenom: "Thomas" },
  { id: 10, prenom: "Emma" },
];

function seeded(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function buildStore() {
  const grid = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => 0)
  );

  // Trace les blocs de rayons (haut: y 3-5, bas: y 10-12).
  for (const rack of RACKS) {
    for (const y of [3, 4, 5, 10, 11, 12]) {
      grid[y][rack.baseX] = 1;
      grid[y][rack.baseX + 1] = 1;
    }
  }

  // Bornes (bounding box) de chaque rayon, pour heatmap et plan.
  const rayonBounds = (r) => {
    const rack = RACKS[r.rack];
    const yMin = r.half === "top" ? 3 : 10;
    const yMax = r.half === "top" ? 6 : 13;
    return { xMin: rack.baseX - 1, xMax: rack.baseX + 2, yMin, yMax };
  };

  // Cellules (shelf + acces) disponibles par rayon.
  const cellsForRayon = (r) => {
    const rack = RACKS[r.rack];
    const rows = r.half === "top" ? TOP_ROWS : BOTTOM_ROWS;
    const cells = [];
    for (const row of rows) {
      cells.push({ shelf: { x: rack.baseX, y: row }, access: { x: rack.baseX - 1, y: row } });
      cells.push({ shelf: { x: rack.baseX + 1, y: row }, access: { x: rack.baseX + 2, y: row } });
    }
    return cells;
  };

  // Construit les produits en les placant dans leur rayon.
  const promoByName = new Map(PROMOS_DEF.map((p) => [p.name, p]));
  const rayonCellIdx = {};
  const products = PRODUCTS_DEF.map((def, i) => {
    const rayon = RAYONS[def.rayonId];
    const rack = RACKS[rayon.rack];
    const cells = cellsForRayon(rayon);
    const idx = rayonCellIdx[def.rayonId] ?? 0;
    rayonCellIdx[def.rayonId] = idx + 1;
    const cell = cells[idx];

    const pid = i + 1;
    const capacity = 30 + Math.floor(seeded(pid + 7) * 50);
    let stock = Math.round(capacity * (0.4 + seeded(pid + 3) * 0.55));
    if (def.name in STOCK_OVERRIDES) stock = STOCK_OVERRIDES[def.name];

    const promo = promoByName.get(def.name);
    const finalPrice = promo
      ? Math.round(def.price * (1 - promo.percent / 100) * 100) / 100
      : def.price;

    return {
      id: pid,
      sku: `SKU-${pid}`,
      ean: null,
      name: def.name,
      brand: def.brand,
      rayonId: def.rayonId,
      rayon: rayon.name,
      aisle: `Allee ${rack.letter}`,
      shelf: cell.shelf,
      access: cell.access,
      capacity,
      stock,
      basePrice: def.price,
      price: finalPrice,
      promo: promo ? { percent: promo.percent, label: promo.label, oldPrice: def.price } : null,
      dailySales: Math.floor(seeded(pid + 11) * 40),
      searches: Math.floor(seeded(pid + 17) * 60),
      notFound: Math.floor(seeded(pid + 23) * 8),
    };
  });

  // Caisses : 4 standards + 1 Scan&Go express.
  const checkouts = [
    { id: 1, name: "Caisse 1", type: "standard", access: { x: 4, y: 15 }, marker: { x: 4, y: 16 } },
    { id: 2, name: "Caisse 2", type: "standard", access: { x: 8, y: 15 }, marker: { x: 8, y: 16 } },
    { id: 3, name: "Caisse 3", type: "standard", access: { x: 13, y: 15 }, marker: { x: 13, y: 16 } },
    { id: 4, name: "Caisse 4", type: "standard", access: { x: 18, y: 15 }, marker: { x: 18, y: 16 } },
    { id: 5, name: "Scan & Go", type: "scango", access: { x: 21, y: 15 }, marker: { x: 21, y: 16 } },
  ].map((c, i) => ({
    ...c,
    open: true,
    queueLength: Math.floor(seeded(100 + i) * 4),
    secPerItem: c.type === "scango" ? SECONDS_PER_ITEM_SCAN * 0.5 : SECONDS_PER_ITEM_SCAN,
    processed: 0,
  }));
  for (const c of checkouts) grid[c.marker.y][c.marker.x] = 2;

  const entrance = { x: 1, y: 17 };

  const rayons = RAYONS.map((r) => {
    const b = rayonBounds(r);
    const rack = RACKS[r.rack];
    return {
      id: r.id,
      code: `R${r.id}`,
      name: r.name,
      icon: r.icon,
      aisle: `Allee ${rack.letter}`,
      bounds: b,
    };
  });

  // Demandes clients initiales (5), statuts varies.
  const now = Date.now();
  const min = 60 * 1000;
  const findProd = (name) => products.find((p) => p.name === name);
  const mkHelp = (id, prenom, prodName, urgence, status, message, ageMin) => {
    const p = findProd(prodName);
    return {
      id,
      clientName: prenom,
      productId: p.id,
      productName: p.name,
      rayonId: p.rayonId,
      rayon: p.rayon,
      aisle: p.aisle,
      urgence,
      status,
      message,
      comment: "",
      createdAt: now - ageMin * min,
      updatedAt: now - ageMin * min,
    };
  };
  const helpRequests = [
    mkHelp(1, "Julie", "Saumon fume", "Urgente", "Envoyee", "Je ne trouve pas le saumon fume.", 3),
    mkHelp(2, "Marc", "Huile d'olive 75cl", "Normale", "Acceptee", "Quelle etagere ?", 8),
    mkHelp(3, "Fatima", "Oeufs plein air x12", "Urgente", "En cours", "Rayon vide ?", 12),
    mkHelp(4, "Lucas", "Capsules cafe x10", "Faible", "Cloturee", "Trouve, merci !", 40),
    mkHelp(5, "Chloe", "Lessive liquide", "Normale", "Envoyee", "Rupture en rayon.", 1),
  ];

  // Taches de reassort initiales.
  const mkTask = (id, prodName, status, assignee) => {
    const p = findProd(prodName);
    return {
      id,
      productId: p.id,
      productName: p.name,
      rayonId: p.rayonId,
      rayon: p.rayon,
      aisle: p.aisle,
      status, // "ouverte" | "terminee"
      assignee,
      createdAt: now,
    };
  };
  const tasks = [
    mkTask(1, "Saumon fume", "ouverte", "Karim"),
    mkTask(2, "Croissants x6", "ouverte", "Sophie"),
    mkTask(3, "Lessive liquide", "ouverte", "Ines"),
  ];

  return {
    meta: { name: "Hyper Centre-Ville", brand: "SmartWay", slogan: "Chaque pas compte" },
    grid,
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    entrance,
    rayons,
    products,
    checkouts,
    collaborators: COLLABORATORS,
    clients: CLIENTS,
    helpRequests,
    tasks,
    seq: { help: helpRequests.length, task: tasks.length },
  };
}

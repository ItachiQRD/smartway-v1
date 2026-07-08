// Import / export catalogue produits et plan magasin pour une enseigne.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CELL_METERS } from "./storeData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, "..", "data", "templates");

const CONFIG_FILE =
  process.env.SMARTWAY_DATA_DIR
    ? path.join(process.env.SMARTWAY_DATA_DIR, "store-config.json")
    : process.env.VERCEL
      ? "/tmp/smartway-store-config.json"
      : path.join(__dirname, "..", "data", "store-config.json");

function readTemplate(name) {
  const p = path.join(TEMPLATE_DIR, name);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function getImportTemplates() {
  return {
    products: readTemplate("products.example.json"),
    layout: readTemplate("layout.example.json"),
    readme: {
      products: "POST /api/admin/import/products avec { mode: 'replace'|'merge', products: [...] }",
      layout: "POST /api/admin/import/layout avec le JSON plan (grille + rayons + caisses + entree)",
      exportProducts: "GET /api/admin/export/products",
      exportLayout: "GET /api/admin/export/layout",
    },
  };
}

function findWalkableNeighbor(grid, x, y) {
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (grid[ny]?.[nx] === 0) return { x: nx, y: ny };
  }
  return { x, y };
}

function resolveRayon(store, item) {
  if (item.rayonId != null) {
    const r = store.rayons.find((x) => x.id === Number(item.rayonId));
    if (r) return r;
  }
  if (item.rayonCode) {
    const r = store.rayons.find((x) => x.code === item.rayonCode || x.name === item.rayonCode);
    if (r) return r;
  }
  if (item.rayon) {
    const r = store.rayons.find((x) => x.name.toLowerCase() === String(item.rayon).toLowerCase());
    if (r) return r;
  }
  return null;
}

export function serializeLayout(store) {
  return {
    meta: {
      name: store.meta?.name,
      brand: store.meta?.brand,
      width: store.width,
      height: store.height,
      cellMeters: CELL_METERS,
    },
    entrance: store.entrance,
    grid: store.grid,
    rayons: store.rayons.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      icon: r.icon,
      aisle: r.aisle,
      bounds: r.bounds,
    })),
    checkouts: store.checkouts.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      access: c.access,
      marker: c.marker,
      open: c.open,
    })),
  };
}

export function serializeCatalog(store) {
  return {
    exportedAt: new Date().toISOString(),
    count: store.products.length,
    products: store.products.map((p) => {
      const rayon = store.rayons.find((r) => r.id === p.rayonId);
      return {
        sku: p.sku || String(p.id),
        ean: p.ean || null,
        name: p.name,
        brand: p.brand,
        rayonId: p.rayonId,
        rayonCode: rayon?.code,
        rayon: p.rayon,
        aisle: p.aisle,
        price: p.basePrice ?? p.price,
        promo: p.promo,
        stock: p.stock,
        capacity: p.capacity,
        shelf: p.shelf,
        access: p.access,
      };
    }),
  };
}

export function applyLayoutImport(store, payload) {
  const { meta, grid, entrance, rayons, checkouts } = payload || {};
  if (!Array.isArray(grid) || !grid.length || !Array.isArray(grid[0])) {
    throw new Error("Plan invalide : grille 2D requise (0=allee, 1=rayon, 2=caisse)");
  }
  const height = grid.length;
  const width = grid[0].length;
  if (!entrance || entrance.x == null || entrance.y == null) {
    throw new Error("Plan invalide : point d'entree { x, y } requis");
  }
  if (grid[entrance.y][entrance.x] !== 0) {
    throw new Error("L'entree doit etre sur une allee (cellule 0)");
  }

  store.grid = grid;
  store.width = meta?.width ?? width;
  store.height = meta?.height ?? height;
  store.entrance = { x: Number(entrance.x), y: Number(entrance.y) };
  if (meta?.name) store.meta = { ...store.meta, name: meta.name };
  if (meta?.brand) store.meta = { ...store.meta, brand: meta.brand };

  if (Array.isArray(rayons) && rayons.length) {
    store.rayons = rayons.map((r, i) => ({
      id: r.id ?? i,
      code: r.code || `R${r.id ?? i}`,
      name: r.name,
      icon: r.icon || "🏷️",
      aisle: r.aisle || `Allee ${String.fromCharCode(65 + (i % 26))}`,
      bounds: r.bounds,
    }));
  }

  if (Array.isArray(checkouts) && checkouts.length) {
    store.checkouts = checkouts.map((c, i) => ({
      id: c.id ?? i + 1,
      name: c.name || `Caisse ${i + 1}`,
      type: c.type === "scango" ? "scango" : "standard",
      access: c.access,
      marker: c.marker || c.access,
      open: c.open !== false,
      queueLength: c.queueLength ?? 0,
      secPerItem: c.type === "scango" ? 2.25 : 4.5,
      processed: 0,
    }));
  }

  return { width: store.width, height: store.height, rayons: store.rayons.length, checkouts: store.checkouts.length };
}

function mapImportProduct(store, item, id) {
  const rayon = resolveRayon(store, item);
  if (!rayon) throw new Error(`Rayon introuvable pour le produit « ${item.name} »`);

  let shelf = item.shelf;
  let access = item.access;
  if (shelf?.x != null && shelf?.y != null) {
    shelf = { x: Number(shelf.x), y: Number(shelf.y) };
    access = access?.x != null ? { x: Number(access.x), y: Number(access.y) } : findWalkableNeighbor(store.grid, shelf.x, shelf.y);
  } else if (rayon.bounds) {
    const { xMin, xMax, yMin } = rayon.bounds;
    shelf = { x: xMin + 1, y: yMin + 1 };
    access = findWalkableNeighbor(store.grid, shelf.x, shelf.y);
  } else {
    shelf = { x: store.entrance.x + 1, y: store.entrance.y };
    access = findWalkableNeighbor(store.grid, shelf.x, shelf.y);
  }

  const basePrice = Number(item.price);
  const promo = item.promo?.percent
    ? {
        percent: Number(item.promo.percent),
        label: item.promo.label || `-${item.promo.percent}%`,
        oldPrice: basePrice,
      }
    : null;
  const price = promo ? Math.round(basePrice * (1 - promo.percent / 100) * 100) / 100 : basePrice;
  const capacity = Number(item.capacity) || 40;
  const stock = item.stock != null ? Number(item.stock) : capacity;

  return {
    id,
    sku: item.sku || item.ean || `SKU-${id}`,
    ean: item.ean || null,
    name: String(item.name),
    brand: String(item.brand || ""),
    rayonId: rayon.id,
    rayon: rayon.name,
    aisle: item.aisle || rayon.aisle,
    shelf,
    access,
    capacity,
    stock,
    basePrice,
    price,
    promo,
    dailySales: Number(item.dailySales) || 0,
    searches: Number(item.searches) || 0,
    notFound: Number(item.notFound) || 0,
  };
}

export function applyCatalogImport(store, payload) {
  const { mode = "replace", products } = payload || {};
  if (!Array.isArray(products) || !products.length) {
    throw new Error("Catalogue vide : fournissez un tableau products");
  }

  if (mode === "merge") {
    let maxId = Math.max(0, ...store.products.map((p) => p.id));
    const bySku = new Map(store.products.map((p) => [p.sku || String(p.id), p]));
    for (const item of products) {
      const key = item.sku || item.ean;
      const existing = key ? bySku.get(key) : null;
      if (existing) {
        Object.assign(existing, mapImportProduct(store, item, existing.id));
      } else {
        maxId += 1;
        const p = mapImportProduct(store, item, maxId);
        store.products.push(p);
        if (key) bySku.set(key, p);
      }
    }
    return { mode, imported: products.length, total: store.products.length };
  }

  const mapped = products.map((item, i) => mapImportProduct(store, item, i + 1));
  store.products = mapped;
  return { mode: "replace", imported: mapped.length, total: mapped.length };
}

export function loadStoreConfig(store) {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return false;
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    if (raw.layout) applyLayoutImport(store, raw.layout);
    if (raw.catalog) applyCatalogImport(store, { mode: "replace", ...raw.catalog });
    return true;
  } catch (err) {
    console.warn("[import] config ignoree:", err.message);
    return false;
  }
}

export function saveStoreConfig(store) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(
        {
          savedAt: Date.now(),
          layout: serializeLayout(store),
          catalog: { products: serializeCatalog(store).products },
        },
        null,
        2
      )
    );
    return true;
  } catch (err) {
    console.warn("[import] sauvegarde config ignoree:", err.message);
    return false;
  }
}

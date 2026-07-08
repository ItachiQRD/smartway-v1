// Persistance de l'etat mutable de la demo (demandes, taches, stocks).
// Local : data/demo-state.json · Vercel : /tmp/smartway-demo-state.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR =
  process.env.SMARTWAY_DATA_DIR ||
  (process.env.VERCEL ? "/tmp" : path.join(__dirname, "..", "data"));
const STATE_FILE = path.join(DATA_DIR, "demo-state.json");

let saveTimer = null;
let seedSnapshot = null;

function captureMutable(store) {
  return {
    helpRequests: JSON.parse(JSON.stringify(store.helpRequests)),
    tasks: JSON.parse(JSON.stringify(store.tasks)),
    seq: { ...store.seq },
    stocks: Object.fromEntries(store.products.map((p) => [p.id, p.stock])),
  };
}

function applyMutable(store, data) {
  if (data.helpRequests) store.helpRequests = data.helpRequests;
  if (data.tasks) store.tasks = data.tasks;
  if (data.seq) store.seq = { ...store.seq, ...data.seq };
  if (data.stocks) {
    for (const [id, stock] of Object.entries(data.stocks)) {
      const p = store.products.find((x) => x.id === Number(id));
      if (p != null) p.stock = stock;
    }
  }
}

export function initPersistence(store) {
  seedSnapshot = captureMutable(store);
  try {
    if (!fs.existsSync(STATE_FILE)) return false;
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    applyMutable(store, raw);
    return true;
  } catch (err) {
    console.warn("[persist] chargement ignore:", err.message);
    return false;
  }
}

export function schedulePersist(store) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persistNow(store), 350);
}

export function persistNow(store) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const payload = {
      savedAt: Date.now(),
      ...captureMutable(store),
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn("[persist] sauvegarde ignoree:", err.message);
    return false;
  }
}

export function resetMutableState(store) {
  if (!seedSnapshot) seedSnapshot = captureMutable(store);
  applyMutable(store, seedSnapshot);
  persistNow(store);
}

// Calcul de parcours sur la grille du magasin.
// On utilise un BFS (grille non ponderee) pour les distances et la
// reconstruction de chemin, puis une heuristique "plus proche voisin"
// pour ordonner les arrets de la liste de courses.

import { SECONDS_PER_CELL, PICKUP_SECONDS, SECONDS_PER_ITEM_SCAN } from "./storeData.js";

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

function key(x, y) {
  return `${x},${y}`;
}

function isWalkable(grid, x, y) {
  return (
    y >= 0 &&
    y < grid.length &&
    x >= 0 &&
    x < grid[0].length &&
    grid[y][x] === 0
  );
}

// BFS depuis une cellule : renvoie distances et predecesseurs.
function bfs(grid, start) {
  const dist = new Map();
  const prev = new Map();
  const q = [start];
  dist.set(key(start.x, start.y), 0);
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    const d = dist.get(key(cur.x, cur.y));
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!isWalkable(grid, nx, ny)) continue;
      const k = key(nx, ny);
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      prev.set(k, cur);
      q.push({ x: nx, y: ny });
    }
  }
  return { dist, prev };
}

function reconstruct(prev, start, goal) {
  const path = [];
  let cur = goal;
  const startKey = key(start.x, start.y);
  while (cur && key(cur.x, cur.y) !== startKey) {
    path.push(cur);
    cur = prev.get(key(cur.x, cur.y));
  }
  path.push(start);
  return path.reverse();
}

// Ordonne les arrets (plus proche voisin) puis trace le chemin complet.
export function planRoute(store, productIds) {
  const { grid, entrance, products, checkouts } = store;

  const selected = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

  // BFS depuis chaque point d'interet (entree + acces produits).
  const nodes = [{ name: "entree", cell: entrance }];
  for (const p of selected) {
    nodes.push({ name: p.name, cell: p.access, product: p });
  }
  const bfsCache = new Map();
  const getBfs = (cell) => {
    const k = key(cell.x, cell.y);
    if (!bfsCache.has(k)) bfsCache.set(k, bfs(grid, cell));
    return bfsCache.get(k);
  };

  const distBetween = (a, b) => {
    const { dist } = getBfs(a);
    return dist.get(key(b.x, b.y)) ?? Infinity;
  };

  // Plus proche voisin depuis l'entree.
  const remaining = [...selected];
  const ordered = [];
  let current = entrance;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distBetween(current, remaining[i].access);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next.access;
  }

  // Recommandation de caisse : on tient compte de la file, du nombre
  // d'articles et de la distance depuis le dernier arret.
  const itemCount = selected.length;
  const lastCell = current;
  const checkoutEval = checkouts
    .filter((c) => c.open)
    .map((c) => {
      const eligible = true; // toutes les caisses sont eligibles (Scan&Go inclus)
      const distCells = distBetween(lastCell, c.access);
      const walkSec = distCells * SECONDS_PER_CELL;
      // File d'attente : on suppose ~12 articles par client devant.
      const queueSec = c.queueLength * 12 * c.secPerItem;
      const scanSec = itemCount * c.secPerItem;
      const waitSec = queueSec + scanSec + walkSec;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        queueLength: c.queueLength,
        eligible,
        walkSec: Math.round(walkSec),
        estimatedWaitSec: Math.round(waitSec),
      };
    });

  const eligibleCheckouts = checkoutEval.filter((c) => c.eligible);
  const recommended = eligibleCheckouts.reduce(
    (best, c) => (c.estimatedWaitSec < best.estimatedWaitSec ? c : best),
    eligibleCheckouts[0]
  );
  const recommendedCheckout = checkouts.find((c) => c.id === recommended?.id);

  // Construit le chemin complet : entree -> arrets -> caisse.
  const waypoints = [entrance, ...ordered.map((p) => p.access)];
  if (recommendedCheckout) waypoints.push(recommendedCheckout.access);

  const fullPath = [];
  let walkCells = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const { prev } = getBfs(a);
    const seg = reconstruct(prev, a, b);
    walkCells += seg.length - 1;
    if (i > 0) seg.shift(); // evite de dupliquer le point de jonction
    fullPath.push(...seg);
  }

  const walkSeconds = walkCells * SECONDS_PER_CELL;
  const pickupSeconds = itemCount * PICKUP_SECONDS;
  const checkoutSeconds = recommended ? recommended.estimatedWaitSec : 0;
  const totalSeconds = walkSeconds + pickupSeconds + checkoutSeconds;

  return {
    stops: ordered.map((p, i) => ({
      order: i + 1,
      id: p.id,
      name: p.name,
      brand: p.brand,
      rayon: p.rayon,
      aisle: p.aisle,
      shelf: p.shelf,
      access: p.access,
      price: p.price,
      inStock: p.stock > 0,
    })),
    path: fullPath,
    distanceMeters: Math.round(walkCells * 1.3),
    estimate: {
      walkSeconds: Math.round(walkSeconds),
      pickupSeconds: Math.round(pickupSeconds),
      checkoutSeconds: Math.round(checkoutSeconds),
      totalSeconds: Math.round(totalSeconds),
      totalMinutes: Math.round(totalSeconds / 60),
    },
    checkouts: checkoutEval.sort((a, b) => a.estimatedWaitSec - b.estimatedWaitSec),
    recommendedCheckout: recommended
      ? { id: recommended.id, name: recommended.name, waitSec: recommended.estimatedWaitSec }
      : null,
  };
}

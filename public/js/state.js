// Etat partage cote client (liste de courses, parcours en cours, donnees de base).

const CART_KEY = "smartway_cart_v1";
const ROUTE_KEY = "smartway_route_v1";
const PROGRESS_KEY = "smartway_progress_v1";

export const state = {
  bootstrap: null,
  cart: new Map(),
  route: null,
  routeProgress: new Set(),
  helpProductId: null,
  selectedProductId: null,
};

export function loadClientState() {
  try {
    const rawCart = localStorage.getItem(CART_KEY);
    if (rawCart) {
      const parsed = JSON.parse(rawCart);
      state.cart.clear();
      for (const [id, item] of Object.entries(parsed)) {
        if (item?.product) state.cart.set(Number(id), item);
      }
    }
    const rawRoute = localStorage.getItem(ROUTE_KEY);
    if (rawRoute) state.route = JSON.parse(rawRoute);
    const rawProgress = localStorage.getItem(PROGRESS_KEY);
    if (rawProgress) state.routeProgress = new Set(JSON.parse(rawProgress));
  } catch {
    /* ignore */
  }
}

export function saveClientState() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(Object.fromEntries(state.cart)));
    localStorage.setItem(ROUTE_KEY, state.route ? JSON.stringify(state.route) : "");
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...state.routeProgress]));
  } catch {
    /* ignore */
  }
}

export function clearClientState() {
  state.cart.clear();
  state.route = null;
  state.routeProgress.clear();
  state.helpProductId = null;
  state.selectedProductId = null;
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(ROUTE_KEY);
  localStorage.removeItem(PROGRESS_KEY);
}

export function cartItems() {
  return [...state.cart.values()];
}

export function cartCount() {
  return cartItems().reduce((s, i) => s + i.qty, 0);
}

export function cartTotal() {
  return cartItems().reduce((s, i) => s + i.product.price * i.qty, 0);
}

export function cartSavings() {
  return cartItems().reduce(
    (s, i) => s + (i.product.promo ? (i.product.promo.oldPrice - i.product.price) * i.qty : 0),
    0
  );
}

export function addToCart(product, qty = 1) {
  const existing = state.cart.get(product.id);
  if (existing) existing.qty += qty;
  else state.cart.set(product.id, { product, qty });
  saveClientState();
}

export function setQty(productId, qty) {
  const it = state.cart.get(productId);
  if (!it) return;
  if (qty <= 0) state.cart.delete(productId);
  else it.qty = qty;
  saveClientState();
}

export function removeFromCart(productId) {
  state.cart.delete(productId);
  saveClientState();
}

export function replaceInCart(oldId, product) {
  const it = state.cart.get(oldId);
  const qty = it ? it.qty : 1;
  state.cart.delete(oldId);
  addToCart(product, qty);
}

export function setRoute(route) {
  state.route = route;
  state.routeProgress = new Set();
  saveClientState();
}

export function markRouteProgress(productId) {
  state.routeProgress.add(productId);
  saveClientState();
}

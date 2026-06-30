// Etat partage cote client (liste de courses, parcours en cours, donnees de base).

export const state = {
  bootstrap: null, // donnees magasin (rayons, plan, promos...)
  cart: new Map(), // productId -> { product, qty }
  route: null, // dernier parcours calcule
  routeProgress: new Set(), // ids de produits "trouves"
};

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
}

export function setQty(productId, qty) {
  const it = state.cart.get(productId);
  if (!it) return;
  if (qty <= 0) state.cart.delete(productId);
  else it.qty = qty;
}

export function removeFromCart(productId) {
  state.cart.delete(productId);
}

export function replaceInCart(oldId, product) {
  const it = state.cart.get(oldId);
  const qty = it ? it.qty : 1;
  state.cart.delete(oldId);
  addToCart(product, qty);
}

// Couche d'acces a l'API SmartWay + gestion de session.

const TOKEN_KEY = "smartway_token";
const USER_KEY = "smartway_user";

export function getSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);
  if (!token || !user) return null;
  return { token, ...JSON.parse(user) };
}

export function setSession(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify({ name: data.name, role: data.role }));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(method, url, body) {
  const session = getSession();
  const headers = { "Content-Type": "application/json" };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearSession();
    location.hash = "";
    window.dispatchEvent(new CustomEvent("smartway:unauthorized"));
    throw new Error("Session expiree — reconnectez-vous");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${res.status}`);
  }
  return res.json();
}

const qs = (params) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return s ? `?${s}` : "";
};

export const api = {
  login: (name, role) => request("POST", "/api/login", { name, role }),
  logout: () => request("POST", "/api/logout"),
  bootstrap: () => request("GET", "/api/bootstrap"),

  products: (params = {}) => request("GET", "/api/products" + qs(params)),
  product: (id) => request("GET", `/api/products/${id}`),
  route: (productIds) => request("POST", "/api/route", { productIds }),
  checkouts: (items) => request("GET", "/api/checkouts" + qs({ items })),

  help: () => request("GET", "/api/help"),
  createHelp: (payload) => request("POST", "/api/help", payload),
  helpStatus: (id, payload) => request("POST", `/api/help/${id}/status`, payload),

  staffDashboard: () => request("GET", "/api/staff/dashboard"),
  stock: () => request("GET", "/api/stock"),
  restock: (id, quantity) => request("POST", `/api/stock/${id}/restock`, { quantity }),
  tasks: () => request("GET", "/api/tasks"),
  createTask: (productId) => request("POST", "/api/tasks", { productId }),
  completeTask: (id) => request("POST", `/api/tasks/${id}/complete`),

  managerDashboard: () => request("GET", "/api/manager/dashboard"),
  managerRayons: () => request("GET", "/api/manager/rayons"),
  managerHeatmap: () => request("GET", "/api/manager/heatmap"),
  managerAlerts: () => request("GET", "/api/manager/alerts"),
};

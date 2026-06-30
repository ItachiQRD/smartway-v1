// SmartWay - Shell de l'application : landing, login, routeur et navigation.

import { api, getSession, setSession, clearSession } from "./api.js";
import { h, toast } from "./ui.js";
import { state } from "./state.js";
import { clientModule } from "./client.js";
import { staffModule } from "./staff.js";
import { managerModule } from "./manager.js";
import { mountLanding } from "./landing.js";

const root = document.getElementById("root");
const MODULES = {
  client: clientModule,
  collaborateur: staffModule,
  manager: managerModule,
};
const ROLE_LABEL = { client: "Client", collaborateur: "Collaborateur", manager: "Manager" };

let pageCleanup = () => {};

// ---------- LANDING ----------
function renderLanding() {
  pageCleanup();
  pageCleanup = () => {};
  document.body.classList.remove("in-app");
  root.innerHTML = "";
  const cleanup = mountLanding(root, { onSelectRole: openLogin });
  pageCleanup = cleanup || (() => {});
}

// ---------- LOGIN MODAL ----------
function openLogin(role) {
  const clients = state.bootstrap?.clients || [
    { id: 1, prenom: "Alex" },
    { id: 2, prenom: "Julie" },
    { id: 3, prenom: "Marc" },
  ];
  const isClient = role === "client";
  const overlay = h(`
    <div class="modal-overlay">
      <div class="modal">
        <h2>Espace ${ROLE_LABEL[role]}</h2>
        <p class="modal-sub">Connexion de demonstration — aucune donnee reelle.</p>
        <label for="login-name">${isClient ? "Votre prenom" : "Votre nom"}</label>
        <input id="login-name" type="text" value="${isClient ? "Alex" : role === "manager" ? "Lea" : "Sophie"}" />
        ${isClient ? `<label>Clients de demo</label><div class="chip-row" id="client-chips">${clients
          .map((c) => `<button type="button" class="chip" data-name="${c.prenom}">${c.prenom}</button>`)
          .join("")}</div>` : ""}
        <button class="btn btn-primary btn-block" id="login-submit" style="margin-top:20px;">Entrer dans l'espace</button>
        <button class="btn btn-ghost btn-block" id="login-cancel" style="margin-top:8px;">Retour</button>
        <p class="error-msg" id="login-error"></p>
      </div>
    </div>
  `);
  const nameInput = overlay.querySelector("#login-name");
  overlay.querySelectorAll("#client-chips .chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      nameInput.value = chip.dataset.name;
    })
  );
  overlay.querySelector("#login-cancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector("#login-submit").addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) {
      overlay.querySelector("#login-error").textContent = "Merci d'indiquer un nom.";
      return;
    }
    try {
      const data = await api.login(name, role);
      setSession(data);
      overlay.remove();
      await enterApp(`${role}/${MODULES[role].nav[0].key}`);
    } catch (err) {
      overlay.querySelector("#login-error").textContent = err.message;
    }
  });
  root.appendChild(overlay);
  nameInput.focus();
}

// ---------- APP SHELL ----------
async function enterApp(hash) {
  if (hash) location.hash = hash;
  const session = getSession();
  if (!session) return renderLanding();

  // Nettoie les ecouteurs de la landing (scroll/resize) avant d'entrer.
  pageCleanup();
  pageCleanup = () => {};
  document.body.classList.add("in-app");

  if (!state.bootstrap) {
    try {
      state.bootstrap = await api.bootstrap();
    } catch (_) {}
  }

  const mod = MODULES[session.role];
  const initials = session.name.slice(0, 2).toUpperCase();
  root.innerHTML = "";
  const shell = h(`
    <div class="app">
      <div class="appbar">
        <div class="left">
          <button class="menu-btn" id="menu-btn">☰</button>
          <div class="logo"><span class="logo-mark">S</span> SmartWay</div>
        </div>
        <div class="right">
          <span class="role-tag ${session.role}">${ROLE_LABEL[session.role]}</span>
          <div class="user-chip"><span class="avatar">${initials}</span><span>${session.name}</span></div>
          <button class="btn btn-ghost btn-sm" id="logout-btn">Quitter</button>
        </div>
      </div>
      <div class="shell">
        <aside class="sidebar" id="sidebar"></aside>
        <main class="content" id="content"></main>
      </div>
    </div>
  `);
  root.appendChild(shell);

  const sidebar = shell.querySelector("#sidebar");
  const content = shell.querySelector("#content");

  const menuBtn = shell.querySelector("#menu-btn");
  menuBtn.addEventListener("click", () => toggleSidebar(true));
  shell.querySelector("#logout-btn").addEventListener("click", logout);

  const ctx = {
    session,
    bootstrap: state.bootstrap,
    content,
    navigate(key) {
      location.hash = `${session.role}/${key}`;
    },
    refreshNav() {
      renderSidebar();
    },
    toast,
  };

  function toggleSidebar(open) {
    if (window.innerWidth > 860) return;
    if (open) {
      sidebar.classList.add("open");
      const scrim = h(`<div class="scrim" id="scrim"></div>`);
      scrim.addEventListener("click", () => toggleSidebar(false));
      shell.appendChild(scrim);
    } else {
      sidebar.classList.remove("open");
      shell.querySelector("#scrim")?.remove();
    }
  }

  function renderSidebar() {
    sidebar.innerHTML = "";
    const current = currentPageKey(session.role);
    for (const item of mod.nav) {
      const badge = item.badge ? item.badge(ctx) : null;
      const navEl = h(`
        <a class="nav-item ${item.key === current ? "active" : ""}">
          <span class="nav-ico">${item.icon}</span>
          <span>${item.label}</span>
          ${badge ? `<span class="nav-badge">${badge}</span>` : ""}
        </a>
      `);
      navEl.addEventListener("click", () => {
        ctx.navigate(item.key);
        toggleSidebar(false);
      });
      sidebar.appendChild(navEl);
    }
  }

  async function renderPage() {
    const key = currentPageKey(session.role);
    const page = mod.pages[key] || mod.pages[mod.nav[0].key];
    renderSidebar();
    pageCleanup();
    pageCleanup = () => {};
    content.innerHTML = `<div class="page-head"><h1>${page.title}</h1><p>${page.subtitle || ""}</p></div><div id="page-body"></div>`;
    const body = content.querySelector("#page-body");
    try {
      const cleanup = await page.render(body, ctx);
      if (typeof cleanup === "function") pageCleanup = cleanup;
    } catch (err) {
      body.innerHTML = `<div class="banner red">${err.message}</div>`;
    }
  }

  shell._renderPage = renderPage;
  await renderPage();
}

function currentPageKey(role) {
  const hash = location.hash.replace(/^#/, "");
  const [r, key] = hash.split("/");
  if (r === role && key) return key;
  return MODULES[role].nav[0].key;
}

async function logout() {
  try {
    await api.logout();
  } catch (_) {}
  clearSession();
  state.bootstrap = null;
  state.cart.clear();
  state.route = null;
  state.routeProgress.clear();
  location.hash = "";
  renderLanding();
}

// ---------- ROUTING ----------
window.addEventListener("hashchange", () => {
  const session = getSession();
  if (!session) return renderLanding();
  const hash = location.hash.replace(/^#/, "");
  const role = hash.split("/")[0];
  if (role !== session.role) {
    // Re-render shell pour le bon role.
    enterApp();
    return;
  }
  const appEl = root.querySelector(".app");
  if (appEl && appEl._renderPage) appEl._renderPage();
  else enterApp();
});

// ---------- BOOT ----------
(async () => {
  const session = getSession();
  if (session) await enterApp();
  else renderLanding();
})();

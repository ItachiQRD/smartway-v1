// SmartWay - Shell de l'application : landing, login, routeur et navigation.

import { api, getSession, setSession, clearSession } from "./api.js";
import { h, toast } from "./ui.js";
import { state, loadClientState, clearClientState } from "./state.js";
import { clientModule } from "./client.js";
import { staffModule } from "./staff.js";
import { managerModule } from "./manager.js";
import { mountLanding } from "./landing.js";
import { createGuidedDemo } from "./demoGuide.js";

const root = document.getElementById("root");
const MODULES = {
  client: clientModule,
  collaborateur: staffModule,
  manager: managerModule,
};
const ROLE_LABEL = { client: "Client", collaborateur: "Collaborateur", manager: "Manager" };
const DEMO_USERS = { client: "Alex", collaborateur: "Sophie", manager: "Lea" };

let pageCleanup = () => {};
let appShell = null;
let appCtx = null;

const guidedDemo = createGuidedDemo({
  ensureRole: async (role) => {
    const session = getSession();
    if (!session) await quickEnter(role);
    else if (session.role !== role) await switchRole(role);
  },
  switchRole,
  navigate: (key) => {
    const session = getSession();
    if (session) location.hash = `${session.role}/${key}`;
  },
  refreshNav: () => appCtx?.refreshNav(),
  refreshPage: () => appShell?._renderPage?.(),
  onEnd: () => document.body.classList.remove("guide-running"),
});

// Connexion demo en 1 clic (sans modal).
async function quickEnter(role) {
  try {
    const data = await api.login(DEMO_USERS[role], role);
    setSession(data);
    pageCleanup();
    pageCleanup = () => {};
    await enterApp(`${role}/${MODULES[role].nav[0].key}`);
  } catch (err) {
    toast(err.message || "Connexion impossible");
  }
}

async function switchRole(role) {
  if (!MODULES[role]) return;
  const session = getSession();
  if (session?.role === role) return;
  try {
    const data = await api.login(DEMO_USERS[role], role);
    setSession(data);
    state.bootstrap = null;
    pageCleanup();
    pageCleanup = () => {};
    toast(`Espace ${ROLE_LABEL[role]} — exploration demo`);
    await enterApp(`${role}/${MODULES[role].nav[0].key}`);
  } catch (err) {
    toast(err.message || "Changement d'espace impossible");
  }
}

async function startGuidedFromLanding() {
  pageCleanup();
  await quickEnter("client");
  await guidedDemo.start();
}

// ---------- LANDING ----------
function renderLanding() {
  pageCleanup();
  pageCleanup = () => {};
  document.body.classList.remove("in-app");
  root.innerHTML = "";
  const cleanup = mountLanding(root, {
    onSelectRole: quickEnter,
    onStartDemo: () => quickEnter("client"),
    onStartGuided: startGuidedFromLanding,
  });
  pageCleanup = cleanup || (() => {});
}

// ---------- APP SHELL ----------
async function enterApp(hash) {
  if (hash) location.hash = hash;
  const session = getSession();
  if (!session) return renderLanding();

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
          <button class="btn btn-secondary btn-sm guide-launch" id="guide-btn" type="button">▶ Presentation</button>
          <div class="role-switch" id="role-switch">
            ${Object.entries(ROLE_LABEL)
              .map(
                ([key, label]) =>
                  `<button type="button" class="role-btn ${key} ${session.role === key ? "active" : ""}" data-role="${key}" title="Espace ${label}">${label}</button>`
              )
              .join("")}
          </div>
          <span class="role-tag ${session.role}">${ROLE_LABEL[session.role]}</span>
          <div class="user-chip"><span class="avatar">${initials}</span><span class="user-name">${session.name}</span></div>
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
  appShell = shell;

  const sidebar = shell.querySelector("#sidebar");
  const content = shell.querySelector("#content");

  const menuBtn = shell.querySelector("#menu-btn");
  menuBtn.addEventListener("click", () => toggleSidebar(true));
  shell.querySelector("#logout-btn").addEventListener("click", logout);
  shell.querySelector("#guide-btn").addEventListener("click", () => guidedDemo.start());
  shell.querySelectorAll("#role-switch [data-role]").forEach((btn) =>
    btn.addEventListener("click", () => switchRole(btn.dataset.role))
  );

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
  appCtx = ctx;

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
  guidedDemo.stop(true);
  try {
    await api.logout();
  } catch (_) {}
  clearSession();
  state.bootstrap = null;
  clearClientState();
  appShell = null;
  appCtx = null;
  location.hash = "";
  renderLanding();
}

// ---------- ROUTING ----------
window.addEventListener("smartway:unauthorized", () => renderLanding());

window.addEventListener("hashchange", () => {
  const session = getSession();
  if (!session) return renderLanding();
  const hash = location.hash.replace(/^#/, "");
  const hashRole = hash.split("/")[0];
  if (hashRole && hashRole !== session.role && MODULES[hashRole]) {
    switchRole(hashRole);
    return;
  }
  const appEl = root.querySelector(".app");
  if (appEl && appEl._renderPage) appEl._renderPage();
  else enterApp();
});

// ---------- BOOT ----------
loadClientState();
(async () => {
  const session = getSession();
  if (session) await enterApp();
  else renderLanding();
})();

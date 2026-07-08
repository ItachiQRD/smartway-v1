# SmartWay — Chaque pas compte

MVP RetailTech (V1) qui démontre la valeur de SmartWay pour une enseigne, sur **trois profils** :

- **Client** — gagne du temps : liste de courses, parcours optimisé sur le plan, délai estimé, caisse la plus rapide, Scan & Go et demande d'aide.
- **Collaborateur** — gagne en efficacité : demandes clients, alertes stock, tâches de réassort, rayons prioritaires.
- **Manager** — pilote son magasin : KPIs temps réel, performance des rayons, heatmap des flux, alertes opérationnelles, suivi des demandes.

> Identité : vert premium / bleu nuit / blanc · interface SaaS, moderne, **mobile-first**. Slogan : « Chaque pas compte. »

## Stack

- **Backend** : Node.js + Express. Toutes les données sont **simulées en mémoire** (aucun système réel connecté) et évoluent automatiquement toutes les 2 s.
- **Parcours** : BFS sur la grille du magasin + heuristique « plus proche voisin » pour ordonner les arrêts ; recommandation de caisse selon file, nombre d'articles et distance.
- **Frontend** : SPA en HTML/CSS/JS (modules ES, sans build). **Landing immersive « scroll-telling »** (inspiration GTA VI) : hero épinglé animé au scroll, sections révélées, et aperçu du circuit dans un mockup de téléphone où le parcours se trace au fil du défilement. Puis choix du profil → login fictif → espace par rôle. Plan et graphiques dessinés au `<canvas>`.

## Démarrage

```bash
npm install
npm start
```

Puis ouvrir http://localhost:3000 (développement : `npm run dev`).

## Scénario de démonstration (< 10 min)

**Mode rapide — Présentation guidée (~90 s)** : bouton **« ▶ Présentation guidée »** sur la landing ou **« ▶ Présentation »** dans l'app. Enchaîne automatiquement Client → Collaborateur → Manager (liste, parcours, demande d'aide, traitement, heatmap).

**Exploration libre** :
2. Ajouter des produits (promotions ou recherche), puis **Lancer mon parcours** : le plan affiche l'itinéraire numéroté, le temps restant et le prochain rayon. Cliquer **Produit trouvé** pour avancer, puis **Voir les caisses** → caisse recommandée + **Scan & Go**.
3. Depuis le parcours, **Demander de l'aide** sur un produit (statut « Envoyée »).
4. Se déconnecter → entrer en **Collaborateur** : la demande apparaît dans *Demandes clients* ; l'accepter, la passer *En cours*, la **clôturer**. Gérer *Stocks & réassorts* et *Tâches*.
5. Entrer en **Manager** : tableau de bord temps réel (visiteurs, panier moyen, satisfaction, CA), *Performance rayons*, *Heatmap des flux*, *Alertes opérationnelles*.

## Données simulées

1 magasin · 8 rayons · 30 produits (marque, prix, promo, stock, allée) · 4 caisses + 1 Scan & Go · 5 collaborateurs · 10 clients · demandes clients · tâches de réassort · 5 promotions · plan + heatmap.

## Structure

```
server.js              Serveur Express + API + boucle de simulation
src/
  storeData.js         Magasin : plan, rayons, produits, caisses, collaborateurs, clients, demandes, tâches
  pathfinding.js       BFS, ordonnancement des arrêts, délais, budget, choix de caisse
  simulation.js        Temps réel : KPIs, perf rayons, recherches, heatmap, alertes
public/
  index.html           Coquille SPA
  css/styles.css       Design system SmartWay
  js/
    app.js             Login, routeur, shell + navigation
    landing.js         Landing immersive animee au scroll (hero + circuit)
    api.js             Accès API + session
    state.js           Etat client (liste de courses, parcours)
    ui.js              Utilitaires (toast, formats)
    map.js             Plan & heatmap (canvas)
    client.js          Espace client (8 pages)
    staff.js           Espace collaborateur (5 pages)
    manager.js         Espace manager (4 pages)
```

## API (extrait)

| Méthode | Route | Rôle | Description |
|--------|-------|------|-------------|
| POST | `/api/login` | — | Connexion `{ name, role }` |
| GET | `/api/bootstrap` | tous | Magasin, rayons, plan, promos, clients |
| GET | `/api/products?q=&rayon=` | tous | Recherche (nom, marque, rayon) |
| GET | `/api/products/:id` | tous | Détail + alternatives si rupture |
| POST | `/api/route` | client | Parcours optimisé + budget + économies |
| GET | `/api/checkouts?items=` | tous | Caisses + caisse recommandée |
| POST | `/api/help` | client | Créer une demande d'aide |
| GET / POST | `/api/help`, `/api/help/:id/status` | staff | Lister / mettre à jour les demandes |
| GET | `/api/staff/dashboard` | staff | Demandes, alertes, tâches, rayons prioritaires |
| GET / POST | `/api/stock`, `/api/stock/:id/restock` | staff | Stocks & réassort |
| GET / POST | `/api/tasks`, `/api/tasks/:id/complete` | staff | Tâches de réassort |
| GET | `/api/manager/dashboard` | manager | KPIs temps réel + suivi demandes |
| GET | `/api/manager/rayons` | manager | Performance des rayons |
| GET | `/api/manager/heatmap` | manager | Zones chaudes/froides/congestion + reco |
| GET | `/api/events?token=` | tous | Flux temps réel (SSE) |
| POST | `/api/demo/reset` | tous | Réinitialise l'état mutable de la démo |

## Hors périmètre V1 (simulé visuellement)

Paiement réel, connexion réelle caisses/stocks, géolocalisation indoor, IA avancée, app native, fidélité réelle, scan produit réel.

## Pistes V2

Persistance cloud (Supabase), authentification sécurisée, localisation indoor réelle, optimisation TSP (2-opt), notifications push, historique multi-jours, export CSV/PDF.

> **V1.5** : état serveur sauvegardé localement (`data/demo-state.json`) ou sur `/tmp` (Vercel), panier client en `localStorage`, flux SSE pour rafraîchissement live.

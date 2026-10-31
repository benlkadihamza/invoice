# 🚀 Déploiement Cloudflare — Guide Rapide

L'application **InvoiceApp** a été reconstruite pour un déploiement 100% serverless sur **Cloudflare** (Worker + Static Assets intégrés) avec **Neon PostgreSQL** et **Cloudflare R2**.

---

## 🏗️ Architecture Reconstruite

- **API REST Serverless** : Cloudflare Worker avec [Hono.js](https://hono.dev), TypeScript, et pilote HTTP Neon (`@neondatabase/serverless`).
- **Frontend SPA** : React 18 + Vite + Bootstrap 5 Icons (servi directement par le Worker via Cloudflare Worker Assets).
- **Génération PDF** : Moteur natif Web/V8 (`pdf-lib`) pour l'export des factures.
- **Stockage Objets** : Cloudflare R2 (`invoiceapp-uploads`) pour les photos d'articles et reçus.
- **Base de Données** : Neon PostgreSQL (conserve votre schéma et vos données existantes).

---

## 📋 Étapes de Déploiement

### Étape 1 : Connexion à Cloudflare (si pas encore fait)
```bash
npx wrangler login
```

### Étape 2 : Créer le bucket R2 (une seule fois)
```bash
npm run r2:create
```

### Étape 3 : Configurer les 2 secrets de production
1. **Chaîne de connexion Neon** :
```bash
npm run secret:db
```
*(Collez votre chaîne Neon, ex: `postgresql://user:pass@ep-xyz.tech/neondb?sslmode=require`)*

2. **Clé secrète JWT** (pour la signature des sessions) :
```bash
npm run secret:jwt
```
*(Collez une chaîne secrète d'au moins 32 caractères)*

---

### Étape 4 : Déployer en 1 commande ! ⚡
```bash
npm run deploy
```

Cette commande compile le frontend React et déploie le tout (frontend + API) sur votre compte Cloudflare.
Vous obtiendrez instantanément votre URL de production mondiale :
👉 `https://invoiceapp.<votre-compte>.workers.dev`

---

## 💻 Développement Local

Pour lancer l'application en local :

- **Terminal 1** (API Worker sur `http://localhost:8787`) :
  ```bash
  npm run dev:worker
  ```

- **Terminal 2** (Frontend Vite sur `http://localhost:5173`) :
  ```bash
  npm run dev:frontend
  ```

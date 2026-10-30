# Déploiement sur Cloudflare Pages (InvoiceApp Pro)

Ce dossier `frontend-spa/` contient l'application reconstruite pour un hébergement à l'Edge sur **Cloudflare Pages**.

---

## 🚀 Méthode 1 : Déploiement Direct via Wrangler CLI

Exécutez la commande suivante à la racine du projet :

```bash
# Déploiement instantané vers Cloudflare Pages
npx wrangler pages deploy frontend-spa --project-name invoiceapp-pro
```

1. Si vous n'êtes pas encore connecté, le terminal ouvrira automatiquement votre navigateur pour authentifier votre compte Cloudflare.
2. Une fois téléversé, Cloudflare vous fournira une URL de production mondiale (ex: `https://invoiceapp-pro.pages.dev`).

---

## 🌐 Méthode 2 : Déploiement via Git (Tableau de bord Cloudflare)

1. Poussez ce dépôt sur **GitHub** ou **GitLab**.
2. Connectez-vous sur [dash.cloudflare.com](https://dash.cloudflare.com).
3. Allez dans **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
4. Sélectionnez votre dépôt et configurez :
   - **Framework preset**: `None`
   - **Build command**: *(laisser vide)*
   - **Build output directory**: `frontend-spa`
5. Cliquez sur **Save and Deploy**.

---

## ⚙️ Configuration Incluse

- **`frontend-spa/_redirects`** : Assure le routage propre de la Single Page Application (SPA fallback).
- **`frontend-spa/_headers`** : Configuration des en-têtes HTTP de sécurité et de mise en cache sur le CDN Cloudflare.
- **`wrangler.toml`** : Configuration Cloudflare prête pour la production.

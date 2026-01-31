# Configurer PostgreSQL sur Neon

GlycoFlex utilise uniquement PostgreSQL pour la persistance en ligne. La base est hébergée sur [neon.com](https://neon.com).

## 1. Créer le projet Neon

1. Ouvrez [neon.com](https://neon.com) et créez un projet.
2. Récupérez l'URL de connexion PostgreSQL (format `postgres://...`).

## 2. Initialiser le schéma

Exécutez le script `server/schema.sql` dans Neon pour créer les tables `users`, `user_sessions` et `glucose_measurements` :

```bash
psql "$NEON_DATABASE_URL" -f server/schema.sql
```

## 3. Configurer l'API de synchronisation

Créez un fichier `.env` dans le dossier `server/` (ou configurez vos variables d'environnement) :

```bash
NEON_DATABASE_URL=postgres://user:password@hostname/dbname
PORT=3001
CORS_ORIGIN=https://votre-app.exemple.com
```

Puis lancez le serveur :

```bash
npm run server:dev
```

## 4. Configurer l'application Expo

Ajoutez l'URL de l'API dans le `.env` côté mobile :

```bash
EXPO_PUBLIC_SYNC_API_URL=https://votre-api.exemple.com
```

## 5. Vérification rapide

- `GET /health` doit renvoyer `{"status":"ok"}`.
- L'application doit pouvoir s'authentifier et synchroniser les mesures via l'API.

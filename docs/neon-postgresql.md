# Configurer PostgreSQL sur Neon

GlycoFlex utilise uniquement PostgreSQL pour la persistance en ligne. La base est hébergée sur [neon.com](https://neon.com).

## 1. Créer le projet Neon

1. Ouvrez [neon.com](https://neon.com) et créez un projet.
2. Dans le tableau de bord Neon, ouvrez l'onglet **Connection details** ou **Connection string**.
3. Copiez la chaîne au format `postgres://...` (ou `postgresql://...`) pour la branche par défaut.
   - Elle contient déjà l'hôte, le port, l'utilisateur et le nom de la base.
   - Si Neon propose un paramètre SSL (`sslmode=require`), conservez-le : il est requis par défaut.
4. Gardez cette URL pour la variable `NEON_DATABASE_URL` (elle sert à la fois à l'initialisation du schéma et à l'API).

## 2. Initialiser le schéma

Exécutez le script `server/schema.sql` dans Neon pour créer les tables `users`, `user_sessions` et `glucose_measurements`.

### Option A — en ligne de commande (psql)

1. Installez `psql` si besoin (PostgreSQL client).
2. Exportez la variable avec l'URL copiée depuis Neon.
3. Lancez le script :

```bash
export NEON_DATABASE_URL="postgres://user:password@hostname/dbname?sslmode=require"
psql "$NEON_DATABASE_URL" -f server/schema.sql
```

### Option B — via la console SQL Neon

1. Dans Neon, ouvrez **SQL Editor**.
2. Ouvrez `server/schema.sql` et copiez son contenu.
3. Collez-le dans l'éditeur Neon puis exécutez.

## 3. Configurer l'API de synchronisation

Créez un fichier `.env` dans le dossier `server/` (ou configurez vos variables d'environnement). Un exemple est disponible dans `server/.env.example`.
Voici comment obtenir chaque valeur :

- **NEON_DATABASE_URL** : l'URL PostgreSQL copiée dans Neon (étape 1).
- **PORT** : le port d'écoute local de l'API (3001 par défaut).
- **CORS_ORIGIN** : l'URL de votre application mobile ou web autorisée à appeler l'API.
  - En développement Expo, utilisez par exemple `http://localhost:8081` ou l'URL du tunnel si vous utilisez `expo start --tunnel`.

```bash
NEON_DATABASE_URL=postgres://user:password@hostname/dbname?sslmode=require
PORT=3001
CORS_ORIGIN=https://votre-app.exemple.com
```

Puis lancez le serveur (le fichier `server/.env` est chargé automatiquement) :

```bash
npm run server:dev
```

## 4. Configurer l'application Expo

Ajoutez l'URL de l'API dans le `.env` côté mobile. Un exemple minimal est disponible dans `.env.example`.
Cette URL doit pointer vers le serveur Node.js (étape 3), par exemple :

- **En local** : `http://localhost:3001`
- **En staging/production** : `https://api.votre-domaine.com`

```bash
EXPO_PUBLIC_SYNC_API_URL=https://votre-api.exemple.com
```

## 5. Vérification rapide

- `GET /health` doit renvoyer `{"status":"ok"}`.
- L'application doit pouvoir s'authentifier et synchroniser les mesures via l'API.

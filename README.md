# 🩸 GlycoFlex - Application de Suivi Glycémique

Une application mobile moderne pour le suivi de la glycémie avec synchronisation PostgreSQL.

## 🚀 Fonctionnalités

### 📊 Suivi des mesures
- Enregistrement des mesures de glycémie
- Types de mesures : À jeun, avant/après repas, coucher, aléatoire
- Validation automatique des valeurs
- Notes personnalisées

### 📈 Analyses avancées
- Graphiques interactifs (ligne, barres, camembert)
- Analyse prédictive avec tendances
- Comparaison entre périodes
- Statistiques détaillées

### ☁️ Synchronisation PostgreSQL
- Sauvegarde automatique via API PostgreSQL
- Synchronisation entre appareils
- Mode hors ligne avec cache local
- Reprise automatique des opérations

### 🌍 Multilingue
- Support français et anglais
- Interface traduite complètement
- Changement de langue en temps réel

### ⚙️ Paramètres personnalisables
- Unités : mg/dL ou mmol/L
- Objectifs glycémiques personnalisés
- Paramètres d'accessibilité
- Notifications et rappels

## 🐘 Synchronisation PostgreSQL (Neon)

L'application utilise uniquement PostgreSQL (hébergé sur Neon) pour la persistance en ligne. Un service API expose les opérations d'authentification et de synchronisation.

### Guides détaillés
- [Configurer PostgreSQL sur Neon](docs/neon-postgresql.md)
- [Référence API (authentification + mesures)](docs/api.md)

## 📱 Installation

```bash
# Installer les dépendances
npm install

# Démarrer l'application
npm run dev

# Build pour production
npm run build:web
```

## 🧪 Tests

```bash
# Exécuter les tests unitaires
npm test

# Vérifier le lint
npm run lint
```

## 🏗️ Architecture

### Structure des fichiers
```
├── app/                    # Routes Expo Router
│   ├── (tabs)/            # Navigation par onglets
│   └── _layout.tsx        # Layout principal
├── components/            # Composants réutilisables
├── config/               # Configuration client et constantes
├── contexts/             # Contextes React
├── utils/                # Utilitaires
│   ├── storage.ts        # Stockage local
│   ├── postgresCloudStorage.ts # Synchronisation PostgreSQL
│   └── storageManager.ts # Orchestrateur local/cloud
└── locales/              # Traductions
```

### Stockage hybride
L'application utilise un système de stockage hybride :
- **Local** : AsyncStorage pour le cache et mode hors ligne
- **PostgreSQL** : Synchronisation via API sécurisée
- **Automatique** : Basculement transparent selon la connectivité

## 🔒 Sécurité

- Données chiffrées en transit
- Authentification via l'API (tokens de session)
- Mode anonyme disponible

## 📊 Export des données

- Export PDF/texte des rapports
- Partage natif sur mobile
- Téléchargement direct sur web
- Statistiques détaillées

## 🎨 Interface

- Design moderne avec gradients
- Animations fluides
- Mode sombre/clair automatique
- Responsive design
- Accessibilité intégrée

## 🚀 Déploiement

### Web
```bash
npm run build:web
```

### Mobile
```bash
# Android
npx expo build:android

# iOS
npx expo build:ios
```

## 📝 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez ouvrir une issue avant de soumettre une pull request.

### 🌐 Contribution à l'i18n

1. Modifiez les fichiers de traduction dans `locales/en.json` et `locales/fr.json`.
2. Exécutez `npm run i18n:check` pour vérifier les clés manquantes entre les langues.
3. Soumettez votre pull request avec les traductions mises à jour.

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.

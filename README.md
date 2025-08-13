# 🩸 GlycoFlex - Application de Suivi Glycémique

Une application mobile moderne pour le suivi de la glycémie avec synchronisation Firebase.

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

### ☁️ Synchronisation Firebase
- Sauvegarde automatique dans le cloud
- Synchronisation entre appareils
- Mode hors ligne avec cache local
- Backup automatique des données

### 🌍 Multilingue
- Support français et anglais
- Interface traduite complètement
- Changement de langue en temps réel

### ⚙️ Paramètres personnalisables
- Unités : mg/dL ou mmol/L
- Objectifs glycémiques personnalisés
- Paramètres d'accessibilité
- Notifications et rappels

## 🔧 Configuration Firebase

### 1. Créer un projet Firebase
1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Créez un nouveau projet
3. Activez Firestore Database
4. Configurez les règles de sécurité

### 2. Configuration de l'application
1. Créez un fichier `.env` à la racine et ajoutez votre configuration Firebase :

```
EXPO_PUBLIC_FIREBASE_API_KEY=votre-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=votre-app-id
```

Les valeurs seront automatiquement lues par `config/firebase.ts`.

### 3. Règles Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /glucose_measurements/{document} {
      allow read, write: if request.auth != null || resource.data.userId == 'anonymous';
    }
  }
}
```

## 📱 Installation

```bash
# Installer les dépendances
npm install

# Démarrer l'application
npm run dev

# Build pour production
npm run build:web
```

## 🏗️ Architecture

### Structure des fichiers
```
├── app/                    # Routes Expo Router
│   ├── (tabs)/            # Navigation par onglets
│   └── _layout.tsx        # Layout principal
├── components/            # Composants réutilisables
├── config/               # Configuration Firebase
├── contexts/             # Contextes React
├── utils/                # Utilitaires
│   ├── storage.ts        # Stockage local
│   ├── firebaseStorage.ts # Stockage Firebase
│   └── hybridStorage.ts  # Stockage hybride
└── locales/              # Traductions
```

### Stockage hybride
L'application utilise un système de stockage hybride :
- **Local** : AsyncStorage pour le cache et mode hors ligne
- **Firebase** : Firestore pour la synchronisation cloud
- **Automatique** : Basculement transparent selon la connectivité

## 🔒 Sécurité

- Données chiffrées en transit
- Authentification optionnelle
- Mode anonyme disponible
- Règles Firestore configurables

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

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.

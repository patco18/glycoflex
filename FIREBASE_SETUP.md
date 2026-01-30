# Guide de Configuration Firebase pour GlycoFlex

> **Note** : Le stockage Firebase/Firestore est désactivé. GlycoFlex utilise désormais PostgreSQL pour la persistance en ligne. Firebase est conservé uniquement pour l'authentification utilisateur. Consultez le `README.md` pour la configuration PostgreSQL.

## 🔥 Étapes de configuration Firebase

### 1. Créer un projet Firebase

1. **Allez sur [Firebase Console](https://console.firebase.google.com/)**
2. **Cliquez sur "Ajouter un projet"**
3. **Nommez votre projet** : `glycoflex-app` (ou le nom de votre choix)
4. **Désactivez Google Analytics** (pas nécessaire pour commencer)
5. **Cliquez sur "Créer le projet"**

### 2. Configurer Authentication

1. **Dans Firebase Console, allez dans "Authentication"**
2. **Cliquez sur "Get started"**
3. **Allez dans l'onglet "Sign-in method"**
4. **Activez "Email/Password"** :
   - Cliquez sur Email/Password
   - Cochez "Enable"
   - Cliquez sur "Save"

### 3. Configurer Firestore Database

> ⚠️ Cette étape est **optionnelle** et conservée pour compatibilité historique. La persistance en ligne est désormais assurée par PostgreSQL.

1. **Allez dans "Firestore Database"**
2. **Cliquez sur "Create database"**
3. **Choisissez "Start in test mode"** (temporaire)
4. **Sélectionnez une région** proche de vous
5. **Cliquez sur "Done"**

### 4. Ajouter une application Web

1. **Dans "Project Overview", cliquez sur l'icône Web** `</>`
2. **Nommez votre app** : `GlycoFlex`
3. **Cochez "Also set up Firebase Hosting"** (optionnel)
4. **Cliquez sur "Register app"**
5. **COPIEZ LA CONFIGURATION** qui apparaît :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 5. Configurer les règles Firestore

Dans Firebase Console > Firestore Database > Rules, remplacez par :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permettre l'accès aux collections de mesures chiffrées seulement aux utilisateurs authentifiés
    match /encrypted_measurements/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Permettre l'accès aux métadonnées de sync seulement aux utilisateurs authentifiés
    match /sync_metadata/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Permettre l'accès aux informations des appareils seulement aux utilisateurs authentifiés
    match /devices/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## 🔧 Configuration de l'application

### 1. Variables d'environnement

Créez un fichier `.env` à la racine et ajoutez votre configuration Firebase :

```
EXPO_PUBLIC_FIREBASE_API_KEY=votre-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=votre-projet
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Les valeurs seront automatiquement lues par `config/firebase.ts`.

Pour la CI/CD, configurez ces variables via `eas secret` ou GitHub Secrets.

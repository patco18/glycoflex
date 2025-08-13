# 🔥 Guide de Configuration Firebase pour GlycoFlex

## 1. Créer un projet Firebase

### Étape 1 : Aller sur Firebase Console
1. Visitez https://console.firebase.google.com
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Add project" ou "Créer un projet"

### Étape 2 : Configurer le projet
1. **Nom du projet** : `GlycoFlex` (ou le nom de votre choix)
2. **Analytics** : Activez Google Analytics (recommandé)
3. **Compte Analytics** : Utilisez votre compte par défaut
4. Cliquez sur "Create project"

## 2. Configurer l'Authentication

### Activer Authentication
1. Dans la console Firebase, allez dans "Authentication"
2. Cliquez sur "Get started"
3. Allez dans l'onglet "Sign-in method"
4. Activez **Email/Password** :
   - Cliquez sur "Email/Password"
   - Activez la première option "Email/Password"
   - Cliquez "Save"

## 3. Configurer Firestore Database

### Créer la base de données
1. Allez dans "Firestore Database"
2. Cliquez "Create database"
3. Choisissez "Start in test mode" (pour développement)
4. Sélectionnez une région proche (ex: europe-west1)
5. Cliquez "Done"

### Règles de sécurité Firestore
Remplacez les règles par défaut par :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les données utilisateur
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Règles pour les mesures de glycémie
    match /users/{userId}/glucose_readings/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Règles pour les paramètres utilisateur
    match /users/{userId}/settings/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 4. Ajouter l'App Android

### Configuration Android
1. Dans "Project Overview", cliquez sur l'icône Android
2. **Package name** : `com.glycoflex.app` (ou votre package)
3. **App nickname** : `GlycoFlex Android`
4. **SHA-1** : Laissez vide pour l'instant
5. Cliquez "Register app"

### Télécharger google-services.json
1. Téléchargez le fichier `google-services.json`
2. Placez-le dans votre dossier projet (déjà fait dans votre cas)

## 5. Mettre à jour la configuration

### Remplacer les clés dans firebase.ts
Ouvrez `config/firebase.ts` et remplacez les valeurs de `firebaseConfig` avec celles de votre projet :

```typescript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};
```

### Où trouver ces valeurs ?
Dans Firebase Console > Project Settings > Your apps > Config

## 6. Tester la configuration

### Commandes de test
```bash
# Redémarrer avec cache clear
npx expo start --clear

# Ou restart Metro
npx expo start --dev-client --clear
```

### Vérifications
1. L'app doit démarrer sans erreurs Firebase
2. Vous devriez voir "🔥 Firebase configuré pour le projet: VOTRE_PROJECT_ID" dans les logs
3. La création de compte doit fonctionner
4. Les données doivent se synchroniser avec Firestore

## 7. Structure de données Firestore

### Collections créées automatiquement :
```
users/
  {userId}/
    profile: { email, createdAt, lastSync }
    glucose_readings/
      {readingId}: { value, timestamp, notes, ... }
    settings/
      preferences: { theme, language, units, ... }
```

## 8. Dépannage

### Erreurs communes :

#### "auth/configuration-not-found"
- Vérifiez que `google-services.json` est dans le bon dossier
- Vérifiez les clés dans `firebase.ts`
- Redémarrez avec `--clear`

#### "Permission denied" sur Firestore
- Vérifiez les règles de sécurité Firestore
- Assurez-vous que l'utilisateur est connecté

#### App crash au démarrage
- Vérifiez les logs avec `npx expo start`
- Vérifiez la configuration Firebase

## 9. URLs importantes

- **Firebase Console** : https://console.firebase.google.com
- **Documentation Auth** : https://firebase.google.com/docs/auth
- **Documentation Firestore** : https://firebase.google.com/docs/firestore
- **React Native Firebase** : https://rnfirebase.io (alternative native)

## 10. Sécurité

### Recommandations :
1. **Ne jamais** commiter les vraies clés Firebase dans Git public
2. Utilisez des variables d'environnement pour la production
3. Configurez des règles Firestore strictes
4. Activez App Check pour la production
5. Surveillez l'usage dans Firebase Console

---

## 🎯 Prochaines étapes

Après configuration :
1. Testez la création de compte
2. Testez la synchronisation des données
3. Vérifiez Firestore Console pour voir les données
4. Configurez les notifications push (optionnel)
5. Préparez pour publication (règles prod, etc.)

**Support** : Si vous rencontrez des problèmes, vérifiez d'abord les logs de l'app et la console Firebase.

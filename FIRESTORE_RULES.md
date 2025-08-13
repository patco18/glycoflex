# 🔥 Règles Firestore pour GlycoFlex

Copiez et collez ces règles dans Firebase Console > Firestore Database > Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les données utilisateur
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Sous-collections pour les données utilisateur
      match /{subcollection=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Règles pour les métadonnées de synchronisation
    match /sync_metadata/{docId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Règles pour les mesures de glycémie (alternative)
    match /glucose_readings/{userId}/{readingId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
    
    // Interdire tout autre accès
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Instructions d'application

1. **Aller dans Firebase Console**
   - https://console.firebase.google.com
   - Sélectionnez votre projet `glycoflex-app`

2. **Accéder aux règles Firestore**
   - Cliquez sur "Firestore Database"
   - Onglet "Rules"

3. **Remplacer les règles actuelles**
   - Effacez tout le contenu actuel
   - Collez les règles ci-dessus
   - Cliquez "Publish"

## Avantages de ces règles

- ✅ **Sécurité** : Chaque utilisateur ne peut accéder qu'à ses propres données
- ✅ **Performance** : Évite les requêtes d'index complexes
- ✅ **Évolutif** : Support des sous-collections automatique
- ✅ **Sync metadata** : Gestion appropriée des métadonnées de synchronisation

Ces règles devraient résoudre les problèmes d'index et permettre une synchronisation fluide.

# 🔥 Règles Firestore pour GlycoFlex (Mises à jour)

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
      // Lire - seulement si le document appartient à l'utilisateur
      allow read: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
      
      // Écrire - vérifier que userId correspond à l'uid de l'utilisateur authentifié
      allow write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Règles pour les mesures chiffrées
    match /encrypted_measurements/{docId} {
      // Lire - seulement si le document appartient à l'utilisateur
      allow read: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
      
      // Écrire - vérifier que userId correspond à l'uid de l'utilisateur authentifié
      allow write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Règles pour les appareils
    match /devices/{deviceId} {
      // Lire - seulement si l'appareil appartient à l'utilisateur
      allow read: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
      
      // Écrire - vérifier que userId correspond à l'uid de l'utilisateur authentifié
      allow write: if request.auth != null && 
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

## Pourquoi ces règles fonctionnent

1. **Structure de document adaptée** : Les règles correspondent exactement à la structure des collections utilisées dans l'application
   
2. **Vérifications de sécurité** : Chaque règle vérifie que :
   - L'utilisateur est authentifié (`request.auth != null`)
   - L'utilisateur est propriétaire des données (`userId == request.auth.uid`)

3. **Gestion des nouveaux documents** : `resource == null` permet la lecture avant création

4. **Contrôle granulaire** : Différentes règles pour différentes collections

## Tests à effectuer après application

1. Créez un compte utilisateur et connectez-vous
2. Ajoutez une mesure de glycémie
3. Vérifiez que la synchronisation fonctionne
4. Fermez et rouvrez l'application pour vérifier la persistance

---

## Notes pour le développement

Ces règles sont conçues pour un environnement de développement/test. Pour la production, considérez:

1. Ajouter des validations de données plus strictes
2. Limiter le nombre de lectures/écritures par utilisateur
3. Configurer des alertes de coûts pour éviter les surprises de facturation

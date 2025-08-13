import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Configuration Firebase (à remplacer par vos valeurs)
const firebaseConfig = {
  apiKey: "AIzaSyBJVgQ0mc2TLR1i3Fe9BH7n0weo89uUDAM",
  authDomain: "glycoflex-app.firebaseapp.com",
  projectId: "glycoflex-app",
  storageBucket: "glycoflex-app.firebasestorage.app",
  messagingSenderId: "906933577031",
  appId: "1:906933577031:web:ea1d777562c4bcadb89862"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Email et mot de passe de l'administrateur (vous)
const adminEmail = "hpatco18@gmail.com";
const adminPassword = "Virus1984@2021"; // Remplacez par votre mot de passe

/**
 * Script d'initialisation de la structure Firestore
 * - Connexion en tant qu'administrateur
 * - Vérification des collections
 * - Création des documents nécessaires
 */
async function initializeFirestore() {
  try {
    // 1. Se connecter en tant qu'administrateur
    console.log(`Connexion en tant que ${adminEmail}...`);
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const userId = userCredential.user.uid;
    console.log(`Connecté avec succès! UID: ${userId}`);

    // 2. Vérifier/créer la structure de base
    console.log("Vérification de la structure Firestore...");
    
    // Document utilisateur de base
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, {
      email: adminEmail,
      createdAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
    }, { merge: true });
    console.log("✓ Document utilisateur mis à jour");

    // Vérifier les collections existantes
    console.log("Collections actuelles:");
    const collections = ["encrypted_measurements", "sync_metadata", "devices"];
    for (const collName of collections) {
      const querySnapshot = await getDocs(collection(db, collName));
      console.log(`- ${collName}: ${querySnapshot.size} documents`);
    }

    // 3. Créer un document de test pour vérifier les permissions
    const testDeviceId = "test_device_" + new Date().getTime();
    await setDoc(doc(db, "devices", testDeviceId), {
      userId: userId,
      name: "Test Device",
      lastSync: new Date().toISOString(),
    });
    console.log(`✓ Document de test créé: devices/${testDeviceId}`);

    console.log("✅ Initialisation terminée avec succès!");
    console.log("Vous pouvez maintenant utiliser l'application avec les règles Firestore mises à jour.");

  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation:", error);
    console.log("Vérifiez vos identifiants et les règles Firestore.");
  }
}

// Exécuter le script
initializeFirestore();

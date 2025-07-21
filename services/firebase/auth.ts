import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Clé pour stocker l'état de connexion dans AsyncStorage
const AUTH_STATE_KEY = "glucose_app_auth_state";

// Interface pour les informations utilisateur
export interface UserInfo {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

// Fonction pour s'inscrire avec email et mot de passe
export const signUpWithEmail = async (email: string, password: string): Promise<UserInfo> => {
  // Tenter de définir la persistance locale pour le navigateur (Web uniquement)
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.log('setPersistence not supported in this environment:', error);
  }
  
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const userInfo = extractUserInfo(userCredential.user);
  await saveAuthState(userInfo);
  
  // Note: La persistence est gérée automatiquement par auth-handler.ts
  
  return userInfo;
};

// Fonction pour se connecter avec email et mot de passe
export const signInWithEmail = async (email: string, password: string): Promise<UserInfo> => {
  // Tenter de définir la persistance locale pour le navigateur (Web uniquement)
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.log('setPersistence not supported in this environment:', error);
  }
  
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userInfo = extractUserInfo(userCredential.user);
  await saveAuthState(userInfo);
  
  // Note: La persistence est gérée automatiquement par auth-handler.ts
  
  return userInfo;
};

// Fonction pour se connecter avec Google
export const signInWithGoogle = async (idToken: string): Promise<UserInfo> => {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  const userInfo = extractUserInfo(userCredential.user);
  await saveAuthState(userInfo);
  return userInfo;
};

// Fonction pour se déconnecter
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
  await AsyncStorage.removeItem(AUTH_STATE_KEY);
  // Note: La persistence est gérée automatiquement par auth-handler.ts
};

// Observer les changements d'état d'authentification
export const subscribeToAuthChanges = (
  onUserAuthenticated: (user: UserInfo) => void,
  onUserSignedOut: () => void
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      const userInfo = extractUserInfo(user);
      saveAuthState(userInfo); // Mettre à jour le stockage local
      onUserAuthenticated(userInfo);
    } else {
      AsyncStorage.removeItem(AUTH_STATE_KEY);
      onUserSignedOut();
    }
  });
};

// Obtenir l'utilisateur actuellement connecté depuis AsyncStorage
export const getCurrentUser = async (): Promise<UserInfo | null> => {
  try {
    const authState = await AsyncStorage.getItem(AUTH_STATE_KEY);
    if (authState) {
      return JSON.parse(authState) as UserInfo;
    }
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'état d'authentification:", error);
    return null;
  }
};

// Extraire les informations utilisateur d'un objet User Firebase
const extractUserInfo = (user: User): UserInfo => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  isAnonymous: user.isAnonymous,
});

// Sauvegarder l'état d'authentification dans AsyncStorage
const saveAuthState = async (userInfo: UserInfo): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(userInfo));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de l'état d'authentification:", error);
  }
};

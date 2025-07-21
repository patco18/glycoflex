/**
 * Initialisation Firebase
 * Ce fichier doit être importé au tout début de l'application
 */

import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDosaROb-vr8AsZJbuzTDVU46xKtSYWfnQ",
  authDomain: "glucose-insights-5moiz.firebaseapp.com",
  projectId: "glucose-insights-5moiz",
  storageBucket: "glucose-insights-5moiz.firebasestorage.app",
  messagingSenderId: "297314942712",
  appId: "1:297314942712:web:3e84cf0021d5860195050d"
};

try {
  console.log('Initializing Firebase...');
  initializeApp(firebaseConfig);
  console.log('Firebase pre-initialized successfully');
} catch (error) {
  console.error('Firebase pre-initialization error:', error);
}

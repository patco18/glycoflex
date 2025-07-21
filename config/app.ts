import { AppConfig } from "../types/app";

// Configuration Firebase pour l'application
const config: AppConfig = {
  firebase: {
    // Remplacez ces valeurs par celles de votre projet Firebase
    apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-app.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "your-app-id",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-app.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
    appId: process.env.FIREBASE_APP_ID || "your-app-id",
  },
  // Autres configurations de l'application
  version: "1.0.0",
  buildNumber: "1",
};

export default config;

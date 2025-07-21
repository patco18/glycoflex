import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuration Firebase basée sur google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyBdoczkJY5Jw4ulzjDjp16pLm5b_9l3Rps",
  authDomain: "glycoflex-9c7fa.firebaseapp.com",
  projectId: "glycoflex-9c7fa",
  storageBucket: "glycoflex-9c7fa.firebasestorage.app",
  messagingSenderId: "720234915029",
  appId: "1:720234915029:android:92cfe933c677bc8d0fae5c"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firestore
export const db = getFirestore(app);

// Initialiser Auth
export const auth = getAuth(app);

export default app;
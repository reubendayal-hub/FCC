import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Staging deployments override these via VITE_FIREBASE_* env vars.
// Production falls back to the hardcoded fcc-nets values.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             || "AIzaSyBFcp5Hdm1Ssd2klAWq6ZDqjA-tL_wmXAs",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         || "fcc-nets.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          || "fcc-nets",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      || "fcc-nets.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "319438840256",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              || "1:319438840256:web:f25d29ab78d55a22f26825",
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

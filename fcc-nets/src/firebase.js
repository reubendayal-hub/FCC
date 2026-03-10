import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFcp5Hdm1Ssd2klAWq6ZDqjA-tL_wmXAs",
  authDomain: "fcc-nets.firebaseapp.com",
  projectId: "fcc-nets",
  storageBucket: "fcc-nets.firebasestorage.app",
  messagingSenderId: "319438840256",
  appId: "1:319438840256:web:f25d29ab78d55a22f26825",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

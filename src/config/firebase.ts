// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBBNJzQHpkcrUAbPeGFMkQBl-A9uEBruws",
  authDomain: "restaurant-chatbot-84524.firebaseapp.com",
  projectId: "restaurant-chatbot-84524",
  storageBucket: "restaurant-chatbot-84524.firebasestorage.app",
  messagingSenderId: "19931230266",
  appId: "1:19931230266:web:a83b3272313c790e070503"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
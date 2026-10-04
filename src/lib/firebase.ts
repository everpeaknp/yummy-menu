import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";

const app = getApps().length ? getApp() : initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCfqttcWmCqNd4IYagLXMiVzJpluwHw2Ts",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "yummy-de17e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yummy-de17e",
});

export async function getGoogleIdToken() {
  const result = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
  return result.user.getIdToken();
}

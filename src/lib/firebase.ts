import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";

function getFirebaseAuth() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !authDomain || !projectId) {
    throw new Error(
      "Google sign-in is not configured. Set the Firebase public environment variables.",
    );
  }

  const app = getApps().length
    ? getApp()
    : initializeApp({ apiKey, authDomain, projectId });
  return getAuth(app);
}

export async function getGoogleIdToken() {
  const result = await signInWithPopup(
    getFirebaseAuth(),
    new GoogleAuthProvider(),
  );
  return result.user.getIdToken();
}

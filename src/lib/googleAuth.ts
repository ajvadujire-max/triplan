import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";

export { auth };

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem("trippro_google_access_token");
let signInPromise: Promise<{ user: User; accessToken: string } | null> | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || "");
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem("trippro_google_access_token");
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  if (signInPromise) {
    console.log("Google sign-in already in progress, reusing ongoing request.");
    return signInPromise;
  }

  signInPromise = (async () => {
    try {
      isSigningIn = true;
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/forms.body");
      provider.addScope("https://www.googleapis.com/auth/forms.responses.readonly");
      provider.addScope("https://www.googleapis.com/auth/spreadsheets");
      provider.addScope("https://www.googleapis.com/auth/drive.file");
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || "";
      if (token) {
        cachedAccessToken = token;
        localStorage.setItem("trippro_google_access_token", token);
      }
      return { user: result.user, accessToken: token };
    } catch (error: any) {
      if (error?.code !== "auth/popup-closed-by-user") {
        console.error("Google sign-in error:", error);
      }
      throw error;
    } finally {
      isSigningIn = false;
      signInPromise = null;
    }
  })();

  return signInPromise;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem("trippro_google_access_token");
};

export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem("trippro_google_access_token", token);
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem("trippro_google_access_token");
};

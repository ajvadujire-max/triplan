import "./suppressAuthErrors";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

export { firebaseConfig };
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const storage = getStorage(app);

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId || "(default)");
} catch {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}
export const db = dbInstance;

console.log("[Triplan Firebase] Connected Project ID:", firebaseConfig.projectId);
console.log("[Triplan Firebase] Firestore Database ID:", firebaseConfig.firestoreDatabaseId || "(default)");

if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === "object" ? (a?.message || a?.stack || JSON.stringify(a)) : String(a))).join(" ");
    if (
      msg.includes("Pending promise was never set") ||
      msg.includes("INTERNAL ASSERTION FAILED") ||
      msg.includes("auth/argument-error") ||
      msg.includes("Could not reach Cloud Firestore backend") ||
      msg.includes("backend didn't respond within") ||
      msg.includes("Failed to get document because the client is offline") ||
      msg.includes("client is offline")
    ) {
      console.warn("Suppressed Firebase notice:", ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener("unhandledrejection", (event) => {
    const msg = event?.reason?.message || event?.reason?.stack || String(event?.reason || "");
    if (
      msg.includes("Pending promise was never set") ||
      msg.includes("INTERNAL ASSERTION FAILED") ||
      msg.includes("auth/argument-error")
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("Suppressed Firebase Auth internal assertion error:", msg);
    }
  });

  window.addEventListener("error", (event) => {
    const msg = event?.message || event?.error?.message || event?.error?.stack || String(event?.error || "");
    if (
      msg.includes("Pending promise was never set") ||
      msg.includes("INTERNAL ASSERTION FAILED") ||
      msg.includes("auth/argument-error")
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("Suppressed Firebase Auth internal assertion error:", msg);
    }
  }, true);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Triplan Route Storage Service
 * Provides robust offline-first persistence using IndexedDB with automatic LocalStorage fallback.
 * Ensures active routes and recorded GPS checkpoints are NEVER lost during app backgrounding,
 * page refreshes, tab closures, network dropouts, or process interruptions.
 */

import { ActiveRouteSessionState } from "../components/RouteTrackerModule";

export interface StoredRouteSession {
  id: string;
  tripId: string;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: "ended";
  totalDistanceKm: number;
  totalDurationSeconds: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  startLocationName?: string;
  endLocationName?: string;
  points: {
    lat: number;
    lng: number;
    timestamp: string;
    accuracy: number;
    speed: number;
  }[];
  createdAt: string;
  synced?: boolean;
}

const DB_NAME = "TriplanRouteTrackerDB";
const DB_VERSION = 1;
const ACTIVE_STORE = "active_sessions";
const SAVED_STORE = "saved_routes";
const QUEUE_STORE = "sync_queue";

// Helper to open IndexedDB safely with Promise wrapper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported in this environment"));
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ACTIVE_STORE)) {
          db.createObjectStore(ACTIVE_STORE, { keyPath: "tripId" });
        }
        if (!db.objectStoreNames.contains(SAVED_STORE)) {
          const savedStore = db.createObjectStore(SAVED_STORE, { keyPath: "id" });
          savedStore.createIndex("tripId", "tripId", { unique: false });
          savedStore.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
    } catch (err) {
      reject(err);
    }
  });
}

// LocalStorage Fallback Helpers
const LS_ACTIVE_KEY_PREFIX = "triplan_active_route_v2_";
const LS_SAVED_KEY_PREFIX = "triplan_saved_routes_";

/**
 * Persist active tracking route session (called continuously on GPS updates and state changes)
 */
export async function saveActiveRouteToStorage(session: ActiveRouteSessionState): Promise<void> {
  if (!session || !session.tripId) return;

  // 1. Synchronously mirror to LocalStorage for instant access
  try {
    const lsKey = `${LS_ACTIVE_KEY_PREFIX}${session.tripId}`;
    localStorage.setItem(lsKey, JSON.stringify(session));
  } catch (e) {
    console.warn("[RouteStorage] LocalStorage write warning:", e);
  }

  // 2. Persist to IndexedDB for high-capacity reliable persistence
  try {
    const db = await openDB();
    const tx = db.transaction(ACTIVE_STORE, "readwrite");
    const store = tx.objectStore(ACTIVE_STORE);
    store.put(session);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[RouteStorage] IndexedDB save active route error:", err);
  }
}

/**
 * Retrieve active tracking session for a specific trip
 */
export async function getActiveRouteFromStorage(tripId: string): Promise<ActiveRouteSessionState | null> {
  if (!tripId) return null;

  // 1. Try IndexedDB first
  try {
    const db = await openDB();
    const tx = db.transaction(ACTIVE_STORE, "readonly");
    const store = tx.objectStore(ACTIVE_STORE);
    const req = store.get(tripId);

    const result = await new Promise<ActiveRouteSessionState | null>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (result && result.status !== ("ended" as any)) {
      return result;
    }
  } catch (err) {
    console.warn("[RouteStorage] IndexedDB get active route error:", err);
  }

  // 2. Fallback to LocalStorage
  try {
    const lsKey = `${LS_ACTIVE_KEY_PREFIX}${tripId}`;
    const raw = localStorage.getItem(lsKey);
    if (raw) {
      const parsed: ActiveRouteSessionState = JSON.parse(raw);
      if (parsed && parsed.status !== ("ended" as any)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[RouteStorage] LocalStorage get active route error:", e);
  }

  return null;
}

/**
 * Clear active tracking session from storage (ONLY when user explicitly ends or discards route)
 */
export async function clearActiveRouteFromStorage(tripId: string): Promise<void> {
  if (!tripId) return;

  // 1. Remove from LocalStorage
  try {
    const lsKey = `${LS_ACTIVE_KEY_PREFIX}${tripId}`;
    localStorage.removeItem(lsKey);
    // Also clean legacy key if any
    localStorage.removeItem(`triplan_tracker_draft_${tripId}`);
  } catch (e) {
    console.warn("[RouteStorage] LocalStorage clear active route error:", e);
  }

  // 2. Remove from IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(ACTIVE_STORE, "readwrite");
    const store = tx.objectStore(ACTIVE_STORE);
    store.delete(tripId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[RouteStorage] IndexedDB clear active route error:", err);
  }
}

/**
 * Save a completed route session to local storage and IndexedDB
 */
export async function saveCompletedRouteToStorage(session: StoredRouteSession): Promise<void> {
  if (!session || !session.id || !session.tripId) return;

  // 1. Save to LocalStorage array
  try {
    const lsKey = `${LS_SAVED_KEY_PREFIX}${session.tripId}`;
    const raw = localStorage.getItem(lsKey);
    const existing: StoredRouteSession[] = raw ? JSON.parse(raw) : [];
    const updated = [session, ...existing.filter((s) => s.id !== session.id)];
    localStorage.setItem(lsKey, JSON.stringify(updated));
  } catch (e) {
    console.warn("[RouteStorage] LocalStorage save completed route error:", e);
  }

  // 2. Save to IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(SAVED_STORE, "readwrite");
    const store = tx.objectStore(SAVED_STORE);
    store.put(session);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[RouteStorage] IndexedDB save completed route error:", err);
  }
}

/**
 * Load completed route sessions for a trip
 */
export async function getCompletedRoutesFromStorage(tripId: string): Promise<StoredRouteSession[]> {
  const routes: StoredRouteSession[] = [];
  const mapById = new Map<string, StoredRouteSession>();

  // 1. Try IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(SAVED_STORE, "readonly");
    const store = tx.objectStore(SAVED_STORE);
    const index = store.index("tripId");
    const req = index.getAll(tripId);

    const dbRoutes = await new Promise<StoredRouteSession[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    dbRoutes.forEach((r) => mapById.set(r.id, r));
  } catch (err) {
    console.warn("[RouteStorage] IndexedDB get completed routes error:", err);
  }

  // 2. Merge with LocalStorage
  try {
    const lsKey = `${LS_SAVED_KEY_PREFIX}${tripId}`;
    const raw = localStorage.getItem(lsKey);
    if (raw) {
      const parsed: StoredRouteSession[] = JSON.parse(raw);
      parsed.forEach((r) => {
        if (!mapById.has(r.id)) {
          mapById.set(r.id, r);
        }
      });
    }
  } catch (e) {
    console.warn("[RouteStorage] LocalStorage get completed routes error:", e);
  }

  mapById.forEach((val) => routes.push(val));
  return routes.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

/**
 * Delete a completed route session from storage
 */
export async function deleteCompletedRouteFromStorage(routeId: string, tripId: string): Promise<void> {
  // 1. Remove from LocalStorage
  try {
    const lsKey = `${LS_SAVED_KEY_PREFIX}${tripId}`;
    const raw = localStorage.getItem(lsKey);
    if (raw) {
      const parsed: StoredRouteSession[] = JSON.parse(raw);
      const filtered = parsed.filter((s) => s.id !== routeId);
      localStorage.setItem(lsKey, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn("[RouteStorage] LocalStorage delete completed route error:", e);
  }

  // 2. Remove from IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(SAVED_STORE, "readwrite");
    const store = tx.objectStore(SAVED_STORE);
    store.delete(routeId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[RouteStorage] IndexedDB delete completed route error:", err);
  }
}

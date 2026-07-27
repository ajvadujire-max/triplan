import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query,
  where,
  getDocFromServer
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { Trip, FinanceAccount, CashbookEntry } from "../types";

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test completed successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}

testFirestoreConnection();

function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
}

export async function fetchUserTrips(orgId: string): Promise<Trip[]> {
  const path = `trips`;
  try {
    const q = query(collection(db, path), where("organizationId", "==", orgId));
    const snapshot = await getDocs(q);
    const trips: Trip[] = [];
    snapshot.forEach((docSnap) => {
      trips.push(docSnap.data() as Trip);
    });
    return trips;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveUserTrip(orgId: string, trip: Trip): Promise<void> {
  const path = `trips/${trip.id}`;
  try {
    await setDoc(doc(db, "trips", trip.id), sanitizeForFirestore({ ...trip, organizationId: orgId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserTrip(orgId: string, tripId: string): Promise<void> {
  const path = `trips/${tripId}`;
  try {
    await deleteDoc(doc(db, "trips", tripId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchUserAccounts(orgId: string): Promise<FinanceAccount[]> {
  const path = `accounts`;
  try {
    const q = query(collection(db, path), where("organizationId", "==", orgId));
    const snapshot = await getDocs(q);
    const accounts: FinanceAccount[] = [];
    snapshot.forEach((docSnap) => {
      accounts.push(docSnap.data() as FinanceAccount);
    });
    return accounts;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveUserAccount(orgId: string, account: FinanceAccount): Promise<void> {
  const path = `accounts/${account.id}`;
  try {
    await setDoc(doc(db, "accounts", account.id), sanitizeForFirestore({ ...account, organizationId: orgId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserAccount(orgId: string, accountId: string): Promise<void> {
  const path = `accounts/${accountId}`;
  try {
    await deleteDoc(doc(db, "accounts", accountId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchUserCashbook(orgId: string): Promise<CashbookEntry[]> {
  const path = `cashbook`;
  try {
    const q = query(collection(db, path), where("organizationId", "==", orgId));
    const snapshot = await getDocs(q);
    const entries: CashbookEntry[] = [];
    snapshot.forEach((docSnap) => {
      entries.push(docSnap.data() as CashbookEntry);
    });
    return entries;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveUserCashbookEntry(orgId: string, entry: CashbookEntry): Promise<void> {
  const path = `cashbook/${entry.id}`;
  try {
    await setDoc(doc(db, "cashbook", entry.id), sanitizeForFirestore({ ...entry, organizationId: orgId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserCashbookEntry(orgId: string, entryId: string): Promise<void> {
  const path = `cashbook/${entryId}`;
  try {
    await deleteDoc(doc(db, "cashbook", entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function migrateLocalDataToFirestore(
  orgId: string, 
  localTrips: Trip[], 
  localAccounts: FinanceAccount[], 
  localCashbook: CashbookEntry[]
): Promise<void> {
  try {
    const remoteTrips = await fetchUserTrips(orgId);
    if (remoteTrips.length === 0) {
      console.log("Migrating local data to Firestore for organization:", orgId);
      for (const trip of localTrips) {
        await saveUserTrip(orgId, trip);
      }
      for (const account of localAccounts) {
        await saveUserAccount(orgId, account);
      }
      for (const entry of localCashbook) {
        await saveUserCashbookEntry(orgId, entry);
      }
    }
  } catch (error) {
    console.error("Migration to Firestore failed:", error);
  }
}

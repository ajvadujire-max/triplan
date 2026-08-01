import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
  getDoc,
  query,
  where,
  getDocFromServer
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, firebaseConfig } from "./firebase";
import { Trip, FinanceAccount, CashbookEntry, PersonalExpense } from "../types";
import { initialTrips } from "../data/mockData";

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

export async function fetchTripByInviteCode(code: string): Promise<Trip | null> {
  if (!code) return null;
  const cleanCode = code.trim();
  const normalizedCode = cleanCode.toUpperCase();
  const path = `trips`;

  console.log("[Trip Lookup Debug] Starting trip lookup in Firestore collection:", path, {
    firebaseProjectId: firebaseConfig.projectId,
    enteredCode: code,
    normalizedTripCode: normalizedCode,
  });

  try {
    const colRef = collection(db, path);
    const allSnapshot = await getDocs(colRef);
    console.log("[Trip Lookup Debug] Total documents in collection 'trips' scanned =", allSnapshot.size);

    let matchingDoc: any = null;
    let matchingTrip: Trip | null = null;

    allSnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Trip;
      const tripCodeMatch = data.tripCode && data.tripCode.toUpperCase() === normalizedCode;
      const inviteCodeMatch = data.inviteCode && data.inviteCode.toUpperCase() === normalizedCode;
      const idMatch = data.id && data.id.toUpperCase() === normalizedCode;

      if (tripCodeMatch || inviteCodeMatch || idMatch) {
        const organizerEmail = data.travellers?.find(t => t.role?.toLowerCase() === "organizer")?.email || data.organizerId || "unknown";
        const organizerUid = data.organizerUid || data.organizerId || "unknown";
        const docPath = `${path}/${docSnap.id}`;
        
        console.log("[Trip Lookup Debug] MATCH FOUND:", {
          documentId: docSnap.id,
          collectionPath: docPath,
          tripName: data.name,
          organizerEmail,
          organizerUid,
          tripCode: data.tripCode,
          inviteCode: data.inviteCode,
        });

        if (!matchingTrip) {
          matchingTrip = data;
          matchingDoc = docSnap;
        }
      }
    });

    if (matchingTrip) {
      return matchingTrip;
    }

    console.warn("[Trip Lookup Debug] Zero documents found in Firestore matching tripCode or inviteCode:", normalizedCode);
  } catch (error) {
    console.error("[Trip Lookup Debug] Firestore query error during trip lookup:", error);
  }

  return null;
}

export async function fetchTripById(tripId: string): Promise<Trip | null> {
  const path = `trips/${tripId}`;
  try {
    const docSnap = await getDoc(doc(db, "trips", tripId));
    if (docSnap.exists()) {
      return docSnap.data() as Trip;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
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

export async function saveUserTrip(orgId: string | Trip, trip?: Trip): Promise<void> {
  let actualTrip: Trip;
  if (typeof orgId === "object") {
    actualTrip = orgId;
  } else {
    actualTrip = trip!;
  }

  const path = `trips/${actualTrip.id}`;
  try {
    const orgUid = actualTrip.organizerUid || actualTrip.organizerId || "trv_ajva";
    const memberUids = [orgUid];
    const members: Record<string, any> = {
      [orgUid]: {
        role: "organizer",
        fullName: "Primary Organizer",
        status: "active"
      }
    };

    if (actualTrip.travellers) {
      actualTrip.travellers.forEach((t) => {
        if (t.id) {
          if (!memberUids.includes(t.id)) {
            memberUids.push(t.id);
          }
          members[t.id] = {
            role: t.role ? t.role.toLowerCase() : "traveller",
            fullName: t.fullName || "",
            email: t.email || "",
            status: "active"
          };
        }
      });
    }

    const sanitizedTrip = sanitizeForFirestore({
      ...actualTrip,
      organizerUid: orgUid,
      organizerId: orgUid,
      memberUids,
      members
    });

    // Write to trip document
    await setDoc(doc(db, "trips", actualTrip.id), sanitizedTrip);

    // Sync registrations to subcollection
    if (actualTrip.pendingRegistrations) {
      for (const reg of actualTrip.pendingRegistrations) {
        if (reg.id) {
          const regRef = doc(db, "trips", actualTrip.id, "registrations", reg.id);
          await setDoc(regRef, sanitizeForFirestore(reg), { merge: true });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserTrip(orgId: string | any, tripId?: string): Promise<void> {
  const actualTripId = typeof orgId === "string" && tripId ? tripId : (orgId as string);
  const path = `trips/${actualTripId}`;
  try {
    await deleteDoc(doc(db, "trips", actualTripId));
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
    const remoteTripIds = new Set(remoteTrips.map(t => t.id));
    
    for (const trip of localTrips) {
      if (!remoteTripIds.has(trip.id)) {
        console.log("Migrating trip to Firestore:", trip.id);
        await saveUserTrip(orgId, trip);
      }
    }

    const remoteAccounts = await fetchUserAccounts(orgId);
    const remoteAccountIds = new Set(remoteAccounts.map(a => a.id));
    for (const account of localAccounts) {
      if (!remoteAccountIds.has(account.id)) {
        await saveUserAccount(orgId, account);
      }
    }

    const remoteCashbook = await fetchUserCashbook(orgId);
    const remoteCashbookIds = new Set(remoteCashbook.map(e => e.id));
    for (const entry of localCashbook) {
      if (!remoteCashbookIds.has(entry.id)) {
        await saveUserCashbookEntry(orgId, entry);
      }
    }
  } catch (error) {
    console.error("Migration to Firestore failed:", error);
  }
}

export async function fetchPersonalExpenses(tripId: string, travellerUid: string): Promise<PersonalExpense[]> {
  const path = "personalExpenses";
  try {
    const q = query(
      collection(db, path),
      where("tripId", "==", tripId),
      where("travellerUid", "==", travellerUid)
    );
    const snapshot = await getDocs(q);
    const expenses: PersonalExpense[] = [];
    snapshot.forEach((docSnap) => {
      expenses.push(docSnap.data() as PersonalExpense);
    });
    // Sort by createdAt descending or date descending
    return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function savePersonalExpense(expense: PersonalExpense): Promise<void> {
  const path = `personalExpenses/${expense.id}`;
  try {
    await setDoc(doc(db, "personalExpenses", expense.id), sanitizeForFirestore(expense));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePersonalExpense(expenseId: string): Promise<void> {
  const path = `personalExpenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, "personalExpenses", expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

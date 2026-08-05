import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
  getDoc,
  query,
  where,
  getDocFromServer,
  writeBatch
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, firebaseConfig } from "./firebase";
import { Trip, FinanceAccount, CashbookEntry, PersonalExpense, DiaryEntry, ChecklistItem } from "../types";
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
  const upperCode = cleanCode.toUpperCase();
  const lowerCode = cleanCode.toLowerCase();
  const path = `trips`;

  console.log("[Trip Lookup Debug] Starting trip lookup in Firestore collection:", path, {
    firebaseProjectId: firebaseConfig.projectId,
    enteredCode: code,
    upperCode: upperCode,
    lowerCode: lowerCode,
  });

  try {
    const colRef = collection(db, path);
    
    // Search both inviteCode and tripCode for both upper and lower cases
    const codesToSearch = [upperCode, lowerCode];
    
    const inviteQuery = query(colRef, where("inviteCode", "in", codesToSearch));
    const inviteSnap = await getDocs(inviteQuery);
    if (!inviteSnap.empty) {
      return inviteSnap.docs[0].data() as Trip;
    }

    const tripCodeQuery = query(colRef, where("tripCode", "in", codesToSearch));
    const tripCodeSnap = await getDocs(tripCodeQuery);
    if (!tripCodeSnap.empty) {
      return tripCodeSnap.docs[0].data() as Trip;
    }

    // Finally try checking if the code is actually a tripId directly
    try {
      const docSnap = await getDoc(doc(db, path, upperCode));
      if (docSnap.exists()) {
        return docSnap.data() as Trip;
      }
    } catch (e) {
      // Ignore if document not found
    }

    console.warn("[Trip Lookup Debug] Zero documents found in Firestore matching tripCode or inviteCode:", upperCode);
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

function optimizeTripDocumentPayload(rawTrip: any): any {
  if (!rawTrip) return rawTrip;

  const trip = { ...rawTrip };
  let jsonStr = JSON.stringify(trip);
  const MAX_ALLOWED_BYTES = 800_000; // Safe threshold well below Firestore's 1,048,576 bytes limit

  if (jsonStr.length <= MAX_ALLOWED_BYTES) {
    return trip;
  }

  console.warn(`[Firestore Sync] Trip document size (${jsonStr.length} bytes) exceeds target threshold (${MAX_ALLOWED_BYTES} bytes). Optimizing payload...`);

  // Phase 1: Trim large documents fileUrl (>20KB data URLs)
  if (Array.isArray(trip.documents)) {
    trip.documents = trip.documents.map((docItem: any) => {
      if (typeof docItem.fileUrl === "string" && docItem.fileUrl.startsWith("data:") && docItem.fileUrl.length > 20_000) {
        return {
          ...docItem,
          fileUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop"
        };
      }
      return docItem;
    });
  }

  jsonStr = JSON.stringify(trip);
  if (jsonStr.length <= MAX_ALLOWED_BYTES) return trip;

  // Phase 2: Trim timeline attachments with large data URLs
  if (Array.isArray(trip.timeline)) {
    trip.timeline = trip.timeline.map((act: any) => {
      if (Array.isArray(act.attachments)) {
        const cleanAttachments = act.attachments.map((att: any) => {
          if (typeof att.url === "string" && att.url.startsWith("data:") && att.url.length > 20_000) {
            return { ...att, url: "" };
          }
          return att;
        });
        return { ...act, attachments: cleanAttachments };
      }
      return act;
    });
  }

  jsonStr = JSON.stringify(trip);
  if (jsonStr.length <= MAX_ALLOWED_BYTES) return trip;

  // Phase 3: Trim ticketUrl in transport segments
  if (Array.isArray(trip.segments)) {
    trip.segments = trip.segments.map((seg: any) => {
      if (typeof seg.ticketUrl === "string" && seg.ticketUrl.startsWith("data:") && seg.ticketUrl.length > 20_000) {
        return { ...seg, ticketUrl: "" };
      }
      return seg;
    });
  }

  jsonStr = JSON.stringify(trip);
  if (jsonStr.length <= MAX_ALLOWED_BYTES) return trip;

  // Phase 4: Trim expense receipts
  if (Array.isArray(trip.expenses)) {
    trip.expenses = trip.expenses.map((exp: any) => {
      if (typeof exp.receiptUrl === "string" && exp.receiptUrl.startsWith("data:") && exp.receiptUrl.length > 20_000) {
        return { ...exp, receiptUrl: "" };
      }
      return exp;
    });
  }

  jsonStr = JSON.stringify(trip);
  if (jsonStr.length <= MAX_ALLOWED_BYTES) return trip;

  // Phase 5: Trim pendingRegistrations profile photos from main doc
  if (Array.isArray(trip.pendingRegistrations)) {
    trip.pendingRegistrations = trip.pendingRegistrations.map((reg: any) => {
      if (typeof reg.profilePhoto === "string" && reg.profilePhoto.startsWith("data:") && reg.profilePhoto.length > 15_000) {
        return { ...reg, profilePhoto: "", profilePhotoUrl: reg.profilePhotoUrl?.startsWith("data:") ? "" : reg.profilePhotoUrl };
      }
      return reg;
    });
  }

  jsonStr = JSON.stringify(trip);
  if (jsonStr.length <= MAX_ALLOWED_BYTES) return trip;

  // Phase 6: Trim travellers profile photos if they are huge data URLs
  if (Array.isArray(trip.travellers)) {
    trip.travellers = trip.travellers.map((trav: any) => {
      let photo = trav.profilePhoto;
      let photoUrl = trav.profilePhotoUrl;
      if (typeof photo === "string" && photo.startsWith("data:") && photo.length > 30_000) {
        photo = "";
      }
      if (typeof photoUrl === "string" && photoUrl.startsWith("data:") && photoUrl.length > 30_000) {
        photoUrl = "";
      }
      return { ...trav, profilePhoto: photo, profilePhotoUrl: photoUrl };
    });
  }

  jsonStr = JSON.stringify(trip);
  if (jsonStr.length <= MAX_ALLOWED_BYTES) return trip;

  // Phase 7: Trim coverPhoto / coverImage if large data URL
  if (typeof trip.coverImage === "string" && trip.coverImage.startsWith("data:") && trip.coverImage.length > 30_000) {
    trip.coverImage = "";
  }
  if (typeof trip.coverPhoto === "string" && trip.coverPhoto.startsWith("data:") && trip.coverPhoto.length > 30_000) {
    trip.coverPhoto = "";
  }

  return trip;
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

    const optimizedTrip = optimizeTripDocumentPayload(sanitizedTrip);

    // Write to trip document
    await setDoc(doc(db, "trips", actualTrip.id), optimizedTrip);

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

export async function fetchDiaryEntries(tripId: string, ownerUid: string): Promise<DiaryEntry[]> {
  const path = "travelDiaries";
  try {
    const q = query(
      collection(db, path),
      where("tripId", "==", tripId),
      where("ownerUid", "==", ownerUid)
    );
    const snapshot = await getDocs(q);
    const entries: DiaryEntry[] = [];
    snapshot.forEach((docSnap) => {
      entries.push(docSnap.data() as DiaryEntry);
    });
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveDiaryEntry(entry: DiaryEntry): Promise<void> {
  const path = `travelDiaries/${entry.id}`;
  try {
    await setDoc(doc(db, "travelDiaries", entry.id), sanitizeForFirestore(entry));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDiaryEntry(diaryId: string): Promise<void> {
  const path = `travelDiaries/${diaryId}`;
  try {
    await deleteDoc(doc(db, "travelDiaries", diaryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchChecklistItems(tripId: string, ownerUid: string): Promise<ChecklistItem[]> {
  const path = "checklistItems";
  try {
    const q = query(
      collection(db, path),
      where("tripId", "==", tripId),
      where("ownerUid", "==", ownerUid)
    );
    const snapshot = await getDocs(q);
    const items: ChecklistItem[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as ChecklistItem);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveChecklistItem(item: ChecklistItem): Promise<void> {
  const path = `checklistItems/${item.id}`;
  try {
    await setDoc(doc(db, "checklistItems", item.id), sanitizeForFirestore(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserTripsByUid(uid: string): Promise<Trip[]> {
  const path = `trips`;
  try {
    const qMember = query(collection(db, path), where("memberUids", "array-contains", uid));
    const snapshotMember = await getDocs(qMember);
    const tripsMap = new Map<string, Trip>();

    snapshotMember.forEach((docSnap) => {
      tripsMap.set(docSnap.id, docSnap.data() as Trip);
    });

    // Also check organizerUid
    const qOrg = query(collection(db, path), where("organizerUid", "==", uid));
    const snapshotOrg = await getDocs(qOrg);
    snapshotOrg.forEach((docSnap) => {
      tripsMap.set(docSnap.id, docSnap.data() as Trip);
    });

    return Array.from(tripsMap.values());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function verifyTripMembership(uid: string, tripId: string): Promise<{ isValid: boolean; trip: Trip | null }> {
  try {
    const tripSnap = await getDoc(doc(db, "trips", tripId));
    if (!tripSnap.exists()) {
      return { isValid: false, trip: null };
    }
    const tripData = tripSnap.data() as Trip;
    const isOrganizer = tripData.organizerUid === uid || tripData.organizerId === uid;
    const isMemberUid = Array.isArray(tripData.memberUids) && tripData.memberUids.includes(uid);
    const isTraveller = Array.isArray(tripData.travellers) && tripData.travellers.some(t => t.id === uid && t.status !== "left" && t.status !== "removed");

    const isValid = isOrganizer || isMemberUid || isTraveller;
    return { isValid, trip: isValid ? tripData : null };
  } catch (error) {
    console.error("Error verifying trip membership:", error);
    return { isValid: false, trip: null };
  }
}

export async function leaveTrip(arg1: string, arg2: string): Promise<void> {
  try {
    console.log("LEAVE_TRIP_CALLED", { arg1, arg2 });
    let tripId = arg1;
    let uid = arg2;

    // Smart detection in case arguments were passed as (uid, tripId) or (tripId, uid)
    const tripRef1 = doc(db, "trips", arg1);
    const snap1 = await getDoc(tripRef1);
    if (!snap1.exists()) {
      const tripRef2 = doc(db, "trips", arg2);
      const snap2 = await getDoc(tripRef2);
      if (snap2.exists()) {
        tripId = arg2;
        uid = arg1;
      }
    }

    const tripRef = doc(db, "trips", tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) {
      throw new Error("Trip not found");
    }

    const tripData = tripSnap.data() as Trip;
    const isOrganizer = tripData.organizerUid === uid || tripData.organizerId === uid;
    if (isOrganizer) {
      throw new Error("You are the organizer of this trip. Transfer ownership or delete the trip instead.");
    }

    // 1. Remove traveller completely from travellers list and memberUids
    const updatedMemberUids = (tripData.memberUids || []).filter(id => id !== uid);
    const updatedTravellers = (tripData.travellers || []).filter(t => t.id !== uid);

    // 2. Query other memberships for the leaving user to find next active trip
    const membershipsRef = collection(db, "users", uid, "memberships");
    const membershipsSnap = await getDocs(membershipsRef);
    const remainingMemberships = membershipsSnap.docs
      .map(doc => doc.data())
      .filter(m => m.tripId !== tripId);

    let nextTripId = "";
    let nextTripCode = "";
    if (remainingMemberships.length > 0) {
      nextTripId = remainingMemberships[0].tripId || "";
      nextTripCode = remainingMemberships[0].tripCode || "";
    }

    // 3. Create a WriteBatch to make this operation atomic
    const batch = writeBatch(db);

    // Update the trip document: remove user from memberUids & travellers
    batch.update(tripRef, {
      memberUids: updatedMemberUids,
      travellers: updatedTravellers,
      updatedAt: new Date().toISOString()
    });

    // Delete registration document in trip subcollection
    const regRef = doc(db, "trips", tripId, "registrations", uid);
    batch.delete(regRef);

    // Delete membership document in user subcollection
    const userMembershipRef = doc(db, "users", uid, "memberships", tripId);
    batch.delete(userMembershipRef);

    // Check if the user document exists. If so, update it atomically.
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      batch.update(userRef, {
        tripId: nextTripId,
        lastActiveTripId: nextTripId,
        tripCode: nextTripCode,
        updatedAt: new Date().toISOString()
      });
    }

    // Commit the entire atomic batch!
    await batch.commit();
    console.log("LEAVE_TRIP_ATOMIC_SUCCESS", { tripId, uid });
  } catch (error) {
    console.error("Error leaving trip:", error);
    throw error;
  }
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const path = `checklistItems/${itemId}`;
  try {
    await deleteDoc(doc(db, "checklistItems", itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

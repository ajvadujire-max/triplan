/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { getDoc, doc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Routes, Route } from "react-router-dom";
import { AdminPortal } from "./components/AdminPortal";
import { AdminDashboard } from "./components/AdminDashboard";
import { InitSuperAdmin } from "./components/InitSuperAdmin";

// ... keep imports
import {
  Trip,
  FinanceAccount,
  CashbookEntry,
  Expense,
} from "./types";
import { initialTrips, initialAccounts, initialCashbookEntries } from "./data/mockData";
import { Navbar } from "./components/Navbar";
import { MobileNavigation } from "./components/MobileNavigation";
import { TripDashboard } from "./components/TripDashboard";
import { TripCreateModal } from "./components/TripCreateModal";
import { TravellersModule } from "./components/TravellersModule";
import { CollectionsModule } from "./components/CollectionsModule";
import { ExpensesModule } from "./components/ExpensesModule";
import { JourneyBuilder } from "./components/JourneyBuilder";
import { VaultChecklist } from "./components/VaultChecklist";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { PlannerModule } from "./components/PlannerModule";
import { WeatherMapsTimeline } from "./components/WeatherMapsTimeline";
import { FinanceIntegration } from "./components/FinanceIntegration";
import { AiInsightsModule } from "./components/AiInsightsModule";
import { initAuth, googleSignIn, logoutGoogle } from "./lib/googleAuth";
import {
  fetchUserTrips,
  fetchUserAccounts,
  fetchUserCashbook,
  saveUserTrip,
  saveUserAccount,
  saveUserCashbookEntry,
  deleteUserAccount,
  deleteUserCashbookEntry,
  migrateLocalDataToFirestore,
  fetchTripById,
} from "./lib/firestoreSync";

function MainApp({ role = "traveller" }: { role?: "traveller" | "organizer" }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [userRole, setUserRole] = useState<"traveller" | "organizer" | "super_admin">(role as any);

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem("trippro_trips");
    return saved ? JSON.parse(saved) : initialTrips;
  });

  const [selectedTripId, setSelectedTripId] = useState<string>(() => {
    const active = localStorage.getItem("trippro_active_trip_id");
    if (active && trips.some((t) => t.id === active)) return active;
    return trips[0]?.id || "trip_goa_01";
  });

  useEffect(() => {
    if (selectedTripId) {
      localStorage.setItem("trippro_active_trip_id", selectedTripId);
    }
  }, [selectedTripId]);

  useEffect(() => {
    const syncActiveTrip = () => {
      const savedTripsStr = localStorage.getItem("trippro_trips");
      if (savedTripsStr) {
        try {
          const parsed = JSON.parse(savedTripsStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTrips(parsed);
          }
        } catch {
          // ignore
        }
      }
      const active = localStorage.getItem("trippro_active_trip_id");
      if (active) {
        setSelectedTripId(active);
      }
    };

    window.addEventListener("trip_changed", syncActiveTrip);
    window.addEventListener("storage", syncActiveTrip);

    const active = localStorage.getItem("trippro_active_trip_id");
    if (active && trips.some((t) => t.id === active)) {
      setSelectedTripId(active);
    }

    return () => {
      window.removeEventListener("trip_changed", syncActiveTrip);
      window.removeEventListener("storage", syncActiveTrip);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "planner" | "journey" | "collections" | "timeline" | "travellers" | "expenses" | "vault" | "weather" | "weather_maps" | "finance" | "ai" | "ai_insights"
  >("dashboard");

  const [accounts, setAccounts] = useState<FinanceAccount[]>(() => {
    const saved = localStorage.getItem("trippro_accounts");
    return saved ? JSON.parse(saved) : initialAccounts;
  });

  const [cashbook, setCashbook] = useState<CashbookEntry[]>(() => {
    const saved = localStorage.getItem("trippro_cashbook");
    return saved ? JSON.parse(saved) : initialCashbookEntries;
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem("trippro_theme");
    if (savedTheme === "dark") return true;
    if (savedTheme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    const nextVal = !darkMode;
    setDarkMode(nextVal);
    localStorage.setItem("trippro_theme", nextVal ? "dark" : "light");
  };

  useEffect(() => {
    localStorage.setItem("trippro_trips", JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem("trippro_accounts", JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem("trippro_cashbook", JSON.stringify(cashbook));
  }, [cashbook]);

  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeTrips: (() => void) | null = null;
    let unsubscribeAccounts: (() => void) | null = null;
    let unsubscribeCashbook: (() => void) | null = null;

    const unsubscribeAuth = initAuth(
      async (loggedInUser) => {
        setUser(loggedInUser);
        setIsLoadingCloud(true);
        try {
          // Determine user role and details from /users/{uid}
          const userDoc = await getDoc(doc(db, "users", loggedInUser.uid));
          let role: "traveller" | "organizer" | "super_admin" = "traveller";
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role) {
              const lowerRole = userData.role.toLowerCase();
              const normalizedRole = lowerRole === "organizer" ? "organizer" : lowerRole === "super_admin" ? "super_admin" : "traveller";
              role = normalizedRole;
              setUserRole(normalizedRole);
            }
          }

          // Check admin collection for backwards compatibility
          const adminDoc = await getDoc(doc(db, "admins", loggedInUser.uid));
          if (adminDoc.exists()) {
            const adminRole = adminDoc.data().role || "organizer";
            if (adminRole === "super_admin" || adminRole === "admin" || adminRole === "Admin") {
              role = "super_admin";
              setUserRole("super_admin");
              if (!window.location.pathname.startsWith("/admin")) {
                window.location.href = "/admin/dashboard";
                return;
              }
            }
          }

          let orgId = `personal_${loggedInUser.uid}`;
          if (adminDoc.exists() && adminDoc.data().organizationId) {
            orgId = adminDoc.data().organizationId;
          }
          setOrganizationId(orgId);

          // Migrate local storage once on sign-in
          const savedTrips = localStorage.getItem("trippro_trips");
          const savedAccounts = localStorage.getItem("trippro_accounts");
          const savedCashbook = localStorage.getItem("trippro_cashbook");

          const tripsToMigrate = savedTrips ? JSON.parse(savedTrips) : initialTrips;
          const accountsToMigrate = savedAccounts ? JSON.parse(savedAccounts) : initialAccounts;
          const cashbookToMigrate = savedCashbook ? JSON.parse(savedCashbook) : initialCashbookEntries;

          await migrateLocalDataToFirestore(
            orgId,
            tripsToMigrate,
            accountsToMigrate,
            cashbookToMigrate
          );

          // Real-time trips listener based on role
          const tripsRef = collection(db, "trips");
          const tripsQuery = role === "organizer"
            ? query(tripsRef, where("organizerUid", "==", loggedInUser.uid))
            : query(tripsRef, where("memberUids", "array-contains", loggedInUser.uid));

          unsubscribeTrips = onSnapshot(tripsQuery, (snapshot) => {
            const fetchedTrips: Trip[] = [];
            snapshot.forEach((docSnap) => {
              fetchedTrips.push(docSnap.data() as Trip);
            });
            if (fetchedTrips.length > 0) {
              setTrips(fetchedTrips);
              setSelectedTripId((prevId) => {
                if (fetchedTrips.some((t) => t.id === prevId)) return prevId;
                return fetchedTrips[0].id;
              });
            }
          }, (err) => {
            console.error("Trips real-time subscription error:", err);
          });

          // Real-time accounts listener
          const accountsQuery = query(collection(db, "accounts"), where("organizationId", "==", orgId));
          unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
            const fetchedAccs: FinanceAccount[] = [];
            snapshot.forEach((docSnap) => {
              fetchedAccs.push(docSnap.data() as FinanceAccount);
            });
            if (fetchedAccs.length > 0) {
              setAccounts(fetchedAccs);
            }
          });

          // Real-time cashbook listener
          const cashbookQuery = query(collection(db, "cashbook"), where("organizationId", "==", orgId));
          unsubscribeCashbook = onSnapshot(cashbookQuery, (snapshot) => {
            const fetchedCb: CashbookEntry[] = [];
            snapshot.forEach((docSnap) => {
              fetchedCb.push(docSnap.data() as CashbookEntry);
            });
            if (fetchedCb.length > 0) {
              setCashbook(fetchedCb);
            }
          });

        } catch (err) {
          console.error("Cloud initialization error:", err);
        } finally {
          setIsLoadingCloud(false);
        }
      },
      async () => {
        // Handle Logout / Offline
        setUser(null);
        setOrganizationId(null);
        if (unsubscribeTrips) unsubscribeTrips();
        if (unsubscribeAccounts) unsubscribeAccounts();
        if (unsubscribeCashbook) unsubscribeCashbook();

        const saved = localStorage.getItem("trippro_trips");
        const localTrips: Trip[] = saved ? JSON.parse(saved) : initialTrips;
        setTrips(localTrips);

        // Fetch latest updates offline/cached
        if (saved) {
          const updatedTrips: Trip[] = [];
          for (const lt of localTrips) {
            try {
              const latestTrip = await fetchTripById(lt.id);
              if (latestTrip) {
                updatedTrips.push(latestTrip);
              } else {
                updatedTrips.push(lt);
              }
            } catch (err) {
              updatedTrips.push(lt);
            }
          }
          if (updatedTrips.length > 0) {
            setTrips(updatedTrips);
          }
        }

        const savedAccs = localStorage.getItem("trippro_accounts");
        setAccounts(savedAccs ? JSON.parse(savedAccs) : initialAccounts);
        const savedCb = localStorage.getItem("trippro_cashbook");
        setCashbook(savedCb ? JSON.parse(savedCb) : initialCashbookEntries);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeTrips) unsubscribeTrips();
      if (unsubscribeAccounts) unsubscribeAccounts();
      if (unsubscribeCashbook) unsubscribeCashbook();
    };
  }, []);

  // Real-time registrations listener for loaded trips
  useEffect(() => {
    if (!user || trips.length === 0) return;

    let unsubs: (() => void)[] = [];

    function setupRegistrationListeners() {
      unsubs = trips.map((trip) => {
        const registrationsRef = collection(db, "trips", trip.id, "registrations");
        return onSnapshot(registrationsRef, (snapshot) => {
          const regs: any[] = [];
          snapshot.forEach((docSnap) => {
            regs.push({ id: docSnap.id, ...docSnap.data() });
          });

          // Update this trip's pendingRegistrations in state if changed
          setTrips((prevTrips) =>
            prevTrips.map((t) => {
              if (t.id === trip.id) {
                // Avoid infinite re-renders by checking if they actually changed
                const currentRegsJson = JSON.stringify(t.pendingRegistrations || []);
                const newRegsJson = JSON.stringify(regs);
                if (currentRegsJson !== newRegsJson) {
                  return {
                    ...t,
                    pendingRegistrations: regs,
                  };
                }
              }
              return t;
            })
          );
        });
      });
    }

    setupRegistrationListeners();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [user, trips.map((t) => t.id).join(",")]);

  const handleSignIn = async () => {
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    try {
      await googleSignIn();
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request" ||
        err?.code === "auth/popup-blocked"
      ) {
        console.warn("Google sign-in closed by user.");
      } else {
        console.error("Google login failed:", err);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
    } catch (err) {
      console.error("Google logout failed:", err);
    }
  };

  const activeTrip = trips.find((t) => t.id === selectedTripId) || trips[0];

  const handleUpdateTrip = (updatedTrip: Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)));
    if (user && organizationId) {
      saveUserTrip(organizationId, updatedTrip);
    }
  };

  const handleSaveTrip = (savedTrip: Trip) => {
    if (editingTrip) {
      setTrips((prev) => prev.map((t) => (t.id === savedTrip.id ? savedTrip : t)));
    } else {
      setTrips((prev) => [savedTrip, ...prev]);
      setSelectedTripId(savedTrip.id);
    }
    if (user && organizationId) {
      saveUserTrip(organizationId, savedTrip);
    }
    setEditingTrip(null);
    setIsCreateModalOpen(false);
  };

  const handleAddExpense = (newExpense: Expense, accountId: string, amount: number) => {
    if (!activeTrip) return;
    const updatedExpenses = [newExpense, ...activeTrip.expenses];
    const newTotalSpent = updatedExpenses.reduce((acc, e) => acc + e.amount, 0);
    const newRemaining = activeTrip.totalBudget - newTotalSpent;

    const updatedTrip: Trip = {
      ...activeTrip,
      expenses: updatedExpenses,
      totalSpent: newTotalSpent,
      remainingBudget: newRemaining,
    };

    handleUpdateTrip(updatedTrip);

    setAccounts((prevAccounts) => {
      const updated = prevAccounts.map((acc) =>
        acc.id === accountId ? { ...acc, balance: acc.balance - amount } : acc
      );
      if (user && organizationId) {
        const targetAcc = updated.find((a) => a.id === accountId);
        if (targetAcc) {
          saveUserAccount(organizationId, targetAcc);
        }
      }
      return updated;
    });

    const targetAccount = accounts.find((a) => a.id === accountId);
    const newCashbookEntry: CashbookEntry = {
      id: `cb_${Date.now()}`,
      tripId: activeTrip.id,
      date: newExpense.date,
      description: `[Trip: ${activeTrip.name}] ${newExpense.description}`,
      category: newExpense.category,
      type: "debit",
      amount,
      accountId,
      auditTrail: `Paid via ${targetAccount?.name || "Account"}. Split between ${
        newExpense.whoUsedIds.length
      } members.`,
    };

    setCashbook((prev) => {
      const updated = [newCashbookEntry, ...prev];
      if (user && organizationId) {
        saveUserCashbookEntry(organizationId, newCashbookEntry);
      }
      return updated;
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!activeTrip) return;
    const expToDelete = activeTrip.expenses.find((e) => e.id === expenseId);
    if (!expToDelete) return;

    const updatedExpenses = activeTrip.expenses.filter((e) => e.id !== expenseId);
    const newTotalSpent = updatedExpenses.reduce((acc, e) => acc + e.amount, 0);
    const newRemaining = activeTrip.totalBudget - newTotalSpent;

    const updatedTrip: Trip = {
      ...activeTrip,
      expenses: updatedExpenses,
      totalSpent: newTotalSpent,
      remainingBudget: newRemaining,
    };

    handleUpdateTrip(updatedTrip);

    setAccounts((prev) => {
      const updated = prev.map((acc) =>
        acc.id === expToDelete.accountUsedId
          ? { ...acc, balance: acc.balance + expToDelete.amount }
          : acc
      );
      if (user && organizationId) {
        const targetAcc = updated.find((acc) => acc.id === expToDelete.accountUsedId);
        if (targetAcc) {
          saveUserAccount(organizationId, targetAcc);
        }
      }
      return updated;
    });
  };

  const handleSaveAccount = (account: FinanceAccount) => {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      const updated = exists
        ? prev.map((a) => (a.id === account.id ? account : a))
        : [account, ...prev];
      if (user && organizationId) {
        saveUserAccount(organizationId, account);
      }
      return updated;
    });
  };

  const handleDeleteAccount = (accountId: string) => {
    setAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== accountId);
      if (user && organizationId) {
        deleteUserAccount(organizationId, accountId);
      }
      return updated;
    });
  };

  const handleSaveCashbookEntry = (entry: CashbookEntry) => {
    setCashbook((prev) => {
      const exists = prev.some((e) => e.id === entry.id);
      const updated = exists
        ? prev.map((e) => (e.id === entry.id ? entry : e))
        : [entry, ...prev];
      if (user && organizationId) {
        saveUserCashbookEntry(organizationId, entry);
      }
      return updated;
    });
  };

  const handleDeleteCashbookEntry = (entryId: string) => {
    setCashbook((prev) => {
      const updated = prev.filter((e) => e.id !== entryId);
      if (user && organizationId) {
        deleteUserCashbookEntry(organizationId, entryId);
      }
      return updated;
    });
  };

  if (!activeTrip) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p>Loading TripPro system...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col overflow-x-hidden">
      {isLoadingCloud && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Syncing with TripPro Cloud...
            </p>
          </div>
        </div>
      )}

      <Navbar
        trips={trips}
        activeTripId={selectedTripId}
        onSelectTrip={(id) => setSelectedTripId(id)}
        onOpenCreateTrip={() => {
          setEditingTrip(null);
          setIsCreateModalOpen(true);
        }}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab as any)}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isAuthLoading={isAuthLoading}
        role={userRole}
        onRoleChange={(newRole) => setUserRole(newRole)}
      />

      <MobileNavigation
        trips={trips}
        activeTripId={selectedTripId}
        onSelectTrip={(id) => setSelectedTripId(id)}
        onOpenCreateTrip={() => {
          setEditingTrip(null);
          setIsCreateModalOpen(true);
        }}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab as any)}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isAuthLoading={isAuthLoading}
        role={userRole}
        onRoleChange={(newRole) => setUserRole(newRole)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 space-y-6">
        {activeTab === "dashboard" && (
          <TripDashboard
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            onEditTrip={() => {
              setEditingTrip(activeTrip);
              setIsCreateModalOpen(true);
            }}
            role={userRole}
          />
        )}

        {activeTab === "collections" && (
          <CollectionsModule
            trip={activeTrip}
            onUpdateTrip={handleUpdateTrip}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === "travellers" && (
          <TravellersModule trip={activeTrip} onUpdateTrip={handleUpdateTrip} appRole={userRole} currentUser={user} />
        )}
        
        {activeTab === "planner" && (
          <PlannerModule trip={activeTrip} onUpdateTrip={handleUpdateTrip} role={userRole} />
        )}

        {/* Fallbacks for internal navigation if any */}
        {activeTab === "journey" && (
          <PlannerModule trip={activeTrip} onUpdateTrip={handleUpdateTrip} role={userRole} />
        )}

        {activeTab === "timeline" && (
          <PlannerModule trip={activeTrip} onUpdateTrip={handleUpdateTrip} role={userRole} />
        )}

        {activeTab === "expenses" && (
          <ExpensesModule
            trip={activeTrip}
            accounts={accounts}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onUpdateTrip={handleUpdateTrip}
            role={userRole}
            currentUser={user}
          />
        )}

        {activeTab === "vault" && (
          <VaultChecklist trip={activeTrip} onUpdateTrip={handleUpdateTrip} />
        )}

        {(activeTab === "weather" || activeTab === "weather_maps") && (
          <WeatherMapsTimeline trip={activeTrip} onUpdateTrip={handleUpdateTrip} />
        )}

        {activeTab === "finance" && (
          <FinanceIntegration
            trip={activeTrip}
            accounts={accounts}
            cashbookEntries={cashbook}
            onSaveAccount={handleSaveAccount}
            onDeleteAccount={handleDeleteAccount}
            onSaveCashbookEntry={handleSaveCashbookEntry}
            onDeleteCashbookEntry={handleDeleteCashbookEntry}
          />
        )}

        {(activeTab === "ai" || activeTab === "ai_insights") && <AiInsightsModule trip={activeTrip} />}
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-auto print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> GPS Tracking Active
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
            Connected to Personal Finance Pro Ecosystem v4.22.8
          </div>
        </div>
        <div className="text-[10px] font-medium text-slate-400 italic">
          Secured by 256-bit AES Encryption • TripPro Treasury Sync
        </div>
      </footer>

      <TripCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTrip(null);
        }}
        onSaveTrip={handleSaveTrip}
        initialTrip={editingTrip}
      />
    </div>
  );
}

import { ContactTravellerProvider } from "./components/ContactOptionsBottomSheet";

import LandingPage from "./pages/LandingPage";
import OnboardingWizard from "./pages/OnboardingWizard";
import JoinTrip from "./pages/JoinTrip";
import JoinTripByCode from "./pages/JoinTripByCode";
import { TravellerLogin, OrganizerLogin, SuperAdminLogin } from "./pages/LoginPages";
import TravellerDashboard from "./pages/TravellerDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

export default function App() {
  return (
    <ContactTravellerProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/join" element={<JoinTripByCode />} />
        <Route path="/join/:tripCode" element={<JoinTrip />} />
        <Route path="/t/:tripCode" element={<JoinTrip />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<TravellerLogin />} />
        <Route path="/admin/login" element={<OrganizerLogin />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        
        {/* Dashboards - All using original MainApp but with roles */}
        <Route path="/dashboard" element={<MainApp role="traveller" />} />
        <Route path="/admin/dashboard" element={<MainApp role="organizer" />} />
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />

        {/* Fallbacks */}
        <Route path="/app" element={<MainApp role="traveller" />} />
      </Routes>
    </ContactTravellerProvider>
  );
}

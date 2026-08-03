import React, { useState } from "react";
import { User } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  Luggage,
  Users,
  Wallet,
  IndianRupee,
  Menu,
  Clock,
  Calendar,
  CloudSun,
  Sparkles,
  ChevronDown,
  Plus,
  Sun,
  Moon,
  LogOut,
  Sparkle,
  X,
  Bell,
  Search,
  BookOpen
} from "lucide-react";
import { Trip } from "../types";

interface MobileNavigationProps {
  trips: Trip[];
  activeTripId: string;
  onSelectTrip: (id: string) => void;
  onOpenCreateTrip: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isAuthLoading?: boolean;
  role?: "traveller" | "organizer" | "super_admin";
  onRoleChange?: (role: "traveller" | "organizer" | "super_admin") => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  trips,
  activeTripId,
  onSelectTrip,
  onOpenCreateTrip,
  darkMode,
  onToggleDarkMode,
  activeTab,
  onSelectTab,
  user,
  onSignIn,
  onSignOut,
  isAuthLoading = false,
  role = "traveller",
  onRoleChange,
}) => {
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];
  const isOrganizerCreator = !!(user && activeTrip && activeTrip.organizerId === user.uid);

  const primaryTabsAll = [
    { id: "dashboard", label: "Dashboard", icon: Compass },
    { id: "planner", label: "Planner", icon: Luggage },
    { id: "collections", label: "Collections", icon: IndianRupee, organizerOnly: true },
    { id: "expenses", label: "Expenses", icon: Wallet },
    { id: "travellers", label: "Travellers", icon: Users },
  ];

  const primaryTabs = primaryTabsAll.filter(tab => !tab.organizerOnly || role === "organizer" || role === "super_admin");

  const moreTabsAll = [
    { id: "diary", label: "Travel Diary", icon: BookOpen, description: "Personal journey memories & photos" },
    { id: "vault", label: "Vault & Packing", icon: Calendar, description: "Checklists & essential files" },
    { id: "weather_maps", label: "Weather & Maps", icon: CloudSun, description: "Live climate & route views" },
    { id: "finance", label: "Finance & Cashbook", icon: Wallet, description: "Account ledger audit sync", organizerOnly: true },
    { id: "ai_insights", label: "AI Smart Insights", icon: Sparkles, description: "Predictive fuel & schedules" },
  ];

  const moreTabs = moreTabsAll.filter(tab => !tab.organizerOnly || role === "organizer" || role === "super_admin");

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    setIsMoreDrawerOpen(false);
  };

  return (
    <div className="block md:hidden select-none">
      {/* 1. Mobile Compact Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 transition-colors h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-[12px]">
          <div className="w-10 h-10 sm:w-[44px] sm:h-[44px] rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-white shadow-sm border border-slate-100">
            <img 
              src="/triplan_logo.png" 
              alt="Triplan Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          <span className="font-['Poppins'] font-semibold text-[22px] text-[#1B3EBF] tracking-tight leading-none mt-0.5">
            Triplan
          </span>
        </div>

        {/* Quick actions (Sync indicator / dark mode / profile) */}
        <div className="flex items-center gap-2">
          {/* Dark Mode toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="w-9 h-9 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User auth or trigger */}
          {user ? (
            <button
              onClick={() => setIsMoreDrawerOpen(true)}
              className="relative w-8 h-8 rounded-full border border-indigo-200 dark:border-indigo-800 overflow-hidden active:scale-95 transition-transform"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}
              {/* Online indicator dot */}
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white dark:border-slate-900 rounded-full" />
            </button>
          ) : (
            <button
              onClick={onSignIn}
              disabled={isAuthLoading}
              className={`flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide transition-all ${
                isAuthLoading ? "opacity-60 cursor-not-allowed" : "active:scale-95 cursor-pointer"
              }`}
            >
              {isAuthLoading ? (
                <>
                  <div className="w-3 h-3 border border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span>Sync...</span>
                </>
              ) : (
                <>
                  <Sparkle className="w-3 h-3 animate-pulse" />
                  <span>Sync</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* 2. Fixed Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800/80 px-2 pb-safe pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] flex justify-around items-center transition-colors">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !isMoreDrawerOpen;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 px-2 h-12 rounded-xl transition-all relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-x-3 inset-y-1 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-transform duration-200 active:scale-75 ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400 stroke-[2.5]"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                }`}
              />
              <span
                className={`text-[9px] font-extrabold tracking-tight mt-1 transition-colors ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <button
          onClick={() => setIsMoreDrawerOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 px-2 h-12 rounded-xl transition-all relative"
        >
          {isMoreDrawerOpen && (
            <div className="absolute inset-x-3 inset-y-1 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl" />
          )}
          <Menu
            className={`w-5 h-5 transition-transform duration-200 active:scale-75 ${
              isMoreDrawerOpen
                ? "text-indigo-600 dark:text-indigo-400 stroke-[2.5]"
                : "text-slate-400 dark:text-slate-500"
            }`}
          />
          <span
            className={`text-[9px] font-extrabold tracking-tight mt-1 transition-colors ${
              isMoreDrawerOpen
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            More
          </span>
        </button>
      </nav>

      {/* 3. Slide-Up "More" Menu Drawer & Options */}
      <AnimatePresence>
        {isMoreDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-2xl pb-10 transition-colors"
            >
              {/* Drawer Pull Handle Indicator */}
              <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto my-3" />

              <div className="px-5 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    TripPro Menu
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    Select a feature or manage cloud state
                  </p>
                </div>
                <button
                  onClick={() => setIsMoreDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Profile Summary in Menu */}
              <div className="p-4 mx-4 my-3 bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user ? (
                    <>
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          className="w-10 h-10 rounded-full border border-indigo-200 dark:border-indigo-850"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          {user.displayName?.charAt(0) || "U"}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {user.displayName}
                        </h4>
                        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" /> Cloud Active
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        ☁️
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          Offline Mode
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Logs saved to your local storage
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {user ? (
                  <button
                    onClick={() => {
                      onSignOut();
                      setIsMoreDrawerOpen(false);
                    }}
                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/60 text-red-600 dark:text-red-400 text-[10px] font-extrabold uppercase active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!isAuthLoading) {
                        onSignIn();
                        setIsMoreDrawerOpen(false);
                      }
                    }}
                    disabled={isAuthLoading}
                    className={`flex items-center gap-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold uppercase shadow-sm transition-all ${
                      isAuthLoading ? "opacity-60 cursor-not-allowed" : "active:scale-95 cursor-pointer"
                    }`}
                  >
                    {isAuthLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sync...</span>
                      </>
                    ) : (
                      <>
                        <Sparkle className="w-3.5 h-3.5" />
                        <span>Sync</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Dynamic View Role Toggle (useful for previewing both modes) */}
              {isOrganizerCreator && (
                <div className="px-5 py-2 space-y-2 select-none">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Active View Role
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-800">
                    <button
                      onClick={() => {
                        onRoleChange?.("traveller");
                        setIsMoreDrawerOpen(false);
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                        role === "traveller"
                          ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-100 dark:border-indigo-900/60"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Traveller Mode
                    </button>
                    <button
                      onClick={() => {
                        onRoleChange?.("organizer");
                        setIsMoreDrawerOpen(false);
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                        role === "organizer"
                          ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-100 dark:border-indigo-900/60"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Organizer Mode
                    </button>
                  </div>
                </div>
              )}

              {/* Grid of secondary tabs */}
              <div className="px-5 py-2 space-y-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Secondary Features
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {moreTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex items-start gap-4 p-3 rounded-2xl border text-left transition-all ${
                          isActive
                            ? "bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900/80"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 active:bg-slate-50 dark:active:bg-slate-850"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive
                              ? "bg-indigo-100 dark:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p
                            className={`text-xs font-bold ${
                              isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {tab.label}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5 font-medium">
                            {tab.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

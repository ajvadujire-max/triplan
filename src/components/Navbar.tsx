/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User } from "firebase/auth";
import { Trip } from "../types";
import {
  Compass,
  Plus,
  Moon,
  Sun,
  MapPin,
  Calendar,
  Wallet,
  IndianRupee,
  Sparkles,
  Luggage,
  Clock,
  CloudSun,
  Users,
} from "lucide-react";

interface NavbarProps {
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

export const Navbar: React.FC<NavbarProps> = ({
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
  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];
  const isOrganizerCreator = !!(user && activeTrip && activeTrip.organizerId === user.uid);

  const allTabs = [
    { id: "dashboard", label: "Dashboard", icon: Compass },
    { id: "planner", label: "Planner", icon: Luggage },
    { id: "collections", label: "Collections", icon: IndianRupee, organizerOnly: true },
    { id: "expenses", label: "Split Expenses", icon: Wallet },
    { id: "travellers", label: "Travellers & Budgets", icon: Users },
    { id: "vault", label: "Vault & Packing", icon: Calendar },
    { id: "weather_maps", label: "Weather & Maps", icon: CloudSun },
    { id: "finance", label: "Finance & Cashbook", icon: Wallet, organizerOnly: true },
    { id: "ai_insights", label: "AI Insights", icon: Sparkles },
  ];

  const tabs = allTabs.filter(tab => !tab.organizerOnly || role === "organizer" || role === "super_admin");

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                TripPro
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Treasury Pro v4.2
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block font-medium">
              Travel Planner & Finance Cashbook Sync
            </p>
          </div>
        </div>

        {/* Multi-Trip Selector & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {trips.length > 0 && (
            <div className="relative">
              <select
                value={activeTripId}
                onChange={(e) => onSelectTrip(e.target.value)}
                aria-label="Select active trip"
                className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold py-2 pl-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    📍 {trip.name} ({trip.destination})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                ▼
              </div>
            </div>
          )}

          <button
            onClick={onOpenCreateTrip}
            className="flex items-center gap-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip</span>
          </button>

          {/* Quick Role Toggle (useful for previewing both modes) */}
          {isOrganizerCreator && (
            <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 select-none">
              <button
                onClick={() => onRoleChange?.("traveller")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === "traveller"
                    ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-100 dark:border-indigo-900/60"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Traveller View
              </button>
              <button
                onClick={() => onRoleChange?.("organizer")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === "organizer"
                    ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-100 dark:border-indigo-900/60"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Organizer View
              </button>
            </div>
          )}

          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors mr-1"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 py-1 pl-1.5 pr-2 sm:pr-3 rounded-xl shadow-xs transition-all">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-7 h-7 rounded-full object-cover border border-indigo-200 dark:border-indigo-850"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="hidden md:block text-left text-[11px] leading-tight">
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">
                  {user.displayName}
                </p>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[8px] tracking-wide flex items-center gap-0.5">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" /> Cloud Active
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 text-[10px] font-bold uppercase tracking-wider py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              disabled={isAuthLoading}
              className={`flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-xs ${
                isAuthLoading ? "opacity-60 cursor-not-allowed" : "active:scale-95 cursor-pointer"
              }`}
            >
              {isAuthLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Sync to Cloud</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800">
        <nav className="flex space-x-1 sm:space-x-2 py-2" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

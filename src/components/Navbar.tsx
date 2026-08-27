/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User } from "firebase/auth";
import { Trip } from "../types";
import { Avatar } from "./Avatar";
import { usePWAInstall } from "../hooks/usePWAInstall";
import triplanLogo from "../assets/logo.svg";
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
  BookOpen,
  Navigation,
  CheckSquare2,
  FileText,
  Download,
} from "lucide-react";

interface NavbarProps {
  trips: Trip[];
  activeTripId: string;
  onSelectTrip: (id: string) => void;
  onOpenCreateTrip: () => void;
  onOpenSwitchTrip?: () => void;
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
  checklistStats?: { packedCount: number; totalCount: number };
}

export const Navbar: React.FC<NavbarProps> = ({
  trips,
  activeTripId,
  onSelectTrip,
  onOpenCreateTrip,
  onOpenSwitchTrip,
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
  checklistStats,
}) => {
  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];
  const isOrganizerCreator = !!(user && activeTrip && activeTrip.organizerId === user.uid);

  const allTabs = [
    { id: "dashboard", label: "Dashboard", icon: Compass },
    { id: "planner", label: "Planner", icon: Luggage },
    { id: "diary", label: "Travel Diary", icon: BookOpen },
    { id: "expenses", label: "Split Expenses", icon: Wallet },
    { id: "travellers", label: "Travellers & Budgets", icon: Users },
    { id: "vault", label: "Document Vault", icon: FileText },
    { id: "weather_maps", label: "Weather & Maps", icon: CloudSun },
    { id: "finance", label: "Finance & Cashbook", icon: Wallet, organizerOnly: true },
    { id: "route_tracker", label: "Route Tracker", icon: MapPin },
  ];

  const tabs = allTabs.filter(tab => !(tab as any).organizerOnly || role === "organizer" || role === "super_admin");
  const { canPrompt, triggerInstall } = usePWAInstall();

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] shrink-0 flex items-center justify-center p-0.5">
            <img
              src={triplanLogo}
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/triplan_logo.png";
              }}
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                Triplan
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Triplan v4.2
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
            <div className="flex items-center gap-1.5">
              {onOpenSwitchTrip ? (
                <button
                  onClick={onOpenSwitchTrip}
                  className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm font-bold py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{activeTrip?.name}</span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 rounded">
                    Switch ({trips.length})
                  </span>
                </button>
              ) : (
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
            </div>
          )}

          {/* Quick Route Tracker Top Button */}
          <button
            onClick={() => onSelectTab("route_tracker")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all active:scale-95 cursor-pointer shadow-xs ${
              activeTab === "route_tracker"
                ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20"
                : "bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800"
            }`}
          >
            <Navigation className={`w-4 h-4 ${activeTab === "route_tracker" ? "animate-pulse text-white" : "text-indigo-600 dark:text-indigo-400"}`} />
            <span>Route Tracker</span>
          </button>

          {/* Quick Checklist Top Button */}
          <button
            onClick={() => onSelectTab("checklist")}
            aria-label="Checklist"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all active:scale-95 cursor-pointer shadow-xs ${
              activeTab === "checklist"
                ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20"
                : "bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800"
            }`}
          >
            <CheckSquare2 className={`w-4 h-4 ${activeTab === "checklist" ? "text-white" : "text-indigo-600 dark:text-indigo-400"}`} />
            <span>Checklist</span>
          </button>

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

          {canPrompt && (
            <button
              onClick={() => triggerInstall()}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-3 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install Triplan</span>
            </button>
          )}

          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
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

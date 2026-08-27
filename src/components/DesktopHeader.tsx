import React from "react";
import { 
  Search, 
  MapPin, 
  CheckSquare, 
  Plus, 
  Sun, 
  Moon, 
  ChevronDown,
  Bell
} from "lucide-react";
import { Trip } from "../types";
import { User } from "firebase/auth";

interface DesktopHeaderProps {
  activeTrip: Trip | null;
  onOpenSwitchTrip: () => void;
  onOpenCreateTrip: () => void;
  onNavigateTab: (tab: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  user: User | null;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activeTrip,
  onOpenSwitchTrip,
  onOpenCreateTrip,
  onNavigateTab,
  darkMode,
  onToggleDarkMode,
  user
}) => {
  return (
    <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200">
      <div className="h-full max-w-[1440px] mx-auto px-8 flex items-center justify-between">
        {/* Left: Trip Switcher */}
        <div className="flex items-center gap-6">
          <button 
            onClick={onOpenSwitchTrip}
            className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Active Trip</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                  {activeTrip?.name || "Select a Trip"}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
              </div>
            </div>
          </button>
        </div>

        {/* Center: Search (Visual Only for now) */}
        <div className="flex-1 max-w-md mx-12 hidden xl:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search expenses, diaries, or route..." 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
            />
          </div>
        </div>

        {/* Right: Quick Actions & Profile */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => onNavigateTab("route_tracker")}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-all shadow-sm shadow-transparent hover:shadow-slate-200/50 dark:hover:shadow-none"
              title="Track Route"
            >
              <MapPin className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigateTab("checklist")}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-all shadow-sm shadow-transparent hover:shadow-slate-200/50 dark:hover:shadow-none"
              title="Checklist"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button 
              onClick={onOpenCreateTrip}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-all shadow-sm shadow-transparent hover:shadow-slate-200/50 dark:hover:shadow-none"
              title="New Trip"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={onToggleDarkMode}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
          </button>

          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                {user?.displayName || "Traveler"}
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">
                View Profile
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold">
                  {user?.displayName?.[0] || "T"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

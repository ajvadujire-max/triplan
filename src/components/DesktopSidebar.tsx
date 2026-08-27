import React, { useState } from "react";
import { 
  LayoutDashboard, 
  CalendarDays, 
  MapPin, 
  CheckSquare, 
  BookOpen, 
  Receipt, 
  Users, 
  ShieldCheck, 
  CloudSun, 
  Wallet, 
  ChevronLeft, 
  ChevronRight,
  Plane,
  Settings,
  LogOut,
  User as UserIcon,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";
import { Trip } from "../types";

interface DesktopSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: User | null;
  onSignOut: () => void;
  role: "traveller" | "organizer" | "super_admin";
  activeTrip: Trip | null;
  onOpenCreateTrip: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onSignOut,
  role,
  activeTrip,
  onOpenCreateTrip
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Main" },
    { id: "planner", label: "Planner", icon: CalendarDays, group: "Main" },
    { id: "route_tracker", label: "Route Tracker", icon: MapPin, group: "Main" },
    { id: "checklist", label: "Checklist", icon: CheckSquare, group: "Main" },
    { id: "diary", label: "Travel Diary", icon: BookOpen, group: "Main" },
    
    { id: "expenses", label: "Split Expenses", icon: Receipt, group: "Finance" },
    { id: "travellers", label: "Travellers & Budgets", icon: Users, group: "Finance" },
    { id: "finance", label: "Finance & Cashbook", icon: Wallet, group: "Finance" },
    
    { id: "vault", label: "Document Vault", icon: ShieldCheck, group: "Utilities" },
    { id: "weather_maps", label: "Weather & Maps", icon: CloudSun, group: "Utilities" },
  ];

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transition-colors duration-200"
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 shrink-0 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-200 dark:shadow-none">
            <Plane className="text-white w-6 h-6" />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Triplan</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Travel Manager</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide">
        {Object.entries(groupedItems).map(([group, items]) => (
          <div key={group} className="mb-8 last:mb-0">
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {group}
              </h3>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                      ${isActive 
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold shadow-sm" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}
                    `}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
                    {!isCollapsed && (
                      <span className="text-sm truncate">{item.label}</span>
                    )}
                    {isActive && !isCollapsed && (
                      <motion.div 
                        layoutId="activePill"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Create Trip Quick Action */}
        {!isCollapsed && (
          <div className="mt-8 px-3">
            <button
              onClick={onOpenCreateTrip}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 dark:shadow-none group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-sm font-semibold">New Trip</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer User Profile */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        <div className={`flex flex-col gap-2 ${isCollapsed ? "items-center" : ""}`}>
          <div className="flex items-center gap-3 p-2 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-800 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-slate-500" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user?.displayName || "Traveler"}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {role === "organizer" ? "Organizer" : role === "super_admin" ? "Super Admin" : "Traveller"}
                </span>
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-2 mt-1 ${isCollapsed ? "flex-col" : ""}`}>
            <button
              onClick={() => onSelectTab("settings")}
              className="flex-1 flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onSignOut}
              className="flex-1 flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-24 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </motion.aside>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trip } from "../types";
import { JourneyBuilder } from "./JourneyBuilder";
import { ActivityTimeline } from "./ActivityTimeline";
import { 
  Navigation, 
  CalendarDays, 
  Layers,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  Clock,
  Navigation2
} from "lucide-react";

interface PlannerModuleProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  role?: string;
}

export const PlannerModule: React.FC<PlannerModuleProps> = ({
  trip,
  onUpdateTrip,
  role
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"journey" | "activities" | "combined">("journey");

  const tabs = [
    { id: "journey", label: "Journey", icon: Navigation },
    { id: "activities", label: "Activities", icon: CalendarDays },
    { id: "combined", label: "Combined Timeline", icon: Layers },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                <Navigation2 className="w-5 h-5 text-white" />
              </div>
              Trip Planner
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Manage your segments, activities, and unified itinerary
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 ${
                  activeSubTab === tab.id
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 ${activeSubTab === tab.id ? "animate-pulse" : ""}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {activeSubTab === "journey" && (
            <motion.div
              key="journey"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <JourneyBuilder trip={trip} onUpdateTrip={onUpdateTrip} role={role} />
            </motion.div>
          )}

          {activeSubTab === "activities" && (
            <motion.div
              key="activities"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <ActivityTimeline trip={trip} onUpdateTrip={onUpdateTrip} hideSegments={true} role={role} />
            </motion.div>
          )}

          {activeSubTab === "combined" && (
            <motion.div
              key="combined"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <ActivityTimeline 
                trip={trip} 
                onUpdateTrip={onUpdateTrip} 
                hideSegments={false} 
                role={role}
                // We could force it to vertical timeline mode if we want, 
                // or just let it be since it defaults to 'timeline' view
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

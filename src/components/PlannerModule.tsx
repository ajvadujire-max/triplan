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
  const [activeSubTab, setActiveSubTab] = useState<"journey" | "activities">("journey");

  const tabs = [
    { id: "journey", label: "Journey", icon: Navigation },
    { id: "activities", label: "Activities", icon: CalendarDays },
  ] as const;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 bg-[#1AAB67] rounded-xl shadow-md shadow-[#1AAB67]/20">
                <Navigation2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              Trip Planner
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Manage your segments and activities
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full sm:w-80">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeSubTab === tab.id
                    ? "bg-white dark:bg-slate-900 text-[#1AAB67] dark:text-[#1AAB67] shadow-sm border border-slate-200 dark:border-slate-800/80"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeSubTab === tab.id ? "text-[#1AAB67]" : ""}`} />
                <span>{tab.label}</span>
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
              <ActivityTimeline trip={trip} onUpdateTrip={onUpdateTrip} hideSegments={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Trip } from "../types";
import { TripCountdownCard } from "./TripCountdownCard";
import {
  MapPin,
  Calendar,
  Users,
  Wallet,
  TrendingUp,
  Navigation,
  Clock,
  Car,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Luggage,
  Receipt,
  Sparkles,
  ChevronRight,
  IndianRupee,
  CloudSun,
} from "lucide-react";

interface TripDashboardProps {
  trip: Trip;
  onEditTrip: () => void;
  onNavigateTab: (tab: string) => void;
}

export const TripDashboard: React.FC<TripDashboardProps> = ({
  trip,
  onEditTrip,
  onNavigateTab,
}) => {
  // Calculate total spent from trip expenses
  const totalSpent = trip.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const remainingBudget = trip.totalBudget - totalSpent;
  const budgetUsagePercent =
    trip.totalBudget > 0 ? Math.round((totalSpent / trip.totalBudget) * 100) : 0;

  // Collections widget metrics
  const totalExpectedCollection = (trip.travellers || []).reduce(
    (sum, t) => sum + (t.allocatedBudget || 0),
    0
  );
  const totalCollectedAmount = (trip.travellers || []).reduce((sum, t) => {
    const history = t.paymentHistory || [];
    const paid =
      history.length > 0
        ? history.reduce((acc, curr) => acc + curr.amount, 0)
        : t.paidAmount || 0;
    return sum + paid;
  }, 0);

  const collectionPercent =
    totalExpectedCollection > 0
      ? Math.min(100, Math.round((totalCollectedAmount / totalExpectedCollection) * 100))
      : 0;

  let paidTravellersCount = 0;
  let partialTravellersCount = 0;
  let pendingTravellersCount = 0;

  (trip.travellers || []).forEach((t) => {
    const b = t.allocatedBudget || 0;
    const history = t.paymentHistory || [];
    const p =
      history.length > 0
        ? history.reduce((acc, curr) => acc + curr.amount, 0)
        : t.paidAmount || 0;

    if (p >= b && b > 0) paidTravellersCount++;
    else if (p > 0) partialTravellersCount++;
    else pendingTravellersCount++;
  });

  // Status color badges
  const getStatusBadge = (status: Trip["status"]) => {
    switch (status) {
      case "Ongoing":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      case "Upcoming":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800";
      case "Completed":
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700";
      case "Cancelled":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6 pb-4 sm:pb-6"
    >
      {/* Cover Banner & Trip Overview Header */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-900 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-overlay"
          style={{ backgroundImage: `url(${trip.coverPhoto})` }}
        />
        <div className="relative z-10 p-4 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent">
          <div className="space-y-1.5 sm:space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              <span
                className={`text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 sm:px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                  trip.status
                )}`}
              >
                ● {trip.status}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                {trip.purpose}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                {trip.travelCategory}
              </span>
            </div>
            <h1 className="text-xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {trip.name}
            </h1>
            <div className="text-[11px] sm:text-sm text-slate-200 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
                {trip.destination}
              </span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
                {trip.startDate} to {trip.endDate}
              </span>
            </div>
            {trip.notes && (
              <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-2 pt-0.5 sm:pt-1 font-light italic">
                "{trip.notes}"
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={onEditTrip}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 dark:bg-slate-800 dark:hover:bg-slate-750 text-white text-[11px] sm:text-sm font-bold px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl border border-white/10 dark:border-slate-700 shadow-sm active:scale-95 transition-all cursor-pointer min-h-[38px] sm:min-h-[48px]"
            >
              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
              Manage Trip
            </button>
            <button
              onClick={() => onNavigateTab("expenses")}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] sm:text-sm font-bold px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm active:scale-95 transition-all cursor-pointer min-h-[38px] sm:min-h-[48px]"
            >
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              + Expense
            </button>
          </div>
        </div>
      </div>
      
      <TripCountdownCard trip={trip} onNavigateTab={onNavigateTab} />

      {/* Summary Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Card 1: Total Budget Allocation */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Budget
          </p>
          <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5 sm:mt-1">
            <h2 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white">
              {trip.currency}{trip.totalBudget.toLocaleString()}
            </h2>
            <span className="text-[8px] sm:text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-1 sm:px-1.5 py-0.5 rounded-md">USD</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 sm:h-1.5 rounded-full mt-2 sm:mt-4 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
            />
          </div>
          <p className="text-[9px] sm:text-[10px] mt-1.5 sm:mt-2.5 text-slate-500 dark:text-slate-400 font-bold">
            {budgetUsagePercent}% trip capacity used
          </p>
        </div>

        {/* Card 2: Actual Spent (Real-time) */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Actual Spent
          </p>
          <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5 sm:mt-1">
            <h2 className="text-base sm:text-2xl font-black text-rose-600 dark:text-rose-400">
              {trip.currency}{totalSpent.toLocaleString()}
            </h2>
            <span className="text-[8px] sm:text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold px-1 sm:px-1.5 py-0.5 rounded-md">
              {trip.expenses.length} logs
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] mt-2 sm:mt-4 flex items-center gap-1 sm:gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
            Cashbook active sync
          </p>
        </div>

        {/* Card 3: Remaining Balance */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Remaining
          </p>
          <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5 sm:mt-1">
            <h2 className={`text-base sm:text-2xl font-black ${remainingBudget >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {trip.currency}{remainingBudget.toLocaleString()}
            </h2>
          </div>
          <p className="text-[9px] sm:text-[10px] mt-2.5 sm:mt-4 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 sm:gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Balance: OK
          </p>
        </div>

        {/* Card 4: Weather Widget */}
        <div
          onClick={() => onNavigateTab("weather_maps")}
          className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-sky-200/80 dark:border-sky-900/60 hover:border-sky-500 shadow-xs flex items-center justify-between gap-1 cursor-pointer transition-all active:scale-95 group"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 font-black text-slate-900 dark:text-white text-xs sm:text-sm">
              <CloudSun className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-[90px] sm:max-w-none">{trip.destination}</span>
            </div>
            <div className="text-[13px] sm:text-sm font-extrabold text-sky-600 dark:text-sky-400">
              28°C • Sunny
            </div>
            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400">AQI: Good</span>
              <span>•</span>
              <span>Rain: 10%</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-lg sm:rounded-xl flex items-center justify-center border border-sky-200/60 dark:border-sky-800">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <span className="text-[8px] sm:text-[9px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-tight">
              Tap Weather
            </span>
          </div>
        </div>
      </div>

      {/* COLLECTIONS & TREASURY WIDGET */}
      <div
        onClick={() => onNavigateTab("collections")}
        className="group cursor-pointer bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-indigo-800/60 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.99] space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-lg border border-indigo-500/30">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white group-hover:text-indigo-200 transition-colors">
                  Collections & Treasury
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {collectionPercent}% Collected
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                Trip Treasurer Dashboard • Tap to open Collections module
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-indigo-300 group-hover:text-white transition-colors">
            <span>Open Module</span>
            <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Financial Progress & Breakdown Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-900/60">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-xs font-bold">
              <span className="text-slate-300">Amount Collected</span>
              <span className="text-emerald-400 text-sm font-black">
                ₹{totalCollectedAmount.toLocaleString("en-IN")} / ₹
                {totalExpectedCollection.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-indigo-900">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${collectionPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] font-extrabold pt-1 sm:pt-0">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
              🟢 {paidTravellersCount} Paid
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-800/60">
              🟡 {partialTravellersCount} Partial
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-rose-950/80 text-rose-300 border border-rose-800/60">
              🔴 {pendingTravellersCount} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/60 shadow-xs">
          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Travellers</p>
          <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 sm:mt-1">{trip.travellers.length} Members</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/60 shadow-xs">
          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Itinerary Dates</p>
          <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 sm:mt-1 truncate">{trip.startDate} - {trip.endDate}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/60 shadow-xs">
          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</p>
          <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 sm:mt-1">{trip.travelCategory}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/60 shadow-xs">
          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</p>
          <p className="text-[11px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 sm:mt-1">{trip.currentJourneyStatus || "Ongoing"}</p>
        </div>
      </div>

      {/* Quick Navigation Cards Grid */}
      <div className="pt-1.5 sm:pt-2">
        <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 sm:mb-3">
          Quick Travel Management Modules
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <button
            onClick={() => onNavigateTab("planner")}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 hover:border-indigo-500 dark:hover:border-indigo-500 text-left group transition-all active:scale-95 cursor-pointer shadow-xs min-h-[85px] sm:min-h-[100px]"
          >
            <Luggage className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 mb-1.5 sm:mb-2.5 group-hover:scale-110 transition-transform" />
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
              Trip Planner
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Build Routes & Itinerary
            </p>
          </button>

          <button
            onClick={() => onNavigateTab("vault")}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 hover:border-cyan-500 dark:hover:border-cyan-500 text-left group transition-all active:scale-95 cursor-pointer shadow-xs min-h-[85px] sm:min-h-[100px]"
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400 mb-1.5 sm:mb-2.5 group-hover:scale-110 transition-transform" />
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
              Vault & Checklist
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Essential Docs
            </p>
          </button>

          <button
            onClick={() => onNavigateTab("travellers")}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 hover:border-indigo-500 dark:hover:border-indigo-500 text-left group transition-all active:scale-95 cursor-pointer shadow-xs min-h-[85px] sm:min-h-[100px]"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 mb-1.5 sm:mb-2.5 group-hover:scale-110 transition-transform" />
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
              Individual Budgets
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {trip.travellers.length} Balances
            </p>
          </button>

          <button
            onClick={() => onNavigateTab("expenses")}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 hover:border-indigo-500 dark:hover:border-indigo-500 text-left group transition-all active:scale-95 cursor-pointer shadow-xs min-h-[85px] sm:min-h-[100px]"
          >
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 sm:mb-2.5 group-hover:scale-110 transition-transform" />
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
              Split Expenses
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Equal, % & splits
            </p>
          </button>

          <button
            onClick={() => onNavigateTab("ai_insights")}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 hover:border-indigo-500 dark:hover:border-indigo-500 text-left group transition-all active:scale-95 cursor-pointer shadow-xs min-h-[85px] sm:min-h-[100px] col-span-2 sm:col-span-1"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mb-1.5 sm:mb-2.5 group-hover:scale-110 transition-transform" />
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
              AI Travel Insights
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Predictions & routes
            </p>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

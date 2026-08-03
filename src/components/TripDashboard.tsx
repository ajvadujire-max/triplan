/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Trip, Traveller } from "../types";
import { TripCountdownCard } from "./TripCountdownCard";
import { QRCodeSVG } from "qrcode.react";
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
  Copy,
  Share2,
} from "lucide-react";

interface TripDashboardProps {
  trip: Trip;
  onEditTrip: () => void;
  onNavigateTab: (tab: string) => void;
  role?: "traveller" | "organizer" | "super_admin";
}

export const TripDashboard: React.FC<TripDashboardProps> = ({
  trip,
  onEditTrip,
  onNavigateTab,
  role = "traveller",
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const inviteCode = trip ? (trip.inviteCode || trip.tripCode || trip.id || "") : "";
  const inviteLink = inviteCode ? `https://triplan-zeta.vercel.app/join/${inviteCode}` : "";

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setToastMessage("Trip code copied.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    const shareText = `Join my trip on TripPro!\n\nTrip Code: ${inviteCode}\n\n${inviteLink}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my trip on TripPro",
          text: shareText,
          url: inviteLink,
        });
      } catch (err) {
        // user cancelled or failed
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setToastMessage("Trip code copied.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const isOrganizer = role === "organizer" || role === "super_admin";
  // Calculate total spent from trip expenses
  const totalSpent = trip.expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  const remainingBudget = (Number(trip.totalBudget) || 0) - totalSpent;
  const budgetUsagePercent =
    Number(trip.totalBudget) > 0 ? Math.round((totalSpent / Number(trip.totalBudget)) * 100) : 0;

  // Collections widget metrics
  const seenDashboardKeys = new Set<string>();
  const activeTravellersForDashboard: Traveller[] = [];
  (trip.travellers || []).forEach((t) => {
    if (!t) return;
    if (t.status === "Cancelled" || t.status === "Rejected" || t.status === "Inactive") return;
    const key = t.id || `${t.fullName}_${t.phone || t.email}`;
    if (seenDashboardKeys.has(key)) return;
    seenDashboardKeys.add(key);
    activeTravellersForDashboard.push(t);
  });

  const totalTripBudgetAmount = Number(trip.totalBudget || trip.expectedBudget) || 0;
  const numTravellers = activeTravellersForDashboard.length;
  const baseBudgetPerTraveller = numTravellers > 0 && totalTripBudgetAmount > 0
    ? Math.floor(totalTripBudgetAmount / numTravellers)
    : 0;
  const remainderBudget = numTravellers > 0 && totalTripBudgetAmount > 0
    ? totalTripBudgetAmount - (baseBudgetPerTraveller * numTravellers)
    : 0;

  const totalExpectedCollection = totalTripBudgetAmount > 0
    ? totalTripBudgetAmount
    : activeTravellersForDashboard.reduce((sum, t) => sum + (Number(t.allocatedBudget) || 0), 0);

  const totalCollectedAmount = activeTravellersForDashboard.reduce((sum, t) => {
    const history = t.paymentHistory || [];
    const paid =
      history.length > 0
        ? history.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
        : (Number(t.paidAmount) || 0);
    return sum + paid;
  }, 0);

  const collectionPercentValue =
    totalExpectedCollection > 0
      ? Math.min(100, Math.round((totalCollectedAmount / totalExpectedCollection) * 100))
      : 0;
  
  const collectionPercent = isNaN(collectionPercentValue) ? 0 : collectionPercentValue;

  let paidTravellersCount = 0;
  let partialTravellersCount = 0;
  let pendingTravellersCount = 0;

  activeTravellersForDashboard.forEach((t, idx) => {
    const b = numTravellers > 0 && totalTripBudgetAmount > 0
      ? baseBudgetPerTraveller + (idx < remainderBudget ? 1 : 0)
      : (t.allocatedBudget || 0);
    const history = t.paymentHistory || [];
    const p =
      history.length > 0
        ? history.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
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
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/12 shadow-[0_8px_24px_rgba(45,107,247,0.22)] bg-[#2D6BF7] text-white">
        {trip.coverPhoto && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay"
            style={{ backgroundImage: `url(${trip.coverPhoto})` }}
          />
        )}
        <div className="relative z-10 p-4 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 bg-transparent">
          <div className="space-y-1.5 sm:space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              <span
                className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-white text-[#2D6BF7] shadow-xs"
              >
                ● {trip.status}
              </span>
              {trip.purpose && (
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-white/[0.14] text-white border border-white/35">
                  {trip.purpose}
                </span>
              )}
              {trip.travelCategory && (
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-white/[0.14] text-white border border-white/35">
                  {trip.travelCategory}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {trip.name}
            </h1>
            <div className="text-[11px] sm:text-sm text-white/90 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white shrink-0" />
                {trip.destination}
              </span>
              <span className="text-white/60 hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white shrink-0" />
                {trip.startDate} to {trip.endDate}
              </span>
            </div>
            {trip.notes && (
              <p className="text-[11px] sm:text-xs text-white/75 line-clamp-2 pt-0.5 sm:pt-1 font-light italic">
                "{trip.notes}"
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto text-white">
            {isOrganizer && (
              <button
                onClick={onEditTrip}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-white/[0.14] hover:bg-white/20 text-white text-[11px] sm:text-sm font-bold px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl border border-white/30 shadow-xs active:scale-95 transition-all cursor-pointer min-h-[38px] sm:min-h-[48px]"
              >
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                Manage Trip
              </button>
            )}
            <button
              onClick={() => onNavigateTab("expenses")}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-[#2D6BF7] text-[11px] sm:text-sm font-bold px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm active:scale-95 transition-all cursor-pointer min-h-[38px] sm:min-h-[48px]"
            >
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2D6BF7]" />
              + Expense
            </button>
          </div>
        </div>
      </div>
      
      <TripCountdownCard trip={trip} onNavigateTab={onNavigateTab} />

      {/* Summary Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
              style={{ width: `${isNaN(budgetUsagePercent) ? 0 : Math.min(budgetUsagePercent, 100)}%` }}
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

        {/* Card 4: Total Travellers */}
        <div
          onClick={() => onNavigateTab("travellers")}
          className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 transition-all active:scale-95 group"
        >
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Travellers</span>
            <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
          </p>
          <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5 sm:mt-1">
            <h2 className="text-base sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {(trip.travellers || []).length}
            </h2>
            <span className="text-[8px] sm:text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold px-1 sm:px-1.5 py-0.5 rounded-md">
              {(trip.travellers || []).length === 1 ? "1 member" : `${(trip.travellers || []).length} members`}
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] mt-2.5 sm:mt-4 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 sm:gap-1.5">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            Active Group
          </p>
        </div>
      </div>

      {/* Trip Invite Card */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Trip Invite</h3>
          {toastMessage && (
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-bold animate-pulse">
              {toastMessage}
            </span>
          )}
        </div>

        {!trip ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center font-medium">
            No active trip selected.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Invite Code</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-wider">
                {inviteCode || "N/A"}
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleCopyCode}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button 
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
              {inviteCode ? (
                <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-100 dark:border-slate-800">
                  <QRCodeSVG value={inviteLink} size={140} />
                </div>
              ) : null}
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center break-all select-all">
                {inviteLink}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TRAVEL DIARY SHORTCUT CARD */}
      <div
        onClick={() => onNavigateTab("diary")}
        className="group cursor-pointer bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-blue-200/80 dark:border-indigo-900/60 shadow-xs hover:border-[#2D6BF7] transition-all duration-200 active:scale-[0.99] flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2D6BF7] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            📖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-[#2D6BF7] dark:group-hover:text-indigo-400 transition-colors">
                Travel Diary
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-indigo-950 text-[#2D6BF7] dark:text-indigo-300 border border-blue-200 dark:border-indigo-800">
                Private
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Capture memories, notes & photo stories from your journey
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-[#2D6BF7] dark:text-indigo-400 shrink-0">
          <span>Open</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* COLLECTIONS & TREASURY WIDGET */}
      <div
        onClick={() => onNavigateTab("collections")}
        className="group cursor-pointer bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-indigo-800/60 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg border border-indigo-100 dark:border-indigo-500/30">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition-colors">
                  Collections & Treasury
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-indigo-200/80 font-medium mt-0.5">
                Trip Treasurer Dashboard • Tap to open Collections module
              </p>
            </div>
          </div>

        </div>

        {/* Financial Progress & Breakdown Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-indigo-900/60">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-300">Amount Collected</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">
                ₹{totalCollectedAmount.toLocaleString("en-IN")} / ₹
                {totalExpectedCollection.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-indigo-900">
              <div
                className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${isNaN(collectionPercent) ? 0 : collectionPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] font-extrabold pt-1 sm:pt-0">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/60">
              🟢 {paidTravellersCount} Paid
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/60">
              🟡 {partialTravellersCount} Partial
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/60">
              🔴 {pendingTravellersCount} Pending
            </span>
          </div>
        </div>
      </div>

    </motion.div>
  );
};

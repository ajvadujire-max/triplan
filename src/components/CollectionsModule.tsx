/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Trip,
  Traveller,
  PaymentRecord,
  PaymentMethod,
  CollectionStatus,
} from "../types";
import {
  IndianRupee,
  Search,
  Filter,
  Plus,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Download,
  Share2,
  Send,
  Trash2,
  Edit2,
  X,
  User,
  Phone,
  Calendar,
  CreditCard,
  Building2,
  Smartphone,
  Wallet,
  FileText,
  PieChart,
  Users,
  Check,
  Percent,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";

interface CollectionsModuleProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onNavigateTab?: (tab: string) => void;
}

export const CollectionsModule: React.FC<CollectionsModuleProps> = ({
  trip,
  onUpdateTrip,
  onNavigateTab,
}) => {
  // State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CollectionStatus>("All");
  const [sortBy, setSortBy] = useState<
    "Name" | "Remaining Amount" | "Paid Amount" | "Recently Updated" | "Highest Due" | "Lowest Due"
  >("Highest Due");

  // Selection for bulk actions
  const [selectedTravellerIds, setSelectedTravellerIds] = useState<string[]>([]);

  // Modals / Bottom Sheets state
  const [activePaymentTraveller, setActivePaymentTraveller] = useState<Traveller | null>(null);
  const [activeHistoryTraveller, setActiveHistoryTraveller] = useState<Traveller | null>(null);
  const [editingBudgetTraveller, setEditingBudgetTraveller] = useState<Traveller | null>(null);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Form State for Receive Payment
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // Editing specific Payment Record
  const [editingPaymentRecord, setEditingPaymentRecord] = useState<{
    travellerId: string;
    record: PaymentRecord;
  } | null>(null);

  // Helper calculation for traveller stats
  const getTravellerStats = (traveller: Traveller) => {
    const budget = traveller.allocatedBudget || 0;
    const history = traveller.paymentHistory || [];
    const paid = history.length > 0
      ? history.reduce((acc, curr) => acc + curr.amount, 0)
      : traveller.paidAmount || 0;
    const remaining = Math.max(0, budget - paid);

    let status: CollectionStatus = "Unpaid";
    if (paid >= budget && budget > 0) {
      status = "Paid";
    } else if (paid > 0) {
      status = "Partial";
    }

    return { budget, paid, remaining, status, history };
  };

  // Overall Dashboard Calculations
  const collectionSummary = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    const list = (trip.travellers || []).map((trv) => {
      const stats = getTravellerStats(trv);
      totalExpected += stats.budget;
      totalCollected += stats.paid;

      if (stats.status === "Paid") paidCount++;
      else if (stats.status === "Partial") partialCount++;
      else unpaidCount++;

      return { traveller: trv, stats };
    });

    const totalRemaining = Math.max(0, totalExpected - totalCollected);
    const progressPercent = totalExpected > 0
      ? Math.min(100, Math.round((totalCollected / totalExpected) * 100))
      : 0;

    return {
      totalTravellers: trip.travellers.length,
      totalExpected,
      totalCollected,
      totalRemaining,
      progressPercent,
      paidCount,
      partialCount,
      unpaidCount,
      list,
    };
  }, [trip.travellers]);

  // Filter & Sort Travellers
  const filteredTravellers = useMemo(() => {
    return collectionSummary.list
      .filter(({ traveller, stats }) => {
        // Status filter
        if (statusFilter !== "All" && stats.status !== statusFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = traveller.fullName.toLowerCase().includes(q);
          const phoneMatch = traveller.phone?.toLowerCase().includes(q);
          const roleMatch = traveller.role?.toLowerCase().includes(q);
          return nameMatch || phoneMatch || roleMatch;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "Name") {
          return a.traveller.fullName.localeCompare(b.traveller.fullName);
        }
        if (sortBy === "Remaining Amount" || sortBy === "Highest Due") {
          return b.stats.remaining - a.stats.remaining;
        }
        if (sortBy === "Lowest Due") {
          return a.stats.remaining - b.stats.remaining;
        }
        if (sortBy === "Paid Amount") {
          return b.stats.paid - a.stats.paid;
        }
        if (sortBy === "Recently Updated") {
          const lastDateA = a.stats.history[0]?.date || "1970-01-01";
          const lastDateB = b.stats.history[0]?.date || "1970-01-01";
          return lastDateB.localeCompare(lastDateA);
        }
        return 0;
      });
  }, [collectionSummary.list, statusFilter, searchQuery, sortBy]);

  // Handle Save Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentTraveller) return;

    const numericAmount = Number(paymentAmount);
    if (!numericAmount || numericAmount <= 0) return;

    const newRecord: PaymentRecord = {
      id: editingPaymentRecord ? editingPaymentRecord.record.id : `pm_${Date.now()}`,
      amount: numericAmount,
      method: paymentMethod,
      date: paymentDate || new Date().toISOString().split("T")[0],
      notes: paymentNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedTravellers = trip.travellers.map((trv) => {
      if (trv.id === activePaymentTraveller.id) {
        let newHistory = [...(trv.paymentHistory || [])];

        if (editingPaymentRecord) {
          newHistory = newHistory.map((rec) =>
            rec.id === editingPaymentRecord.record.id ? newRecord : rec
          );
        } else {
          newHistory.unshift(newRecord);
        }

        const newPaidAmount = newHistory.reduce((sum, item) => sum + item.amount, 0);

        return {
          ...trv,
          paidAmount: newPaidAmount,
          paymentHistory: newHistory,
        };
      }
      return trv;
    });

    onUpdateTrip({
      ...trip,
      travellers: updatedTravellers,
    });

    // Reset Form
    setActivePaymentTraveller(null);
    setEditingPaymentRecord(null);
    setPaymentAmount("");
    setPaymentNotes("");
  };

  // Open Receive Payment Modal for Traveller
  const openReceivePayment = (traveller: Traveller, prefillAmount?: number) => {
    setActivePaymentTraveller(traveller);
    const stats = getTravellerStats(traveller);
    setPaymentAmount(prefillAmount !== undefined ? prefillAmount : (stats.remaining > 0 ? stats.remaining : ""));
    setPaymentMethod("UPI");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
    setEditingPaymentRecord(null);
  };

  // Delete Payment History Item
  const handleDeletePaymentRecord = (travellerId: string, recordId: string) => {
    const updatedTravellers = trip.travellers.map((trv) => {
      if (trv.id === travellerId) {
        const filteredHistory = (trv.paymentHistory || []).filter(
          (rec) => rec.id !== recordId
        );
        const newPaid = filteredHistory.reduce((sum, item) => sum + item.amount, 0);
        return {
          ...trv,
          paidAmount: newPaid,
          paymentHistory: filteredHistory,
        };
      }
      return trv;
    });

    onUpdateTrip({
      ...trip,
      travellers: updatedTravellers,
    });

    // Update active history traveller modal reference
    if (activeHistoryTraveller && activeHistoryTraveller.id === travellerId) {
      const updatedTrv = updatedTravellers.find((t) => t.id === travellerId);
      setActiveHistoryTraveller(updatedTrv || null);
    }
  };

  // Edit Budget for a traveller
  const handleSaveTravellerBudget = (travellerId: string, newBudget: number) => {
    const updatedTravellers = trip.travellers.map((trv) => {
      if (trv.id === travellerId) {
        return {
          ...trv,
          allocatedBudget: Math.max(0, newBudget),
        };
      }
      return trv;
    });

    onUpdateTrip({
      ...trip,
      travellers: updatedTravellers,
    });
    setEditingBudgetTraveller(null);
  };

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedTravellerIds.length === filteredTravellers.length) {
      setSelectedTravellerIds([]);
    } else {
      setSelectedTravellerIds(filteredTravellers.map((item) => item.traveller.id));
    }
  };

  const toggleSelectTraveller = (id: string) => {
    setSelectedTravellerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkMarkPaid = () => {
    if (selectedTravellerIds.length === 0) return;

    const updatedTravellers = trip.travellers.map((trv) => {
      if (selectedTravellerIds.includes(trv.id)) {
        const stats = getTravellerStats(trv);
        if (stats.remaining > 0) {
          const autoPayment: PaymentRecord = {
            id: `pm_bulk_${Date.now()}_${trv.id}`,
            amount: stats.remaining,
            method: "UPI",
            date: new Date().toISOString().split("T")[0],
            notes: "Bulk settlement",
            createdAt: new Date().toISOString(),
          };
          const newHistory = [autoPayment, ...(trv.paymentHistory || [])];
          return {
            ...trv,
            paidAmount: trv.allocatedBudget,
            paymentHistory: newHistory,
          };
        }
      }
      return trv;
    });

    onUpdateTrip({
      ...trip,
      travellers: updatedTravellers,
    });

    setSelectedTravellerIds([]);
    showToast(`Marked ${selectedTravellerIds.length} travellers as Paid!`);
  };

  const handleSendReminder = (traveller: Traveller) => {
    const stats = getTravellerStats(traveller);
    const msg = `Hi ${traveller.fullName}, your pending collection for ${trip.name} is ₹${stats.remaining.toLocaleString("en-IN")}. Kindly transfer via UPI/Cash at your earliest. Thank you!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      showToast(`Reminder copied for ${traveller.fullName}!`);
    } else {
      showToast(msg);
    }
  };

  const handleBulkSendReminder = () => {
    const selectedTravellers = trip.travellers.filter((t) =>
      selectedTravellerIds.includes(t.id)
    );
    const pendingText = selectedTravellers
      .map((t) => {
        const stats = getTravellerStats(t);
        return `• ${t.fullName}: ₹${stats.remaining.toLocaleString("en-IN")} pending`;
      })
      .join("\n");

    const fullMessage = `📢 *Collection Reminder for ${trip.name}*\n\n${pendingText}\n\nPlease complete payment via UPI/Bank Transfer. Thank you!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullMessage);
      showToast(`Bulk reminder list copied for ${selectedTravellerIds.length} members!`);
    } else {
      showToast(`Reminder text prepared for ${selectedTravellerIds.length} members`);
    }
  };

  const showToast = (msg: string) => {
    setReminderToast(msg);
    setTimeout(() => setReminderToast(null), 3000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Traveller Name",
      "Phone",
      "Role",
      "Budget (Expected)",
      "Paid Amount",
      "Remaining Balance",
      "Status",
      "Last Payment Date",
    ];

    const rows = filteredTravellers.map(({ traveller, stats }) => {
      const lastDate = stats.history[0]?.date || "N/A";
      return [
        `"${traveller.fullName}"`,
        `"${traveller.phone || ""}"`,
        `"${traveller.role}"`,
        stats.budget,
        stats.paid,
        stats.remaining,
        stats.status,
        `"${lastDate}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Collections_Report_${trip.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Collections CSV exported successfully!");
  };

  // Export PDF / Print View
  const handleExportPDF = () => {
    window.print();
  };

  // Get Method Icon helper
  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case "UPI":
        return <Smartphone className="w-3.5 h-3.5 text-emerald-500" />;
      case "Cash":
        return <Wallet className="w-3.5 h-3.5 text-amber-500" />;
      case "Bank Transfer":
        return <Building2 className="w-3.5 h-3.5 text-blue-500" />;
      case "Card":
        return <CreditCard className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <IndianRupee className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {reminderToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl border border-indigo-500 flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{reminderToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-indigo-800/40 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <IndianRupee className="w-5 h-5 text-indigo-400" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Trip Treasury & Collections
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-indigo-200/80 font-medium mt-1">
            Track member budgets, record payments, and monitor collection status for{" "}
            <span className="text-white font-bold">{trip.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsReportsOpen(!isReportsOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
          >
            <PieChart className="w-4 h-4 text-indigo-300" />
            <span>{isReportsOpen ? "Hide Analytics" : "Reports"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* 1. TOP COMPACT SUMMARY CARDS & PROGRESS BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Total Travellers */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total Travellers</span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {collectionSummary.totalTravellers}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Active trip members
            </div>
          </div>

          {/* Expected Collection */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center justify-between">
              <span>Expected</span>
              <IndianRupee className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1">
              ₹{collectionSummary.totalExpected.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
              Sum of all budgets
            </div>
          </div>

          {/* Collected */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
              <span>Collected</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
              ₹{collectionSummary.totalCollected.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              Received so far
            </div>
          </div>

          {/* Remaining */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center justify-between">
              <span>Remaining</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">
              ₹{collectionSummary.totalRemaining.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
              Pending collection
            </div>
          </div>

          {/* Collection Progress */}
          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-800 border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Progress</span>
              <Percent className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {collectionSummary.progressPercent}%
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${collectionSummary.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Global Progress Bar Bar visual */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Overall Collection Progress</span>
            <span className="text-indigo-600 dark:text-indigo-400">
              ₹{collectionSummary.totalCollected.toLocaleString("en-IN")} / ₹
              {collectionSummary.totalExpected.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60 flex">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${collectionSummary.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* EXPANDABLE REPORTS & ANALYTICS PANEL */}
      {isReportsOpen && (
        <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-400" />
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Collection Reports & Financial Summary
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsReportsOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Average Contribution */}
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                Avg. Expected / Person
              </div>
              <div className="text-base font-black text-white mt-1">
                ₹
                {collectionSummary.totalTravellers > 0
                  ? Math.round(
                      collectionSummary.totalExpected / collectionSummary.totalTravellers
                    ).toLocaleString("en-IN")
                  : 0}
              </div>
            </div>

            {/* Average Collected */}
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                Avg. Collected / Person
              </div>
              <div className="text-base font-black text-emerald-400 mt-1">
                ₹
                {collectionSummary.totalTravellers > 0
                  ? Math.round(
                      collectionSummary.totalCollected / collectionSummary.totalTravellers
                    ).toLocaleString("en-IN")
                  : 0}
              </div>
            </div>

            {/* Highest Contributor */}
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">
                Highest Contributor
              </div>
              <div className="text-sm font-black text-indigo-300 mt-1 truncate">
                {collectionSummary.list.length > 0
                  ? [...collectionSummary.list].sort((a, b) => b.stats.paid - a.stats.paid)[0]?.traveller.fullName
                  : "N/A"}
              </div>
            </div>

            {/* Lowest / Unpaid Count */}
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">
                Pending Members
              </div>
              <div className="text-sm font-black text-rose-400 mt-1">
                {collectionSummary.unpaidCount + collectionSummary.partialCount} Members
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PAYMENT STATUS QUICK FILTER CHIPS */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2">
          {/* Filter Status Badge buttons */}
          <button
            type="button"
            onClick={() => setStatusFilter("All")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "All"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>All Members</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {collectionSummary.totalTravellers}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Paid")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "Paid"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
            }`}
          >
            <span>🟢 Paid</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900 text-[10px]">
              ({collectionSummary.paidCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Partial")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "Partial"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
            }`}
          >
            <span>🟡 Partial</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900 text-[10px]">
              ({collectionSummary.partialCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Unpaid")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "Unpaid"
                ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100"
            }`}
          >
            <span>🔴 Unpaid</span>
            <span className="px-1.5 py-0.5 rounded-full bg-rose-200/60 dark:bg-rose-900 text-[10px]">
              ({collectionSummary.unpaidCount})
            </span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR & SORT CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search traveller by name, role or phone..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sort by:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
          >
            <option value="Highest Due">Highest Due</option>
            <option value="Lowest Due">Lowest Due</option>
            <option value="Paid Amount">Paid Amount</option>
            <option value="Name">Name (A-Z)</option>
            <option value="Remaining Amount">Remaining Amount</option>
            <option value="Recently Updated">Recently Updated</option>
          </select>
        </div>
      </div>

      {/* BULK ACTION BAR (SHOWN WHEN MEMBERS SELECTED) */}
      {selectedTravellerIds.length > 0 && (
        <div className="sticky top-16 z-30 bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-xl border border-indigo-500 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-black text-xs">
              {selectedTravellerIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
              Travellers Selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleBulkMarkPaid}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Paid</span>
            </button>

            <button
              type="button"
              onClick={handleBulkSendReminder}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Reminder</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTravellerIds([])}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. TRAVELLER CARDS LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={
                filteredTravellers.length > 0 &&
                selectedTravellerIds.length === filteredTravellers.length
              }
              onChange={toggleSelectAll}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <span>
              Showing {filteredTravellers.length} of {trip.travellers.length}{" "}
              travellers
            </span>
          </div>

          {statusFilter !== "All" && (
            <button
              type="button"
              onClick={() => setStatusFilter("All")}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Clear Status Filter
            </button>
          )}
        </div>

        {filteredTravellers.length > 0 ? (
          filteredTravellers.map(({ traveller, stats }) => {
            const isSelected = selectedTravellerIds.includes(traveller.id);
            const percentPaid = stats.budget > 0
              ? Math.min(100, Math.round((stats.paid / stats.budget) * 100))
              : 0;

            return (
              <div
                key={traveller.id}
                className={`group relative bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-xs hover:shadow-md ${
                  isSelected
                    ? "border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Avatar, Name, Role & Status */}
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Checkbox for Bulk */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectTraveller(traveller.id)}
                      className="mt-1 sm:mt-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer shrink-0"
                    />

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {traveller.profilePhoto ? (
                        <img
                          src={traveller.profilePhoto}
                          alt={traveller.fullName}
                          className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                          {traveller.fullName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-black ${
                          stats.status === "Paid"
                            ? "bg-emerald-500 text-white"
                            : stats.status === "Partial"
                            ? "bg-amber-500 text-white"
                            : "bg-rose-500 text-white"
                        }`}
                      >
                        {stats.status === "Paid" ? "✓" : "!"}
                      </span>
                    </div>

                    {/* Name & Role */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {traveller.fullName}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                          {traveller.role}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {traveller.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {traveller.phone}
                          </span>
                        )}
                        <span>{stats.history.length} Payments recorded</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Financial Metrics (Budget, Paid, Remaining) */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center sm:text-right shrink-0">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Budget
                      </div>
                      <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">
                        ₹{stats.budget.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Paid
                      </div>
                      <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        ₹{stats.paid.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Balance
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-black mt-0.5 ${
                          stats.remaining > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-400"
                        }`}
                      >
                        ₹{stats.remaining.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Badge & Primary Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    {/* Status Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shrink-0 ${
                        stats.status === "Paid"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : stats.status === "Partial"
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          : "bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                      }`}
                    >
                      <span>{stats.status === "Paid" ? "🟢 Paid" : stats.status === "Partial" ? "🟡 Partial" : "🔴 Unpaid"}</span>
                    </span>

                    {/* Quick Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openReceivePayment(traveller)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Receive Payment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveHistoryTraveller(traveller)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
                        title="Payment History"
                      >
                        <History className="w-4 h-4 text-slate-500" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendReminder(traveller)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
                        title="Copy Payment Reminder"
                      >
                        <Send className="w-4 h-4 text-slate-500" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingBudgetTraveller(traveller)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
                        title="Edit Budget"
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Individual Progress Bar */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        stats.status === "Paid"
                          ? "bg-emerald-500"
                          : stats.status === "Partial"
                          ? "bg-amber-500"
                          : "bg-slate-300 dark:bg-slate-700"
                      }`}
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 shrink-0">
                    {percentPaid}%
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <IndianRupee className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No matching travellers found
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Try adjusting your search query or status filter chips above.
            </p>
          </div>
        )}
      </div>

      {/* 4. RECEIVE PAYMENT BOTTOM SHEET / MODAL */}
      {activePaymentTraveller && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center">
                  ₹
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {editingPaymentRecord ? "Edit Payment Record" : "Receive Payment"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Recording for{" "}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {activePaymentTraveller.fullName}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActivePaymentTraveller(null);
                  setEditingPaymentRecord(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Traveller Current Summary */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Expected
                </div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
                  ₹{activePaymentTraveller.allocatedBudget.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Paid So Far
                </div>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ₹
                  {getTravellerStats(activePaymentTraveller).paid.toLocaleString(
                    "en-IN"
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                  Balance Due
                </div>
                <div className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  ₹
                  {getTravellerStats(
                    activePaymentTraveller
                  ).remaining.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSavePayment} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (₹) *
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min={1}
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Enter collected amount"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Method *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["UPI", "Cash", "Bank Transfer", "Card"] as PaymentMethod[]).map(
                    (method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                          paymentMethod === method
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {getMethodIcon(method)}
                        <span>{method}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Transaction ID, GPay Ref, or cash receipt notes"
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActivePaymentTraveller(null);
                    setEditingPaymentRecord(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {editingPaymentRecord ? "Update Payment" : "Save Payment"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. PAYMENT HISTORY MODAL / BOTTOM SHEET */}
      {activeHistoryTraveller && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Payment History
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All payment entries for{" "}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {activeHistoryTraveller.fullName}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveHistoryTraveller(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Payments */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {(activeHistoryTraveller.paymentHistory || []).length > 0 ? (
                (activeHistoryTraveller.paymentHistory || []).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
                        {getMethodIcon(rec.method)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            ₹{rec.amount.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {rec.method}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {rec.date}
                          </span>
                          {rec.notes && (
                            <span className="truncate italic">
                              • {rec.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Entry Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPaymentRecord({
                            travellerId: activeHistoryTraveller.id,
                            record: rec,
                          });
                          setActivePaymentTraveller(activeHistoryTraveller);
                          setPaymentAmount(rec.amount);
                          setPaymentMethod(rec.method);
                          setPaymentDate(rec.date);
                          setPaymentNotes(rec.notes || "");
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Edit Entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeletePaymentRecord(activeHistoryTraveller.id, rec.id)
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center space-y-2">
                  <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    No payment entries recorded yet.
                  </p>
                </div>
              )}
            </div>

            {/* Footer button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const trv = activeHistoryTraveller;
                  setActiveHistoryTraveller(null);
                  openReceivePayment(trv);
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Record New Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. EDIT TRAVELLER BUDGET MODAL */}
      {editingBudgetTraveller && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Edit Member Budget
              </h3>
              <button
                type="button"
                onClick={() => setEditingBudgetTraveller(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Expected Contribution for {editingBudgetTraveller.fullName}
              </label>
              <input
                type="number"
                min={0}
                defaultValue={editingBudgetTraveller.allocatedBudget}
                id="editBudgetInput"
                className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBudgetTraveller(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById(
                    "editBudgetInput"
                  ) as HTMLInputElement;
                  if (input) {
                    handleSaveTravellerBudget(
                      editingBudgetTraveller.id,
                      Number(input.value)
                    );
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

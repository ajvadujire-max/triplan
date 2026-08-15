/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Trip,
  Traveller,
  PaymentRecord,
  PaymentMethod,
  CollectionStatus,
} from "../types";
import { ContactPhoneButton } from "./ContactOptionsBottomSheet";
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
  ChevronRight,
  ChevronLeft,
  MessageCircle,
  Bell,
  ArrowLeft
} from "lucide-react";
import { motion } from "motion/react";

interface CollectionsModuleProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onNavigateTab?: (tab: string) => void;
  isOrganizer?: boolean;
}

export const CollectionsModule: React.FC<CollectionsModuleProps> = ({
  trip,
  onUpdateTrip,
  onNavigateTab,
  isOrganizer = false,
}) => {
  // State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CollectionStatus>("All");
  const [sortBy, setSortBy] = useState<
    "Name" | "Remaining Amount" | "Paid Amount" | "Recently Updated" | "Highest Due" | "Lowest Due"
  >("Highest Due");

  const location = useLocation();
  const navigate = useNavigate();

  let basePath = "/dashboard";
  if (location.pathname.startsWith("/admin/dashboard")) {
    basePath = "/admin/dashboard";
  } else if (location.pathname.startsWith("/app")) {
    basePath = "/app";
  }

  const relativePath = location.pathname.substring(basePath.length);
  const segments = relativePath.split("/").filter(Boolean); // ["collections", "trv_123", "receive-payment"] or ["travellers", "collections", "trv_123", "receive-payment"]

  const collectionsIdx = segments.indexOf("collections");
  const selectedTravellerId = collectionsIdx !== -1 && segments[collectionsIdx + 1] ? segments[collectionsIdx + 1] : null;
  const currentAction = collectionsIdx !== -1 ? segments[collectionsIdx + 2] : null;

  const navBase = collectionsIdx === 0 ? `${basePath}/collections` : `${basePath}/travellers/collections`;

  const selectedTraveller = useMemo(() => {
    if (!selectedTravellerId) return null;
    return trip.travellers.find((t) => t.id === selectedTravellerId) || null;
  }, [selectedTravellerId, trip.travellers]);

  const activePaymentTraveller = useMemo(() => {
    if (currentAction === "receive-payment" && selectedTraveller) {
      return selectedTraveller;
    }
    return null;
  }, [currentAction, selectedTraveller]);

  const activeHistoryTraveller = useMemo(() => {
    if (currentAction === "history" && selectedTraveller) {
      return selectedTraveller;
    }
    return null;
  }, [currentAction, selectedTraveller]);

  const editingBudgetTraveller = useMemo(() => {
    if (currentAction === "edit-budget" && selectedTraveller) {
      return selectedTraveller;
    }
    return null;
  }, [currentAction, selectedTraveller]);

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

  // Deduplicate active travellers for automatic equal budget allocation
  const uniqueTravellers = useMemo(() => {
    const seen = new Set<string>();
    const list: Traveller[] = [];
    (trip.travellers || []).forEach((trv) => {
      if (!trv) return;
      if (trv.status === "Cancelled" || trv.status === "Rejected" || trv.status === "Inactive" || trv.status === "left") {
        return;
      }
      const key = trv.id || `${trv.fullName}_${trv.phone || trv.email}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push(trv);
    });
    return list;
  }, [trip.travellers]);

  // Compute map of traveller ID -> allocated equal budget derived from Total Trip Budget
  const travellerBudgetMap = useMemo(() => {
    const map = new Map<string, number>();
    const totalTripBudget = Number(trip.totalBudget || trip.expectedBudget) || 0;
    const n = uniqueTravellers.length;

    if (n > 0 && totalTripBudget > 0) {
      const base = Math.floor(totalTripBudget / n);
      const remainder = totalTripBudget - (base * n);

      uniqueTravellers.forEach((trv, idx) => {
        const allocated = base + (idx < remainder ? 1 : 0);
        map.set(trv.id, allocated);
      });
    } else {
      (trip.travellers || []).forEach((trv) => {
        map.set(trv.id, trv.allocatedBudget || 0);
      });
    }
    return map;
  }, [uniqueTravellers, trip.totalBudget, trip.expectedBudget, trip.travellers]);

  // Helper calculation for traveller stats
  const getTravellerStats = (traveller: Traveller) => {
    const budget = travellerBudgetMap.get(traveller.id) ?? (traveller.allocatedBudget || 0);
    const history = traveller.paymentHistory || [];
    const paid = history.length > 0
      ? history.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
      : (Number(traveller.paidAmount) || 0);
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

    const list = uniqueTravellers.map((trv) => {
      const stats = getTravellerStats(trv);
      totalExpected += stats.budget;
      totalCollected += stats.paid;

      if (stats.status === "Paid") paidCount++;
      else if (stats.status === "Partial") partialCount++;
      else unpaidCount++;

      return { traveller: trv, stats };
    });

    const totalRemaining = Math.max(0, totalExpected - totalCollected);
    const progressPercentValue = totalExpected > 0
      ? Math.min(100, Math.round((totalCollected / totalExpected) * 100))
      : 0;
    
    const progressPercent = isNaN(progressPercentValue) ? 0 : progressPercentValue;

    return {
      totalTravellers: uniqueTravellers.length,
      totalExpected,
      totalCollected,
      totalRemaining,
      progressPercent,
      paidCount,
      partialCount,
      unpaidCount,
      list,
    };
  }, [uniqueTravellers, travellerBudgetMap]);

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
    if (!isOrganizer) return;
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
    setEditingPaymentRecord(null);
    setPaymentAmount("");
    setPaymentNotes("");

    if (selectedTravellerId) {
      navigate(`${navBase}/${selectedTravellerId}`, { replace: true });
    } else {
      navigate(`${navBase}`, { replace: true });
    }
  };

  const handleSelectTraveller = (id: string) => {
    navigate(`${navBase}/${id}`);
  };

  const handleBackToCollections = () => {
    if (window.history.length > 1 && location.key !== "default") {
      navigate(-1);
    } else {
      navigate(`${navBase}`);
    }
  };

  // Open Receive Payment Modal for Traveller
  const openReceivePayment = (traveller: Traveller, prefillAmount?: number) => {
    const stats = getTravellerStats(traveller);
    setPaymentAmount(prefillAmount !== undefined ? prefillAmount : (stats.remaining > 0 ? stats.remaining : ""));
    setPaymentMethod("UPI");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
    setEditingPaymentRecord(null);

    navigate(`${navBase}/${traveller.id}/receive-payment`);
  };

  const handleCloseReceivePayment = () => {
    if (window.history.length > 1 && location.key !== "default") {
      navigate(-1);
    } else if (selectedTravellerId) {
      navigate(`${navBase}/${selectedTravellerId}`);
    } else {
      navigate(`${navBase}`);
    }
  };

  const openHistory = (traveller: Traveller) => {
    navigate(`${navBase}/${traveller.id}/history`);
  };

  const handleCloseHistory = () => {
    if (window.history.length > 1 && location.key !== "default") {
      navigate(-1);
    } else if (selectedTravellerId) {
      navigate(`${navBase}/${selectedTravellerId}`);
    } else {
      navigate(`${navBase}`);
    }
  };

  const openEditBudget = (traveller: Traveller) => {
    navigate(`${navBase}/${traveller.id}/edit-budget`);
  };

  const handleCloseEditBudget = () => {
    if (window.history.length > 1 && location.key !== "default") {
      navigate(-1);
    } else if (selectedTravellerId) {
      navigate(`${navBase}/${selectedTravellerId}`);
    } else {
      navigate(`${navBase}`);
    }
  };

  // Delete Payment History Item
  const handleDeletePaymentRecord = (travellerId: string, recordId: string) => {
    if (!isOrganizer) return;
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
      if (!updatedTrv) {
        handleCloseHistory();
      }
    }
  };

  // Edit Budget for a traveller
  const handleSaveTravellerBudget = (travellerId: string, newBudget: number) => {
    if (!isOrganizer) return;
    const activeCount = Math.max(1, uniqueTravellers.length);
    const updatedTotalBudget = Math.max(0, newBudget) * activeCount;

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
      totalBudget: updatedTotalBudget,
      expectedBudget: updatedTotalBudget,
      travellers: updatedTravellers,
    });
    if (selectedTravellerId) {
      navigate(`${navBase}/${selectedTravellerId}`, { replace: true });
    } else {
      navigate(`${navBase}`, { replace: true });
    }
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
    <div className="space-y-3 sm:space-y-4 pb-16">
      {/* Toast Notification */}
      {reminderToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[110] bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-2xl border border-indigo-500 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-3 max-w-[90vw] truncate">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{reminderToast}</span>
        </div>
      )}

      {selectedTraveller ? (
        <CollectionDetails
          traveller={selectedTraveller}
          trip={trip}
          stats={getTravellerStats(selectedTraveller)}
          onBack={handleBackToCollections}
          onUpdateTrip={onUpdateTrip}
          openReceivePayment={openReceivePayment}
          isOrganizer={isOrganizer}
          handleSendReminder={handleSendReminder}
          setEditingBudgetTraveller={openEditBudget}
          setActiveHistoryTraveller={openHistory}
          handleDeletePaymentRecord={handleDeletePaymentRecord}
          getMethodIcon={getMethodIcon}
        />
      ) : (
        <>
          {/* Header Banner - Compact Mobile First */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#EDF4FF] dark:bg-slate-900 p-3.5 sm:p-4 rounded-[16px] sm:rounded-[20px] border border-[#D8E6FF] dark:border-slate-800 text-slate-900 dark:text-white shadow-xs">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#2D6BF7]/10 dark:bg-indigo-500/20 text-[#2D6BF7] dark:text-indigo-400 border border-[#2D6BF7]/20 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-4 h-4 text-[#2D6BF7] dark:text-indigo-400" />
                </span>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-[#111827] dark:text-white truncate">
                    Trip Treasury & Collections
                  </h1>
                  {!isOrganizer && (
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded-md shrink-0">
                      View Only
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 font-medium leading-snug mt-1 truncate">
                Track member budgets, payments & status for{" "}
                <span className="text-[#2D6BF7] dark:text-indigo-400 font-bold">{trip.name}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-0.5 sm:pt-0">
              <button
                type="button"
                onClick={() => setIsReportsOpen(!isReportsOpen)}
                className="flex items-center gap-1.5 px-2.5 h-8 text-[11px] font-extrabold rounded-lg bg-blue-100/80 hover:bg-blue-200/80 dark:bg-indigo-950/60 text-[#2D6BF7] dark:text-indigo-300 transition-all border border-blue-200/60 dark:border-indigo-800/50"
              >
                <PieChart className="w-3.5 h-3.5 text-[#2D6BF7] dark:text-indigo-300" />
                <span>{isReportsOpen ? "Hide" : "Reports"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 h-8 text-[11px] font-extrabold rounded-lg bg-[#2D6BF7] hover:bg-blue-600 text-white shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* SINGLE COMPACT COLLECTION PROGRESS CARD */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-[16px] border border-[#E2E8F0] dark:border-slate-800 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#111827] dark:text-white">Collection Progress</span>
              <span className="text-xs font-black text-[#2D6BF7] dark:text-indigo-400">{collectionSummary.progressPercent}%</span>
            </div>
            <div className="text-[11px] font-medium text-[#111827] dark:text-slate-300">
              ₹{collectionSummary.totalCollected.toLocaleString("en-IN")} collected of ₹{collectionSummary.totalExpected.toLocaleString("en-IN")}
            </div>
            <div className="w-full bg-[#E5E7EB] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#2D6BF7] dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${collectionSummary.progressPercent}%` }}
              />
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-[#64748B] dark:text-slate-400">
              ₹{collectionSummary.totalRemaining.toLocaleString("en-IN")} remaining
            </div>
          </div>

      {/* EXPANDABLE REPORTS & ANALYTICS PANEL */}
      {isReportsOpen && (
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 sm:p-5 rounded-[18px] border border-slate-200 dark:border-slate-800 shadow-md space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#2D6BF7] dark:text-indigo-400" />
              <h3 className="font-extrabold text-sm text-[#111827] dark:text-white">
                Collection Reports & Financial Summary
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsReportsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Average Contribution */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                Avg. Expected / Person
              </div>
              <div className="text-base font-black text-[#111827] dark:text-white mt-1">
                ₹
                {collectionSummary.totalTravellers > 0
                  ? Math.round(
                      collectionSummary.totalExpected / collectionSummary.totalTravellers
                    ).toLocaleString("en-IN")
                  : 0}
              </div>
            </div>

            {/* Average Collected */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                Avg. Collected / Person
              </div>
              <div className="text-base font-black text-[#059669] dark:text-emerald-400 mt-1">
                ₹
                {collectionSummary.totalTravellers > 0
                  ? Math.round(
                      collectionSummary.totalCollected / collectionSummary.totalTravellers
                    ).toLocaleString("en-IN")
                  : 0}
              </div>
            </div>

            {/* Highest Contributor */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase truncate">
                Highest Contributor
              </div>
              <div className="text-sm font-black text-[#2D6BF7] dark:text-indigo-300 mt-1 truncate">
                {collectionSummary.list.length > 0
                  ? [...collectionSummary.list].sort((a, b) => b.stats.paid - a.stats.paid)[0]?.traveller.fullName
                  : "N/A"}
              </div>
            </div>

            {/* Lowest / Unpaid Count */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase truncate">
                Pending Members
              </div>
              <div className="text-sm font-black text-rose-600 dark:text-rose-400 mt-1">
                {collectionSummary.unpaidCount + collectionSummary.partialCount} Members
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PAYMENT STATUS QUICK FILTER CHIPS */}
      <div className="grid grid-cols-4 gap-1 sm:gap-2 w-full">
        {/* Filter Status Badge buttons */}
        <button
          type="button"
          onClick={() => setStatusFilter("All")}
          className={`w-full flex items-center justify-center p-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-full text-[8px] min-[360px]:text-[9px] sm:text-xs font-extrabold transition-all gap-1 ${
            statusFilter === "All"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
          }`}
        >
          <span className="whitespace-nowrap tracking-tight">All Members</span>
          <span className="px-1 py-0.5 rounded-md sm:rounded-full bg-slate-200 dark:bg-slate-700 text-[8px] sm:text-[10px]">
            {collectionSummary.totalTravellers}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Paid")}
          className={`w-full flex items-center justify-center p-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-full text-[8px] min-[360px]:text-[9px] sm:text-xs font-extrabold transition-all gap-1 ${
            statusFilter === "Paid"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
          }`}
        >
          <span className="whitespace-nowrap tracking-tight">🟢 Paid</span>
          <span className="px-1 py-0.5 rounded-md sm:rounded-full bg-emerald-200/60 dark:bg-emerald-900 text-[8px] sm:text-[10px]">
            {collectionSummary.paidCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Partial")}
          className={`w-full flex items-center justify-center p-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-full text-[8px] min-[360px]:text-[9px] sm:text-xs font-extrabold transition-all gap-1 ${
            statusFilter === "Partial"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
          }`}
        >
          <span className="whitespace-nowrap tracking-tight">🟡 Partial</span>
          <span className="px-1 py-0.5 rounded-md sm:rounded-full bg-amber-200/60 dark:bg-amber-900 text-[8px] sm:text-[10px]">
            {collectionSummary.partialCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Unpaid")}
          className={`w-full flex items-center justify-center p-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-full text-[8px] min-[360px]:text-[9px] sm:text-xs font-extrabold transition-all gap-1 ${
            statusFilter === "Unpaid"
              ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100"
          }`}
        >
          <span className="whitespace-nowrap tracking-tight">🔴 Unpaid</span>
          <span className="px-1 py-0.5 rounded-md sm:rounded-full bg-rose-200/60 dark:bg-rose-900 text-[8px] sm:text-[10px]">
            {collectionSummary.unpaidCount}
          </span>
        </button>
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

      {/* 3. TRAVELLER CARDS LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>
              Showing {filteredTravellers.length} of {uniqueTravellers.length}{" "}
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
          filteredTravellers.map(({ traveller, stats }, idx) => {
            return (
              <div
                key={traveller.id ? `${traveller.id}_${idx}` : `traveller_${idx}`}
                onClick={() => handleSelectTraveller(traveller.id)}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Avatar, Name, Role */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {traveller.profilePhoto ? (
                        <img
                          src={traveller.profilePhoto}
                          alt={traveller.fullName}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                          {traveller.fullName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {traveller.fullName}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                          {traveller.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{traveller.phone || "No phone"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Key Financials */}
                  <div className="hidden sm:grid grid-cols-3 gap-6 text-right shrink-0">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">₹{stats.budget.toLocaleString("en-IN")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Paid</div>
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{stats.paid.toLocaleString("en-IN")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance</div>
                      <div className={`text-sm font-black ${stats.remaining > 0 ? "text-rose-500" : "text-slate-400"}`}>₹{stats.remaining.toLocaleString("en-IN")}</div>
                    </div>
                  </div>

                  {/* Right: Status & Arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden xs:block">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        stats.status === "Paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                        stats.status === "Partial" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                      }`}>
                        {stats.status}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
                
                {/* Mobile only financials */}
                <div className="grid xs:hidden grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                   <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Budget</div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">₹{stats.budget.toLocaleString("en-IN")}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-emerald-600 uppercase">Paid</div>
                      <div className="text-xs font-extrabold text-emerald-600">₹{stats.paid.toLocaleString("en-IN")}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Balance</div>
                      <div className={`text-xs font-extrabold ${stats.remaining > 0 ? "text-rose-500" : "text-slate-400"}`}>₹{stats.remaining.toLocaleString("en-IN")}</div>
                    </div>
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
    </>
  )}

      {/* 4. RECEIVE PAYMENT BOTTOM SHEET / MODAL */}
      {isOrganizer && activePaymentTraveller && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex max-sm:items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-sm:rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
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
                onClick={handleCloseReceivePayment}
                className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
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
                  ₹{getTravellerStats(activePaymentTraveller).budget.toLocaleString("en-IN")}
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
                    className="w-full pl-10 pr-4 py-3 sm:py-2.5 text-base sm:text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseReceivePayment}
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
                onClick={handleCloseHistory}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Payments */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {(activeHistoryTraveller.paymentHistory || []).length > 0 ? (
                (activeHistoryTraveller.paymentHistory || []).map((rec, idx) => (
                  <div
                    key={rec.id ? `${rec.id}_${idx}` : `pmt_${idx}`}
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
                    {isOrganizer && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPaymentRecord({
                              travellerId: activeHistoryTraveller.id,
                              record: rec,
                            });
                            openReceivePayment(activeHistoryTraveller, rec.amount);
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
                    )}
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
            {isOrganizer && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const trv = activeHistoryTraveller;
                    openReceivePayment(trv);
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record New Payment</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. EDIT TRAVELLER BUDGET MODAL */}
      {isOrganizer && editingBudgetTraveller && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Edit Member Budget
              </h3>
              <button
                type="button"
                onClick={handleCloseEditBudget}
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
                defaultValue={getTravellerStats(editingBudgetTraveller).budget}
                id="editBudgetInput"
                className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseEditBudget}
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

interface CollectionDetailsProps {
  traveller: Traveller;
  trip: Trip;
  stats: {
    budget: number;
    paid: number;
    remaining: number;
    status: CollectionStatus;
    history: PaymentRecord[];
  };
  onBack: () => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
  isOrganizer?: boolean;
  openReceivePayment: (traveller: Traveller, prefillAmount?: number) => void;
  handleSendReminder: (traveller: Traveller) => void;
  setEditingBudgetTraveller: (traveller: Traveller | null) => void;
  setActiveHistoryTraveller: (traveller: Traveller | null) => void;
  handleDeletePaymentRecord: (travellerId: string, recordId: string) => void;
  getMethodIcon: (method: PaymentMethod) => React.ReactNode;
}

const CollectionDetails: React.FC<CollectionDetailsProps> = ({
  traveller,
  trip,
  stats,
  onBack,
  onUpdateTrip,
  openReceivePayment,
  isOrganizer,
  handleSendReminder,
  setEditingBudgetTraveller,
  setActiveHistoryTraveller,
  handleDeletePaymentRecord,
  getMethodIcon,
}) => {
  const percentPaid = stats.budget > 0
    ? Math.min(100, Math.round((stats.paid / stats.budget) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3.5 sm:space-y-4 max-w-xl mx-auto"
    >
      {/* 1. Header with Back Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">Collection Details</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Payment status for {traveller.fullName}</p>
        </div>
      </div>

      {/* 2. Compact Traveller Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            {traveller.profilePhoto ? (
              <img
                src={traveller.profilePhoto}
                alt={traveller.fullName}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-sm"
              />
            ) : (
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-black text-2xl flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm">
                {traveller.fullName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold shadow-xs ${
              stats.status === "Paid" ? "bg-emerald-500 text-white" :
              stats.status === "Partial" ? "bg-amber-500 text-white" :
              "bg-rose-500 text-white"
            }`}>
              {stats.status === "Paid" ? <Check className="w-3.5 h-3.5" /> : "!"}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
              {traveller.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                {traveller.role}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                stats.status === "Paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400" :
                stats.status === "Partial" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400" :
                "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
              }`}>
                {stats.status}
              </span>
            </div>
            
            <div className="mt-1.5">
              <ContactPhoneButton 
                phone={traveller.phone} 
                travellerName={traveller.fullName}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Card (Placed directly below profile card) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Quick Actions</h3>
          {stats.remaining > 0 && (
            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-900/40">
              Due: ₹{stats.remaining.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {isOrganizer && (
          <>
            {/* Primary Action Button: Receive Payment */}
            <button
              onClick={() => openReceivePayment(traveller)}
              className="w-full min-h-[46px] flex items-center justify-center gap-2 p-3 rounded-xl bg-[#2D6BF7] hover:bg-blue-600 text-white font-bold text-sm shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Receive Payment</span>
            </button>

            {/* Secondary Actions: Send Reminder & Edit Collection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSendReminder(traveller)}
                className="min-h-[44px] flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold transition-all active:scale-98 cursor-pointer"
              >
                <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Send Reminder</span>
              </button>

              <button
                onClick={() => setEditingBudgetTraveller(traveller)}
                className="min-h-[44px] flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold transition-all active:scale-98 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="truncate">Edit Collection</span>
              </button>
            </div>
          </>
        )}

        {/* Communication Section */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Communication</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const waUrl = `https://wa.me/${traveller.phone?.replace(/\D/g, "")}`;
                window.open(waUrl, "_blank");
              }}
              className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs transition-all active:scale-98 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => {
                window.location.href = `tel:${traveller.phone}`;
              }}
              className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-blue-700 dark:text-blue-400 font-extrabold text-xs transition-all active:scale-98 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Payment Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#2D6BF7]" />
            Payment Summary
          </h3>
          <div className="text-right flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Progress</span>
            <span className="text-sm font-black text-emerald-500">{percentPaid}%</span>
          </div>
        </div>

        {/* 3 Financial Cards in ONE ROW on mobile */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
          <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center min-w-0">
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase block truncate">Total Budget</span>
            <span className="text-xs sm:text-base font-black text-slate-900 dark:text-white truncate block mt-0.5">
              ₹{stats.budget.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center min-w-0">
            <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block truncate">Total Paid</span>
            <span className="text-xs sm:text-base font-black text-emerald-600 dark:text-emerald-400 truncate block mt-0.5">
              ₹{stats.paid.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-center min-w-0">
            <span className="text-[8px] sm:text-[10px] font-bold text-rose-500 uppercase block truncate">Balance</span>
            <span className={`text-xs sm:text-base font-black truncate block mt-0.5 ${stats.remaining > 0 ? "text-rose-500" : "text-slate-400"}`}>
              ₹{stats.remaining.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 pt-1">
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentPaid}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                percentPaid === 100 ? "bg-emerald-500" : "bg-[#2D6BF7]"
              }`}
            />
          </div>
          <div className="flex justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-tight">
            <span>0%</span>
            <span>{percentPaid}% COLLECTED</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 5. Payment History Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-[#2D6BF7]" />
          Payment History
        </h3>

        {stats.history.length > 0 ? (
          <div className="space-y-2">
            {stats.history.map((record, idx) => (
              <div
                key={record.id ? `${record.id}_${idx}` : `hist_${idx}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs shrink-0">
                    {getMethodIcon(record.method)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        ₹{record.amount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {record.method}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {record.notes && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[180px]">{record.notes}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePaymentRecord(traveller.id, record.id)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                  title="Delete payment record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <FileText className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
            <p className="text-xs text-slate-500 font-medium">No payments recorded yet.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

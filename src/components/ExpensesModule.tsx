/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trip,
  Expense,
  ExpenseCategory,
  SplitType,
  FinanceAccount,
} from "../types";
import {
  Receipt,
  Plus,
  Wallet,
  Users,
  Check,
  CreditCard,
  Building2,
  Trash2,
  X,
  FileText,
  DollarSign,
  PieChart,
  ArrowLeft,
  Edit,
  Clock,
  Calendar,
  User,
  ShieldAlert,
  Utensils,
  Fuel,
  Hotel,
  Car,
  Plane,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Tag,
  Quote,
  RotateCcw,
} from "lucide-react";

interface ExpensesModuleProps {
  trip: Trip;
  accounts: FinanceAccount[];
  onAddExpense: (expense: Expense, accountId: string, amount: number) => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateTrip?: (updatedTrip: Trip) => void;
}

const categoriesList: ExpenseCategory[] = [
  "Fuel",
  "Food",
  "Hotel",
  "Taxi",
  "Bus",
  "Train",
  "Flight",
  "Shopping",
  "Parking",
  "Toll",
  "Medical",
  "Entertainment",
  "Emergency",
  "Others",
];

const getCategoryIcon = (category: ExpenseCategory) => {
  switch (category) {
    case "Food":
      return <Utensils className="w-3.5 h-3.5" />;
    case "Fuel":
      return <Fuel className="w-3.5 h-3.5" />;
    case "Hotel":
      return <Hotel className="w-3.5 h-3.5" />;
    case "Taxi":
    case "Bus":
    case "Train":
    case "Parking":
    case "Toll":
      return <Car className="w-3.5 h-3.5" />;
    case "Flight":
      return <Plane className="w-3.5 h-3.5" />;
    case "Shopping":
      return <ShoppingBag className="w-3.5 h-3.5" />;
    case "Medical":
    case "Emergency":
      return <ShieldAlert className="w-3.5 h-3.5" />;
    case "Entertainment":
      return <Sparkles className="w-3.5 h-3.5" />;
    default:
      return <Receipt className="w-3.5 h-3.5" />;
  }
};

const getInitials = (name: string) => {
  if (!name) return "TR";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({
  trip,
  accounts,
  onAddExpense,
  onDeleteExpense,
  onUpdateTrip,
}) => {
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [whoPaidId, setWhoPaidId] = useState<string>(trip.travellers[0]?.id || "");
  const [whoUsedIds, setWhoUsedIds] = useState<string[]>(
    trip.travellers.map((t) => t.id)
  );
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
  const [accountUsedId, setAccountUsedId] = useState<string>(
    accounts[0]?.id || "acc_hdfc"
  );
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filter category tab
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("All");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setDescription("");
    setAmount("");
    setCategory("Food");
    setWhoPaidId(trip.travellers[0]?.id || "");
    setWhoUsedIds(trip.travellers.map((t) => t.id));
    setSplitType("equal");
    setCustomSplits({});
    setCustomPercentages({});
    setAccountUsedId(accounts[0]?.id || "acc_hdfc");
    setReceiptUrl("");
    setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setDescription(exp.description);
    setAmount(exp.amount);
    setCategory(exp.category);
    setWhoPaidId(exp.whoPaidId);
    setWhoUsedIds(exp.whoUsedIds || trip.travellers.map((t) => t.id));
    setSplitType(exp.splitType || "equal");
    setAccountUsedId(exp.accountUsedId || accounts[0]?.id || "acc_hdfc");
    setReceiptUrl(exp.receiptUrl || "");
    setNotes(exp.notes || "");
    setDate(exp.date || new Date().toISOString().split("T")[0]);

    if (exp.splits) {
      setCustomSplits(exp.splits);
    }
    setIsAddModalOpen(true);
  };

  const toggleUserSelection = (id: string) => {
    if (whoUsedIds.includes(id)) {
      if (whoUsedIds.length === 1) return; // Must have at least 1 user
      setWhoUsedIds(whoUsedIds.filter((uid) => uid !== id));
    } else {
      setWhoUsedIds([...whoUsedIds, id]);
    }
  };

  const calculateFinalSplits = (): Record<string, number> => {
    const total = Number(amount) || 0;
    const splitsResult: Record<string, number> = {};

    if (splitType === "equal") {
      const perPerson =
        total > 0 && whoUsedIds.length > 0 ? total / whoUsedIds.length : 0;
      whoUsedIds.forEach((id) => {
        splitsResult[id] = Math.round(perPerson * 100) / 100;
      });
    } else if (splitType === "percentage") {
      whoUsedIds.forEach((id) => {
        const pct = customPercentages[id] || 0;
        splitsResult[id] = Math.round(((total * pct) / 100) * 100) / 100;
      });
    } else if (splitType === "custom") {
      whoUsedIds.forEach((id) => {
        splitsResult[id] = customSplits[id] || 0;
      });
    }

    return splitsResult;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!description.trim() || !numAmount || numAmount <= 0) {
      alert("Please enter a valid description and amount.");
      return;
    }

    if (splitType === "percentage") {
      let totalPct = 0;
      whoUsedIds.forEach((id) => {
        totalPct += customPercentages[id] || 0;
      });
      if (Math.abs(totalPct - 100) > 0.01) {
        alert(`Total percentage must be exactly 100%. Currently: ${totalPct}%`);
        return;
      }
    } else if (splitType === "custom") {
      let totalCustom = 0;
      whoUsedIds.forEach((id) => {
        totalCustom += customSplits[id] || 0;
      });
      if (Math.abs(totalCustom - numAmount) > 0.01) {
        alert(
          `Total custom split amounts must equal the expense total (${trip.currency}${numAmount}). Currently: ${trip.currency}${totalCustom}`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const calculatedSplits = calculateFinalSplits();

      if (editingExpense) {
        const updatedExpense: Expense = {
          ...editingExpense,
          description,
          amount: numAmount,
          whoPaidId,
          whoUsedIds,
          category,
          accountUsedId,
          splitType,
          splits: calculatedSplits,
          receiptUrl,
          date,
          notes,
        };

        const updatedExpenses = trip.expenses.map((e) =>
          e.id === editingExpense.id ? updatedExpense : e
        );
        const newTotalSpent = updatedExpenses.reduce((acc, e) => acc + e.amount, 0);
        const newRemaining = trip.totalBudget - newTotalSpent;

        if (onUpdateTrip) {
          onUpdateTrip({
            ...trip,
            expenses: updatedExpenses,
            totalSpent: newTotalSpent,
            remainingBudget: newRemaining,
          });
        }
        showToast("Expense updated successfully");
      } else {
        const newExpense: Expense = {
          id: `exp_${Date.now()}`,
          tripId: trip.id,
          description,
          amount: numAmount,
          whoPaidId,
          whoUsedIds,
          category,
          accountUsedId,
          splitType,
          splits: calculatedSplits,
          receiptUrl,
          date,
          notes,
        };

        onAddExpense(newExpense, accountUsedId, numAmount);
        showToast("Expense added successfully");
      }
      setIsAddModalOpen(false);
    } catch (err) {
      showToast("Error saving expense", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelectedExpense = (expId: string) => {
    setConfirmDeleteId(expId);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      onDeleteExpense(confirmDeleteId);
      if (selectedExpenseId === confirmDeleteId) {
        setSelectedExpenseId(null);
      }
      setConfirmDeleteId(null);
      showToast("Expense deleted successfully");
    }
  };

  const handleAddBudget = () => {
    const newBudget = prompt("Enter new total trip budget amount:", trip.totalBudget.toString());
    if (newBudget !== null) {
      const budgetNum = Number(newBudget);
      if (!isNaN(budgetNum) && budgetNum >= 0) {
        onUpdateTrip({
          ...trip,
          totalBudget: budgetNum,
          remainingBudget: budgetNum - (trip.totalSpent || 0)
        });
        showToast("Budget updated successfully");
      } else {
        showToast("Invalid budget amount", "error");
      }
    }
  };

  const handleResetBudget = () => {
    if (confirm("Are you sure you want to reset the trip budget? This will set it to 0 and clear all traveller allocated budgets.")) {
      const resetTravellers = trip.travellers.map(t => ({ ...t, allocatedBudget: 0 }));
      onUpdateTrip({
        ...trip,
        totalBudget: 0,
        remainingBudget: -(trip.totalSpent || 0),
        travellers: resetTravellers
      });
      showToast("Budget has been reset to zero");
    }
  };

  // Filtered expenses list
  const filteredExpenses =
    selectedCategoryFilter === "All"
      ? trip.expenses
      : trip.expenses.filter((e) => e.category === selectedCategoryFilter);

  const totalExpenseAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Selected Expense Details Page View
  const selectedExpense = trip.expenses.find((e) => e.id === selectedExpenseId);

  if (selectedExpense) {
    const paidByPerson = trip.travellers.find(
      (t) => t.id === selectedExpense.whoPaidId
    );
    const account = accounts.find((a) => a.id === selectedExpense.accountUsedId);

    return (
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setSelectedExpenseId(null)}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Back to Expenses</span>
          </button>
          <span className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-slate-400">
            Expense Details
          </span>
        </div>

        {/* Details Container with Material page transition */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {getCategoryIcon(selectedExpense.category)}
                  {selectedExpense.category}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {selectedExpense.date}
                </span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {account?.name || "Cash Account"}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {selectedExpense.description}
              </h1>

              {/* Large Prominent Total Amount */}
              <div className="pt-2">
                <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Total Amount Paid
                </p>
                <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                  {trip.currency}
                  {selectedExpense.amount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Paid By Info */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              {paidByPerson?.profilePhoto ? (
                <img
                  src={paidByPerson.profilePhoto}
                  alt={paidByPerson.fullName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/30 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 border border-emerald-400/30">
                  {getInitials(paidByPerson?.fullName || "Member")}
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Paid By
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none mt-0.5">
                  {paidByPerson?.fullName || "Member"}
                  {paidByPerson?.role ? ` (${paidByPerson.role})` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Split Details Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Split Details
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 capitalize">
                  {selectedExpense.splitType || "equal"} split
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {selectedExpense.whoUsedIds.length} traveller(s)
                </span>
              </div>
            </div>

            {/* Individual Traveller Contribution List */}
            <div className="space-y-3">
              {Object.entries(selectedExpense.splits || {}).map(([trvId, share]) => {
                const trv = trip.travellers.find((t) => t.id === trvId);
                if (!trv) return null;

                return (
                  <div
                    key={trvId}
                    className="flex items-center justify-between text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 shrink-0">
                      {trv.profilePhoto ? (
                        <img
                          src={trv.profilePhoto}
                          alt={trv.fullName}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] sm:text-xs flex items-center justify-center border border-slate-300 dark:border-slate-700">
                          {getInitials(trv.fullName)}
                        </div>
                      )}
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {trv.fullName}
                      </span>
                    </div>

                    {/* Dotted Leader Line */}
                    <div className="flex-1 border-b border-dashed border-slate-300 dark:border-slate-700 mx-3 mb-1 min-w-[30px]" />

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                        {trip.currency}
                        {share.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes Card */}
          {selectedExpense.notes && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <Quote className="w-4 h-4 text-emerald-500" />
                <h3>Expense Notes</h3>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                "{selectedExpense.notes}"
              </div>
            </div>
          )}

          {/* Expense Information Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base border-b border-slate-100 dark:border-slate-800 pb-3">
              <FileText className="w-5 h-5 text-emerald-500" />
              <h3>Expense Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" /> Category
                </p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {selectedExpense.category}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Transaction Date
                </p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {selectedExpense.date}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> Payment Account
                </p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {account?.name || "Cash / Direct Account"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-emerald-500" /> Created / Paid By
                </p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {paidByPerson?.fullName || "Member"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Status
                </p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  Verified & Synced with Cashbook
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handleOpenEdit(selectedExpense)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-emerald-500/20 text-xs sm:text-sm"
            >
              <Edit className="w-4 h-4" /> Edit Expense
            </button>
            <button
              onClick={() => handleDeleteSelectedExpense(selectedExpense.id)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 transition-all text-xs sm:text-sm"
            >
              <Trash2 className="w-4 h-4" /> Delete Expense
            </button>
          </div>
        </motion.div>

        {/* Edit / Add Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden mt-auto sm:mt-0 flex flex-col max-h-[92vh] sm:max-h-none"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {editingExpense ? "Edit Expense" : "Record & Split Expense"}
                  </h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dinner at Britto's"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Amount ({trip.currency}) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="2500"
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Expense Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Used
                    </label>
                    <select
                      value={accountUsedId}
                      onChange={(e) => setAccountUsedId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({trip.currency}
                          {acc.balance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Paid By
                  </label>
                  <select
                    value={whoPaidId}
                    onChange={(e) => setWhoPaidId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {trip.travellers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Split Between
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {trip.travellers.map((t) => {
                      const isSelected = whoUsedIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleUserSelection(t.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold border transition-all text-left ${
                            isSelected
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : "bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-400"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="truncate">{t.fullName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Split Rule
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSplitType("equal")}
                      className={`py-2 text-xs font-bold rounded-lg border ${
                        splitType === "equal"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Split Equally
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitType("percentage")}
                      className={`py-2 text-xs font-bold rounded-lg border ${
                        splitType === "percentage"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Split %
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitType("custom")}
                      className={`py-2 text-xs font-bold rounded-lg border ${
                        splitType === "custom"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Custom Amount
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Receipt URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={receiptUrl}
                      onChange={(e) => setReceiptUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Transaction Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Additional details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <Clock className="w-3.5 h-3.5 animate-spin" />}
                    {isSubmitting ? "Saving..." : editingExpense ? "Save Changes" : "Confirm & Split"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Custom Confirmation Modal for Deletion */}
        <AnimatePresence>
          {confirmDeleteId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3 text-rose-600">
                  <ShieldAlert className="w-6 h-6" />
                  <h3 className="text-lg font-black">Delete Expense?</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to remove this expense from the trip? This will update traveller balances and treasury records.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-500 shadow-lg shadow-rose-500/20"
                  >
                    Delete Now
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === "success"
                  ? "bg-emerald-600 text-white border-emerald-500"
                  : "bg-rose-600 text-white border-rose-500"
              }`}
            >
              {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              <span className="text-sm font-bold">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Primary Expenses List View
  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Receipt className="w-4 h-4 sm:w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
              Trip Expenses & Transaction History
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Tap any expense to view full details, traveller split breakdowns, notes, and actions.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleAddBudget}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold px-3 py-2 sm:py-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Add Budget</span>
          </button>
          <button
            onClick={handleResetBudget}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold px-3 py-2 sm:py-2.5 rounded-xl border border-rose-100 dark:border-rose-900"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Budget</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-sm font-bold px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Budget Warning Alert */}
      {(() => {
        const totalSpent = trip.expenses.reduce((acc, exp) => acc + exp.amount, 0);
        const budgetUsagePercent = trip.totalBudget > 0 ? Math.round((totalSpent / trip.totalBudget) * 100) : 0;
        
        if (budgetUsagePercent > 100) {
          return (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center gap-2 sm:gap-3 shadow-xs"
            >
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
              <div className="text-[11px] sm:text-xs leading-relaxed">
                <span className="font-bold">Budget Alert:</span> Your total trip expenditure ({trip.currency}{totalSpent.toLocaleString()}) has exceeded your allocated budget ({trip.currency}{trip.totalBudget.toLocaleString()}) by <span className="font-bold">{trip.currency}{(totalSpent - trip.totalBudget).toLocaleString()}</span> ({budgetUsagePercent}% used).
              </div>
            </motion.div>
          );
        }
        return null;
      })()}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategoryFilter("All")}
          className={`px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
            selectedCategoryFilter === "All"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          All Categories ({trip.expenses.length})
        </button>
        {categoriesList.map((cat) => {
          const count = trip.expenses.filter((e) => e.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategoryFilter === cat
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {getCategoryIcon(cat)}
              <span>
                {cat} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Expense History Header Bar & Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {filteredExpenses.length} TRANSACTIONS
          </span>
          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
            Total: {trip.currency}
            {totalExpenseAmount.toLocaleString()}
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-10 sm:p-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-40" />
            <p className="text-xs sm:text-sm font-medium">No expenses recorded for this view.</p>
            <p className="text-[11px] mt-1">Tap '+ Record Expense' to log a transaction.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredExpenses.map((exp) => {
              const paidByPerson = trip.travellers.find((t) => t.id === exp.whoPaidId);

              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExpenseId(exp.id)}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-between gap-3 min-h-[90px] max-h-[110px] select-none"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Top Row: Category badge & Date */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        {getCategoryIcon(exp.category)}
                        {exp.category}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">
                        • {exp.date}
                      </span>
                    </div>

                    {/* Middle Row: Expense Title */}
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                      {exp.description}
                    </h4>

                    {/* Bottom Row: Paid By */}
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                      Paid by{" "}
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {paidByPerson?.fullName || "Member"}
                      </span>
                    </p>
                  </div>

                  {/* Right Side: Total Amount (No arrow) */}
                  <div className="text-right shrink-0">
                    <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                      {trip.currency}
                      {exp.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden mt-auto sm:mt-0 flex flex-col max-h-[92vh] sm:max-h-none"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {editingExpense ? "Edit Expense" : "Record & Split Expense"}
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dinner at Britto's"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({trip.currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="2500"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Used
                  </label>
                  <select
                    value={accountUsedId}
                    onChange={(e) => setAccountUsedId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({trip.currency}
                        {acc.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paid By
                </label>
                <select
                  value={whoPaidId}
                  onChange={(e) => setWhoPaidId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {trip.travellers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Split Between
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {trip.travellers.map((t) => {
                    const isSelected = whoUsedIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleUserSelection(t.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold border transition-all text-left ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                            : "bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                            isSelected
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-400"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="truncate">{t.fullName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Split Rule
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitType("equal")}
                    className={`py-2 text-xs font-bold rounded-lg border ${
                      splitType === "equal"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Split Equally
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType("percentage")}
                    className={`py-2 text-xs font-bold rounded-lg border ${
                      splitType === "percentage"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Split %
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType("custom")}
                    className={`py-2 text-xs font-bold rounded-lg border ${
                      splitType === "custom"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Custom Amount
                  </button>
                </div>
              </div>

              {/* Split Details Section */}
              <AnimatePresence>
                {(splitType === "percentage" || splitType === "custom") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 overflow-hidden"
                  >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {splitType === "percentage" ? "Set Percentages (%)" : "Set Custom Amounts"}
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const count = whoUsedIds.length;
                        if (count === 0) return;
                        if (splitType === "percentage") {
                          const equalPct = Math.floor(100 / count);
                          const newPcts: Record<string, number> = {};
                          whoUsedIds.forEach(id => newPcts[id] = equalPct);
                          // Handle remainder
                          if (whoUsedIds.length > 0) newPcts[whoUsedIds[0]] += (100 - (equalPct * count));
                          setCustomPercentages(newPcts);
                        } else {
                          const total = Number(amount) || 0;
                          const equalAmt = Math.round((total / count) * 100) / 100;
                          const newAmts: Record<string, number> = {};
                          whoUsedIds.forEach(id => newAmts[id] = equalAmt);
                          // Handle remainder
                          if (whoUsedIds.length > 0) {
                            const currentSum = equalAmt * count;
                            newAmts[whoUsedIds[0]] = Math.round((newAmts[whoUsedIds[0]] + (total - currentSum)) * 100) / 100;
                          }
                          setCustomSplits(newAmts);
                        }
                      }}
                      className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                    >
                      Auto-Fill Equal
                    </button>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      Total {splitType === "percentage" ? "%" : trip.currency}:{" "}
                      {splitType === "percentage"
                        ? `${(Object.values(customPercentages) as number[]).reduce((a, b) => a + b, 0)}%`
                        : `${trip.currency}${(Object.values(customSplits) as number[]).reduce(
                            (a, b) => a + b,
                            0
                          ).toLocaleString()}`}
                    </span>
                  </div>
                </div>
                    <div className="space-y-2">
                      {whoUsedIds.map((id) => {
                        const trv = trip.travellers.find((t) => t.id === id);
                        if (!trv) return null;
                        return (
                          <div key={id} className="flex items-center gap-3">
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex-1 truncate">
                              {trv.fullName}
                            </span>
                            <div className="relative w-28">
                              <input
                                type="number"
                                placeholder={splitType === "percentage" ? "0" : "0.00"}
                                value={
                                  splitType === "percentage"
                                    ? customPercentages[id] || ""
                                    : customSplits[id] || ""
                                }
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (splitType === "percentage") {
                                    setCustomPercentages((prev) => ({ ...prev, [id]: val }));
                                  } else {
                                    setCustomSplits((prev) => ({ ...prev, [id]: val }));
                                  }
                                }}
                                className="w-full pl-3 pr-8 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-right"
                              />
                              <span className="absolute right-3 top-1.5 text-[10px] font-bold text-slate-400">
                                {splitType === "percentage" ? "%" : trip.currency}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Receipt URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
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
} from "lucide-react";

interface ExpensesModuleProps {
  trip: Trip;
  accounts: FinanceAccount[];
  onAddExpense: (expense: Expense, accountId: string, amount: number) => void;
  onDeleteExpense: (expenseId: string) => void;
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

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({
  trip,
  accounts,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [whoPaidId, setWhoPaidId] = useState<string>(trip.travellers[0]?.id || "");
  const [whoUsedIds, setWhoUsedIds] = useState<string[]>(trip.travellers.map((t) => t.id));
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
  const [accountUsedId, setAccountUsedId] = useState<string>(accounts[0]?.id || "acc_hdfc");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Filter category tab
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");

  const handleOpenAdd = () => {
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
      const perPerson = total > 0 && whoUsedIds.length > 0 ? total / whoUsedIds.length : 0;
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

    const calculatedSplits = calculateFinalSplits();

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
    setIsAddModalOpen(false);
  };

  // Filtered expenses
  const filteredExpenses =
    selectedCategoryFilter === "All"
      ? trip.expenses
      : trip.expenses.filter((e) => e.category === selectedCategoryFilter);

  const totalExpenseAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Receipt className="w-4 h-4 sm:w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
              Split Expense Engine & Sync
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Log expenses with multi-person equal, % or custom splits. Automatically updates personal member budgets and bank balances.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-sm font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl shadow-md transition-all shrink-0 w-full sm:w-auto justify-center"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          + Record New Expense
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategoryFilter("All")}
          className={`px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-md sm:rounded-lg whitespace-nowrap transition-all ${
            selectedCategoryFilter === "All"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
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
              className={`px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-md sm:rounded-lg whitespace-nowrap transition-all ${
                selectedCategoryFilter === cat
                  ? "bg-emerald-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Expense History Table & Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            SHOWING {filteredExpenses.length} EXPENSES
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
            Total: {trip.currency}
            {totalExpenseAmount.toLocaleString()}
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-10 sm:p-12 text-center text-slate-400 dark:text-slate-500">
            <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-40" />
            <p className="text-xs sm:text-sm font-medium">No expenses recorded for this view.</p>
            <p className="text-[11px] mt-1">Click '+ Record New Expense' to log a split transaction.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredExpenses.map((exp) => {
              const paidByPerson = trip.travellers.find((t) => t.id === exp.whoPaidId);
              const account = accounts.find((a) => a.id === exp.accountUsedId);

              return (
                <div
                  key={exp.id}
                  className="p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {exp.category}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-400">• {exp.date}</span>
                      {account && (
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" /> {account.name}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white">
                      {exp.description}
                    </h4>

                    {/* Paid By & Split Breakdown */}
                    <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Paid by: {paidByPerson?.fullName || "Member"}
                      </span>
                      <span>•</span>
                      <span>
                        Split among {exp.whoUsedIds.length} traveller(s) ({exp.splitType} split)
                      </span>
                    </div>

                    {/* Member Share Badges */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {Object.entries(exp.splits || {}).map(([trvId, share]) => {
                        const trv = trip.travellers.find((t) => t.id === trvId);
                        if (!trv) return null;
                        return (
                          <span
                            key={trvId}
                            className="text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {trv.fullName}: {trip.currency}
                            {share.toLocaleString()}
                          </span>
                        );
                      })}
                    </div>

                    {exp.notes && (
                      <p className="text-[11px] sm:text-xs text-slate-500 italic pt-1">"{exp.notes}"</p>
                    )}
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-100 dark:border-slate-800 gap-1.5 shrink-0">
                    <span className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
                      {trip.currency}
                      {exp.amount.toLocaleString()}
                    </span>

                    <button
                      onClick={() => onDeleteExpense(exp.id)}
                      className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Delete expense entry"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Split Expense Modal (Requirements 5 & 13) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden mt-auto sm:mt-0 max-h-[92vh] sm:max-h-none flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Record & Split Expense
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Description & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dinner at Britto's or Fuel Refill"
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

              {/* Category & Account Used (Syncs with Finance) */}
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
                    Account Used (Deducts Balance)
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

              {/* Who Paid */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paid By (One Traveller)
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

              {/* Who Used (Multi-select) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Split Between (Select Members)
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
                            isSelected ? "bg-emerald-600 text-white" : "border border-slate-400"
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

              {/* Split Type Selection */}
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

              {/* Custom / Percentage Inputs */}
              {splitType === "percentage" && (
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Enter percentage for each member:
                  </p>
                  {whoUsedIds.map((id) => {
                    const member = trip.travellers.find((t) => t.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between text-xs gap-2">
                        <span className="truncate text-slate-800 dark:text-slate-200 font-medium">
                          {member?.fullName}
                        </span>
                        <input
                          type="number"
                          placeholder="%"
                          value={customPercentages[id] || ""}
                          onChange={(e) =>
                            setCustomPercentages({
                              ...customPercentages,
                              [id]: Number(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {splitType === "custom" && (
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Enter custom amount for each member ({trip.currency}):
                  </p>
                  {whoUsedIds.map((id) => {
                    const member = trip.travellers.find((t) => t.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between text-xs gap-2">
                        <span className="truncate text-slate-800 dark:text-slate-200 font-medium">
                          {member?.fullName}
                        </span>
                        <input
                          type="number"
                          placeholder={trip.currency}
                          value={customSplits[id] || ""}
                          onChange={(e) =>
                            setCustomSplits({
                              ...customSplits,
                              [id]: Number(e.target.value),
                            })
                          }
                          className="w-28 px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Receipt & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Receipt URL (Optional)
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
                  placeholder="Additional expense details..."
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
                  Record & Sync Financials
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

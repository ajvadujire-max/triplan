/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Trip, FinanceAccount, CashbookEntry } from "../types";
import { writeBatch, doc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import {
  Wallet,
  Building2,
  Building,
  CreditCard,
  Smartphone,
  Coins,
  TrendingUp,
  Layers,
  Plus,
  MoreVertical,
  Edit2,
  ArrowRightLeft,
  History,
  Copy,
  Archive,
  Trash2,
  X,
  Search,
  Filter,
  AlertTriangle,
  Check,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface FinanceIntegrationProps {
  trip: Trip;
  accounts: FinanceAccount[];
  cashbookEntries: CashbookEntry[];
  onSaveAccount: (account: FinanceAccount) => void;
  onDeleteAccount: (accountId: string) => void;
  onSaveCashbookEntry: (entry: CashbookEntry) => void;
  onDeleteCashbookEntry: (entryId: string) => void;
}

const ACCOUNT_TYPES = [
  "Cash in Hand",
  "Bank Account",
  "Savings Account",
  "Current Account",
  "Credit Card",
  "Debit Card",
  "Wallet",
  "UPI Account",
  "Foreign Currency Account",
  "Investment Account",
  "Other",
];

const PRESET_COLORS = [
  { hex: "#10b981", name: "Emerald" },
  { hex: "#2563eb", name: "Royal Blue" },
  { hex: "#0284c7", name: "Sky" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#8b5cf6", name: "Purple" },
  { hex: "#ef4444", name: "Crimson" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#64748b", name: "Slate" },
];

const PRESET_ICONS = [
  { name: "Wallet", component: Wallet, label: "Cash/Wallet" },
  { name: "Building2", component: Building2, label: "Bank Logo" },
  { name: "Building", component: Building, label: "Savings/Institution" },
  { name: "CreditCard", component: CreditCard, label: "Credit Card" },
  { name: "Smartphone", component: Smartphone, label: "UPI/Phone" },
  { name: "Coins", component: Coins, label: "Coins/Cash" },
  { name: "TrendingUp", component: TrendingUp, label: "Investment" },
  { name: "Layers", component: Layers, label: "Other" },
];

export const FinanceIntegration: React.FC<FinanceIntegrationProps> = ({
  trip,
  accounts,
  cashbookEntries,
  onSaveAccount,
  onDeleteAccount,
  onSaveCashbookEntry,
  onDeleteCashbookEntry,
}) => {
  // State variables
  const [activeMenuAccountId, setActiveMenuAccountId] = useState<string | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [viewingHistoryAccountId, setViewingHistoryAccountId] = useState<string | null>(() => {
    return localStorage.getItem("trippro_viewing_account_id") || null;
  });

  React.useEffect(() => {
    if (viewingHistoryAccountId) {
      localStorage.setItem("trippro_viewing_account_id", viewingHistoryAccountId);
    } else {
      localStorage.removeItem("trippro_viewing_account_id");
    }
  }, [viewingHistoryAccountId]);
  
  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters and search for ledger
  const [historySearch, setHistorySearch] = useState("");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("All");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("All");
  const [historyPage, setHistoryPage] = useState(1);

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: "",
    type: "Savings Account",
    bankName: "",
    nickname: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    upiId: "",
    swiftCode: "",
    balance: "",
    openingBalance: "",
    currency: trip.currency || "₹",
    creditLimit: "",
    minimumBalance: "",
    interestRate: "",
    autoDeductExpenses: true,
    includeInDashboard: true,
    active: true,
    isDefaultPayment: false,
    color: "#2563eb",
    iconName: "Building2",
    notes: "",
  });

  const [transferForm, setTransferForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    category: "Transfer",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [deleteHistoryToo, setDeleteHistoryToo] = useState(false);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Compute stats securely & dynamically (Requirement 8)
  const stats = useMemo(() => {
    let totalCash = 0;
    let totalBankBalance = 0;
    let totalWalletBalance = 0;
    let totalCreditUsed = 0;
    let totalAssets = 0;

    accounts.forEach((acc) => {
      if (!acc.active && acc.active !== undefined) return; // ignore archived in stats

      const typeLower = acc.type.toLowerCase();
      const bal = Number(acc.balance) || 0;

      if (typeLower === "cash" || typeLower === "cash in hand" || typeLower === "coins") {
        totalCash += bal;
        totalAssets += bal;
      } else if (
        typeLower === "bank" ||
        typeLower === "bank account" ||
        typeLower === "savings account" ||
        typeLower === "current account" ||
        typeLower === "debit card"
      ) {
        totalBankBalance += bal;
        totalAssets += bal;
      } else if (typeLower === "wallet" || typeLower === "upi account" || typeLower === "smartphone") {
        totalWalletBalance += bal;
        totalAssets += bal;
      } else if (typeLower === "credit card" || typeLower === "credit_card") {
        // Credit card balance usually represents outstanding debt. If negative or positive, compute properly.
        // Let's assume positive balance is outstanding debt, or negative balance is outstanding.
        // Let's treat a positive credit balance as "outstanding credit used"
        totalCreditUsed += Math.max(0, bal);
      } else {
        // Other/Investment
        totalAssets += bal;
      }
    });

    return {
      totalCash,
      totalBankBalance,
      totalWalletBalance,
      totalCreditUsed,
      totalAssets: totalAssets - totalCreditUsed,
    };
  }, [accounts]);

  // Open modal for new account
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      name: "",
      type: "Savings Account",
      bankName: "",
      accountHolderName: "",
      balance: "",
      openingBalance: "",
      currency: trip.currency || "₹",
      creditLimit: "",
      minimumBalance: "",
      interestRate: "",
      autoDeductExpenses: true,
      includeInDashboard: true,
      active: true,
      isDefaultPayment: false,
      color: "#2563eb",
      iconName: "Building2",
      notes: "",
    });
    setFormErrors({});
    setIsAccountModalOpen(true);
  };

  // Open modal for editing account
  const handleOpenEditAccount = (acc: FinanceAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      name: acc.name,
      type: acc.type,
      bankName: acc.bankName || "",
      accountHolderName: acc.accountHolderName || "",
      balance: acc.balance.toString(),
      openingBalance: (acc.openingBalance !== undefined ? acc.openingBalance : acc.balance).toString(),
      currency: acc.currency || trip.currency || "₹",
      creditLimit: (acc.creditLimit || "").toString(),
      minimumBalance: (acc.minimumBalance || "").toString(),
      interestRate: (acc.interestRate || "").toString(),
      autoDeductExpenses: acc.autoDeductExpenses ?? true,
      includeInDashboard: acc.includeInDashboard ?? true,
      active: acc.active ?? true,
      isDefaultPayment: acc.isDefaultPayment ?? false,
      color: acc.color,
      iconName: acc.iconName,
      notes: acc.notes || "",
    });
    setFormErrors({});
    setIsAccountModalOpen(true);
    setActiveMenuAccountId(null);
  };

  // Duplicate an account (Requirement 1)
  const handleDuplicateAccount = (acc: FinanceAccount) => {
    const duplicated: FinanceAccount = {
      ...acc,
      id: `acc_${Date.now()}`,
      name: `${acc.name} (Copy)`,
      isDefaultPayment: false, // do not duplicate default status
    };
    onSaveAccount(duplicated);
    showToast(`Duplicated ${acc.name} successfully`);
    setActiveMenuAccountId(null);
  };

  // Archive / Toggle Active status (Requirement 1)
  const handleToggleArchiveAccount = (acc: FinanceAccount) => {
    const updated: FinanceAccount = {
      ...acc,
      active: !acc.active,
    };
    onSaveAccount(updated);
    showToast(`${acc.name} has been ${updated.active ? "restored" : "archived"}`);
    setActiveMenuAccountId(null);
  };

  // Validate account form
  const validateAccountForm = () => {
    const errors: Record<string, string> = {};

    if (!accountForm.name.trim()) errors.name = "Account Name is required";
    if (!accountForm.type) errors.type = "Account Type is required";
    if (accountForm.balance === "") errors.balance = "Current Balance is required";

    // Negative balance check unless credit card
    const balNum = Number(accountForm.balance) || 0;
    const isCreditCard = accountForm.type === "Credit Card";
    if (balNum < 0 && !isCreditCard) {
      errors.balance = "Negative balance is not allowed for non-Credit-Card accounts";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Account (Create or Update)
  const handleSaveAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAccountForm()) return;

    // If default is checked, remove default payment from other accounts
    if (accountForm.isDefaultPayment) {
      accounts.forEach((acc) => {
        if (acc.id !== editingAccount?.id && acc.isDefaultPayment) {
          onSaveAccount({ ...acc, isDefaultPayment: false });
        }
      });
    }

    const currentBalance = Number(accountForm.balance) || 0;
    const openingBalance = accountForm.openingBalance !== "" ? Number(accountForm.openingBalance) : currentBalance;

    const accountData: FinanceAccount = {
      id: editingAccount?.id || `acc_${Date.now()}`,
      name: accountForm.name.trim(),
      type: accountForm.type,
      balance: currentBalance,
      openingBalance,
      currentBalance,
      bankName: accountForm.bankName.trim() || undefined,
      accountHolderName: accountForm.accountHolderName.trim() || undefined,
      currency: accountForm.currency,
      creditLimit: accountForm.creditLimit ? Number(accountForm.creditLimit) : undefined,
      minimumBalance: accountForm.minimumBalance ? Number(accountForm.minimumBalance) : undefined,
      interestRate: accountForm.interestRate ? Number(accountForm.interestRate) : undefined,
      autoDeductExpenses: accountForm.autoDeductExpenses,
      includeInDashboard: accountForm.includeInDashboard,
      active: accountForm.active,
      isDefaultPayment: accountForm.isDefaultPayment,
      color: accountForm.color,
      iconName: accountForm.iconName,
      notes: accountForm.notes.trim() || undefined,
    };

    onSaveAccount(accountData);
    setIsAccountModalOpen(false);
    showToast(editingAccount ? "Account updated successfully" : "Account added successfully");
  };

  // Confirm and Execute delete (Requirement 10)
  const handleDeleteAccountSubmit = () => {
    if (!deleteConfirmationId) return;

    // Delete cashbook entries if explicitly confirmed
    if (deleteHistoryToo) {
      const entriesToDelete = cashbookEntries.filter((e) => e.accountId === deleteConfirmationId);
      entriesToDelete.forEach((entry) => {
        onDeleteCashbookEntry(entry.id);
      });
      showToast(`Deleted account and its ${entriesToDelete.length} transactions`);
    } else {
      showToast("Account deleted. Transactions retained as requested.");
    }

    onDeleteAccount(deleteConfirmationId);
    setDeleteConfirmationId(null);
    setViewingHistoryAccountId(null);
    setActiveMenuAccountId(null);
  };

  // Open Transfer Modal
  const handleOpenTransfer = (defaultFromId?: string) => {
    const firstToId = accounts.find((a) => a.id !== defaultFromId && (a.active ?? true))?.id || "";
    setTransferForm({
      fromAccountId: defaultFromId || accounts.find((a) => a.active ?? true)?.id || "",
      toAccountId: firstToId,
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      category: "Transfer",
    });
    setFormErrors({});
    setIsTransferModalOpen(true);
    setActiveMenuAccountId(null);
  };

  // Submit Transfer (Requirement 5)
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!transferForm.fromAccountId) errors.fromAccountId = "Source account is required";
    if (!transferForm.toAccountId) errors.toAccountId = "Destination account is required";
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      errors.toAccountId = "Destination must be different from source";
    }

    const transferAmount = Number(transferForm.amount) || 0;
    if (transferAmount <= 0) {
      errors.amount = "Transfer amount must be greater than zero";
    }

    const fromAcc = accounts.find((a) => a.id === transferForm.fromAccountId);
    const toAcc = accounts.find((a) => a.id === transferForm.toAccountId);

    if (fromAcc && fromAcc.type !== "Credit Card" && fromAcc.balance < transferAmount) {
      errors.amount = `Insufficient balance in ${fromAcc.name} (Available: ${trip.currency}${fromAcc.balance.toLocaleString()})`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!fromAcc || !toAcc) return;

    // 1. Deduct from FromAccount
    onSaveAccount({
      ...fromAcc,
      balance: fromAcc.balance - transferAmount,
    });

    // 2. Add to ToAccount
    onSaveAccount({
      ...toAcc,
      balance: toAcc.balance + transferAmount,
    });

    // 3. Save debit cashbook entry (Requirement 5)
    const debitEntry: CashbookEntry = {
      id: `cb_transfer_db_${Date.now()}`,
      tripId: trip.id,
      date: transferForm.date,
      description: `[Transfer] To ${toAcc.name}: ${transferForm.notes || "Funds Transfer"}`,
      category: transferForm.category,
      type: "debit",
      amount: transferAmount,
      accountId: fromAcc.id,
      auditTrail: `Transferred ${trip.currency}${transferAmount.toLocaleString()} to ${toAcc.name} via TripPro.`,
    };
    onSaveCashbookEntry(debitEntry);

    // 4. Save credit cashbook entry
    const creditEntry: CashbookEntry = {
      id: `cb_transfer_cr_${Date.now() + 1}`,
      tripId: trip.id,
      date: transferForm.date,
      description: `[Transfer] From ${fromAcc.name}: ${transferForm.notes || "Funds Transfer"}`,
      category: transferForm.category,
      type: "credit",
      amount: transferAmount,
      accountId: toAcc.id,
      auditTrail: `Received ${trip.currency}${transferAmount.toLocaleString()} from ${fromAcc.name} via TripPro.`,
    };
    onSaveCashbookEntry(creditEntry);

    setIsTransferModalOpen(false);
    showToast(`Transferred ${trip.currency}${transferAmount.toLocaleString()} successfully`);
  };

  // Get chronological running balance for history ledger (Requirement 6, 12)
  const ledgerData = useMemo(() => {
    if (!viewingHistoryAccountId) return [];
    const acc = accounts.find((a) => a.id === viewingHistoryAccountId);
    if (!acc) return [];

    // Filter cashbook entries for this account
    const filtered = cashbookEntries.filter((e) => e.accountId === viewingHistoryAccountId);

    // Chronological order sorting to compute running balance correctly
    const sortedAsc = [...filtered].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningBalance = acc.openingBalance ?? 0;
    const withRunningBalance = sortedAsc.map((entry) => {
      if (entry.type === "credit") {
        runningBalance += entry.amount;
      } else {
        runningBalance -= entry.amount;
      }
      return {
        ...entry,
        runningBalance,
      };
    });

    // Reverse to show newest transactions first
    const newestFirst = withRunningBalance.reverse();

    // Apply search and filters
    return newestFirst.filter((entry) => {
      const matchesSearch =
        entry.description.toLowerCase().includes(historySearch.toLowerCase()) ||
        (entry.notes && entry.notes.toLowerCase().includes(historySearch.toLowerCase())) ||
        entry.category.toLowerCase().includes(historySearch.toLowerCase());

      const matchesCategory =
        historyCategoryFilter === "All" || entry.category === historyCategoryFilter;

      const matchesType =
        historyTypeFilter === "All" || entry.type === historyTypeFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [viewingHistoryAccountId, cashbookEntries, accounts, historySearch, historyCategoryFilter, historyTypeFilter]);

  // Lazy loading / Pagination (Requirement 12)
  const PAGE_SIZE = 8;
  const paginatedLedger = useMemo(() => {
    return ledgerData.slice(0, historyPage * PAGE_SIZE);
  }, [ledgerData, historyPage]);

  const hasMoreLedger = ledgerData.length > paginatedLedger.length;

  const handleLoadMoreLedger = () => {
    setHistoryPage((prev) => prev + 1);
  };

  // Export specific account CSV (Requirement 6)
  const handleExportAccountCSV = (acc: FinanceAccount) => {
    const dataToExport = ledgerData;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Description,Category,Type,Amount,Running Balance,Audit Trail\n";

    dataToExport.forEach((entry) => {
      csvContent += `"${entry.date}","${entry.description}","${entry.category}","${entry.type}",${entry.amount},${entry.runningBalance},"${entry.auditTrail || ""}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${acc.name}_Ledger_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${acc.name} history to CSV`);
  };

  // Export generic CSV/PDF print
  const handlePrintPDF = () => {
    window.print();
  };

  // Unique categories for filtering
  const uniqueCategories = useMemo(() => {
    if (!viewingHistoryAccountId) return [];
    const filtered = cashbookEntries.filter((e) => e.accountId === viewingHistoryAccountId);
    return Array.from(new Set(filtered.map((e) => e.category)));
  }, [viewingHistoryAccountId, cashbookEntries]);

  const handleResetCashbook = async () => {
    setIsResetting(true);
    try {
      if (auth.currentUser) {
        const batch = writeBatch(db);

        // 1. Delete all cashbook entries in firestore
        cashbookEntries.forEach((entry) => {
          const entryRef = doc(db, "cashbook", entry.id);
          batch.delete(entryRef);
        });

        // 2. Reset account balances to opening balances in firestore
        accounts.forEach((acc) => {
          const accRef = doc(db, "accounts", acc.id);
          const initialBal = acc.openingBalance !== undefined ? acc.openingBalance : acc.balance;
          batch.update(accRef, {
            balance: initialBal,
            currentBalance: initialBal,
          });
        });

        await batch.commit();
      }

      // 3. Keep local states and localStorage updated in the parent
      cashbookEntries.forEach((entry) => {
        onDeleteCashbookEntry(entry.id);
      });

      accounts.forEach((acc) => {
        const initialBal = acc.openingBalance !== undefined ? acc.openingBalance : acc.balance;
        onSaveAccount({
          ...acc,
          balance: initialBal,
          currentBalance: initialBal,
        });
      });

      showToast("Cashbook has been reset successfully and balances restored to opening balances.");
    } catch (error) {
      console.error("Error resetting cashbook:", error);
      showToast("Failed to reset cashbook: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsResetting(false);
      setIsResetConfirmOpen(false);
    }
  };

  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [manualEntryForm, setManualEntryForm] = useState({
    description: "",
    amount: "",
    type: "debit" as "debit" | "credit",
    category: "Other",
    accountId: accounts.find(a => a.active ?? true)?.id || "",
    date: new Date().toISOString().split("T")[0]
  });

  const handleManualEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntryForm.description || !manualEntryForm.amount || !manualEntryForm.accountId) {
      showToast("Please fill all required fields");
      return;
    }

    const amt = Number(manualEntryForm.amount);
    const acc = accounts.find(a => a.id === manualEntryForm.accountId);
    if (!acc) return;

    const newEntry: CashbookEntry = {
      id: `cb_man_${Date.now()}`,
      tripId: trip.id,
      date: manualEntryForm.date,
      description: manualEntryForm.description,
      category: manualEntryForm.category,
      type: manualEntryForm.type,
      amount: amt,
      accountId: manualEntryForm.accountId,
      auditTrail: `Manual ${manualEntryForm.type} entry via TripPro.`
    };

    onSaveCashbookEntry(newEntry);
    
    // Update account balance
    onSaveAccount({
      ...acc,
      balance: manualEntryForm.type === "credit" ? acc.balance + amt : acc.balance - amt
    });

    setIsManualEntryModalOpen(false);
    showToast("Transaction recorded successfully");
  };

  // Help render account icon beautifully
  const getAccountIconComponent = (iconName: string) => {
    const preset = PRESET_ICONS.find((i) => i.name === iconName);
    return preset ? preset.component : Building2;
  };

  // Group accounts into active and archived
  const groupedAccounts = useMemo(() => {
    return {
      active: accounts.filter((a) => a.active ?? true),
      archived: accounts.filter((a) => !(a.active ?? true)),
    };
  }, [accounts]);

  const activeHistoryAccount = accounts.find((a) => a.id === viewingHistoryAccountId);

  return (
    <div className="space-y-6 print:p-0 select-none pb-12">
      {/* Dynamic Floating Action Button for Mobile, standard button for Desktop (Requirement 2, 9) */}
      <div className="fixed bottom-20 right-4 sm:hidden z-40">
        <button
          onClick={handleOpenAddAccount}
          className="flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-all focus:outline-none focus:ring-4 focus:ring-indigo-300"
          id="btn-add-account-mob-fab"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* Header and top tools */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Financial Account Registry
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your liquid assets, bank ledgers, credit pipelines, and execute instant money transfers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold px-4 py-2.5 rounded-xl border border-rose-100 dark:border-rose-900 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Reset Cashbook
          </button>

          <button
            onClick={() => {
              setManualEntryForm({
                description: "",
                amount: "",
                type: "debit",
                category: "Other",
                accountId: accounts.find(a => a.active ?? true)?.id || "",
                date: new Date().toISOString().split("T")[0]
              });
              setIsManualEntryModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>

          <button
            onClick={handleOpenAddAccount}
            className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all"
            id="btn-add-account-desk"
          >
            <Plus className="w-4 h-4" /> Add New Account
          </button>
          
          <button
            onClick={() => handleOpenTransfer()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            id="btn-transfer-funds"
          >
            <ArrowRightLeft className="w-4 h-4" /> Transfer Funds
          </button>
        </div>
      </div>



      {viewingHistoryAccountId ? (
        // DEDICATED ACCOUNT DETAILS PAGE
        !activeHistoryAccount ? (
          <div className="space-y-6 max-w-4xl mx-auto py-6">
            <button
              onClick={() => setViewingHistoryAccountId(null)}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
            >
              ← Back to Financial Accounts
            </button>
            <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Account not found</h3>
              <p className="text-xs text-slate-500">The requested financial account could not be found or has been deleted.</p>
              <button
                onClick={() => setViewingHistoryAccountId(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
              >
                Back to Financial Accounts
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-5xl mx-auto py-2">
            {/* Back navigation & header actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setViewingHistoryAccountId(null)}
                className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer min-h-[44px]"
              >
                ← Financial Accounts
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportAccountCSV(activeHistoryAccount)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => handlePrintPDF()}
                  className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-500" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => handleOpenEditAccount(activeHistoryAccount)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Account</span>
                </button>
              </div>
            </div>

            {/* Account Summary Banner */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                  style={{ backgroundColor: activeHistoryAccount.color }}
                >
                  {React.createElement(getAccountIconComponent(activeHistoryAccount.iconName), {
                    className: "w-7 h-7",
                  })}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {activeHistoryAccount.name}
                    </h2>
                    {activeHistoryAccount.isDefaultPayment && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                        Default Account
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                    {activeHistoryAccount.type} {activeHistoryAccount.accountNumber ? `• Account #${activeHistoryAccount.accountNumber}` : ""}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${activeHistoryAccount.autoDeductExpenses ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                      {activeHistoryAccount.autoDeductExpenses ? "Auto-Deduct Active" : "No Auto-Deduct"}
                    </span>
                    <span>•</span>
                    <span>{activeHistoryAccount.branch ? `Branch: ${activeHistoryAccount.branch}` : "Internal Ledger"}</span>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {activeHistoryAccount.currency || trip.currency}
                  {activeHistoryAccount.balance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Transaction History & Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Transaction History ({ledgerData.length})
                </h3>
                <button
                  onClick={() => handleOpenTransfer(activeHistoryAccount.id)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  + Transfer Money
                </button>
              </div>

              {/* Filters */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search transaction description..."
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={historyCategoryFilter}
                    onChange={(e) => {
                      setHistoryCategoryFilter(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={historyTypeFilter}
                    onChange={(e) => {
                      setHistoryTypeFilter(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="All">All Types</option>
                    <option value="Debit">Debits</option>
                    <option value="Credit">Credits</option>
                  </select>
                </div>
              </div>

              {/* Ledger Entries */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[500px] overflow-y-auto">
                {paginatedLedger.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                    No ledger transactions matching filters.
                  </div>
                ) : (
                  paginatedLedger.map((entry, idx) => {
                    const isDebit = entry.type === "debit";
                    return (
                      <div
                        key={entry.id ? `${entry.id}_${idx}` : `entry_${idx}`}
                        className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 flex items-start justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isDebit
                                ? "bg-rose-50 text-rose-500 dark:bg-rose-950/20"
                                : "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20"
                            }`}
                          >
                            {isDebit ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {entry.description}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 mt-0.5">
                              <span>{entry.date}</span>
                              <span>•</span>
                              <span className="bg-slate-100 dark:bg-slate-800 text-[9px] px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 uppercase">
                                {entry.category}
                              </span>
                            </div>
                            {entry.auditTrail && (
                              <p className="text-[9px] text-slate-400/80 font-mono mt-1 italic leading-tight truncate max-w-xs sm:max-w-md">
                                {entry.auditTrail}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-xs font-extrabold ${
                              isDebit ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {isDebit ? "-" : "+"}
                            {activeHistoryAccount.currency || trip.currency}
                            {entry.amount.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            Bal: {activeHistoryAccount.currency || trip.currency}
                            {(entry.runningBalance ?? entry.amount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {hasMoreLedger && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/20">
                  <button
                    onClick={handleLoadMoreLedger}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer"
                  >
                    Load Older Transactions
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        // FINANCIAL ACCOUNT REGISTRY VIEW (Compact, no expanded ledger underneath)
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Portfolios ({groupedAccounts.active.length})
            </h3>
            {groupedAccounts.archived.length > 0 && (
              <span className="text-[10px] font-semibold text-slate-400">
                {groupedAccounts.archived.length} archived
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedAccounts.active.length === 0 ? (
              <div className="col-span-full text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Financial accounts not configured</p>
                <button
                  onClick={handleOpenAddAccount}
                  className="mt-2 text-[#1AAB67] dark:text-[#34D399] text-xs font-bold cursor-pointer hover:underline"
                >
                  Set Up Accounts
                </button>
              </div>
            ) : (
              groupedAccounts.active.map((acc, idx) => {
                const IconComponent = getAccountIconComponent(acc.iconName);
                return (
                  <div
                    key={acc.id ? `${acc.id}_${idx}` : `acc_${idx}`}
                    onClick={() => {
                      setViewingHistoryAccountId(acc.id);
                      setHistoryPage(1);
                    }}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-36 relative group"
                  >
                    {/* Card Top Block */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
                          style={{ backgroundColor: acc.color }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="max-w-[150px] sm:max-w-[180px]">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                            {acc.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                            {acc.type} {acc.accountNumber ? `• ${acc.accountNumber.slice(-4)}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Three dot menu trigger */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuAccountId(activeMenuAccountId === acc.id ? null : acc.id);
                          }}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuAccountId === acc.id && (
                          <div
                            className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleOpenEditAccount(acc)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-500" /> Edit Details
                            </button>
                            <button
                              onClick={() => handleOpenTransfer(acc.id)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500" /> Transfer Money
                            </button>
                            <button
                              onClick={() => {
                                setViewingHistoryAccountId(acc.id);
                                setHistoryPage(1);
                                setActiveMenuAccountId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5 text-blue-500" /> View History
                            </button>
                            <button
                              onClick={() => handleDuplicateAccount(acc)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-amber-500" /> Duplicate Account
                            </button>
                            <button
                              onClick={() => handleToggleArchiveAccount(acc)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5 text-slate-500" /> Archive Account
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
                            <button
                              onClick={() => {
                                setDeleteConfirmationId(acc.id);
                                setDeleteHistoryToo(false);
                                setActiveMenuAccountId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-rose-50 dark:hover:bg-rose-950/25 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Account
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Balance Block */}
                    <div className="flex items-baseline justify-between mt-1">
                      <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {acc.currency || trip.currency}
                        {acc.balance.toLocaleString()}
                      </p>
                      
                      {acc.isDefaultPayment && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                          Default
                        </span>
                      )}
                    </div>

                    {/* Card Footer Block */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-50 dark:border-slate-800/50 pt-2">
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            acc.autoDeductExpenses ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                          }`}
                        />
                        <span>{acc.autoDeductExpenses ? "Auto-Deduct Active" : "No Auto-Deduct"}</span>
                      </div>
                      <span className="text-[9px] font-medium text-slate-400">
                        {acc.branch ? `Branch: ${acc.branch}` : "Internal Ledger"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Archived accounts expandable */}
          {groupedAccounts.archived.length > 0 && (
            <div className="space-y-2 pt-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Archived Portfolios ({groupedAccounts.archived.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40 dark:bg-slate-900/40 rounded-xl overflow-hidden">
                {groupedAccounts.archived.map((acc, idx) => (
                  <div
                    key={acc.id ? `${acc.id}_arch_${idx}` : `arch_${idx}`}
                    className="p-3 flex items-center justify-between text-xs opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                      {acc.name} ({acc.type})
                    </span>
                    <button
                      onClick={() => handleToggleArchiveAccount(acc)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black hover:underline cursor-pointer"
                    >
                      Restore Account
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account Creation & Editing Bottom Sheet / Modal (Requirement 3, 4, 9) */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  {editingAccount ? "Edit Account Registry" : "Register Financial Account"}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Declare parameters for database sync & expense tracking algorithms.
                </p>
              </div>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAccountSubmit} className="p-4 sm:p-5 space-y-4 flex-1">
              {/* Category section: Basic Info */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  1. Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Account Name *
                    </label>
                    <input
                      type="text"
                      value={accountForm.name}
                      onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                      placeholder="e.g. HDFC Business Account"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 py-3 sm:py-2 text-base sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    {formErrors.name && <p className="text-[10px] text-rose-500 font-bold mt-0.5">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Account Type *
                    </label>
                    <select
                      value={accountForm.type}
                      onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 py-3 sm:py-2 text-base sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {ACCOUNT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={accountForm.bankName}
                      onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 py-3 sm:py-2 text-base sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Holder Name
                    </label>
                    <input
                      type="text"
                      value={accountForm.accountHolderName}
                      onChange={(e) => setAccountForm({ ...accountForm, accountHolderName: e.target.value })}
                      placeholder="e.g. Ajva"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 py-3 sm:py-2 text-base sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Category section: Financial Info */}
              <div className="space-y-3 pt-1">
                <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  2. Financial Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Opening Balance
                    </label>
                    <input
                      type="number"
                      value={accountForm.openingBalance}
                      onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value })}
                      placeholder="e.g. 50000"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 py-3 sm:py-2 text-base sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Current Balance *
                    </label>
                    <input
                      type="number"
                      value={accountForm.balance}
                      onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
                      placeholder="e.g. 45000"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 py-3 sm:py-2 text-base sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    {formErrors.balance && (
                      <p className="text-[10px] text-rose-500 font-bold mt-0.5">{formErrors.balance}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={accountForm.currency}
                      onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                      placeholder="₹"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={accountForm.interestRate}
                      onChange={(e) => setAccountForm({ ...accountForm, interestRate: e.target.value })}
                      placeholder="e.g. 4.0"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Credit Limit (Credit Card)
                    </label>
                    <input
                      type="number"
                      value={accountForm.creditLimit}
                      onChange={(e) => setAccountForm({ ...accountForm, creditLimit: e.target.value })}
                      placeholder="e.g. 100000"
                      disabled={accountForm.type !== "Credit Card" && accountForm.type !== "credit_card"}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Minimum Balance Requirement
                    </label>
                    <input
                      type="number"
                      value={accountForm.minimumBalance}
                      onChange={(e) => setAccountForm({ ...accountForm, minimumBalance: e.target.value })}
                      placeholder="e.g. 10000"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 py-3 sm:py-2 text-base sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Customization: Presets & Icons */}
              <div className="space-y-3 pt-1">
                <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  3. Customization & Note
                </h4>

                {/* Color choices */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5">
                    Account Color Accent
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setAccountForm({ ...accountForm, color: col.hex })}
                        className={`w-6 h-6 rounded-lg transition-transform ${
                          accountForm.color === col.hex ? "scale-115 ring-2 ring-indigo-500/50" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={accountForm.color}
                      onChange={(e) => setAccountForm({ ...accountForm, color: e.target.value })}
                      className="w-6 h-6 rounded border border-slate-200 p-0 cursor-pointer overflow-hidden"
                    />
                  </div>
                </div>

                {/* Icon choices */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1.5">
                    Account Icon
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_ICONS.map((ico) => {
                      const IconNode = ico.component;
                      const isSelected = accountForm.iconName === ico.name;
                      return (
                        <button
                          key={ico.name}
                          type="button"
                          onClick={() => setAccountForm({ ...accountForm, iconName: ico.name })}
                          className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/40 text-indigo-600 dark:bg-indigo-950/20"
                              : "border-slate-100 dark:border-slate-800 hover:border-slate-200 text-slate-500"
                          }`}
                        >
                          <IconNode className="w-4 h-4" />
                          <span className="text-[8px] font-bold text-slate-400 truncate w-full">{ico.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* General notes */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                    Notes / Cashbook Ledger Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={accountForm.notes}
                    onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
                    placeholder="Provide any additional account descriptions or transaction notes..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Category section: Settings */}
              <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  4. Settings
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                    <input
                      type="checkbox"
                      checked={accountForm.autoDeductExpenses}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, autoDeductExpenses: e.target.checked })
                      }
                      className="w-3.5 h-3.5 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500"
                    />
                    <div className="text-[10px]">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Auto Deduct Expenses</p>
                      <p className="text-[8px] text-slate-400 leading-none mt-0.5">Charge this account directly on travel logs</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                    <input
                      type="checkbox"
                      checked={accountForm.includeInDashboard}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, includeInDashboard: e.target.checked })
                      }
                      className="w-3.5 h-3.5 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500"
                    />
                    <div className="text-[10px]">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Include in Dashboard</p>
                      <p className="text-[8px] text-slate-400 leading-none mt-0.5">Factor into aggregate summaries</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                    <input
                      type="checkbox"
                      checked={accountForm.isDefaultPayment}
                      onChange={(e) => setAccountForm({ ...accountForm, isDefaultPayment: e.target.checked })}
                      className="w-3.5 h-3.5 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500"
                    />
                    <div className="text-[10px]">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Default Account</p>
                      <p className="text-[8px] text-slate-400 leading-none mt-0.5">Use as primary default payment</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                    <input
                      type="checkbox"
                      checked={accountForm.active}
                      onChange={(e) => setAccountForm({ ...accountForm, active: e.target.checked })}
                      className="w-3.5 h-3.5 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500"
                    />
                    <div className="text-[10px]">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Active Account</p>
                      <p className="text-[8px] text-slate-400 leading-none mt-0.5">Enable operations and transfers</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-black shadow-md"
                  id="btn-account-form-submit"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Funds Modal (Requirement 5, 9) */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  Transfer Money
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Execute immediate balance shifts between active registered accounts.
                </p>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleTransferSubmit} className="p-4 sm:p-5 space-y-4">
              {/* From Account */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                  From Account (Debit Source)
                </label>
                <select
                  value={transferForm.fromAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">Select source account...</option>
                  {accounts
                    .filter((a) => a.active ?? true)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({trip.currency || a.currency}
                        {a.balance.toLocaleString()})
                      </option>
                    ))}
                </select>
                {formErrors.fromAccountId && (
                  <p className="text-[10px] text-rose-500 font-bold mt-0.5">{formErrors.fromAccountId}</p>
                )}
              </div>

              {/* To Account */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                  To Account (Credit Destination)
                </label>
                <select
                  value={transferForm.toAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">Select destination account...</option>
                  {accounts
                    .filter((a) => a.active ?? true)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({trip.currency || a.currency}
                        {a.balance.toLocaleString()})
                      </option>
                    ))}
                </select>
                {formErrors.toAccountId && (
                  <p className="text-[10px] text-rose-500 font-bold mt-0.5">{formErrors.toAccountId}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Transfer Amount */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                    Transfer Amount
                  </label>
                  <input
                    type="number"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  {formErrors.amount && (
                    <p className="text-[10px] text-rose-500 font-bold mt-0.5">{formErrors.amount}</p>
                  )}
                </div>

                {/* Transfer Date */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                    Transfer Date
                  </label>
                  <input
                    type="date"
                    value={transferForm.date}
                    onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Note / Remarks */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                  Transfer Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  placeholder="e.g. UPI balance backup, credit card payment, etc."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-black shadow-md"
                  id="btn-transfer-form-submit"
                >
                  Transfer Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Dialog (Requirement 10) */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Delete Account?
              </h3>
              <p className="text-xs text-slate-500 leading-normal">
                This action is irreversible. Please choose whether to also scrub all transaction records associated with this account.
              </p>

              {/* Keep or delete history checkbox */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg text-left mt-2 border border-slate-100 dark:border-slate-800/50">
                <input
                  type="checkbox"
                  checked={deleteHistoryToo}
                  onChange={(e) => setDeleteHistoryToo(e.target.checked)}
                  className="w-4 h-4 text-rose-600 border-slate-200 rounded focus:ring-rose-500 focus:outline-none"
                />
                <div className="text-[10px]">
                  <p className="font-extrabold text-slate-700 dark:text-slate-300">Scrub Transaction History Too</p>
                  <p className="text-slate-400 font-medium leading-none mt-0.5">Deletes all ledger history linked to this account</p>
                </div>
              </label>
            </div>

            <div className="flex bg-slate-50 dark:bg-slate-800/40 p-3 border-t border-slate-100 dark:border-slate-800/50 gap-3">
              <button
                onClick={() => setDeleteConfirmationId(null)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-black py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccountSubmit}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black py-2 rounded-xl shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isManualEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Add Manual Transaction</h3>
              <button onClick={() => setIsManualEntryModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleManualEntrySubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={manualEntryForm.description}
                  onChange={e => setManualEntryForm({ ...manualEntryForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"
                  placeholder="e.g. ATM Withdrawal, Personal Spending"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Amount</label>
                  <input
                    type="number"
                    required
                    value={manualEntryForm.amount}
                    onChange={e => setManualEntryForm({ ...manualEntryForm, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Type</label>
                  <select
                    value={manualEntryForm.type}
                    onChange={e => setManualEntryForm({ ...manualEntryForm, type: e.target.value as "debit" | "credit" })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="debit">Debit (Spend)</option>
                    <option value="credit">Credit (Receive)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Account</label>
                <select
                  value={manualEntryForm.accountId}
                  onChange={e => setManualEntryForm({ ...manualEntryForm, accountId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"
                >
                  {accounts.filter(a => a.active ?? true).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({trip.currency}{a.balance})</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black shadow-md mt-2"
              >
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Reset Cashbook?
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Are you sure you want to scrub <strong>ALL transaction history</strong>?
              </p>
              <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc list-inside space-y-1 bg-slate-50 dark:bg-slate-800/55 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <li>Clears {cashbookEntries.length} transaction entries from ledger history</li>
                <li>Restores all {accounts.length} active account balances back to their original opening balances</li>
                <li><strong>Safe:</strong> Does not touch trips, diary entries, or other modular travel data</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetCashbook}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Yes, Reset Cashbook"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-950/95 text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-xl border border-slate-800 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

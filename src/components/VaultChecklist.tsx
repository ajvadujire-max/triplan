/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAppNavigation } from "../hooks/useAppNavigation";
import { Trip, DocumentItem, ChecklistItem } from "../types";
import { fetchChecklistItems, saveChecklistItem, deleteChecklistItem } from "../lib/firestoreSync";
import { getRichDefaultChecklist } from "../utils/checklistDefaults";
import { AddItemModal } from "./AddItemModal";
import {
  Folder,
  CheckSquare,
  Plus,
  FileText,
  Shield,
  Eye,
  Trash2,
  Check,
  Upload,
  X,
  CreditCard,
  Smartphone,
  Briefcase,
  MoreVertical,
  Edit2,
  Copy,
  Download,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Search,
  Filter,
  CheckSquare2,
  SlidersHorizontal,
  ChevronUp,
  File,
  Lock,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  FolderPlus,
  ArrowUpDown,
  Move,
  Grid
} from "lucide-react";

interface VaultChecklistProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  currentUser: FirebaseUser | null;
}

export const VaultChecklist: React.FC<VaultChecklistProps> = ({
  trip,
  onUpdateTrip,
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"vault" | "checklist">("vault");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);

  useEffect(() => {
    if (trip?.id && currentUser?.uid) {
      setIsLoadingChecklist(true);
      fetchChecklistItems(trip.id, currentUser.uid)
        .then((items) => {
          if (items.length === 0) {
            // If empty, initialize with defaults
            const defaults = getRichDefaultChecklist(trip.id).map(item => ({...item, ownerUid: currentUser.uid}));
            Promise.all(defaults.map(item => saveChecklistItem(item))).then(() => {
                setChecklistItems(defaults);
            });
          } else {
            // Deduplicate items based on title and category
            const uniqueItems = items.reduce((acc, current) => {
              const x = acc.find(item => item.title === current.title && item.category === current.category);
              if (!x) {
                return acc.concat([current]);
              } else {
                return acc;
              }
            }, [] as ChecklistItem[]);
            setChecklistItems(uniqueItems);
          }
        })
        .finally(() => setIsLoadingChecklist(false));
    }
  }, [trip.id, currentUser?.uid]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "packed" | "unpacked">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Navigation & Route states
  const { basePath, relativePath, navigate, goBack } = useAppNavigation();
  const pathSegments = useMemo(() => relativePath.split("/").filter(Boolean), [relativePath]);

  // Route paths:
  // /vault -> ["vault"]
  // /vault/add-doc -> ["vault", "add-doc"]
  // /vault/add-item -> ["vault", "add-item"]
  // /vault/doc/:id -> ["vault", "doc", ":id"]
  // /vault/doc/:id/edit -> ["vault", "doc", ":id", "edit"]

  const selectedDocId = useMemo(() => {
    if (pathSegments[1] === "doc" && pathSegments[2]) {
      return pathSegments[2];
    }
    return null;
  }, [pathSegments]);

  const previewDocUrl = useMemo(() => {
    if (selectedDocId && pathSegments[3] !== "edit") {
      const doc = trip.documents.find((d) => d.id === selectedDocId);
      return doc?.fileUrl || null;
    }
    return null;
  }, [selectedDocId, pathSegments, trip.documents]);

  const isDocModalOpen = useMemo(() => {
    return pathSegments[1] === "add-doc" || (!!selectedDocId && pathSegments[3] === "edit");
  }, [pathSegments, selectedDocId]);

  const docModalMode = useMemo<"add" | "edit">( () => {
    return pathSegments[3] === "edit" ? "edit" : "add";
  }, [pathSegments]);

  const isAddModalOpen = useMemo(() => {
    return pathSegments[1] === "add-item";
  }, [pathSegments]);

  // New/Edit Document State
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState<string>("Passport / ID");
  const [docFileUrl, setDocFileUrl] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docFileName, setDocFileName] = useState("");
  const [docFileSize, setDocFileSize] = useState("");

  // New Checklist State
  const [newCheckItemTitle, setNewCheckItemTitle] = useState("");
  const [newCheckCategory, setNewCheckCategory] = useState<string>("Travel Essentials");

  // Custom added categories state
  const [customCategories, setCustomCategories] = useState<string[]>(trip.customCategories || []);

  const handleAddCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    if (allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        showToast("Category already exists", "error");
        return;
    }
    const updatedCustomCategories = [...customCategories, trimmed];
    setCustomCategories(updatedCustomCategories);
    onUpdateTrip({ ...trip, customCategories: updatedCustomCategories });
    showToast(`Category "${trimmed}" created`);
  };

  // Edit Checklist Item State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemCategory, setEditItemCategory] = useState("");

  // Collapsed categories map
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Multi-select / Bulk Operation State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Three-dot Floating Portal Menu State
  const [activeMenu, setActiveMenu] = useState<{
    type: "document" | "checklist";
    id: string;
    rect: DOMRect;
  } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Drag and Drop (Reordering) state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Long press refs
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  // Close active floating menus on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenu(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Ensure checklist exists in trip
  const currentChecklist = checklistItems;
  const currentDocuments = trip.documents || [];

  // Scan all existing categories
  const categoriesInTrip = Array.from(new Set(currentChecklist.map((c) => c.category)));
  const allCategories = Array.from(
    new Set([
      "Documents",
      "Electronics",
      "Clothing",
      "Toiletries",
      "Health",
      "Travel Essentials",
      ...categoriesInTrip,
      ...customCategories,
    ])
  );

  // Documents categories list
  const docCategories = [
    "Passport / ID",
    "Visa",
    "Flight Ticket",
    "Train Ticket",
    "Bus Ticket",
    "Hotel Booking",
    "Driving License",
    "Insurance",
    "Other Documents",
  ];

  // Helper to map document types to visual icons
  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("passport") || t.includes("id") || t.includes("license")) {
      return <Shield className="w-5 h-5 text-emerald-500" />;
    } else if (t.includes("ticket") || t.includes("flight") || t.includes("train") || t.includes("bus")) {
      return <CreditCard className="w-5 h-5 text-amber-500" />;
    } else if (t.includes("hotel") || t.includes("booking")) {
      return <Briefcase className="w-5 h-5 text-blue-500" />;
    } else if (t.includes("visa")) {
      return <FileText className="w-5 h-5 text-indigo-500" />;
    } else if (t.includes("insurance")) {
      return <Lock className="w-5 h-5 text-#1AAB67" />;
    }
    return <File className="w-5 h-5 text-slate-500" />;
  };

  // --- DOCUMENT CRUD ACTIONS ---

  // Sync form state when editing document or opening add doc
  useEffect(() => {
    if (selectedDocId && pathSegments[3] === "edit") {
      const doc = trip.documents.find((d) => d.id === selectedDocId);
      if (doc) {
        setDocTitle(doc.title);
        setDocType(doc.docType);
        setDocFileUrl(doc.fileUrl);
        setDocNotes(doc.notes || "");
        setDocFileName(doc.notes?.includes("File:") ? doc.notes.split("File:")[1].trim() : "");
        setDocFileSize(doc.fileSize || "");
      }
    } else if (pathSegments[1] === "add-doc") {
      setDocTitle("");
      setDocType("Passport / ID");
      setDocFileUrl("");
      setDocNotes("");
      setDocFileName("");
      setDocFileSize("");
    }
  }, [selectedDocId, pathSegments, trip.documents]);

  const handleOpenAddDoc = () => {
    navigate(`${basePath}/vault/add-doc`);
  };

  const handleOpenEditDoc = (doc: DocumentItem) => {
    navigate(`${basePath}/vault/doc/${doc.id}/edit`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFileName(file.name);
      setDocFileSize(
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`
      );

      const reader = new FileReader();
      reader.onloadend = () => {
        setDocFileUrl(reader.result as string);
        if (!docTitle) {
          // Auto-fill title from filename
          const cleanName = file.name.split(".").slice(0, -1).join(".");
          setDocTitle(cleanName.replace(/[-_]/g, " "));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    const notesWithFile = docFileName ? `${docNotes ? `${docNotes} • ` : ""}File: ${docFileName}` : docNotes;

    if (docModalMode === "add") {
      const newDoc: DocumentItem = {
        id: `doc_${Date.now()}`,
        tripId: trip.id,
        title: docTitle,
        docType,
        fileUrl:
          docFileUrl ||
          "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop",
        notes: notesWithFile,
        uploadedAt: new Date().toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        fileSize: docFileSize || "Unknown size",
      };

      onUpdateTrip({
        ...trip,
        documents: [...currentDocuments, newDoc],
      });
    } else if (docModalMode === "edit" && selectedDocId) {
      const updatedDocs = currentDocuments.map((d) =>
        d.id === selectedDocId
          ? {
              ...d,
              title: docTitle,
              docType,
              fileUrl: docFileUrl,
              notes: notesWithFile,
              fileSize: docFileSize || d.fileSize,
            }
          : d
      );

      onUpdateTrip({
        ...trip,
        documents: updatedDocs,
      });
    }

    showToast(docModalMode === "add" ? "Document added to vault" : "Document updated successfully");
    goBack();
  };

  const handleDeleteDoc = (id: string) => {
    onUpdateTrip({
      ...trip,
      documents: currentDocuments.filter((d) => d.id !== id),
    });
  };

  const handleDownloadDoc = (doc: DocumentItem) => {
    const link = document.createElement("a");
    link.href = doc.fileUrl;
    link.download = doc.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CHECKLIST CRUD ACTIONS ---

  const handleAddItem = (title: string, category: string, note?: string) => {
    const newItem: ChecklistItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tripId: trip.id,
      title: title.trim(),
      category: category,
      isPacked: false,
      ownerUid: currentUser!.uid,
    };

    saveChecklistItem(newItem);
    setChecklistItems([newItem, ...checklistItems]);
  };

  const handleToggleChecklist = (id: string) => {
    const updated = currentChecklist.map((c) =>
      c.id === id ? { ...c, isPacked: !c.isPacked } : c
    );
    const item = updated.find(c => c.id === id);
    if (item) saveChecklistItem(item);
    setChecklistItems(updated);
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklistItems(currentChecklist.filter((c) => c.id !== id));
    deleteChecklistItem(id);
    // Remove from selection if deleted
    if (selectedItemIds.has(id)) {
      const nextSelection = new Set(selectedItemIds);
      nextSelection.delete(id);
      setSelectedItemIds(nextSelection);
    }
  };

  const handleDuplicateChecklistItem = (item: ChecklistItem) => {
    const newItem: ChecklistItem = {
      ...item,
      id: `chk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `${item.title} (Copy)`,
      isPacked: false,
      ownerUid: currentUser!.uid,
    };
    saveChecklistItem(newItem);
    setChecklistItems([...currentChecklist, newItem]);
  };

  // Inline edit checklist item
  const handleStartEdit = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditItemTitle(item.title);
    setEditItemCategory(item.category);
  };

  const handleSaveInlineEdit = (id: string) => {
    if (!editItemTitle.trim()) return;
    const updated = currentChecklist.map((item) =>
      item.id === id
        ? { ...item, title: editItemTitle.trim(), category: editItemCategory }
        : item
    );
    const item = updated.find(c => c.id === id);
    if (item) saveChecklistItem(item);
    setChecklistItems(updated);
    setEditingItemId(null);
  };

  // --- QUICK ACTIONS TOOLBAR (Requirement 8) ---

  const handleMarkAllPacked = () => {
    const updated = currentChecklist.map((item) => ({ ...item, isPacked: true }));
    updated.forEach(item => saveChecklistItem(item));
    setChecklistItems(updated);
  };

  const handleUncheckAll = () => {
    const updated = currentChecklist.map((item) => ({ ...item, isPacked: false }));
    updated.forEach(item => saveChecklistItem(item));
    setChecklistItems(updated);
  };

  const handleResetChecklist = () => {
    if (window.confirm("Are you sure you want to reset the checklist? This will replace current items with the 50 default packing items.")) {
      // Delete old items
      currentChecklist.forEach(item => deleteChecklistItem(item.id));
      // Create new defaults
      const defaults = getRichDefaultChecklist(trip.id).map(item => ({...item, ownerUid: currentUser!.uid}));
      defaults.forEach(item => saveChecklistItem(item));
      setChecklistItems(defaults);
      setCustomCategories([]);
    }
  };

  const handleDeleteCategory = (category: string) => {
    if (window.confirm(`Are you sure you want to delete the section "${category}" and all its items?`)) {
        const toDelete = checklistItems.filter(item => item.category === category);
        toDelete.forEach(item => deleteChecklistItem(item.id));
        const updatedCustomCategories = customCategories.filter(c => c !== category);
        setChecklistItems(prev => prev.filter(item => item.category !== category));
        setCustomCategories(updatedCustomCategories);
        onUpdateTrip({ ...trip, customCategories: updatedCustomCategories });
    }
  };

  const handleSortAlphabetically = () => {
    const sorted = [...currentChecklist].sort((a, b) => a.title.localeCompare(b.title));
    setChecklistItems(sorted);
  };

  // --- MULTI-SELECT & BULK ACTIONS (Requirement 9) ---

  const handleToggleSelectItem = (id: string) => {
    const nextSelection = new Set(selectedItemIds);
    if (nextSelection.has(id)) {
      nextSelection.delete(id);
    } else {
      nextSelection.add(id);
    }
    setSelectedItemIds(nextSelection);
    if (nextSelection.size === 0) {
      setIsMultiSelectMode(false);
    }
  };

  const handleStartLongPress = (id: string) => {
    longPressTimeout.current = setTimeout(() => {
      setIsMultiSelectMode(true);
      handleToggleSelectItem(id);
    }, 600); // 600ms threshold for long-press
  };

  const handleCancelLongPress = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedItemIds.size} selected items?`)) {
      const remaining = currentChecklist.filter((item) => !selectedItemIds.has(item.id));
      const toDelete = currentChecklist.filter((item) => selectedItemIds.has(item.id));
      toDelete.forEach(item => deleteChecklistItem(item.id));
      setChecklistItems(remaining);
      setSelectedItemIds(new Set());
      setIsMultiSelectMode(false);
    }
  };

  const handleBulkMarkPacked = (packed: boolean) => {
    const updated = currentChecklist.map((item) =>
      selectedItemIds.has(item.id) ? { ...item, isPacked: packed } : item
    );
    updated.forEach(item => {
        if (selectedItemIds.has(item.id)) saveChecklistItem(item);
    });
    setChecklistItems(updated);
    setSelectedItemIds(new Set());
    setIsMultiSelectMode(false);
  };

  const handleBulkDuplicate = () => {
    const duplicated: ChecklistItem[] = [];
    currentChecklist.forEach((item) => {
      if (selectedItemIds.has(item.id)) {
        const newItem = {
          ...item,
          id: `chk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          title: `${item.title} (Copy)`,
          isPacked: false,
          ownerUid: currentUser!.uid,
        };
        saveChecklistItem(newItem);
        duplicated.push(newItem);
      }
    });
    setChecklistItems([...currentChecklist, ...duplicated]);
    setSelectedItemIds(new Set());
    setIsMultiSelectMode(false);
  };

  const handleBulkChangeCategory = (category: string) => {
    const updated = currentChecklist.map((item) =>
      selectedItemIds.has(item.id) ? { ...item, category } : item
    );
    updated.forEach(item => {
        if (selectedItemIds.has(item.id)) saveChecklistItem(item);
    });
    setChecklistItems(updated);
    setSelectedItemIds(new Set());
    setIsMultiSelectMode(false);
  };

  // --- REORDERING / DRAG & DROP (Requirement 6) ---

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedItemId || draggedItemId === targetId) return;

    const originalList = [...currentChecklist];
    const draggedIdx = originalList.findIndex((item) => item.id === draggedItemId);
    const targetIdx = originalList.findIndex((item) => item.id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const [draggedItem] = originalList.splice(draggedIdx, 1);
    originalList.splice(targetIdx, 0, draggedItem);

    setChecklistItems(originalList);

    setDraggedItemId(null);
  };

  const handleMoveItem = (id: string, direction: "up" | "down") => {
    const originalList = [...currentChecklist];
    const idx = originalList.findIndex((item) => item.id === id);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= originalList.length) return;

    const temp = originalList[idx];
    originalList[idx] = originalList[targetIdx];
    originalList[targetIdx] = temp;

    setChecklistItems(originalList);
  };

  // --- THREE-DOT FLOATING PORTAL MENU HANDLERS (Requirement 4 & 5) ---

  const handleOpenMenu = (
    e: React.MouseEvent,
    type: "document" | "checklist",
    id: string
  ) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveMenu({ type, id, rect });
  };

  // --- SEARCH AND FILTER LOGIC ---

  const filteredDocuments = currentDocuments.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.notes && doc.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || doc.docType === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredChecklist = currentChecklist.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "packed" && item.isPacked) ||
      (statusFilter === "unpacked" && !item.isPacked);
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const packedCount = currentChecklist.filter((c) => c.isPacked).length;
  const packedPercent =
    currentChecklist.length > 0
      ? Math.round((packedCount / currentChecklist.length) * 100)
      : 0;

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden md:px-0">
      {/* Tab Switcher - Optimized for Mobile Screen size */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-md mx-auto">
        <button
          onClick={() => {
            setActiveSubTab("vault");
            setSearchQuery("");
            setCategoryFilter("all");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "vault"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Documents ({currentDocuments.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("checklist");
            setSearchQuery("");
            setCategoryFilter("all");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "checklist"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Checklist ({packedCount}/{currentChecklist.length})</span>
        </button>
      </div>

      {/* --- SUB-TAB 1: ENCRYPTED DOCUMENT VAULT --- */}
      {activeSubTab === "vault" && (
        <div className="space-y-3 max-w-md mx-auto px-1">
          {/* Header Actions Card */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Document Vault
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Secure local backup for trip tickets, vouchers, and travel IDs.
                </p>
              </div>

              <button
                onClick={() => navigate(`${basePath}/vault/add-doc`)}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold h-9 px-3 rounded-lg transition-all shadow-xs shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search stored documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">All Types</option>
                {docCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Documents Grid / Stack */}
          <div className="space-y-2">
            {filteredDocuments.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <Folder className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-slate-400" />
                <p className="text-xs font-bold">No matching documents</p>
                <p className="text-[10px] mt-0.5 text-slate-400">
                  Upload PDF or images for easy reference on the go.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-xs flex items-center justify-between gap-3 hover:border-indigo-500 dark:hover:border-indigo-500/50 transition-all"
                  >
                    <div
                      onClick={() => navigate(`${basePath}/vault/doc/${doc.id}`)}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800/80 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-750">
                        {getFileIcon(doc.docType)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {doc.docType}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {doc.uploadedAt}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-xs mt-1 truncate">
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                          {doc.fileSize && <span>{doc.fileSize}</span>}
                          {doc.notes && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="truncate max-w-[140px] italic">
                                {doc.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleOpenMenu(e, "document", doc.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 self-center"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 2: PACKING CHECKLIST --- */}
      {activeSubTab === "checklist" && (
        <div className="space-y-4 max-w-md mx-auto px-1">
          {/* Compact Summary Header */}
          <div className="px-1 pt-2 pb-1 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Packing Checklist</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-slate-500 font-medium">{packedCount} of {currentChecklist.length} packed ({packedPercent}%)</p>
              </div>
            </div>
            <div className="text-xs font-bold text-indigo-600">{packedPercent}%</div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${packedPercent}%` }}
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`${basePath}/vault/add-item`)}
              className="flex-[7] bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
            <button
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className="flex-[3] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-200 transition-all"
            >
              Manage
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search checklist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white transition-all focus:outline-none"
              />
            </div>
            <button
              onClick={() => { /* Implement Filter Logic */ }}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>

          {/* Collapsible Categories Checklist Stack (Requirement 10) */}
          <div className="space-y-2.5 pt-1">
            {allCategories.map((category) => {
              const categoryItems = filteredChecklist.filter((item) => item.category === category);
              if (categoryItems.length === 0) return null;

              const catPacked = categoryItems.filter((i) => i.isPacked).length;
              const isCollapsed = collapsedCategories[category] || false;

              const toggleCollapse = () => {
                setCollapsedCategories((prev) => ({
                  ...prev,
                  [category]: !prev[category],
                }));
              };

              return (
                <div key={category} className="space-y-1">
                  {/* Category Section Header */}
                  <div
                    onClick={toggleCollapse}
                    className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg cursor-pointer select-none border border-slate-200 dark:border-slate-850/80 hover:bg-slate-200 dark:hover:bg-slate-850"
                  >
                    <div className="flex items-center gap-1.5">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                        {category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category);
                        }}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg relative z-20"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-extrabold text-slate-500 bg-white dark:bg-slate-850 px-1.5 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-750">
                        {catPacked}/{categoryItems.length} packed
                      </span>
                    </div>
                  </div>

                  {/* Category Items */}
                  {!isCollapsed && (
                    <div className="space-y-1.5 pl-1.5">
                      <AnimatePresence initial={false}>
                        {categoryItems.map((item, idx) => (
                          <div
                            key={item.id}
                            draggable={!isMultiSelectMode}
                            onDragStart={() => handleDragStart(item.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(item.id)}
                            className="group"
                          >
                            {/* Sliding/Swipe Container with Framer Motion (Requirement 7) */}
                            <motion.div
                              layout
                              className={`relative p-2.5 flex items-center justify-between gap-2.5 transition-all select-none rounded-xl border border-slate-150 dark:border-slate-850 ${
                                item.isPacked
                                  ? "bg-slate-50 dark:bg-slate-900/60 opacity-65"
                                  : "bg-white dark:bg-slate-900 shadow-xs"
                              }`}
                            >
                                {/* Left Side: Checkbox / Selector */}
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  {isMultiSelectMode ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSelectItem(item.id)}
                                      className="shrink-0 p-0.5 text-indigo-600 dark:text-indigo-400"
                                    >
                                      {selectedItemIds.has(item.id) ? (
                                        <CheckSquare2 className="w-4 h-4" />
                                      ) : (
                                        <div className="w-4 h-4 border border-slate-350 dark:border-slate-600 rounded" />
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleChecklist(item.id);
                                      }}
                                      className="shrink-0 focus:outline-none"
                                    >
                                      <div
                                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border-2 ${
                                          item.isPacked
                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                            : "border-slate-300 dark:border-slate-600 bg-transparent"
                                        }`}
                                      >
                                        {item.isPacked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      </div>
                                    </button>
                                  )}

                                  {/* Item title / inline edit */}
                                  {editingItemId === item.id ? (
                                    <div className="flex items-center gap-1.5 flex-1">
                                      <input
                                        type="text"
                                        value={editItemTitle}
                                        onChange={(e) => setEditItemTitle(e.target.value)}
                                        className="flex-1 px-1.5 py-0.5 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-indigo-500 text-slate-900 dark:text-white"
                                      />
                                      <button
                                        onClick={() => handleSaveInlineEdit(item.id)}
                                        className="p-1 text-emerald-600 dark:text-emerald-400"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingItemId(null)}
                                        className="p-1 text-slate-400"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className={`text-sm font-medium leading-tight truncate ${
                                        item.isPacked
                                          ? "text-slate-400 dark:text-slate-500"
                                          : "text-slate-900 dark:text-slate-100"
                                      }`}
                                    >
                                      {item.title}
                                    </span>
                                  )}
                                </div>

                                {/* Right Side: Reorder Handles & Actions */}
                                <div className="flex items-center gap-1 shrink-0 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  {/* Visual drag indicator */}
                                  <div className="text-slate-350 dark:text-slate-600 cursor-grab px-0.5 hidden md:block">
                                    <Move className="w-3.5 h-3.5" />
                                  </div>

                                  {/* Mobile sorting arrows (Requirement 6 fallback) */}
                                  <button
                                    onClick={() => handleMoveItem(item.id, "up")}
                                    disabled={idx === 0}
                                    className="p-1 text-slate-400 disabled:opacity-20 hover:text-slate-600"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveItem(item.id, "down")}
                                    disabled={idx === categoryItems.length - 1}
                                    className="p-1 text-slate-400 disabled:opacity-20 hover:text-slate-600"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={(e) => handleOpenMenu(e, "checklist", item.id)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            </div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- FLOATING PORTAL ACTIONS BAR FOR CHECKLIST MULTI-SELECT (Requirement 9) --- */}
      {isMultiSelectMode && selectedItemIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-slate-900/95 dark:bg-slate-950/95 text-white p-3 rounded-xl shadow-2xl flex flex-col gap-2.5 backdrop-blur-sm border border-slate-700/50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-extrabold text-slate-200 flex items-center gap-1.5">
              <CheckSquare2 className="w-4 h-4 text-indigo-400" />
              {selectedItemIds.size} Items Selected
            </span>
            <button
              onClick={() => {
                setIsMultiSelectMode(false);
                setSelectedItemIds(new Set());
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 justify-between">
            <button
              onClick={() => handleBulkMarkPacked(true)}
              className="flex-1 text-[10px] font-extrabold bg-indigo-600 hover:bg-indigo-500 py-1.5 px-2 rounded-lg text-center"
            >
              Packed
            </button>
            <button
              onClick={() => handleBulkMarkPacked(false)}
              className="flex-1 text-[10px] font-extrabold bg-slate-800 hover:bg-slate-750 py-1.5 px-2 rounded-lg text-center"
            >
              Unpacked
            </button>
            <button
              onClick={handleBulkDuplicate}
              className="flex-1 text-[10px] font-extrabold bg-slate-800 hover:bg-slate-750 py-1.5 px-2 rounded-lg text-center"
            >
              Duplicate
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex-1 text-[10px] font-extrabold bg-rose-600 hover:bg-rose-500 py-1.5 px-2 rounded-lg text-center"
            >
              Delete
            </button>
          </div>

          {/* Inline Move Category Bulk */}
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80">
            <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">Move To:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkChangeCategory(e.target.value);
                  e.target.value = "";
                }
              }}
              className="flex-1 text-[10px] bg-slate-800 border-none rounded p-1 text-white focus:outline-none"
            >
              <option value="">Select Category...</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => goBack()}
        onAdd={handleAddItem}
        onAddCategory={handleAddCategory}
        categories={allCategories}
      />

      {/* --- THREE-DOT FLOATING PORTAL MENU RENDERING (Requirement 4 & 5) --- */}
      {activeMenu &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: activeMenu.rect.bottom + window.scrollY + 6,
              left: Math.min(
                window.innerWidth - 150,
                Math.max(10, activeMenu.rect.left + window.scrollX - 110)
              ),
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing immediately
            className="w-36 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 flex flex-col gap-0.5 animate-in fade-in duration-100"
          >
            {activeMenu.type === "document" && (() => {
              const doc = currentDocuments.find((d) => d.id === activeMenu.id);
              if (!doc) return null;
              return (
                <>
                  <button
                    onClick={() => {
                      navigate(`${basePath}/vault/doc/${doc.id}`);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => {
                      handleOpenEditDoc(doc);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Replace / Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDownloadDoc(doc);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Download</span>
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${doc.title}?`)) {
                        handleDeleteDoc(doc.id);
                      }
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </>
              );
            })()}

            {activeMenu.type === "checklist" && (() => {
              const item = currentChecklist.find((c) => c.id === activeMenu.id);
              if (!item) return null;
              return (
                <>
                  <button
                    onClick={() => {
                      handleStartEdit(item);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit Item</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDuplicateChecklistItem(item);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duplicate</span>
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  <button
                    onClick={() => {
                      handleDeleteChecklistItem(item.id);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </>
              );
            })()}
          </div>,
          document.body
        )}

      {/* --- ADD/EDIT DOCUMENT MODAL --- */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-4 space-y-3.5 mt-auto sm:mt-0"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">
                {docModalMode === "add" ? "Store Travel Document" : "Replace Travel Document"}
              </h3>
              <button onClick={() => goBack()}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. My Visa Copy"
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white"
                  >
                    {docCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    File Attachment
                  </label>
                  <label className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {docFileName && (
                <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 truncate">
                        {docFileName}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold">{docFileSize}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDocFileName("");
                      setDocFileSize("");
                      setDocFileUrl("");
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Manual URL / Image Link (Optional)
                </label>
                <input
                  type="text"
                  value={docFileUrl.startsWith("data:") ? "" : docFileUrl}
                  onChange={(e) => setDocFileUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Short Notes (Optional)
                </label>
                <input
                  type="text"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="e.g. Valid till June 2028"
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => goBack()}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow-xs"
                >
                  {docModalMode === "add" ? "Save to Vault" : "Apply Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- LIGHTBOX IMAGE PREVIEW MODAL --- */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 border border-slate-800"
          >
            <button
              onClick={() => goBack()}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {previewDocUrl.startsWith("data:application/pdf") ? (
              <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-400 gap-3">
                <FileText className="w-16 h-16 text-indigo-500" />
                <p className="text-xs font-bold">PDF Document Uploaded Successfully</p>
                <a
                  href={previewDocUrl}
                  download="Document_Vault_PDF"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download PDF to View
                </a>
              </div>
            ) : (
              <img
                src={previewDocUrl}
                alt="Document Preview"
                referrerPolicy="no-referrer"
                className="w-full max-h-[75vh] object-contain rounded-lg"
              />
            )}
          </motion.div>
        </div>
      )}
      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-rose-600 text-white border-rose-500"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

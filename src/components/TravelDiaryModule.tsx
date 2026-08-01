/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { User } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Smile,
  Tag as TagIcon,
  Trash2,
  Edit3,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Lock,
  Camera,
  Upload,
  Eye,
  Check,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { Trip, DiaryEntry, DiaryMood } from "../types";
import { fetchDiaryEntries, saveDiaryEntry, deleteDiaryEntry } from "../lib/firestoreSync";

interface TravelDiaryModuleProps {
  trip: Trip;
  currentUser: User | null;
}

const PRESET_MOODS: DiaryMood[] = [
  "😊 Happy",
  "🤩 Amazing",
  "😌 Relaxed",
  "🥱 Tired",
  "🥹 Emotional",
  "😮 Surprised",
  "❤️ Memorable",
];

const PRESET_TAGS = [
  "Food",
  "Journey",
  "Friends",
  "Adventure",
  "Hotel",
  "Sightseeing",
  "Shopping",
  "Funny Moment",
];

export const TravelDiaryModule: React.FC<TravelDiaryModuleProps> = ({
  trip,
  currentUser,
}) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>("All");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("All");

  // Modals & Active State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<DiaryEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<DiaryEntry | null>(null);
  
  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // Form State
  const [formDate, setFormDate] = useState<string>("");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formLocation, setFormLocation] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [formMood, setFormMood] = useState<string>("😊 Happy");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effective Owner UID
  const ownerUid = currentUser?.uid || "guest_traveller";

  // Storage key for guest / offline fallback
  const localStorageKey = `trippro_diary_${trip.id}_${ownerUid}`;

  // Load Entries
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      let loadedEntries: DiaryEntry[] = [];

      if (currentUser) {
        try {
          loadedEntries = await fetchDiaryEntries(trip.id, currentUser.uid);
        } catch (err) {
          console.error("Failed to load diary entries from Firestore:", err);
        }
      }

      // Fallback to local storage if empty or guest mode
      if (loadedEntries.length === 0) {
        const local = localStorage.getItem(localStorageKey);
        if (local) {
          try {
            loadedEntries = JSON.parse(local);
          } catch (e) {
            // ignore
          }
        }
      }

      if (isMounted) {
        setEntries(loadedEntries);
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [trip.id, currentUser?.uid, localStorageKey]);

  // Save entries state locally whenever changed
  const persistLocally = (updated: DiaryEntry[]) => {
    localStorage.setItem(localStorageKey, JSON.stringify(updated));
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    const today = new Date().toISOString().split("T")[0];
    setEditingEntry(null);
    setFormDate(today);
    setFormTitle("");
    setFormLocation(trip.destination || "");
    setFormContent("");
    setFormMood("😊 Happy");
    setFormPhotos([]);
    setFormTags(["Journey"]);
    setFormError(null);
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date || new Date().toISOString().split("T")[0]);
    setFormTitle(entry.title || "");
    setFormLocation(entry.location || "");
    setFormContent(entry.content || "");
    setFormMood(entry.mood || "😊 Happy");
    setFormPhotos(entry.photos || []);
    setFormTags(entry.tags || []);
    setFormError(null);
    setIsEditorOpen(true);
    setViewingEntry(null);
  };

  // Compress & convert uploaded image to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Get compressed data url
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setFormPhotos((prev) => [...prev, dataUrl]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    if (e.target) {
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleTag = (tag: string) => {
    setFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !formTags.includes(trimmed)) {
      setFormTags((prev) => [...prev, trimmed]);
      setCustomTagInput("");
    }
  };

  // Submit Save/Update Entry
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Please enter a title for your diary entry.");
      return;
    }
    if (!formContent.trim()) {
      setFormError("Please write something in your diary story.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const nowIso = new Date().toISOString();
    const entryId = editingEntry ? editingEntry.id : `diary_${Date.now()}`;

    const newEntry: DiaryEntry = {
      id: entryId,
      tripId: trip.id,
      ownerUid: ownerUid,
      travellerName: currentUser?.displayName || "Traveller",
      date: formDate,
      title: formTitle.trim(),
      location: formLocation.trim(),
      content: formContent.trim(),
      mood: formMood,
      photos: formPhotos,
      tags: formTags,
      createdAt: editingEntry ? editingEntry.createdAt : nowIso,
      updatedAt: nowIso,
    };

    let updatedList: DiaryEntry[] = [];
    if (editingEntry) {
      updatedList = entries.map((item) => (item.id === entryId ? newEntry : item));
    } else {
      updatedList = [newEntry, ...entries];
    }

    setEntries(updatedList);
    persistLocally(updatedList);

    // Save to Firestore if user is authenticated
    if (currentUser) {
      try {
        await saveDiaryEntry(newEntry);
      } catch (err) {
        console.error("Firestore save failed:", err);
      }
    }

    setIsSaving(false);
    setIsEditorOpen(false);
  };

  // Delete Entry
  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;

    const idToRemove = entryToDelete.id;
    const updated = entries.filter((item) => item.id !== idToRemove);

    setEntries(updated);
    persistLocally(updated);

    if (currentUser) {
      try {
        await deleteDiaryEntry(idToRemove);
      } catch (err) {
        console.error("Firestore delete failed:", err);
      }
    }

    setEntryToDelete(null);
    setViewingEntry(null);
  };

  // Calculate Personal Stats
  const stats = useMemo(() => {
    const memoriesCount = entries.length;
    const photosCount = entries.reduce(
      (acc, item) => acc + (item.photos ? item.photos.length : 0),
      0
    );
    const uniquePlaces = new Set(
      entries
        .map((e) => e.location?.trim())
        .filter((loc): loc is string => Boolean(loc && loc.length > 0))
    );
    return {
      memoriesCount,
      photosCount,
      placesCount: uniquePlaces.size,
    };
  }, [entries]);

  // Filter & Search Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesLocation = (item.location || "").toLowerCase().includes(q);
        const matchesContent = item.content.toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesLocation && !matchesContent && !matchesTags) {
          return false;
        }
      }

      // Mood filter
      if (selectedMoodFilter !== "All" && item.mood !== selectedMoodFilter) {
        return false;
      }

      // Tag filter
      if (selectedTagFilter !== "All" && !item.tags.includes(selectedTagFilter)) {
        return false;
      }

      return true;
    });
  }, [entries, searchQuery, selectedMoodFilter, selectedTagFilter]);

  // Timeline Grouping by Date
  const groupedTimeline = useMemo(() => {
    const groups: { dateLabel: string; items: DiaryEntry[] }[] = [];
    const map = new Map<string, DiaryEntry[]>();

    filteredEntries.forEach((entry) => {
      const key = entry.date || "Unscheduled";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(entry);
    });

    Array.from(map.keys())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((dateKey) => {
        let label = dateKey;
        if (dateKey !== "Unscheduled") {
          try {
            const d = new Date(dateKey);
            label = d.toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).toUpperCase();
          } catch {
            label = dateKey;
          }
        }
        groups.push({
          dateLabel: label,
          items: map.get(dateKey)!,
        });
      });

    return groups;
  }, [filteredEntries]);

  // Photo Lightbox Trigger
  const handleOpenLightbox = (photos: string[], startIndex: number = 0) => {
    setLightboxImages(photos);
    setLightboxIndex(startIndex);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 pb-12"
    >
      {/* 1. HEADER BANNER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#1AAB67] text-white flex items-center justify-center font-bold text-base shadow-sm">
                📖
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Travel Diary
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Private
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium pl-1">
              "Capture the moments from your journey."
            </p>
            <p className="text-xs font-bold text-[#1AAB67] dark:text-#34D399 flex items-center gap-1 pt-1">
              <MapPin className="w-3.5 h-3.5" /> {trip.name}
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1AAB67] hover:bg-#159257 active:scale-95 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-sm transition-all cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Diary Entry</span>
          </button>
        </div>

        {/* COMPACT PERSONAL DIARY STATS */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850/60 p-3 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-base">📖</span>
            <span>{stats.memoriesCount} Memories</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base">📷</span>
            <span>{stats.photosCount} Photos</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base">📍</span>
            <span>{stats.placesCount} Places</span>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries by title, location, story or tags..."
            className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl pl-9 pr-8 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1 text-slate-400 font-bold text-[11px] uppercase tracking-wider pr-1">
            <Filter className="w-3 h-3" /> Filter:
          </div>

          {/* Mood Select */}
          <select
            value={selectedMoodFilter}
            onChange={(e) => setSelectedMoodFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">All Moods</option>
            {PRESET_MOODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Tag Select */}
          <select
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">All Tags</option>
            {PRESET_TAGS.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>

          {(selectedMoodFilter !== "All" || selectedTagFilter !== "All" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedMoodFilter("All");
                setSelectedTagFilter("All");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 pl-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* 3. DIARY TIMELINE & ENTRIES LIST */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#1AAB67] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Loading your personal travel memories...
          </p>
        </div>
      ) : filteredEntries.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-#1AAB67/10 dark:bg-#1AAB67/20/60 rounded-3xl flex items-center justify-center mx-auto text-2xl sm:text-3xl text-[#1AAB67]">
            📖
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Your travel story starts here
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Capture the places, people and moments that make this trip unforgettable.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-[#1AAB67] hover:bg-#159257 text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Write First Entry</span>
          </button>
        </div>
      ) : (
        /* TIMELINE DISPLAY */
        <div className="space-y-6">
          {groupedTimeline.map((group) => (
            <div key={group.dateLabel} className="space-y-3">
              {/* Timeline Date Header */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black tracking-widest text-[#1AAB67] dark:text-#34D399 uppercase bg-#1AAB67/10 dark:bg-#1AAB67/20/80 px-3 py-1 rounded-lg border border-#1AAB67/30 dark:border-#1AAB67/40">
                  {group.dateLabel}
                </span>
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
              </div>

              {/* Group Entries */}
              <div className="space-y-4 pl-1 sm:pl-2">
                {group.items.map((entry) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-#1AAB67/50 dark:hover:border-#1AAB67/60 transition-all space-y-3 group"
                  >
                    {/* Header Row: Title, Mood & Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {entry.mood && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900">
                              {entry.mood}
                            </span>
                          )}
                          {entry.location && (
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#1AAB67]" />
                              {entry.location}
                            </span>
                          )}
                        </div>
                        <h3
                          onClick={() => setViewingEntry(entry)}
                          className="text-base sm:text-lg font-bold text-slate-900 dark:text-white cursor-pointer hover:text-[#1AAB67] dark:hover:text-#34D399 transition-colors leading-snug"
                        >
                          {entry.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          title="Edit Entry"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-#159257 hover:bg-#1AAB67/10 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEntryToDelete(entry)}
                          title="Delete Entry"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Story Preview */}
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal leading-relaxed line-clamp-3">
                      "{entry.content}"
                    </p>

                    {/* Photo Gallery Grid */}
                    {entry.photos && entry.photos.length > 0 && (
                      <div className="pt-1">
                        <div
                          className={`grid gap-2 ${
                            entry.photos.length === 1
                              ? "grid-cols-1"
                              : entry.photos.length === 2
                              ? "grid-cols-2"
                              : entry.photos.length === 3
                              ? "grid-cols-3"
                              : "grid-cols-2 sm:grid-cols-4"
                          }`}
                        >
                          {entry.photos.slice(0, 4).map((photoUrl, idx) => {
                            const isFourthAndMore =
                              idx === 3 && entry.photos.length > 4;
                            const remainingCount = entry.photos.length - 4;

                            return (
                              <div
                                key={idx}
                                onClick={() => handleOpenLightbox(entry.photos, idx)}
                                className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer group/photo border border-slate-200/50 dark:border-slate-800"
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Diary Memory ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                                />
                                {isFourthAndMore && (
                                  <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center text-white font-extrabold text-sm sm:text-base">
                                    +{remainingCount}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Footer Row: Tags & View Button */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {entry.tags &&
                          entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                            >
                              #{tag}
                            </span>
                          ))}
                      </div>

                      <button
                        onClick={() => setViewingEntry(entry)}
                        className="flex items-center gap-1 text-[#1AAB67] dark:text-#34D399 font-bold hover:underline cursor-pointer ml-auto text-xs"
                      >
                        <span>View Entry</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. CREATE / EDIT DIARY MODAL */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-#1AAB67/10 dark:bg-#1AAB67/20/80 text-[#1AAB67] flex items-center justify-center font-bold">
                    📖
                  </span>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                      {editingEntry ? "Edit Memory Entry" : "New Diary Entry"}
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      Private memory saved to your account
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveEntry} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. First Day exploring Charminar"
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
                  />
                </div>

                {/* Date & Location Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. Charminar, Hyderabad"
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
                    />
                  </div>
                </div>

                {/* Mood Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Mood</span>
                    <span className="text-[10px] text-slate-400 font-normal">Select how you felt</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_MOODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormMood(m)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          formMood === m
                            ? "bg-[#1AAB67] text-white border-[#1AAB67] shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Story / Diary Content */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Diary / Story *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Write about your day, memories, experiences, atmosphere, food, conversations..."
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1AAB67] resize-none"
                  />
                </div>

                {/* Photos Uploader */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Photos ({formPhotos.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-[#1AAB67] dark:text-#34D399 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> + Add Photos
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Photo Thumbnails Preview */}
                  {formPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                      {formPhotos.map((photo, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group"
                        >
                          <img
                            src={photo}
                            alt={`Preview ${idx}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:border-#1AAB67/70 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Upload journey photos from gallery or camera
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Multiple photos supported
                      </p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tags
                  </label>

                  {/* Preset Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TAGS.map((t) => {
                      const isSelected = formTags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleToggleTag(t)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#1AAB67]/10 dark:bg-[#1AAB67]/20 text-[#1AAB67] dark:text-[#34D399] border-[#1AAB67]/30 dark:border-[#1AAB67]/40"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          #{t}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom tag input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomTag();
                        }
                      }}
                      placeholder="Add custom tag (press Enter)"
                      className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-200"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Footer Save Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 rounded-xl bg-[#1AAB67] hover:bg-#159257 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Diary Entry</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. VIEW ENTRY DETAILS MODAL */}
      <AnimatePresence>
        {viewingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black tracking-widest text-[#1AAB67] dark:text-#34D399 uppercase bg-#1AAB67/10 dark:bg-#1AAB67/20/80 px-2.5 py-0.5 rounded-lg border border-#1AAB67/30 dark:border-#1AAB67/40">
                      {viewingEntry.date}
                    </span>
                    {viewingEntry.mood && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900">
                        {viewingEntry.mood}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {viewingEntry.title}
                  </h2>
                  {viewingEntry.location && (
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#1AAB67]" />
                      {viewingEntry.location}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setViewingEntry(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Reading Body */}
              <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
                {/* Photo Gallery Grid */}
                {viewingEntry.photos && viewingEntry.photos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Photo Memories ({viewingEntry.photos.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {viewingEntry.photos.map((photo, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleOpenLightbox(viewingEntry.photos, idx)}
                          className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer border border-slate-200 dark:border-slate-800 group"
                        >
                          <img
                            src={photo}
                            alt={`Gallery ${idx}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full Story Content */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Diary Story
                  </h4>
                  <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-normal leading-relaxed whitespace-pre-wrap">
                    {viewingEntry.content}
                  </p>
                </div>

                {/* Tags */}
                {viewingEntry.tags && viewingEntry.tags.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap gap-1.5">
                      {viewingEntry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50 shrink-0">
                <button
                  onClick={() => setEntryToDelete(viewingEntry)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 cursor-pointer hover:bg-rose-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(viewingEntry)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1AAB67] hover:bg-#159257 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Entry</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {entryToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-xl">
                🗑️
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete this memory?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  This diary entry and its associated photos will be permanently removed.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEntryToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. FULL SCREEN LIGHTBOX */}
      <AnimatePresence>
        {lightboxImages && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4">
            {/* Top Bar */}
            <div className="w-full max-w-4xl flex items-center justify-between text-white py-2">
              <span className="text-xs font-bold text-slate-300">
                {lightboxIndex + 1} of {lightboxImages.length}
              </span>
              <button
                onClick={() => setLightboxImages(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image View */}
            <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center my-auto overflow-hidden">
              <img
                src={lightboxImages[lightboxIndex]}
                alt={`Full View ${lightboxIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
              />

              {lightboxImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setLightboxIndex((prev) =>
                        prev === 0 ? lightboxImages.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() =>
                      setLightboxIndex((prev) =>
                        prev === lightboxImages.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Thumbnails */}
            {lightboxImages.length > 1 && (
              <div className="flex gap-2 max-w-md overflow-x-auto py-2">
                {lightboxImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                      i === lightboxIndex
                        ? "border-[#1AAB67]"
                        : "border-transparent opacity-50"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

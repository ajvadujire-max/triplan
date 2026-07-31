import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trip,
  TimelineActivity,
  ActivityCategory,
  ActivityStatus,
  ReminderOption,
  ActivityAttachment,
  Traveller,
  TransportSegment,
} from "../types";
import {
  Clock,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  ExternalLink,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plane,
  Hotel,
  Car,
  Utensils,
  Compass,
  ShoppingBag,
  Sparkles,
  Camera,
  FileText,
  Hospital,
  Ticket,
  Box,
  Copy,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Layers,
  LayoutList,
  CalendarDays,
  Grid,
  Bell,
  Paperclip,
  TrendingUp,
  Navigation,
  X,
  Check,
  RotateCcw,
} from "lucide-react";

interface ActivityTimelineProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  hideSegments?: boolean;
  role?: string;
}

// Category Config with Icons & Colors
const CATEGORY_CONFIG: Record<
  string,
  { icon: React.FC<{ className?: string }>; color: string; bgColor: string; borderColor: string; label: string }
> = {
  Flights: {
    icon: Plane,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-950/60",
    borderColor: "border-sky-200 dark:border-sky-800",
    label: "Flights",
  },
  "Hotel Check-in": {
    icon: Hotel,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/60",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    label: "Hotel Check-in",
  },
  Hotel: {
    icon: Hotel,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/60",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    label: "Hotel Check-in",
  },
  Transport: {
    icon: Car,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/60",
    borderColor: "border-amber-200 dark:border-amber-800",
    label: "Transport",
  },
  Meals: {
    icon: Utensils,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/60",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    label: "Meals",
  },
  Food: {
    icon: Utensils,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/60",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    label: "Meals",
  },
  Sightseeing: {
    icon: Compass,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/60",
    borderColor: "border-cyan-200 dark:border-cyan-800",
    label: "Sightseeing",
  },
  Shopping: {
    icon: ShoppingBag,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/60",
    borderColor: "border-rose-200 dark:border-rose-800",
    label: "Shopping",
  },
  Events: {
    icon: Sparkles,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/60",
    borderColor: "border-purple-200 dark:border-purple-800",
    label: "Events",
  },
  Meetings: {
    icon: Users,
    color: "text-slate-600 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    borderColor: "border-slate-300 dark:border-slate-700",
    label: "Meetings",
  },
  Photography: {
    icon: Camera,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/60",
    borderColor: "border-violet-200 dark:border-violet-800",
    label: "Photography",
  },
  "Personal Notes": {
    icon: FileText,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/60",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    label: "Personal Notes",
  },
  Emergency: {
    icon: Hospital,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/60",
    borderColor: "border-red-200 dark:border-red-800",
    label: "Emergency",
  },
  Tickets: {
    icon: Ticket,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/60",
    borderColor: "border-orange-200 dark:border-orange-800",
    label: "Tickets",
  },
  "Custom Activity": {
    icon: Box,
    color: "text-zinc-600 dark:text-zinc-400",
    bgColor: "bg-zinc-100 dark:bg-zinc-800",
    borderColor: "border-zinc-300 dark:border-zinc-700",
    label: "Custom Activity",
  },
};

const ALL_CATEGORIES = [
  "Flights",
  "Hotel Check-in",
  "Transport",
  "Meals",
  "Sightseeing",
  "Shopping",
  "Events",
  "Meetings",
  "Photography",
  "Personal Notes",
  "Emergency",
  "Tickets",
  "Custom Activity",
];

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  trip,
  onUpdateTrip,
  hideSegments = false,
  role
}) => {
  // Navigation View Modes
  const [viewMode, setViewMode] = useState<"timeline" | "daily" | "weekly" | "agenda">("timeline");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTravellerId, setSelectedTravellerId] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");

  // Collapsed Days state
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // UI States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<TimelineActivity | null>(null);

  // Form Fields
  const [formTime, setFormTime] = useState("09:00 AM");
  const [formEndTime, setFormEndTime] = useState("10:30 AM");
  
  // Helper to format Date to datetime-local string (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Helper to format Date to display time (09:00 AM)
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ActivityCategory>("Sightseeing");
  const [formDesc, setFormDesc] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formDayIndex, setFormDayIndex] = useState(1);
  const [formAssignedTravellers, setFormAssignedTravellers] = useState<string[]>([]);
  const [formEstimatedCost, setFormEstimatedCost] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<ActivityStatus>("Upcoming");
  const [formNotes, setFormNotes] = useState("");
  const [formReminder, setFormReminder] = useState<ReminderOption>("15m");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");
  const [formAttachmentName, setFormAttachmentName] = useState("");
  const [formAttachments, setFormAttachments] = useState<ActivityAttachment[]>([]);

  // Helpers to format day key
  const getActivityDayKey = (act: TimelineActivity, index: number): string => {
    if (act.date) return act.date;
    if (act.dayIndex) return `Day ${act.dayIndex}`;
    return `Day 1`;
  };

  // Unified chronological timeline
  const unifiedTimeline = useMemo(() => {
    const items: (TimelineActivity | TransportSegment)[] = hideSegments 
      ? [...trip.timeline] 
      : [...trip.timeline, ...trip.segments];
    
    return items.sort((a, b) => {
      const aTime = 'activityDateTime' in a 
        ? (a.activityDateTime ? new Date(a.activityDateTime).getTime() : 0)
        : ('departureDateTime' in a && a.departureDateTime ? new Date(a.departureDateTime).getTime() : 0);
      const bTime = 'activityDateTime' in b
        ? (b.activityDateTime ? new Date(b.activityDateTime).getTime() : 0)
        : ('departureDateTime' in b && b.departureDateTime ? new Date(b.departureDateTime).getTime() : 0);
      return aTime - bTime;
    });
  }, [trip.timeline, trip.segments]);

  // Group timeline activities by day
  const groupedTimeline = useMemo<Record<string, (TimelineActivity | TransportSegment)[]>>(() => {
    let list = [...unifiedTimeline];
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        if ('title' in item) {
          return item.title.toLowerCase().includes(q) || 
                 (item.description && item.description.toLowerCase().includes(q)) ||
                 (item.location && item.location.toLowerCase().includes(q));
        } else {
          return item.from.toLowerCase().includes(q) || 
                 item.to.toLowerCase().includes(q) ||
                 item.transportType.toLowerCase().includes(q);
        }
      });
    }

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter((item) => {
        if ('category' in item) {
          if (selectedCategory === "Meals") return item.category === "Meals" || item.category === "Food";
          if (selectedCategory === "Hotel Check-in") return item.category === "Hotel Check-in" || item.category === "Hotel";
          return item.category === selectedCategory;
        } else {
          return selectedCategory === "Transport";
        }
      });
    }

    // Traveller filter
    if (selectedTravellerId !== "all") {
      list = list.filter((item) => {
        if ('assignedTravellerIds' in item) {
          return item.assignedTravellerIds?.includes(selectedTravellerId);
        }
        return true;
      });
    }

    // Grouping by day
    const groups: Record<string, (TimelineActivity | TransportSegment)[]> = {};

    list.forEach((item, idx) => {
      let dayKey = "Unknown Date";
      if ('date' in item && item.date) {
        dayKey = item.date;
      } else if ('departureDateTime' in item && item.departureDateTime) {
        dayKey = item.departureDateTime.split('T')[0];
      } else if ('departure' in item && item.departure.includes('-')) {
         const parts = item.departure.split(',');
         if (parts.length >= 2) dayKey = parts[0].trim();
      }
      
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(item);
    });

    // Filter by selected day
    if (selectedDay !== "all") {
      const filteredGroups: Record<string, (TimelineActivity | TransportSegment)[]> = {};
      if (groups[selectedDay]) {
        filteredGroups[selectedDay] = groups[selectedDay];
      }
      return filteredGroups;
    }

    return groups;
  }, [unifiedTimeline, searchQuery, selectedCategory, selectedTravellerId, selectedDay]);

  // All Day Keys
  const allDayKeys = useMemo(() => {
    const keys = Object.keys(groupedTimeline).sort((a, b) => {
      // Try to sort by date
      const timeA = new Date(a).getTime();
      const timeB = new Date(b).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) return timeA - timeB;
      return a.localeCompare(b);
    });
    if (keys.length === 0) return ["Day 1"];
    return keys;
  }, [groupedTimeline]);

  // Smart Stats Calculation
  const stats = useMemo(() => {
    const totalActivities = trip.timeline.length;
    const totalSegments = trip.segments.length;
    const completedActivities = trip.timeline.filter((a) => a.status === "Completed").length;
    const completionRateValue = totalActivities + totalSegments > 0 
      ? Math.round(((completedActivities + totalSegments) / (totalActivities + totalSegments)) * 100) 
      : 0;
    
    const completionRate = isNaN(completionRateValue) ? 0 : completionRateValue;

    const activityCost = trip.timeline.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
    const transportCost = trip.segments.reduce((sum, s) => sum + (s.fare || 0), 0);
    const totalCost = activityCost + transportCost;

    const totalDist = trip.segments.reduce((sum, s) => sum + (s.distanceKm || 0), 0);

    // Sum travel times
    const totalActivityTravelMins = trip.timeline.reduce(
      (sum, a) => sum + (a.travelTimeFromPreviousMinutes || 0),
      0
    );
    
    // Parse segment durations (e.g., "2h 30m")
    const totalSegmentMins = trip.segments.reduce((sum, s) => {
      const hours = s.duration.match(/(\d+)h/);
      const mins = s.duration.match(/(\d+)m/);
      let m = 0;
      if (hours) m += parseInt(hours[1]) * 60;
      if (mins) m += parseInt(mins[1]);
      return sum + m;
    }, 0);

    const totalTravelMins = totalActivityTravelMins + totalSegmentMins;
    const travelHours = Math.floor(totalTravelMins / 60);
    const travelMinsLeft = totalTravelMins % 60;

    // Idle time estimate
    const totalIdleMins = Math.max(0, (totalActivities + totalSegments) * 45 - totalTravelMins);
    const idleHours = (totalIdleMins / 60).toFixed(1);

    return {
      totalActivities,
      totalSegments,
      completedActivities,
      completionRate,
      totalCost,
      transportCost,
      activityCost,
      totalDist,
      travelTimeString: `${travelHours > 0 ? `${travelHours}h ` : ""}${travelMinsLeft}m`,
      idleHours,
    };
  }, [trip.timeline, trip.segments]);

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingActivity(null);
    
    // Smart Prefill Logic
    let defaultStart = new Date();
    
    if (unifiedTimeline.length > 0) {
      // Use absolute last item's end time
      const lastItem = unifiedTimeline[unifiedTimeline.length - 1];
      if ('activityEndDateTime' in lastItem && lastItem.activityEndDateTime) {
        defaultStart = new Date(lastItem.activityEndDateTime);
      } else if ('activityDateTime' in lastItem && lastItem.activityDateTime) {
        defaultStart = new Date(lastItem.activityDateTime);
        defaultStart.setHours(defaultStart.getHours() + 1);
      } else if ('arrivalDateTime' in lastItem && lastItem.arrivalDateTime) {
        defaultStart = new Date(lastItem.arrivalDateTime);
      }
    } else if (trip.startDate) {
      // Use trip start date at 9 AM
      defaultStart = new Date(trip.startDate);
      defaultStart.setHours(9, 0, 0, 0);
    }

    if (selectedDay !== "all" && !selectedDay.startsWith("Day")) {
      // If a specific date is selected in filter, use that date but keep time
      const selDate = new Date(selectedDay);
      if (!isNaN(selDate.getTime())) {
        defaultStart.setFullYear(selDate.getFullYear(), selDate.getMonth(), selDate.getDate());
      }
    }

    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(defaultStart.getHours() + 1);

    setFormTime(formatTime(defaultStart));
    setFormEndTime(formatTime(defaultEnd));
    setFormTitle("");
    setFormCategory("Sightseeing");
    setFormDesc("");
    setFormLocation(trip.destination);
    setFormDate(defaultStart.toISOString().split('T')[0]);
    setFormDayIndex(1);
    setFormAssignedTravellers(trip.travellers.map((t) => t.id));
    setFormEstimatedCost(1000);
    setFormStatus("Upcoming");
    setFormNotes("");
    setFormReminder("15m");
    setFormAttachments([]);
    setFormAttachmentName("");
    setFormAttachmentUrl("");
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (activity: TimelineActivity) => {
    setEditingActivity(activity);
    setFormTime(activity.time || "09:00 AM");
    setFormEndTime(activity.endTime || "10:30 AM");
    setFormTitle(activity.title || "");
    setFormCategory(activity.category || "Sightseeing");
    setFormDesc(activity.description || "");
    setFormLocation(activity.location || trip.destination);
    setFormDate(activity.date || trip.startDate || "");
    setFormDayIndex(activity.dayIndex || 1);
    setFormAssignedTravellers(activity.assignedTravellerIds || []);
    setFormEstimatedCost(activity.estimatedCost || 0);
    setFormStatus(activity.status || "Upcoming");
    setFormNotes(activity.notes || "");
    setFormReminder(activity.reminder || "15m");
    setFormAttachments(activity.attachments || []);
    setFormAttachmentName("");
    setFormAttachmentUrl("");
    setIsModalOpen(true);
  };

  // Duplicate Activity
  const handleDuplicate = (act: TimelineActivity) => {
    const duplicated: TimelineActivity = {
      ...act,
      id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: `${act.title} (Copy)`,
    };
    onUpdateTrip({
      ...trip,
      timeline: [...trip.timeline, duplicated],
    });
  };

  // Delete Activity
  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      onUpdateTrip({
        ...trip,
        timeline: trip.timeline.filter((a) => a.id !== confirmDeleteId),
      });
      setConfirmDeleteId(null);
      showToast("Activity deleted");
    }
  };

  // Toggle Activity Completed Status
  const handleToggleStatus = (act: TimelineActivity) => {
    const newStatus: ActivityStatus = act.status === "Completed" ? "Upcoming" : "Completed";
    const updated = trip.timeline.map((a) => (a.id === act.id ? { ...a, status: newStatus } : a));
    onUpdateTrip({
      ...trip,
      timeline: updated,
    });
  };

  // Move Activity Up or Down in order
  const handleMoveOrder = (actId: string, direction: "up" | "down") => {
    const index = trip.timeline.findIndex((a) => a.id === actId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= trip.timeline.length) return;

    const list = [...trip.timeline];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    onUpdateTrip({
      ...trip,
      timeline: list,
    });
  };

  // Shift Activity Time (+/- 15 mins)
  const handleShiftTime = (act: TimelineActivity, deltaMinutes: number) => {
    // Basic time parser/formatter
    let [timeStr, period] = act.time.split(" ");
    if (!period) period = "AM";
    let [hours, mins] = timeStr.split(":").map((n) => parseInt(n) || 0);
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    let totalMins = hours * 60 + mins + deltaMinutes;
    if (totalMins < 0) totalMins += 24 * 60;
    totalMins = totalMins % (24 * 60);

    let newHours = Math.floor(totalMins / 60);
    let newMins = totalMins % 60;
    let newPeriod = newHours >= 12 ? "PM" : "AM";
    let displayHours = newHours % 12;
    if (displayHours === 0) displayHours = 12;

    const newTime = `${displayHours.toString().padStart(2, "0")}:${newMins
      .toString()
      .padStart(2, "0")} ${newPeriod}`;

    const updated = trip.timeline.map((a) => (a.id === act.id ? { ...a, time: newTime } : a));
    onUpdateTrip({
      ...trip,
      timeline: updated,
    });
  };

  // Add Attachment to Form
  const handleAddAttachment = () => {
    if (!formAttachmentName.trim() || !formAttachmentUrl.trim()) return;
    const newAtt: ActivityAttachment = {
      id: `att_${Date.now()}`,
      name: formAttachmentName.trim(),
      url: formAttachmentUrl.trim(),
    };
    setFormAttachments((prev) => [...prev, newAtt]);
    setFormAttachmentName("");
    setFormAttachmentUrl("");
  };

  // Remove Attachment from Form
  const handleRemoveAttachment = (attId: string) => {
    setFormAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Form Submit (Create / Edit)
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingActivity) {
      // Edit
      const startD = new Date(`${formDate} ${formTime}`);
      const endD = new Date(`${formDate} ${formEndTime}`);

      const updatedActivity: TimelineActivity = {
        ...editingActivity,
        time: formTime,
        endTime: formEndTime,
        activityDateTime: startD.toISOString(),
        activityEndDateTime: endD.toISOString(),
        title: formTitle.trim(),
        category: formCategory,
        description: formDesc.trim(),
        location: formLocation.trim(),
        date: formDate,
        dayIndex: Number(formDayIndex),
        assignedTravellerIds: formAssignedTravellers,
        estimatedCost: Number(formEstimatedCost) || 0,
        status: formStatus,
        notes: formNotes.trim(),
        reminder: formReminder,
        attachments: formAttachments,
      };

      onUpdateTrip({
        ...trip,
        timeline: trip.timeline.map((a) => (a.id === editingActivity.id ? updatedActivity : a)),
      });
    } else {
      // Create
      const startD = new Date(`${formDate} ${formTime}`);
      const endD = new Date(`${formDate} ${formEndTime}`);

      const newActivity: TimelineActivity = {
        id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        tripId: trip.id,
        time: formTime,
        endTime: formEndTime,
        activityDateTime: startD.toISOString(),
        activityEndDateTime: endD.toISOString(),
        title: formTitle.trim(),
        category: formCategory,
        description: formDesc.trim(),
        location: formLocation.trim() || trip.destination,
        date: formDate || trip.startDate,
        dayIndex: Number(formDayIndex) || 1,
        assignedTravellerIds: formAssignedTravellers,
        estimatedCost: Number(formEstimatedCost) || 0,
        status: formStatus,
        notes: formNotes.trim(),
        reminder: formReminder,
        attachments: formAttachments,
        distanceFromPreviousKm: Math.floor(Math.random() * 15) + 3,
        travelTimeFromPreviousMinutes: Math.floor(Math.random() * 25) + 10,
      };

      onUpdateTrip({
        ...trip,
        timeline: [...trip.timeline, newActivity],
      });
    }

    setIsModalOpen(false);
  };

  // Google Maps Search Helper
  const handleOpenGoogleMaps = (loc: string) => {
    const query = `${loc} ${trip.destination}`.trim();
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank");
  };

  // Toggle Collapse for a Day
  const toggleCollapseDay = (dayKey: string) => {
    setCollapsedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  // Category Icon helper
  const getCategoryInfo = (cat: string) => {
    return CATEGORY_CONFIG[cat] || CATEGORY_CONFIG["Custom Activity"];
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn">
      {/* 1. STICKY PAGE HEADER */}
      <div className="relative sm:sticky sm:top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
              Central Itinerary Engine
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">• {trip.name}</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2 mt-1">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 dark:text-cyan-400" />
            Activity Timeline
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            Schedule, manage, and coordinate all activities, locations, costs, and travellers.
          </p>
        </div>

        {/* View Switcher & Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* View Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                viewMode === "timeline"
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <LayoutList className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Timeline
            </button>

            <button
              onClick={() => setViewMode("daily")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                viewMode === "daily"
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Daily
            </button>

            <button
              onClick={() => setViewMode("weekly")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                viewMode === "weekly"
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Grid className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Weekly
            </button>

            <button
              onClick={() => setViewMode("agenda")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                viewMode === "agenda"
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Agenda
            </button>
          </div>

          {role !== "traveller" && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] sm:text-sm font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Add Activity
            </button>
          )}
        </div>
      </div>

      {/* 2. SMART STATS DASHBOARD HEADER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Events</p>
          <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.totalActivities + stats.totalSegments}</p>
          <p className="text-[9px] sm:text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold mt-1">
            {stats.totalActivities} Act + {stats.totalSegments} Seg
          </p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completion</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completionRate}%</p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Travel Distance</p>
          <p className="text-base sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.totalDist.toLocaleString()} KM</p>
          <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Navigation className="w-2.5 h-2.5 text-indigo-500" /> Across {stats.totalSegments} Seg
          </p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Travel Time</p>
          <p className="text-base sm:text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{stats.travelTimeString}</p>
          <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">Movement duration</p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Combined Cost</p>
          <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {trip.currency}{stats.totalCost.toLocaleString()}
          </p>
          <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">Act + Transport</p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trip Duration</p>
          <p className="text-[11px] sm:text-sm font-bold text-slate-900 dark:text-white mt-1">
            {trip.totalDuration || "5 Days"}
          </p>
          <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">{trip.destination}</p>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 sm:left-3.5 sm:top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities by title, description, notes or location..."
            className="w-full pl-8.5 pr-3 py-1.5 sm:pl-10 sm:pr-4 sm:py-2 text-[11px] sm:text-xs rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          {/* Day Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Days</option>
              {allDayKeys.map((dk) => (
                <option key={dk} value={dk}>
                  {dk}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs">
            <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Traveller Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs">
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
            <select
              value={selectedTravellerId}
              onChange={(e) => setSelectedTravellerId(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Travellers</option>
              {trip.travellers.map((trv) => (
                <option key={trv.id} value={trv.id}>
                  {trv.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          {(searchQuery || selectedCategory !== "all" || selectedTravellerId !== "all" || selectedDay !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedTravellerId("all");
                setSelectedDay("all");
              }}
              className="p-1.5 sm:p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN CONTENT VIEWS */}
      {Object.keys(groupedTimeline).length === 0 ? (
        /* Empty State */
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 my-6">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto border border-cyan-200 dark:border-cyan-800">
            <Clock className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No Timeline Activities Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No scheduled activities match your filter. Add your first itinerary item or clear your search filters.
            </p>
          </div>
          {role !== "traveller" && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Add First Activity
            </button>
          )}
        </div>
      ) : viewMode === "timeline" ? (
        /* ---------------- VIEW 1: VERTICAL TIMELINE VIEW ---------------- */
        <div className="space-y-3 sm:space-y-6">
          {Object.entries(groupedTimeline).map(([dayKey, items]: [string, (TimelineActivity | TransportSegment)[]]) => {
            const isCollapsed = collapsedDays[dayKey];
            const activities = items.filter(i => 'status' in i) as TimelineActivity[];
            const dayCompleted = activities.filter((a) => a.status === "Completed").length;

            return (
              <div
                key={dayKey}
                className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Day Accordion Header */}
                <div
                  onClick={() => toggleCollapseDay(dayKey)}
                  className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-cyan-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                        {dayKey}
                        <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                          {activities.length} Activities
                        </span>
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                        {dayCompleted} of {activities.length} completed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-16 sm:w-24 bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{
                          width: `${activities.length > 0 ? Math.min(100, Math.round((dayCompleted / activities.length) * 100)) : 0}%`,
                        }}
                      />
                    </div>

                    <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {isCollapsed ? <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                </div>

                {/* Day Timeline Content */}
                {!isCollapsed && (
                  <div className="p-3.5 sm:p-6 space-y-3 sm:space-y-6 relative border-l-2 border-cyan-200 dark:border-cyan-800/80 ml-4 sm:ml-8 my-2">
                    {items.map((item, index) => {
                      const isActivity = 'title' in item && 'category' in item;
                      
                      if (isActivity) {
                        const act = item as TimelineActivity;
                        const catInfo = getCategoryInfo(act.category);
                        const CategoryIcon = catInfo.icon;
                        const isCompleted = act.status === "Completed";
                        const assignedTravellers = trip.travellers.filter((t) =>
                          act.assignedTravellerIds?.includes(t.id)
                        );

                        return (
                          <div key={act.id} className="relative pl-4 sm:pl-8 group">
                            {/* Timeline Point Node */}
                            <div
                              className={`absolute -left-[19px] sm:-left-[39px] top-1 sm:top-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center shadow-md transition-all ${
                                isCompleted
                                  ? "bg-emerald-500 border-white text-white"
                                  : `${catInfo.bgColor} ${catInfo.borderColor} ${catInfo.color}`
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              ) : (
                                <CategoryIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              )}
                            </div>

                            {/* Activity Card */}
                            <div
                              className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all space-y-2.5 sm:space-y-3 ${
                                isCompleted
                                  ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/50"
                                  : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-sm hover:border-cyan-300 dark:hover:border-cyan-700"
                              }`}
                            >
                              {/* Card Header Row */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2 sm:pb-3">
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  {/* Time Badge */}
                                  <span className="font-extrabold text-[10px] sm:text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    {act.time}
                                    {act.endTime ? ` - ${act.endTime}` : ""}
                                  </span>

                                  {/* Category Badge */}
                                  <span
                                    className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border flex items-center gap-1 ${catInfo.bgColor} ${catInfo.color} ${catInfo.borderColor}`}
                                  >
                                    <CategoryIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    {catInfo.label}
                                  </span>

                                  {/* Reminder Badge */}
                                  {act.reminder && act.reminder !== "none" && (
                                    <span className="text-[9px] sm:text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                      <Bell className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {act.reminder}
                                    </span>
                                  )}

                                  {/* Status Badge */}
                                  <button
                                    onClick={() => handleToggleStatus(act)}
                                    className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${
                                      isCompleted
                                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                                        : act.status === "In Progress"
                                        ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300"
                                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300"
                                    }`}
                                  >
                                    {act.status || "Upcoming"}
                                  </button>
                                </div>

                                {/* Card Quick Actions */}
                                {role !== "traveller" && (
                                  <div className="flex items-center gap-1 self-end sm:self-auto">
                                    {/* Time shift buttons */}
                                    <button
                                      onClick={() => handleShiftTime(act, -15)}
                                      title="Shift 15m earlier"
                                      className="p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded transition-colors text-[9px] sm:text-[10px] font-bold"
                                    >
                                      -15m
                                    </button>
                                    <button
                                      onClick={() => handleShiftTime(act, 15)}
                                      title="Shift 15m later"
                                      className="p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded transition-colors text-[9px] sm:text-[10px] font-bold"
                                    >
                                      +15m
                                    </button>
  
                                    {/* Move Up / Down */}
                                    <button
                                      onClick={() => handleMoveOrder(act.id, "up")}
                                      title="Move Up"
                                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                                    >
                                      <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveOrder(act.id, "down")}
                                      title="Move Down"
                                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                                    >
                                      <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
  
                                    {/* Duplicate */}
                                    <button
                                      onClick={() => handleDuplicate(act)}
                                      title="Duplicate Activity"
                                      className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded transition-colors"
                                    >
                                      <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
  
                                    {/* Edit */}
                                    <button
                                      onClick={() => handleOpenEdit(act)}
                                      title="Edit Activity"
                                      className="p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded transition-colors"
                                    >
                                      <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
  
                                    {/* Delete */}
                                    <button
                                      onClick={() => handleDelete(act.id)}
                                      title="Delete Activity"
                                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Title & Description */}
                              <div>
                                <h4
                                  className={`text-sm sm:text-base font-bold text-slate-900 dark:text-white ${
                                    isCompleted ? "line-through opacity-75" : ""
                                  }`}
                                >
                                  {act.title}
                                </h4>
                                {act.description && (
                                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                                    {act.description}
                                  </p>
                                )}
                              </div>

                              {/* Location & Map Metrics Row */}
                              {act.location && (
                                <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] sm:text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="truncate max-w-[200px] sm:max-w-none">{act.location}</span>
                                  </div>

                                  <div className="flex items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] text-slate-500 shrink-0">
                                    {act.distanceFromPreviousKm && (
                                      <span>
                                        Dist: <b>{act.distanceFromPreviousKm} km</b>
                                      </span>
                                    )}
                                    {act.travelTimeFromPreviousMinutes && (
                                      <span>
                                        Drive: <b>{act.travelTimeFromPreviousMinutes}m</b>
                                      </span>
                                    )}
                                    <button
                                      onClick={() => handleOpenGoogleMaps(act.location!)}
                                      className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-bold hover:underline"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" /> Maps
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Footer Metrics Row: Assigned Travellers & Cost */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5 text-[10px] sm:text-xs">
                                {/* Assigned Travellers */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">Assigned:</span>
                                  {assignedTravellers.length > 0 ? (
                                    <div className="flex items-center -space-x-1">
                                      {assignedTravellers.map((trv) => (
                                        <img
                                          key={trv.id}
                                          src={
                                            trv.profilePhoto ||
                                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop"
                                          }
                                          alt={trv.fullName}
                                          title={trv.fullName}
                                          className="w-5 h-5 rounded-full object-cover border border-white dark:border-slate-800"
                                        />
                                      ))}
                                      <span className="text-[9px] sm:text-[10px] text-slate-500 ml-1.5 font-medium">
                                        ({assignedTravellers.length})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] sm:text-[11px] text-slate-400 italic">All squad</span>
                                  )}
                                </div>

                                {/* Estimated Cost */}
                                {(act.estimatedCost || 0) > 0 && (
                                  <div className="flex items-center gap-1 text-slate-900 dark:text-white font-bold">
                                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal">Est. Cost:</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs">
                                      {trip.currency}
                                      {act.estimatedCost?.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Attachments & Notes */}
                              {((act.attachments && act.attachments.length > 0) || act.notes) && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs">
                                  {act.notes && (
                                    <p className="text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 italic">
                                      📝 {act.notes}
                                    </p>
                                  )}

                                  {act.attachments && act.attachments.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <Paperclip className="w-3 h-3 text-slate-400" />
                                      {act.attachments.map((att) => (
                                        <a
                                          key={att.id}
                                          href={att.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] sm:text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                                        >
                                          {att.name}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        // Render Journey Segment
                        const seg = item as TransportSegment;
                        return (
                          <div key={seg.id} className="relative pl-4 sm:pl-8 group">
                            <div className="absolute -left-[19px] sm:-left-[39px] top-1 sm:top-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                              <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <Car className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        {seg.transportType} Segment
                                      </span>
                                      <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                                      <span className="text-[10px] font-bold text-slate-500">
                                        {seg.departure.split(",")[1] || seg.departure}
                                      </span>
                                      {seg.status && (
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                          seg.status === "Confirmed" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" : "bg-amber-50 dark:bg-amber-950/40 text-amber-600"
                                        }`}>
                                          {seg.status}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                                      {seg.from} → {seg.to}
                                    </h4>
                                    {seg.operator && (
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                          Operator:
                                        </span>
                                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                                          {seg.operator}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                                  <div className="text-right">
                                    <div className="text-xs font-black text-slate-900 dark:text-white">
                                      {seg.duration}
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                      {seg.distanceKm} KM
                                    </div>
                                  </div>
                                  {seg.fare > 0 && (
                                    <div className="px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                      {trip.currency}{seg.fare.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === "daily" ? (
        /* ---------------- VIEW 2: DAILY VIEW ---------------- */
        <div className="space-y-4 sm:space-y-6">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
            {allDayKeys.map((dk) => {
              const count = (groupedTimeline[dk] || []).length;
              const isActive = selectedDay === dk;
              return (
                <button
                  key={dk}
                  onClick={() => setSelectedDay(dk)}
                  className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? "bg-cyan-600 text-white border-cyan-600 shadow-md"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {dk} ({count})
                </button>
              );
            })}
          </div>

          {/* Daily Schedule List */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {(groupedTimeline[selectedDay === "all" ? allDayKeys[0] : selectedDay] || []).map((item) => {
              const isActivity = 'title' in item && 'category' in item;
              
              if (isActivity) {
                const act = item as TimelineActivity;
                const catInfo = getCategoryInfo(act.category);
                const CategoryIcon = catInfo.icon;

                return (
                  <div
                    key={act.id}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 ${catInfo.bgColor} ${catInfo.color} ${catInfo.borderColor}`}
                      >
                        <CategoryIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="font-extrabold text-[10px] sm:text-xs text-cyan-600 dark:text-cyan-400">
                            {act.time}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {act.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                          {act.title}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {act.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-end sm:self-auto">
                      {act.location && (
                        <button
                          onClick={() => handleOpenGoogleMaps(act.location!)}
                          className="flex items-center gap-0.5 text-[11px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Map
                        </button>
                      )}
                      {role !== "traveller" && (
                        <button
                          onClick={() => handleOpenEdit(act)}
                          className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              } else {
                const seg = item as TransportSegment;
                return (
                  <div
                    key={seg.id}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center shrink-0">
                        <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="font-extrabold text-[10px] sm:text-xs text-indigo-600">
                            {seg.departure.split(',')[1] || seg.departure}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                            {seg.transportType}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                          {seg.from} → {seg.to}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {seg.operator ? `${seg.operator} • ` : ""}{seg.distanceKm} KM • {seg.duration}
                        </p>
                      </div>
                    </div>
                    {seg.fare > 0 && (
                      <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-black text-indigo-600 dark:text-indigo-400 self-end sm:self-auto">
                        {trip.currency}{seg.fare.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </div>
        </div>
      ) : viewMode === "weekly" ? (
        /* ---------------- VIEW 3: WEEKLY GRID VIEW ---------------- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {allDayKeys.map((dk) => {
            const dayActs = groupedTimeline[dk] || [];
            return (
              <div
                key={dk}
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 sm:space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 sm:pb-2">
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">{dk}</h3>
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-600">
                    {dayActs.length} Activities
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {dayActs.map((item) => {
                    if ('title' in item) {
                      const act = item as TimelineActivity;
                      const catInfo = getCategoryInfo(act.category);
                      return (
                        <div
                          key={act.id}
                          className="p-2 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[10px] sm:text-xs space-y-0.5 sm:space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-cyan-600 dark:text-cyan-400">{act.time}</span>
                            <span className={`text-[8px] sm:text-[9px] px-1 py-0.5 rounded border ${catInfo.bgColor} ${catInfo.color} ${catInfo.borderColor}`}>
                              {act.category}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 dark:text-white text-[10px] sm:text-xs">{act.title}</p>
                        </div>
                      );
                    } else {
                      const seg = item as TransportSegment;
                      return (
                        <div
                          key={seg.id}
                          className="p-2 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 text-[10px] sm:text-xs space-y-0.5 sm:space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-indigo-600">{seg.departure.split(',')[1] || seg.departure}</span>
                            <span className="text-[8px] px-1 py-0.5 rounded border border-indigo-200 bg-indigo-100 text-indigo-700">
                              Transport
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 dark:text-white text-[10px] sm:text-xs truncate">{seg.from} → {seg.to}</p>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ---------------- VIEW 4: AGENDA TABLE VIEW ---------------- */
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] sm:text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-2 sm:p-3.5">Day & Time</th>
                  <th className="p-2 sm:p-3.5">Activity</th>
                  <th className="p-2 sm:p-3.5">Category</th>
                  <th className="p-2 sm:p-3.5">Location</th>
                  <th className="p-2 sm:p-3.5">Cost</th>
                  <th className="p-2 sm:p-3.5">Status</th>
                  <th className="p-2 sm:p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(groupedTimeline).flatMap(([dk, items]: [string, (TimelineActivity | TransportSegment)[]]) =>
                  items.map((item) => {
                    const isActivity = 'title' in item && 'category' in item;
                    
                    if (isActivity) {
                      const act = item as TimelineActivity;
                      const catInfo = getCategoryInfo(act.category);

                      return (
                        <tr key={act.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-2 sm:p-3.5 whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-white block">{dk}</span>
                            <span className="text-[10px] sm:text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">{act.time}</span>
                          </td>
                          <td className="p-2 sm:p-3.5">
                            <p className="font-bold text-slate-900 dark:text-white">{act.title}</p>
                            {act.description && <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1">{act.description}</p>}
                          </td>
                          <td className="p-2 sm:p-3.5 whitespace-nowrap">
                            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border ${catInfo.bgColor} ${catInfo.color} ${catInfo.borderColor}`}>
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {act.location || "-"}
                          </td>
                          <td className="p-2 sm:p-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                            {act.estimatedCost ? `${trip.currency}${act.estimatedCost.toLocaleString()}` : "-"}
                          </td>
                          <td className="p-2 sm:p-3.5 whitespace-nowrap">
                            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {act.status || "Upcoming"}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-right">
                            {role !== "traveller" && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(act)}
                                  className="p-1 text-slate-400 hover:text-cyan-600 mr-1"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(act.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    } else {
                      const seg = item as TransportSegment;
                      return (
                        <tr key={seg.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors bg-indigo-50/20 dark:bg-indigo-950/10">
                          <td className="p-2 sm:p-3.5 whitespace-nowrap">
                            <span className="font-bold text-indigo-900 dark:text-indigo-300 block">{dk}</span>
                            <span className="text-[10px] sm:text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">{seg.departure.split(',')[1] || seg.departure}</span>
                          </td>
                          <td className="p-2 sm:p-3.5">
                            <p className="font-bold text-slate-900 dark:text-white">{seg.from} → {seg.to}</p>
                            <p className="text-[10px] sm:text-[11px] text-slate-500">{seg.transportType} Journey</p>
                          </td>
                          <td className="p-2 sm:p-3.5 whitespace-nowrap">
                            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border border-indigo-200 bg-indigo-50 text-indigo-600">
                              Transport
                            </span>
                          </td>
                          <td className="p-2 sm:p-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            -
                          </td>
                          <td className="p-2 sm:p-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                            -
                          </td>
                          <td className="p-2 sm:p-3.5 whitespace-nowrap">
                            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              Transit
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-right">
                            <span className="text-[10px] text-slate-400 italic">Segment</span>
                          </td>
                        </tr>
                      );
                    }
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ADD / EDIT ACTIVITY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[85vh] sm:max-h-[90vh] space-y-5 mt-auto sm:mt-0"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-600" />
                  {editingActivity ? "Edit Timeline Activity" : "Add New Timeline Activity"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fill in event details, timing, location, cost, and assign travellers.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              {/* Row 1: Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Activity Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Scuba Diving at Grand Island"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ActivityCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Day / Date & Start / End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Day #</label>
                  <input
                    type="number"
                    min="1"
                    value={formDayIndex}
                    onChange={(e) => setFormDayIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date (Optional)</label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Time</label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Time</label>
                  <input
                    type="text"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Location & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Baga Beach, Calangute"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Est. Cost ({trip.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formEstimatedCost}
                    onChange={(e) => setFormEstimatedCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Status & Reminder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ActivityStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Reminder</label>
                  <select
                    value={formReminder}
                    onChange={(e) => setFormReminder(e.target.value as ReminderOption)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                  >
                    <option value="none">No Reminder</option>
                    <option value="15m">15 minutes before</option>
                    <option value="30m">30 minutes before</option>
                    <option value="1h">1 hour before</option>
                    <option value="1d">1 day before</option>
                  </select>
                </div>
              </div>

              {/* Assigned Travellers */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assigned Travellers</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {trip.travellers.map((trv) => {
                    const isSelected = formAssignedTravellers.includes(trv.id);
                    return (
                      <button
                        key={trv.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormAssignedTravellers(formAssignedTravellers.filter((id) => id !== trv.id));
                          } else {
                            setFormAssignedTravellers([...formAssignedTravellers, trv.id]);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 border-cyan-300"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-cyan-500" : "bg-slate-300"}`} />
                        {trv.fullName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description & Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Details, booking reference, instructions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Personal Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Carry waterproof phone bag & extra towel"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              {/* Attachments Upload */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" /> Attachments / Vouchers
                </label>

                {formAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formAttachments.map((att) => (
                      <span
                        key={att.id}
                        className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        {att.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formAttachmentName}
                    onChange={(e) => setFormAttachmentName(e.target.value)}
                    placeholder="Doc Name (e.g. Scuba Ticket)"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={formAttachmentUrl}
                    onChange={(e) => setFormAttachmentUrl(e.target.value)}
                    placeholder="URL (https://...)"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                  >
                    + Add Link
                  </button>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
                >
                  {editingActivity ? "Save Changes" : "Create Activity"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

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
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
                <Trash2 className="w-6 h-6" />
                <h3 className="text-lg font-black">Delete Activity?</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to remove this activity? This will also delete any reminders associated with it.
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
    </div>
  );
};

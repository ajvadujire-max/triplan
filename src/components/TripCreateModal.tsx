/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Trip, TripPurpose, TripStatus } from "../types";
import { X, Image as ImageIcon, Palette, Compass, Loader2 } from "lucide-react";
import { getRichDefaultChecklist } from "../utils/checklistDefaults";
import { auth } from "../lib/firebase";
import { useModalBack } from "../hooks/useModalBack";

interface TripCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrip: (trip: Trip) => void | Promise<void>;
  initialTrip?: Trip | null;
}

const defaultCovers = [
  "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1000&auto=format&fit=crop", // Beach
  "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?q=80&w=1000&auto=format&fit=crop", // Mountains
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop", // Dubai skyline
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop", // Ocean sunset
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000&auto=format&fit=crop", // Road trip
];

const getTodayYMD = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getSevenDaysLaterYMD = () => {
  const later = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const year = later.getFullYear();
  const month = String(later.getMonth() + 1).padStart(2, "0");
  const day = String(later.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForInput = (dateVal: any, fallback: string = ""): string => {
  if (!dateVal) return fallback;

  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    const ymdMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymdMatch) {
      return ymdMatch[1];
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return fallback;
  }

  if (typeof dateVal === "object") {
    let d: Date | null = null;
    if (typeof dateVal.toDate === "function") {
      d = dateVal.toDate();
    } else if (typeof dateVal.seconds === "number") {
      d = new Date(dateVal.seconds * 1000);
    } else if (dateVal instanceof Date) {
      d = dateVal;
    }
    if (d && !isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  return fallback;
};

export const TripCreateModal: React.FC<TripCreateModalProps> = ({
  isOpen,
  onClose,
  onSaveTrip,
  initialTrip,
}) => {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState<TripPurpose>("Vacation");
  const [startDate, setStartDate] = useState(getTodayYMD());
  const [endDate, setEndDate] = useState(getSevenDaysLaterYMD());
  const [color, setColor] = useState("#06b6d4");
  const [coverPhoto, setCoverPhoto] = useState(defaultCovers[0]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<TripStatus>("Upcoming");
  const [currency, setCurrency] = useState("₹");
  const [travelCategory, setTravelCategory] = useState("Family Vacation");
  const [totalBudget, setTotalBudget] = useState<number | "">(30000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useModalBack(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      if (initialTrip) {
        setName(initialTrip.name || (initialTrip as any).tripName || "");
        setDestination(initialTrip.destination || (initialTrip as any).location || "");
        setPurpose(initialTrip.purpose || (initialTrip as any).type || "Vacation");
        setStartDate(formatDateForInput(initialTrip.startDate, getTodayYMD()));
        setEndDate(formatDateForInput(initialTrip.endDate, getSevenDaysLaterYMD()));
        setColor(initialTrip.color || "#06b6d4");
        setCoverPhoto(initialTrip.coverPhoto || initialTrip.coverImage || defaultCovers[0]);
        setNotes(initialTrip.notes || "");
        setStatus(initialTrip.status || "Upcoming");
        setCurrency(initialTrip.currency || "₹");
        setTravelCategory(initialTrip.travelCategory || "Family Vacation");
        setTotalBudget(initialTrip.totalBudget ?? initialTrip.expectedBudget ?? 30000);
      } else {
        setName("");
        setDestination("");
        setPurpose("Vacation");
        setStartDate(getTodayYMD());
        setEndDate(getSevenDaysLaterYMD());
        setColor("#06b6d4");
        setCoverPhoto(defaultCovers[0]);
        setNotes("");
        setStatus("Upcoming");
        setCurrency("₹");
        setTravelCategory("Family Vacation");
        setTotalBudget(30000);
      }
    }
  }, [isOpen, initialTrip]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !destination.trim() || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      const orgUid = currentUser?.uid || initialTrip?.organizerId || "trv_ajva";
      const orgName = currentUser?.displayName || "Primary Organizer";
      const orgEmail = currentUser?.email || "organizer@example.com";
      const numBudget = Number(totalBudget) || 0;

      const tripToSave: Trip = initialTrip
        ? {
            ...initialTrip,
            name: name.trim(),
            destination: destination.trim(),
            purpose,
            type: (purpose as string) || initialTrip.type || "Friends",
            startDate,
            endDate,
            totalBudget: numBudget,
            expectedBudget: numBudget,
            remainingBudget: numBudget - (initialTrip.totalSpent || 0),
            currency,
            status,
            color,
            coverPhoto,
            coverImage: coverPhoto,
            notes: notes.trim(),
            travelCategory: travelCategory.trim(),
          }
        : {
            id: `trip_${Date.now()}`,
            name: name.trim(),
            destination: destination.trim(),
            type: (purpose as string) || "Friends",
            startDate,
            endDate,
            coverImage: coverPhoto,
            organizerId: orgUid,
            organizerUid: orgUid,
            organizationId: `personal_${orgUid}`,
            expectedTravellers: 1,
            expectedBudget: numBudget,
            currency,
            defaultExpenseSplit: "Equal",
            approvalRequired: false,
            inviteCode: `TRIP${Date.now().toString(36).toUpperCase()}`,
            tripCode: `TRIP${Date.now().toString(36).toUpperCase()}`,
            createdAt: new Date().toISOString(),
            purpose,
            color,
            coverPhoto,
            notes: notes.trim(),
            status,
            travelCategory: travelCategory.trim(),
            totalBudget: numBudget,
            totalSpent: 0,
            remainingBudget: numBudget,
            totalDistanceKm: 350,
            totalDuration: "7 Days",
            currentJourneyStatus: "Planning & Booking",
            travellers: [
              {
                id: orgUid,
                fullName: orgName,
                age: 30,
                gender: "Male",
                phone: "+91 98765 00000",
                email: orgEmail,
                emergencyContact: "+91 98765 11111",
                bloodGroup: "O+",
                role: "Organizer",
                allocatedBudget: numBudget,
              },
            ],
            segments: [],
            vehicles: [],
            fuelLogs: [],
            flights: [],
            trains: [],
            buses: [],
            hotels: [],
            expenses: [],
            documents: [],
            checklist: getRichDefaultChecklist(`trip_${Date.now()}`),
            timeline: [],
          };

      await onSaveTrip(tripToSave);
      onClose();
    } catch (err) {
      console.error("Error saving trip:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#1AAB67] dark:text-[#34D399]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {initialTrip ? "Edit Trip Details" : "Create New Trip"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Trip Name & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trip Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Goa Coastal Road Trip"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Destination *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Goa, India or Tokyo, Japan"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
              />
            </div>
          </div>

          {/* Purpose & Travel Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as TripPurpose)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
              >
                <option value="Vacation">Vacation</option>
                <option value="Business">Business</option>
                <option value="Pilgrimage">Pilgrimage</option>
                <option value="Education">Education</option>
                <option value="Family">Family</option>
                <option value="Adventure">Adventure</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Travel Category
              </label>
              <input
                type="text"
                placeholder="e.g. Group Road Trip, Office Tour"
                value={travelCategory}
                onChange={(e) => setTravelCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
              />
            </div>
          </div>

          {/* Budget, Currency & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Budget
              </label>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency Symbol
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
              >
                <option value="₹">₹ INR (Rupee)</option>
                <option value="$">$ USD (Dollar)</option>
                <option value="€">€ EUR (Euro)</option>
                <option value="£">£ GBP (Pound)</option>
                <option value="AED">AED (Dirham)</option>
                <option value="SAR">SAR (Riyal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trip Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TripStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Theme Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Trip Color Accent
            </label>
            <div className="flex items-center gap-3">
              {["#06b6d4", "#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#e11d48"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    color === c ? "scale-125 border-slate-900 dark:border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Cover Photo Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" /> Cover Photo URL
            </label>
            <input
              type="text"
              value={coverPhoto}
              onChange={(e) => setCoverPhoto(e.target.value)}
              placeholder="Paste image URL or pick from presets below"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67] mb-2"
            />
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {defaultCovers.map((img, idx) => (
                <img
                  key={img + idx}
                  src={img}
                  alt="cover preset"
                  onClick={() => setCoverPhoto(img)}
                  className={`w-16 h-12 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                    coverPhoto === img ? "border-[#1AAB67] scale-105" : "border-transparent opacity-70"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes & Highlights
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key objectives, hotel references, emergency contacts..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1AAB67]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-[#1AAB67] hover:bg-[#158f55] active:scale-95 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="text-white font-bold">Saving...</span>
                </>
              ) : (
                <span className="text-white font-bold">
                  {initialTrip ? "Save Changes" : "Save Trip"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

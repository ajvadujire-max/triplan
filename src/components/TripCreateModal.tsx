/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Trip, TripPurpose, TripStatus } from "../types";
import { X, Image as ImageIcon, Palette, Compass } from "lucide-react";
import { getRichDefaultChecklist } from "../utils/checklistDefaults";
import { auth } from "../lib/firebase";

interface TripCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrip: (trip: Trip) => void;
  initialTrip?: Trip | null;
}

const defaultCovers = [
  "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1000&auto=format&fit=crop", // Beach
  "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?q=80&w=1000&auto=format&fit=crop", // Mountains
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop", // Dubai skyline
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop", // Ocean sunset
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000&auto=format&fit=crop", // Road trip
];

export const TripCreateModal: React.FC<TripCreateModalProps> = ({
  isOpen,
  onClose,
  onSaveTrip,
  initialTrip,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(initialTrip?.name || "");
  const [destination, setDestination] = useState(initialTrip?.destination || "");
  const [purpose, setPurpose] = useState<TripPurpose>(initialTrip?.purpose || "Vacation");
  const [startDate, setStartDate] = useState(initialTrip?.startDate || "2026-08-01");
  const [endDate, setEndDate] = useState(initialTrip?.endDate || "2026-08-07");
  const [color, setColor] = useState(initialTrip?.color || "#06b6d4");
  const [coverPhoto, setCoverPhoto] = useState(initialTrip?.coverPhoto || defaultCovers[0]);
  const [notes, setNotes] = useState(initialTrip?.notes || "");
  const [status, setStatus] = useState<TripStatus>(initialTrip?.status || "Upcoming");
  const [currency, setCurrency] = useState(initialTrip?.currency || "₹");
  const [travelCategory, setTravelCategory] = useState(initialTrip?.travelCategory || "Family Vacation");
  const [totalBudget, setTotalBudget] = useState(initialTrip?.totalBudget || 30000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !destination.trim() || !startDate || !endDate) return;

    const currentUser = auth.currentUser;
    const orgUid = currentUser?.uid || initialTrip?.organizerId || "trv_ajva";
    const orgName = currentUser?.displayName || "Primary Organizer";
    const orgEmail = currentUser?.email || "organizer@example.com";

    const newTrip: Trip = {
      id: initialTrip?.id || `trip_${Date.now()}`,
      name,
      destination,
      type: (purpose as string) || "Friends",
      startDate,
      endDate,
      coverImage: coverPhoto,
      organizerId: orgUid,
      organizationId: initialTrip?.organizationId || `personal_${orgUid}`,
      expectedTravellers: initialTrip?.expectedTravellers || 1,
      expectedBudget: Number(totalBudget) || 0,
      currency,
      defaultExpenseSplit: initialTrip?.defaultExpenseSplit || "Equal",
      approvalRequired: initialTrip?.approvalRequired || false,
      inviteCode: initialTrip?.inviteCode || initialTrip?.tripCode || `TRIP${Date.now().toString(36).toUpperCase()}`,
      tripCode: initialTrip?.tripCode || initialTrip?.inviteCode || `TRIP${Date.now().toString(36).toUpperCase()}`,
      createdAt: initialTrip?.createdAt || new Date().toISOString(),
      purpose,
      color,
      coverPhoto,
      notes,
      status,
      travelCategory,
      totalBudget: Number(totalBudget) || 0,
      totalSpent: initialTrip?.totalSpent || 0,
      remainingBudget: (Number(totalBudget) || 0) - (initialTrip?.totalSpent || 0),
      totalDistanceKm: initialTrip?.totalDistanceKm || 350,
      totalDuration: initialTrip?.totalDuration || "7 Days",
      currentJourneyStatus: initialTrip?.currentJourneyStatus || "Planning & Booking",
      travellers: initialTrip?.travellers || [
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
          allocatedBudget: Number(totalBudget) || 30000,
        },
      ],
      segments: initialTrip?.segments || [],
      vehicles: initialTrip?.vehicles || [],
      fuelLogs: initialTrip?.fuelLogs || [],
      flights: initialTrip?.flights || [],
      trains: initialTrip?.trains || [],
      buses: initialTrip?.buses || [],
      hotels: initialTrip?.hotels || [],
      expenses: initialTrip?.expenses || [],
      documents: initialTrip?.documents || [],
      checklist: initialTrip?.checklist || getRichDefaultChecklist(initialTrip?.id || `trip_${Date.now()}`),
      timeline: initialTrip?.timeline || [],
    };

    onSaveTrip(newTrip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {initialTrip ? "Edit Trip Details" : "Create New Trip"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
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
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency Symbol
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
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
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-2"
            />
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {defaultCovers.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="cover preset"
                  onClick={() => setCoverPhoto(img)}
                  className={`w-16 h-12 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                    coverPhoto === img ? "border-cyan-500 scale-105" : "border-transparent opacity-70"
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
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs sm:text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-md transition-all"
            >
              {initialTrip ? "Update Trip" : "Save Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

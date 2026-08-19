import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  Check,
  Plus,
  X,
  MapPin,
  Calendar,
  LogOut,
  AlertTriangle,
  Users,
  Search,
  ChevronRight
} from "lucide-react";
import { Trip } from "../types";
import { useModalBack } from "../hooks/useModalBack";

interface SwitchTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  activeTripId: string;
  onSelectTrip: (tripId: string) => void;
  onJoinNewTrip: () => void;
  onLeaveTrip?: (tripId: string) => Promise<void>;
  currentUserId?: string;
}

export const SwitchTripModal: React.FC<SwitchTripModalProps> = ({
  isOpen,
  onClose,
  trips,
  activeTripId,
  onSelectTrip,
  onJoinNewTrip,
  onLeaveTrip,
  currentUserId,
}) => {
  useModalBack(isOpen, onClose);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmLeaveTripId, setConfirmLeaveTripId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Note: AnimatePresence handles isOpen conditional rendering
  const filteredTrips = trips.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.inviteCode && t.inviteCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedTripForLeave = confirmLeaveTripId ? trips.find(t => t.id === confirmLeaveTripId) : null;
  const isOrganizerOfSelected = selectedTripForLeave && currentUserId && (
    selectedTripForLeave.organizerUid === currentUserId || 
    selectedTripForLeave.organizerId === currentUserId
  );

  const handleSelect = (tripId: string) => {
    onSelectTrip(tripId);
    onClose();
  };

  const handleLeaveConfirm = async () => {
    if (!confirmLeaveTripId || !onLeaveTrip) return;
    setIsLeaving(true);
    setErrorMessage(null);
    try {
      await onLeaveTrip(confirmLeaveTripId);
      setConfirmLeaveTripId(null);
      setErrorMessage(null);
      onClose();
    } catch (err: any) {
      console.error("Failed to leave/delete trip:", err);
      setErrorMessage(err?.message || "Unable to process trip operation. Please check your connection and try again.");
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs"
        >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal content */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10"
        >
          {/* Mobile Handle */}
          <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>My TripPro Trips</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Switch active trip or join a new one
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar if multiple trips */}
          {trips.length > 3 && (
            <div className="px-5 pt-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search trips by name or destination..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Trip List */}
          <div className="p-5 space-y-3 overflow-y-auto max-h-[50vh] sm:max-h-[55vh]">
            {filteredTrips.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                No matching trips found.
              </div>
            ) : (
              filteredTrips.map((t) => {
                const isActive = t.id === activeTripId;
                const cover =
                  t.coverPhoto ||
                  t.coverImage ||
                  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80";
                const isOrganizer = currentUserId && (t.organizerUid === currentUserId || t.organizerId === currentUserId);

                return (
                  <div
                    key={t.id}
                    className={`relative rounded-2xl border transition-all overflow-hidden ${
                      isActive
                        ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleSelect(t.id)}
                        className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div
                          className="w-14 h-14 rounded-xl bg-cover bg-center shrink-0 border border-slate-200/60 dark:border-slate-700"
                          style={{ backgroundImage: `url(${cover})` }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {t.name}
                            </h3>
                            {isOrganizer ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shrink-0">
                                Organizer
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 shrink-0">
                                Traveller
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 truncate">
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-indigo-500" />
                              {t.destination}
                            </span>
                            {t.startDate && (
                              <span>• {t.startDate}</span>
                            )}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {t.travellers?.length || 1} Members
                            </span>
                            {t.inviteCode && (
                              <span>Code: {t.inviteCode}</span>
                            )}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActive ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-xs">
                            <Check className="w-3 h-3" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelect(t.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-xs font-bold transition-all cursor-pointer"
                          >
                            Switch
                          </button>
                        )}

                        {onLeaveTrip && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmLeaveTripId(t.id);
                            }}
                            title="Leave Trip"
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              onClick={() => {
                onClose();
                onJoinNewTrip();
              }}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Join Another Trip with Code</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}

      {/* Confirm Leave/Delete Trip Modal */}
      {confirmLeaveTripId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 rounded-full flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {isOrganizerOfSelected ? "Delete Trip?" : "Leave Trip?"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isOrganizerOfSelected
                  ? `Are you sure you want to delete "${selectedTripForLeave?.name || "this trip"}"? As the trip organizer, deleting this trip will remove it for all members.`
                  : `Are you sure you want to leave "${selectedTripForLeave?.name || "this trip"}"? You will no longer see this trip on your dashboard.`}
              </p>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 text-left font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-2">
              <button
                disabled={isLeaving}
                onClick={() => {
                  setConfirmLeaveTripId(null);
                  setErrorMessage(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isLeaving}
                onClick={handleLeaveConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isLeaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>{isOrganizerOfSelected ? "Confirm Delete" : "Confirm Leave"}</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

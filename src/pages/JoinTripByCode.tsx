import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Ticket, AlertCircle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { fetchTripByInviteCode } from "../lib/firestoreSync";
import { auth } from "../lib/firebase";

export default function JoinTripByCode() {
  const [code, setCode] = useState(() => localStorage.getItem("triplan_last_trip_code") || "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Search Firestore trips where tripCode or inviteCode == enteredCode
      let trip = await fetchTripByInviteCode(cleanCode);
      if (!trip) {
        // Also check local storage as fallback
        const savedTrips = localStorage.getItem("triplan_trips");
        const localTrips = savedTrips ? JSON.parse(savedTrips) : [];
        const foundLocal = localTrips.find((t: any) => 
          (t.inviteCode && t.inviteCode.toUpperCase() === cleanCode) || 
          (t.tripCode && t.tripCode.toUpperCase() === cleanCode)
        );

        if (!foundLocal) {
          setError("Invalid Trip Code. Please check the code and try again.");
          setIsLoading(false);
          return;
        }
        trip = foundLocal;
      }

      // 2. Check if the current logged-in user is already a member of this trip
      const currentUser = auth.currentUser;
      if (currentUser && trip) {
        const isAlreadyMember = 
          trip.organizerUid === currentUser.uid ||
          trip.organizerId === currentUser.uid ||
          (Array.isArray(trip.memberUids) && trip.memberUids.includes(currentUser.uid)) ||
          (Array.isArray(trip.travellers) && trip.travellers.some((t: any) => t.id === currentUser.uid && t.status !== "left"));

        if (isAlreadyMember) {
          localStorage.setItem("triplan_active_trip_id", trip.id);
          localStorage.setItem("triplan_last_trip_id", trip.id);
          localStorage.setItem("triplan_last_trip_code", cleanCode);
          window.dispatchEvent(new Event("trip_changed"));
          navigate("/dashboard", { replace: true, state: { notice: `You're already a member of ${trip.name}.` } });
          return;
        }
      }

      // If trip exists and user is not yet a member, open Join Trip registration page
      localStorage.setItem("triplan_last_trip_code", cleanCode);
      navigate(`/t/${cleanCode}`);
    } catch (err) {
      console.error("Error looking up trip code:", err);
      setError("Unable to search trip code. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden"
      style={{
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        paddingLeft: "12px",
        paddingRight: "12px"
      }}
    >
      {/* Top Navigation */}
      <div className="w-full max-w-[520px] pt-2 sm:pt-4 mb-4 shrink-0">
        <button 
          onClick={() => navigate("/")} 
          className="inline-flex items-center gap-1.5 text-[15px] sm:text-[16px] text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[520px] bg-white dark:bg-slate-900 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.015)] dark:shadow-none p-6 sm:p-8 border border-slate-100 dark:border-slate-800 flex flex-col flex-1"
        style={{
          minHeight: "calc(100dvh - 120px)"
        }}
      >
        <div className="flex flex-col justify-between flex-1 h-full gap-6">
          
          {/* Main Content (Hero & Form) */}
          <div className="flex-1 flex flex-col justify-center py-2 sm:py-4 space-y-6 sm:space-y-8">
            
            {/* Ticket Icon Container & Headings */}
            <div className="text-center space-y-3 shrink-0">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-[14px] flex items-center justify-center mx-auto">
                <Ticket className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              
              <h2 className="text-[24px] sm:text-[26px] font-bold text-slate-900 dark:text-white leading-tight">
                Join a Trip
              </h2>
              
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-[280px] sm:max-w-[340px] mx-auto leading-relaxed">
                Enter the trip code shared by your organizer.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="flex-1 text-left">{error}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Trip Code *
                </label>
                <input 
                  type="text"
                  required
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="GOA8F3A"
                  className="w-full h-[58px] px-4 rounded-[16px] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all text-center text-[20px] font-mono font-bold tracking-[0.2em] uppercase bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white"
                />
              </div>

              <button 
                type="submit"
                disabled={!code.trim() || isLoading}
                className="w-full h-[56px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-[16px] font-bold text-sm sm:text-base transition-all shadow-md shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 disabled:bg-indigo-200 dark:disabled:bg-indigo-950/60 disabled:text-indigo-400 dark:disabled:text-indigo-500/50 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5 justify-center">
                    Continue <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Organizer Bottom Section */}
          <div className="space-y-4 pt-4 mt-auto">
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                  OR
                </span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                Organizer?
              </p>
              <button 
                onClick={() => navigate("/admin/login")}
                className="w-full h-[50px] bg-transparent text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-[16px] font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Sign in as Organizer
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

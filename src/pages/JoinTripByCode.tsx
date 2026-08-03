import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Ticket, AlertCircle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { fetchTripByInviteCode } from "../lib/firestoreSync";

export default function JoinTripByCode() {
  const [code, setCode] = useState("");
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
      const trip = await fetchTripByInviteCode(cleanCode);
      if (!trip) {
        // Also check local storage as fallback
        const savedTrips = localStorage.getItem("trippro_trips");
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
      }

      // If trip exists, open Join Trip page
      navigate(`/t/${cleanCode}`);
    } catch (err) {
      console.error("Error looking up trip code:", err);
      setError("Unable to search trip code. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto overflow-x-hidden">
      {/* Top Navigation */}
      <div className="w-full max-w-[430px] pt-1 sm:pt-2 mb-3 sm:mb-4">
        <button 
          onClick={() => navigate("/")} 
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[430px] bg-white dark:bg-slate-900 rounded-[20px] shadow-xl shadow-slate-200/50 dark:shadow-none p-6 border border-slate-100 dark:border-slate-800"
      >
        {/* Ticket Icon Container */}
        <div className="w-[64px] h-[64px] bg-blue-50 dark:bg-blue-950/40 rounded-[16px] flex items-center justify-center mx-auto mb-[clamp(10px,1.5vh,16px)]">
          <Ticket className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Heading & Description */}
        <h2 className="text-[28px] sm:text-[30px] font-bold text-slate-900 dark:text-white text-center leading-[1.15] mb-[clamp(4px,0.8vh,8px)]">
          Join a Trip
        </h2>
        <p className="text-[15px] sm:text-[16px] text-slate-500 dark:text-slate-400 text-center leading-[1.5] mb-[clamp(16px,2.2vh,24px)]">
          Enter the trip code shared by your organizer.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleJoin} className="space-y-[clamp(12px,1.8vh,16px)]">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Trip Code *
            </label>
            <input 
              type="text"
              required
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().trim());
                setError(null);
              }}
              placeholder="GOA8F3A"
              className="w-full h-[56px] px-4 rounded-[14px] border border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all text-center text-[18px] font-mono font-bold tracking-[0.15em] uppercase bg-slate-50/80 dark:bg-slate-800/80 text-slate-900 dark:text-white"
            />
          </div>

          <button 
            type="submit"
            disabled={!code.trim() || isLoading}
            className="w-full h-[52px] sm:h-[54px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-[14px] font-bold text-sm sm:text-base transition-all shadow-lg shadow-indigo-200/50 dark:shadow-none flex items-center justify-center gap-2 disabled:bg-indigo-200 dark:disabled:bg-indigo-950/60 disabled:text-indigo-400 dark:disabled:text-indigo-500/50 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </>
            )}
          </button>
        </form>
        
        {/* Divider */}
        <div className="my-[clamp(14px,2vh,20px)]">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 font-bold tracking-wider">
                OR
              </span>
            </div>
          </div>
        </div>

        {/* Organizer Section */}
        <div className="text-center">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            Organizer?
          </p>
          <button 
            onClick={() => navigate("/admin/login")}
            className="w-full h-[50px] sm:h-[52px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-[14px] font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Sign in as Organizer
          </button>
        </div>
      </motion.div>
    </div>
  );
}



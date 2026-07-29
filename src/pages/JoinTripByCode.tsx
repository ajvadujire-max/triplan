import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Ticket, AlertCircle } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100"
      >
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Ticket className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2">Join a Trip</h2>
        <p className="text-slate-500 text-center mb-8">Enter the trip code shared by your organizer.</p>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Trip Code *</label>
            <input 
              type="text"
              required
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="e.g. GOA8F3A"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-center text-lg font-mono font-bold tracking-widest uppercase"
            />
          </div>

          <button 
            type="submit"
            disabled={!code.trim() || isLoading}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Continue <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or</span>
            </div>
          </div>
          
          <button 
            onClick={() => navigate("/admin/login")}
            className="w-full bg-slate-100 text-slate-700 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Organizer Login
          </button>
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => navigate("/")} className="text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors cursor-pointer">
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}

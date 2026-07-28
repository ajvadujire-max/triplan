import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Ticket } from "lucide-react";
import { motion } from "motion/react";

export default function JoinTripByCode() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/t/${code.trim().toUpperCase()}`);
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

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Trip Code</label>
            <input 
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. HYDPNKW"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-center text-lg font-mono font-bold tracking-widest uppercase"
            />
          </div>

          <button 
            type="submit"
            disabled={!code.trim()}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            Continue <ArrowRight className="w-5 h-5" />
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button onClick={() => navigate("/")} className="text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors">
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}

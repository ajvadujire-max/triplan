import React from "react";
import { motion } from "motion/react";

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center text-center max-w-xs"
      >
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900/80 p-2 shadow-2xl border border-white/10 backdrop-blur-md flex items-center justify-center">
            <img
              src="/triplan_logo.png"
              alt="TripPro Logo"
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950"></span>
          </span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          TripPro
        </h1>
        <p className="text-xs font-semibold text-slate-400 mb-8">
          Restoring your traveller session...
        </p>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300">
          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Verifying Firebase Cloud & Trips...</span>
        </div>
      </motion.div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trip } from "../types";
import { 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Plane,
  Compass,
  Luggage
} from "lucide-react";
import confetti from "canvas-confetti";

interface TripCountdownCardProps {
  trip: Trip;
  onNavigateTab: (tab: string) => void;
}

export const TripCountdownCard: React.FC<TripCountdownCardProps> = ({
  trip,
  onNavigateTab,
}) => {
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [tripProgress, setTripProgress] = useState<number>(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [dayNumber, setDayNumber] = useState(1);
  const [totalDays, setTotalDays] = useState(1);

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(trip.endDate);
      end.setHours(23, 59, 59, 999);

      const diffTime = start.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysLeft(diffDays);

      if (now >= start && now <= end) {
        setIsStarted(true);
        setIsCompleted(false);
        const totalTime = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        const progressValue = totalTime > 0 ? (elapsed / totalTime) * 100 : 0;
        setTripProgress(Math.min(100, Math.max(0, isNaN(progressValue) ? 0 : progressValue)));
        
        const currentDay = Math.floor(elapsed / (1000 * 60 * 60 * 24)) + 1;
        setDayNumber(currentDay);
        
        const totalDuration = Math.ceil(totalTime / (1000 * 60 * 60 * 24)) + 1;
        setTotalDays(totalDuration);

        // Confetti on the very first day
        if (currentDay === 1 && diffDays === 0) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#3b82f6', '#f59e0b']
          });
        }
      } else if (now > end) {
        setIsStarted(false);
        setIsCompleted(true);
        setTripProgress(100);
      } else {
        setIsStarted(false);
        setIsCompleted(false);
        setTripProgress(0);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 3600000); // Update every hour
    return () => clearInterval(interval);
  }, [trip.startDate, trip.endDate]);

  const config = useMemo(() => {
    if (isCompleted) {
      const end = new Date(trip.endDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        bg: "bg-slate-50 dark:bg-slate-900/50",
        border: "border-slate-200 dark:border-slate-800",
        text: "text-slate-500 dark:text-slate-400",
        accent: "text-slate-900 dark:text-white",
        bar: "bg-slate-400 dark:bg-slate-600",
        title: "✅ TRIP COMPLETED",
        countdownText: `Ended ${diffDays} Days Ago`,
        message: "Thanks for travelling with TripPro.",
        icon: <CheckCircle2 className="w-5 h-5 text-slate-500" />
      };
    }

    if (isStarted) {
      return {
        bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
        border: "border-emerald-100 dark:border-emerald-900/30",
        text: "text-emerald-600 dark:text-emerald-400",
        accent: "text-emerald-900 dark:text-emerald-100",
        bar: "bg-emerald-500",
        title: "🌍 TRIP IN PROGRESS",
        countdownText: `Day ${dayNumber} of ${totalDays}`,
        message: "Enjoy every moment of your journey.",
        icon: <Compass className="w-5 h-5 text-emerald-500" />
      };
    }

    if (daysLeft === 0) {
      return {
        bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
        border: "border-emerald-100 dark:border-emerald-900/30",
        text: "text-emerald-600 dark:text-emerald-400",
        accent: "text-emerald-900 dark:text-emerald-100",
        bar: "bg-emerald-500",
        title: "✈️ NEXT ADVENTURE",
        countdownText: "Today",
        message: "Bon Voyage! Have an amazing trip.",
        icon: <Plane className="w-5 h-5 text-emerald-500 animate-bounce" />
      };
    }

    if (daysLeft === 1) {
      return {
        bg: "bg-orange-50/50 dark:bg-orange-950/20",
        border: "border-orange-100 dark:border-orange-900/30",
        text: "text-orange-600 dark:text-orange-400",
        accent: "text-orange-900 dark:text-orange-100",
        bar: "bg-orange-500",
        title: "✈️ NEXT ADVENTURE",
        countdownText: "Begins Tomorrow",
        message: "Your adventure begins tomorrow!",
        icon: <Clock className="w-5 h-5 text-orange-500" />
      };
    }

    if (daysLeft < 7) {
      return {
        bg: "bg-orange-50/50 dark:bg-orange-950/20",
        border: "border-orange-100 dark:border-orange-900/30",
        text: "text-orange-600 dark:text-orange-400",
        accent: "text-orange-900 dark:text-orange-100",
        bar: "bg-orange-500",
        title: "✈️ NEXT ADVENTURE",
        countdownText: `${daysLeft} Days Remaining`,
        message: daysLeft <= 3 ? "Almost time to go!" : "Pack your essentials.",
        icon: <Luggage className="w-5 h-5 text-orange-500" />
      };
    }

    if (daysLeft < 30) {
      return {
        bg: "bg-cyan-50/50 dark:bg-cyan-950/20",
        border: "border-cyan-100 dark:border-cyan-900/30",
        text: "text-cyan-600 dark:text-cyan-400",
        accent: "text-cyan-900 dark:text-cyan-100",
        bar: "bg-cyan-500",
        title: "✈️ NEXT ADVENTURE",
        countdownText: `${daysLeft} Days Remaining`,
        message: daysLeft <= 14 ? "Finalise your itinerary." : "Book your tickets.",
        icon: <Calendar className="w-5 h-5 text-cyan-500" />
      };
    }

    return {
      bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
      border: "border-indigo-100 dark:border-indigo-900/30",
      text: "text-indigo-600 dark:text-indigo-400",
      accent: "text-indigo-900 dark:text-indigo-100",
      bar: "bg-indigo-500",
      title: "✈️ NEXT ADVENTURE",
      countdownText: `${daysLeft} Days Remaining`,
      message: "Time to start planning.",
      icon: <Sparkles className="w-5 h-5 text-indigo-500" />
    };
  }, [daysLeft, isStarted, isCompleted, dayNumber, totalDays, trip.endDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl sm:rounded-[2rem] border ${config.border} ${config.bg} p-4 sm:p-5 shadow-sm`}
    >
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {config.title}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <h2 className={`text-base sm:text-lg font-black ${config.accent} truncate`}>
              {trip.name}
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`text-xl sm:text-2xl font-black ${config.text}`}>
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    {config.countdownText}
                  </motion.span>
                </span>
                <div className="opacity-60">
                  {config.icon}
                </div>
              </div>
            </div>
            {!isStarted && !isCompleted && (
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                Starts on {new Date(trip.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {(isStarted || isCompleted) && (
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                {config.message}
              </p>
            )}
          </div>
        </div>

        <div className="w-full sm:w-48 lg:w-64 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
             <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Progress</span>
             <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">{Math.round(tripProgress)}%</span>
          </div>
          <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${tripProgress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-full ${config.bar} rounded-full`}
            />
          </div>
          {!isStarted && !isCompleted && (
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 text-right uppercase tracking-tighter italic">
              Prepare your bags!
            </p>
          )}
        </div>
      </div>
      
      {/* Subtle Glow Effect */}
      <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[80px] pointer-events-none rounded-full" />
    </motion.div>
  );
};

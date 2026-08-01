/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import { Trip } from "../types";

interface TripCountdownCardProps {
  trip: Trip;
  onNavigateTab: (tab: string) => void;
}

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  return new Date(dateStr);
};

export const TripCountdownCard: React.FC<TripCountdownCardProps> = ({
  trip,
}) => {
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [dayNumber, setDayNumber] = useState(1);
  const [totalDays, setTotalDays] = useState(1);

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const start = parseLocalDate(trip.startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = parseLocalDate(trip.endDate);
      end.setHours(23, 59, 59, 999);

      const diffTime = start.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysLeft(diffDays);

      if (now >= start && now <= end) {
        setIsStarted(true);
        setIsCompleted(false);
        const totalTime = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        
        const currentDay = Math.floor(elapsed / (1000 * 60 * 60 * 24)) + 1;
        setDayNumber(currentDay);
        
        const totalDuration = Math.ceil(totalTime / (1000 * 60 * 60 * 24)) + 1;
        setTotalDays(totalDuration);
      } else if (now > end) {
        setIsStarted(false);
        setIsCompleted(true);
      } else {
        setIsStarted(false);
        setIsCompleted(false);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 3600000);
    return () => clearInterval(interval);
  }, [trip.startDate, trip.endDate]);

  const countdownText = useMemo(() => {
    if (isCompleted) {
      const end = parseLocalDate(trip.endDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
      return `Ended ${diffDays} ${diffDays === 1 ? 'Day' : 'Days'} Ago`;
    }
    if (isStarted) {
      return `Day ${dayNumber} of ${totalDays} (In Progress)`;
    }
    return `${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'} Remaining`;
  }, [isCompleted, isStarted, daysLeft, dayNumber, totalDays, trip.endDate]);

  const startDateText = useMemo(() => {
    if (!trip.startDate) return "";
    try {
      const d = parseLocalDate(trip.startDate);
      const formatted = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).toUpperCase();
      return `STARTS ON ${formatted}`;
    } catch {
      return `STARTS ON ${trip.startDate.toUpperCase()}`;
    }
  }, [trip.startDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-xs"
    >
      <div className="flex flex-col">
        <h3 className="text-lg sm:text-xl font-bold text-[#2D6BF7] dark:text-indigo-400 leading-snug">
          {countdownText}
        </h3>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-0.5">
          {startDateText}
        </p>
      </div>
    </motion.div>
  );
};


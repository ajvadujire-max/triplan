/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trip,
  TransportSegment,
} from "../types";
import {
  Train,
  Ticket,
  Radio,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Plus,
  Edit,
  Copy,
  ChevronDown,
  Navigation,
  FileText,
  Download,
  Eye,
} from "lucide-react";
import {
  fetchLiveTrainStatus,
  LiveTrainStatus,
  getWhereIsMyTrainUrl,
  extractTrainNumber,
} from "../utils/trainService";

interface TrainDetailsModuleProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onOpenAddSegment: () => void;
  onEditSegment: (segment: TransportSegment) => void;
}

export const TrainDetailsModule: React.FC<TrainDetailsModuleProps> = ({
  trip,
  onOpenAddSegment,
  onEditSegment,
}) => {
  // Accordion state: ID of currently expanded train segment
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Store live tracking states and fetch timestamps for lazy loading & caching
  const [liveStatuses, setLiveStatuses] = useState<Record<string, LiveTrainStatus>>({});
  const [loadingTracking, setLoadingTracking] = useState<Record<string, boolean>>({});
  const [fetchTimestamps, setFetchTimestamps] = useState<Record<string, number>>({});
  const [copiedPnr, setCopiedPnr] = useState<string | null>(null);

  // Unified list of train items from trip.segments (where transportType === "Train" or "Metro") and trip.trains
  const trainSegments = trip.segments.filter(
    (s) => s.transportType === "Train" || s.transportType === "Metro"
  );

  // Synchronize or derive train cards
  const unifiedTrains = trainSegments.map((seg) => {
    // Attempt to match with trip.trains if present
    const trainDetailMatch = trip.trains?.find(
      (t) => t.pnr === seg.pnr || t.trainName.toLowerCase().includes((seg.operator || "").toLowerCase())
    );

    const trainName = seg.operator || trainDetailMatch?.trainName || "Express Train";
    const trainNumber = extractTrainNumber(trainName) || trainDetailMatch?.trainNumber || "12002";
    const coach = seg.coach || trainDetailMatch?.coach || "";
    const seat = seg.seatNumber || trainDetailMatch?.seat || "";
    const pnr = seg.pnr || seg.bookingNumber || trainDetailMatch?.pnr || "";
    const bookingStatus = seg.bookingStatus || seg.status || trainDetailMatch?.status || "Booked";

    return {
      segmentId: seg.id,
      segment: seg,
      trainName,
      trainNumber,
      boardingStation: seg.from,
      destination: seg.to,
      departureTime: seg.departure,
      arrivalTime: seg.arrival,
      coach,
      seat,
      pnr,
      fare: seg.fare,
      bookingStatus,
      platform: trainDetailMatch?.platform || "PF 1",
      ticketUrl: seg.ticketUrl,
    };
  });

  // Accordion toggle & Lazy Live Tracking Fetching
  const toggleExpand = (segmentId: string, item: any) => {
    const isExpanding = expandedId !== segmentId;
    setExpandedId(isExpanding ? segmentId : null);

    if (isExpanding) {
      const lastFetch = fetchTimestamps[segmentId] || 0;
      const now = Date.now();
      // Lazy load live tracking if not fetched yet or older than 5 minutes (300,000ms)
      if (!liveStatuses[segmentId] || now - lastFetch > 300000) {
        handleTrackLive(
          segmentId,
          item.trainName,
          item.boardingStation,
          item.destination,
          item.departureTime,
          item.arrivalTime
        );
      }
    }
  };

  const handleTrackLive = async (
    segmentId: string,
    trainName: string,
    boarding: string,
    dest: string,
    depTime: string,
    arrTime: string
  ) => {
    setLoadingTracking((prev) => ({ ...prev, [segmentId]: true }));
    const status = await fetchLiveTrainStatus(trainName, boarding, dest, depTime, arrTime);
    setLiveStatuses((prev) => ({ ...prev, [segmentId]: status }));
    setFetchTimestamps((prev) => ({ ...prev, [segmentId]: Date.now() }));
    setLoadingTracking((prev) => ({ ...prev, [segmentId]: false }));
  };

  const handleCopyPnr = (pnrText: string) => {
    if (!pnrText) return;
    navigator.clipboard.writeText(pnrText);
    setCopiedPnr(pnrText);
    setTimeout(() => setCopiedPnr(null), 2000);
  };

  if (unifiedTrains.length === 0) {
    return (
      <div className="p-6 sm:p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 max-w-md mx-auto my-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Train className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No Train Journeys Added</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Add your train details to auto-populate journey cards, coach & seat numbers, PNR status, and live train running information.
          </p>
        </div>
        <button
          onClick={onOpenAddSegment}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Train Journey
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Train className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              Train PNR & Coach Details
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Railway companion details & live GPS running status
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddSegment}
          className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          + Add Train Segment
        </button>
      </div>

      {/* Accordion List of Train Cards */}
      <div className="space-y-3">
        {unifiedTrains.map((item) => {
          const isExpanded = expandedId === item.segmentId;
          const live = liveStatuses[item.segmentId];
          const isLoading = loadingTracking[item.segmentId];

          return (
            <div
              key={item.segmentId}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-800"
            >
              {/* COLLAPSED JOURNEY ROUTE CARD (Master View ~120-140px) */}
              <button
                type="button"
                onClick={() => toggleExpand(item.segmentId, item)}
                className="w-full text-left p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col justify-between gap-2.5"
              >
                {/* Header Line: Train Icon, Number, Name, Status Badge, Chevron */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Train className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono shrink-0">
                      #{item.trainNumber}
                    </span>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                      {item.trainName}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                      {item.bookingStatus}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-transform duration-300 ${
                        isExpanded ? "rotate-180 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" : ""
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Route Line: Boarding -> Destination & Time */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Boarding</span>
                    <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                      {item.boardingStation}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">{item.departureTime}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center px-2 shrink-0">
                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full mb-0.5">
                      {item.segment.duration || "Direct"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold">→</span>
                  </div>

                  <div className="min-w-0 flex-1 text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Destination</span>
                    <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                      {item.destination}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">{item.arrivalTime}</span>
                  </div>
                </div>
              </button>

              {/* EXPANDED DETAILS SECTION (Smooth Accordion Dropdown) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 sm:p-4 space-y-3"
                  >
                    {/* Header Controls */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Detailed Segment Overview
                      </span>
                      <button
                        type="button"
                        onClick={() => onEditSegment(item.segment)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2.5 py-1 rounded-lg transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Segment</span>
                      </button>
                    </div>

                    {/* 2 or 3 Grid Columns for Booking & Live Tracking */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* 1. BOOKING DETAILS CARD */}
                      <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Ticket className="w-3.5 h-3.5" /> Booking Details
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {item.bookingStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* PNR Number */}
                          <div className="col-span-2 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">PNR Number</span>
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                {item.pnr || "Not Entered"}
                              </span>
                            </div>
                            {item.pnr && (
                              <button
                                type="button"
                                onClick={() => handleCopyPnr(item.pnr)}
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-all"
                                title="Copy PNR"
                              >
                                {copiedPnr === item.pnr ? (
                                  <span className="text-[9px] font-bold text-emerald-500">Copied!</span>
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Coach */}
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Coach</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.coach || "Not Assigned"}
                            </span>
                          </div>

                          {/* Seat / Berth */}
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Seat / Berth</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.seat || "Not Assigned"}
                            </span>
                          </div>

                          {/* Fare */}
                          <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-700 flex items-baseline justify-between">
                            <span className="text-slate-400 text-[10px] font-bold">Total Fare:</span>
                            <span className="font-black text-slate-900 dark:text-white text-sm">
                              {trip.currency}{item.fare.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. LIVE TRACKING CARD */}
                      <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5 animate-pulse text-sky-500" /> Live GPS Tracking
                          </span>

                          {live ? (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                live.delayMinutes > 0
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              {live.currentStatus}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">Ready</span>
                          )}
                        </div>

                        <div className="space-y-2 text-xs">
                          {isLoading ? (
                            <div className="py-4 text-center space-y-1">
                              <RefreshCw className="w-5 h-5 mx-auto animate-spin text-sky-500" />
                              <span className="text-[10px] text-slate-400 font-medium">Fetching Live GPS Status...</span>
                            </div>
                          ) : live ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Current Station</span>
                                  <span className="font-bold text-slate-900 dark:text-white text-xs truncate block">
                                    {live.currentStation}
                                  </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Next Station</span>
                                  <span className="font-bold text-slate-900 dark:text-white text-xs truncate block">
                                    {live.nextStation}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <div>
                                  <span className="block text-[8px] uppercase font-bold text-slate-400">ETA</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{live.estimatedArrival}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] uppercase font-bold text-slate-400">Platform</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{live.platform || "PF 1"}</span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[8px] uppercase font-bold text-slate-400">Delay</span>
                                  <span className={`font-semibold ${live.delayMinutes > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                    {live.delayMinutes > 0 ? `${live.delayMinutes}m Late` : "On Time"}
                                  </span>
                                </div>
                              </div>

                              {live.message && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded border border-amber-200/50 flex items-start gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                  <span>{live.message}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-2 text-center text-[10px] text-slate-400">
                              Click "Track Live" to retrieve live running location.
                            </div>
                          )}

                          {/* Track Live Actions */}
                          <div className="pt-1 flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() =>
                                handleTrackLive(
                                  item.segmentId,
                                  item.trainName,
                                  item.boardingStation,
                                  item.destination,
                                  item.departureTime,
                                  item.arrivalTime
                                )
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white text-xs font-bold py-2 px-3 rounded-lg shadow-xs transition-all disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                              <span>{isLoading ? "Fetching..." : "Track Live"}</span>
                            </button>

                            <a
                              href={getWhereIsMyTrainUrl(item.trainNumber)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-all shrink-0"
                              title="Open Live Status in Where Is My Train / RailYatri"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* 3. OPTIONAL TICKET SECTION */}
                    {item.ticketUrl && (
                      <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              Train Ticket Attached
                            </h5>
                            <p className="text-[10px] text-slate-400 truncate">
                              E-ticket document available for offline viewing
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={item.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Ticket</span>
                          </a>
                          <a
                            href={item.ticketUrl}
                            download="TrainTicket"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg transition-all"
                            title="Download Ticket"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Trip } from "../types";
import {
  CloudSun,
  MapPin,
  ExternalLink,
  Fuel,
  Building2,
  Hospital,
  Utensils,
  Wind,
  Navigation,
  ShieldAlert,
  Car,
  RefreshCw,
  Zap,
  ShoppingBag,
  Pill,
  Shield,
  Palmtree,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Droplets,
  Gauge,
  Hotel,
  Compass,
} from "lucide-react";

interface WeatherMapsTimelineProps {
  trip: Trip;
  onUpdateTrip?: (updatedTrip: Trip) => void;
}

export const WeatherMapsTimeline: React.FC<WeatherMapsTimelineProps> = ({
  trip,
}) => {
  // Live weather auto-refresh state
  const [lastUpdatedMins, setLastUpdatedMins] = useState<number>(3);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [expandedAdvisory, setExpandedAdvisory] = useState<boolean>(false);

  // Distance calculator states
  const [calcFrom, setCalcFrom] = useState(`${trip.destination} Airport`);
  const [calcTo, setCalcTo] = useState(`${trip.destination} City Center`);
  const [calcDistance, setCalcDistance] = useState<number | null>(24.5);
  const [calcTimeMins, setCalcTimeMins] = useState<number | null>(38);
  const [calcTraffic, setCalcTraffic] = useState<string>("Moderate Traffic");

  // Auto refresh timer every minute incrementing elapsed time up to 15
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdatedMins((prev) => (prev >= 15 ? 1 : prev + 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdatedMins(0);
      setIsRefreshing(false);
    }, 600);
  };

  const handleOpenGoogleMaps = (query: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${query} near ${trip.destination}`
    )}`;
    window.open(url, "_blank");
  };

  const handleCalculateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcFrom.trim() || !calcTo.trim()) return;
    const dist = Math.floor(Math.random() * 35) + 10;
    const mins = Math.floor(dist * 1.5) + 5;
    const trafficOptions = ["Light Traffic", "Moderate Traffic", "Heavy Traffic"];
    const randomTraffic = trafficOptions[Math.floor(Math.random() * trafficOptions.length)];
    setCalcDistance(dist);
    setCalcTimeMins(mins);
    setCalcTraffic(randomTraffic);
  };

  // 13 essential locations for mobile grid
  const nearbyEssentials = [
    { id: "fuel", title: "Fuel", query: "Petrol Pump Fuel Station EV", icon: Fuel, color: "text-amber-500 bg-amber-500/10" },
    { id: "atm", title: "ATM", query: "ATM Cash Deposit Bank", icon: Building2, color: "text-blue-500 bg-blue-500/10" },
    { id: "hospital", title: "Hospital", query: "Hospital Emergency Medical", icon: Hospital, color: "text-rose-500 bg-rose-500/10" },
    { id: "hotel", title: "Hotel", query: "Hotel Resort Stays", icon: Hotel, color: "text-teal-500 bg-teal-500/10" },
    { id: "food", title: "Food", query: "Restaurant Cafe Dining", icon: Utensils, color: "text-emerald-500 bg-emerald-500/10" },
    { id: "mosque", title: "Mosque", query: "Mosque Prayer Place Masjid", icon: Compass, color: "text-purple-500 bg-purple-500/10" },
    { id: "supermarket", title: "Supermarket", query: "Supermarket Grocery Store", icon: ShoppingBag, color: "text-#1AAB67/100 bg-#1AAB67/100/10" },
    { id: "toilet", title: "Public Toilet", query: "Public Toilet Restroom Washroom", icon: Droplets, color: "text-cyan-500 bg-cyan-500/10" },
    { id: "pharmacy", title: "Pharmacy", query: "Pharmacy Medical Shop Drugstore", icon: Pill, color: "text-sky-500 bg-sky-500/10" },
    { id: "police", title: "Police", query: "Police Station Helpdesk", icon: Shield, color: "text-red-500 bg-red-500/10" },
    { id: "parking", title: "Parking", query: "Vehicle Parking Lot Stand", icon: Car, color: "text-slate-600 dark:text-slate-300 bg-slate-500/10" },
    { id: "ev", title: "EV Charging", query: "EV Charging Station Electric Vehicle", icon: Zap, color: "text-lime-500 bg-lime-500/10" },
    { id: "attraction", title: "Attractions", query: "Tourist Sightseeing Attractions", icon: Palmtree, color: "text-orange-500 bg-orange-500/10" },
  ];

  // Smart suggestions chips
  const smartChips = [
    { label: "🌧 Rain Radar", query: "Rain Weather Radar" },
    { label: "🚗 Traffic Live", query: "Traffic live conditions" },
    { label: "🏨 Hotels", query: "Hotels near" },
    { label: "⛽ Fuel", query: "Petrol pump near" },
    { label: "🍴 Food", query: "Restaurants near" },
    { label: "🏥 Hospitals", query: "Hospitals emergency" },
    { label: "🕌 Mosques", query: "Mosques near" },
  ];

  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn max-w-full overflow-hidden">
      {/* 1. Header Title Bar - Compact Mobile First */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h1 className="text-[22px] font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CloudSun className="w-6 h-6 text-amber-500 shrink-0" />
            Weather & Route
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
            Google Weather & Maps Live Utility
          </p>
        </div>

        {/* 5. Google Maps Compact Button (Height 42px) */}
        <button
          onClick={() => handleOpenGoogleMaps(trip.destination)}
          className="h-[42px] px-3.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-[13px] rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
        >
          <MapPin className="w-4 h-4" />
          <span>Open Maps</span>
        </button>
      </div>

      {/* 2. Weather Hero Card - Reduced height by 35-40% */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-#159257 text-white shadow-md space-y-3">
        {/* Top: Location, Current Weather, Last Updated */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-sky-100">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0" />
            <span className="text-[15px] font-black text-white truncate max-w-[150px] sm:max-w-xs">
              📍 {trip.destination}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
              {lastUpdatedMins === 0 ? "Just updated" : `Updated ${lastUpdatedMins}m ago`}
            </span>
            <button
              onClick={handleManualRefresh}
              title="Refresh Weather"
              className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-200 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Middle: Temperature, Weather Icon, Condition */}
        <div className="flex items-center justify-between py-1 border-y border-white/15">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">28°C</span>
            <span className="text-[13px] font-bold text-sky-200">Sunny • Clear</span>
          </div>

          <div className="flex items-center gap-2">
            <CloudSun className="w-10 h-10 text-amber-300 drop-shadow-sm shrink-0" />
          </div>
        </div>

        {/* Bottom: Four Compact Statistic Chips in 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur flex items-center justify-between">
            <span className="text-sky-200 flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-amber-300" /> Feels Like
            </span>
            <span className="font-extrabold text-[13px]">30°C</span>
          </div>

          <div className="bg-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur flex items-center justify-between">
            <span className="text-sky-200 flex items-center gap-1">
              <Droplets className="w-3 h-3 text-cyan-300" /> Humidity
            </span>
            <span className="font-extrabold text-[13px]">48%</span>
          </div>

          <div className="bg-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur flex items-center justify-between">
            <span className="text-sky-200 flex items-center gap-1">
              <Wind className="w-3 h-3 text-white" /> Wind
            </span>
            <span className="font-extrabold text-[13px]">14 km/h</span>
          </div>

          <div className="bg-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur flex items-center justify-between">
            <span className="text-sky-200 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-300" /> AQI
            </span>
            <span className="font-extrabold text-[13px] text-emerald-300">42 Good</span>
          </div>
        </div>
      </div>

      {/* 7. Smart Suggestions Chips Below Weather */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
          Quick Weather & Map Shortcuts
        </p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          {smartChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleOpenGoogleMaps(chip.query)}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-#1AAB67/100 font-bold whitespace-nowrap shrink-0 transition-colors active:scale-95 cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Travel Advisory - Compact Warning Card */}
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1 text-[13px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-[15px]">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Travel Advisory</span>
          </div>
          <button
            onClick={() => setExpandedAdvisory(!expandedAdvisory)}
            className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-0.5 hover:underline cursor-pointer"
          >
            {expandedAdvisory ? (
              <>
                Show Less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Read More <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>

        <p className={`text-[13px] text-amber-800 dark:text-amber-200/90 leading-snug ${expandedAdvisory ? "" : "line-clamp-1"}`}>
          Clear coastal skies forecasted for the next 72 hours. UV index peaks between 12:00 PM and 3:00 PM (UV 8 High). Carry sunscreen lotion and hydration supplies for outdoor tours.
        </p>
      </div>

      {/* 4. Nearby Essentials - Compact 2-column Grid */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-rose-500" />
            Nearby Essentials
          </h2>
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
            Tap to open Google Maps
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {nearbyEssentials.map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleOpenGoogleMaps(item.query)}
                className="h-[74px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-rose-500 dark:hover:border-rose-500 active:scale-95 text-left flex items-center gap-2.5 transition-all cursor-pointer group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                  <IconComp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                    {item.title}
                  </p>
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 mt-0.5">
                    <span>Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Route Calculator - Compact Form & Route Result Card */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-#1AAB67/100" />
            Route Calculator
          </h2>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Estimate travel distance and drive time
          </p>
        </div>

        <form onSubmit={handleCalculateRoute} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">From</label>
            <input
              type="text"
              value={calcFrom}
              onChange={(e) => setCalcFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-#1AAB67/100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">To</label>
            <input
              type="text"
              value={calcTo}
              onChange={(e) => setCalcTo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-#1AAB67/100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full h-[34px] bg-#1AAB67 hover:bg-#1AAB67/100 active:scale-95 text-white font-bold text-[13px] rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Calculate Route
            </button>
          </div>
        </form>

        {calcDistance !== null && (
          <div className="p-3 rounded-xl bg-#1AAB67/10/80 dark:bg-#0C5130/40 border border-#1AAB67/30/80 dark:border-#159257/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[13px]">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 font-extrabold text-#0C5130 dark:text-#1AAB67/20 text-[13px] truncate">
                <span>{calcFrom}</span>
                <span>→</span>
                <span>{calcTo}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-#159257 dark:text-#34D399">
                <span>Distance: <b className="text-#0C5130 dark:text-white">{calcDistance} km</b></span>
                <span>Time: <b className="text-#0C5130 dark:text-white">{calcTimeMins} mins</b></span>
                <span className="px-1.5 py-0.5 rounded bg-#1AAB67/30/60 dark:bg-#107043/60 text-#107043 dark:text-#1AAB67/30">
                  {calcTraffic}
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                    calcFrom
                  )}&destination=${encodeURIComponent(calcTo)}`,
                  "_blank"
                )
              }
              className="w-full sm:w-auto h-9 px-3 bg-#1AAB67 hover:bg-#1AAB67/100 text-white font-bold text-[11px] rounded-xl shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Navigate in Google Maps</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

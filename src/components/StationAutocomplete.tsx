/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, X, Check, Train } from "lucide-react";
import { searchRailwayStations, RailwayStation, INDIAN_RAILWAY_STATIONS } from "../data/indianStations";

interface StationAutocompleteProps {
  label?: string;
  value: string;
  onChange: (formattedValue: string, stationCode?: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const StationAutocomplete: React.FC<StationAutocompleteProps> = ({
  label,
  value,
  onChange,
  placeholder = "e.g. Kabaka Puttur or KBPR",
  required = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<RailwayStation[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal search query when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setResults(INDIAN_RAILWAY_STATIONS.slice(0, 12));
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search filtering
  useEffect(() => {
    if (!isOpen) return;

    const handler = setTimeout(() => {
      const filtered = searchRailwayStations(searchQuery, 20);
      setResults(filtered);
    }, 180);

    return () => clearTimeout(handler);
  }, [searchQuery, isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectStation = (station: RailwayStation) => {
    const formatted = `${station.name} (${station.code})`;
    onChange(formatted, station.code);
    setIsOpen(false);
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Main Trigger Input */}
      <div className="relative">
        <input
          type="text"
          required={required}
          value={value}
          onChange={handleCustomInputChange}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <Train className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* SEARCH AUTOCOMPLETE DROPDOWN / MOBILE POPUP */}
      {isOpen && (
        <div className="fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:top-full sm:mt-1 z-50 bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl sm:shadow-xl max-h-[75vh] sm:max-h-80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* Header & Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search station name or code (e.g. KBPR, CAN, YPR)..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold shrink-0"
            >
              Done
            </button>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {results.length > 0 ? (
              results.map((st) => {
                const formattedName = `${st.name} (${st.code})`;
                const isSelected = value.toLowerCase().includes(st.code.toLowerCase());

                return (
                  <button
                    key={`${st.code}-${st.name}`}
                    type="button"
                    onClick={() => handleSelectStation(st)}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-2 transition-all active:scale-[0.99] ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 text-indigo-900 dark:text-indigo-200"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-900 dark:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                        {st.code}
                      </div>

                      <div className="min-w-0">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {st.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {st.code} • {st.state} {st.city ? `(${st.city})` : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center space-y-1">
                <MapPin className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  No matching station found
                </p>
                <p className="text-[11px] text-slate-400">
                  You can still type custom station names directly.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

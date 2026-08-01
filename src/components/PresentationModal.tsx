/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trip,
} from "../types";
import {
  PresentationSections,
  PresentationStyle,
  PresentationOptions,
  generatePreviewSlides,
  downloadPowerPointPresentation,
  collectTripData,
  PreviewSlide,
} from "../utils/pptxGenerator";
import {
  X,
  Presentation,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  Calendar,
  MapPin,
  Clock,
  Layers,
  FileText,
  Bus,
  CheckCircle2,
  Building,
  Navigation,
} from "lucide-react";

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
}

export const PresentationModal: React.FC<PresentationModalProps> = ({
  isOpen,
  onClose,
  trip,
}) => {
  const tripData = useMemo(() => collectTripData(trip), [trip]);

  // Section selections state
  const [sections, setSections] = useState<PresentationSections>({
    cover: true,
    overview: true,
    timeline: tripData.segments.length > 0,
    dailyItinerary: tripData.sortedDays.length > 0,
    transportation: tripData.segments.length > 0,
    activities: tripData.activities.length > 0,
    hotels: tripData.hotels.length > 0,
    routeVisual: tripData.segments.length > 0,
    summary: true,
  });

  // Presentation style
  const [style, setStyle] = useState<PresentationStyle>("Modern Travel");

  // Mode: "setup" | "ready"
  const [mode, setMode] = useState<"setup" | "ready">("setup");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Generated preview slides
  const options: PresentationOptions = useMemo(
    () => ({ style, sections }),
    [style, sections]
  );

  const previewSlides = useMemo(() => {
    if (!isOpen) return [];
    return generatePreviewSlides(trip, options);
  }, [trip, options, isOpen]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setMode("ready");
      setActiveSlideIdx(0);
    }, 600);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadPowerPointPresentation(trip, options);
    } catch (err) {
      console.error("Failed to generate PPTX download:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleSection = (key: keyof PresentationSections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentSlide: PreviewSlide | undefined = previewSlides[activeSlideIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#1B3EBF] to-[#0E227A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Presentation className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white">
                  Trip Presentation Engine
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug mt-0.5">
                {mode === "setup" ? "Create Trip Presentation" : "Presentation Ready ✓"}
              </h2>
              <p className="text-xs text-blue-100 font-medium line-clamp-1">
                Trip: <span className="font-bold underline">{trip.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {mode === "setup" ? (
            /* SETUP FORM */
            <div className="space-y-6">
              {/* Slides to Include */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1B3EBF]" />
                    Slides to Include
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {Object.values(sections).filter(Boolean).length} Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    onClick={() => toggleSection("cover")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      sections.cover
                        ? "bg-[#1B3EBF]/5 border-[#1B3EBF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={`w-4 h-4 ${sections.cover ? "text-[#1B3EBF]" : "text-slate-400"}`} />
                      <span className="text-xs font-bold">Cover Slide</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        sections.cover ? "bg-[#1B3EBF] border-[#1B3EBF] text-white" : "border-slate-300"
                      }`}
                    >
                      {sections.cover && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>

                  <label
                    onClick={() => toggleSection("overview")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      sections.overview
                        ? "bg-[#1B3EBF]/5 border-[#1B3EBF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className={`w-4 h-4 ${sections.overview ? "text-[#1B3EBF]" : "text-slate-400"}`} />
                      <span className="text-xs font-bold">Trip Overview</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        sections.overview ? "bg-[#1B3EBF] border-[#1B3EBF] text-white" : "border-slate-300"
                      }`}
                    >
                      {sections.overview && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>

                  <label
                    onClick={() => toggleSection("timeline")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      sections.timeline
                        ? "bg-[#1B3EBF]/5 border-[#1B3EBF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className={`w-4 h-4 ${sections.timeline ? "text-[#1B3EBF]" : "text-slate-400"}`} />
                      <span className="text-xs font-bold">Journey Timeline</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        sections.timeline ? "bg-[#1B3EBF] border-[#1B3EBF] text-white" : "border-slate-300"
                      }`}
                    >
                      {sections.timeline && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>

                  <label
                    onClick={() => toggleSection("dailyItinerary")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      sections.dailyItinerary
                        ? "bg-[#1B3EBF]/5 border-[#1B3EBF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className={`w-4 h-4 ${sections.dailyItinerary ? "text-[#1B3EBF]" : "text-slate-400"}`} />
                      <span className="text-xs font-bold">Daily Itinerary</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        sections.dailyItinerary ? "bg-[#1B3EBF] border-[#1B3EBF] text-white" : "border-slate-300"
                      }`}
                    >
                      {sections.dailyItinerary && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>

                  <label
                    onClick={() => toggleSection("transportation")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      sections.transportation
                        ? "bg-[#1B3EBF]/5 border-[#1B3EBF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Bus className={`w-4 h-4 ${sections.transportation ? "text-[#1B3EBF]" : "text-slate-400"}`} />
                      <span className="text-xs font-bold">Transportation</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        sections.transportation ? "bg-[#1B3EBF] border-[#1B3EBF] text-white" : "border-slate-300"
                      }`}
                    >
                      {sections.transportation && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>

                  <label
                    onClick={() => toggleSection("activities")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      sections.activities
                        ? "bg-[#1B3EBF]/5 border-[#1B3EBF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 ${sections.activities ? "text-[#1B3EBF]" : "text-slate-400"}`} />
                      <span className="text-xs font-bold">Activities</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        sections.activities ? "bg-[#1B3EBF] border-[#1B3EBF] text-white" : "border-slate-300"
                      }`}
                    >
                      {sections.activities && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>

                  <label
                    onClick={() => toggleSection("hotels")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      sections.hotels
                        ? "bg-[#1B3EBF]/5 border-[#1B3EBF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building className={`w-4 h-4 ${sections.hotels ? "text-[#1B3EBF]" : "text-slate-400"}`} />
                      <span className="text-xs font-bold">Hotels & Stays</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        sections.hotels ? "bg-[#1B3EBF] border-[#1B3EBF] text-white" : "border-slate-300"
                      }`}
                    >
                      {sections.hotels && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>

                  <label
                    onClick={() => toggleSection("routeVisual")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      sections.routeVisual
                        ? "bg-[#1B3EBF]/5 border-[#1B3EBF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Navigation className={`w-4 h-4 ${sections.routeVisual ? "text-[#1B3EBF]" : "text-slate-400"}`} />
                      <span className="text-xs font-bold">Route Map Flow</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        sections.routeVisual ? "bg-[#1B3EBF] border-[#1B3EBF] text-white" : "border-slate-300"
                      }`}
                    >
                      {sections.routeVisual && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>

                  <label
                    onClick={() => toggleSection("summary")}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      sections.summary
                        ? "bg-[#1B3EBF]/5 border-[#1B3EBF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className={`w-4 h-4 ${sections.summary ? "text-[#1B3EBF]" : "text-slate-400"}`} />
                      <span className="text-xs font-bold">Trip Summary</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        sections.summary ? "bg-[#1B3EBF] border-[#1B3EBF] text-white" : "border-slate-300"
                      }`}
                    >
                      {sections.summary && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>
                </div>
              </div>

              {/* Style Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#1B3EBF]" />
                  Presentation Style
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(["Modern Travel", "Minimal", "Professional", "Photo Story"] as PresentationStyle[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStyle(st)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        style === st
                          ? "bg-[#1B3EBF] border-[#1B3EBF] text-white shadow-md font-bold"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xs font-extrabold block">{st}</span>
                      <span className="text-[10px] opacity-80 block mt-0.5">
                        {st === "Modern Travel" ? "Default • Clean" : st === "Minimal" ? "Sleek" : st === "Professional" ? "Corporate" : "Story"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 rounded-2xl bg-[#1B3EBF] hover:bg-[#1633a1] text-white font-extrabold text-sm shadow-xl shadow-[#1B3EBF]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating Slides...
                  </>
                ) : (
                  <>
                    <Presentation className="w-5 h-5" />
                    Generate Presentation ({previewSlides.length} Slides)
                  </>
                )}
              </button>
            </div>
          ) : (
            /* READY / PREVIEW MODE */
            <div className="space-y-6">
              {/* Ready Header Banner */}
              <div className="p-4 rounded-2xl bg-[#1B3EBF]/10 border border-[#1B3EBF]/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1B3EBF] dark:text-[#5B7FFF]">
                    Presentation Deck Built Successfully!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Total <span className="font-bold">{previewSlides.length} Widescreen 16:9 Slides</span> ready for download or preview.
                  </p>
                </div>
                <button
                  onClick={() => setMode("setup")}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 hover:bg-slate-50 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Options
                </button>
              </div>

              {/* Interactive Slide Viewer */}
              {currentSlide && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                    <span>
                      SLIDE {activeSlideIdx + 1} OF {previewSlides.length} — {currentSlide.category}
                    </span>
                    <span>{currentSlide.title}</span>
                  </div>

                  {/* Slide Container (16:9 aspect ratio simulated) */}
                  <div className="relative aspect-video w-full rounded-2xl bg-gradient-to-br from-[#1B3EBF] to-[#0E227A] p-4 sm:p-6 text-white shadow-xl flex flex-col justify-between overflow-hidden border border-[#1B3EBF]">
                    {/* Slide Header */}
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">
                        {currentSlide.category}
                      </span>
                      <h4 className="text-base sm:text-2xl font-black text-white mt-1 leading-tight">
                        {currentSlide.content.heading}
                      </h4>
                      {currentSlide.content.subheading && (
                        <p className="text-xs sm:text-sm text-blue-100 font-semibold mt-0.5">
                          {currentSlide.content.subheading}
                        </p>
                      )}
                    </div>

                    {/* Slide Body Content */}
                    <div className="my-auto py-2">
                      {/* Metrics Display */}
                      {currentSlide.content.metrics && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {currentSlide.content.metrics.map((m, idx) => (
                            <div key={idx} className="p-2 sm:p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                              <p className="text-[9px] sm:text-[10px] font-bold text-blue-200 uppercase">{m.label}</p>
                              <p className="text-xs sm:text-base font-black text-white mt-0.5 leading-none">{m.value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timeline Items */}
                      {currentSlide.content.timelineItems && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                          {currentSlide.content.timelineItems.map((item, idx) => (
                            <div key={idx} className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-white text-[11px] sm:text-xs">{item.title}</p>
                                <p className="text-[10px] text-blue-100 line-clamp-1">{item.subtitle}</p>
                              </div>
                              {item.time && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white shrink-0 ml-2">
                                  {item.time}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Cards Grid */}
                      {currentSlide.content.cards && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                          {currentSlide.content.cards.map((card, idx) => (
                            <div key={idx} className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-left">
                              <p className="font-bold text-white text-[11px] sm:text-xs line-clamp-1">{card.title}</p>
                              {card.subtitle && <p className="text-[10px] text-blue-200 line-clamp-1">{card.subtitle}</p>}
                              {card.desc && <p className="text-[9px] text-blue-100/80 line-clamp-1 mt-0.5">{card.desc}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Slide Footer */}
                    <div className="flex items-center justify-between border-t border-white/15 pt-2 text-[9px] sm:text-[10px] text-blue-200 font-semibold">
                      <span>{currentSlide.content.footerText || "TripPro Presentation Deck"}</span>
                      <span>Slide {activeSlideIdx + 1}</span>
                    </div>
                  </div>

                  {/* Carousel Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setActiveSlideIdx((prev) => Math.max(0, prev - 1))}
                      disabled={activeSlideIdx === 0}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    <div className="flex items-center gap-1 max-w-[180px] sm:max-w-[280px] overflow-x-auto no-scrollbar py-1">
                      {previewSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSlideIdx(idx)}
                          className={`w-2.5 h-2.5 rounded-full transition-all shrink-0 ${
                            activeSlideIdx === idx ? "bg-[#1B3EBF] w-6" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setActiveSlideIdx((prev) => Math.min(previewSlides.length - 1, prev + 1))}
                      disabled={activeSlideIdx === previewSlides.length - 1}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition-all"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="py-3.5 px-4 rounded-2xl bg-[#1B3EBF] hover:bg-[#1633a1] text-white font-extrabold text-sm shadow-lg shadow-[#1B3EBF]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isDownloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Building PPTX File...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download .PPTX File
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setMode("setup")}
                  className="py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-100 font-bold text-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Change Style / Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

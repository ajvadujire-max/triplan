/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Trip } from "../types";
import {
  Sparkles,
  Bot,
  AlertTriangle,
  Lightbulb,
  Compass,
  Zap,
  Loader2,
  Brain,
} from "lucide-react";

interface AiInsightsModuleProps {
  trip: Trip;
}

export const AiInsightsModule: React.FC<AiInsightsModuleProps> = ({ trip }) => {
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [promptType, setPromptType] = useState<"budget" | "itinerary" | "tips">("budget");

  const handleFetchAiInsights = async (type: "budget" | "itinerary" | "tips") => {
    setPromptType(type);
    setLoading(true);
    setAiResponse(null);

    let promptText = "";
    if (type === "budget") {
      promptText = `Analyze this trip named "${trip.name}" to destination "${trip.destination}".
Total Budget: ${trip.currency}${trip.totalBudget}.
Expenses so far: ${trip.expenses.length} expenses totalling ${trip.currency}${trip.expenses.reduce(
        (acc, e) => acc + e.amount,
        0
      )}.
Number of travellers: ${trip.travellers.length}.
Provide a concise, professional 3-bullet financial audit & smart budget warning. Mention if spending is optimal, warning indicators, and cost optimization tips.`;
    } else if (type === "itinerary") {
      promptText = `Generate a smart 3-day travel itinerary for "${trip.destination}" tailored for a group of ${trip.travellers.length} members (${trip.tripType} trip). Include hidden gems, top food spots, and optimal travel timing.`;
    } else if (type === "tips") {
      promptText = `Provide 5 expert travel hacks, fuel saving tips, and local precautions for traveling in ${trip.destination} for a ${trip.tripType} trip with budget ${trip.currency}${trip.totalBudget}.`;
    }

    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, trip }),
      });

      const data = await res.json();
      if (data.text) {
        setAiResponse(data.text);
      } else {
        setAiResponse("Unable to fetch AI response at this moment.");
      }
    } catch (err) {
      setAiResponse(
        "AI Assistant Service Unavailable. Please check your GEMINI_API_KEY setting in the Secrets panel."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-#0C5130 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden space-y-4">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-#A3E0C3 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-#74D0A5 uppercase tracking-widest">
                AI Travel & Treasury Copilot
              </p>
              <h3 className="text-xl font-bold tracking-tight">Gemini AI Travel & Finance Insights</h3>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 border border-white/20 text-#A3E0C3 self-start md:self-auto">
            Powered by Gemini
          </span>
        </div>

        {/* AI Insight Card Sample Banner */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
          <p className="text-[10px] font-bold text-#74D0A5 uppercase tracking-widest mb-1">
            Featured AI Recommendation
          </p>
          <p className="text-xs font-medium leading-relaxed">
            "Optimizing transport segments in {trip.destination} could save up to <b className="text-emerald-300">$85.00</b> and reduce carbon footprint across {trip.travellers.length} travellers."
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => handleFetchAiInsights("budget")}
            disabled={loading}
            className="flex items-center gap-2 bg-#1AAB67 hover:bg-#1AAB67 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            Analyze Budget & Burn Rate
          </button>

          <button
            onClick={() => handleFetchAiInsights("itinerary")}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Compass className="w-4 h-4 text-#74D0A5" />
            Generate Smart Itinerary
          </button>

          <button
            onClick={() => handleFetchAiInsights("tips")}
            disabled={loading}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Lightbulb className="w-4 h-4 text-yellow-300" />
            Travel Hacks & Guidance
          </button>
        </div>

        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-#1AAB67/20 rounded-full blur-2xl" />
      </div>

      {/* AI Response Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm min-h-[220px] flex flex-col justify-center">
        {loading ? (
          <div className="text-center space-y-3 py-8">
            <Loader2 className="w-8 h-8 text-#1AAB67 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Consulting Gemini AI Model...
            </p>
            <p className="text-xs text-slate-400">
              Evaluating budget burn rate, destination trends, and group dynamics
            </p>
          </div>
        ) : aiResponse ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-#1AAB67 dark:text-#34D399 uppercase tracking-wider">
              <Brain className="w-4 h-4" /> AI Analysis Result
            </div>

            <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {aiResponse}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 py-8 text-slate-400">
            <Bot className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Click any button above to generate instant Gemini AI insights for "{trip.name}".
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Plane, LayoutDashboard, Wallet, Briefcase, 
  MapPin, Cloud, User, LogOut, CheckCircle2, 
  Clock, FileText, Settings, Menu, X, Train
} from "lucide-react";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { id: "dashboard", name: "Overview", icon: LayoutDashboard },
  { id: "journey", name: "My Journey", icon: Plane },
  { id: "expenses", name: "My Expenses", icon: Wallet },
  { id: "documents", name: "Documents", icon: FileText },
  { id: "checklist", name: "Packing", icon: CheckCircle2 },
  { id: "tracking", name: "Live Track", icon: Train },
  { id: "weather", name: "Weather", icon: Cloud },
  { id: "profile", name: "Profile", icon: User },
];

export default function TravellerDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Plane className="text-white w-5 h-5" />
          </div>
          {isSidebarOpen && <span className="ml-3 font-bold text-xl tracking-tight">Triplan</span>}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                activeTab === item.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-500 hover:bg-red-50 transition-all"
          )}>
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh] overflow-y-auto">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 md:block hidden"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-bold text-slate-900 capitalize">{activeTab.replace("-", " ")}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold">John Traveller</div>
              <div className="text-xs text-slate-500">Goa Trip 2026</div>
            </div>
            <div className="w-10 h-10 bg-indigo-100 rounded-full border border-indigo-200 flex items-center justify-center font-bold text-indigo-600">
              JT
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {activeTab === "dashboard" && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Remaining", value: "₹4,500", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Next Event", value: "Dinner", icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Items Packed", value: "12/15", icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Distance", value: "120km", icon: MapPin, color: "text-rose-600", bg: "bg-rose-50" },
                  ].map((stat, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
                        <stat.icon className={cn("w-5 h-5", stat.color)} />
                      </div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
                      <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Main Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold mb-6">Current Journey</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                            <Train className="text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold">Mandovi Express (10103)</div>
                            <div className="text-xs text-slate-500">Departed at 7:15 AM</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-600">On Time</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Status</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold mb-6">Packing List</h3>
                      <div className="space-y-3">
                        {["Camera", "Sunscreen", "Powerbank"].map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <input type="checkbox" checked={i < 2} className="w-5 h-5 rounded border-slate-300 text-indigo-600" />
                            <span className={cn("text-sm", i < 2 ? "line-through text-slate-400" : "text-slate-700 font-medium")}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab !== "dashboard" && (
              <div className="bg-white p-12 rounded-[40px] border border-slate-100 text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Plane className="text-slate-300 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{activeTab.toUpperCase()} Module</h2>
                <p className="text-slate-500">Access limited to Traveller role. Viewing data for Goa Trip 2026.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

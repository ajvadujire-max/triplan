import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Shield, LayoutDashboard, Building2, MapPin, 
  Users, BarChart3, Settings, LogOut, Search,
  ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Plus, CheckCircle2, AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { id: "overview", name: "System Overview", icon: LayoutDashboard },
  { id: "organizations", name: "Organizations", icon: Building2 },
  { id: "trips", name: "Global Trips", icon: MapPin },
  { id: "admins", name: "Admin Accounts", icon: Shield },
  { id: "analytics", name: "System Analytics", icon: BarChart3 },
  { id: "settings", name: "Platform Settings", icon: Settings },
];

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const stats = [
    { label: "Total Revenue", value: "$45,280", growth: "+12.5%", positive: true },
    { label: "Active Trips", value: "1,284", growth: "+4.2%", positive: true },
    { label: "Organizations", value: "342", growth: "+8.1%", positive: true },
    { label: "System Load", value: "24%", growth: "-2.1%", positive: false },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#0F172A] text-slate-100 flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-[#1E293B] border-r border-slate-800 transition-all duration-300 flex flex-col z-50",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-900/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          {isSidebarOpen && (
            <div className="ml-4">
              <div className="font-bold text-xl tracking-tight leading-none">TripPro</div>
              <div className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-1">Super Admin</div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all",
                activeTab === item.id 
                  ? "bg-rose-600 text-white shadow-xl shadow-rose-900/20" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm text-slate-400 hover:bg-rose-900/20 hover:text-rose-500 transition-all">
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Logout System</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh] overflow-y-auto">
        <header className="h-20 bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search global trips, orgs..."
                className="bg-slate-800 border-none rounded-full pl-10 pr-6 py-2 text-sm w-80 outline-none focus:ring-2 ring-rose-500/50 transition-all text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-rose-950/30 border border-rose-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Mainframe Secure</span>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-7xl mx-auto space-y-10">
            {activeTab === "overview" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black text-white">System Intelligence</h2>
                  <button className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-700 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Organization
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-slate-800/50 p-8 rounded-[32px] border border-slate-700 shadow-xl"
                    >
                      <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{stat.label}</div>
                      <div className="text-3xl font-black text-white mb-4">{stat.value}</div>
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg w-fit",
                        stat.positive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}>
                        {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {stat.growth} from last month
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Organizations Table */}
                <div className="bg-slate-800/50 rounded-[40px] border border-slate-700 overflow-hidden">
                  <div className="p-8 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="text-lg font-bold">Recent Organizations</h3>
                    <button className="text-slate-400 text-sm font-bold hover:text-white transition-colors">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700/50">
                          <th className="px-8 py-5">Organization</th>
                          <th className="px-8 py-5">Trips</th>
                          <th className="px-8 py-5">Travellers</th>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {[
                          { name: "Global Travel Inc.", trips: 24, users: 450, status: "Active" },
                          { name: "Adventure Seekers", trips: 12, users: 180, status: "Active" },
                          { name: "Family Planner Pro", trips: 45, users: 890, status: "Review" },
                        ].map((org, i) => (
                          <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                            <td className="px-8 py-5 font-bold text-white">{org.name}</td>
                            <td className="px-8 py-5 text-slate-400">{org.trips}</td>
                            <td className="px-8 py-5 text-slate-400">{org.users}</td>
                            <td className="px-8 py-5">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                org.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                              )}>
                                {org.status}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-slate-500">
                              <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab !== "overview" && (
              <div className="h-96 flex flex-col items-center justify-center bg-slate-800/30 rounded-[48px] border border-slate-700 border-dashed">
                <Shield className="w-20 h-20 text-slate-700 mb-6" />
                <h2 className="text-2xl font-black text-white capitalize">{activeTab.replace("-", " ")} Control Plane</h2>
                <p className="text-slate-500 mt-2">Administrative privileges verified. Initializing secure module...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

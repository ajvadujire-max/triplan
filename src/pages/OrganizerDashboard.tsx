import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plane, LayoutDashboard, Wallet, Briefcase, 
  MapPin, Cloud, User, LogOut, CheckCircle2, 
  Clock, FileText, Settings, Menu, X, Train,
  UserPlus, Link, QrCode, FileBarChart, Hotel,
  Check, XCircle, MoreVertical, Copy, Share2,
  Users
} from "lucide-react";
import { cn } from "../lib/utils";
import { QRCodeSVG } from "qrcode.react";

const NAV_ITEMS = [
  { id: "dashboard", name: "Overview", icon: LayoutDashboard },
  { id: "travellers", name: "Travellers", icon: UserPlus },
  { id: "requests", name: "Join Requests", icon: Clock },
  { id: "itinerary", name: "Itinerary", icon: Plane },
  { id: "expenses", name: "Finances", icon: Wallet },
  { id: "hotels", name: "Hotels", icon: Hotel },
  { id: "invites", name: "Invite Links", icon: Link },
  { id: "reports", name: "Reports", icon: FileBarChart },
  { id: "settings", name: "Trip Settings", icon: Settings },
];

export default function OrganizerDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showQr, setShowQr] = useState(false);

  const pendingRequests = [
    { id: "1", name: "Alice Johnson", phone: "+91 9876543210", email: "alice@example.com", photo: "AJ" },
    { id: "2", name: "Bob Smith", phone: "+91 9123456789", email: "bob@test.com", photo: "BS" },
  ];

  const inviteLink = "https://triplan-zeta.vercel.app/t/GOA8F3A";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-emerald-100">
            <Plane className="text-white w-5 h-5" />
          </div>
          {isSidebarOpen && <span className="ml-3 font-bold text-xl tracking-tight">TripPro <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full ml-1 uppercase">Admin</span></span>}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                activeTab === item.id 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
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

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">Organizer Mode</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold">Admin Organizer</div>
                <div className="text-xs text-slate-500">Trip: GOA8F3A</div>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-full border border-emerald-200 flex items-center justify-center font-bold text-emerald-600">
                AO
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <div className="max-w-6xl mx-auto space-y-8">
            {activeTab === "dashboard" && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Total Budget", value: "₹2,50,000", icon: Wallet, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Travellers", value: "12 Active", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Pending Req.", value: "2 New", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Days Left", value: "15 Days", icon: Plane, color: "text-rose-600", bg: "bg-rose-50" },
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Pending Requests Section */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-lg font-bold">Pending Join Requests</h3>
                          <p className="text-sm text-slate-500">Approve or reject new travellers</p>
                        </div>
                        <button className="text-emerald-600 text-sm font-bold hover:underline">View All</button>
                      </div>

                      <div className="space-y-4">
                        {pendingRequests.map((req) => (
                          <div key={req.id} className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-bold text-slate-400 border border-slate-200 shadow-sm shrink-0">
                              {req.photo}
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                              <div className="font-bold text-slate-900">{req.name}</div>
                              <div className="text-xs text-slate-500 font-medium">{req.phone} • {req.email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                                <Check className="w-4 h-4" /> Approve
                              </button>
                              <button className="flex items-center gap-2 px-4 py-2 bg-white text-rose-600 border border-rose-100 rounded-xl text-sm font-bold hover:bg-rose-50 transition-all">
                                <XCircle className="w-4 h-4" /> Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold mb-6">Upcoming Itinerary</h3>
                      <div className="space-y-4">
                        {[
                          { time: "08:00 AM", event: "Breakfast at Hotel", icon: Hotel },
                          { time: "10:30 AM", event: "Beach Sightseeing", icon: MapPin },
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                              <item.icon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-indigo-600 mb-0.5">{item.time}</div>
                              <div className="text-sm font-bold text-slate-800">{item.event}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Invite System Section */}
                  <div className="space-y-6">
                    <div className="bg-emerald-950 text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/40">
                          <Link className="text-white w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Trip Invite</h3>
                        <p className="text-emerald-100/70 text-sm mb-6 leading-relaxed">Share this link or QR code with your travellers to join the trip instantly.</p>
                        
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/10">
                          <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-2">Invite Code</div>
                          <div className="text-2xl font-black tracking-wider mb-2">GOA8F3A</div>
                          <div className="text-[10px] text-emerald-200/50 truncate mb-4">{inviteLink}</div>
                          
                          <div className="flex gap-2">
                            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-emerald-950 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors">
                              <Copy className="w-3.5 h-3.5" /> Copy
                            </button>
                            <button 
                              onClick={() => setShowQr(!showQr)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-400 transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5" /> QR Code
                            </button>
                          </div>
                        </div>

                        <button className="w-full flex items-center justify-center gap-2 py-3 border border-emerald-400/30 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">
                          <Share2 className="w-4 h-4" /> Share WhatsApp
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold mb-4">Budget Progress</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                            <span>₹1,50,000 SPENT</span>
                            <span>60%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[60%] rounded-full" />
                          </div>
                        </div>
                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Remaining</div>
                          <div className="text-lg font-black text-slate-900">₹1,00,000</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab !== "dashboard" && (
              <div className="bg-white p-16 rounded-[48px] border border-slate-100 text-center shadow-sm">
                <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-8">
                  <LayoutDashboard className="text-slate-300 w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4">{activeTab.toUpperCase()} Module</h2>
                <p className="text-slate-500 max-w-sm mx-auto text-lg">Full access granted to Organizer. Manage trip data and traveller coordination for GOA8F3A.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* QR Modal */}
      <AnimatePresence>
        {showQr && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQr(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-2">Trip QR Code</h3>
              <p className="text-slate-500 text-sm mb-8">Scan to join Goa Trip 2026</p>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 inline-block">
                <QRCodeSVG value={inviteLink} size={200} />
              </div>
              <button 
                onClick={() => setShowQr(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

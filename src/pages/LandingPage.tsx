import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Plane, Users, Wallet, Shield, CheckCircle2, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "../lib/utils";
import triplanLogo from "../assets/logo.svg";
import { auth } from "../lib/firebase";
import { fetchUserTripsByUid } from "../lib/firestoreSync";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        // Check if user has trips saved in localStorage first
        const savedTrips = localStorage.getItem("triplan_trips");
        if (savedTrips) {
          try {
            const parsed = JSON.parse(savedTrips);
            if (Array.isArray(parsed) && parsed.length > 0) {
              navigate("/dashboard", { replace: true });
              return;
            }
          } catch {
            // ignore
          }
        }
        // Also verify in Firestore
        fetchUserTripsByUid(user.uid).then((trips) => {
          if (trips && trips.length > 0) {
            localStorage.setItem("triplan_trips", JSON.stringify(trips));
            if (!localStorage.getItem("triplan_active_trip_id")) {
              localStorage.setItem("triplan_active_trip_id", trips[0].id);
            }
            navigate("/dashboard", { replace: true });
          }
        }).catch((err) => console.warn("LandingPage fetchUserTripsByUid error:", err));
      }
    });
    return () => unsub();
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 overflow-x-hidden flex flex-col justify-start">
      {/* Navigation */}
      <nav 
        style={{ height: "clamp(64px, 8dvh, 78px)" }}
        className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center"
      >
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center w-full" style={{ paddingLeft: "clamp(4px, 1vw, 12px)", paddingRight: "clamp(4px, 1vw, 12px)" }}>
            <div className="flex items-center gap-2.5">
              <div 
                style={{ width: "clamp(42px, 10vw, 52px)", height: "clamp(42px, 10vw, 52px)" }}
                className="shrink-0 flex items-center justify-center p-0.5"
              >
                <img
                  src={triplanLogo}
                  alt=""
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/triplan_logo.png";
                  }}
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <span 
                style={{ fontSize: "clamp(22px, 6vw, 28px)" }}
                className="font-bold tracking-tight text-slate-900"
              >
                Triplan
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">FAQ</a>
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Login</Link>
              <Link to="/onboarding" className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                Get Started
              </Link>
            </div>

            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={isMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        style={{ top: "clamp(64px, 8dvh, 78px)" }}
        className="fixed w-full bg-white z-40 md:hidden overflow-hidden border-b border-slate-200"
      >
        <div className="px-4 py-6 space-y-4">
          <a href="#features" className="block text-lg font-medium">Features</a>
          <a href="#pricing" className="block text-lg font-medium">Pricing</a>
          <a href="#faq" className="block text-lg font-medium">FAQ</a>
          <Link to="/login" className="block text-lg font-medium">Login</Link>
          <Link to="/onboarding" className="block bg-indigo-600 text-white px-5 py-3 rounded-xl text-center font-semibold">
            Get Started
          </Link>
        </div>
      </motion.div>

      {/* Hero Section */}
      <section 
        className="w-full flex flex-col items-center shrink-0"
        style={{
          paddingTop: "clamp(80px, 10dvh, 110px)",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))"
        }}
      >
        <div className="w-full max-w-[640px] md:max-w-4xl px-4 flex flex-col items-center flex-1 justify-between min-h-[calc(100dvh-120px)] md:min-h-0">
          
          {/* Text & Buttons block */}
          <div className="w-full flex flex-col items-center justify-center flex-1">
            
            {/* Title & Desc */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center w-full flex flex-col items-center"
            >
              <h1 
                style={{ 
                  fontSize: "clamp(36px, 10vw, 58px)", 
                  lineHeight: 1.02,
                  maxWidth: "540px",
                  marginTop: "clamp(12px, 2.5dvh, 24px)",
                  marginBottom: "clamp(20px, 4dvh, 38px)"
                }}
                className="font-extrabold text-slate-900 tracking-tight text-center"
              >
                Plan Trips Like <span className="text-indigo-600">Professionals</span>
              </h1>
              
              {/* Description */}
              <p 
                style={{ 
                  fontSize: "clamp(15px, 4.2vw, 20px)",
                  lineHeight: 1.45,
                  maxWidth: "480px",
                  marginBottom: "clamp(24px, 4dvh, 42px)"
                }}
                className="text-slate-600 text-center"
              >
                Plan together, track expenses, organize schedules, and keep everything in one place.
              </p>

              {/* Buttons */}
              <div 
                className="flex flex-col gap-3 w-full max-w-[360px] mx-auto"
                style={{ marginBottom: "clamp(24px, 4dvh, 42px)" }}
              >
                <Link 
                  to="/onboarding" 
                  style={{ height: "clamp(54px, 7dvh, 64px)", borderRadius: "18px" }}
                  className="w-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center text-[15px] sm:text-[16px]"
                >
                  Create New Trip
                </Link>
                <Link 
                  to="/join" 
                  style={{ height: "clamp(54px, 7dvh, 64px)", borderRadius: "18px" }}
                  className="w-full bg-white text-slate-900 border border-slate-200 font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center text-[15px] sm:text-[16px]"
                >
                  Join Existing Trip
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Travel Image block */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full max-w-[480px] md:max-w-2xl mx-auto overflow-hidden shadow-xl border border-slate-200"
            style={{
              aspectRatio: "16 / 9",
              maxHeight: "clamp(190px, 30dvh, 330px)",
              borderRadius: "20px"
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
              alt="App Dashboard Preview"
              className="w-full h-full object-cover object-center"
            />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="hidden md:block py-12 md:py-24 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Travel Smarter</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-base md:text-lg">
              Triplan combines travel logistics with financial management to give you the most comprehensive trip planning tool.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { title: "Expense Tracking", desc: "Split bills, track budgets, and manage group finances effortlessly.", icon: Wallet },
              { title: "Group Coordination", desc: "Shared itineraries and real-time updates for every traveller.", icon: Users },
              { title: "Secure Vault", desc: "Keep passports, tickets, and bookings in one encrypted place.", icon: Shield },
            ].map((feature, i) => (
              <div key={i} className="p-6 md:p-8 rounded-3xl border border-slate-100 bg-slate-50/50 hover:border-indigo-100 hover:bg-white transition-all group">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-5 md:mb-6 shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                  <feature.icon className="text-white w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="hidden md:block py-12 md:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-600 text-base md:text-lg">Choose the plan that fits your travel style.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { name: "Free", price: "0", features: ["1 Active Trip", "Up to 5 Travellers", "Basic Expenses", "Mobile App"] },
              { name: "Pro", price: "9", features: ["Unlimited Trips", "Unlimited Travellers", "Advanced Analytics", "Priority Support", "AI Insights"], popular: true },
              { name: "Enterprise", price: "29", features: ["Organization Control", "Custom Branding", "API Access", "Dedicated Manager"] },
            ].map((plan, i) => (
              <div key={i} className={cn(
                "p-6 md:p-8 rounded-3xl border transition-all flex flex-col",
                plan.popular ? "bg-white border-indigo-600 shadow-xl shadow-indigo-100 relative md:scale-105" : "bg-white/50 border-slate-200"
              )}>
                {plan.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-slate-500">/trip</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-slate-600 text-sm md:text-base">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button className={cn(
                  "w-full py-3 rounded-xl font-bold transition-all text-sm md:text-base",
                  plan.popular ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100" : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                )}>
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="hidden md:block py-12 md:py-24 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-16">Frequently Asked Questions</h2>
          <div className="space-y-4 md:space-y-6">
            {[
              { q: "Is Triplan available offline?", a: "Yes, you can access your itinerary and basic trip details without an internet connection." },
              { q: "Can I export my expense data?", a: "Absolutely! You can export your financial records to CSV or PDF at any time." },
              { q: "How many people can I invite?", a: "The Free plan supports up to 5 travellers. Pro and Enterprise support unlimited participants." },
            ].map((item, i) => (
              <div key={i} className="p-5 md:p-6 rounded-2xl border border-slate-100 bg-slate-50/30">
                <h4 className="text-base md:text-lg font-bold mb-2">{item.q}</h4>
                <p className="text-sm md:text-base text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hidden md:block bg-slate-950 text-slate-400 py-12 md:py-16 px-4 sm:px-6 lg:px-8 text-center md:text-left">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-12">
            <div className="col-span-1 md:col-span-2 flex flex-col items-center md:items-start">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Plane className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">Triplan</span>
              </div>
              <p className="max-w-sm mb-6 text-sm md:text-base">
                Making group travel organized, transparent, and fun. Built for modern travellers who value coordination.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <h5 className="text-white font-bold mb-4 md:mb-6 uppercase text-xs tracking-widest">Product</h5>
              <ul className="space-y-3 md:space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Itineraries</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Expenses</a></li>
              </ul>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <h5 className="text-white font-bold mb-4 md:mb-6 uppercase text-xs tracking-widest">Company</h5>
              <ul className="space-y-3 md:space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm">
            <p>© 2026 Triplan. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

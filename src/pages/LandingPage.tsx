import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Plane, Users, Wallet, Shield, CheckCircle2, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "../lib/utils";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Plane className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight">TripPro</span>
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
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={isMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        className="fixed top-16 w-full bg-white z-40 md:hidden overflow-hidden border-b border-slate-200"
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
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold mb-6 inline-block">
              New: AI-Powered Travel Insights
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
              Plan Trips Like <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Professionals</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              The ultimate group trip management platform. Track expenses, coordinate schedules, and manage documents all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/onboarding" className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2">
                Create New Trip <ChevronRight className="w-5 h-5" />
              </Link>
              <Link to="/join" className="w-full sm:w-auto bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2">
                Join Existing Trip
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent z-10 h-32 bottom-0" />
            <img
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
              alt="App Dashboard Preview"
              className="rounded-3xl shadow-2xl border border-slate-200"
            />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Travel Smarter</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              TripPro combines travel logistics with financial management to give you the most comprehensive trip planning tool.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Expense Tracking", desc: "Split bills, track budgets, and manage group finances effortlessly.", icon: Wallet },
              { title: "Group Coordination", desc: "Shared itineraries and real-time updates for every traveller.", icon: Users },
              { title: "Secure Vault", desc: "Keep passports, tickets, and bookings in one encrypted place.", icon: Shield },
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl border border-slate-100 bg-slate-50/50 hover:border-indigo-100 hover:bg-white transition-all group">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                  <feature.icon className="text-white w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-600">Choose the plan that fits your travel style.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Free", price: "0", features: ["1 Active Trip", "Up to 5 Travellers", "Basic Expenses", "Mobile App"] },
              { name: "Pro", price: "9", features: ["Unlimited Trips", "Unlimited Travellers", "Advanced Analytics", "Priority Support", "AI Insights"], popular: true },
              { name: "Enterprise", price: "29", features: ["Organization Control", "Custom Branding", "API Access", "Dedicated Manager"] },
            ].map((plan, i) => (
              <div key={i} className={cn(
                "p-8 rounded-3xl border transition-all flex flex-col",
                plan.popular ? "bg-white border-indigo-600 shadow-xl shadow-indigo-100 relative scale-105" : "bg-white/50 border-slate-200"
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
                    <li key={j} className="flex items-center gap-3 text-slate-600">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" /> {f}
                    </li>
                  ))}
                </ul>
                <button className={cn(
                  "w-full py-3 rounded-xl font-bold transition-all",
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
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: "Is TripPro available offline?", a: "Yes, you can access your itinerary and basic trip details without an internet connection." },
              { q: "Can I export my expense data?", a: "Absolutely! You can export your financial records to CSV or PDF at any time." },
              { q: "How many people can I invite?", a: "The Free plan supports up to 5 travellers. Pro and Enterprise support unlimited participants." },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/30">
                <h4 className="text-lg font-bold mb-2">{item.q}</h4>
                <p className="text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Plane className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">TripPro</span>
              </div>
              <p className="max-w-sm mb-6">
                Making group travel organized, transparent, and fun. Built for modern travellers who value coordination.
              </p>
            </div>
            <div>
              <h5 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Product</h5>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Itineraries</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Expenses</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Company</h5>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>© 2026 TripPro. All rights reserved.</p>
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

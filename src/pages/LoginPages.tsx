import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, Lock, Plane, Shield, UserCheck, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "../lib/utils";

interface LoginProps {
  type: "traveller" | "organizer" | "super-admin";
}

const LoginCard = ({ type }: LoginProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const config = {
    traveller: {
      title: "Traveller Login",
      subtitle: "Access your journey and expenses",
      icon: Plane,
      color: "bg-indigo-600",
      shadow: "shadow-indigo-100",
      redirect: "/dashboard"
    },
    organizer: {
      title: "Organizer Login",
      subtitle: "Manage your trips and travellers",
      icon: UserCheck,
      color: "bg-emerald-600",
      shadow: "shadow-emerald-100",
      redirect: "/admin/dashboard"
    },
    "super-admin": {
      title: "Super Admin",
      subtitle: "System-wide administration",
      icon: Shield,
      color: "bg-rose-600",
      shadow: "shadow-rose-100",
      redirect: "/super-admin/dashboard"
    }
  }[type];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    navigate(config.redirect);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full"
    >
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>
      
      <div className="bg-white rounded-[32px] shadow-2xl p-10 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl", config.color, config.shadow)}>
            <config.icon className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{config.title}</h1>
          <p className="text-slate-500 text-center">{config.subtitle}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:border-indigo-600 outline-none transition-all bg-slate-50/50"
                placeholder="name@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:border-indigo-600 outline-none transition-all bg-slate-50/50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
              <span className="text-sm text-slate-600">Remember me</span>
            </label>
            <a href="#" className="text-sm font-bold text-indigo-600 hover:underline">Forgot?</a>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-4 rounded-2xl text-white font-bold text-lg transition-all flex items-center justify-center gap-2",
              config.color,
              `hover:opacity-90 shadow-xl ${config.shadow}`
            )}
          >
            {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            {type === "traveller" ? "Don't have an account?" : "Need help accessing?"} 
            <a href="#" className="ml-1 font-bold text-indigo-600 hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export const TravellerLogin = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <LoginCard type="traveller" />
  </div>
);

export const OrganizerLogin = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <LoginCard type="organizer" />
  </div>
);

export const SuperAdminLogin = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <LoginCard type="super-admin" />
  </div>
);

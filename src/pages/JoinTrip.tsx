import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { User, Phone, Mail, Calendar, Users, Shield, Camera, Upload, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

export default function JoinTrip() {
  const { tripCode } = useParams();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    mobileNumber: "",
    email: "",
    age: "",
    gender: "Male",
    emergencyContact: "",
    profilePhoto: null as string | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate join logic
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">You're In!</h2>
          <p className="text-slate-600 mb-8">Successfully joined the trip. The organizer has been notified.</p>
          <button 
            onClick={() => navigate("/dashboard")}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Go to My Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-widest uppercase mb-4">
            Invite Link Active
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Join Trip: {tripCode}</h1>
          <p className="text-slate-500">Fill in your details to get added to the group.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 space-y-6">
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="w-24 h-24 bg-slate-100 rounded-full border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                {formData.profilePhoto ? (
                  <img src={formData.profilePhoto} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <User className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <button 
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Full Name *</label>
              <input 
                required
                type="text" 
                value={formData.fullName}
                onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Mobile Number *</label>
                <input 
                  required
                  type="tel" 
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData(p => ({ ...p, mobileNumber: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                  placeholder="+91 ..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Age</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={(e) => setFormData(p => ({ ...p, age: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Gender</label>
                <select 
                  value={formData.gender}
                  onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Emergency Contact</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input 
                  type="tel" 
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData(p => ({ ...p, emergencyContact: e.target.value }))}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                  placeholder="Contact number"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={() => navigate("/")}
              className="flex-1 px-6 py-4 rounded-2xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-[2] bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Join Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

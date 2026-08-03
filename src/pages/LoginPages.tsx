import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, Lock, Plane, Shield, UserCheck, ChevronRight, ArrowLeft, User, Phone, Eye, EyeOff } from "lucide-react";
import { cn } from "../lib/utils";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface LoginProps {
  type: "traveller" | "organizer" | "super-admin";
}

const LoginCard = ({ type }: LoginProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

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
      subtitle: "Manage your trips and travellers.",
      icon: User,
      color: "bg-indigo-600",
      shadow: "shadow-indigo-100",
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

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg("Please enter your email address in the field above to reset your password.");
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setInfoMsg(`Password reset email sent to ${cleanEmail}. Please check your inbox and spam folder.`);
    } catch (err: any) {
      console.error("Password reset error:", err);
      let friendlyMessage = "Failed to send password reset email.";
      if (err.code === "auth/user-not-found") {
        friendlyMessage = "No registered account found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    
    try {
      const targetRole = type === "super-admin" ? "super_admin" : type;

      if (isRegister) {
        // Register flow
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user document in firestore
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          name: fullName || "User",
          email: cred.user.email,
          phone: phone || "",
          role: targetRole,
          createdAt: new Date().toISOString()
        }, { merge: true });

        // If it's a super-admin, also add to admins collection for backward compatibility
        if (targetRole === "super_admin") {
          await setDoc(doc(db, "admins", cred.user.uid), {
            uid: cred.user.uid,
            email: cred.user.email,
            organizationId: "super_admin",
            createdAt: new Date().toISOString()
          }, { merge: true });
        } else if (targetRole === "organizer") {
          await setDoc(doc(db, "admins", cred.user.uid), {
            uid: cred.user.uid,
            email: cred.user.email,
            organizationId: `personal_${cred.user.uid}`,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        setIsLoading(false);
        navigate(config.redirect);
      } else {
        // Sign In flow
        const cred = await signInWithEmailAndPassword(auth, email, password);
        
        // Check and create profile if missing
        const userDocRef = doc(db, "users", cred.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            uid: cred.user.uid,
            name: cred.user.displayName || "User",
            email: cred.user.email,
            phone: cred.user.phoneNumber || "",
            role: targetRole,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        setIsLoading(false);
        navigate(config.redirect);
      }
    } catch (err: any) {
      let friendlyMessage = "Authentication failed. Please check your credentials.";
      if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "This email is already registered. Please sign in instead.";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        friendlyMessage = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/weak-password") {
        friendlyMessage = "Password is too weak. It must be at least 6 characters.";
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setErrorMsg(friendlyMessage);
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full my-auto"
    >
      <Link 
        to={type === "organizer" ? "/join" : "/"} 
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 font-bold mb-4 sm:mb-6 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {type === "organizer" ? "Back to Join Trip" : "Back to Home"}
      </Link>
      
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 p-5 sm:p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-2.5">
            <config.icon className="text-indigo-600 w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            {isRegister ? `Register as ${type === "traveller" ? "Traveller" : "Organizer"}` : config.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">{isRegister ? "Create a secure account on TripPro" : config.subtitle}</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-semibold rounded-xl text-center">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {isRegister && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-12 sm:h-13 pl-10 pr-3.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all text-xs sm:text-sm bg-slate-50/50"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-12 sm:h-13 pl-10 pr-3.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all text-xs sm:text-sm bg-slate-50/50"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 sm:h-13 pl-10 pr-3.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all text-xs sm:text-sm bg-slate-50/50"
                placeholder="name@email.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                required
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 sm:h-13 pl-10 pr-10 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all text-xs sm:text-sm bg-slate-50/50"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isRegister && (
            <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                <span>Remember me</span>
              </label>
              <button type="button" onClick={handleForgotPassword} className="font-bold text-indigo-600 hover:underline cursor-pointer">Forgot password?</button>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full h-12 sm:h-13 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isRegister ? "Register" : "Sign In")}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100">
          {type === "organizer" ? (
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-slate-600">New organizer?</p>
              <p className="text-xs text-slate-400 mb-3">Create a new trip to get started.</p>
              <button 
                type="button" 
                onClick={() => navigate("/onboarding")} 
                className="w-full bg-white text-indigo-600 border border-indigo-200 h-11 sm:h-12 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Create New Trip <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : type === "traveller" ? (
            <div className="text-center space-y-1">
              <p className="text-xs text-slate-500 mb-2">Have a trip code from your organizer?</p>
              <button 
                type="button" 
                onClick={() => navigate("/join")} 
                className="text-xs sm:text-sm font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Join Existing Trip with Code
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button 
                type="button" 
                onClick={() => {
                  setIsRegister(!isRegister);
                  setErrorMsg(null);
                }} 
                className="text-xs sm:text-sm font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                {isRegister ? "Already have an account? Sign In" : "Don't have an account? Create one"}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const TravellerLogin = () => (
  <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4 sm:p-6">
    <LoginCard type="traveller" />
  </div>
);

export const OrganizerLogin = () => (
  <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4 sm:p-6">
    <LoginCard type="organizer" />
  </div>
);

export const SuperAdminLogin = () => (
  <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4 sm:p-6">
    <LoginCard type="super-admin" />
  </div>
);


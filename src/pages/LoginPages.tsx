import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, Lock, Plane, Shield, UserCheck, ChevronRight, ArrowLeft, User, Phone } from "lucide-react";
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
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
            {isRegister ? `Register as ${type === "traveller" ? "Traveller" : "Organizer"}` : config.title}
          </h1>
          <p className="text-slate-500 text-center">{isRegister ? "Create a secure account on TripPro" : config.subtitle}</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-2xl text-center">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm font-semibold rounded-2xl text-center">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {isRegister && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input 
                    required
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:border-indigo-600 outline-none transition-all bg-slate-50/50"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:border-indigo-600 outline-none transition-all bg-slate-50/50"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </>
          )}

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

          {!isRegister && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-indigo-600 hover:underline">Forgot?</button>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-4 rounded-2xl text-white font-bold text-lg transition-all flex items-center justify-center gap-2",
              config.color,
              `hover:opacity-90 shadow-xl ${config.shadow}`
            )}
          >
            {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isRegister ? "Register" : "Sign In")}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center space-y-3">
          {type === "organizer" ? (
            <div>
              <p className="text-xs text-slate-500 mb-2">Organizers create accounts by starting a new trip.</p>
              <button 
                type="button" 
                onClick={() => navigate("/onboarding")} 
                className="text-sm font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Create New Trip & Organizer Account
              </button>
            </div>
          ) : type === "traveller" ? (
            <div>
              <p className="text-xs text-slate-500 mb-2">Have a trip code from your organizer?</p>
              <button 
                type="button" 
                onClick={() => navigate("/join")} 
                className="text-sm font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Join Existing Trip with Code
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
              }} 
              className="text-sm font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              {isRegister ? "Already have an account? Sign In" : "Don't have an account? Create one"}
            </button>
          )}
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

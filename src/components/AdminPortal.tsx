/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Shield, Lock, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export const AdminPortal: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthDisabled, setIsAuthDisabled] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        await signInWithEmailAndPassword(auth, "test-setup-check@test.com", "testpassword123");
      } catch (err: any) {
        if (err.code === 'auth/operation-not-allowed') {
          setIsAuthDisabled(true);
        }
      } finally {
        setIsCheckingSetup(false);
      }
    };
    
    // Ensure we don't check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsCheckingSetup(true); // Prevent flashing
        try {
          const adminDocRef = doc(db, "admins", user.uid);
          let adminDoc = await getDoc(adminDocRef);
          
          if (!adminDoc.exists()) {
            const isSuper = user.email === 'ajvadujire@gmail.com';
            const role = isSuper ? "super_admin" : "user";
            const newAdminData = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || "Unknown",
              email: user.email,
              role: role,
              permissions: isSuper ? {
                dashboard: true,
                trips: true,
                journey: true,
                expenses: true,
                budget: true,
                travellers: true,
                documents: true,
                reports: true,
                settings: true
              } : {},
              status: "Active",
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              organizationId: `personal_${user.uid}`
            };
            await setDoc(adminDocRef, newAdminData);
            adminDoc = await getDoc(adminDocRef);
          } else {
            await setDoc(adminDocRef, { lastLogin: new Date().toISOString() }, { merge: true });
          }

          if (adminDoc.exists()) {
            const data = adminDoc.data();
            if (data.role === "super_admin" || data.role === "admin" || data.role === "Admin") {
              navigate("/admin-portal/dashboard");
            } else {
              setError("Access Denied: You do not have administrator privileges.");
              auth.signOut();
              setIsCheckingSetup(false);
            }
          }
        } catch (err) {
          console.error("Auth Error:", err);
          setIsCheckingSetup(false);
        }
      } else {
        checkSetup();
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setIsAuthDisabled(true);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Incorrect email or password.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Unable to connect. Please check your internet connection.");
      } else {
        setError("Incorrect email or password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSetup) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400 font-medium">Verifying system configuration...</p>
      </div>
    );
  }

  if (isAuthDisabled) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-rose-500/30 shadow-2xl w-full max-w-lg">
          <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
            <AlertTriangle className="text-rose-500 w-6 h-6" /> System Setup Required
          </h2>
          <p className="text-slate-400 mb-6 text-sm">
            Email/Password Authentication is currently disabled in your Firebase project. This must be enabled for the Admin Portal to function.
          </p>
          
          <div className="space-y-4 mb-6">
            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Setup Instructions
              </h3>
              <ol className="list-decimal list-inside text-slate-300 space-y-2.5 text-sm font-medium">
                <li>Open your Firebase Console.</li>
                <li>Go to <strong>Authentication</strong> &gt; <strong>Sign-in method</strong>.</li>
                <li>Click on <strong>Email/Password</strong> provider.</li>
                <li>Toggle <strong>Enable</strong> and click Save.</li>
              </ol>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Open Firebase Console
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-500 font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              I have enabled it, Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-rose-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 transform rotate-12">
            <div className="transform -rotate-12">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-black text-white text-center mb-2 tracking-tight">Admin Portal</h1>
        <p className="text-slate-400 text-sm text-center mb-8 font-medium">
          Authorized personnel only. Secure login required.
        </p>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm font-bold mb-6 flex items-start gap-3">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest pl-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest pl-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Access System"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

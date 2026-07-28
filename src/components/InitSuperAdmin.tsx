import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export const InitSuperAdmin: React.FC = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();

  const handleInit = async () => {
    setStatus("loading");
    setMessage("Initializing Super Admin...");
    
    try {
      const email = "ajvadujire@gmail.com";
      const password = "154183";
      
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, "admins", cred.user.uid), {
        id: cred.user.uid,
        name: "Super Administrator",
        email: email,
        role: "super_admin",
        status: "Active",
        permissions: {
          dashboard: true,
          trips: true,
          journey: true,
          expenses: true,
          budget: true,
          travellers: true,
          documents: true,
          reports: true,
          settings: true
        },
        createdAt: new Date().toISOString(),
        organizationId: "system"
      });
      
      setStatus("success");
      setMessage("Super Admin successfully created! Redirecting...");
      setTimeout(() => navigate("/admin-portal/dashboard"), 2000);
      
    } catch (err: any) {
      setStatus("error");
      const errorCode = err.code || (err.message?.includes("auth/email-already-in-use") ? "auth/email-already-in-use" : "");
      
      if (errorCode === "auth/email-already-in-use") {
        setMessage("Super Admin already exists. You can log in normally.");
      } else if (errorCode === "auth/operation-not-allowed") {
        setMessage("Email/Password Auth is disabled in Firebase.");
      } else {
        setMessage(`Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md text-center">
        <h1 className="text-2xl font-black text-white mb-2">System Setup</h1>
        <p className="text-slate-400 mb-8 text-sm">Initialize the permanent Super Admin account.</p>
        
        {status === "idle" && (
          <button 
            onClick={handleInit}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            Create Super Admin
          </button>
        )}
        
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 text-indigo-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="font-bold">{message}</span>
          </div>
        )}
        
        {status === "success" && (
          <div className="flex flex-col items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
            <span className="font-bold">{message}</span>
          </div>
        )}
        
        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-3 text-rose-400">
              <AlertTriangle className="w-8 h-8" />
              <span className="font-bold">{message}</span>
            </div>
            <button 
              onClick={() => navigate("/admin-portal")}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

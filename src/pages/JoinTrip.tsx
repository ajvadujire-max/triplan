import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { User, Phone, Mail, Calendar, Users, Shield, Camera, Upload, CheckCircle2, Lock, MapPin, UserCheck } from "lucide-react";
import { cn } from "../lib/utils";
import { fetchTripByInviteCode } from "../lib/firestoreSync";
import { Trip, Traveller } from "../types";
import { auth, db } from "../lib/firebase";

export default function JoinTrip() {
  const { tripCode } = useParams();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingTrip, setFetchingTrip] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: "",
    mobileNumber: "",
    email: "",
    age: "",
    gender: "Male",
    emergencyContact: "",
    profilePhoto: null as string | null,
  });

  useEffect(() => {
    return auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
  }, []);

  useEffect(() => {
    async function loadTrip() {
      if (!tripCode) return;
      try {
        const foundTrip = await fetchTripByInviteCode(tripCode.trim().toUpperCase());
        if (!foundTrip) {
          // Check local storage fallback
          const savedTrips = localStorage.getItem("trippro_trips");
          const localTrips: Trip[] = savedTrips ? JSON.parse(savedTrips) : [];
          const foundLocal = localTrips.find(t => 
            (t.inviteCode && t.inviteCode.toUpperCase() === tripCode.trim().toUpperCase()) ||
            (t.tripCode && t.tripCode.toUpperCase() === tripCode.trim().toUpperCase())
          );
          if (foundLocal) {
            setTrip(foundLocal);
          }
        } else {
          setTrip(foundTrip);
        }
      } catch (err) {
        console.error("Failed to load trip:", err);
      } finally {
        setFetchingTrip(false);
      }
    }
    loadTrip();
  }, [tripCode]);

  const organizerName = React.useMemo(() => {
    if (!trip) return "Trip Organizer";
    const org = trip.travellers?.find(t => t.role === "Organizer" || t.role === "organizer");
    return org?.fullName || "Primary Organizer";
  }, [trip]);

  const coverImage = trip?.coverPhoto || trip?.coverImage || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      if (trip) {
        let activeUid = currentUser?.uid;
        let userEmail = formData.email.trim();

        if (!activeUid) {
          if (!password || password.length < 6) {
            setErrorMsg("Password must be at least 6 characters.");
            setIsLoading(false);
            return;
          }

          if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match. Please verify your password.");
            setIsLoading(false);
            return;
          }

          if (!userEmail) {
            // Generate fallback email if empty
            userEmail = `${formData.mobileNumber.replace(/\D/g, "")}@trippro.app`;
          }
          
          const { createUserWithEmailAndPassword } = await import("firebase/auth");
          const { doc, setDoc } = await import("firebase/firestore");
          
          const cred = await createUserWithEmailAndPassword(auth, userEmail, password);
          activeUid = cred.user.uid;

          // Create user profile in /users/{uid}
          await setDoc(doc(db, "users", activeUid), {
            uid: activeUid,
            fullName: formData.fullName,
            name: formData.fullName,
            email: userEmail,
            phone: formData.mobileNumber,
            role: "traveller",
            tripId: trip.id,
            tripCode: trip.inviteCode || tripCode,
            status: "active",
            createdAt: new Date().toISOString()
          }, { merge: true });
        } else {
          // Logged in user: update profile with trip link
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(db, "users", activeUid), {
            uid: activeUid,
            role: "traveller",
            tripId: trip.id,
            tripCode: trip.inviteCode || tripCode,
            status: "active"
          }, { merge: true });
          if (!userEmail && currentUser.email) {
            userEmail = currentUser.email;
          }
        }

        const { doc, setDoc, getDoc } = await import("firebase/firestore");

        // Prepare new traveller record
        const newTraveller: Traveller = {
          id: activeUid,
          fullName: formData.fullName,
          age: Number(formData.age) || 25,
          gender: formData.gender,
          phone: formData.mobileNumber,
          email: userEmail,
          emergencyContact: formData.emergencyContact || "",
          bloodGroup: "O+",
          role: "Traveller",
          allocatedBudget: 0,
          profilePhoto: formData.profilePhoto || "",
          status: "active"
        };
        
        // Update trip document in Firestore directly
        const tripRef = doc(db, "trips", trip.id);
        const tripSnap = await getDoc(tripRef);
        let updatedTravellers: Traveller[] = trip.travellers ? [...trip.travellers] : [];
        let updatedMemberUids: string[] = trip.memberUids ? [...trip.memberUids] : [trip.organizerUid || ""];

        if (tripSnap.exists()) {
          const tripData = tripSnap.data();
          if (tripData.travellers) updatedTravellers = tripData.travellers;
          if (tripData.memberUids) updatedMemberUids = tripData.memberUids;
        }

        // Add or update traveller in list
        const existingIdx = updatedTravellers.findIndex(t => t.id === activeUid || t.email === userEmail);
        if (existingIdx >= 0) {
          updatedTravellers[existingIdx] = { ...updatedTravellers[existingIdx], ...newTraveller };
        } else {
          updatedTravellers.push(newTraveller);
        }

        if (!updatedMemberUids.includes(activeUid)) {
          updatedMemberUids.push(activeUid);
        }

        await setDoc(tripRef, {
          travellers: updatedTravellers,
          memberUids: updatedMemberUids,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Save registration record in subcollection
        const regRef = doc(db, "trips", trip.id, "registrations", activeUid);
        await setDoc(regRef, {
          id: activeUid,
          fullName: formData.fullName,
          age: Number(formData.age) || 25,
          gender: formData.gender,
          phone: formData.mobileNumber,
          emergencyContact: formData.emergencyContact || "",
          email: userEmail,
          profilePhoto: formData.profilePhoto || "",
          status: "Approved",
          submissionDate: new Date().toISOString(),
          accuracyConfirmed: true,
          role: "Traveller",
          allocatedBudget: 0
        }, { merge: true });

        // Add to local storage
        const updatedTripDoc: Trip = {
          ...trip,
          travellers: updatedTravellers,
          memberUids: updatedMemberUids
        };

        const savedTrips = localStorage.getItem("trippro_trips");
        const currentTrips: Trip[] = savedTrips ? JSON.parse(savedTrips) : [];
        const idx = currentTrips.findIndex(t => t.id === trip.id);
        if (idx >= 0) {
          currentTrips[idx] = updatedTripDoc;
        } else {
          currentTrips.unshift(updatedTripDoc);
        }
        localStorage.setItem("trippro_trips", JSON.stringify(currentTrips));

        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred while joining the trip.");
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchingTrip) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!trip && !fetchingTrip) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid Trip Code</h2>
          <p className="text-slate-500 mb-6">We couldn't find an active trip matching code <strong>{tripCode}</strong>.</p>
          <button 
            onClick={() => navigate("/join")} 
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md cursor-pointer"
          >
            Try Another Code
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">You're In!</h2>
          <p className="text-slate-600 mb-8">Successfully joined <strong>{trip?.name}</strong>. Welcome to the trip!</p>
          <button 
            onClick={() => navigate("/dashboard")}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 cursor-pointer"
          >
            Go to My Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Trip Overview Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div 
            className="h-44 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${coverImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex items-end p-6">
              <div className="text-white space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                  Trip Invite
                </span>
                <h1 className="text-2xl font-black text-white">{trip?.name}</h1>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {trip?.destination}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" /> {trip?.startDate} to {trip?.endDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-50/60 border-b border-indigo-100/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-medium">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Organizer: <strong>{organizerName}</strong></span>
            </div>
            <div className="font-mono font-bold text-indigo-600 uppercase bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
              Code: {trip?.inviteCode || tripCode}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-2xl text-sm">
            {errorMsg}
          </div>
        )}

        {/* Join Trip Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-100 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Traveller Registration</h2>
            <p className="text-xs text-slate-500">Fill in your details to join {trip?.name} as a Traveller.</p>
          </div>

          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="w-20 h-20 bg-slate-100 rounded-full border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                {formData.profilePhoto ? (
                  <img src={formData.profilePhoto} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <User className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <button 
                type="button"
                className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Full Name *</label>
              <input 
                required
                type="text" 
                value={formData.fullName}
                onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mobile Number *</label>
                <input 
                  required
                  type="tel" 
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData(p => ({ ...p, mobileNumber: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {!currentUser && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                      placeholder="Repeat password"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Age (optional)</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={(e) => setFormData(p => ({ ...p, age: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                  placeholder="25"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Gender (optional)</label>
                <select 
                  value={formData.gender}
                  onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all bg-white text-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Emergency Contact (optional)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="tel" 
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData(p => ({ ...p, emergencyContact: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                  placeholder="Emergency phone number"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={() => navigate("/")}
              className="flex-1 px-5 py-3 rounded-2xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-[2] bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Join Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

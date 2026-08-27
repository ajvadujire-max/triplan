import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { User, Phone, Mail, Calendar, Users, Shield, Camera, Upload, CheckCircle2, Lock, MapPin, UserCheck, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { cn } from "../lib/utils";
import { fetchTripByInviteCode } from "../lib/firestoreSync";
import { Trip, Traveller } from "../types";
import { auth, db } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { googleSignIn } from "../lib/googleAuth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ProfilePhotoUpload } from "../components/ProfilePhotoUpload";
import { uploadProfilePhotoToStorage } from "../lib/image-utils";

export default function JoinTrip() {
  const { tripCode } = useParams();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingTrip, setFetchingTrip] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  
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
    return auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            setFormData(prev => ({
              ...prev,
              fullName: uData.fullName || uData.name || user.displayName || prev.fullName,
              mobileNumber: uData.phone || user.phoneNumber || prev.mobileNumber,
              email: uData.email || user.email || prev.email,
              age: uData.age ? String(uData.age) : prev.age,
              gender: uData.gender || prev.gender,
              emergencyContact: uData.emergencyContact || prev.emergencyContact,
              profilePhoto: uData.profilePhoto || user.photoURL || prev.profilePhoto,
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              fullName: user.displayName || prev.fullName,
              email: user.email || prev.email,
              mobileNumber: user.phoneNumber || prev.mobileNumber,
            }));
          }
        } catch (e: any) {
          console.warn("Could not fetch user profile for prefill (client may be offline):", e?.message || e);
          setFormData(prev => ({
            ...prev,
            fullName: user.displayName || prev.fullName,
            email: user.email || prev.email,
            mobileNumber: user.phoneNumber || prev.mobileNumber,
          }));
        }
      }
    });
  }, []);

  useEffect(() => {
    async function loadTrip() {
      if (!tripCode) return;
      try {
        const foundTrip = await fetchTripByInviteCode(tripCode.trim().toUpperCase());
        if (!foundTrip) {
          // Check local storage fallback
          const savedTrips = localStorage.getItem("triplan_trips");
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

  const isAlreadyMember = React.useMemo(() => {
    if (!currentUser || !trip) return false;
    const isOrganizer = trip.organizerUid === currentUser.uid || trip.organizerId === currentUser.uid;
    const isMemberUid = Array.isArray(trip.memberUids) && trip.memberUids.includes(currentUser.uid);
    const isTraveller = Array.isArray(trip.travellers) && trip.travellers.some(t => t.id === currentUser.uid && t.status !== "left");
    return isOrganizer || isMemberUid || isTraveller;
  }, [currentUser, trip]);

  useEffect(() => {
    if (isAlreadyMember && trip) {
      localStorage.setItem("triplan_active_trip_id", trip.id);
      localStorage.setItem("triplan_last_trip_id", trip.id);
      localStorage.setItem("triplan_last_trip_code", trip.inviteCode || trip.tripCode || tripCode || "");
      window.dispatchEvent(new Event("trip_changed"));
      navigate("/dashboard", { replace: true, state: { notice: `You're already a member of ${trip.name}.` } });
    }
  }, [isAlreadyMember, trip, navigate, tripCode]);

  const coverImage = trip?.coverPhoto || trip?.coverImage || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";

  const handleGoogleJoin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setShowSignInPrompt(false);
    try {
      const res = await googleSignIn();
      if (res && res.user && trip) {
        const activeUid = res.user.uid;
        const userEmail = res.user.email || formData.email || "";
        const fullName = res.user.displayName || formData.fullName || "Traveller";

        // Create / merge user profile
        await setDoc(doc(db, "users", activeUid), {
          uid: activeUid,
          fullName: fullName,
          name: fullName,
          email: userEmail,
          phone: res.user.phoneNumber || formData.mobileNumber,
          role: "traveller",
          tripId: trip.id,
          lastActiveTripId: trip.id,
          tripCode: trip.inviteCode || tripCode,
          status: "active",
          createdAt: new Date().toISOString()
        }, { merge: true });

        // Save membership
        await setDoc(doc(db, "users", activeUid, "memberships", trip.id), {
          tripId: trip.id,
          tripName: trip.name,
          tripCode: trip.inviteCode || trip.tripCode || tripCode,
          role: "traveller",
          joinedAt: new Date().toISOString(),
          status: "active"
        }, { merge: true });

        let finalGooglePhoto = res.user.photoURL || formData.profilePhoto || "";
        if (finalGooglePhoto && finalGooglePhoto.startsWith("data:")) {
          try {
            finalGooglePhoto = await uploadProfilePhotoToStorage(finalGooglePhoto, activeUid);
          } catch (err) {
            console.error("Profile photo upload failed:", err);
          }
        }

        // Prepare traveller record and update trip
        const newTraveller: Traveller = {
          id: activeUid,
          fullName: fullName,
          age: Number(formData.age) || 25,
          gender: formData.gender,
          phone: res.user.phoneNumber || formData.mobileNumber || "",
          email: userEmail,
          emergencyContact: formData.emergencyContact || "",
          bloodGroup: "O+",
          role: "Traveller",
          allocatedBudget: 0,
          profilePhotoUrl: finalGooglePhoto,
          profilePhoto: finalGooglePhoto,
          status: "active"
        };

        const tripRef = doc(db, "trips", trip.id);
        const tripSnap = await getDoc(tripRef);
        let updatedTravellers: Traveller[] = trip.travellers ? [...trip.travellers] : [];
        let updatedMemberUids: string[] = trip.memberUids ? [...trip.memberUids] : [trip.organizerUid || ""];

        if (tripSnap.exists()) {
          const tripData = tripSnap.data();
          if (tripData.travellers) updatedTravellers = tripData.travellers;
          if (tripData.memberUids) updatedMemberUids = tripData.memberUids;
        }

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
          fullName: fullName,
          age: Number(formData.age) || 25,
          gender: formData.gender,
          phone: res.user.phoneNumber || formData.mobileNumber || "",
          emergencyContact: formData.emergencyContact || "",
          email: userEmail,
          profilePhoto: res.user.photoURL || formData.profilePhoto || "",
          status: "Approved",
          submissionDate: new Date().toISOString(),
          accuracyConfirmed: true,
          role: "Traveller",
          allocatedBudget: 0
        }, { merge: true });

        const updatedTripDoc: Trip = {
          ...trip,
          travellers: updatedTravellers,
          memberUids: updatedMemberUids
        };

        const savedTrips = localStorage.getItem("triplan_trips");
        const currentTrips: Trip[] = savedTrips ? JSON.parse(savedTrips) : [];
        const idx = currentTrips.findIndex(t => t.id === trip.id);
        if (idx >= 0) {
          currentTrips[idx] = updatedTripDoc;
        } else {
          currentTrips.unshift(updatedTripDoc);
        }
        localStorage.setItem("triplan_trips", JSON.stringify(currentTrips));
        localStorage.setItem("triplan_active_trip_id", trip.id);
        localStorage.setItem("triplan_last_trip_id", trip.id);
        localStorage.setItem("triplan_last_trip_code", trip.inviteCode || trip.tripCode || tripCode || "");
        window.dispatchEvent(new Event("trip_changed"));

        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error("Google join error:", err);
      const code = err?.code || "";
      const msg = err?.message || String(err);
      if (code === "auth/popup-closed-by-user") {
        setErrorMsg("Google Sign-In was cancelled. Please try again when ready.");
      } else if (msg.includes("access_denied") || msg.includes("403") || code === "auth/unauthorized-domain") {
        setErrorMsg("Google Sign-In is currently in testing mode in the Google Cloud Console. To allow all travellers to sign in without adding them as test users, please set the OAuth consent screen publishing status to 'In Production' in the Google Cloud Console (APIs & Services > OAuth consent screen). Alternatively, please use Email and Password sign-in below.");
      } else {
        setErrorMsg("Google Sign-In could not be completed. Please check your network connection or use Email and Password sign-in.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setShowSignInPrompt(false);
    
    try {
      if (trip) {
        let activeUid = currentUser?.uid;
        let userEmail = formData.email.trim();

        if (!activeUid) {
          if (!userEmail) {
            setErrorMsg("Please enter your email address.");
            setIsLoading(false);
            return;
          }

          if (!password || password.length < 6) {
            setErrorMsg("Password must be at least 6 characters.");
            setIsLoading(false);
            return;
          }

          if (authMode === "signin") {
            const cred = await signInWithEmailAndPassword(auth, userEmail, password);
            activeUid = cred.user.uid;

            await setDoc(doc(db, "users", activeUid), {
              uid: activeUid,
              role: "traveller",
              tripId: trip.id,
              lastActiveTripId: trip.id,
              tripCode: trip.inviteCode || tripCode,
              status: "active"
            }, { merge: true });
          } else {
            if (password !== confirmPassword) {
              setErrorMsg("Passwords do not match. Please verify your password.");
              setIsLoading(false);
              return;
            }

            const cred = await createUserWithEmailAndPassword(auth, userEmail, password);
            activeUid = cred.user.uid;

            await setDoc(doc(db, "users", activeUid), {
              uid: activeUid,
              fullName: formData.fullName || userEmail.split("@")[0],
              name: formData.fullName || userEmail.split("@")[0],
              email: userEmail,
              phone: formData.mobileNumber,
              role: "traveller",
              tripId: trip.id,
              lastActiveTripId: trip.id,
              tripCode: trip.inviteCode || tripCode,
              status: "active",
              createdAt: new Date().toISOString()
            }, { merge: true });
          }
        } else {
          await setDoc(doc(db, "users", activeUid), {
            uid: activeUid,
            role: "traveller",
            tripId: trip.id,
            lastActiveTripId: trip.id,
            tripCode: trip.inviteCode || tripCode,
            status: "active"
          }, { merge: true });
          if (!userEmail && currentUser.email) {
            userEmail = currentUser.email;
          }
        }

        await setDoc(doc(db, "users", activeUid, "memberships", trip.id), {
          tripId: trip.id,
          tripName: trip.name,
          tripCode: trip.inviteCode || trip.tripCode || tripCode,
          role: "traveller",
          joinedAt: new Date().toISOString(),
          status: "active"
        }, { merge: true });

        let finalPhotoUrl = formData.profilePhoto || currentUser?.photoURL || "";
        if (finalPhotoUrl && finalPhotoUrl.startsWith("data:")) {
          try {
            finalPhotoUrl = await uploadProfilePhotoToStorage(finalPhotoUrl, activeUid);
          } catch (err) {
            console.error("Profile photo upload failed:", err);
          }
        }

        const resolvedName = formData.fullName || currentUser?.displayName || userEmail.split("@")[0] || "Traveller";
        const newTraveller: Traveller = {
          id: activeUid,
          fullName: resolvedName,
          age: Number(formData.age) || 25,
          gender: formData.gender,
          phone: formData.mobileNumber || currentUser?.phoneNumber || "",
          email: userEmail,
          emergencyContact: formData.emergencyContact || "",
          bloodGroup: "O+",
          role: "Traveller",
          allocatedBudget: 0,
          profilePhotoUrl: finalPhotoUrl,
          profilePhoto: finalPhotoUrl,
          status: "active"
        };
        
        const tripRef = doc(db, "trips", trip.id);
        const tripSnap = await getDoc(tripRef);
        let updatedTravellers: Traveller[] = trip.travellers ? [...trip.travellers] : [];
        let updatedMemberUids: string[] = trip.memberUids ? [...trip.memberUids] : [trip.organizerUid || ""];

        if (tripSnap.exists()) {
          const tripData = tripSnap.data();
          if (tripData.travellers) updatedTravellers = tripData.travellers;
          if (tripData.memberUids) updatedMemberUids = tripData.memberUids;
        }

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

        const regRef = doc(db, "trips", trip.id, "registrations", activeUid);
        await setDoc(regRef, {
          id: activeUid,
          fullName: resolvedName,
          age: Number(formData.age) || 25,
          gender: formData.gender,
          phone: formData.mobileNumber || "",
          emergencyContact: formData.emergencyContact || "",
          email: userEmail,
          profilePhoto: formData.profilePhoto || "",
          status: "Approved",
          submissionDate: new Date().toISOString(),
          accuracyConfirmed: true,
          role: "Traveller",
          allocatedBudget: 0
        }, { merge: true });

        const updatedTripDoc: Trip = {
          ...trip,
          travellers: updatedTravellers,
          memberUids: updatedMemberUids
        };

        const savedTrips = localStorage.getItem("triplan_trips");
        const currentTrips: Trip[] = savedTrips ? JSON.parse(savedTrips) : [];
        const idx = currentTrips.findIndex(t => t.id === trip.id);
        if (idx >= 0) {
          currentTrips[idx] = updatedTripDoc;
        } else {
          currentTrips.unshift(updatedTripDoc);
        }
        localStorage.setItem("triplan_trips", JSON.stringify(currentTrips));
        localStorage.setItem("triplan_active_trip_id", trip.id);
        localStorage.setItem("triplan_last_trip_id", trip.id);
        localStorage.setItem("triplan_last_trip_code", trip.inviteCode || trip.tripCode || tripCode || "");
        window.dispatchEvent(new Event("trip_changed"));

        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use" || err.message?.includes("email-already-in-use")) {
        setErrorMsg("An account already exists with this email.");
        setShowSignInPrompt(true);
        setAuthMode("signin");
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setErrorMsg("Invalid email or password. Please try again or create an account.");
      } else {
        setErrorMsg(err.message || "An error occurred while joining the trip.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchingTrip) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!trip && !fetchingTrip) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-[clamp(20px,4vw,32px)] text-center border border-slate-100">
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

  if (isAlreadyMember) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-6 text-center border border-slate-100 space-y-3"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Opening {trip?.name}...</h2>
          <p className="text-xs text-slate-500">You're already a member of this trip. Redirecting to your dashboard.</p>
          <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto pt-1" />
        </motion.div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-[clamp(20px,4vw,32px)] text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">You're In!</h2>
          <p className="text-slate-600 mb-8">Successfully joined <strong>{trip?.name}</strong>. Welcome to the trip!</p>
          <button 
            onClick={() => {
              if (trip) {
                localStorage.setItem("triplan_active_trip_id", trip.id);
                localStorage.setItem("triplan_last_trip_id", trip.id);
                localStorage.setItem("triplan_last_trip_code", trip.inviteCode || trip.tripCode || tripCode || "");
                window.dispatchEvent(new Event("trip_changed"));
              }
              navigate("/dashboard");
            }}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 cursor-pointer"
          >
            Go to My Dashboard
          </button>
          <button
            onClick={() => navigate("/join")}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs cursor-pointer mt-2"
          >
            Join Another Trip
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 py-[clamp(16px,4dvh,40px)] px-3 sm:px-6 flex flex-col justify-start">
      <div className="max-w-xl w-full mx-auto space-y-4 sm:space-y-6">
        {/* Trip Overview Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div 
            className="h-[clamp(130px,20dvh,180px)] bg-cover bg-center relative"
            style={{ backgroundImage: `url(${coverImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex items-end p-4 sm:p-6">
              <div className="text-white space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                  Trip Invite
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white">{trip?.name}</h1>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-#34D399" /> {trip?.destination}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-#34D399" /> {trip?.startDate} to {trip?.endDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-indigo-50/60 border-b border-indigo-100/50 flex items-center justify-between text-xs">
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
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-2xl text-sm flex flex-col gap-2">
            <div>{errorMsg}</div>
            {showSignInPrompt && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setErrorMsg(null);
                  setShowSignInPrompt(false);
                }}
                className="self-start text-xs font-bold px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Sign In Instead
              </button>
            )}
          </div>
        )}

        {/* Join Trip Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-8 border border-slate-100 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                {authMode === "signin" ? "Sign In to Join Trip" : "Traveller Registration"}
              </h2>
              <p className="text-xs text-slate-500">
                {authMode === "signin" 
                  ? `Enter your account password to join ${trip?.name}.` 
                  : `Fill in your details to join ${trip?.name} as a Traveller.`}
              </p>
            </div>

            {!currentUser && (
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => { setAuthMode("signup"); setErrorMsg(null); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signin"); setErrorMsg(null); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          {!currentUser && (
            <button
              type="button"
              onClick={handleGoogleJoin}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.21 24 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.84 0 12s.43 3.87 1.18 5.39l4.09-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.21 0 3.15 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          )}

          {!currentUser && (
            <div className="flex items-center gap-3 my-2 text-slate-300 text-xs">
              <div className="h-px bg-slate-200 flex-1" />
              <span>OR EMAIL</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>
          )}

          <div className="mb-4">
            <ProfilePhotoUpload
              photoUrl={formData.profilePhoto || undefined}
              fullName={formData.fullName}
              onChangePhoto={(url) => setFormData(p => ({ ...p, profilePhoto: url }))}
              onRemovePhoto={() => setFormData(p => ({ ...p, profilePhoto: null }))}
            />
          </div>

          <div className="grid gap-4">
            {authMode === "signup" && (
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
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {authMode === "signup" && (
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
              )}

              <div className={`space-y-1.5 ${authMode === "signin" ? "sm:col-span-2" : ""}`}>
                <label className="text-xs font-bold text-slate-700">Email Address *</label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {!currentUser && (
              <div className={`grid ${authMode === "signup" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-4 pt-2 border-t border-slate-100`}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === "signup" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input 
                        required
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                        placeholder="Repeat password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {authMode === "signup" && (
              <>
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
              </>
            )}
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
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{authMode === "signin" ? "Sign In & Join Trip" : "Join Trip"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

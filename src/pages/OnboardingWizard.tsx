import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { 
  Plane, MapPin, Users, Wallet, Lock, CheckCircle2, 
  ChevronLeft, ChevronRight, Upload, Camera, 
  User, Phone, Mail, Globe, Sparkles, LogIn
} from "lucide-react";
import { cn, generateTripCode } from "../lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { auth, googleSignIn } from "../lib/googleAuth";
import { saveUserTrip } from "../lib/firestoreSync";
import { Trip } from "../types";
import { getRichDefaultChecklist } from "../utils/checklistDefaults";
import { onAuthStateChanged, createUserWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const STEPS = [
  { id: 1, name: "Trip Details", icon: MapPin },
  { id: 2, name: "Organizer", icon: User },
  { id: 3, name: "Setup", icon: Wallet },
  { id: 4, name: "Account", icon: Lock },
  { id: 5, name: "Review", icon: CheckCircle2 },
];

const TRIP_TYPES = ["Friends", "Family", "College", "Office", "Pilgrimage", "Business", "Custom"];
const SPLIT_OPTIONS = ["Equal", "Manual", "Percentage"];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copyText, setCopyText] = useState("Copy Link");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Step 1
    tripName: "",
    destination: "",
    tripType: "Friends",
    startDate: "2026-08-01",
    endDate: "2026-08-07",
    coverImage: "",
    // Step 2
    fullName: "",
    mobileNumber: "",
    email: "",
    city: "",
    country: "",
    // Step 3
    expectedTravellers: 1,
    expectedBudget: 50000,
    currency: "INR",
    defaultExpenseSplit: "Equal",
    approvalRequired: false,
  });

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
      }
    } catch (err) {
      console.error("Sign in failed", err);
    }
  };

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return { score: 0, label: "Empty", color: "bg-slate-200" };
    if (pass.length < 4) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (pass.length < 8) return { score: 2, label: "Medium", color: "bg-yellow-500" };
    return { score: 3, label: "Strong", color: "bg-green-500" };
  };

  const tripCode = React.useMemo(() => generateTripCode(formData.tripName || "TRIP"), [formData.tripName, isSuccess]);
  
  const inviteLink = React.useMemo(() => {
    const baseDomain = typeof window !== 'undefined' ? window.location.origin : 'https://triplan-zeta.vercel.app';
    return `${baseDomain}/t/${tripCode}`;
  }, [tripCode]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = inviteLink;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
      }
      setCopyText("Copied!");
      setTimeout(() => setCopyText("Copy Link"), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Join my trip on TripPro! Trip Code: ${tripCode} - ${inviteLink}`);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!formData.email) {
      setAuthError("Email address is required.");
      return;
    }
    if (!password || password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, formData.email, password);
      setCurrentUser(cred.user);
    } catch (err: any) {
      console.error("Sign up failed:", err);
      setAuthError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setCurrentStep(4);
      return;
    }

    setIsLoading(true);
    try {
      const newTripId = `trip_${Date.now()}`;
      const newTrip: Trip = {
        id: newTripId,
        name: formData.tripName,
        destination: formData.destination,
        type: formData.tripType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        coverImage: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1000&auto=format&fit=crop",
        organizerId: currentUser.uid,
        organizerUid: currentUser.uid,
        organizationId: `personal_${currentUser.uid}`,
        expectedTravellers: formData.expectedTravellers,
        expectedBudget: formData.expectedBudget,
        currency: formData.currency === "INR" ? "₹" : formData.currency === "USD" ? "$" : "€",
        defaultExpenseSplit: formData.defaultExpenseSplit as any,
        approvalRequired: formData.approvalRequired,
        inviteCode: tripCode,
        tripCode: tripCode,
        createdAt: new Date().toISOString(),
        purpose: "Vacation",
        color: "#06b6d4",
        coverPhoto: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1000&auto=format&fit=crop",
        notes: `Created via Onboarding Wizard. Organizer: ${formData.fullName}`,
        status: "Upcoming",
        travelCategory: formData.tripType,
        totalBudget: formData.expectedBudget,
        totalSpent: 0,
        remainingBudget: formData.expectedBudget,
        totalDistanceKm: 0,
        totalDuration: `${Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 3600 * 24))} Days`,
        currentJourneyStatus: "Planning",
        memberUids: [currentUser.uid],
        travellers: [
          {
            id: currentUser.uid,
            fullName: formData.fullName || currentUser.displayName || "Organizer",
            email: formData.email || currentUser.email || "",
            phone: formData.mobileNumber,
            age: 30,
            gender: "Male",
            emergencyContact: formData.mobileNumber,
            bloodGroup: "O+",
            role: "Organizer",
            allocatedBudget: formData.expectedBudget,
          }
        ],
        segments: [],
        vehicles: [],
        fuelLogs: [],
        flights: [],
        trains: [],
        buses: [],
        hotels: [],
        expenses: [],
        documents: [],
        checklist: getRichDefaultChecklist(newTripId),
        timeline: [],
      };

      // Save user record in Firestore /users/{uid} with role: organizer, tripCode, tripId
      await setDoc(doc(db, "users", currentUser.uid), {
        uid: currentUser.uid,
        fullName: formData.fullName || currentUser.displayName || "Organizer",
        name: formData.fullName || currentUser.displayName || "Organizer",
        email: formData.email || currentUser.email || "",
        phone: formData.mobileNumber || "",
        role: "organizer",
        tripCode: tripCode,
        tripId: newTripId,
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Save to local storage
      const savedTrips = localStorage.getItem("trippro_trips");
      const currentTrips: Trip[] = savedTrips ? JSON.parse(savedTrips) : [];
      currentTrips.unshift(newTrip);
      localStorage.setItem("trippro_trips", JSON.stringify(currentTrips));

      // Save to Firestore
      await saveUserTrip(`personal_${currentUser.uid}`, newTrip);
      
      setIsSuccess(true);
    } catch (err) {
      console.error("Failed to create trip:", err);
      alert("Failed to save trip to cloud. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
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
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Trip Created Successfully!</h2>
          <p className="text-slate-600 mb-8">Your professional dashboard is ready for {formData.tripName}.</p>

          <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={inviteLink} size={150} />
            </div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Trip Code</div>
            <div className="text-2xl font-mono font-black text-indigo-600 mb-4">{tripCode}</div>
            <div className="text-sm text-slate-500 break-all mb-4 px-2">{inviteLink}</div>
            <div className="flex gap-2">
              <button 
                onClick={handleCopyLink}
                className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                {copyText === "Copied!" ? <CheckCircle2 className="w-4 h-4" /> : null}
                {copyText}
              </button>
              <button 
                onClick={handleWhatsAppShare}
                className="flex-1 bg-green-50 text-green-600 py-3 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors cursor-pointer active:scale-95"
              >
                WhatsApp
              </button>
            </div>
          </div>

          <button 
            onClick={() => navigate("/admin/dashboard")}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Open Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Stepper */}
        <div className="flex justify-between items-center mb-12">
          {STEPS.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-2 flex-1 relative">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 z-10",
                  currentStep >= step.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white text-slate-400 border-2 border-slate-200"
                )}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                currentStep >= step.id ? "text-indigo-600" : "text-slate-400"
              )}>
                {step.name}
              </span>
              {step.id < STEPS.length && (
                <div className="absolute top-5 left-1/2 w-full h-[2px] bg-slate-200 -z-0">
                  <motion.div 
                    initial={false}
                    animate={{ width: currentStep > step.id ? "100%" : "0%" }}
                    className="h-full bg-indigo-600"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
        >
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Trip Details</h2>
                <p className="text-slate-500 text-sm">Let's start with the basics of your journey.</p>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Trip Name *</label>
                  <input 
                    type="text" 
                    value={formData.tripName}
                    onChange={(e) => updateFormData({ tripName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                    placeholder="e.g. Goa Trip 2026"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Destination *</label>
                  <input 
                    type="text" 
                    value={formData.destination}
                    onChange={(e) => updateFormData({ destination: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                    placeholder="Where are you going?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Trip Type</label>
                  <div className="flex flex-wrap gap-2">
                    {TRIP_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => updateFormData({ tripType: type })}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                          formData.tripType === type ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-600"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Start Date</label>
                    <input 
                      type="date" 
                      value={formData.startDate}
                      onChange={(e) => updateFormData({ startDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">End Date</label>
                    <input 
                      type="date" 
                      value={formData.endDate}
                      onChange={(e) => updateFormData({ endDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Organizer Details</h2>
                <p className="text-slate-500 text-sm">Tell us who is leading this adventure.</p>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      value={formData.fullName}
                      onChange={(e) => updateFormData({ fullName: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mobile Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="tel" 
                      value={formData.mobileNumber}
                      onChange={(e) => updateFormData({ mobileNumber: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => updateFormData({ email: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">City</label>
                    <input 
                      type="text" 
                      value={formData.city}
                      onChange={(e) => updateFormData({ city: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                      placeholder="e.g. Mumbai"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Country</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        value={formData.country}
                        onChange={(e) => updateFormData({ country: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                        placeholder="India"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Trip Setup</h2>
                <p className="text-slate-500 text-sm">Configure the trip economics and rules.</p>
              </div>

              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Expected Travellers</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                      <input 
                        type="number" 
                        value={formData.expectedTravellers}
                        onChange={(e) => updateFormData({ expectedTravellers: parseInt(e.target.value) || 0 })}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Currency</label>
                    <select 
                      value={formData.currency}
                      onChange={(e) => updateFormData({ currency: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all bg-white"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Expected Budget</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="number" 
                      value={formData.expectedBudget}
                      onChange={(e) => updateFormData({ expectedBudget: parseInt(e.target.value) || 0 })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Default Expense Split</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SPLIT_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => updateFormData({ defaultExpenseSplit: opt as any })}
                        className={cn(
                          "py-3 rounded-xl text-sm font-bold border transition-all",
                          formData.defaultExpenseSplit === opt ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-600"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-indigo-900">Organizer Approval</div>
                    <div className="text-xs text-indigo-700">Require approval for new joiners</div>
                  </div>
                  <button 
                    onClick={() => updateFormData({ approvalRequired: !formData.approvalRequired })}
                    className={cn(
                      "w-12 h-6 rounded-full p-1 transition-all duration-300",
                      formData.approvalRequired ? "bg-indigo-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn("w-4 h-4 bg-white rounded-full transition-all duration-300 transform", formData.approvalRequired ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-8 text-center py-4">
              <div>
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Secure Your Account</h2>
                <p className="text-slate-500 text-sm">Sign in to save your trip and access your professional dashboard.</p>
              </div>

              {currentUser ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-center gap-4 text-left">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                    {currentUser.displayName?.[0] || currentUser.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-900">Signed in as {currentUser.displayName || currentUser.email}</div>
                    <div className="text-xs text-emerald-700">Your trip will be securely saved to this account as Organizer.</div>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 ml-auto" />
                </div>
              ) : (
                <div className="space-y-6 text-left">
                  {authError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleEmailSignUp} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Organizer Email *</label>
                      <input 
                        required
                        type="email" 
                        value={formData.email}
                        onChange={(e) => updateFormData({ email: e.target.value })}
                        placeholder="organizer@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Password *</label>
                        <input 
                          required
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Confirm Password *</label>
                        <input 
                          required
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg cursor-pointer"
                    >
                      {isLoading ? "Creating Account..." : "Create Organizer Account & Continue"}
                    </button>
                  </form>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-400 font-bold">Or</span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 py-3.5 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer text-sm"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    Continue with Google
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Final Review</h2>
                <p className="text-slate-500 text-sm">Double check everything before we launch.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div className="text-slate-500">Trip Name</div>
                  <div className="font-bold text-right">{formData.tripName}</div>
                  
                  <div className="text-slate-500">Destination</div>
                  <div className="font-bold text-right">{formData.destination}</div>
                  
                  <div className="text-slate-500">Dates</div>
                  <div className="font-bold text-right">{formData.startDate} - {formData.endDate}</div>
                  
                  <div className="text-slate-500">Budget</div>
                  <div className="font-bold text-right text-indigo-600">{formData.currency} {formData.expectedBudget}</div>
                  
                  <div className="text-slate-500">Organizer</div>
                  <div className="font-bold text-right">{formData.fullName}</div>
                  
                  <div className="text-slate-500">Travellers</div>
                  <div className="font-bold text-right">{formData.expectedTravellers} People</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  By clicking "Create Trip", you agree to our terms of service. We'll set up your organization and unique trip ID instantly.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-10">
            {currentStep > 1 ? (
              <button 
                onClick={prevStep}
                className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
            ) : (
              <div />
            )}

            <button 
              onClick={currentStep === 5 ? handleSubmit : nextStep}
              disabled={isLoading}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : currentStep === 5 ? (
                "Create Trip"
              ) : (
                <>Next <ChevronRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

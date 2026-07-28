/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trip, Traveller, TravellerRole, PendingTravellerRegistration, GoogleFormConfig } from "../types";
import { GoogleFormCollectModal } from "./GoogleFormCollectModal";
import { EditPendingRegistrationModal } from "./EditPendingRegistrationModal";
import { ProfilePhotoUpload, getInitials } from "./ProfilePhotoUpload";
import { ContactPhoneButton } from "./ContactOptionsBottomSheet";
import {
  Users,
  UserPlus,
  AlertCircle,
  Phone,
  Mail,
  Shield,
  Award,
  Wallet,
  X,
  UserCheck,
  FileText,
  CheckCircle,
  XCircle,
  Edit,
  Sparkles,
  Clock,
  ExternalLink,
  ArrowLeft,
  Trash2,
  Droplet,
} from "lucide-react";

interface TravellersModuleProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

export const TravellersModule: React.FC<TravellersModuleProps> = ({
  trip,
  onUpdateTrip,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGoogleFormModalOpen, setIsGoogleFormModalOpen] = useState(false);
  const [editingPendingReg, setEditingPendingReg] = useState<PendingTravellerRegistration | null>(null);
  const [editingTraveller, setEditingTraveller] = useState<Traveller | null>(null);
  const [selectedTravellerId, setSelectedTravellerId] = useState<string | null>(null);

  // UI States
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Pending Registrations list
  const pendingList = trip.pendingRegistrations || [];
  const activePendingList = pendingList.filter((p) => p.status === "Pending");

  // Approve Pending Registration
  const handleApproveRegistration = (reg: PendingTravellerRegistration) => {
    // Validation rules
    if (!reg.fullName?.trim()) {
      alert("Full Name is required for traveller approval.");
      return;
    }
    if (!reg.age || Number(reg.age) <= 0) {
      alert("Age must be a positive number.");
      return;
    }
    if (!reg.allocatedBudget || Number(reg.allocatedBudget) <= 0) {
      alert("Personal budget must be greater than 0.");
      return;
    }
    if (reg.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email.trim())) {
      alert("Invalid email format.");
      return;
    }

    const newTraveller: Traveller = {
      id: `trv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      fullName: reg.fullName.trim(),
      age: Number(reg.age),
      gender: reg.gender,
      phone: reg.phone || "",
      email: reg.email || "",
      emergencyContact: reg.emergencyContact || "",
      bloodGroup: reg.bloodGroup || "O+",
      passportNumber: reg.passportNumber || "",
      drivingLicense: reg.drivingLicense || "",
      role: reg.role || "Traveller",
      allocatedBudget: Number(reg.allocatedBudget) || 5000,
      profilePhoto: reg.profilePhoto || "",
    };

    const updatedPending = pendingList.map((p) =>
      p.id === reg.id ? { ...p, status: "Approved" as const } : p
    );

    onUpdateTrip({
      ...trip,
      travellers: [...trip.travellers, newTraveller],
      pendingRegistrations: updatedPending,
    });
  };

  // Reject Pending Registration
  const handleRejectRegistration = (regId: string) => {
    setRejectConfirmId(regId);
  };

  const confirmReject = () => {
    if (rejectConfirmId) {
      const updatedPending = pendingList.map((p) =>
        p.id === rejectConfirmId ? { ...p, status: "Rejected" as const } : p
      );
      onUpdateTrip({
        ...trip,
        pendingRegistrations: updatedPending,
      });
      setRejectConfirmId(null);
      showToast("Registration rejected");
    }
  };

  // Handle Save and Approve from Edit Modal
  const handleSaveAndApproveEdit = (updatedReg: PendingTravellerRegistration) => {
    const newTraveller: Traveller = {
      id: `trv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      fullName: updatedReg.fullName.trim(),
      age: Number(updatedReg.age),
      gender: updatedReg.gender,
      phone: updatedReg.phone || "",
      email: updatedReg.email || "",
      emergencyContact: updatedReg.emergencyContact || "",
      bloodGroup: updatedReg.bloodGroup || "O+",
      passportNumber: updatedReg.passportNumber || "",
      drivingLicense: updatedReg.drivingLicense || "",
      role: updatedReg.role || "Traveller",
      allocatedBudget: Number(updatedReg.allocatedBudget) || 5000,
      profilePhoto: updatedReg.profilePhoto || "",
    };

    const updatedPending = pendingList.map((p) =>
      p.id === updatedReg.id ? { ...updatedReg, status: "Approved" as const } : p
    );

    onUpdateTrip({
      ...trip,
      travellers: [...trip.travellers, newTraveller],
      pendingRegistrations: updatedPending,
    });

    setEditingPendingReg(null);
  };

  // Modal Form State
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [passportNumber, setPassportNumber] = useState("");
  const [drivingLicense, setDrivingLicense] = useState("");
  const [role, setRole] = useState<TravellerRole>("Traveller");
  const [allocatedBudget, setAllocatedBudget] = useState(5000);
  const [profilePhoto, setProfilePhoto] = useState("");

  const handleOpenAdd = () => {
    setEditingTraveller(null);
    setFullName("");
    setAge(26);
    setGender("Male");
    setPhone("+91 ");
    setEmail("");
    setEmergencyContact("+91 ");
    setBloodGroup("O+");
    setPassportNumber("");
    setDrivingLicense("");
    setRole("Traveller");
    setAllocatedBudget(5000);
    setProfilePhoto("");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: Traveller) => {
    setEditingTraveller(t);
    setFullName(t.fullName);
    setAge(t.age);
    setGender(t.gender);
    setPhone(t.phone);
    setEmail(t.email);
    setEmergencyContact(t.emergencyContact);
    setBloodGroup(t.bloodGroup);
    setPassportNumber(t.passportNumber || "");
    setDrivingLicense(t.drivingLicense || "");
    setRole(t.role);
    setAllocatedBudget(t.allocatedBudget);
    setProfilePhoto(t.profilePhoto || "");
    setIsAddModalOpen(true);
  };

  const handleSaveTraveller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    let updatedList: Traveller[];

    if (editingTraveller) {
      updatedList = trip.travellers.map((t) =>
        t.id === editingTraveller.id
          ? {
              ...t,
              fullName,
              age,
              gender,
              phone,
              email,
              emergencyContact,
              bloodGroup,
              passportNumber,
              drivingLicense,
              role,
              allocatedBudget: Number(allocatedBudget),
              profilePhoto,
            }
          : t
      );
    } else {
      const newTraveller: Traveller = {
        id: `trv_${Date.now()}`,
        fullName,
        age,
        gender,
        phone,
        email,
        emergencyContact,
        bloodGroup,
        passportNumber,
        drivingLicense,
        role,
        allocatedBudget: Number(allocatedBudget),
        profilePhoto: profilePhoto || "",
      };
      updatedList = [...trip.travellers, newTraveller];
    }

    onUpdateTrip({ ...trip, travellers: updatedList });
    setIsAddModalOpen(false);
  };

  const handleDeleteTraveller = (id: string) => {
    if (trip.travellers.length <= 1) {
      alert("At least one traveller is required for a trip.");
      return;
    }
    if (confirm("Remove this traveller from the trip?")) {
      const updatedList = trip.travellers.filter((t) => t.id !== id);
      onUpdateTrip({ ...trip, travellers: updatedList });
      if (selectedTravellerId === id) {
        setSelectedTravellerId(null);
      }
    }
  };

  // Compute spending per traveller across all trip expenses
  const travellerStats = trip.travellers.map((traveller) => {
    let moneySpent = 0;
    const history: { description: string; amount: number; date: string }[] = [];

    trip.expenses.forEach((expense) => {
      // Check if traveller paid or shared in this expense
      if (expense.splits && expense.splits[traveller.id]) {
        const shareAmount = expense.splits[traveller.id];
        moneySpent += shareAmount;
        history.push({
          description: expense.description,
          amount: shareAmount,
          date: expense.date,
        });
      }
    });

    const remainingBudget = traveller.allocatedBudget - moneySpent;
    const usagePercent =
      traveller.allocatedBudget > 0
        ? Math.round((moneySpent / traveller.allocatedBudget) * 100)
        : 0;

    return {
      ...traveller,
      moneySpent,
      remainingBudget,
      usagePercent,
      history,
      isExceeded: moneySpent > traveller.allocatedBudget,
    };
  });

  const selectedTraveller = travellerStats.find((t) => t.id === selectedTravellerId);

  if (selectedTraveller) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setSelectedTravellerId(null)}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Back to Travellers</span>
          </button>
          <span className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-slate-400">
            Traveller Profile
          </span>
        </div>

        {/* Profile Details Container with Material transition */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Header Hero Card */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
              {selectedTraveller.profilePhoto ? (
                <img
                  src={selectedTraveller.profilePhoto}
                  alt={selectedTraveller.fullName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-indigo-500/20 dark:border-indigo-500/30 shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-black text-xl sm:text-2xl flex items-center justify-center shrink-0 border-4 border-indigo-400/30 shadow-md">
                  {getInitials(selectedTraveller.fullName)}
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {selectedTraveller.fullName}
                  </h2>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {selectedTraveller.role || "Traveller"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">
                    {selectedTraveller.age ? `${selectedTraveller.age} Yrs` : "Age N/A"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">
                    {selectedTraveller.gender || "Gender N/A"}
                  </span>
                  {selectedTraveller.bloodGroup && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900/50">
                      Blood Group: {selectedTraveller.bloodGroup}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {selectedTraveller.phone && (
                    <ContactPhoneButton 
                      phone={selectedTraveller.phone} 
                      travellerName={selectedTraveller.fullName}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400"
                    />
                  )}
                  {selectedTraveller.email && (
                    <a
                      href={`mailto:${selectedTraveller.email}`}
                      className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium truncate"
                    >
                      <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="truncate">{selectedTraveller.email}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cards Grid: Emergency Info & Budget Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Emergency Information Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base">
                <Shield className="w-5 h-5 text-rose-500" />
                <h3>Emergency Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5" /> Emergency Contact
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedTraveller.emergencyContact || "Not provided"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                    <Droplet className="w-3.5 h-3.5 text-rose-500" /> Blood Group
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedTraveller.bloodGroup || "Not specified"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" /> Passport Number
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedTraveller.passportNumber || "Not provided"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                    <Award className="w-3.5 h-3.5 text-cyan-500" /> Driving License
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedTraveller.drivingLicense || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Budget Summary Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base">
                  <Wallet className="w-5 h-5 text-indigo-500" />
                  <h3>Budget Summary</h3>
                </div>
                {selectedTraveller.isExceeded && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" /> Over Budget
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Budget</p>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {trip.currency}{selectedTraveller.allocatedBudget.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Spent</p>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {trip.currency}{selectedTraveller.moneySpent.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remaining</p>
                  <p className={`text-sm sm:text-base font-extrabold mt-1 ${selectedTraveller.remainingBudget >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {trip.currency}{selectedTraveller.remainingBudget.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className={selectedTraveller.isExceeded ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}>
                    {selectedTraveller.usagePercent}% Used
                  </span>
                  <span className="text-slate-400 font-normal">
                    {selectedTraveller.allocatedBudget > 0 ? `${trip.currency}${selectedTraveller.moneySpent} of ${trip.currency}${selectedTraveller.allocatedBudget}` : "No limit set"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(selectedTraveller.usagePercent, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      selectedTraveller.isExceeded
                        ? "bg-rose-500"
                        : selectedTraveller.usagePercent > 80
                        ? "bg-amber-500"
                        : "bg-indigo-600"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Expense Shares Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base">
                <Clock className="w-5 h-5 text-indigo-500" />
                <h3>Recent Expense Shares</h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {selectedTraveller.history.length} items
              </span>
            </div>

            {selectedTraveller.history.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedTraveller.history.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.description}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                        {item.date || "Trip Expense"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {trip.currency}{item.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No expense shares logged for this traveller yet.
              </div>
            )}
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handleOpenEdit(selectedTraveller)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-500/20 text-xs sm:text-sm"
            >
              <Edit className="w-4 h-4" /> Edit Traveller
            </button>
            <button
              onClick={() => handleDeleteTraveller(selectedTraveller.id)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 transition-all text-xs sm:text-sm"
            >
              <Trash2 className="w-4 h-4" /> Remove Traveller
            </button>
          </div>
        </motion.div>

        {/* Add / Edit Traveller Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden mt-auto sm:mt-0"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {editingTraveller ? "Edit Traveller Profile" : "Add New Traveller"}
                </h3>
                <button onClick={() => setIsAddModalOpen(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveTraveller} className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Nafih Hashim"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as TravellerRole)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="Organizer">Organizer</option>
                      <option value="Traveller">Traveller</option>
                      <option value="Driver">Driver</option>
                      <option value="Guest">Guest</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Personal Budget ({trip.currency}) *
                    </label>
                    <input
                      type="number"
                      required
                      value={allocatedBudget}
                      onChange={(e) => setAllocatedBudget(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Emergency Contact
                    </label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Blood Group
                    </label>
                    <input
                      type="text"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      placeholder="e.g. O+"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Passport No (Optional)
                    </label>
                    <input
                      type="text"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Driving License (Optional)
                    </label>
                    <input
                      type="text"
                      value={drivingLicense}
                      onChange={(e) => setDrivingLicense(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <ProfilePhotoUpload
                  photoUrl={profilePhoto}
                  fullName={fullName}
                  onChangePhoto={(newUrl) => setProfilePhoto(newUrl)}
                  onRemovePhoto={() => setProfilePhoto("")}
                />

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                  >
                    Save Member
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Global Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === "success"
                  ? "bg-emerald-600 text-white border-emerald-500"
                  : "bg-rose-600 text-white border-rose-500"
              }`}
            >
              {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-bold">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Modal for Rejection */}
        <AnimatePresence>
          {rejectConfirmId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3 text-rose-600">
                  <XCircle className="w-6 h-6" />
                  <h3 className="text-lg font-black">Reject Registration?</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to reject this registration? The user will not be added to the trip travellers list.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setRejectConfirmId(null)}
                    className="flex-1 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmReject}
                    className="flex-1 px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-500 shadow-lg shadow-rose-500/20"
                  >
                    Reject Now
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const totalIndividualAllocated = travellerStats.reduce(
    (acc, t) => acc + t.allocatedBudget,
    0
  );
  const totalIndividualSpent = travellerStats.reduce((acc, t) => acc + t.moneySpent, 0);
  const budgetVariance = trip.totalBudget - totalIndividualAllocated;

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Module Title & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-4 bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
              Travellers & Individual Budgets
            </h2>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Manage trip members, emergency contacts, roles, personal budgets, and expenditure.
          </p>
        </div>

        <div className="flex flex-row sm:flex-row items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setIsGoogleFormModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] sm:text-sm font-bold h-9 sm:h-11 px-2.5 sm:px-4 rounded-lg sm:rounded-xl shadow-md transition-all"
          >
            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-200" />
            Create Form
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] sm:text-sm font-bold h-9 sm:h-11 px-2.5 sm:px-4 rounded-lg sm:rounded-xl shadow-md transition-all"
          >
            <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            + Traveller
          </button>
        </div>
      </div>

      {/* Pending Traveller Registrations Section */}
      <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 sm:space-y-4">
        <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white">
              Pending ({activePendingList.length})
            </h3>
            <span className="text-[9px] sm:text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              Registrations
            </span>
          </div>

          <button
            onClick={() => setIsGoogleFormModalOpen(true)}
            className="flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
          >
            <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
            {trip.googleFormConfig ? "Manage Form" : "Generate Form"}
          </button>
        </div>

        {activePendingList.length === 0 ? (
          <div className="text-center py-3 sm:py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg sm:rounded-xl space-y-1 sm:space-y-2">
            <FileText className="w-5 h-5 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              No pending registrations found.
            </p>
            <p className="text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500">
              Click <b>"Create Form"</b> above to share registration links.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
            {activePendingList.map((reg) => (
              <div
                key={reg.id}
                className="p-2.5 sm:p-4 rounded-xl border transition-all flex flex-col justify-between space-y-2 bg-white dark:bg-slate-800/80 border-purple-200 dark:border-purple-900/60 shadow-sm"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {reg.profilePhoto ? (
                      <img
                        src={reg.profilePhoto}
                        alt={reg.fullName}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-indigo-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 border border-indigo-400/30">
                        {getInitials(reg.fullName)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-sm flex flex-wrap items-center gap-1">
                        {reg.fullName}
                        <span className="text-[8px] sm:text-[10px] font-semibold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {reg.role}
                        </span>
                      </h4>
                      <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                        <div className="flex items-center gap-1.5">
                          <ContactPhoneButton phone={reg.phone} travellerName={reg.fullName} />
                          <span className="text-slate-400">•</span>
                          <span className="font-bold">{trip.currency}</span>
                        </div>
                        {reg.allocatedBudget?.toLocaleString() || 0}
                      </div>
                      <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-none">
                        Submitted: {reg.submissionDate}
                      </p>
                    </div>
                  </div>

                  <span
                    className="text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                  >
                    {reg.status}
                  </span>
                </div>

                {/* Organizer Actions */}
                <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => handleRejectRegistration(reg.id)}
                    className="flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2 py-1 rounded transition-all"
                  >
                    <XCircle className="w-2.5 h-2.5" /> Reject
                  </button>

                  <button
                    onClick={() => setEditingPendingReg(reg)}
                    className="flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 px-2 py-1 rounded transition-all"
                  >
                    <Edit className="w-2.5 h-2.5" /> Edit
                  </button>

                  <button
                    onClick={() => handleApproveRegistration(reg)}
                    className="flex items-center gap-0.5 text-[10px] sm:text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded shadow-sm transition-all"
                  >
                    <CheckCircle className="w-2.5 h-2.5" /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Individual Budget Overview Cards (Section 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1: Overall vs Allocated Sum */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between h-[84px] sm:h-auto sm:min-h-[100px]">
          <div>
            <span className="text-[9px] sm:text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block leading-none">
              Total Allocated
            </span>
            <span className="text-sm sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1.5 block leading-none">
              {trip.currency}{totalIndividualAllocated.toLocaleString()}
            </span>
          </div>
          <div className="text-[9px] sm:text-xs text-slate-400 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-1 mt-1 shrink-0">
            <span>Pool: {trip.currency}{trip.totalBudget.toLocaleString()}</span>
            <span className={`font-bold ${budgetVariance < 0 ? "text-rose-500" : "text-emerald-500"}`}>
              {budgetVariance < 0 ? "Over" : "Under"}
            </span>
          </div>
          <Wallet className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-300 dark:text-slate-700 pointer-events-none" />
        </div>

        {/* Card 2: Total Individual Spent */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between h-[84px] sm:h-auto sm:min-h-[100px]">
          <div>
            <span className="text-[9px] sm:text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block leading-none">
              Member Expenses
            </span>
            <span className="text-sm sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1.5 block leading-none">
              {trip.currency}{totalIndividualSpent.toLocaleString()}
            </span>
          </div>
          <div className="text-[9px] sm:text-xs text-slate-400 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-1 mt-1 shrink-0">
            <span>{trip.expenses.length} logs</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {Math.round((totalIndividualSpent / (totalIndividualAllocated || 1)) * 100)}%
            </span>
          </div>
          <Award className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-300 dark:text-slate-700 pointer-events-none" />
        </div>

        {/* Card 3: Exceeded Budget Warning Count */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between h-[84px] sm:h-auto sm:min-h-[100px] col-span-2 sm:col-span-1">
          <div>
            <span className="text-[9px] sm:text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block leading-none">
              Warning Status
            </span>
            <div className="mt-1 flex items-center gap-1">
              {travellerStats.some((t) => t.isExceeded) ? (
                <span className="text-[11px] sm:text-sm font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {travellerStats.filter((t) => t.isExceeded).length} Exceeded
                </span>
              ) : (
                <span className="text-[11px] sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Budgets Ok
                </span>
              )}
            </div>
          </div>
          <div className="text-[9px] sm:text-xs text-slate-400 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-1 mt-1 shrink-0">
            <span>{trip.travellers.length} members</span>
            <span>Auto tracked</span>
          </div>
          <Shield className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-300 dark:text-slate-700 pointer-events-none" />
        </div>
      </div>

      {/* Travellers List & Individual Budget Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {travellerStats.map((t) => (
          <div
            key={t.id}
            onClick={() => setSelectedTravellerId(t.id)}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-between gap-3 min-h-[90px] sm:min-h-[105px]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {t.profilePhoto ? (
                <img
                  src={t.profilePhoto}
                  alt={t.fullName}
                  loading="lazy"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-indigo-500/30 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 border-2 border-indigo-400/30">
                  {getInitials(t.fullName)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-base truncate">
                    {t.fullName}
                  </h3>
                  {t.role === "Organizer" && (
                    <span className="text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                      Organizer
                    </span>
                  )}
                  {t.role === "Driver" && (
                    <span className="text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 shrink-0">
                      Driver
                    </span>
                  )}
                  {t.role !== "Organizer" && t.role !== "Driver" && (
                    <span className="text-[8px] sm:text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {t.role || "Member"}
                    </span>
                  )}
                </div>

                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-none font-medium">
                  {t.age ? `${t.age} Yrs` : "Age N/A"} • {t.gender || "N/A"}
                </div>

                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-none flex items-center gap-1.5 truncate">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <ContactPhoneButton phone={t.phone} travellerName={t.fullName} className="truncate text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Traveller Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden mt-auto sm:mt-0"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {editingTraveller ? "Edit Traveller Profile" : "Add New Traveller"}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveTraveller} className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Nafih Hashim"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as TravellerRole)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Organizer">Organizer</option>
                    <option value="Traveller">Traveller</option>
                    <option value="Driver">Driver</option>
                    <option value="Guest">Guest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Personal Budget ({trip.currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={allocatedBudget}
                    onChange={(e) => setAllocatedBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    placeholder="e.g. O+"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Passport No (Optional)
                  </label>
                  <input
                    type="text"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Driving License (Optional)
                  </label>
                  <input
                    type="text"
                    value={drivingLicense}
                    onChange={(e) => setDrivingLicense(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <ProfilePhotoUpload
                photoUrl={profilePhoto}
                fullName={fullName}
                onChangePhoto={(newUrl) => setProfilePhoto(newUrl)}
                onRemovePhoto={() => setProfilePhoto("")}
              />

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                  Save Member
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Google Form Collection Modal */}
      <GoogleFormCollectModal
        trip={trip}
        isOpen={isGoogleFormModalOpen}
        onClose={() => setIsGoogleFormModalOpen(false)}
        onUpdateTripConfig={(formConfig) => {
          onUpdateTrip({
            ...trip,
            googleFormConfig: formConfig,
          });
        }}
        onSyncResponses={(newPending) => {
          // Merge newly fetched pending registrations with existing
          const existingMap = new Set((trip.pendingRegistrations || []).map((p) => p.id));
          const toAdd = newPending.filter((p) => !existingMap.has(p.id));
          const updatedList = [...(trip.pendingRegistrations || []), ...toAdd];
          onUpdateTrip({
            ...trip,
            pendingRegistrations: updatedList,
          });
        }}
      />

      {/* Edit Pending Registration Modal */}
      {editingPendingReg && (
        <EditPendingRegistrationModal
          registration={editingPendingReg}
          isOpen={!!editingPendingReg}
          onClose={() => setEditingPendingReg(null)}
          onSaveAndApprove={handleSaveAndApproveEdit}
        />
      )}
    </div>
  );
};

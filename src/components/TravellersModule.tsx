/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Trip, Traveller, TravellerRole, PendingTravellerRegistration, GoogleFormConfig } from "../types";
import { GoogleFormCollectModal } from "./GoogleFormCollectModal";
import { EditPendingRegistrationModal } from "./EditPendingRegistrationModal";
import { ProfilePhotoUpload, getInitials } from "./ProfilePhotoUpload";
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

  // Pending Registrations list
  const pendingList = trip.pendingRegistrations || [];

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
    if (confirm("Are you sure you want to reject this registration submission?")) {
      const updatedPending = pendingList.map((p) =>
        p.id === regId ? { ...p, status: "Rejected" as const } : p
      );
      onUpdateTrip({
        ...trip,
        pendingRegistrations: updatedPending,
      });
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
              Pending ({pendingList.filter((p) => p.status === "Pending").length})
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

        {pendingList.length === 0 ? (
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
            {pendingList.map((reg) => (
              <div
                key={reg.id}
                className={`p-2.5 sm:p-4 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                  reg.status === "Approved"
                    ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40"
                    : reg.status === "Rejected"
                    ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
                    : "bg-white dark:bg-slate-800/80 border-purple-200 dark:border-purple-900/60 shadow-sm"
                }`}
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
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                        {reg.phone || "No Phone"} • {trip.currency}
                        {reg.allocatedBudget?.toLocaleString() || 0}
                      </p>
                      <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-none">
                        Submitted: {reg.submissionDate}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      reg.status === "Approved"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : reg.status === "Rejected"
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                        : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {reg.status}
                  </span>
                </div>

                {/* Organizer Actions */}
                {reg.status === "Pending" && (
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
                )}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {travellerStats.map((t) => (
          <div
            key={t.id}
            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm flex flex-col justify-between ${
              t.isExceeded
                ? "border-rose-300 dark:border-rose-900/80 ring-1 ring-rose-500/20"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div>
              {/* Header Profile Info */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {t.profilePhoto ? (
                    <img
                      src={t.profilePhoto}
                      alt={t.fullName}
                      loading="lazy"
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 border border-indigo-400/30">
                      {getInitials(t.fullName)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-base flex flex-wrap items-center gap-1 leading-tight">
                      {t.fullName}
                      {t.role === "Organizer" && (
                        <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Organizer
                        </span>
                      )}
                      {t.role === "Driver" && (
                        <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                          Driver
                        </span>
                      )}
                      {t.role !== "Organizer" && t.role !== "Driver" && (
                        <span className="text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {t.role}
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                      {t.age} Yrs • {t.gender} • Blood <span className="font-semibold text-rose-500">{t.bloodGroup}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact & ID Badges */}
              <div className="mt-2.5 py-1.5 border-y border-slate-100 dark:border-slate-800/80 space-y-0.5 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 leading-tight">
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{t.phone}</span>
                </p>
                {t.email && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{t.email}</span>
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                  <Shield className="w-3 h-3 text-rose-500 shrink-0" />
                  <span className="truncate">Emergency: {t.emergencyContact}</span>
                </p>
                {(t.passportNumber || t.drivingLicense) && (
                  <div className="pt-1 flex flex-wrap gap-1 leading-none">
                    {t.passportNumber && (
                      <span className="text-[8px] sm:text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                        Passport: {t.passportNumber}
                      </span>
                    )}
                    {t.drivingLicense && (
                      <span className="text-[8px] sm:text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                        DL: {t.drivingLicense}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* INDIVIDUAL BUDGET SECTION (Requirement 4) */}
              <div className="mt-2.5 space-y-2">
                {/* 3 Compact statistic chips in one horizontal row */}
                <div className="grid grid-cols-3 gap-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-center">
                  <div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Budget</p>
                    <p className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-none mt-0.5">
                      {trip.currency}{t.allocatedBudget.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Spent</p>
                    <p className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-none mt-0.5">
                      {trip.currency}{t.moneySpent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Remaining</p>
                    <p className={`text-[11px] font-extrabold leading-none mt-0.5 ${t.remainingBudget >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {trip.currency}{t.remainingBudget.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Color Progress Bar */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-[9px] font-bold leading-none">
                    <span
                      className={
                        t.isExceeded ? "text-rose-500" : "text-slate-500 dark:text-slate-400"
                      }
                    >
                      {t.usagePercent}% Used
                    </span>
                    {t.isExceeded && (
                      <span className="text-rose-600 dark:text-rose-400 font-bold animate-pulse flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" /> OVER BUDGET!
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-[4px] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        t.isExceeded
                          ? "bg-rose-500"
                          : t.usagePercent > 80
                          ? "bg-amber-500"
                          : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(t.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Individual Expense History Summary */}
                {t.history.length > 0 && (
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800/50">
                    <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">
                      Recent Shares ({t.history.length})
                    </p>
                    <div className="space-y-0.5 max-h-[50px] overflow-y-auto pr-1 no-scrollbar">
                      {t.history.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 leading-none"
                        >
                          <span className="truncate max-w-[120px] sm:max-w-[140px]">{item.description}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {trip.currency}
                            {item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => handleOpenEdit(t)}
                className="flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <Edit className="w-2.5 h-2.5" /> Edit Profile
              </button>
              <button
                onClick={() => handleDeleteTraveller(t.id)}
                className="text-[10px] sm:text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-medium"
              >
                Remove Traveller
              </button>
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

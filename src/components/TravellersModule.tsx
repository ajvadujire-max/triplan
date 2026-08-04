/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppNavigation } from "../hooks/useAppNavigation";
import { Trip, Traveller, TravellerRole, PendingTravellerRegistration, GoogleFormConfig } from "../types";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { GoogleFormCollectModal } from "./GoogleFormCollectModal";
import { EditPendingRegistrationModal } from "./EditPendingRegistrationModal";
import { ProfilePhotoUpload, getInitials } from "./ProfilePhotoUpload";
import { Avatar, getTravellerPhoto } from "./Avatar";
import { uploadProfilePhotoToStorage } from "../lib/image-utils";
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
  Loader2,
} from "lucide-react";

interface EditTravellerModalProps {
  isOpen: boolean;
  editingTraveller: Traveller | null;
  isOrganizer: boolean;
  currency: string;
  currentUser: any;
  onClose: () => void;
  onSave: (updatedTraveller: Traveller, isEditMode: boolean) => Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;
}

const EditTravellerModal: React.FC<EditTravellerModalProps> = ({
  isOpen,
  editingTraveller,
  isOrganizer,
  currency,
  currentUser,
  onClose,
  onSave,
  showToast,
}) => {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [passportNumber, setPassportNumber] = useState("");
  const [drivingLicense, setDrivingLicense] = useState("");
  const [formRole, setFormRole] = useState<TravellerRole>("Traveller");
  const [allocatedBudget, setAllocatedBudget] = useState<number>(5000);
  const [profilePhoto, setProfilePhoto] = useState("");

  const [initialState, setInitialState] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Sync / initialize form state when modal opens
  React.useEffect(() => {
    if (editingTraveller) {
      const photo = editingTraveller.profilePhotoUrl || editingTraveller.profilePhoto || "";
      const init = {
        fullName: editingTraveller.fullName || "",
        age: editingTraveller.age ?? 25,
        gender: editingTraveller.gender || "Male",
        phone: editingTraveller.phone || "",
        email: editingTraveller.email || "",
        emergencyContact: editingTraveller.emergencyContact || "",
        bloodGroup: editingTraveller.bloodGroup || "O+",
        passportNumber: editingTraveller.passportNumber || "",
        drivingLicense: editingTraveller.drivingLicense || "",
        formRole: editingTraveller.role || "Traveller",
        allocatedBudget: editingTraveller.allocatedBudget ?? 0,
        profilePhoto: photo,
      };
      setFullName(init.fullName);
      setAge(init.age);
      setGender(init.gender as any);
      setPhone(init.phone);
      setEmail(init.email);
      setEmergencyContact(init.emergencyContact);
      setBloodGroup(init.bloodGroup);
      setPassportNumber(init.passportNumber);
      setDrivingLicense(init.drivingLicense);
      setFormRole(init.formRole);
      setAllocatedBudget(init.allocatedBudget);
      setProfilePhoto(init.profilePhoto);
      setInitialState(init);
    } else {
      const init = {
        fullName: "",
        age: 26,
        gender: "Male" as const,
        phone: "+91 ",
        email: "",
        emergencyContact: "+91 ",
        bloodGroup: "O+",
        passportNumber: "",
        drivingLicense: "",
        formRole: "Traveller" as TravellerRole,
        allocatedBudget: 5000,
        profilePhoto: "",
      };
      setFullName(init.fullName);
      setAge(init.age);
      setGender(init.gender);
      setPhone(init.phone);
      setEmail(init.email);
      setEmergencyContact(init.emergencyContact);
      setBloodGroup(init.bloodGroup);
      setPassportNumber(init.passportNumber);
      setDrivingLicense(init.drivingLicense);
      setFormRole(init.formRole);
      setAllocatedBudget(init.allocatedBudget);
      setProfilePhoto(init.profilePhoto);
      setInitialState(init);
    }
  }, [editingTraveller, isOpen]);

  // Compute if form has unsaved changes
  const isDirty = useMemo(() => {
    if (!initialState) return false;
    return (
      fullName !== initialState.fullName ||
      age !== initialState.age ||
      gender !== initialState.gender ||
      phone !== initialState.phone ||
      email !== initialState.email ||
      emergencyContact !== initialState.emergencyContact ||
      bloodGroup !== initialState.bloodGroup ||
      passportNumber !== initialState.passportNumber ||
      drivingLicense !== initialState.drivingLicense ||
      formRole !== initialState.formRole ||
      allocatedBudget !== initialState.allocatedBudget ||
      profilePhoto !== initialState.profilePhoto
    );
  }, [
    initialState,
    fullName,
    age,
    gender,
    phone,
    email,
    emergencyContact,
    bloodGroup,
    passportNumber,
    drivingLicense,
    formRole,
    allocatedBudget,
    profilePhoto,
  ]);

  const handleCloseEditTraveller = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!fullName.trim()) {
      showToast("Full Name is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      let finalPhotoUrl = profilePhoto.trim();

      // Upload newly selected base64/data URL photo to storage
      if (finalPhotoUrl && finalPhotoUrl.startsWith("data:")) {
        try {
          const targetId = editingTraveller?.id || `trv_${Date.now()}`;
          finalPhotoUrl = await uploadProfilePhotoToStorage(finalPhotoUrl, targetId);
        } catch (photoErr) {
          console.error("Profile photo upload notice:", photoErr);
        }
      }

      const updatedTraveller: Traveller = {
        id: editingTraveller?.id || `trv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fullName: fullName.trim(),
        age: Number(age) || 0,
        gender,
        phone: phone.trim(),
        email: email.trim(),
        emergencyContact: emergencyContact.trim(),
        bloodGroup: bloodGroup.trim(),
        passportNumber: passportNumber.trim(),
        drivingLicense: drivingLicense.trim(),
        role: formRole,
        allocatedBudget: Number(allocatedBudget) || 0,
        profilePhotoUrl: finalPhotoUrl,
        profilePhoto: finalPhotoUrl,
      };

      await onSave(updatedTraveller, !!editingTraveller);
      onClose();
    } catch (err) {
      console.error("Failed to save traveller:", err);
      showToast("Unable to save traveller. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div 
        onClick={handleCloseEditTraveller}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-hidden"
      >
        <motion.div
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-2xl w-[calc(100%-24px)] max-w-[520px] max-h-[92dvh] flex flex-col overflow-hidden relative pointer-events-auto"
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editingTraveller ? "Edit Traveller Profile" : "Add New Traveller"}
            </h3>
            <button
              type="button"
              onClick={handleCloseEditTraveller}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0 pointer-events-auto z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-3.5 flex-1">
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
                className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  value={formRole}
                  disabled={!isOrganizer}
                  onChange={(e) => setFormRole(e.target.value as TravellerRole)}
                  className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Organizer">Organizer</option>
                  <option value="Traveller">Traveller</option>
                  <option value="Driver">Driver</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personal Budget ({currency})
                </label>
                <input
                  type="number"
                  disabled={!isOrganizer}
                  value={allocatedBudget}
                  onChange={(e) => setAllocatedBudget(Number(e.target.value))}
                  className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
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
                  className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  disabled={!isOrganizer}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full h-12 px-3.5 text-sm sm:text-base rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <ProfilePhotoUpload
              photoUrl={profilePhoto}
              fullName={fullName}
              onChangePhoto={(newUrl) => setProfilePhoto(newUrl)}
              onRemovePhoto={() => setProfilePhoto("")}
            />

            <div className="flex items-center justify-end gap-3 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCloseEditTraveller}
                className="min-h-[44px] px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50 cursor-pointer pointer-events-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[44px] px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Member</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Discard Changes Confirmation Dialog */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Discard changes?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">You have unsaved changes.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 min-h-[44px] px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="flex-1 min-h-[44px] px-4 py-2.5 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-500 active:scale-95 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

interface TravellersModuleProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  appRole?: "traveller" | "organizer" | "super_admin";
  currentUser?: any;
}

export const TravellersModule: React.FC<TravellersModuleProps> = ({
  trip,
  onUpdateTrip,
  appRole = "traveller",
  currentUser,
}) => {
  const isOrganizer = appRole === "organizer" || appRole === "super_admin";
  const { basePath, relativePath, navigate, goBack } = useAppNavigation();
  const pathSegments = useMemo(() => relativePath.split("/").filter(Boolean), [relativePath]);

  const selectedTravellerId = useMemo(() => {
    if (pathSegments[1] && !["add", "collect-form", "pending"].includes(pathSegments[1])) {
      return pathSegments[1];
    }
    return null;
  }, [pathSegments]);

  const isAddModalOpen = useMemo(() => {
    return pathSegments[1] === "add" || (!!selectedTravellerId && pathSegments[2] === "edit");
  }, [pathSegments, selectedTravellerId]);

  const isGoogleFormModalOpen = useMemo(() => {
    return pathSegments[1] === "collect-form";
  }, [pathSegments]);

  const editingPendingReg = useMemo(() => {
    if (pathSegments[1] === "pending" && pathSegments[2] && pathSegments[3] === "edit") {
      return (trip.pendingRegistrations || []).find((p) => p.id === pathSegments[2]) || null;
    }
    return null;
  }, [pathSegments, trip.pendingRegistrations]);

  const editingTraveller = useMemo(() => {
    if (selectedTravellerId && pathSegments[2] === "edit") {
      return trip.travellers.find((t) => t.id === selectedTravellerId) || null;
    }
    return null;
  }, [selectedTravellerId, pathSegments, trip.travellers]);

  // UI States
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [travellerToDeleteId, setTravellerToDeleteId] = useState<string | null>(null);
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
      id: reg.id || `trv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
      id: updatedReg.id || `trv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

    goBack();
  };

  const handleOpenAdd = () => {
    navigate(`${basePath}/travellers/add`);
  };

  const handleOpenEdit = (t: Traveller) => {
    navigate(`${basePath}/travellers/${t.id}/edit`);
  };

  const handleCloseEditModal = () => {
    if (selectedTravellerId) {
      navigate(`${basePath}/travellers/${selectedTravellerId}`);
    } else {
      navigate(`${basePath}/travellers`);
    }
  };

  const handleSaveTraveller = async (updatedTraveller: Traveller, isEditMode: boolean) => {
    let updatedList: Traveller[];

    if (isEditMode) {
      updatedList = trip.travellers.map((t) =>
        t.id === updatedTraveller.id
          ? {
              ...t,
              ...updatedTraveller,
              profilePhotoUrl: updatedTraveller.profilePhotoUrl || updatedTraveller.profilePhoto || t.profilePhotoUrl || t.profilePhoto || "",
              profilePhoto: updatedTraveller.profilePhotoUrl || updatedTraveller.profilePhoto || t.profilePhotoUrl || t.profilePhoto || "",
            }
          : t
      );

      // Try updating user document in Firestore if userDocId exists
      try {
        const isRealUid = updatedTraveller.id && !updatedTraveller.id.startsWith("trv_");
        const userDocId = isRealUid ? updatedTraveller.id : currentUser?.uid;
        if (userDocId) {
          const userDocRef = doc(db, "users", userDocId);
          await setDoc(
            userDocRef,
            {
              fullName: updatedTraveller.fullName,
              name: updatedTraveller.fullName,
              age: updatedTraveller.age,
              gender: updatedTraveller.gender,
              phone: updatedTraveller.phone,
              email: updatedTraveller.email,
              emergencyContact: updatedTraveller.emergencyContact,
              bloodGroup: updatedTraveller.bloodGroup,
              passportNumber: updatedTraveller.passportNumber,
              drivingLicense: updatedTraveller.drivingLicense,
              profilePhotoUrl: updatedTraveller.profilePhotoUrl || updatedTraveller.profilePhoto,
              profilePhoto: updatedTraveller.profilePhotoUrl || updatedTraveller.profilePhoto,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.error("Failed to update user Firestore document:", err);
      }
    } else {
      updatedList = [...trip.travellers, updatedTraveller];
    }

    onUpdateTrip({ ...trip, travellers: updatedList });
    showToast(isEditMode ? "Traveller updated successfully" : "Traveller added successfully", "success");
  };

  const handleDeleteTraveller = (id: string) => {
    if (trip.travellers.length <= 1) {
      alert("At least one traveller is required for a trip.");
      return;
    }
    setTravellerToDeleteId(id);
  };

  const confirmDeleteTraveller = () => {
    if (!travellerToDeleteId) return;
    
    if (trip.travellers.length <= 1) {
      alert("At least one traveller is required for a trip.");
      setTravellerToDeleteId(null);
      return;
    }

    const updatedList = trip.travellers.filter((t) => t.id !== travellerToDeleteId);
    
    if (selectedTraveller?.id === travellerToDeleteId) {
      goBack();
    }
    
    onUpdateTrip({ ...trip, travellers: updatedList });
    setTravellerToDeleteId(null);
    showToast("Traveller removed successfully");
  };

  // Compute spending per traveller across all trip expenses
  const travellerStats = trip.travellers.map((traveller) => {
    let moneySpent = 0;
    const history: { description: string; amount: number; date: string }[] = [];

    trip.expenses.forEach((expense) => {
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
    const usagePercentValue =
      traveller.allocatedBudget > 0
        ? Math.round((moneySpent / traveller.allocatedBudget) * 100)
        : 0;
    
    const usagePercent = isNaN(usagePercentValue) ? 0 : usagePercentValue;

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
  const isOwnProfile = !!(selectedTraveller && currentUser && (
    selectedTraveller.id === currentUser.uid ||
    (selectedTraveller.email && selectedTraveller.email.toLowerCase() === currentUser.email?.toLowerCase())
  ));

  if (selectedTraveller) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => goBack()}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Back to Travellers</span>
          </button>
          <span className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-slate-400">
            Traveller Profile
          </span>
        </div>

        {/* Profile Details Container */}
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
              <Avatar src={getTravellerPhoto(selectedTraveller)} name={selectedTraveller.fullName} size="xl" className="border-4 border-indigo-500/20 dark:border-indigo-500/30 shadow-md" />

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

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 pt-1">
                  {selectedTraveller.phone && (
                    <ContactPhoneButton
                      phone={selectedTraveller.phone}
                      travellerName={selectedTraveller.fullName}
                      className="font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
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
                    <Award className="w-3.5 h-3.5 text-emerald-500" /> Driving License
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
                    key={item.description + idx}
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

          {(isOrganizer || isOwnProfile) && (
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedTraveller)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-500/20 text-xs sm:text-sm cursor-pointer"
              >
                <Edit className="w-4 h-4" /> Edit Traveller
              </button>
              {isOrganizer && (
                <button
                  type="button"
                  onClick={() => handleDeleteTraveller(selectedTraveller.id)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 transition-all text-xs sm:text-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Remove Traveller
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Edit Traveller Profile Modal */}
        <EditTravellerModal
          isOpen={isAddModalOpen}
          editingTraveller={editingTraveller}
          isOrganizer={isOrganizer}
          currency={trip.currency}
          currentUser={currentUser}
          onClose={handleCloseEditModal}
          onSave={handleSaveTraveller}
          showToast={showToast}
        />

        {/* Global Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
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
      </div>
    );
  }

  const totalIndividualAllocated = travellerStats.reduce(
    (acc, t) => acc + t.allocatedBudget,
    0
  );

  return (
    <>
      {/* Travellers List & Individual Budget Progress */}
      {isOrganizer && (
        <div className="mb-3">
          <button
            onClick={handleOpenAdd}
            className="w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold py-3 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Add Traveller
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {travellerStats.map((t) => (
          <div
            key={t.id}
            onClick={() => navigate(`${basePath}/travellers/${t.id}`)}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-between gap-3 min-h-[90px] sm:min-h-[105px]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Avatar src={getTravellerPhoto(t)} name={t.fullName} size="lg" className="border-2 border-indigo-500/30 shadow-xs" />

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
                    <span className="text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
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

      {/* Edit Traveller Profile Modal */}
      <EditTravellerModal
        isOpen={isAddModalOpen}
        editingTraveller={editingTraveller}
        isOrganizer={isOrganizer}
        currency={trip.currency}
        currentUser={currentUser}
        onClose={handleCloseEditModal}
        onSave={handleSaveTraveller}
        showToast={showToast}
      />

      {/* Google Form Collection Modal */}
      <GoogleFormCollectModal
        trip={trip}
        isOpen={isGoogleFormModalOpen}
        onClose={() => goBack()}
        onUpdateTripConfig={(formConfig) => {
          onUpdateTrip({
            ...trip,
            googleFormConfig: formConfig,
          });
        }}
      />

      {/* Edit Pending Registration Modal */}
      {editingPendingReg && (
        <EditPendingRegistrationModal
          registration={editingPendingReg}
          currency={trip.currency}
          onClose={() => goBack()}
          onSave={handleSaveAndApproveEdit}
        />
      )}

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
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

      {/* Custom Confirmation Modal for Rejection & Deletion */}
      <AnimatePresence>
        {rejectConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
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
                  type="button"
                  onClick={() => setRejectConfirmId(null)}
                  className="flex-1 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  className="flex-1 px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-500 shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Reject Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {travellerToDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-lg font-black">Remove Traveller?</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to remove this traveller from the trip? This will permanently delete their profile details from the trip list.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTravellerToDeleteId(null)}
                  className="flex-1 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteTraveller}
                  className="flex-1 px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-500 shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Remove Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

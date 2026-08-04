import React, { useState } from "react";
import { PendingTravellerRegistration, TravellerRole } from "../types";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { uploadProfilePhotoToStorage } from "../lib/image-utils";
import { X, CheckCircle, AlertCircle, User, Phone, Mail, DollarSign, Shield, FileText } from "lucide-react";

interface EditPendingRegistrationModalProps {
  registration: PendingTravellerRegistration;
  isOpen: boolean;
  onClose: () => void;
  onSaveAndApprove: (updatedReg: PendingTravellerRegistration) => void;
}

export const EditPendingRegistrationModal: React.FC<EditPendingRegistrationModalProps> = ({
  registration,
  isOpen,
  onClose,
  onSaveAndApprove,
}) => {
  const [fullName, setFullName] = useState(registration.fullName || "");
  const [age, setAge] = useState(registration.age || 25);
  const [gender, setGender] = useState<"Male" | "Female" | "Other">(registration.gender || "Male");
  const [role, setRole] = useState<TravellerRole>(registration.role || "Traveller");
  const [allocatedBudget, setAllocatedBudget] = useState(registration.allocatedBudget || 5000);
  const [phone, setPhone] = useState(registration.phone || "");
  const [emergencyContact, setEmergencyContact] = useState(registration.emergencyContact || "");
  const [bloodGroup, setBloodGroup] = useState(registration.bloodGroup || "O+");
  const [email, setEmail] = useState(registration.email || "");
  const [passportNumber, setPassportNumber] = useState(registration.passportNumber || "");
  const [drivingLicense, setDrivingLicense] = useState(registration.drivingLicense || "");
  const [profilePhoto, setProfilePhoto] = useState(registration.profilePhoto || "");

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs.fullName = "Full Name is required";
    }

    if (isNaN(Number(age)) || Number(age) <= 0) {
      errs.age = "Age must be a positive number";
    }

    if (isNaN(Number(allocatedBudget)) || Number(allocatedBudget) <= 0) {
      errs.allocatedBudget = "Budget must be greater than 0";
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Invalid email format";
    }

    if (phone.trim() && phone.trim().replace(/[^0-9]/g, "").length < 6) {
      errs.phone = "Phone format invalid (minimum 6 digits)";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let finalPhotoUrl = profilePhoto.trim() || registration.profilePhoto || "";
    if (finalPhotoUrl.startsWith("data:")) {
      try {
        finalPhotoUrl = await uploadProfilePhotoToStorage(finalPhotoUrl, registration.id || `reg_${Date.now()}`);
      } catch (err) {
        console.error("Profile photo upload failed:", err);
      }
    }

    const updated: PendingTravellerRegistration = {
      ...registration,
      fullName: fullName.trim(),
      age: Number(age),
      gender,
      role,
      allocatedBudget: Number(allocatedBudget),
      phone: phone.trim(),
      emergencyContact: emergencyContact.trim(),
      bloodGroup,
      email: email.trim(),
      passportNumber: passportNumber.trim(),
      drivingLicense: drivingLicense.trim(),
      profilePhotoUrl: finalPhotoUrl,
      profilePhoto: finalPhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
    };

    onSaveAndApprove(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" /> Edit Pending Traveller Registration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review and update submission details before approving into the trip.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Full Name & Age */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Rahul Sharma"
              />
              {errors.fullName && <p className="text-[11px] text-rose-500 font-medium">{errors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Age <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {errors.age && <p className="text-[11px] text-rose-500 font-medium">{errors.age}</p>}
            </div>
          </div>

          {/* Row 2: Gender, Role, Blood Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TravellerRole)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Traveller">Traveller</option>
                <option value="Organizer">Organizer</option>
                <option value="Driver">Driver / Guide</option>
                <option value="Guest">Guest</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Budget & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Personal Budget (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={allocatedBudget}
                onChange={(e) => setAllocatedBudget(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {errors.allocatedBudget && (
                <p className="text-[11px] text-rose-500 font-medium">{errors.allocatedBudget}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="+91 98765 43210"
              />
              {errors.phone && <p className="text-[11px] text-rose-500 font-medium">{errors.phone}</p>}
            </div>
          </div>

          {/* Row 4: Email & Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="name@example.com"
              />
              {errors.email && <p className="text-[11px] text-rose-500 font-medium">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Emergency Contact</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="+91 98111 22233"
              />
            </div>
          </div>

          {/* Row 5: Passport & Driving License */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Passport Number (Optional)</label>
              <input
                type="text"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Z9812344"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Driving License Number (Optional)</label>
              <input
                type="text"
                value={drivingLicense}
                onChange={(e) => setDrivingLicense(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. KA-05-2022-00918"
              />
            </div>
          </div>

          {/* Row 6: Profile Photo Upload */}
          <ProfilePhotoUpload
            photoUrl={profilePhoto}
            fullName={fullName}
            onChangePhoto={(newUrl) => setProfilePhoto(newUrl)}
            onRemovePhoto={() => setProfilePhoto("")}
          />

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all"
            >
              <CheckCircle className="w-4 h-4" /> Save & Approve
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

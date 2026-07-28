/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Trash2, Upload, AlertCircle, Loader2, User } from "lucide-react";
import { PhotoEditorModal } from "./PhotoEditorModal";
import { AnimatePresence } from "motion/react";

interface ProfilePhotoUploadProps {
  photoUrl?: string;
  fullName?: string;
  onChangePhoto: (dataUrl: string) => void;
  onRemovePhoto: () => void;
  className?: string;
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "TR";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  photoUrl,
  fullName,
  onChangePhoto,
  onRemovePhoto,
  className = "",
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size exceeds 5 MB. Please select a smaller photo.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg("Invalid format. Please upload JPG, PNG, or WEBP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input values
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleApplyCropped = async (croppedDataUrl: string) => {
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      onChangePhoto(croppedDataUrl);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save photo.");
    } finally {
      setIsProcessing(false);
      setSelectedImage(null);
    }
  };

  const initials = getInitials(fullName);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden File Inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Photo Editor Modal */}
      <AnimatePresence>
        {selectedImage && (
          <PhotoEditorModal
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
            onApply={handleApplyCropped}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
        {/* Circular Avatar Preview (80–100px) */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-indigo-500/20 border-2 border-white dark:border-slate-800 shadow-md bg-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl uppercase">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={fullName || "Traveller"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image URL fails to load
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <span>{initials}</span>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white text-[10px] font-bold">
                <Loader2 className="w-5 h-5 animate-spin mb-1 text-indigo-400" />
                <span>Saving...</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex-1 text-center sm:text-left space-y-2 w-full">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Profile Photo</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Upload from gallery or take a quick photo (JPG, PNG, WEBP &lt; 5MB)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            {/* Gallery Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all disabled:opacity-50"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Choose from Gallery</span>
            </button>

            {/* Camera Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Take Photo</span>
            </button>

            {/* Remove Photo Option (if photo exists) */}
            {photoUrl && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={onRemovePhoto}
                className="inline-flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

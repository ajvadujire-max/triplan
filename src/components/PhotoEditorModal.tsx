/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  RotateCcw, 
  RotateCw, 
  RefreshCcw, 
  Check, 
  ZoomIn, 
  ZoomOut 
} from "lucide-react";
import { getCroppedImg } from "../lib/image-utils";

interface PhotoEditorModalProps {
  image: string;
  onClose: () => void;
  onApply: (croppedImage: string) => void;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  image,
  onClose,
  onApply,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleRotateLeft = () => setRotation((prev) => (prev - 90) % 360);
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsApplying(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
      onApply(croppedImage);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10">
        <button
          onClick={onClose}
          className="px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm font-bold flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Cancel</span>
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest">Adjust Photo</h2>
        <div className="w-20 hidden sm:block" /> {/* Spacer */}
        <button
          onClick={handleReset}
          className="sm:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
          title="Reset"
        >
          <RefreshCcw className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Cropper Area */}
      <div className="relative flex-1 bg-zinc-950 overflow-hidden">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          rotation={rotation}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          cropShape="round"
          showGrid={false}
          classes={{
            containerClassName: "bg-zinc-950",
            mediaClassName: "max-h-full",
            cropAreaClassName: "border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]",
          }}
        />
      </div>

      {/* Controls Container */}
      <div className="p-6 bg-black/80 backdrop-blur-xl border-t border-white/10 space-y-6">
        {/* Zoom Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-zinc-500" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-indigo-500 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-zinc-500" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRotateLeft}
              className="p-3 sm:p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/5 transition-all active:scale-95"
              title="Rotate Left"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={handleRotateRight}
              className="p-3 sm:p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/5 transition-all active:scale-95"
              title="Rotate Right"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleReset}
              className="hidden sm:flex items-center gap-2 px-4 py-3 sm:py-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/5 transition-all active:scale-95 text-xs font-bold uppercase tracking-widest"
              title="Reset"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            {isApplying ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            <span>Apply Photo</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

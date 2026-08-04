/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "lucide-react";

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "TR";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getTravellerPhoto(person: any): string | null {
  if (!person) return null;
  return (
    person.profilePhoto ||
    person.photoURL ||
    person.profileImage ||
    person.avatarUrl ||
    person.imageUrl ||
    person.photo ||
    null
  );
}

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | string;
  className?: string;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  className = "",
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  const resolvedPhoto = src && !imgError ? src : null;
  const initials = getInitials(name);

  let sizeClasses = "w-10 h-10 text-sm";
  if (size === "xs") sizeClasses = "w-6 h-6 text-[10px]";
  else if (size === "sm") sizeClasses = "w-8 h-8 text-xs";
  else if (size === "md") sizeClasses = "w-10 h-10 text-sm";
  else if (size === "lg") sizeClasses = "w-12 h-12 text-base";
  else if (size === "xl") sizeClasses = "w-20 h-20 sm:w-24 sm:h-24 text-2xl";
  else if (typeof size === "string" && size.startsWith("w-")) {
    sizeClasses = size;
  }

  return (
    <div
      onClick={onClick}
      className={`relative rounded-full overflow-hidden bg-indigo-600 text-white font-extrabold uppercase flex items-center justify-center shrink-0 select-none ${sizeClasses} ${
        onClick ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
      } ${className}`}
    >
      {resolvedPhoto ? (
        <img
          src={resolvedPhoto}
          alt={name || "Avatar"}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : name ? (
        <span>{initials}</span>
      ) : (
        <User className="w-1/2 h-1/2 text-white/80" />
      )}
    </div>
  );
};

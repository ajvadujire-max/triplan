import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateTripCode(name: string): string {
  const prefix = name.substring(0, 3).toLowerCase();
  const random = Math.random().toString(36).substring(2, 6).toLowerCase();
  return `${prefix}${random}`;
}

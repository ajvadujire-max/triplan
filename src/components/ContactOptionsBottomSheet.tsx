/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, X, Copy, Check, Smartphone, AlertCircle } from "lucide-react";

interface ContactTarget {
  phone: string;
  name?: string;
}

interface ContactContextType {
  openContact: (phone: string, name?: string) => void;
  closeContact: () => void;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

export const useContactTraveller = () => {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error("useContactTraveller must be used within a ContactTravellerProvider");
  }
  return context;
};

export function sanitizePhoneForTel(phone: string): string {
  if (!phone) return "";
  const hasPlus = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export function sanitizePhoneForWhatsApp(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    return digits.slice(2);
  }
  return digits;
}

interface ProviderProps {
  children: React.ReactNode;
}

export const ContactTravellerProvider: React.FC<ProviderProps> = ({ children }) => {
  const [target, setTarget] = useState<ContactTarget | null>(null);
  const [copied, setCopied] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const openContact = (phone: string, name?: string) => {
    if (!phone || !phone.trim()) {
      showSnackbar("No valid phone number provided for this traveller.");
      return;
    }
    setTarget({ phone: phone.trim(), name: name?.trim() });
    setCopied(false);
  };

  const closeContact = () => {
    setTarget(null);
  };

  const showSnackbar = (msg: string) => {
    setSnackbarMessage(msg);
    setTimeout(() => {
      setSnackbarMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const formattedTel = target ? sanitizePhoneForTel(target.phone) : "";
  const formattedWA = target ? sanitizePhoneForWhatsApp(target.phone) : "";
  const isValidPhone = formattedTel.length >= 6;

  const handleCall = () => {
    if (!isValidPhone) {
      showSnackbar("Invalid phone number format.");
      return;
    }
    try {
      const telUrl = `tel:${formattedTel}`;
      window.location.href = telUrl;
    } catch (err) {
      showSnackbar("Unable to open device dialer.");
    }
  };

  const handleWhatsApp = () => {
    if (!isValidPhone) {
      showSnackbar("Invalid phone number format.");
      return;
    }
    try {
      const waUrl = `https://wa.me/${formattedWA}`;
      const opened = window.open(waUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = waUrl;
      }
    } catch (err) {
      showSnackbar("WhatsApp is not installed on this device.");
    }
  };

  const handleCopy = () => {
    if (!target?.phone) return;
    navigator.clipboard.writeText(target.phone);
    setCopied(true);
    showSnackbar("Phone number copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ContactContext.Provider value={{ openContact, closeContact }}>
      {children}

      {/* Material 3 Bottom Sheet Modal */}
      <AnimatePresence>
        {target && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
            {/* Backdrop click to dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeContact}
              className="absolute inset-0"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden p-5 sm:p-6 space-y-5"
            >
              {/* Drag Handle Bar */}
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-1" />

              {/* Sheet Header */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Contact Traveller
                  </h3>
                  {target.name && (
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {target.name}
                    </p>
                  )}
                  {/* Phone Number Display at Top */}
                  <div className="flex items-center gap-2 mt-1">
                    <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-200 tracking-wide select-all">
                      {target.phone}
                    </span>
                    <button
                      onClick={handleCopy}
                      title="Copy phone number"
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={closeContact}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isValidPhone && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>This phone number format appears invalid. Actions may fail.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-1">
                {/* Call Action */}
                <button
                  onClick={handleCall}
                  disabled={!isValidPhone}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                        Call
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Opens phone dialer ({formattedTel})
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-xs">
                    Dial
                  </span>
                </button>

                {/* WhatsApp Action */}
                <button
                  onClick={handleWhatsApp}
                  disabled={!isValidPhone}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.572-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893 0-3.18-1.238-6.167-3.487-8.413" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                        WhatsApp
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Chat using WhatsApp (+{formattedWA})
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#25D366] bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-xs">
                    Chat
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Snackbar Notification */}
      <AnimatePresence>
        {snackbarMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-700 dark:border-slate-200"
          >
            <Smartphone className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>{snackbarMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </ContactContext.Provider>
  );
};

interface ContactPhoneButtonProps {
  phone?: string;
  travellerName?: string;
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export const ContactPhoneButton: React.FC<ContactPhoneButtonProps> = ({
  phone,
  travellerName,
  className = "",
  showIcon = true,
  children,
}) => {
  const { openContact } = useContactTraveller();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (phone) {
      openContact(phone, travellerName);
    }
  };

  if (!phone) {
    return <span className="text-slate-400 italic text-xs">No phone</span>;
  }

  if (children) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`cursor-pointer hover:underline text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 transition-all text-xs font-semibold cursor-pointer ${className}`}
    >
      {showIcon && <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
      <span className="truncate">{phone}</span>
    </button>
  );
};

import { useEffect, useRef } from "react";

/**
 * Custom hook to intercept Android Back button / Browser Back button
 * when a modal, drawer, or bottom sheet is open.
 *
 * Pushes a dummy state into history when open, and pops it or closes the modal on Back.
 */
export function useModalBack(isOpen: boolean, onClose: () => void) {
  const isBackTriggered = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    isBackTriggered.current = false;
    const modalKey = `modal_${Date.now()}_${Math.random()}`;

    // Push a state to history so Android Back button pops this entry
    window.history.pushState({ modalKey }, "");

    const handlePopState = () => {
      isBackTriggered.current = true;
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // If closed manually (e.g. clicking 'X' or backdrop) rather than Back button, revert history
      if (!isBackTriggered.current && window.history.state?.modalKey === modalKey) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}

import { useEffect, useRef } from "react";
import { backButtonManager } from "../lib/backButtonManager";

/**
 * Hook to handle mobile back button for modals and overlays.
 * It uses a global manager to support nested modals correctly.
 */
export function useMobileBackHandler(isOpen: boolean, onClose: () => void) {
  const isRegistered = useRef(false);

  useEffect(() => {
    if (isOpen && !isRegistered.current) {
      backButtonManager.register(onClose);
      isRegistered.current = true;
    } else if (!isOpen && isRegistered.current) {
      backButtonManager.unregister();
      isRegistered.current = false;
    }

    return () => {
      if (isRegistered.current) {
        backButtonManager.unregister();
        isRegistered.current = false;
      }
    };
  }, [isOpen, onClose]);
}

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function useHardwareBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let lastBackPress = 0;
    const timePeriodToExit = 2000;

    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      // 1. Check if there are modals or dialogs open to close them first
      // Assuming you use standard Dialog elements or a specific class for modals
      const openModals = document.querySelectorAll('dialog[open], .modal-open, [role="dialog"]');
      if (openModals.length > 0) {
        // You could trigger a global state reset here or click the dynamic backdrop
        // For standard dialogs:
        const lastModal = openModals[openModals.length - 1];
        if (lastModal instanceof HTMLDialogElement) {
          lastModal.close();
          return;
        } else if (lastModal instanceof HTMLElement) {
          // If you have a custom modal logic, you might dispatch an event
          const closeEvent = new CustomEvent('close-modal');
          window.dispatchEvent(closeEvent);
          return;
        }
      }

      // 2. Main route logic
      const path = location.pathname;
      const isHome = path === '/';
      
      // Additional main screen paths adapting rule 3: "store, profile, matchmaking, results" 
      // mapped to our app equivalents
      const isMainMenuVariant = [
        '/settings',
        '/goals',
        '/inbox', 
        '/appearance'
      ].includes(path);

      if (isMainMenuVariant) {
        // Return to main dashboard
        navigate('/');
      } else if (isHome) {
        // Double tap to exit logic mapped to rule 5
        const now = new Date().getTime();
        if (now - lastBackPress < timePeriodToExit) {
          App.exitApp();
        } else {
          lastBackPress = now;
          // Here you'd trigger a toast notification "Press back again to exit"
          // Let's dispatch a custom event that can be listened to in components
          window.dispatchEvent(new CustomEvent('app-exit-warning'));
        }
      } else {
        // Standard back navigation for other screens
        if (canGoBack) {
          navigate(-1);
        } else {
          navigate('/');
        }
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [navigate, location]);
}

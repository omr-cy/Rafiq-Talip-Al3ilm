import { useState, useEffect } from 'react';
import { useHardwareBackButton } from '../hooks/useHardwareBackButton';

export function BackButtonHandler() {
  const [showExitWarning, setShowExitWarning] = useState(false);
  useHardwareBackButton();

  useEffect(() => {
    const handleExitWarning = () => {
      setShowExitWarning(true);
      setTimeout(() => setShowExitWarning(false), 2000);
    };

    window.addEventListener('app-exit-warning', handleExitWarning as EventListener);
    return () => {
      window.removeEventListener('app-exit-warning', handleExitWarning as EventListener);
    };
  }, []);

  if (!showExitWarning) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-[9999] shadow-lg animate-in fade-in slide-in-from-bottom-5">
      اضغط مرة أخرى للخروج من التطبيق
    </div>
  );
}

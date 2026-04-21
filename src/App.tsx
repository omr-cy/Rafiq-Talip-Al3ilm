import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { StatusBar } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { Header } from "./components/Header";
import { BackHeader } from "./components/BackHeader";
import { NotificationProvider } from "./components/NotificationProvider";
import { TabProvider } from "./components/TabContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalErrorHandler } from "./components/GlobalErrorHandler";
import { BackButtonHandler } from "./components/BackButtonHandler";

import { MainCarousel } from "./components/MainCarousel";

const DictionaryPage = lazy(() => import("./pages/DictionaryPage").then(m => ({ default: m.DictionaryPage })));
const InboxPage = lazy(() => import("./pages/InboxPage").then(m => ({ default: m.InboxPage })));
const AudioPage = lazy(() => import("./pages/AudioPage").then(m => ({ default: m.AudioPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const AppearancePage = lazy(() => import("./pages/AppearancePage").then(m => ({ default: m.AppearancePage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-olive-200 border-t-olive-600 rounded-full animate-spin"></div>
    </div>
  );
}

function Layout() {
  const location = useLocation();
  const hideNav = ["/settings", "/appearance"].includes(location.pathname);

  return (
    <div className="flex h-screen bg-paper text-olive-900 font-sans selection:bg-olive-200 selection:text-olive-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {!hideNav && <Header />}
        {hideNav && location.pathname === "/settings" && <BackHeader title="الإعدادات" />}
        {hideNav && location.pathname === "/appearance" && <BackHeader title="المظاهر" />}
        
        <main className="flex-1 overflow-y-hidden p-0 w-full relative">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Main Carousel covers the core horizontal sections */}
              <Route path="/" element={<MainCarousel />} />
              <Route path="/notes" element={<MainCarousel />} />
              <Route path="/goals" element={<MainCarousel />} />
              <Route path="/flashcards" element={<MainCarousel />} />

              {/* Standalone/Overlay Pages */}
              <Route path="/dictionary" element={<div className="h-full overflow-y-auto p-3 md:p-8 pb-24 md:pb-8 pt-safe"><DictionaryPage /></div>} />
              <Route path="/inbox" element={<div className="h-full overflow-y-auto p-3 md:p-8 pb-24 md:pb-8 pt-safe"><InboxPage /></div>} />
              <Route path="/audio" element={<div className="h-full overflow-y-auto p-3 md:p-8 pb-24 md:pb-8 pt-safe"><AudioPage /></div>} />
              <Route path="/settings" element={<div className="h-full overflow-y-auto p-3 md:p-8 pb-24 md:pb-8 pt-safe"><SettingsPage /></div>} />
              <Route path="/appearance" element={<div className="h-full overflow-y-auto p-3 md:p-8 pb-24 md:pb-8 pt-safe"><AppearancePage /></div>} />
            </Routes>
          </Suspense>
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const hideStatusBar = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.hide();
        } catch (error) {
          console.error("Failed to hide status bar:", error);
        }
      }
    };
    hideStatusBar();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TabProvider>
          <NotificationProvider>
            <GlobalErrorHandler />
            <Router>
              <BackButtonHandler />
              <Layout />
            </Router>
        </NotificationProvider>
        </TabProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

import { useEffect, useRef, useState, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";

// Lazy load the main pages
const Dashboard = lazy(() => import("@/src/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const NotesPage = lazy(() => import("@/src/pages/NotesPage").then(m => ({ default: m.NotesPage })));
const GoalsPage = lazy(() => import("@/src/pages/GoalsPage").then(m => ({ default: m.GoalsPage })));
const FlashcardsPage = lazy(() => import("@/src/pages/FlashcardsPage").then(m => ({ default: m.FlashcardsPage })));

const MAIN_TABS = [
  { path: "/", id: "tab-0" },
  { path: "/notes", id: "tab-1" },
  { path: "/goals", id: "tab-2" },
  { path: "/flashcards", id: "tab-3" },
];

function PageLoader() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-olive-200 border-t-olive-600 rounded-full animate-spin"></div>
    </div>
  );
}

export function MainCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isInternalScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const isTouching = useRef(false);

  // Sync Location -> Scroll Position (Tabs bottom bar clicks)
  useEffect(() => {
    const tabIndex = MAIN_TABS.findIndex((t) => t.path === location.pathname);
    if (tabIndex !== -1 && containerRef.current && !isInternalScroll.current) {
      const container = containerRef.current;
      const child = container.children[tabIndex] as HTMLElement;
      if (!child) return;
      
      const currentScroll = container.scrollLeft;
      const targetScroll = child.offsetLeft;
      
      // Allow slight pixel difference for sub-pixel layouts
      if (Math.abs(currentScroll - targetScroll) > 5) {
        isInternalScroll.current = true;
        container.scrollTo({
          left: targetScroll,
          behavior: "smooth"
        });

        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        
        scrollTimeout.current = setTimeout(() => {
          isInternalScroll.current = false;
        }, 800);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let debounceTimeoutId: NodeJS.Timeout;

    const handleTouchStart = () => { isTouching.current = true; };
    const handleTouchEnd = () => { isTouching.current = false; };

    const handleScroll = () => {
      if (isInternalScroll.current) return;

      clearTimeout(debounceTimeoutId);

      // We wait longer (250ms) to ensure snap animation finishes
      debounceTimeoutId = setTimeout(() => {
        // Do not update URL if the user's finger is still on the screen
        if (isTouching.current) return;

        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        let closestIndex = 0;
        let minDiff = Infinity;

        Array.from(container.children).forEach((child, index) => {
          const childRect = child.getBoundingClientRect();
          const childCenter = childRect.left + childRect.width / 2;
          const diff = Math.abs(containerCenter - childCenter);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = index;
          }
        });

        const targetTab = MAIN_TABS[closestIndex];
        if (targetTab && location.pathname !== targetTab.path) {
          isInternalScroll.current = true;
          // React Router navigate triggers a full render cycle which causes scrolling judder.
          // Because we only need the bottom bar to update visually, we use the `{ replace: true }`
          // option so it doesn't push massive history stacks when swiping back and forth at once
          navigate(targetTab.path, { replace: true });
          
          setTimeout(() => {
            isInternalScroll.current = false;
          }, 150);
        }
      }, 250); 
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    // Catch touch state so we don't trigger mid-swipe while resting finger
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    // Also catch touchend equivalent
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
      clearTimeout(debounceTimeoutId);
    };
  }, [location.pathname, navigate]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex w-full h-full overflow-x-auto snap-x snap-mandatory will-change-scroll overscroll-behavior-x-none",
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        "smooth-scroll shadow-inner bg-paper"
      )}
      dir="rtl"
    >
      <div className="w-full h-full flex-shrink-0 snap-center overflow-y-auto p-3 lg:p-8 pb-24 lg:pb-8 pt-safe touch-pan-y touch-pan-x">
        <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
      </div>
      <div className="w-full h-full flex-shrink-0 snap-center overflow-y-auto p-3 lg:p-8 pb-24 lg:pb-8 pt-safe touch-pan-y touch-pan-x">
        <Suspense fallback={<PageLoader />}><NotesPage /></Suspense>
      </div>
      <div className="w-full h-full flex-shrink-0 snap-center overflow-y-auto p-3 lg:p-8 pb-24 lg:pb-8 pt-safe touch-pan-y touch-pan-x">
        <Suspense fallback={<PageLoader />}><GoalsPage /></Suspense>
      </div>
      <div className="w-full h-full flex-shrink-0 snap-center overflow-y-auto p-3 lg:p-8 pb-24 lg:pb-8 pt-safe touch-pan-y touch-pan-x">
        <Suspense fallback={<PageLoader />}><FlashcardsPage /></Suspense>
      </div>
    </div>
  );
}

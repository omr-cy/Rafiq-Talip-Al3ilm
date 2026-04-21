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
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const ignoreNextScroll = useRef(false);

  // Sync Location -> Scroll Position
  useEffect(() => {
    const tabIndex = MAIN_TABS.findIndex((t) => t.path === location.pathname);
    if (tabIndex !== -1 && containerRef.current) {
      const container = containerRef.current;
      const children = container.children;
      if (children[tabIndex]) {
        // Mark that this scroll is programmatic to ignore it in handleScroll
        ignoreNextScroll.current = true;
        
        // Use scrollTo on container instead of scrollIntoView on child for better control
        const child = children[tabIndex] as HTMLElement;
        container.scrollTo({
          left: child.offsetLeft,
          behavior: "smooth"
        });

        // Reset the ignore flag after the smooth scroll completes
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
          ignoreNextScroll.current = false;
        }, 500); // Extended to 500ms to safely cover the smooth scroll behavior
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0");
            const targetTab = MAIN_TABS[index];
            if (targetTab && location.pathname !== targetTab.path) {
              // Only navigate if not forced to ignore (e.g., during programmatic scroll)
              if (!ignoreNextScroll.current) {
                navigate(targetTab.path, { replace: true });
              }
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.8, // Must be 80% visible to trigger
      }
    );

    const childElements = containerRef.current?.children;
    if (childElements) {
      Array.from(childElements).forEach((el, i) => {
        el.setAttribute("data-index", i.toString());
        observer.observe(el);
      });
    }

    return () => observer.disconnect();
  }, [location.pathname, navigate]);


  return (
    <div
      ref={containerRef}
      className={cn(
        "flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth",
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        "smooth-scroll shadow-inner bg-paper"
      )}
      dir="rtl"
    >
      {/* 
        Modified to use 'touch-pan-x' to advise the browser to prioritize 
        horizontal scrolling during user interaction
      */}
      <div className="w-full h-full flex-shrink-0 snap-center snap-always overflow-y-auto p-3 md:p-8 pb-24 md:pb-8 pt-safe touch-pan-y touch-pan-x">
        <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
      </div>
      <div className="w-full h-full flex-shrink-0 snap-center snap-always overflow-y-auto p-3 md:p-8 pb-24 md:pb-8 pt-safe touch-pan-y touch-pan-x">
        <Suspense fallback={<PageLoader />}><NotesPage /></Suspense>
      </div>
      <div className="w-full h-full flex-shrink-0 snap-center snap-always overflow-y-auto p-3 md:p-8 pb-24 md:pb-8 pt-safe touch-pan-y touch-pan-x">
        <Suspense fallback={<PageLoader />}><GoalsPage /></Suspense>
      </div>
      <div className="w-full h-full flex-shrink-0 snap-center snap-always overflow-y-auto p-3 md:p-8 pb-24 md:pb-8 pt-safe touch-pan-y touch-pan-x">
        <Suspense fallback={<PageLoader />}><FlashcardsPage /></Suspense>
      </div>
    </div>
  );
}

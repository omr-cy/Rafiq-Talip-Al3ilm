import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BookOpen,
  Home,
  Target,
  BookMarked,
  Copy,
  MoreHorizontal,
  Library,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useTab } from "./TabContext";

const mainNavItems = [
  { icon: Home, label: "الرئيسية", path: "/" },
  { icon: BookOpen, label: "الملاحظات", path: "/notes" },
  { icon: Target, label: "الأهداف", path: "/goals" },
  { icon: Copy, label: "البطاقات", path: "/flashcards" },
];

const moreNavItems = [
  { icon: BookMarked, label: "المعجم الشخصي", path: "/dictionary" },
  { icon: Library, label: "المكتبة الصوتية", path: "/audio" },
  { icon: MessageSquare, label: "صندوق الوارد", path: "/inbox" },
];

export function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const location = useLocation();
  const activePath = location.pathname;

  const isMoreActive = moreNavItems.some(
    (item) => item.path === activePath,
  );

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-paper/90 backdrop-blur-xl border-t border-olive-200/40 flex justify-around items-center p-2 pb-safe z-50 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setShowMore(false)}
            className={() =>
              cn(
                "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-150 relative overflow-hidden flex-1 active:scale-95",
                item.path === activePath
                  ? "text-olive-900"
                  : "text-olive-500 hover:text-olive-700",
              )
            }
          >
            {() => (
              <>
                {item.path === activePath && (
                  <div className="absolute inset-0 bg-olive-100/80 rounded-2xl -z-10 animate-in zoom-in-90 duration-150 shadow-inner" />
                )}
                <item.icon
                  className={cn(
                    "w-6 h-6 transition-transform duration-150",
                    item.path === activePath && "scale-110 text-olive-800",
                  )}
                  strokeWidth={item.path === activePath ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] transition-all duration-150",
                    item.path === activePath ? "font-bold text-olive-900" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => setShowMore(!showMore)}
          className={cn(
            "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-150 relative overflow-hidden flex-1 active:scale-95",
            showMore || isMoreActive
              ? "text-olive-900"
              : "text-olive-500 hover:text-olive-700",
          )}
          aria-label="المزيد"
          aria-expanded={showMore}
        >
          {(showMore || isMoreActive) && (
            <div className="absolute inset-0 bg-olive-100/80 rounded-2xl -z-10 animate-in zoom-in-90 duration-150 shadow-inner" />
          )}
          {showMore ? (
            <X
              className="w-6 h-6 transition-transform duration-150 scale-110 text-olive-800"
              strokeWidth={2.5}
            />
          ) : (
            <MoreHorizontal
              className={cn(
                "w-6 h-6 transition-transform duration-150",
                isMoreActive && "scale-110 text-olive-800",
              )}
              strokeWidth={isMoreActive ? 2.5 : 2}
            />
          )}
          <span
            className={cn(
              "text-[10px] transition-all duration-150",
              showMore || isMoreActive ? "font-bold text-olive-900" : "font-medium",
            )}
          >
            المزيد
          </span>
        </button>
      </nav>

      {showMore && (
        <>
          <div
            onClick={() => setShowMore(false)}
            className="md:hidden fixed inset-0 bg-olive-900/20 backdrop-blur-sm z-40"
          />
          <div
            className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-4 right-4 bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-olive-200/50 p-4 z-40 flex flex-col gap-2"
          >
            {moreNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setShowMore(false)}
                className={() =>
                  cn(
                    "flex items-center gap-4 p-4 rounded-2xl transition-all duration-150 group active:scale-95",
                    item.path === activePath || item.path === location.pathname
                      ? "bg-olive-900 text-paper shadow-md shadow-olive-900/10"
                      : "text-olive-700 hover:bg-olive-50 font-medium",
                  )
                }
              >
                <div
                  className={cn(
                    "p-2.5 rounded-xl transition-colors duration-150",
                    isMoreActive
                      ? "bg-sand text-olive-900"
                      : "bg-olive-100 text-olive-800 group-hover:bg-olive-200",
                  )}
                >
                  <item.icon className="w-5 h-5" strokeWidth={isMoreActive ? 2.5 : 2} />
                </div>
                <span className={cn("text-sm transition-all duration-150", isMoreActive && "font-bold")}>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </>
      )}
    </>
  );
}

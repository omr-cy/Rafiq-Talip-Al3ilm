import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Home,
  Library,
  Target,
  MessageSquare,
  Settings,
  BookMarked,
  Copy,
  Heart,
  Info,
  Briefcase,
  Wrench,
  Share2,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

const navItems = [
  { icon: Home, label: "الرئيسية", path: "/" },
  { icon: BookOpen, label: "الملاحظات الذكية", path: "/notes" },
  { icon: Library, label: "المكتبة الصوتية", path: "/audio" },
  { icon: BookMarked, label: "المعجم الشخصي", path: "/dictionary" },
  { icon: Target, label: "الأهداف العلمية", path: "/goals" },
  { icon: Copy, label: "بطاقات المذاكرة", path: "/flashcards" },
  { icon: MessageSquare, label: "صندوق الوارد", path: "/inbox" },
];

const menuItems = [
  { label: "أدعمنا", icon: Heart },
  { label: "من نحن", icon: Info },
  { label: "مشاريعنا", icon: Briefcase },
  { label: "الدعم والتطوير", icon: Wrench },
  { label: "شارك التطبيق", icon: Share2 },
];

export function Sidebar() {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className="hidden md:flex w-64 bg-paper-dark/20 border-l border-olive-200/40 h-screen sticky top-0 flex-col shrink-0">
      <div className="p-8 flex items-center gap-4 relative" ref={menuRef}>
        <div 
          onClick={() => setShowMenu(!showMenu)}
          className="w-12 h-12 bg-gradient-to-br from-olive-800 to-olive-900 rounded-xl flex items-center justify-center text-sand font-serif text-2xl font-bold shadow-md shadow-olive-900/20 cursor-pointer hover:scale-105 transition-transform"
        >
          ط
        </div>
        
        {showMenu && (
          <div className="absolute top-20 left-8 w-48 bg-card rounded-2xl shadow-xl border border-olive-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            {menuItems.map((item) => (
              <button
                key={item.label}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-olive-50 text-olive-700 hover:text-olive-900 transition-colors text-sm font-bold"
                onClick={() => setShowMenu(false)}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div>
          <h1 className="font-serif text-xl font-bold text-olive-900 leading-none mb-1">
            طالب العلم
          </h1>
          <span className="text-xs text-olive-600 font-medium bg-olive-100/50 px-2 py-0.5 rounded-md">
            رفيقك في طلب العلم
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium group active:scale-95",
                isActive
                  ? "bg-olive-900 text-paper shadow-lg shadow-olive-900/10"
                  : "text-olive-700 hover:bg-olive-100/80 hover:text-olive-900",
              )
            }
            aria-label={item.label}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={cn(
                    "w-5 h-5 transition-transform duration-300",
                    isActive ? "scale-110 text-sand" : "group-hover:scale-110 group-hover:text-olive-800"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                <span className={cn(isActive && "font-bold")}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

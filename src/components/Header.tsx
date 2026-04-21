import { useState, useRef, useEffect } from "react";
import { Settings, Moon, Sun, Palette, Heart, Info, Briefcase, Wrench, Share2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { useTheme } from "./ThemeProvider";

const menuItems = [
  { label: "أدعمنا", icon: Heart },
  { label: "من نحن", icon: Info },
  { label: "مشاريعنا", icon: Briefcase },
  { label: "الدعم والتطوير", icon: Wrench },
  { label: "شارك التطبيق", icon: Share2 },
];

export function Header() {
  const location = useLocation();
  const isSettings = location.pathname === "/settings";
  const isAppearance = location.pathname === "/appearance";
  const { isDarkMode } = useTheme();
  
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
    <header className="h-16 md:h-20 flex-shrink-0 bg-card/80 backdrop-blur-xl border-b border-olive-200/40 flex items-center justify-between px-4 md:px-8 z-20 shadow-sm">
      {/* Mobile App Title (Hidden on Desktop since Sidebar has it) */}
      <div className="md:hidden flex items-center gap-3 relative" ref={menuRef}>
        <div 
          onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 bg-gradient-to-br from-olive-800 to-olive-900 rounded-xl flex items-center justify-center text-sand font-serif text-xl font-bold shadow-md shadow-olive-900/20 cursor-pointer hover:scale-105 transition-transform"
        >
          ط
        </div>

        {showMenu && (
          <div className="absolute top-14 right-0 w-48 bg-card rounded-2xl shadow-xl border border-olive-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
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
          <h1 className="font-serif text-xl font-bold text-olive-900 leading-none mb-0.5">
            طالب العلم
          </h1>
          <span className="text-[10px] text-olive-600 font-medium bg-olive-100/50 px-1.5 py-0.5 rounded-md">
            رفيقك في طلب العلم
          </span>
        </div>
      </div>

      {/* Spacer for Desktop */}
      <div className="hidden md:block"></div>

      <div className="flex items-center gap-3">
        {/* Appearance Link */}
        <Link
          to="/appearance"
          className={cn(
            "p-2.5 rounded-xl transition-all duration-300 hover:shadow-sm active:scale-95",
            isAppearance
              ? "bg-olive-900 text-paper shadow-md shadow-olive-900/10"
              : "text-olive-600 hover:text-olive-900 hover:bg-olive-100/80",
          )}
          title="المظهر والألوان"
          aria-label="المظهر والألوان"
        >
          <Palette className="w-5 h-5 md:w-6 md:h-6" />
        </Link>

        {/* Settings Icon */}
        <Link
          to="/settings"
          className={cn(
            "p-2.5 rounded-xl transition-all duration-300 hover:shadow-sm active:scale-95",
            isSettings
              ? "bg-olive-900 text-paper shadow-md shadow-olive-900/10"
              : "text-olive-600 hover:text-olive-900 hover:bg-olive-100/80",
          )}
          title="الإعدادات والنسخ الاحتياطي"
          aria-label="الإعدادات والنسخ الاحتياطي"
        >
          <Settings className="w-5 h-5 md:w-6 md:h-6" />
        </Link>
      </div>
    </header>
  );
}

import { useState, useEffect } from "react";
import { Palette, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/src/components/ThemeProvider";
import { db, UserSettings } from "@/src/lib/db";

export function AppearancePage() {
  const { theme, isDarkMode, setTheme, toggleDarkMode } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await db.settings.get();
    setSettings(s);
  };

  const handleHideIntro = async () => {
    if (settings) {
      const updated = { ...settings, hideAppearanceIntro: true };
      await db.settings.save(updated);
      setSettings(updated);
    }
  };

  const themes = [
    { id: "olive", name: "زيتوني", color: "#2C402E" },
    { id: "gold", name: "ذهبي", color: "#6B5700" },
    { id: "rose", name: "وردي", color: "#6B2138" },
    { id: "turquoise", name: "فيروزي", color: "#00575E" },
    { id: "purple", name: "بنفسجي", color: "#422663" },
    { id: "light-green", name: "أخضر فاتح", color: "#1E5C32" },
    { id: "lemon", name: "ليموني", color: "#5C6100" },
    { id: "blue", name: "أزرق هادئ", color: "#1A2E44" },
    { id: "burgundy", name: "عنابي", color: "#441A1A" },
    { id: "midnight", name: "ليلي", color: "#1A1A44" },
    { id: "beige", name: "بيج", color: "#4A4238" },
    { id: "antique-brown", name: "بني عتيق", color: "#3D2B1F" },
    { id: "orange", name: "برتقالي", color: "#4A2500" },
    { id: "sky-blue", name: "لبني سماوي", color: "#0277BD" },
    { id: "gray", name: "رمادي", color: "#343A40" },
    { id: "rosy-pink", name: "وردي فاتح", color: "#AD1457" },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-10">
      {/* Header */}
      {(settings && !settings.hideAppearanceIntro) && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-3xl border border-olive-200/50 shadow-sm relative group">
          <button
            onClick={handleHideIntro}
            className="absolute top-4 left-4 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all z-20"
            title="إخفاء هذا التعريف"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-olive-900 text-paper rounded-2xl shadow-md shadow-olive-900/20">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-olive-900">
                المظهر والألوان
              </h1>
              <p className="text-sm text-olive-600 mt-1 leading-relaxed">
                خصص مظهر التطبيق والألوان التي تفضلها لتناسب ذوقك الشخصي وتجعل تجربتك أكثر راحة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Appearance Section */}
      <div className="bg-card p-6 md:p-8 rounded-3xl border border-olive-200/50 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Dark Mode Toggle */}
          <div className="space-y-4">
            <h3 className="font-bold text-olive-900 flex items-center gap-2">
              {isDarkMode ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
              الوضع الليلي / النهاري
            </h3>
            <div
              onClick={toggleDarkMode}
              className="flex items-center justify-between p-4 bg-paper-dark/20 rounded-2xl border border-olive-100 cursor-pointer hover:bg-paper-dark/30 transition-colors"
            >
              <span className="text-sm font-medium text-olive-800">
                تفعيل الوضع الليلي
              </span>
              <label className="relative inline-flex items-center cursor-pointer pointer-events-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isDarkMode}
                  readOnly
                />
                <div className="w-11 h-6 bg-olive-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
              </label>
            </div>
          </div>

          {/* Color Themes */}
          <div className="space-y-4">
            <h3 className="font-bold text-olive-900 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              سمة الألوان
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    theme === t.id
                      ? "border-olive-900 bg-olive-50"
                      : "border-olive-100 bg-card hover:border-olive-200"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full shadow-inner"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-sm font-bold text-olive-900">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

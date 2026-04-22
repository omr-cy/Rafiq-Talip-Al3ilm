import React, { useState, useEffect, memo } from "react";
import { BookOpen, Target, BookMarked, RefreshCw } from "lucide-react";
import { db, DailyAyah } from "@/src/lib/db";
import { useMobileBackHandler } from "../hooks/useMobileBackHandler";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "../components/Skeleton";
import { cn } from "../lib/utils";

export function Dashboard() {
  const [stats, setStats] = useState({
    notesCount: 0,
    termsCount: 0,
    goalsCount: 0,
  });
  const [showTafsir, setShowTafsir] = useState(false);
  const [ayah, setAyah] = useState<DailyAyah | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useMobileBackHandler(showTafsir, () => setShowTafsir(false));

  const loadAyah = async (forceRandom = false) => {
    let randomAyah;
    if (forceRandom) {
      const allAyahs = await db.ayahs.getAll();
      if (allAyahs.length > 0) {
        randomAyah = allAyahs[Math.floor(Math.random() * allAyahs.length)];
      }
    } else {
      randomAyah = await db.ayahs.getRandom();
    }

    if (!randomAyah) {
      randomAyah = {
        id: "fallback_1",
        text: "إِنَّ لِلمُتَّقينَ مَفازًا",
        surah: "النبأ",
        ayahNumber: 31,
        tafsir:
          "إن للمتقين ربهم بامتثال أوامره واجتناب نواهيه، مكانَ فوزٍ يفوزون فيه بمطلوبهم وهو الجنة.",
        source: "المختصر في التفسير",
      };
    }
    setAyah(randomAyah);
  };

  const handleRefreshAyah = async () => {
    setIsRefreshing(true);
    await loadAyah(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load Stats
        const notesCount = await db.notes.getCount();
        const terms = await db.dictionary.getAll();
        const goals = await db.goals.getAll();

        const completedGoals = goals.filter((g) => g.isCompleted).length;

        setStats({
          notesCount: notesCount,
          termsCount: terms.length,
          goalsCount: completedGoals,
        });

        // Load Ayah
        await loadAyah();
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 lg:space-y-8 pb-10"
    >
      <div className="flex flex-col gap-1 px-2 lg:px-0">
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-olive-900">
          مرحباً بك يا طالب العلم
        </h1>
        <p className="text-olive-600 text-sm lg:text-base">
          نظم وقتك، دوّن فوائدك، وراجع حفظك.
        </p>
      </div>

      {/* Ayah of the Day - Premium Design */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-olive-800 via-olive-900 to-olive-950 text-paper p-5 lg:p-12 shadow-2xl shadow-olive-900/30 border border-olive-700/50 min-h-[14rem] lg:min-h-[24rem] flex flex-col justify-center">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sand/40 blur-[120px]"></div>
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-olive-500/30 blur-[120px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-4 md:space-y-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-olive-950/60 border border-sand/30 backdrop-blur-md shadow-inner">
              <span className="text-sand text-xs font-bold tracking-[0.25em] uppercase">
                آية اليوم
              </span>
            </div>
            <button
              onClick={handleRefreshAyah}
              disabled={isRefreshing}
              className={cn(
                "p-2 bg-olive-950/60 border border-sand/30 rounded-full text-sand hover:bg-olive-900 transition-all active:scale-90",
                isRefreshing && "animate-spin"
              )}
              title="تغيير الآية"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {ayah ? (
            <>
              <motion.div
                key={ayah.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full flex items-center justify-center min-h-[8rem] lg:min-h-[14rem] px-2 py-2"
              >
                <p
                  className={cn(
                    "font-serif text-paper max-w-4xl mx-auto drop-shadow-md py-2 tracking-wider",
                    ayah.text.length > 150 ? "text-lg lg:text-3xl lg:text-4xl" : 
                    ayah.text.length > 80 ? "text-xl lg:text-4xl lg:text-5xl" : 
                    "text-2xl lg:text-5xl lg:text-6xl"
                  )}
                  style={{ 
                    textShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    wordSpacing: "0.2em",
                    lineHeight: "2.2",
                    display: "block"
                  }}
                >
                  ﴿{ayah.text}﴾
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-3 lg:gap-5 text-olive-100"
              >
                <span className="text-sm lg:text-base font-medium bg-olive-950/50 px-6 py-2.5 rounded-full border border-olive-700/50 shadow-sm backdrop-blur-sm">
                  سورة {ayah.surah} - الآية{" "}
                  {ayah.ayahNumber.toLocaleString("ar-EG")}
                </span>
                <button
                  onClick={() => setShowTafsir(!showTafsir)}
                  className="text-sm lg:text-base font-bold bg-sand text-olive-950 hover:bg-sand-light px-8 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
                  aria-expanded={showTafsir}
                  aria-controls="tafsir-content"
                >
                  {ayah.source || "التفسير"}
                </button>
              </motion.div>

              {showTafsir && (
                <div
                  id="tafsir-content"
                  className="w-full max-w-3xl mx-auto overflow-hidden animate-in fade-in duration-200"
                >
                  <div className="mt-8 p-6 lg:p-8 bg-olive-950/50 backdrop-blur-xl rounded-3xl border border-olive-700/60 shadow-inner relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-sand/40 rounded-b-full"></div>
                    <p className="text-paper-dark leading-relaxed text-base md:text-lg font-medium">
                      {ayah.tafsir}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-sand/20 border-t-sand rounded-full animate-spin"></div>
              <span className="text-sand/80 text-sm font-medium animate-pulse">جاري التحميل...</span>
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-[2rem]" />
            <Skeleton className="h-32 rounded-[2rem]" />
            <Skeleton className="h-32 rounded-[2rem]" />
          </>
        ) : (
          <>
            <StatCard
              icon={BookOpen}
              title="الفوائد المدونة"
              value={stats.notesCount.toString()}
              subtitle="فائدة في ملاحظاتك"
              index={0}
            />
            <StatCard
              icon={BookMarked}
              title="المصطلحات المحفوظة"
              value={stats.termsCount.toString()}
              subtitle="مصطلح في معجمك"
              index={1}
            />
            <StatCard
              icon={Target}
              title="الأهداف المنجزة"
              value={stats.goalsCount.toString()}
              subtitle="هدف مكتمل"
              index={2}
            />
          </>
        )}
      </section>
    </motion.div>
  );
}

const StatCard = memo(function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  index,
}: {
  icon: any;
  title: string;
  value: string;
  subtitle: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="optimize-gpu bg-card rounded-[2rem] p-6 lg:p-8 border border-olive-100 shadow-lg shadow-olive-900/5 flex flex-col gap-5 relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-olive-900/10 hover:border-olive-200"
    >
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-olive-50 to-transparent rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
      
      <div className="relative z-10 flex items-center gap-4">
        <div className="p-4 bg-olive-50 rounded-2xl text-olive-600 shadow-sm group-hover:bg-olive-600 group-hover:text-paper transition-colors duration-300 border border-olive-100/50">
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-olive-700 font-bold text-sm lg:text-base mb-1 group-hover:text-olive-900 transition-colors">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-4xl font-bold text-olive-900 tracking-tight">
              {value}
            </span>
          </div>
        </div>
      </div>
      
      <div className="relative z-10 mt-1">
         <span className="text-xs lg:text-sm font-medium text-olive-600 bg-olive-50/80 px-4 py-1.5 rounded-full border border-olive-100/50 inline-block shadow-sm">{subtitle}</span>
      </div>
    </motion.div>
  );
});

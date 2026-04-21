import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { db, Flashcard, FlashcardCategory } from "../lib/db";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Palette,
  FolderPlus,
  Flag,
  BookOpen,
  Lightbulb,
  CalendarClock,
  Calendar,
  Repeat,
  Copy,
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DatePicker } from "../components/DatePicker";
import { RichTextEditor } from "../components/RichTextEditor";
import DOMPurify from "dompurify";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { Skeleton } from "../components/Skeleton";

const COLORS = [
  "var(--color-note-0)",
  "var(--color-note-1)",
  "var(--color-note-2)",
  "var(--color-note-3)",
  "var(--color-note-4)",
  "var(--color-note-5)",
  "var(--color-note-6)",
  "var(--color-note-7)",
  "var(--color-note-8)",
  "var(--color-note-9)",
  "var(--color-note-10)",
  "var(--color-note-11)",
];

const LEGACY_FLASHCARD_COLORS: Record<string, string> = {
  "bg-white": "var(--color-note-0)",
  "bg-card": "var(--color-note-0)",
  "bg-red-100": "var(--color-note-1)",
  "bg-orange-100": "var(--color-note-2)",
  "bg-amber-100": "var(--color-note-3)",
  "bg-green-100": "var(--color-note-4)",
  "bg-emerald-100": "var(--color-note-5)",
  "bg-teal-100": "var(--color-note-6)",
  "bg-cyan-100": "var(--color-note-7)",
  "bg-blue-100": "var(--color-note-8)",
  "bg-indigo-100": "var(--color-note-9)",
  "bg-violet-100": "var(--color-note-10)",
  "bg-purple-100": "var(--color-note-11)",
  "bg-pink-100": "var(--color-note-1)",
  "bg-rose-100": "var(--color-note-1)",
  "bg-red-200": "var(--color-note-1)",
  "bg-orange-200": "var(--color-note-2)",
  "bg-amber-200": "var(--color-note-3)",
  "bg-green-200": "var(--color-note-4)",
  "bg-emerald-200": "var(--color-note-5)",
  "bg-teal-200": "var(--color-note-6)",
  "bg-cyan-200": "var(--color-note-7)",
  "bg-blue-200": "var(--color-note-8)",
  "bg-indigo-200": "var(--color-note-9)",
  "bg-violet-200": "var(--color-note-10)",
  "bg-purple-200": "var(--color-note-11)",
  "bg-pink-200": "var(--color-note-1)",
  "bg-rose-200": "var(--color-note-1)",
};

function getFlashcardColor(color?: string) {
  if (!color || color === "bg-white" || color === "bg-card" || color === "var(--color-note-0)") return "var(--color-card)";
  if (color.startsWith("var(--")) return color;
  return LEGACY_FLASHCARD_COLORS[color] || color;
}

export function FlashcardsPage() {
  const location = useLocation();
  const isActiveRoute = location.pathname === "/flashcards";
  const [settings, setSettings] = useState<any>(null);
  const [categories, setCategories] = useState<FlashcardCategory[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "category" | "card";
    id: string;
  } | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 12;
  const observerTarget = useRef<HTMLDivElement>(null);

  useLockBodyScroll(isAddingCard || !!confirmDelete);

  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isFlagged, setIsFlagged] = useState(false);
  const [nextReviewDate, setNextReviewDate] = useState<string>("");
  const [repeatPattern, setRepeatPattern] = useState<
    "none" | "daily" | "weekly" | "monthly" | "custom"
  >("none");
  const [customDays, setCustomDays] = useState<number>(1);
  const [customRepeatDays, setCustomRepeatDays] = useState<number[]>([]);

  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const isToday = (dateString: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isTomorrow = (dateString: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear()
    );
  };

  useEffect(() => {
    loadSettings();
    loadCategories();
  }, []);

  const loadSettings = async () => {
    const s = await db.settings.get();
    setSettings(s);
  };

  const handleHideIntro = async () => {
    if (settings) {
      const updated = { ...settings, hideFlashcardsIntro: true };
      await db.settings.save(updated);
      setSettings(updated);
    }
  };

  useEffect(() => {
    setPage(1);
    setCards([]);
    setHasMore(true);
    loadCards(1, true);
  }, [activeCategoryId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          setPage((prev) => {
            const nextPage = prev + 1;
            loadCards(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoading, activeCategoryId]);

  const loadCategories = async () => {
    const cats = await db.flashcardCategories.getAll();
    setCategories(cats);
    if (cats.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(cats[0].id);
    }
  };

  const loadCards = async (pageNum: number, reset: boolean = false) => {
    if (pageNum === 1) setIsLoading(true);
    try {
      const result = await db.flashcards.getPaginated(pageNum, LIMIT, activeCategoryId);
      setCards(prev => reset ? result.cards : [...prev, ...result.cards]);
      setHasMore(result.cards.length === LIMIT && (pageNum * LIMIT) < result.total);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat: FlashcardCategory = {
      id: `fc_cat_${Date.now()}`,
      name: newCategoryName.trim(),
      createdAt: Date.now(),
    };
    await db.flashcardCategories.save(newCat);
    setNewCategoryName("");
    setIsAddingCategory(false);
    await loadCategories();
    setActiveCategoryId(newCat.id);
  };

  const handleDeleteCategory = async (id: string) => {
    const allCards = await db.flashcards.getAll();
    const cardsToDelete = allCards.filter((c) => c.categoryId === id);
    for (const card of cardsToDelete) {
      await db.flashcards.delete(card.id);
    }
    await db.flashcardCategories.delete(id);
    if (activeCategoryId === id) {
      setActiveCategoryId("all");
    }
    await loadCategories();
    await loadCards(1, true);
    setConfirmDelete(null);
  };

  const resetCardForm = () => {
    setFrontText("");
    setBackText("");
    setSelectedColor(COLORS[0]);
    setEditingCard(null);
    setIsAddingCard(false);
    setIsFlagged(false);
    setNextReviewDate("");
    setRepeatPattern("none");
    setCustomDays(1);
    setCustomRepeatDays([]);
  };

  const handleSaveCard = async () => {
    // Strip HTML tags to check if empty
    const stripHtml = (html: string) => {
      const tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
    };

    if (!stripHtml(frontText).trim() || !stripHtml(backText).trim()) return;

    const card: Flashcard = {
      id: editingCard ? editingCard.id : `fc_card_${Date.now()}`,
      categoryId: selectedCategoryId || "",
      front: frontText,
      back: backText,
      color: selectedColor,
      createdAt: editingCard ? editingCard.createdAt : Date.now(),
      isFlagged,
      nextReview: nextReviewDate
        ? new Date(nextReviewDate).getTime()
        : undefined,
      repeatPattern,
      customDays: repeatPattern === "custom" ? customDays : undefined,
      customRepeatDays: repeatPattern === "custom" ? customRepeatDays : undefined,
    };

    await db.flashcards.save(card);
    resetCardForm();
    loadCards(1, true);
  };

  const handleEditCard = (card: Flashcard) => {
    setEditingCard(card);
    setFrontText(card.front);
    setBackText(card.back);
    setSelectedColor(card.color);
    setSelectedCategoryId(card.categoryId);
    setIsFlagged(card.isFlagged || false);
    setNextReviewDate(
      card.nextReview
        ? new Date(card.nextReview).toISOString().slice(0, 16)
        : "",
    );
    setRepeatPattern(card.repeatPattern || "none");
    setCustomDays(card.customDays || 1);
    setCustomRepeatDays(card.customRepeatDays || []);
    setIsAddingCard(true);
  };

  const handleDeleteCard = async (id: string) => {
    await db.flashcards.delete(id);
    await loadCards(1, true);
    setConfirmDelete(null);
  };

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFlag = async (card: Flashcard, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedCard = { ...card, isFlagged: !card.isFlagged };
    await db.flashcards.save(updatedCard);
    setCards(cards.map(c => c.id === card.id ? updatedCard : c));
  };

  const filteredCards =
    activeCategoryId === "all"
      ? cards
      : activeCategoryId === "flagged"
        ? cards.filter((c) => c.isFlagged)
        : activeCategoryId === "uncategorized"
          ? cards.filter((c) => !c.categoryId)
          : cards.filter((c) => c.categoryId === activeCategoryId);

  const flaggedCount = cards.filter((c) => c.isFlagged).length;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] flex flex-col gap-4">
      {(settings && !settings.hideFlashcardsIntro) && (
        <div className="bg-card p-6 rounded-3xl border border-olive-200/50 shadow-sm relative group">
          <button
            onClick={handleHideIntro}
            className="absolute top-4 left-4 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all z-20"
            title="إخفاء هذا التعريف"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-olive-900 text-paper rounded-2xl shadow-md shadow-olive-900/20">
              <Copy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-olive-900">
                بطاقات الذاكرة
              </h1>
              <p className="text-sm text-olive-600 mt-1 leading-relaxed">
                استخدم نظام التكرار المتباعد لمراجعة محفوظاتك وتثبيت معلوماتك العلمية بفعالية.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-0 md:gap-4 bg-card rounded-3xl border border-olive-200/50 shadow-sm overflow-hidden flex-1">
        {/* Sidebar / Topbar for Categories */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-l border-olive-100 bg-olive-50/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-olive-100 flex justify-between items-center">
          <h2 className="font-serif font-bold text-lg text-olive-900">
            التصنيفات
          </h2>
          <button
            onClick={() => setIsAddingCategory(!isAddingCategory)}
            className="p-1.5 text-olive-600 hover:bg-olive-100 rounded-lg transition-colors"
          >
            <FolderPlus className="w-5 h-5" />
          </button>
        </div>

        {isAddingCategory && (
          <div className="p-3 border-b border-olive-100 bg-card">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="اسم التصنيف..."
                className="flex-1 bg-olive-50 border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-olive-200"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
              <button
                onClick={handleAddCategory}
                className="p-1.5 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto md:overflow-y-auto p-2 flex flex-row md:flex-col gap-2 md:gap-0 md:space-y-1 custom-scrollbar">
          <button
            onClick={() => setActiveCategoryId("all")}
            className={cn(
              "whitespace-nowrap md:w-full text-right px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              activeCategoryId === "all"
                ? "bg-olive-200 text-olive-900"
                : "text-olive-700 hover:bg-olive-100",
            )}
          >
            جميع البطاقات
          </button>

          <button
            onClick={() => setActiveCategoryId("flagged")}
            className={cn(
              "whitespace-nowrap md:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              activeCategoryId === "flagged"
                ? "bg-amber-100 text-amber-900"
                : "text-olive-700 hover:bg-olive-100",
            )}
          >
            <div className="flex items-center gap-2">
              <Flag
                className={cn(
                  "w-4 h-4",
                  activeCategoryId === "flagged"
                    ? "text-amber-600"
                    : "text-olive-400",
                )}
              />
              <span>مراجعة عاجلة</span>
            </div>
            {flaggedCount > 0 && (
              <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {flaggedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveCategoryId("uncategorized")}
            className={cn(
              "whitespace-nowrap md:w-full text-right px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              activeCategoryId === "uncategorized"
                ? "bg-olive-200 text-olive-900"
                : "text-olive-700 hover:bg-olive-100",
            )}
          >
            بدون تصنيف
          </button>

          <div className="hidden md:block h-px bg-olive-100 my-2" />
          <div className="md:hidden w-px bg-olive-100 mx-1" />

          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center group shrink-0">
              <button
                onClick={() => setActiveCategoryId(cat.id)}
                className={cn(
                  "whitespace-nowrap flex-1 text-right px-3 py-2 rounded-r-xl text-sm font-medium transition-colors truncate",
                  activeCategoryId === cat.id
                    ? "bg-olive-200 text-olive-900"
                    : "text-olive-700 hover:bg-olive-100",
                )}
              >
                {cat.name}
              </button>
              <button
                onClick={() =>
                  setConfirmDelete({ type: "category", id: cat.id })
                }
                className={cn(
                  "p-2 rounded-l-xl transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100",
                  activeCategoryId === cat.id
                    ? "bg-olive-200 text-red-600 hover:bg-red-100"
                    : "hover:bg-red-50 text-red-500",
                )}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="p-4 md:p-6 border-b border-olive-100 flex justify-between items-center bg-card z-10">
          <h1 className="text-2xl font-serif font-bold text-olive-900">
            {activeCategoryId === "all"
              ? "جميع البطاقات"
              : activeCategoryId === "flagged"
                ? "مراجعة عاجلة"
                : activeCategoryId === "uncategorized"
                  ? "بدون تصنيف"
                  : categories.find((c) => c.id === activeCategoryId)?.name}
          </h1>
          <button
            onClick={() => {
              setIsAddingCard(true);
              if (
                activeCategoryId !== "all" &&
                activeCategoryId !== "flagged" &&
                activeCategoryId !== "uncategorized"
              ) {
                setSelectedCategoryId(activeCategoryId);
              } else {
                setSelectedCategoryId("");
              }
            }}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-olive-900 text-paper rounded-xl hover:bg-olive-800 transition-all duration-200 font-bold shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة بطاقة</span>
          </button>
        </div>

        {/* FAB for Mobile */}
        {isActiveRoute && (
          <button
            onClick={() => {
              setIsAddingCard(true);
              if (
                activeCategoryId !== "all" &&
                activeCategoryId !== "flagged" &&
                activeCategoryId !== "uncategorized"
              ) {
                setSelectedCategoryId(activeCategoryId);
              } else {
                setSelectedCategoryId("");
              }
            }}
            className="lg:hidden fixed bottom-24 left-6 w-14 h-14 bg-olive-900 text-paper rounded-full shadow-lg shadow-olive-900/20 flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-all"
          >
            <Copy className="w-6 h-6" />
          </button>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-olive-50/10">
          {isLoading && page === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-72 w-full rounded-3xl" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-olive-400">
              <div className="w-24 h-32 border-2 border-dashed border-olive-300 rounded-xl mb-4 flex items-center justify-center">
                <Plus className="w-8 h-8 text-olive-300" />
              </div>
              <p>لا توجد بطاقات هنا. أضف بطاقة جديدة للبدء!</p>
            </div>
          ) : (
            <div className="space-y-6">
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {cards.map((card) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -20 }}
                      transition={{ duration: 0.3 }}
                      key={card.id}
                      className="relative group perspective-1000 h-72"
                    >
                      <div className="absolute top-3 left-3 z-20 flex gap-1.5 opacity-100 transition-all duration-300">
                        <button
                          onClick={(e) => toggleFlag(card, e)}
                          className={cn(
                            "p-2 bg-card/90 backdrop-blur-md rounded-xl shadow-sm transition-all hover:scale-105",
                            card.isFlagged
                              ? "text-amber-500 hover:text-amber-600"
                              : "text-olive-400 hover:text-amber-500",
                          )}
                          title={
                            card.isFlagged ? "إزالة العلامة" : "تحديد للمراجعة"
                          }
                          aria-label={
                            card.isFlagged ? "إزالة العلامة" : "تحديد للمراجعة"
                          }
                        >
                          <Flag
                            className="w-4 h-4"
                            fill={card.isFlagged ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCard(card);
                          }}
                          className="p-2 bg-card/90 backdrop-blur-md text-olive-600 hover:text-olive-900 rounded-xl shadow-sm transition-all hover:scale-105"
                          title="تعديل"
                          aria-label="تعديل البطاقة"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ type: "card", id: card.id });
                          }}
                          className="p-2 bg-card/90 backdrop-blur-md text-red-500 hover:text-red-700 rounded-xl shadow-sm transition-all hover:scale-105"
                          title="حذف"
                          aria-label="حذف البطاقة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {card.isFlagged && (
                        <div className="absolute top-4 right-4 z-20">
                          <Flag
                            className="w-5 h-5 text-amber-500 drop-shadow-md"
                            fill="currentColor"
                          />
                        </div>
                      )}

                      <motion.div
                        className="w-full h-full cursor-pointer preserve-3d group-hover:-translate-y-1 transition-transform duration-300"
                        animate={{ rotateY: flippedCards[card.id] ? 180 : 0 }}
                        transition={{
                          duration: 0.6,
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                        }}
                        onClick={() => toggleFlip(card.id)}
                      >
                        {/* Front */}
                        <div
                          className={cn(
                            "absolute w-full h-full backface-hidden rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-olive-200/60 p-8 flex flex-col items-center justify-center text-center overflow-y-auto custom-scrollbar transition-all duration-300 group-hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] note-text-black"
                          )}
                          style={{ backgroundColor: getFlashcardColor(card.color) }}
                        >
                          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-olive-300 to-transparent opacity-40"></div>

                          {!card.isFlagged && (
                            <span className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-bold text-olive-600 bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-olive-200/50">
                              <BookOpen className="w-3.5 h-3.5" /> الوجه
                            </span>
                          )}

                          <div className="flex-1 w-full flex items-center justify-center my-6">
                            <div
                              className="prose prose-sm sm:prose-base text-olive-900 max-w-none w-full break-words"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(card.front) }}
                            />
                          </div>

                          <div className="absolute bottom-5 inset-x-0 flex justify-center opacity-30 group-hover:opacity-60 transition-opacity">
                            <div className="w-16 h-1.5 rounded-full bg-olive-400"></div>
                          </div>
                        </div>

                        {/* Back */}
                        <div
                          className={cn(
                            "absolute w-full h-full backface-hidden rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-olive-200/60 p-8 flex flex-col items-center justify-center text-center rotate-y-180 overflow-y-auto custom-scrollbar transition-all duration-300 group-hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] note-text-black"
                          )}
                          style={{ backgroundColor: getFlashcardColor(card.color) }}
                        >
                          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-olive-300 to-transparent opacity-40"></div>

                          {!card.isFlagged && (
                            <span className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-bold text-olive-600 bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-olive-200/50">
                              <Lightbulb className="w-3.5 h-3.5" /> الظهر
                            </span>
                          )}

                          <div className="flex-1 w-full flex items-center justify-center my-6">
                            <div
                              className="prose prose-sm sm:prose-base text-olive-900 max-w-none w-full break-words"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(card.back) }}
                            />
                          </div>

                          <div className="absolute bottom-5 inset-x-0 flex justify-center opacity-30 group-hover:opacity-60 transition-opacity">
                            <div className="w-16 h-1.5 rounded-full bg-olive-400"></div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Infinite Scroll Observer Target */}
              {hasMore && (
                <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
                  {!isLoading && <div className="w-6 h-6 border-2 border-olive-900 border-t-transparent rounded-full animate-spin"></div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAddingCard && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-olive-900/40 backdrop-blur-sm">
          <div className="bg-card w-full md:max-w-3xl h-[95vh] md:h-auto md:max-h-[90vh] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mt-3 mb-1 md:hidden" />
            <div className="p-4 md:p-6 border-b border-olive-100 flex justify-between items-center bg-olive-50/50">
              <h2 className="text-xl font-serif font-bold text-olive-900">
                {editingCard ? "تعديل البطاقة" : "إضافة بطاقة جديدة"}
              </h2>
              <button
                onClick={resetCardForm}
                className="p-2 text-olive-400 hover:text-olive-600 hover:bg-olive-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-sm font-medium text-olive-700 mb-2">
                  التصنيف
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full bg-olive-50 border-none rounded-xl px-4 py-3 text-olive-900 focus:ring-2 focus:ring-olive-200"
                >
                  <option value="">بدون تصنيف</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-olive-700 mb-2">
                    الوجه (السؤال / المصطلح)
                  </label>
                  <RichTextEditor
                    content={frontText}
                    onChange={setFrontText}
                    className="h-48"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-olive-700 mb-2">
                    الظهر (الإجابة / التعريف)
                  </label>
                  <RichTextEditor
                    content={backText}
                    onChange={setBackText}
                    className="h-48"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-olive-700 mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    لون البطاقة
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          selectedColor === color
                            ? "border-olive-900 scale-110 shadow-sm"
                            : "border-transparent hover:scale-105",
                        )}
                        style={{ backgroundColor: getFlashcardColor(color) }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3 bg-olive-50 px-4 py-3 rounded-xl border border-olive-100 flex-1 w-full">
                    <button
                      onClick={() => setIsFlagged(!isFlagged)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isFlagged
                          ? "bg-amber-100 text-amber-600"
                          : "bg-card text-olive-400 hover:text-amber-500",
                      )}
                    >
                      <Flag
                        className="w-5 h-5"
                        fill={isFlagged ? "currentColor" : "none"}
                      />
                    </button>
                    <div className="text-sm">
                      <p className="font-medium text-olive-900">
                        مراجعة عاجلة
                      </p>
                      <p className="text-olive-500 text-xs">
                        تحديد البطاقة للمراجعة لاحقاً
                      </p>
                    </div>
                  </div>


                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-olive-700 mb-2 flex items-center gap-2">
                        <CalendarClock className="w-4 h-4" />
                        موعد المراجعة
                      </label>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => {
                            const d = new Date();
                            d.setHours(23, 59, 0, 0);
                            setNextReviewDate(d.toISOString().slice(0, 16));
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm border transition-colors",
                            isToday(nextReviewDate)
                              ? "bg-olive-900 text-white border-olive-900"
                              : "bg-white text-olive-700 border-olive-200 hover:bg-olive-50",
                          )}
                        >
                          اليوم
                        </button>
                        <button
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            d.setHours(23, 59, 0, 0);
                            setNextReviewDate(d.toISOString().slice(0, 16));
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm border transition-colors",
                            isTomorrow(nextReviewDate)
                              ? "bg-olive-900 text-white border-olive-900"
                              : "bg-white text-olive-700 border-olive-200 hover:bg-olive-50",
                          )}
                        >
                          غداً
                        </button>
                        <div className="relative">
                          <DatePicker
                            value={nextReviewDate}
                            onChange={setNextReviewDate}
                            className={cn(
                              "p-1.5 rounded-full border transition-colors flex items-center justify-center",
                              !isToday(nextReviewDate) &&
                                !isTomorrow(nextReviewDate) &&
                                nextReviewDate
                                ? "bg-olive-900 text-white border-olive-900"
                                : "bg-card text-olive-700 border-olive-200 hover:bg-olive-50",
                            )}
                          />
                        </div>

                        <div className="flex-1"></div>

                        <div className="relative group">
                          <select
                            value={repeatPattern}
                            onChange={(e) =>
                              setRepeatPattern(e.target.value as any)
                            }
                            className="appearance-none bg-card border border-olive-200 text-olive-700 text-sm rounded-full px-3 py-1.5 pl-8 focus:outline-none focus:ring-2 focus:ring-olive-200 cursor-pointer"
                          >
                            <option value="none">بدون تكرار</option>
                            <option value="daily">يومياً</option>
                            <option value="weekly">أسبوعياً</option>
                            <option value="monthly">شهرياً</option>
                            <option value="custom">مخصص...</option>
                          </select>
                          <Repeat className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-olive-400 pointer-events-none" />
                        </div>
                      </div>

                      {repeatPattern === "custom" && (
                        <div className="flex flex-col gap-2 mt-2 bg-olive-50 p-2 rounded-lg border border-olive-100">
                          <div className="flex justify-between gap-1">
                            {[
                              { id: 0, label: "ح" },
                              { id: 1, label: "ن" },
                              { id: 2, label: "ث" },
                              { id: 3, label: "ر" },
                              { id: 4, label: "خ" },
                              { id: 5, label: "ج" },
                              { id: 6, label: "س" },
                            ].map((day) => {
                              const isSelected = customRepeatDays.includes(day.id);
                              return (
                                <button
                                  key={day.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setCustomRepeatDays(customRepeatDays.filter((d) => d !== day.id));
                                    } else {
                                      setCustomRepeatDays([...customRepeatDays, day.id]);
                                    }
                                  }}
                                  className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                                    isSelected
                                      ? "bg-olive-900 text-paper"
                                      : "bg-transparent text-olive-500 hover:bg-olive-200",
                                  )}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-olive-100 bg-olive-50/50 flex flex-col-reverse md:flex-row justify-end gap-3 pb-safe">
                <button
                  onClick={resetCardForm}
                  className="w-full md:w-auto px-6 py-3 md:py-2.5 text-olive-600 font-medium hover:bg-olive-100 rounded-xl transition-all duration-200 active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveCard}
                  disabled={!frontText.trim() || !backText.trim()}
                  className="w-full md:w-auto px-6 py-3 md:py-2.5 bg-olive-900 text-paper font-bold rounded-xl hover:bg-olive-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95"
                >
                  حفظ البطاقة
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-olive-900 mb-2">
                تأكيد الحذف
              </h3>
              <p className="text-olive-600 mb-6">
                {confirmDelete.type === "category"
                  ? "هل أنت متأكد من حذف هذا التصنيف وجميع البطاقات بداخله؟ لا يمكن التراجع عن هذا الإجراء."
                  : "هل أنت متأكد من حذف هذه البطاقة؟"}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 bg-olive-50 text-olive-700 font-bold rounded-xl hover:bg-olive-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() =>
                    confirmDelete.type === "category"
                      ? handleDeleteCategory(confirmDelete.id)
                      : handleDeleteCard(confirmDelete.id)
                  }
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                >
                  حذف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
}

import React, { useState, useEffect, useRef, memo } from "react";
import { Search, Plus, BookMarked, Trash2, X, Save, Tag } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { db, DictionaryTerm } from "@/src/lib/db";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useMobileBackHandler } from "../hooks/useMobileBackHandler";
import { Skeleton } from "../components/Skeleton";

const DEFAULT_CATEGORIES = [
  "أصول الفقه",
  "اللغة",
  "المنطق",
  "العقيدة",
  "الحديث",
  "عام",
];

export function DictionaryPage() {
  const [settings, setSettings] = useState<any>(null);
  const [terms, setTerms] = useState<DictionaryTerm[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "term" | "category";
    id: string;
    name?: string;
  } | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;
  const observerTarget = useRef<HTMLDivElement>(null);

  useLockBodyScroll(isAdding || !!confirmDelete);
  
  useMobileBackHandler(isAdding, () => setIsAdding(false));
  useMobileBackHandler(!!confirmDelete, () => setConfirmDelete(null));

  // Form state
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newCategory, setNewCategory] = useState(DEFAULT_CATEGORIES[0]);

  useEffect(() => {
    loadSettings();
    setPage(1);
    setTerms([]);
    setHasMore(true);
    loadTerms(1, true);
  }, [searchQuery, activeCategory]);

  const loadSettings = async () => {
    const s = await db.settings.get();
    setSettings(s);
  };

  const handleHideIntro = async () => {
    if (settings) {
      const updated = { ...settings, hideDictionaryIntro: true };
      await db.settings.save(updated);
      setSettings(updated);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          setPage((prev) => {
            const nextPage = prev + 1;
            loadTerms(nextPage);
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
  }, [hasMore, isLoading, searchQuery, activeCategory]);

  const loadTerms = async (pageNum: number, reset: boolean = false) => {
    if (pageNum === 1) setIsLoading(true);
    try {
      const result = await db.dictionary.getPaginated(pageNum, LIMIT, searchQuery, activeCategory);
      setTerms(prev => reset ? result.terms : [...prev, ...result.terms]);
      setHasMore(result.terms.length === LIMIT && (pageNum * LIMIT) < result.total);

      const uniqueCategories = Array.from(
        new Set([...DEFAULT_CATEGORIES, ...result.allCategories]),
      );
      setCategories(uniqueCategories);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newTerm.trim() || !newDefinition.trim()) return;

    const term: DictionaryTerm = {
      id: `dict_${Date.now()}`,
      term: newTerm.trim(),
      definition: newDefinition.trim(),
      category: newCategory,
      date: Date.now(),
    };

    await db.dictionary.save(term);

    // Reset form
    setNewTerm("");
    setNewDefinition("");
    setNewCategory(categories[0] || DEFAULT_CATEGORIES[0]);
    setIsCustomCategory(false);
    setIsAdding(false);

    loadTerms(1, true);
  };

  const handleDelete = async (id: string) => {
    await db.dictionary.delete(id);
    await loadTerms(1, true);
    setConfirmDelete(null);
  };

  const handleDeleteCategory = async (categoryName: string) => {
    const allTerms = await db.dictionary.getAll();
    const termsToDelete = allTerms.filter((t) => t.category === categoryName);
    for (const term of termsToDelete) {
      await db.dictionary.delete(term.id);
    }
    await loadTerms(1, true);
    if (activeCategory === categoryName) {
      setActiveCategory(null);
    }
    setConfirmDelete(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8">
      {/* Header & Search */}
      {(settings && !settings.hideDictionaryIntro) && (
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
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-olive-900">
                المعجم الشخصي
              </h1>
              <p className="text-sm text-olive-600 mt-1 leading-relaxed">
                قيد مصطلحات العلم الغريبة واجعلها في متناول يدك لسهولة المراجعة والبحث.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FAB for Mobile */}
      <button
        onClick={() => setIsAdding(true)}
        className="lg:hidden fixed bottom-24 left-6 w-14 h-14 bg-olive-900 text-paper rounded-full shadow-lg shadow-olive-900/20 flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Term Form (Modal) */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end lg:items-center justify-center lg:p-4 backdrop-blur-sm">
          <div className="bg-card w-full lg:max-w-2xl h-[90vh] lg:h-auto lg:max-h-[90vh] rounded-t-[2rem] lg:rounded-[2rem] border border-olive-200/50 shadow-2xl flex flex-col animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-8 duration-300">
            <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mt-3 mb-1 lg:hidden" />
            <div className="flex justify-between items-center p-6 border-b border-olive-100/50">
              <h2 className="font-serif text-2xl font-bold text-olive-900">
                مصطلح جديد
              </h2>
              <button
                onClick={() => setIsAdding(false)}
                className="p-2.5 text-olive-400 hover:text-olive-900 hover:bg-olive-50 rounded-xl transition-all duration-200 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 lg:p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-olive-700 px-1">
                    المصطلح
                  </label>
                  <input
                    type="text"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="مثال: الاستصحاب، العلة، السبر والتقسيم..."
                    className="w-full font-serif text-lg bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-olive-700 px-1">
                    التصنيف
                  </label>
                  {isCustomCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="اكتب التصنيف الجديد..."
                        className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setNewCategory(categories[0]);
                        }}
                        className="px-5 bg-olive-100/50 text-olive-700 rounded-xl hover:bg-olive-200/50 transition-colors font-bold text-sm border border-olive-200/50"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <select
                      value={newCategory}
                      onChange={(e) => {
                        if (e.target.value === "NEW_CATEGORY") {
                          setIsCustomCategory(true);
                          setNewCategory("");
                        } else {
                          setNewCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm appearance-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option
                        value="NEW_CATEGORY"
                        className="font-bold text-olive-900 bg-olive-100"
                      >
                        + إضافة تصنيف جديد...
                      </option>
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-olive-700 px-1">
                  التعريف / المعنى
                </label>
                <textarea
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  rows={4}
                  className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm resize-none leading-relaxed font-medium"
                  placeholder="اكتب المعنى بأسلوبك ليسهل عليك تذكره..."
                ></textarea>
              </div>

              <div className="flex justify-end pt-6 pb-safe">
                <button
                  onClick={handleSave}
                  disabled={!newTerm.trim() || !newDefinition.trim()}
                  className="w-full lg:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-olive-900 text-paper rounded-xl hover:bg-olive-800 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                >
                  <Save className="w-5 h-5" />
                  <span>حفظ المصطلح</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="relative w-full lg:w-1/2">
            <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-olive-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المعجم..."
              className="w-full bg-card border border-olive-200/50 rounded-2xl py-3 pr-12 pl-4 focus:outline-none focus:ring-2 focus:ring-olive-900/20 transition-all shadow-sm"
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="hidden lg:flex items-center justify-center gap-2 px-6 py-3 bg-olive-900 text-paper rounded-xl hover:bg-olive-800 transition-all duration-300 font-bold shadow-md shadow-olive-900/10 hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة مصطلح</span>
          </button>
        </div>
        
        {/* Categories Scrollable Bar */}
        <div className="relative w-full overflow-hidden">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-3 pt-1 px-1 snap-x">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border shrink-0 snap-start",
                activeCategory === null
                  ? "bg-olive-900 text-paper border-olive-900 shadow-md shadow-olive-900/20"
                  : "bg-card text-olive-600 border-olive-200/50 hover:bg-olive-50 hover:border-olive-300",
              )}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <div key={cat} className="relative group shrink-0 snap-start">
                <button
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border",
                    !DEFAULT_CATEGORIES.includes(cat) ? "pr-5 pl-10" : "px-5",
                    activeCategory === cat
                      ? "bg-olive-900 text-paper border-olive-900 shadow-md shadow-olive-900/20"
                      : "bg-card text-olive-600 border-olive-200/50 hover:bg-olive-50 hover:border-olive-300",
                  )}
                >
                  {cat}
                </button>
                {!DEFAULT_CATEGORIES.includes(cat) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete({ type: "category", id: cat, name: cat });
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="حذف التصنيف"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Terms List */}
      {isLoading && page === 1 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-[1.5rem]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {terms.length === 0 ? (
            <div className="col-span-full text-center py-16 text-olive-400 bg-card rounded-3xl border border-olive-100 border-dashed">
              <BookMarked className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">لا توجد مصطلحات مطابقة للبحث.</p>
            </div>
          ) : (
            terms.map((term) => (
              <TermCard key={term.id} term={term} onDelete={() => setConfirmDelete({ type: "term", id: term.id, name: term.term })} />
            ))
          )}
        </div>
      )}

      {/* Infinite Scroll Observer Target */}
      {hasMore && (
        <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
          {!isLoading && <div className="w-6 h-6 border-2 border-olive-900 border-t-transparent rounded-full animate-spin"></div>}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-olive-900 mb-2">
              تأكيد الحذف
            </h3>
            <p className="text-olive-600 mb-6">
              {confirmDelete.type === "category"
                ? `هل أنت متأكد من حذف تصنيف "${confirmDelete.name}" وجميع المصطلحات بداخله؟`
                : `هل أنت متأكد من حذف مصطلح "${confirmDelete.name}"؟`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-olive-50 text-olive-700 font-bold rounded-xl hover:bg-olive-100 transition-all duration-200 active:scale-95"
              >
                إلغاء
              </button>
              <button
                onClick={() =>
                  confirmDelete.type === "category"
                    ? handleDeleteCategory(confirmDelete.id)
                    : handleDelete(confirmDelete.id)
                }
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all duration-200 active:scale-95"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TermCard = memo(function TermCard({ term, onDelete }: { term: DictionaryTerm, onDelete: () => void }) {
  return (
    <div
      className="optimize-gpu bg-card p-6 rounded-[1.5rem] border border-olive-200/40 shadow-sm hover:shadow-lg hover:shadow-olive-900/5 transition-all duration-300 group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-2 h-full bg-olive-200/30 group-hover:bg-olive-400/50 transition-colors duration-300"></div>
      <div className="flex justify-between items-start mb-4 pl-2">
        <h3 className="font-serif text-xl lg:text-2xl font-bold text-olive-900 group-hover:text-olive-700 transition-colors">
          {term.term}
        </h3>
        <button
          onClick={onDelete}
          className="p-2 text-olive-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-95"
          title="حذف"
          aria-label="حذف المصطلح"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <p className="text-olive-800 leading-relaxed mb-6 text-sm lg:text-base pl-2">
        {term.definition}
      </p>
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-olive-100/50 pl-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-olive-50 text-olive-700 text-xs font-bold border border-olive-100/50 group-hover:bg-olive-100 transition-colors">
          <Tag className="w-3.5 h-3.5" />
          {term.category}
        </span>
        <span className="text-[11px] text-olive-400 font-medium">
          {new Date(term.date).toLocaleDateString("ar-EG")}
        </span>
      </div>
    </div>
  );
});

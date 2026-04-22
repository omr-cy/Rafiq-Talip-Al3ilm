import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  CheckSquare,
  PenTool,
  Image as ImageIcon,
  Palette,
  Tag,
  X,
  Plus,
  Book,
  FileText,
  Lightbulb,
  Trash2,
  Search,
  Check,
  Settings,
  GripVertical,
  Edit2,
  Mic,
  BookOpen,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { db, Note, CustomTemplate } from "@/src/lib/db";
import Masonry from "react-masonry-css";
import SignatureCanvas from "react-signature-canvas";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { RichTextEditor } from "../components/RichTextEditor";
import { useNotification } from "../components/NotificationProvider";
import DOMPurify from "dompurify";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useMobileBackHandler } from "../hooks/useMobileBackHandler";
import { Skeleton } from "../components/Skeleton";
import { AudioRecorder } from "../components/AudioRecorder";
import { CustomAudioPlayer } from "../components/CustomAudioPlayer";

const NOTE_COLORS = [
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

const LEGACY_COLORS: Record<string, string> = {
  "#FFFFFF": "var(--color-note-0)",
  "#F28B82": "var(--color-note-1)",
  "#FBBC04": "var(--color-note-2)",
  "#FFF475": "var(--color-note-3)",
  "#CCFF90": "var(--color-note-4)",
  "#A7FFEB": "var(--color-note-5)",
  "#CBF0F8": "var(--color-note-6)",
  "#AECBFA": "var(--color-note-7)",
  "#D7AEFB": "var(--color-note-8)",
  "#FDCFE8": "var(--color-note-9)",
  "#E6C9A8": "var(--color-note-10)",
  "#E8EAED": "var(--color-note-11)",
};

export function getNoteColor(color?: string) {
  if (!color || color === "#FFFFFF" || color === "var(--color-note-0)") return "var(--color-card)";
  return LEGACY_COLORS[color.toUpperCase()] || color;
}

export function NotesPage() {
  const location = useLocation();
  const isActiveRoute = location.pathname === "/notes";
  const [settings, setSettings] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useLockBodyScroll(!!editingNote || showTemplateManager);
  
  useMobileBackHandler(!!editingNote, () => setEditingNote(null));
  useMobileBackHandler(showTemplateManager, () => setShowTemplateManager(false));

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
    setPage(1);
    setNotes([]);
    setHasMore(true);
    loadData(1, true);
  }, [searchQuery, selectedCategory]);

  const loadSettings = async () => {
    const s = await db.settings.get();
    setSettings(s);
  };

  const handleHideIntro = async () => {
    if (settings) {
      const updated = { ...settings, hideNotesIntro: true };
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
            loadData(nextPage);
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
  }, [hasMore, isLoading, searchQuery, selectedCategory]);

  const loadData = async (pageNum: number, reset: boolean = false) => {
    if (pageNum === 1) setIsLoading(true);
    try {
      const result = await db.notes.getPaginated(pageNum, LIMIT, searchQuery, selectedCategory);
      setNotes(prev => reset ? result.notes : [...prev, ...result.notes]);
      setAllCategories(result.allCategories);
      setHasMore(result.notes.length === LIMIT && (pageNum * LIMIT) < result.total);
      
      if (pageNum === 1) {
        const loadedTemplates = await db.customTemplates.getAll();
        setCustomTemplates(loadedTemplates);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const { addNotification } = useNotification();

  const handleSave = async (note: Note) => {
    // Optimistic update
    setNotes((prev) => {
      const exists = prev.find((n) => n.id === note.id);
      if (exists) {
        return prev.map((n) => (n.id === note.id ? note : n));
      }
      return [note, ...prev];
    });
    
    try {
      await db.notes.save(note);
      // Re-load categories in case a new one was added
      const result = await db.notes.getPaginated(1, LIMIT, searchQuery, selectedCategory);
      setAllCategories(result.allCategories);
    } catch (error: any) {
      // Revert optimistic update on failure
      loadData(1, true);
      addNotification({
        title: "خطأ في الحفظ",
        message: error.message,
        type: "warning"
      });
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setEditingNote(null);
    
    await db.notes.delete(id);
    // Re-load categories in case one was removed
    const result = await db.notes.getPaginated(1, LIMIT, searchQuery, selectedCategory);
    setAllCategories(result.allCategories);
  };

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto min-h-[calc(100vh-6rem)] lg:min-h-[calc(100vh-4rem)] flex flex-col gap-8"
    >
      {/* Header Intro */}
      {(settings && !settings.hideNotesIntro) && (
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
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-olive-900">
                كنوز الفوائد
              </h1>
              <p className="text-sm text-olive-600 mt-1 leading-relaxed">
                دون فوائدك، فرائدك، وما يفتح الله به عليك من درر العلم في قوالب منظمة تليق بطالب العلم.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Template Manager */}
      <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
        <div className="flex gap-4 w-full">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-olive-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في ملاحظاتك..."
              className="w-full bg-card border border-olive-200/50 rounded-2xl py-3 pr-12 pl-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-olive-900/20 transition-all"
            />
          </div>
          <button
            onClick={() => setShowTemplateManager(true)}
            className="p-3 bg-card border border-olive-200/50 rounded-2xl text-olive-600 hover:bg-olive-50 transition-colors shadow-sm hover:shadow-md"
            title="إدارة القوالب"
          >
            <Palette className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Filter */}
        {allCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 w-full hide-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                selectedCategory === null
                  ? "bg-olive-900 text-paper shadow-md"
                  : "bg-olive-100 text-olive-700 hover:bg-olive-200"
              )}
            >
              الكل
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                  selectedCategory === cat
                    ? "bg-olive-900 text-paper shadow-md"
                    : "bg-olive-100 text-olive-700 hover:bg-olive-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Note Area (Desktop) */}
      <div className="hidden lg:block w-full max-w-2xl mx-auto">
        <CreateNoteArea onSave={handleSave} customTemplates={customTemplates} />
      </div>

      {/* FAB for Mobile */}
      {isActiveRoute && (
        <button
          onClick={() =>
            setEditingNote({
              id: `note_${Date.now()}`,
              title: "",
              type: "general",
              date: Date.now(),
              content: { text: "" },
              color: "#FFFFFF",
              isChecklist: false,
              checklistItems: [],
              images: [],
              drawings: [],
              labels: [],
            })
          }
          className="lg:hidden fixed bottom-24 left-6 w-14 h-14 bg-olive-900 text-paper rounded-full shadow-lg shadow-olive-900/20 flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex w-auto -ml-4"
          columnClassName="pl-4 bg-clip-padding"
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="mb-4">
              <Skeleton className="w-full h-48 rounded-[2rem]" />
            </div>
          ))}
        </Masonry>
      ) : notes.length > 0 ? (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex w-auto -ml-4"
          columnClassName="pl-4 bg-clip-padding"
        >
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (index % 20) * 0.05 }}
              className="mb-4"
            >
              <NoteCard
                note={note}
                onClick={() => setEditingNote(note)}
                customTemplates={customTemplates}
              />
            </motion.div>
          ))}
        </Masonry>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-olive-500">
          <BookOpen className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-bold">لا توجد ملاحظات</p>
        </div>
      )}

      {/* Infinite Scroll Observer Target */}
      {hasMore && (
        <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
          {!isLoading && <div className="w-6 h-6 border-2 border-olive-900 border-t-transparent rounded-full animate-spin"></div>}
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end lg:items-center justify-center lg:p-4 backdrop-blur-sm">
          <div
            className="bg-card w-full lg:max-w-2xl h-[90vh] lg:h-auto lg:max-h-[90vh] rounded-t-[2rem] lg:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col border border-olive-200/50"
            style={{ backgroundColor: getNoteColor(editingNote.color) }}
          >
            <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mt-3 mb-1 lg:hidden" />
            <div className="flex-1 overflow-y-auto">
              <NoteEditor
                note={editingNote}
                onChange={setEditingNote}
                isExpanded={true}
                customTemplates={customTemplates}
              />
            </div>
            <div className="p-4 border-t border-black/5 flex justify-between items-center bg-black/5 pb-safe">
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(editingNote.id)}
                  className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 active:scale-95"
                  title="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => {
                  handleSave(editingNote);
                  setEditingNote(null);
                }}
                className="px-6 py-2.5 bg-olive-900 text-paper rounded-xl hover:bg-olive-800 transition-all duration-200 font-bold shadow-sm active:scale-95"
              >
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <TemplateManager
          templates={customTemplates}
          onClose={() => setShowTemplateManager(false)}
          onUpdate={() => loadData(1, true)}
        />
      )}
    </motion.div>
  );
}

function CreateNoteArea({
  onSave,
  customTemplates,
}: {
  onSave: (note: Note) => void;
  customTemplates: CustomTemplate[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [note, setNote] = useState<Note>({
    id: "",
    title: "",
    type: "general",
    date: Date.now(),
    content: { text: "" },
    color: "#FFFFFF",
    isChecklist: false,
    checklistItems: [],
    images: [],
    drawings: [],
    labels: [],
  });

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        if (isExpanded) {
          saveAndClose();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded, note]);

  const saveAndClose = () => {
    const hasContent =
      note.title.trim() ||
      (note.content?.text && note.content.text.trim()) ||
      (note.checklistItems && note.checklistItems.length > 0) ||
      (note.images && note.images.length > 0) ||
      (note.drawings && note.drawings.length > 0) ||
      note.type !== "general" ||
      Object.keys(note.content).length > 1; // has template fields

    if (hasContent) {
      onSave({ ...note, id: Date.now().toString(), date: Date.now() });
    }

    setNote({
      id: "",
      title: "",
      type: "general",
      date: Date.now(),
      content: { text: "" },
      color: "#FFFFFF",
      isChecklist: false,
      checklistItems: [],
      images: [],
      drawings: [],
      labels: [],
    });
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <div
        className="bg-card rounded-[2rem] shadow-sm border border-olive-200/40 p-4 flex items-center justify-between cursor-text hover:shadow-md hover:border-olive-300 transition-all duration-300"
        onClick={() => setIsExpanded(true)}
      >
        <span className="text-olive-600/70 font-medium px-4">
          اكتب ملاحظة...
        </span>
        <div className="flex gap-2">
          <button
            className="p-2.5 text-olive-600 hover:bg-olive-50 hover:text-olive-900 rounded-xl transition-all duration-200 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              setNote({ ...note, isChecklist: true });
              setIsExpanded(true);
            }}
            title="قائمة مهام"
          >
            <CheckSquare className="w-5 h-5" />
          </button>
          <button
            className="p-2.5 text-olive-600 hover:bg-olive-50 hover:text-olive-900 rounded-xl transition-all duration-200 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true); /* Drawing handled inside */
            }}
            title="رسم"
          >
            <PenTool className="w-5 h-5" />
          </button>
          <button
            className="p-2.5 text-olive-600 hover:bg-olive-50 hover:text-olive-900 rounded-xl transition-all duration-200 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true); /* Image handled inside */
            }}
            title="صورة"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="bg-card rounded-[2rem] shadow-xl border border-olive-200/50 overflow-hidden transition-all duration-300 note-text-black"
      style={{ backgroundColor: getNoteColor(note.color) }}
    >
      <NoteEditor
        note={note}
        onChange={setNote}
        isExpanded={true}
        customTemplates={customTemplates}
      />
      <div className="p-4 flex justify-between items-center border-t border-black/5 bg-black/[0.02]">
        <div className="flex gap-1">{/* Toolbar is inside NoteEditor */}</div>
        <button
          onClick={saveAndClose}
          className="px-6 py-2 bg-olive-900 text-paper font-bold hover:bg-olive-800 rounded-xl transition-all duration-200 shadow-sm active:scale-95"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

function BlobImage({ src, alt, className }: { src: string | Blob; alt?: string; className?: string }) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (src instanceof Blob) {
      const objectUrl = URL.createObjectURL(src);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof src === "string") {
      setUrl(src);
    }
  }, [src]);

  if (!url) return null;

  return <img src={url} alt={alt} className={className} />;
}

function NoteEditor({
  note,
  onChange,
  isExpanded,
  customTemplates,
}: {
  note: Note;
  onChange: (n: Note) => void;
  isExpanded: boolean;
  customTemplates: CustomTemplate[];
}) {
  const [showPalette, setShowPalette] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  const updateContent = (field: string, value: any) => {
    onChange({ ...note, content: { ...note.content, [field]: value } });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({
        ...note,
        images: [...(note.images || []), file],
      });
    }
  };

  const saveDrawing = async () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      onChange({
        ...note,
        drawings: [...(note.drawings || []), blob],
      });
    }
    setIsDrawing(false);
  };

  const activeCustomTemplate = customTemplates.find((t) => t.id === note.type);

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Images */}
      {note.images && note.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {note.images.map((img, idx) => (
            <div
              key={idx}
              className="relative group rounded-lg overflow-hidden"
            >
              <BlobImage
                src={img}
                alt="Note attachment"
                className="w-full h-auto object-cover"
              />
              <button
                onClick={() =>
                  onChange({
                    ...note,
                    images: note.images?.filter((_, i) => i !== idx),
                  })
                }
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drawings */}
      {note.drawings && note.drawings.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {note.drawings.map((drawing, idx) => (
            <div
              key={idx}
              className="relative group rounded-lg overflow-hidden bg-white border border-black/10"
            >
              <BlobImage
                src={drawing}
                alt="Drawing"
                className="w-full h-auto object-contain"
              />
              <button
                onClick={() =>
                  onChange({
                    ...note,
                    drawings: note.drawings?.filter((_, i) => i !== idx),
                  })
                }
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Audio Records */}
      {note.audioData && note.audioData.length > 0 && (
        <div className="space-y-2 mb-2">
          {note.audioData.map((audio, idx) => (
            <div
              key={idx}
              className="relative group rounded-xl overflow-hidden bg-olive-50/50 border border-olive-100 p-2"
            >
              <CustomAudioPlayer src={audio} />
              <button
                onClick={() =>
                  onChange({
                    ...note,
                    audioData: note.audioData?.filter((_, i) => i !== idx),
                  })
                }
                className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Audio Recorder */}
      {isRecording && (
        <AudioRecorder
          onSave={(blob) => {
            onChange({
              ...note,
              audioData: [...(note.audioData || []), blob],
            });
            setIsRecording(false);
          }}
          onCancel={() => setIsRecording(false)}
          className="mb-4"
        />
      )}

      {/* Drawing Canvas */}
      {isDrawing && (
        <div className="border border-olive-200 rounded-xl overflow-hidden bg-white relative">
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{ className: "w-full h-48 sm:h-64 cursor-crosshair" }}
          />
          <div className="absolute bottom-2 left-2 flex gap-2">
            <button
              onClick={() => sigCanvas.current?.clear()}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
            >
              مسح
            </button>
            <button
              onClick={saveDrawing}
              className="px-3 py-1 bg-olive-900 text-white rounded-md text-sm"
            >
              حفظ الرسم
            </button>
            <button
              onClick={() => setIsDrawing(false)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <input
        type="text"
        value={note.title}
        onChange={(e) => onChange({ ...note, title: e.target.value })}
        placeholder="العنوان"
        className="w-full font-bold text-lg text-olive-900 placeholder:text-olive-900/50 focus:outline-none bg-transparent"
      />

      {/* Content Area based on Type */}
      {note.type === "general" && !note.isChecklist && (
        <RichTextEditor
          content={note.content?.text || ""}
          onChange={(content) => updateContent("text", content)}
          className="w-full bg-transparent border-none shadow-none"
        />
      )}

      {note.isChecklist && (
        <div className="space-y-2">
          {note.checklistItems?.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2 group">
              <button
                onClick={() => {
                  const newItems = [...(note.checklistItems || [])];
                  newItems[idx].isCompleted = !newItems[idx].isCompleted;
                  onChange({ ...note, checklistItems: newItems });
                }}
                className="text-olive-600"
              >
                {item.isCompleted ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <div className="w-5 h-5 border-2 border-olive-400 rounded-sm" />
                )}
              </button>
              <input
                type="text"
                value={item.text}
                onChange={(e) => {
                  const newItems = [...(note.checklistItems || [])];
                  newItems[idx].text = e.target.value;
                  onChange({ ...note, checklistItems: newItems });
                }}
                className={cn(
                  "flex-1 bg-transparent focus:outline-none transition-all",
                  item.isCompleted && "line-through text-olive-900/50",
                )}
                placeholder="عنصر قائمة..."
              />
              <button
                onClick={() => {
                  onChange({
                    ...note,
                    checklistItems: note.checklistItems?.filter(
                      (_, i) => i !== idx,
                    ),
                  });
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-olive-400 hover:text-red-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 text-olive-600/70">
            <Plus className="w-5 h-5" />
            <input
              type="text"
              placeholder="عنصر قائمة جديد..."
              className="flex-1 bg-transparent focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  onChange({
                    ...note,
                    checklistItems: [
                      ...(note.checklistItems || []),
                      {
                        id: Date.now().toString(),
                        text: e.currentTarget.value,
                        isCompleted: false,
                      },
                    ],
                  });
                  e.currentTarget.value = "";
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Built-in Templates */}
      {note.type === "majlis" && (
        <MajlisTemplate note={note} onChange={onChange} />
      )}
      {note.type === "takhreej" && (
        <TakhreejTemplate note={note} onChange={onChange} />
      )}
      {note.type === "tadabbur" && (
        <TadabburTemplate note={note} onChange={onChange} />
      )}

      {/* Custom Templates */}
      {activeCustomTemplate && (
        <div className="space-y-5 bg-card p-6 rounded-[1.5rem] border border-olive-200/60 shadow-sm">
          <div className="flex items-center gap-3 text-olive-900 font-bold mb-2 pb-4 border-b border-olive-100/50">
            <div className="p-2.5 bg-olive-50/80 rounded-xl text-olive-600 border border-olive-100/50">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-lg">{activeCustomTemplate.name}</span>
          </div>
          <div className="flex flex-wrap gap-5">
            {activeCustomTemplate.fields.map((field) => (
              <div
                key={field.id}
                className={cn(
                  "space-y-2",
                  field.width === "half"
                    ? "w-[calc(50%-0.625rem)]"
                    : field.width === "third"
                      ? "w-[calc(33.333%-0.833rem)]"
                      : "w-full",
                )}
              >
                <label className="text-sm font-bold text-olive-700 px-1">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <RichTextEditor
                    content={note.content?.[field.id] || ""}
                    onChange={(content) => updateContent(field.id, content)}
                    className={cn(
                      "w-full bg-olive-50/30 border border-olive-200/60 rounded-xl shadow-sm",
                      field.size === "large"
                        ? "min-h-[200px]"
                        : field.size === "small"
                          ? "min-h-[100px]"
                          : "min-h-[150px]"
                    )}
                  />
                ) : field.type === "checklist" ? (
                  <div className="space-y-3">
                    {(note.content?.[field.id] || []).map(
                      (item: any, idx: number) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 group bg-white/50 p-2 rounded-xl border border-olive-100/50"
                        >
                          <button
                            onClick={() => {
                              const newItems = [
                                ...(note.content?.[field.id] || []),
                              ];
                              newItems[idx].isCompleted =
                                !newItems[idx].isCompleted;
                              updateContent(field.id, newItems);
                            }}
                            className="text-olive-600"
                          >
                            {item.isCompleted ? (
                              <CheckSquare className="w-5 h-5 text-olive-500" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-olive-400/50 rounded-md" />
                            )}
                          </button>
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const newItems = [
                                ...(note.content?.[field.id] || []),
                              ];
                              newItems[idx].text = e.target.value;
                              updateContent(field.id, newItems);
                            }}
                            className={cn(
                              "flex-1 bg-transparent focus:outline-none transition-all text-sm font-medium",
                              item.isCompleted &&
                                "line-through text-olive-900/50",
                            )}
                            placeholder="عنصر قائمة..."
                          />
                          <button
                            onClick={() => {
                              updateContent(
                                field.id,
                                (note.content?.[field.id] || []).filter(
                                  (_: any, i: number) => i !== idx,
                                ),
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ),
                    )}
                    <button
                      onClick={() => {
                        const newItems = [
                          ...(note.content?.[field.id] || []),
                          {
                            id: Date.now().toString(),
                            text: "",
                            isCompleted: false,
                          },
                        ];
                        updateContent(field.id, newItems);
                      }}
                      className="flex items-center gap-1.5 text-xs text-olive-600 hover:text-olive-900 font-bold mt-2 px-3 py-1.5 bg-olive-50/50 rounded-lg hover:bg-olive-100/50 transition-colors w-fit"
                    >
                      <Plus className="w-3.5 h-3.5" /> إضافة عنصر
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={note.content?.[field.id] || ""}
                    onChange={(e) => updateContent(field.id, e.target.value)}
                    className={cn(
                      "w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm font-medium",
                      field.size === "large"
                        ? "text-lg py-4"
                        : field.size === "small"
                          ? "text-xs py-2"
                          : "",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Labels Display */}
      {note.labels && note.labels.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {note.labels.map((label) => (
            <span
              key={label}
              className="px-2 py-1 bg-black/5 rounded-full text-xs flex items-center gap-1"
            >
              {label}
              <button
                onClick={() =>
                  onChange({
                    ...note,
                    labels: note.labels?.filter((l) => l !== label),
                  })
                }
                className="hover:bg-black/10 rounded-full p-0.5"
                aria-label={`إزالة تصنيف ${label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {isExpanded && (
        <div className="flex items-center justify-between mt-4 relative">
          <div className="flex gap-1 sm:gap-2">
            {/* Color Palette */}
            <div className="relative">
              <button
                onClick={() => setShowPalette(!showPalette)}
                className="p-2 text-olive-600 hover:bg-black/5 rounded-full transition-colors"
                title="لون الخلفية"
                aria-label="تغيير لون الخلفية"
                aria-expanded={showPalette}
              >
                <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {showPalette && (
                <div className="absolute bottom-full right-0 mb-2 bg-white shadow-xl rounded-xl p-2 flex flex-wrap gap-2 w-48 z-10 border border-black/5">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        onChange({ ...note, color: c });
                        setShowPalette(false);
                      }}
                      className="w-8 h-8 rounded-full border border-black/10 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      aria-label={`تغيير اللون إلى ${c}`}
                    >
                      {getNoteColor(note.color) === c && (
                        <Check className="w-4 h-4 mx-auto text-black/50" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-olive-600 hover:bg-black/5 rounded-full transition-colors"
              title="إضافة صورة"
              aria-label="إضافة صورة"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Drawing */}
            <button
              onClick={() => setIsDrawing(true)}
              className="p-2 text-olive-600 hover:bg-black/5 rounded-full transition-colors"
              title="إضافة رسم"
              aria-label="إضافة رسم"
            >
              <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Audio Recording */}
            <button
              onClick={() => setIsRecording(true)}
              className="p-2 text-olive-600 hover:bg-black/5 rounded-full transition-colors"
              title="تسجيل صوتي"
              aria-label="تسجيل صوتي"
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Labels */}
            <div className="relative">
              <button
                onClick={() => setShowLabels(!showLabels)}
                className="p-2 text-olive-600 hover:bg-black/5 rounded-full transition-colors"
                title="إضافة تصنيف"
                aria-label="إضافة تصنيف"
                aria-expanded={showLabels}
              >
                <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {showLabels && (
                <div className="absolute bottom-full right-0 mb-2 bg-white shadow-xl rounded-xl p-3 w-48 z-10 border border-black/5">
                  <h4 className="text-xs font-bold mb-2">إضافة تصنيف</h4>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="اسم التصنيف..."
                    className="w-full text-sm p-1 border-b border-olive-200 focus:outline-none focus:border-olive-900 mb-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newLabel.trim()) {
                        if (!note.labels?.includes(newLabel.trim())) {
                          onChange({
                            ...note,
                            labels: [...(note.labels || []), newLabel.trim()],
                          });
                        }
                        setNewLabel("");
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Checklist Toggle */}
            <button
              onClick={() =>
                onChange({ ...note, isChecklist: !note.isChecklist })
              }
              className={cn(
                "p-2 rounded-full transition-colors",
                note.isChecklist
                  ? "bg-olive-100 text-olive-900"
                  : "text-olive-600 hover:bg-black/5",
              )}
              title="قائمة مهام"
              aria-label={note.isChecklist ? "إلغاء قائمة المهام" : "تحويل إلى قائمة مهام"}
            >
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Templates Dropdown */}
          <div className="flex gap-1">
            <select
              value={note.type}
              onChange={(e) =>
                onChange({ ...note, type: e.target.value as any })
              }
              className="bg-transparent text-xs sm:text-sm font-bold text-olive-600 focus:outline-none cursor-pointer hover:bg-black/5 rounded-md px-2 py-1 max-w-[120px] sm:max-w-xs truncate"
            >
              <option value="general">ملاحظة عادية</option>
              <option value="majlis">قالب: مجلس علم</option>
              <option value="takhreej">قالب: تخريج وتحقيق</option>
              <option value="tadabbur">قالب: تدبر آية</option>
              {customTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  قالب: {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

const NoteCard = React.memo(function NoteCard({
  note,
  onClick,
  customTemplates,
}: {
  note: Note;
  onClick: () => void;
  customTemplates: CustomTemplate[];
}) {
  const activeCustomTemplate = customTemplates.find((t) => t.id === note.type);

  const getTemplateIcon = () => {
    switch (note.type) {
      case "majlis":
        return <Book className="w-4 h-4" />;
      case "takhreej":
        return <FileText className="w-4 h-4" />;
      case "tadabbur":
        return <Lightbulb className="w-4 h-4" />;
      default:
        if (activeCustomTemplate) return <FileText className="w-4 h-4" />;
        return null;
    }
  };

  const getTemplateName = () => {
    switch (note.type) {
      case "majlis":
        return "مجلس علم";
      case "takhreej":
        return "تخريج وتحقيق";
      case "tadabbur":
        return "تدبر آية";
      default:
        if (activeCustomTemplate) return activeCustomTemplate.name;
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "optimize-gpu group rounded-[2rem] p-5 cursor-pointer transition-all duration-300 border border-olive-200/40 shadow-sm hover:shadow-lg hover:shadow-olive-900/5 hover:-translate-y-1 relative overflow-hidden",
        (!note.color || note.color === "#FFFFFF" || note.color === "var(--color-note-0)") ? "bg-card" : ""
      )}
      style={{ backgroundColor: getNoteColor(note.color) }}
    >
      {/* Top Gradient Overlay for better readability if image is present */}
      {note.images && note.images.length > 0 && (
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/20 to-transparent z-10 pointer-events-none"></div>
      )}

      {note.images && note.images.length > 0 && (
        <div className="grid grid-cols-2 gap-1 -mx-5 -mt-5 mb-4">
          {note.images.slice(0, 2).map((img, idx) => (
            <BlobImage
              key={idx}
              src={img}
              alt="Note attachment"
              className={cn(
                "w-full h-32 object-cover",
                note.images!.length === 1 && "col-span-2 h-48",
              )}
            />
          ))}
        </div>
      )}

      {note.drawings && note.drawings.length > 0 && (
        <div className="bg-white/50 rounded-xl p-2 mb-4 border border-black/5">
          <BlobImage
            src={note.drawings[0]}
            alt="Drawing"
            className="w-full h-24 object-contain"
          />
        </div>
      )}

      {note.type !== "general" && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-olive-600/80 mb-3 bg-olive-50/50 w-fit px-2.5 py-1 rounded-lg border border-olive-100/50 relative z-20">
          {getTemplateIcon()}
          <span>{getTemplateName()}</span>
        </div>
      )}

      {note.title && (
        <h3 className="font-bold text-lg text-olive-900 mb-2 leading-tight relative z-20">
          {note.title}
        </h3>
      )}

      {note.type === "general" && !note.isChecklist && note.content?.text && (
        <div
          className="text-sm text-olive-700/80 line-clamp-6 prose prose-sm prose-olive max-w-none relative z-20"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content.text) }}
        />
      )}

      {note.isChecklist && note.checklistItems && (
        <div className="space-y-2 mt-2 relative z-20">
          {note.checklistItems.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 text-sm text-olive-700/80"
            >
              {item.isCompleted ? (
                <CheckSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-olive-500" />
              ) : (
                <div className="w-4 h-4 mt-0.5 border-2 border-olive-400/50 rounded-sm flex-shrink-0" />
              )}
              <span className={cn(item.isCompleted && "line-through opacity-60")}>
                {item.text}
              </span>
            </div>
          ))}
          {note.checklistItems.length > 4 && (
            <div className="text-xs text-olive-500/70 font-medium pt-1">
              + {note.checklistItems.length - 4} عناصر أخرى
            </div>
          )}
        </div>
      )}

      {/* Preview for Templates */}
      {note.type !== "general" && (
        <div className="text-sm text-olive-700/80 line-clamp-4 mt-2 space-y-1 relative z-20">
          {activeCustomTemplate ? (
            activeCustomTemplate.fields.slice(0, 2).map((field) => {
              const value = note.content?.[field.id];
              if (!value) return null;
              
              if (field.type === "checklist") {
                const checkedCount = (value as any[]).filter((i) => i.isCompleted).length;
                const totalCount = (value as any[]).length;
                return (
                  <div key={field.id} className="truncate">
                    <span className="font-bold text-xs opacity-70 ml-1">{field.label}:</span>
                    {checkedCount} / {totalCount} منجز
                  </div>
                );
              }
              
              return (
                <div key={field.id} className="truncate">
                  <span className="font-bold text-xs opacity-70 ml-1">{field.label}:</span>
                  {typeof value === "string" ? value.replace(/<[^>]*>?/gm, '') : ""}
                </div>
              );
            })
          ) : (
            Object.entries(note.content || {})
              .filter(([k, v]) => v && typeof v === "string" && k !== "text")
              .slice(0, 2)
              .map(([k, v]) => (
                <div key={k} className="truncate">
                  <span className="font-bold text-xs opacity-70 ml-1">
                    {k === "ayah"
                      ? "الآية:"
                      : k === "hadith"
                        ? "الحديث:"
                        : k === "topic"
                          ? "الموضوع:"
                          : ""}
                  </span>
                  {v as string}
                </div>
              ))
          )}
        </div>
      )}

      {(note.audioData && note.audioData.length > 0) || (note.labels && note.labels.length > 0) ? (
        <div className="flex flex-wrap gap-1.5 mt-4 relative z-20">
          {note.audioData && note.audioData.length > 0 && (
            <span className="px-2.5 py-1 bg-olive-100 rounded-lg text-[10px] font-bold text-olive-700 flex items-center gap-1">
              <Mic className="w-3 h-3" />
              صوت
            </span>
          )}
          {note.labels?.map((label) => (
            <span
              key={label}
              className="px-2.5 py-1 bg-black/5 rounded-lg text-[10px] font-bold text-olive-700/80 flex items-center gap-1"
            >
              <Tag className="w-3 h-3" />
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
});

// Templates components
const MajlisTemplate = React.memo(function MajlisTemplate({
  note,
  onChange,
}: {
  note: Note;
  onChange: (note: Note) => void;
}) {
  const updateContent = (field: string, value: any) => {
    onChange({ ...note, content: { ...note.content, [field]: value } });
  };

  return (
    <div className="space-y-5 bg-card p-6 rounded-[1.5rem] border border-olive-200/60 shadow-sm">
      <div className="flex items-center gap-3 text-olive-900 font-bold mb-2 pb-4 border-b border-olive-100/50">
        <div className="p-2.5 bg-olive-50/80 rounded-xl text-olive-600 border border-olive-100/50">
          <Book className="w-5 h-5" />
        </div>
        <span className="text-lg">قالب مجلس علم</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-olive-700 px-1">
            اسم الشيخ / المحاضر
          </label>
          <input
            type="text"
            placeholder="مثال: الشيخ صالح آل الشيخ"
            value={note.content?.sheikh || ""}
            onChange={(e) => updateContent("sheikh", e.target.value)}
            className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm font-medium"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-olive-700 px-1">
            المتن المشروح
          </label>
          <input
            type="text"
            placeholder="مثال: كتاب التوحيد"
            value={note.content?.matn || ""}
            onChange={(e) => updateContent("matn", e.target.value)}
            className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm font-medium"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-olive-700 px-1">
          الفوائد المستنبطة
        </label>
        <textarea
          placeholder="اكتب الفوائد هنا..."
          value={note.content?.fawaid || ""}
          onChange={(e) => updateContent("fawaid", e.target.value)}
          rows={5}
          className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm resize-none leading-relaxed font-medium"
        ></textarea>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-olive-700 px-1">
          مسائل تحتاج بحثاً إضافياً
        </label>
        <textarea
          placeholder="سجل ما أشكل عليك للبحث لاحقاً..."
          value={note.content?.masaail || ""}
          onChange={(e) => updateContent("masaail", e.target.value)}
          rows={2}
          className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm resize-none font-medium"
        ></textarea>
      </div>
    </div>
  );
});

const TakhreejTemplate = React.memo(function TakhreejTemplate({
  note,
  onChange,
}: {
  note: Note;
  onChange: (note: Note) => void;
}) {
  const updateContent = (field: string, value: any) => {
    onChange({ ...note, content: { ...note.content, [field]: value } });
  };

  return (
    <div className="space-y-5 bg-card p-6 rounded-[1.5rem] border border-olive-200/60 shadow-sm">
      <div className="flex items-center gap-3 text-olive-900 font-bold mb-2 pb-4 border-b border-olive-100/50">
        <div className="p-2.5 bg-olive-50/80 rounded-xl text-olive-600 border border-olive-100/50">
          <FileText className="w-5 h-5" />
        </div>
        <span className="text-lg">قالب تخريج وتحقيق</span>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-olive-700 px-1">
          نص الحديث أو الأثر
        </label>
        <textarea
          placeholder="اكتب النص هنا..."
          value={note.content?.hadith || ""}
          onChange={(e) => updateContent("hadith", e.target.value)}
          rows={3}
          className="w-full font-serif text-xl bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm resize-none leading-relaxed"
        ></textarea>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-olive-700 px-1">
            المصدر
          </label>
          <input
            type="text"
            placeholder="مثال: صحيح البخاري (1234)"
            value={note.content?.source || ""}
            onChange={(e) => updateContent("source", e.target.value)}
            className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm font-medium"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-olive-700 px-1">الحكم</label>
          <select
            value={note.content?.grade || "صحيح"}
            onChange={(e) => updateContent("grade", e.target.value)}
            className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm font-medium"
          >
            <option>صحيح</option>
            <option>حسن</option>
            <option>ضعيف</option>
            <option>موضوع</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-olive-700 px-1">
          دراسة الأسانيد والعلل
        </label>
        <textarea
          placeholder="تفصيل التخريج ودراسة الرجال..."
          value={note.content?.study || ""}
          onChange={(e) => updateContent("study", e.target.value)}
          rows={5}
          className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm resize-none leading-relaxed font-medium"
        ></textarea>
      </div>
    </div>
  );
});

const TadabburTemplate = React.memo(function TadabburTemplate({
  note,
  onChange,
}: {
  note: Note;
  onChange: (note: Note) => void;
}) {
  const updateContent = (field: string, value: any) => {
    onChange({ ...note, content: { ...note.content, [field]: value } });
  };

  return (
    <div className="space-y-5 bg-card p-6 rounded-[1.5rem] border border-olive-200/60 shadow-sm">
      <div className="flex items-center gap-3 text-olive-900 font-bold mb-2 pb-4 border-b border-olive-100/50">
        <div className="p-2.5 bg-olive-50/80 rounded-xl text-olive-600 border border-olive-100/50">
          <Lightbulb className="w-5 h-5" />
        </div>
        <span className="text-lg">قالب تدبر آية</span>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-olive-700 px-1">
          الآية الكريمة
        </label>
        <textarea
          placeholder="اكتب الآية هنا..."
          value={note.content?.ayah || ""}
          onChange={(e) => updateContent("ayah", e.target.value)}
          rows={2}
          className="w-full font-serif text-2xl text-center bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm resize-none leading-relaxed text-olive-900"
        ></textarea>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-olive-700 px-1">
          التفسير والمعنى
        </label>
        <textarea
          placeholder="التفسير من المصادر الموثوقة..."
          value={note.content?.tafsir || ""}
          onChange={(e) => updateContent("tafsir", e.target.value)}
          rows={4}
          className="w-full bg-olive-50/30 border border-olive-200/60 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500 transition-all shadow-sm resize-none leading-relaxed font-medium"
        ></textarea>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-olive-700 px-1">
          التطبيق العملي
        </label>
        <textarea
          placeholder="كيف أطبقها في حياتي؟ (خطوات عملية)..."
          value={note.content?.action || ""}
          onChange={(e) => updateContent("action", e.target.value)}
          rows={3}
          className="w-full bg-olive-900 text-paper placeholder:text-paper/60 border border-olive-900 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/50 transition-all shadow-md resize-none leading-relaxed font-medium"
        ></textarea>
      </div>
    </div>
  );
});

function TemplateManager({
  templates,
  onClose,
  onUpdate,
}: {
  templates: CustomTemplate[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate>({
    id: "",
    name: "",
    fields: [],
  });

  const handleSave = async () => {
    if (!editingTemplate.name.trim() || editingTemplate.fields.length === 0)
      return;
    await db.customTemplates.save({
      ...editingTemplate,
      id: editingTemplate.id || Date.now().toString(),
    });
    setEditingTemplate({ id: "", name: "", fields: [] });
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await db.customTemplates.delete(id);
    if (editingTemplate.id === id) {
      setEditingTemplate({ id: "", name: "", fields: [] });
    }
    onUpdate();
  };

  const handleEdit = (template: CustomTemplate) => {
    setEditingTemplate(template);
  };

  const handleReorder = (newFields: any[]) => {
    setEditingTemplate({ ...editingTemplate, fields: newFields });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <div
        className="bg-card rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-olive-200/50"
      >
        <div className="p-6 border-b border-olive-100/50 flex justify-between items-center bg-card">
          <h2 className="font-bold text-olive-900 text-xl flex items-center gap-3">
            <div className="p-2 bg-olive-100/50 rounded-xl">
              <Palette className="w-5 h-5 text-olive-700" />
            </div>
            إدارة القوالب الخاصة
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-olive-400 hover:text-olive-900 hover:bg-olive-50 rounded-xl transition-all duration-200 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-olive-50/20">
          {/* Create / Edit Template */}
          <div className="bg-card p-6 rounded-[1.5rem] border border-olive-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-olive-900 text-lg">
                {editingTemplate.id ? "تعديل القالب" : "إنشاء قالب جديد"}
              </h3>
              {editingTemplate.id && (
                <button
                  onClick={() =>
                    setEditingTemplate({ id: "", name: "", fields: [] })
                  }
                  className="text-xs px-4 py-1.5 bg-olive-100 text-olive-700 hover:bg-olive-200 rounded-full font-bold transition-all duration-200 active:scale-95"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-olive-700">
                اسم القالب
              </label>
              <input
                type="text"
                placeholder="مثال: تلخيص كتاب، خطة أسبوعية..."
                value={editingTemplate.name}
                onChange={(e) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    name: e.target.value,
                  })
                }
                className="w-full bg-olive-50/50 border border-olive-200/60 rounded-xl p-3 focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500 transition-all font-medium"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-olive-800">
                  حقول القالب:
                </h4>
                <span className="text-xs font-medium text-olive-500 bg-olive-100/50 px-2 py-1 rounded-md">
                  {editingTemplate.fields.length} حقول
                </span>
              </div>

              <div className="space-y-3">
                {editingTemplate.fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="flex flex-col gap-4 bg-card p-5 rounded-2xl border border-olive-200/60 shadow-sm transition-colors"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="p-2 bg-olive-50 rounded-lg text-olive-400 cursor-grab">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const fields = [...editingTemplate.fields];
                          fields[idx].label = e.target.value;
                          setEditingTemplate({
                            ...editingTemplate,
                            fields,
                          });
                        }}
                        placeholder="اسم الحقل (مثال: الفوائد، المهام...)"
                        className="flex-1 bg-transparent border-b-2 border-transparent hover:border-olive-200 focus:border-olive-500 focus:outline-none text-sm font-bold pb-1 transition-colors"
                      />
                      <button
                        onClick={() => {
                          const fields = editingTemplate.fields.filter(
                            (_, i) => i !== idx,
                          );
                          setEditingTemplate({
                            ...editingTemplate,
                            fields,
                          });
                        }}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 active:scale-95"
                        title="حذف الحقل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-2 pr-12">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-olive-500 uppercase tracking-wider">
                          نوع الحقل
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const fields = [...editingTemplate.fields];
                            fields[idx].type = e.target.value as any;
                            setEditingTemplate({
                              ...editingTemplate,
                              fields,
                            });
                          }}
                          className="w-full bg-olive-50/50 border border-olive-200/60 rounded-xl text-xs p-2.5 focus:outline-none focus:border-olive-500 transition-colors"
                        >
                          <option value="text">نص قصير</option>
                          <option value="textarea">نص طويل</option>
                          <option value="checklist">قائمة مهام</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-olive-500 uppercase tracking-wider">
                          عرض الحقل
                        </label>
                        <select
                          value={field.width || "full"}
                          onChange={(e) => {
                            const fields = [...editingTemplate.fields];
                            fields[idx].width = e.target.value as any;
                            setEditingTemplate({
                              ...editingTemplate,
                              fields,
                            });
                          }}
                          className="w-full bg-olive-50/50 border border-olive-200/60 rounded-xl text-xs p-2.5 focus:outline-none focus:border-olive-500 transition-colors"
                        >
                          <option value="full">عرض كامل (100%)</option>
                          <option value="half">نصف العرض (50%)</option>
                          <option value="third">ثلث العرض (33%)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-olive-500 uppercase tracking-wider">
                          حجم الحقل
                        </label>
                        <select
                          value={field.size || "medium"}
                          onChange={(e) => {
                            const fields = [...editingTemplate.fields];
                            fields[idx].size = e.target.value as any;
                            setEditingTemplate({
                              ...editingTemplate,
                              fields,
                            });
                          }}
                          className="w-full bg-olive-50/50 border border-olive-200/60 rounded-xl text-xs p-2.5 focus:outline-none focus:border-olive-500 transition-colors"
                        >
                          <option value="small">صغير</option>
                          <option value="medium">متوسط</option>
                          <option value="large">كبير</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  setEditingTemplate({
                    ...editingTemplate,
                    fields: [
                      ...editingTemplate.fields,
                      {
                        id: `field_${Date.now()}`,
                        label: "",
                        type: "text",
                        width: "full",
                        size: "medium",
                      },
                    ],
                  })
                }
                className="flex items-center justify-center gap-2 w-full py-3.5 mt-4 border-2 border-dashed border-olive-200 text-sm text-olive-600 hover:text-olive-900 hover:border-olive-400 hover:bg-olive-50/50 rounded-xl transition-all duration-200 font-bold active:scale-95"
              >
                <Plus className="w-4 h-4" /> إضافة حقل جديد
              </button>
            </div>

            {/* Existing Templates */}
            {templates.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-olive-900 text-lg flex items-center gap-2">
                  <Book className="w-5 h-5 text-olive-600" />
                  القوالب المحفوظة
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex flex-col bg-card p-5 rounded-2xl border border-olive-200/60 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-olive-900 text-base">
                            {template.name}
                          </div>
                          <div className="text-xs font-medium text-olive-500 mt-1">
                            {template.fields.length} حقول
                          </div>
                        </div>
                        <div className="flex gap-1.5 bg-olive-50/50 p-1.5 rounded-xl border border-olive-100/50">
                          <button
                            onClick={() => handleEdit(template)}
                            className="p-1.5 text-olive-600 hover:bg-card hover:shadow-sm rounded-lg transition-all duration-200 active:scale-95"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="p-1.5 text-red-500 hover:bg-card hover:shadow-sm rounded-lg transition-all duration-200 active:scale-95"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                        {template.fields.slice(0, 3).map((f) => (
                          <span
                            key={f.id}
                            className="text-[10px] px-2.5 py-1 bg-olive-50/80 text-olive-700 rounded-lg border border-olive-100/50 font-medium"
                          >
                            {f.label}
                          </span>
                        ))}
                        {template.fields.length > 3 && (
                          <span className="text-[10px] px-2.5 py-1 bg-olive-50/50 text-olive-500 rounded-lg border border-olive-100/50 font-medium">
                            +{template.fields.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

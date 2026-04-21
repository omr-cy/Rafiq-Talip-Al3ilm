import { useState, useRef, useEffect } from "react";
import {
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileJson,
  BookOpen,
  Plus,
  Trash2,
  Save,
  X,
  Clock,
  Bell,
  Palette,
  HardDrive,
  Share2,
  Settings as SettingsIcon,
} from "lucide-react";
import { db, DailyAyah, UserSettings } from "@/src/lib/db";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Device } from "@capacitor/device";
import { Share } from "@capacitor/share";
import { useNotification } from "@/src/components/NotificationProvider";
import { AnimatePresence, motion } from "motion/react";

export function SettingsPage() {
  const { addNotification } = useNotification();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Storage State
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number; percentage: number } | null>(null);
  const [isDeletingAudio, setIsDeletingAudio] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning";
  } | null>(null);

  // Ayah Management State
  const [ayahs, setAyahs] = useState<DailyAyah[]>([]);
  const [isAddingAyah, setIsAddingAyah] = useState(false);
  const [newAyah, setNewAyah] = useState<Partial<DailyAyah>>({
    text: "",
    surah: "",
    ayahNumber: 1,
    tafsir: "",
    source: "المختصر في التفسير",
  });

  useLockBodyScroll(isAddingAyah);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAyahs();
    loadSettings();
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        setStorageInfo({
          usage,
          quota,
          percentage: Math.min(100, Math.round((usage / quota) * 100))
        });
      } catch (error) {
        console.error("Error estimating storage:", error);
      }
    }
  };

  const handleDeleteAllAudio = async () => {
    setConfirmAction({
      title: "حذف جميع التسجيلات",
      message: "هل أنت متأكد من رغبتك في حذف جميع التسجيلات الصوتية؟ لا يمكن التراجع عن هذا الإجراء.",
      type: "danger",
      onConfirm: async () => {
        setIsDeletingAudio(true);
        try {
          const records = await db.audio.getAll();
          for (const record of records) {
            await db.audio.delete(record.id);
          }
          setMessage({ type: "success", text: "تم حذف جميع التسجيلات الصوتية بنجاح وتوفير مساحة التخزين." });
          await loadStorageInfo();
        } catch (error) {
          console.error("Error deleting audio:", error);
          setMessage({ type: "error", text: "حدث خطأ أثناء حذف التسجيلات الصوتية." });
        } finally {
          setIsDeletingAudio(false);
          setConfirmAction(null);
        }
      }
    });
  };

  const handleResetApp = async () => {
    setConfirmAction({
      title: "إعادة ضبط التطبيق",
      message: "تحذير: سيؤدي هذا الإجراء إلى حذف جميع بياناتك (الملاحظات، المعجم، الأهداف، الإعدادات) بشكل نهائي وإعادة التطبيق لحالته الأصلية. هل أنت متأكد؟",
      type: "danger",
      onConfirm: async () => {
        setIsResetting(true);
        try {
          await db.resetAll();
        } catch (error) {
          console.error("Error resetting app:", error);
          setMessage({ type: "error", text: "حدث خطأ أثناء إعادة ضبط التطبيق." });
          setIsResetting(false);
          setConfirmAction(null);
        }
      }
    });
  };

  const loadSettings = async () => {
    const loadedSettings = await db.settings.get();
    setSettings(loadedSettings);
  };

  const handleSaveSettings = async (updatedSettings?: UserSettings) => {
    const toSave = updatedSettings || settings;
    if (toSave) {
      await db.settings.save(toSave);
      setSettings(toSave);
      if (!updatedSettings) {
        setMessage({ type: "success", text: "تم حفظ الإعدادات بنجاح!" });
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const loadAyahs = async () => {
    const loadedAyahs = await db.ayahs.getAll();
    setAyahs(loadedAyahs);
  };

  const handleSaveAyah = async () => {
    if (!newAyah.text || !newAyah.surah || !newAyah.tafsir) {
      setMessage({
        type: "error",
        text: "يرجى تعبئة جميع الحقول المطلوبة للآية.",
      });
      return;
    }

    const ayahToSave: DailyAyah = {
      id: `ayah_${Date.now()}`,
      text: newAyah.text,
      surah: newAyah.surah,
      ayahNumber: newAyah.ayahNumber || 1,
      tafsir: newAyah.tafsir,
      source: newAyah.source || "المختصر في التفسير",
    };

    await db.ayahs.save(ayahToSave);
    setMessage({ type: "success", text: "تمت إضافة الآية بنجاح!" });
    setIsAddingAyah(false);
    setNewAyah({
      text: "",
      surah: "",
      ayahNumber: 1,
      tafsir: "",
      source: "المختصر في التفسير",
    });
    loadAyahs();
  };

  const handleDeleteAyah = async (id: string) => {
    await db.ayahs.delete(id);
    setMessage({ type: "success", text: "تم حذف الآية بنجاح." });
    loadAyahs();
  };

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const [
        notes,
        dictionary,
        inbox,
        goals,
        audio,
        ayahsData,
        flashcards,
        flashcardCategories,
        customTemplates,
        taskLists,
        userSettings,
      ] = await Promise.all([
        db.notes.getAll(),
        db.dictionary.getAll(),
        db.inbox.getAll(),
        db.goals.getAll(),
        db.audio.getAll(),
        db.ayahs.getAll(),
        db.flashcards.getAll(),
        db.flashcardCategories.getAll(),
        db.customTemplates.getAll(),
        db.taskLists.getAll(),
        db.settings.get(),
      ]);

      const backupData = {
        app: "رفيق طالب العلم",
        version: "1.1",
        timestamp: Date.now(),
        data: {
          notes,
          dictionary,
          inbox,
          goals,
          audio,
          ayahs: ayahsData,
          flashcards,
          flashcardCategories,
          customTemplates,
          taskLists,
          settings: userSettings,
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `TalibAlIlm_Backup_${dateStr}.json`;

      const info = await Device.getInfo();
      if (info.platform === "android" || info.platform === "ios") {
        try {
          // Check and request permissions on Android
          if (info.platform === "android") {
            const permStatus = await Filesystem.checkPermissions();
            if (permStatus.publicStorage !== "granted") {
              const requestStatus = await Filesystem.requestPermissions();
              if (requestStatus.publicStorage !== "granted") {
                throw new Error("لم يتم منح إذن الوصول للتخزين الخارجي. يرجى تفعيل الإذن من إعدادات الهاتف.");
              }
            }
          }

          // On mobile, we try to save to Documents or use Share API
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: jsonString,
            directory: Directory.Cache, // Use Cache for temporary sharing
            encoding: Encoding.UTF8,
          });
          
          await Share.share({
            title: 'تصدير بيانات رفيق طالب العلم',
            text: 'ملف النسخة الاحتياطية لبياناتك',
            url: writeResult.uri,
            dialogTitle: 'اختر مكان الحفظ أو التطبيق للمشاركة',
          });

          addNotification({
            type: "success",
            title: "تم التصدير بنجاح",
            message: "يمكنك الآن حفظ الملف في المكان الذي اخترته.",
          });
        } catch (err: any) {
          console.error("Mobile save error:", err);
          // Fallback to web download if filesystem fails
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setMessage({
            type: "success",
            text: "تم تصدير البيانات بنجاح! تم استخدام طريقة التحميل الافتراضية للمتصفح.",
          });
        }
      } else {
        // Standard Web Export
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addNotification({
          type: "success",
          title: "تم التصدير بنجاح",
          message: "تم تصدير البيانات بنجاح! يمكنك العثور على الملف في مجلد التنزيلات.",
        });
      }
    } catch (err) {
      console.error("Export error:", err);
      setMessage({ type: "error", text: "حدث خطأ أثناء تصدير البيانات." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);

        // Validate backup file
        if (backupData.app !== "رفيق طالب العلم" && backupData.app !== "TalibAlIlm" || !backupData.data) {
          throw new Error(
            "ملف النسخة الاحتياطية غير صالح أو لا يتبع لهذا التطبيق.",
          );
        }

        const {
          notes,
          dictionary,
          inbox,
          goals,
          audio,
          ayahs: importedAyahs,
          flashcards,
          flashcardCategories,
          customTemplates,
          taskLists,
          settings: importedSettings,
        } = backupData.data;

        // Import Notes
        if (Array.isArray(notes) && notes.length > 0) {
          await db.notes.saveMany(notes);
        }
        // Import Dictionary
        if (Array.isArray(dictionary)) {
          for (const term of dictionary) await db.dictionary.save(term);
        }
        // Import Inbox
        if (Array.isArray(inbox)) {
          for (const msg of inbox) await db.inbox.save(msg);
        }
        // Import Goals
        if (Array.isArray(goals)) {
          for (const goal of goals) await db.goals.save(goal);
        }
        // Import Audio
        if (Array.isArray(audio)) {
          for (const record of audio) await db.audio.save(record);
        }
        // Import Ayahs
        if (Array.isArray(importedAyahs)) {
          for (const ayah of importedAyahs) await db.ayahs.save(ayah);
        }
        // Import Flashcards
        if (Array.isArray(flashcards)) {
          for (const card of flashcards) await db.flashcards.save(card);
        }
        // Import Flashcard Categories
        if (Array.isArray(flashcardCategories)) {
          for (const cat of flashcardCategories) await db.flashcardCategories.save(cat);
        }
        // Import Custom Templates
        if (Array.isArray(customTemplates)) {
          for (const temp of customTemplates) await db.customTemplates.save(temp);
        }
        // Import Task Lists
        if (Array.isArray(taskLists)) {
          for (const list of taskLists) await db.taskLists.save(list);
        }
        // Import Settings
        if (importedSettings) {
          await db.settings.save(importedSettings);
          // Refresh theme
          window.location.reload();
        }

        setMessage({
          type: "success",
          text: "تم استيراد البيانات بنجاح! تم دمج البيانات الجديدة مع بياناتك الحالية.",
        });
        loadAyahs();
      } catch (err) {
        console.error("Import error:", err);
        setMessage({
          type: "error",
          text: "فشل الاستيراد. تأكد من اختيار ملف نسخة احتياطية صحيح (JSON).",
        });
      } finally {
        setIsImporting(false);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setMessage({ type: "error", text: "حدث خطأ أثناء قراءة الملف." });
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-10">
      {/* Header */}
      {(settings && !settings.hideSettingsIntro) && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-3xl border border-olive-200/50 shadow-sm relative group">
          <button
            onClick={() => handleSaveSettings({ ...settings!, hideSettingsIntro: true })}
            className="absolute top-4 left-4 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all z-20"
            title="إخفاء هذا التعريف"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-olive-900 text-paper rounded-2xl shadow-md shadow-olive-900/20">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-olive-900">
                إعدادات التطبيق
              </h1>
              <p className="text-sm text-olive-600 mt-1 leading-relaxed">
                من هنا يمكنك التحكم في إدارة مساحة التخزين، والقيام بعمليات النسخ الاحتياطي لبياناتك العلمية لضمان سلامتها.
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-2 ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium leading-relaxed">{message.text}</p>
        </div>
      )}

      {/* Data Backup Section */}
      <div className="bg-card p-6 md:p-8 rounded-3xl border border-olive-200/50 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-olive-900 text-paper rounded-xl">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-olive-900">
              النسخ الاحتياطي والبيانات
            </h2>
            <p className="text-sm text-olive-600">
              احفظ بياناتك في ملفاتك الخاصة واستعدها في أي وقت
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="bg-olive-50/50 p-6 rounded-2xl border border-olive-100 space-y-4 flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-olive-100 text-olive-900 rounded-xl">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-olive-900">تصدير البيانات</h3>
            </div>
            <p className="text-olive-600 text-xs flex-1">
              قم بتحميل جميع بياناتك (الملاحظات، المعجم، الأهداف، البطاقات، والتسجيلات) في ملف واحد.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-olive-900 text-paper rounded-xl hover:bg-olive-800 transition-all font-bold text-sm disabled:opacity-70"
            >
              <Download className={`w-4 h-4 ${isExporting ? "animate-bounce" : ""}`} />
              <span>{isExporting ? "جاري التصدير..." : "تصدير الآن"}</span>
            </button>
          </div>

          {/* Import Section */}
          <div className="bg-olive-50/50 p-6 rounded-2xl border border-olive-100 space-y-4 flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-sand text-olive-900 rounded-xl">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-olive-900">استيراد البيانات</h3>
            </div>
            <p className="text-olive-600 text-xs flex-1">
              اختر ملف النسخة الاحتياطية لاستعادة بياناتك. سيتم دمجها مع بياناتك الحالية.
            </p>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-card text-olive-900 rounded-xl hover:bg-olive-50 transition-all font-bold text-sm border-2 border-olive-200 disabled:opacity-70"
            >
              <Upload className={`w-4 h-4 ${isImporting ? "animate-bounce" : ""}`} />
              <span>{isImporting ? "جاري الاستيراد..." : "استيراد الآن"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Storage Management Section */}
      <div className="bg-card p-6 md:p-8 rounded-3xl border border-olive-200/50 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-olive-900 text-paper rounded-xl">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-olive-900">
              إدارة مساحة التخزين
            </h2>
            <p className="text-sm text-olive-600">
              راقب مساحة التخزين المستهلكة وقم بإدارتها
            </p>
          </div>
        </div>

        {storageInfo ? (
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-bold text-olive-900">
              <span>المساحة المستهلكة: {(storageInfo.usage / (1024 * 1024)).toFixed(2)} MB</span>
              <span>الإجمالي المتاح: {(storageInfo.quota / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            <div className="w-full bg-olive-100 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full ${storageInfo.percentage > 80 ? 'bg-red-500' : storageInfo.percentage > 50 ? 'bg-amber-500' : 'bg-olive-600'}`}
                style={{ width: `${storageInfo.percentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-olive-500 text-center">
              تم استهلاك {storageInfo.percentage}% من المساحة المتاحة
            </p>
          </div>
        ) : (
          <p className="text-sm text-olive-500">جاري حساب مساحة التخزين...</p>
        )}

        <div className="pt-4 border-t border-olive-100 space-y-4">
          <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-red-800 text-sm">تفريغ المساحة</h3>
              <p className="text-xs text-red-600/80 mt-1">
                الملفات الصوتية تستهلك الجزء الأكبر من المساحة. يمكنك حذفها جميعاً دفعة واحدة.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteAllAudio}
              disabled={isDeletingAudio}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-bold text-sm disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeletingAudio ? "جاري الحذف..." : "حذف جميع الصوتيات"}</span>
            </button>
          </div>

          <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-red-800 text-sm">إعادة ضبط التطبيق</h3>
              <p className="text-xs text-red-600/80 mt-1">
                سيتم حذف جميع البيانات والعودة للحالة الأصلية (كأنك تفتحه لأول مرة).
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetApp}
              disabled={isResetting}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-bold text-sm disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isResetting ? "جاري إعادة الضبط..." : "إعادة ضبط التطبيق"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmAction(null)}
              className="absolute inset-0 bg-olive-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl border border-olive-200 p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${confirmAction.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-olive-900">{confirmAction.title}</h3>
                  <p className="text-sm text-olive-600 mt-1">{confirmAction.message}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-olive-50 text-olive-700 font-bold hover:bg-olive-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmAction.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-paper transition-colors shadow-lg ${
                    confirmAction.type === 'danger' 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  }`}
                >
                  تأكيد
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

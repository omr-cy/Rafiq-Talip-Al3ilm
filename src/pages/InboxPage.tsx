import { useState, useEffect } from "react";
import {
  MessageSquare,
  Lock,
  MailOpen,
  Send,
  Plus,
  X,
  Trash2,
  Mic,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/src/lib/utils";
import { db, InboxMessage } from "@/src/lib/db";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { Skeleton } from "../components/Skeleton";
import { AudioRecorder } from "../components/AudioRecorder";
import { CustomAudioPlayer } from "../components/CustomAudioPlayer";

const UNLOCK_DURATIONS = [
  { label: "بعد أسبوع", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "بعد شهر", value: 30 * 24 * 60 * 60 * 1000 },
  { label: "بعد ٣ أشهر", value: 90 * 24 * 60 * 60 * 1000 },
  { label: "بعد ٦ أشهر", value: 180 * 24 * 60 * 60 * 1000 },
  { label: "بعد سنة", value: 365 * 24 * 60 * 60 * 1000 },
];

export function InboxPage() {
  const [settings, setSettings] = useState<any>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useLockBodyScroll(isAdding || !!selectedMessage);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState(UNLOCK_DURATIONS[1].value);
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<(string | Blob)[]>([]);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      try {
        await loadSettings();
        await loadMessages();
      } finally {
        setIsLoading(false);
      }
    };
    loadAll();
    // Setup a timer to refresh the lock status every minute
    const interval = setInterval(loadMessages, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    const s = await db.settings.get();
    setSettings(s);
  };

  const handleHideIntro = async () => {
    if (settings) {
      const updated = { ...settings, hideInboxIntro: true };
      await db.settings.save(updated);
      setSettings(updated);
    }
  };

  const loadMessages = async () => {
    const loadedMessages = await db.inbox.getAll();
    setMessages(loadedMessages);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    const now = Date.now();
    const message: InboxMessage = {
      id: `inbox_${now}`,
      title: title.trim(),
      content: content.trim(),
      createdAt: now,
      unlockDate: now + duration,
      isRead: false,
      audioData,
    };

    await db.inbox.save(message);

    setTitle("");
    setContent("");
    setAudioData([]);
    setDuration(UNLOCK_DURATIONS[1].value);
    setIsAdding(false);

    loadMessages();
  };

  const handleDelete = async (id: string) => {
    await db.inbox.delete(id);
    if (selectedMessage?.id === id) {
      setSelectedMessage(null);
    }
    loadMessages();
  };

  const handleOpenMessage = async (msg: InboxMessage) => {
    if (Date.now() < msg.unlockDate) return; // Still locked

    setSelectedMessage(msg);
    if (!msg.isRead) {
      const updatedMsg = { ...msg, isRead: true };
      await db.inbox.save(updatedMsg);
      loadMessages();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      {(settings && !settings.hideInboxIntro) && (
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
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-olive-900">
                صندوق الوارد
              </h1>
              <p className="text-sm text-olive-600 mt-1 leading-relaxed">
                رسائل، أدعية، وأهداف لنفسك المستقبلية تفتحها في الوقت الذي تحدده.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-olive-900 text-paper rounded-xl hover:bg-olive-800 transition-all duration-300 font-bold shadow-md shadow-olive-900/10 hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          <span>رسالة جديدة</span>
        </button>
      </div>

      {/* FAB for Mobile */}
      <button
        onClick={() => setIsAdding(true)}
        className="md:hidden fixed bottom-24 left-6 w-14 h-14 bg-olive-900 text-paper rounded-full shadow-lg shadow-olive-900/20 flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Message Form (Modal) */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm">
          <div className="bg-card w-full md:max-w-2xl h-[90vh] md:h-auto md:max-h-[90vh] rounded-t-3xl md:rounded-3xl border border-olive-200 shadow-2xl flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-300">
            <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mt-3 mb-1 md:hidden" />
            <div className="flex justify-between items-center p-6 border-b border-olive-100">
              <h2 className="font-serif text-xl font-bold text-olive-900">
                رسالة للمستقبل
              </h2>
              <button
                onClick={() => setIsAdding(false)}
                className="p-2 text-olive-400 hover:text-olive-900 hover:bg-olive-100 rounded-lg transition-all duration-200 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-olive-600">
                    عنوان الرسالة
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تذكير بنية طلب العلم، أو دعاء..."
                    className="w-full font-serif text-lg bg-paper-dark/20 border border-olive-200 rounded-xl p-3 focus:outline-none focus:border-olive-600 transition-colors"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-olive-600">
                    متى تود فتحها؟
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-paper-dark/20 border border-olive-200 rounded-xl p-3 focus:outline-none focus:border-olive-600 transition-colors appearance-none"
                  >
                    {UNLOCK_DURATIONS.map((d) => (
                      <option key={d.label} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-olive-600">
                  نص الرسالة
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full bg-paper-dark/20 border border-olive-200 rounded-xl p-4 focus:outline-none focus:border-olive-600 transition-colors resize-none leading-relaxed"
                  placeholder="اكتب ما تود قراءته في المستقبل ليعطيك دفعة معنوية..."
                ></textarea>
              </div>

              {/* Audio Records in Form */}
              {audioData.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-olive-600">التسجيلات الصوتية</label>
                  {audioData.map((audio, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden bg-olive-50/50 border border-olive-100 p-2">
                      <CustomAudioPlayer src={audio} />
                      <button
                        onClick={() => setAudioData(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Audio Recorder in Form */}
              {isRecording ? (
                <AudioRecorder
                  onSave={(blob) => {
                    setAudioData(prev => [...prev, blob]);
                    setIsRecording(false);
                  }}
                  onCancel={() => setIsRecording(false)}
                />
              ) : (
                <button
                  onClick={() => setIsRecording(true)}
                  className="flex items-center gap-2 text-olive-600 hover:text-olive-900 font-bold text-sm transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  <span>إضافة تسجيل صوتي</span>
                </button>
              )}
              <div className="flex justify-end pt-4 pb-safe">
                <button
                  onClick={handleSave}
                  disabled={!title.trim() || !content.trim()}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-olive-900 text-paper rounded-xl hover:bg-olive-800 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال للمستقبل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Read Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-olive-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-paper w-full md:max-w-2xl h-[90vh] md:h-auto md:max-h-[90vh] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-300">
            <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mt-3 mb-1 md:hidden" />
            <div className="p-6 border-b border-olive-200/50 flex justify-between items-center bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-olive-100 text-olive-900 rounded-xl">
                  <MailOpen className="w-5 h-5" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-olive-900">
                  {selectedMessage.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-2 text-olive-400 hover:text-olive-900 hover:bg-olive-100 rounded-lg transition-all duration-200 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1">
              <div className="text-sm text-olive-400 mb-6 flex justify-between">
                <span>
                  كُتبت في:{" "}
                  {new Date(selectedMessage.createdAt).toLocaleDateString(
                    "ar-EG",
                  )}
                </span>
                <span>
                  فُتحت في:{" "}
                  {new Date(selectedMessage.unlockDate).toLocaleDateString(
                    "ar-EG",
                  )}
                </span>
              </div>
              <p className="text-olive-900 leading-loose text-lg whitespace-pre-wrap font-serif">
                {selectedMessage.content}
              </p>

              {/* Audio Records in Read Modal */}
              {selectedMessage.audioData && selectedMessage.audioData.length > 0 && (
                <div className="space-y-3 pt-6 mt-6 border-t border-olive-100">
                  <h4 className="text-sm font-bold text-olive-600">التسجيلات الصوتية:</h4>
                  {selectedMessage.audioData.map((audio, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden bg-olive-50/50 border border-olive-100 p-2">
                      <CustomAudioPlayer src={audio} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-[1.5rem]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {messages.length === 0 ? (
            <div className="col-span-full text-center py-16 text-olive-400 bg-card rounded-[2rem] border border-olive-100 border-dashed">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">لا توجد رسائل. ابدأ بكتابة رسالة لنفسك المستقبلية!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isLocked = Date.now() < msg.unlockDate;
              const timeRemaining = isLocked
                ? formatDistanceToNow(msg.unlockDate, {
                    locale: ar,
                    addSuffix: true,
                  })
                : "";

              return (
                <div
                  key={msg.id}
                  onClick={() => handleOpenMessage(msg)}
                  className={cn(
                    "relative p-6 rounded-[1.5rem] border transition-all duration-300 group overflow-hidden",
                    isLocked
                      ? "bg-paper-dark/30 border-olive-200/50 cursor-not-allowed"
                      : "bg-card border-olive-200/40 shadow-sm hover:shadow-lg hover:shadow-olive-900/5 cursor-pointer",
                    !msg.isRead &&
                      !isLocked &&
                      "ring-2 ring-olive-600 border-transparent",
                  )}
                >
                  {/* Background Pattern for locked */}
                  {isLocked && (
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                      <svg
                        width="100%"
                        height="100%"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <defs>
                          <pattern
                          id="lock-pattern"
                          x="0"
                          y="0"
                          width="20"
                          height="20"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M10 0L20 10L10 20L0 10Z"
                            fill="currentColor"
                          />
                        </pattern>
                      </defs>
                      <rect
                        width="100%"
                        height="100%"
                        fill="url(#lock-pattern)"
                      />
                    </svg>
                  </div>
                )}

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div
                    className={cn(
                      "p-3 rounded-2xl transition-colors duration-300",
                      isLocked
                        ? "bg-olive-200/50 text-olive-600"
                        : "bg-olive-50 text-olive-600 group-hover:bg-olive-600 group-hover:text-paper shadow-sm",
                    )}
                  >
                    {isLocked ? (
                      <Lock className="w-6 h-6" />
                    ) : (
                      <MailOpen className="w-6 h-6" />
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(msg.id);
                    }}
                    className="p-2 text-olive-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-95"
                    title="حذف"
                    aria-label="حذف الرسالة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative z-10">
                  <h3
                    className={cn(
                      "font-serif text-xl font-bold mb-2 transition-colors",
                      isLocked ? "text-olive-800/70" : "text-olive-900 group-hover:text-olive-700",
                    )}
                  >
                    {isLocked ? "رسالة مقفلة" : msg.title}
                  </h3>

                  <p
                    className={cn(
                      "text-sm font-medium",
                      isLocked ? "text-olive-600" : "text-olive-500",
                    )}
                  >
                    {isLocked ? `تُفتح ${timeRemaining}` : "متاحة للقراءة"}
                  </p>
                  
                  {msg.audioData && msg.audioData.length > 0 && !isLocked && (
                    <div className="mt-3 flex items-center gap-1.5 text-olive-600">
                      <Mic className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">تتضمن تسجيلاً صوتياً</span>
                    </div>
                  )}
                </div>

                {!msg.isRead && !isLocked && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50"></div>
                )}
                
                {!isLocked && (
                  <div className="absolute top-0 right-0 w-2 h-full bg-olive-200/30 group-hover:bg-olive-400/50 transition-colors duration-300"></div>
                )}
              </div>
            );
          })
        )}
        </div>
      )}
    </div>
  );
}

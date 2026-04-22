import { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Save,
  Trash2,
  Library,
  Play,
  Pause,
  AlertCircle,
  Waves,
  FileText,
  Clock,
  X
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { db, AudioRecord } from "@/src/lib/db";
import { useNotification } from "../components/NotificationProvider";
import { CustomAudioPlayer } from "../components/CustomAudioPlayer";
import { Skeleton } from "../components/Skeleton";

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import RecordRTC from "recordrtc";

export function AudioPage() {
  const [settings, setSettings] = useState<any>(null);
  const [records, setRecords] = useState<AudioRecord[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Recording state
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Refs for media and speech
  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  const { addNotification } = useNotification();

  useEffect(() => {
    loadSettings();
    loadRecords();

    // Check for SpeechRecognition support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    } else {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "ar-SA"; // Arabic language

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
      };
    }
  }, []);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const loadedRecords = await db.audio.getAll();
      setRecords(loadedRecords);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    const s = await db.settings.get();
    setSettings(s);
  };

  const handleHideIntro = async () => {
    if (settings) {
      const updated = { ...settings, hideAudioIntro: true };
      await db.settings.save(updated);
      setSettings(updated);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      recorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm', // WebM is good for Chrome, RecordRTC handles Safari fallbacks or we can use audio/wav
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
      });

      recorderRef.current.startRecording();
      if (recognitionRef.current) {
        setTranscript("");
        recognitionRef.current.start();
      }
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      addNotification({
        title: "خطأ في الميكروفون",
        message:
          "تعذر الوصول إلى الميكروفون. يرجى التأكد من إعطاء الصلاحيات اللازمة.",
        type: "warning",
      });
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current!.getBlob();
        setAudioBlob(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      });
    }
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSave = async () => {
    if (!title.trim() && !transcript.trim() && !audioBlob) return;

    const record: AudioRecord = {
      id: `audio_${Date.now()}`,
      title: title.trim() || "تسجيل صوتي بدون عنوان",
      date: Date.now(),
      audioData: audioBlob,
      transcript: transcript.trim(),
    };

    // Optimistic UI Update
    setRecords((prev) => [record, ...prev]);

    // Reset state
    setTitle("");
    setTranscript("");
    setAudioBlob(null);

    // Save to DB
    try {
      await db.audio.save(record);
    } catch (error: any) {
      // Revert optimistic update on failure
      loadRecords();
      addNotification({
        title: "خطأ في الحفظ",
        message: error.message,
        type: "warning"
      });
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic UI Update
    setRecords((prev) => prev.filter((r) => r.id !== id));
    await db.audio.delete(id);
  };

  const handleDiscard = () => {
    setTitle("");
    setTranscript("");
    setAudioBlob(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8">
      {/* Header */}
      {(settings && !settings.hideAudioIntro) && (
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
              <Library className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-olive-900">
                تسجيل المحاضرة
              </h1>
              <p className="text-sm text-olive-600 mt-1 leading-relaxed">
                سجل الدروس والمجالس العلمية للرجوع إليها لاحقاً وتثبيت العلم.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isSupported && (
        <div className="bg-sand-light/50 border border-sand p-4 rounded-xl flex items-start gap-3 text-olive-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-olive-600" />
          <p className="text-sm leading-relaxed">
            متصفحك الحالي لا يدعم ميزة "التعرف على الصوت" (Speech-to-Text) بشكل
            كامل. يمكنك الاستمرار في تسجيل الصوت، لكن التفريغ التلقائي قد لا
            يعمل. يفضل استخدام متصفح Google Chrome للحصول على أفضل تجربة.
          </p>
        </div>
      )}

      {/* Recorder Section */}
      <div className="bg-card p-6 lg:p-10 rounded-[2rem] border border-olive-200/40 shadow-sm space-y-8 relative overflow-hidden">
        {/* FAB for Mobile */}
        <button
          onClick={() => {
            if (!isRecording) startRecording();
            else stopRecording();
          }}
          className="lg:hidden fixed bottom-24 left-6 w-14 h-14 bg-olive-900 text-paper rounded-full shadow-lg shadow-olive-900/20 flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-all"
        >
          {isRecording ? <div className="w-5 h-5 bg-red-500 rounded-sm" /> : <Mic className="w-6 h-6" />}
        </button>
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-olive-200 to-transparent opacity-50"></div>
        <div className="flex flex-col items-center justify-center py-8">
          {!isRecording && !audioBlob ? (
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-olive-200 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
                <button
                  onClick={startRecording}
                  className="relative w-32 h-32 rounded-full bg-gradient-to-br from-olive-800 to-olive-900 text-paper flex items-center justify-center hover:from-olive-700 hover:to-olive-800 transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-olive-900/20 group-hover:shadow-2xl group-hover:shadow-olive-900/30"
                >
                  <Mic className="w-12 h-12" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-olive-900 font-bold text-lg">
                  اضغط لبدء التسجيل
                </span>
                <span className="text-olive-400 text-sm">
                  التفريغ التلقائي (قريباً)
                </span>
              </div>
            </div>
          ) : isRecording ? (
            <div className="flex flex-col items-center gap-8">
              <div className="relative flex items-center justify-center w-40 h-40">
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                <div className="absolute inset-4 bg-red-500/10 rounded-full animate-pulse"></div>
                <button
                  onClick={stopRecording}
                  className="relative w-28 h-28 rounded-full bg-gradient-to-br from-red-50 to-red-100 text-red-600 flex items-center justify-center hover:from-red-100 hover:to-red-200 transition-all duration-300 shadow-lg shadow-red-500/20 active:scale-95 border border-red-200"
                >
                  <Square className="w-10 h-10 fill-current" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  جاري التسجيل...
                </div>
                <div className="flex items-center gap-1 text-olive-400 text-sm">
                  <Waves className="w-4 h-4" />
                  <span>التفريغ التلقائي (قريباً)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between bg-gradient-to-r from-olive-50 to-transparent p-4 lg:p-5 rounded-2xl border border-olive-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-olive-200/50 text-olive-900 rounded-xl">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block font-bold text-olive-900 text-lg">
                      تم إيقاف التسجيل
                    </span>
                    <span className="text-sm text-olive-600">
                      يمكنك مراجعة التسجيل والتفريغ قبل الحفظ
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleDiscard}
                  className="text-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors font-bold border border-transparent hover:border-red-100"
                >
                  إلغاء
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-olive-600 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    عنوان التسجيل
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: شرح كتاب الصيام - الدرس الأول"
                    className="w-full font-serif text-xl bg-paper-dark/20 border border-olive-200/60 rounded-xl p-4 focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-olive-600 flex items-center gap-2">
                    <Waves className="w-4 h-4" />
                    التفريغ النصي
                  </label>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={6}
                    className="w-full bg-paper-dark/20 border border-olive-200/60 rounded-xl p-4 focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500 transition-all resize-none leading-relaxed text-olive-900"
                    placeholder="سيظهر التفريغ هنا... يمكنك التعديل عليه."
                  ></textarea>
                </div>

                {audioBlob && (
                  <div className="pt-2">
                    <CustomAudioPlayer src={audioBlob} />
                  </div>
                )}

                <div className="flex justify-end pt-6 border-t border-olive-100/50">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-olive-800 to-olive-900 text-paper rounded-xl hover:from-olive-700 hover:to-olive-800 transition-all duration-300 font-bold shadow-md shadow-olive-900/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                  >
                    <Save className="w-5 h-5" />
                    <span>حفظ في المكتبة</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {isRecording && transcript && (
          <div className="mt-6 p-6 lg:p-8 bg-gradient-to-br from-paper-dark/40 to-paper-dark/10 rounded-2xl border border-olive-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-olive-400/50"></div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <h3 className="text-xs font-bold text-olive-600 uppercase tracking-widest">
                تفريغ مباشر
              </h3>
            </div>
            <p className="text-olive-900 leading-relaxed font-serif text-lg lg:text-xl">
              {transcript}
            </p>
          </div>
        )}
      </div>

      {/* Saved Records List */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-olive-100 rounded-xl text-olive-900">
            <Clock className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-xl lg:text-2xl font-bold text-olive-900">
            التسجيلات السابقة
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-[1.5rem]" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-olive-400 bg-card rounded-[2rem] border border-olive-100 border-dashed">
            <Library className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">لا توجد تسجيلات. ابدأ بتسجيل مجلسك الأول!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-card p-6 lg:p-8 rounded-[1.5rem] border border-olive-200/40 shadow-sm hover:shadow-lg hover:shadow-olive-900/5 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-olive-200/30 group-hover:bg-olive-400/50 transition-colors duration-300"></div>
                <div className="flex justify-between items-start mb-6 pl-2">
                  <div>
                    <h3 className="font-serif text-xl lg:text-2xl font-bold text-olive-900 mb-2 group-hover:text-olive-700 transition-colors">
                      {record.title}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-olive-50 text-olive-600 text-xs font-medium border border-olive-100/50">
                      <Clock className="w-3 h-3" />
                      {new Date(record.date).toLocaleDateString("ar-EG", {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="p-2.5 text-olive-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-95"
                    title="حذف"
                    aria-label="حذف التسجيل"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {record.audioData && (
                  <div className="mb-6 pl-2">
                    <CustomAudioPlayer src={record.audioData} />
                  </div>
                )}

                {record.transcript && (
                  <div className="bg-gradient-to-br from-paper-dark/30 to-paper-dark/10 p-5 lg:p-6 rounded-2xl border border-olive-100/50 relative">
                    <div className="absolute top-4 right-4 text-olive-200">
                      <FileText className="w-6 h-6 opacity-50" />
                    </div>
                    <p className="text-olive-800 leading-relaxed text-sm lg:text-base whitespace-pre-wrap relative z-10">
                      {record.transcript}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

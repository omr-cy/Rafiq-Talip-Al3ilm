import { useState, useEffect, useRef } from "react";
import { Mic, Square, Trash2, Play, Pause, Waves, X } from "lucide-react";
import RecordRTC from "recordrtc";
import { useNotification } from "./NotificationProvider";
import { CustomAudioPlayer } from "./CustomAudioPlayer";
import { cn } from "@/src/lib/utils";

interface AudioRecorderProps {
  onSave: (blob: Blob) => void;
  onCancel: () => void;
  className?: string;
}

export function AudioRecorder({ onSave, onCancel, className }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { addNotification } = useNotification();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      recorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
      });

      recorderRef.current.startRecording();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      addNotification({
        title: "خطأ في الميكروفون",
        message: "تعذر الوصول إلى الميكروفون. يرجى التأكد من إعطاء الصلاحيات اللازمة.",
        type: "warning",
      });
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current!.getBlob();
        setAudioBlob(blob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      });
    }
    setIsRecording(false);
  };

  const handleSave = () => {
    if (audioBlob) {
      onSave(audioBlob);
    }
  };

  const handleDiscard = () => {
    setAudioBlob(null);
    if (isRecording) {
      stopRecording();
    }
    onCancel();
  };

  return (
    <div className={cn("bg-paper-dark/30 border border-olive-200/60 rounded-2xl p-6 space-y-6", className)}>
      <div className="flex flex-col items-center justify-center py-4">
        {!isRecording && !audioBlob ? (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-olive-800 text-paper flex items-center justify-center hover:bg-olive-700 transition-all shadow-lg active:scale-95"
            >
              <Mic className="w-8 h-8" />
            </button>
            <span className="text-olive-900 font-bold">اضغط لبدء التسجيل</span>
          </div>
        ) : isRecording ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
              <button
                onClick={stopRecording}
                className="relative w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shadow-lg active:scale-95"
              >
                <Square className="w-6 h-6 fill-current" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-red-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              جاري التسجيل...
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between bg-olive-50/50 p-4 rounded-xl border border-olive-100">
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-olive-600" />
                <span className="font-bold text-olive-900">تم التسجيل</span>
              </div>
              <button
                onClick={() => setAudioBlob(null)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {audioBlob && <CustomAudioPlayer src={audioBlob} />}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-olive-900 text-paper rounded-xl font-bold hover:bg-olive-800 transition-colors active:scale-95"
              >
                إضافة التسجيل
              </button>
              <button
                onClick={handleDiscard}
                className="px-6 py-3 border border-olive-200 text-olive-600 rounded-xl font-bold hover:bg-olive-50 transition-colors active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

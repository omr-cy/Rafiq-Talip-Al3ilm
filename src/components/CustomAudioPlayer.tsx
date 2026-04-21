import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface CustomAudioPlayerProps {
  src: string | Blob;
}

export function CustomAudioPlayer({ src }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");

  useEffect(() => {
    let url = "";
    if (src instanceof Blob) {
      url = URL.createObjectURL(src);
      setAudioUrl(url);
    } else if (typeof src === "string") {
      setAudioUrl(src);
    }

    return () => {
      if (src instanceof Blob && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = (Number(e.target.value) / 100) * duration;
      audioRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4 bg-paper-dark/30 p-3 md:p-4 rounded-2xl border border-olive-200/50 shadow-sm" dir="ltr">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <button
        onClick={togglePlayPause}
        className="w-10 h-10 shrink-0 flex items-center justify-center bg-olive-900 text-paper rounded-full hover:bg-olive-800 transition-all duration-200 shadow-md active:scale-95"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-1" />
        )}
      </button>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs font-medium text-olive-600 w-10 text-right">
          {formatTime(currentTime)}
        </span>
        
        <div className="relative flex-1 flex items-center h-5 group">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="w-full h-1.5 bg-olive-200/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-olive-600 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Custom thumb */}
          <div 
            className="absolute h-3 w-3 bg-olive-900 rounded-full shadow-sm pointer-events-none transition-transform group-hover:scale-125"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        <span className="text-xs font-medium text-olive-600 w-10">
          {formatTime(duration)}
        </span>
      </div>

      <button
        onClick={toggleMute}
        className="w-8 h-8 shrink-0 flex items-center justify-center text-olive-600 hover:text-olive-900 hover:bg-olive-100 rounded-full transition-all duration-200 active:scale-95"
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

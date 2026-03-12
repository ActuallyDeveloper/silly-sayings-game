import { Play, Pause } from "lucide-react";
import { useState, useRef } from "react";

interface MediaMessageProps {
  type: "voice" | "video" | "image";
  url: string;
}

const MediaMessage = ({ type, url }: MediaMessageProps) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (type === "image") {
    return (
      <img src={url} alt="Shared image" className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer"
        onClick={() => window.open(url, "_blank")} loading="lazy" />
    );
  }

  if (type === "video") {
    return (
      <video src={url} controls className="max-w-[240px] max-h-[180px] rounded-lg" preload="metadata" />
    );
  }

  // Voice
  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 min-w-[140px]">
      <button
        onClick={() => {
          if (playing) { audioRef.current?.pause(); }
          else { audioRef.current?.play(); }
          setPlaying(!playing);
        }}
        className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center active:scale-95 transition-transform"
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-muted-foreground/20 rounded-full">
          <div className="h-1 bg-accent rounded-full w-0 transition-all" />
        </div>
        <span className="text-[10px] text-muted-foreground">Voice</span>
      </div>
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} preload="metadata" />
    </div>
  );
};

export default MediaMessage;

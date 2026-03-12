import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, Camera, ImagePlus, X } from "lucide-react";

interface MediaCaptureProps {
  onCapture: (file: File, type: "voice" | "video" | "image") => void;
  disabled?: boolean;
}

const MediaCapture = ({ onCapture, disabled }: MediaCaptureProps) => {
  const [recording, setRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"voice" | "video" | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async (type: "voice" | "video") => {
    try {
      const constraints = type === "voice"
        ? { audio: true }
        : { audio: true, video: { facingMode: "user" } };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setRecordingType(type);
      setRecording(true);

      if (type === "video" && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
        videoPreviewRef.current.play();
      }

      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const mimeType = type === "voice" ? "audio/webm" : "video/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = type === "voice" ? "webm" : "webm";
        const file = new File([blob], `${type}-${Date.now()}.${ext}`, { type: mimeType });
        onCapture(file, type);
        cleanup();
      };

      recorder.start();
    } catch {
      // Permission denied or not supported
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const cleanup = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setRecording(false);
    setRecordingType(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let type: "image" | "voice" | "video" = "image";
    if (file.type.startsWith("audio/")) type = "voice";
    else if (file.type.startsWith("video/")) type = "video";
    onCapture(file, type);
    e.target.value = "";
  };

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        {recordingType === "video" && (
          <video ref={videoPreviewRef} className="w-16 h-12 rounded object-cover" muted />
        )}
        <div className="flex items-center gap-1 text-destructive">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-bold">Recording...</span>
        </div>
        <Button size="sm" variant="destructive" onClick={stopRecording} className="h-8 w-8 p-0">
          <MicOff className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={cleanup} className="h-8 w-8 p-0">
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => startRecording("voice")} disabled={disabled}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Voice message">
        <Mic className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => startRecording("video")} disabled={disabled}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Video message">
        <Video className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => cameraInputRef.current?.click()} disabled={disabled}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Camera">
        <Camera className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={disabled}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Upload media">
        <ImagePlus className="w-4 h-4" />
      </Button>
      <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleFileUpload} />
      <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleFileUpload} />
    </div>
  );
};

export default MediaCapture;

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, Camera, ImagePlus, X, Square, Send, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MediaCaptureProps {
  onCapture: (file: File, type: "voice" | "video" | "image") => void;
  disabled?: boolean;
  mode?: "singleplayer" | "multiplayer";
}

const MediaCapture = ({ onCapture, disabled, mode = "multiplayer" }: MediaCaptureProps) => {
  const [recording, setRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"voice" | "video" | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo");
  const [cameraRecording, setCameraRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedType, setRecordedType] = useState<"voice" | "video" | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [analyserData, setAnalyserData] = useState<number[]>(new Array(20).fill(0));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Single player: only show file upload
  if (mode === "singleplayer") {
    return null;
  }

  // Voice recording
  const startVoiceRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      setVoiceRecording(true);
      setVoiceDuration(0);
      setRecordedBlob(null);
      setRecordedType(null);

      // Audio analyser for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        setAnalyserData(Array.from(data.slice(0, 20)).map(v => v / 255));
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      // Timer
      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration(prev => {
          if (prev >= 60) {
            stopVoiceRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setRecordedType("voice");
        cleanupVoiceRecording();
      };
      recorder.start();
    } catch { /* Permission denied */ }
  };

  const stopVoiceRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const cleanupVoiceRecording = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setVoiceRecording(false);
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    audioContextRef.current?.close();
    analyserRef.current = null;
    setAnalyserData(new Array(20).fill(0));
  };

  const sendRecordedVoice = () => {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    onCapture(file, "voice");
    setRecordedBlob(null);
    setRecordedType(null);
    setVoiceDuration(0);
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordedType(null);
    setVoiceDuration(0);
    cleanupVoiceRecording();
  };

  // Camera modal
  const openCamera = async (captureMode: "photo" | "video") => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: captureMode === "video",
      });
      cameraStreamRef.current = mediaStream;
      setCameraMode(captureMode);
      setShowCameraModal(true);
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = mediaStream;
          cameraVideoRef.current.play();
        }
      }, 100);
    } catch { /* Permission denied */ }
  };

  const capturePhoto = () => {
    if (!cameraVideoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = cameraVideoRef.current.videoWidth;
    canvas.height = cameraVideoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(cameraVideoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file, "image");
      }
      closeCameraModal();
    }, "image/jpeg", 0.9);
  };

  const startCameraRecording = () => {
    if (!cameraStreamRef.current) return;
    setCameraRecording(true);
    const recorder = new MediaRecorder(cameraStreamRef.current);
    cameraRecorderRef.current = recorder;
    cameraChunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) cameraChunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(cameraChunksRef.current, { type: "video/webm" });
      const file = new File([blob], `video-${Date.now()}.webm`, { type: "video/webm" });
      onCapture(file, "video");
      closeCameraModal();
    };
    recorder.start();
    // Auto-stop at 60 seconds
    setTimeout(() => {
      if (cameraRecorderRef.current?.state === "recording") {
        cameraRecorderRef.current.stop();
        setCameraRecording(false);
      }
    }, 60000);
  };

  const stopCameraRecording = () => {
    cameraRecorderRef.current?.stop();
    setCameraRecording(false);
  };

  const closeCameraModal = () => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setShowCameraModal(false);
    setCameraRecording(false);
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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Show recorded voice with send/delete
  if (recordedBlob && recordedType === "voice") {
    return (
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5 flex-1 bg-muted/50 rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground font-mono">{formatTime(voiceDuration)}</span>
          <div className="flex items-center gap-0.5 flex-1">
            {analyserData.map((v, i) => (
              <div key={i} className="w-1 bg-accent/60 rounded-full" style={{ height: `${Math.max(3, v * 16)}px` }} />
            ))}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={discardRecording} className="h-8 w-8 p-0 text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={sendRecordedVoice} className="h-8 w-8 p-0 bg-accent text-accent-foreground">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Voice recording state
  if (voiceRecording) {
    return (
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-mono text-destructive">{formatTime(voiceDuration)}</span>
          <div className="flex items-center gap-0.5 flex-1">
            {analyserData.map((v, i) => (
              <motion.div
                key={i}
                className="w-1 bg-accent rounded-full"
                animate={{ height: `${Math.max(3, v * 20)}px` }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>
        </div>
        <Button size="sm" variant="destructive" onClick={stopVoiceRecording} className="h-8 w-8 p-0">
          <Square className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => openCamera("photo")} disabled={disabled}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Take photo">
          <Camera className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => openCamera("video")} disabled={disabled}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Record video">
          <Video className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={disabled}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Upload media">
          <ImagePlus className="w-4 h-4" />
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Voice recorder bar */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-0.5 flex-1 h-5">
          {analyserData.map((_, i) => (
            <div key={i} className="w-1 bg-muted-foreground/20 rounded-full" style={{ height: "3px" }} />
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={startVoiceRecording} disabled={disabled}
          className="h-8 w-8 p-0 text-accent hover:text-accent hover:bg-accent/10" title="Record voice message">
          <Mic className="w-4 h-4" />
        </Button>
      </div>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCameraModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && !cameraRecording && closeCameraModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-secondary rounded-xl overflow-hidden w-full max-w-sm border border-border"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-bold text-foreground">
                  {cameraMode === "photo" ? "Take Photo" : "Record Video"}
                </span>
                <Button size="sm" variant="ghost" onClick={closeCameraModal} disabled={cameraRecording}
                  className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative aspect-[4/3] bg-black">
                <video ref={cameraVideoRef} className="w-full h-full object-cover" muted playsInline />
                {cameraRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-destructive/80 text-destructive-foreground rounded-full px-2.5 py-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-xs font-bold">REC</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 p-4">
                {cameraMode === "photo" ? (
                  <Button onClick={capturePhoto}
                    className="bg-accent text-accent-foreground hover:bg-accent/80 rounded-full w-14 h-14 p-0">
                    <Camera className="w-6 h-6" />
                  </Button>
                ) : cameraRecording ? (
                  <Button onClick={stopCameraRecording} variant="destructive"
                    className="rounded-full w-14 h-14 p-0">
                    <Square className="w-6 h-6" />
                  </Button>
                ) : (
                  <Button onClick={startCameraRecording}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/80 rounded-full w-14 h-14 p-0">
                    <Video className="w-6 h-6" />
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MediaCapture;

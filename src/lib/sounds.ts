// Sound effects using Web Audio API - no external files needed
const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;
let _enabled = true;

export function setSoundEnabled(v: boolean) { _enabled = v; }

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export function playCardSelect() {
  playTone(880, 0.08, "sine", 0.1);
}

export function playCardSubmit() {
  playTone(523, 0.1, "triangle", 0.12);
  setTimeout(() => playTone(659, 0.1, "triangle", 0.12), 80);
  setTimeout(() => playTone(784, 0.15, "triangle", 0.12), 160);
}

export function playWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.2, "sine", 0.12), i * 120);
  });
}

export function playLose() {
  playTone(400, 0.15, "sawtooth", 0.08);
  setTimeout(() => playTone(300, 0.2, "sawtooth", 0.08), 150);
  setTimeout(() => playTone(200, 0.35, "sawtooth", 0.06), 300);
}

export function playNewRound() {
  playTone(440, 0.1, "square", 0.06);
  setTimeout(() => playTone(554, 0.15, "square", 0.06), 100);
}

export function playGameOver() {
  const notes = [784, 659, 523, 392];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.3, "sine", 0.1), i * 200);
  });
}

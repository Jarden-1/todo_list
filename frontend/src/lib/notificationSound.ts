import type { RingtoneConfig } from "../contexts/SettingsContext";

let audioContext: AudioContext | null = null;
const audioElements = new Map<string, HTMLAudioElement>();

const SOUND_PATHS: Record<string, string | null> = {
  chime: "/sounds/airplane-chime.ogg",
  soft: "/sounds/airplane-chime.ogg",
  bell: "/sounds/airplane-chime.ogg",
  none: null,
};

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return null;
  audioContext ??= new AudioContextCtor();
  return audioContext;
}

function playFallbackTone(volume: number) {
  const context = getAudioContext();
  if (!context) return;

  const play = () => {
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.02), now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    gain.connect(context.destination);

    [784, 988].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.12);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.012, now + index * 0.12 + 0.22);
      oscillator.connect(gain);
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + index * 0.12 + 0.28);
    });
  };

  if (context.state === "suspended") {
    void context.resume().then(play).catch(() => {});
    return;
  }

  play();
}

export function playNotificationSound(config: Pick<RingtoneConfig, "sound" | "volume">) {
  const src = SOUND_PATHS[config.sound] ?? SOUND_PATHS.chime;
  if (!src) return;

  const volume = Math.min(Math.max(config.volume / 100, 0), 1);
  const audio = audioElements.get(src) ?? new Audio(src);
  audioElements.set(src, audio);
  audio.currentTime = 0;
  audio.volume = volume;

  void audio.play().catch(() => {
    playFallbackTone(volume * 0.18);
  });
}

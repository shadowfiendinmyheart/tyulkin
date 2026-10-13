// mechanical keyboard clicks (TASK-67): a short burst of noise through a band-pass filter,
// synthesized with Web Audio, so no sound files are downloaded

// keys that only modify others make no click, as on a real keyboard they are rarely heard
const SILENT_KEYS = ["Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock", "Fn"];
// big keys sound lower
const LOW_KEYS = ["Enter", " ", "Backspace", "Delete", "Tab"];

const CLICK_SECONDS = 0.04;
const VOLUME = 0.25;

let context: AudioContext | undefined;
let noise: AudioBuffer | undefined;

// created lazily: browsers allow audio only after a user gesture, and a keydown is one
const getContext = (): AudioContext | undefined => {
  if (context) return context;
  // older Safari has only the prefixed constructor
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  context = new AudioContextClass();
  return context;
};

// white noise, made once and replayed by every click
const getNoise = (ctx: AudioContext) => {
  if (noise) return noise;
  noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * CLICK_SECONDS), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
};

export const isClickingKey = (e: { key: string; repeat: boolean; isComposing: boolean }) =>
  // a held key repeats silently, as a real one does not click again;
  // IME composition keys (key "Process") may commit nothing, so they are silent too
  !e.repeat && !e.isComposing && !SILENT_KEYS.includes(e.key);

// `set sound off`: the idle context releases the audio device until sound is on again
export const suspendKeySound = () => {
  if (context?.state !== "running") return;
  context.suspend().catch(() => undefined);
};

export const playKeyClick = (key: string) => {
  try {
    const ctx = getContext();
    if (!ctx) return;
    // a context created before a gesture (or paused by the browser) starts suspended
    // a rejected resume (no audio device) leaves the page silent, not an unhandled rejection
    if (ctx.state === "suspended") ctx.resume().catch(() => undefined);

    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = getNoise(ctx);
    // a little randomness, so a run of keys doesn't sound like a machine gun
    source.playbackRate.value = 0.85 + Math.random() * 0.3;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = LOW_KEYS.includes(key) ? 1400 : 2800;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + CLICK_SECONDS);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + CLICK_SECONDS);
  } catch {
    // ignore: sound is decoration, typing must keep working without it
  }
};

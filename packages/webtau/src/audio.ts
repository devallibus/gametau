/**
 * webtau/audio — Audio foundation module for web builds.
 *
 * Provides a lightweight wrapper over Web Audio that works as a no-op
 * in non-audio environments (tests/SSR).
 */

export interface PlayToneOptions {
  type?: OscillatorType;
  gain?: number;
}

export interface AudioController {
  isSupported(): boolean;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
  getMasterVolume(): number;
  setMasterVolume(volume: number): void;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  playTone(frequency: number, durationMs: number, options?: PlayToneOptions): Promise<void>;
}

interface GainNodeLike {
  gain: { value: number };
  connect(destination: unknown): void;
}

interface OscillatorNodeLike {
  type: OscillatorType;
  frequency: { value: number };
  connect(destination: unknown): void;
  start(when?: number): void;
  stop(when?: number): void;
}

interface AudioContextLike {
  currentTime: number;
  destination: unknown;
  createGain(): GainNodeLike;
  createOscillator(): OscillatorNodeLike;
  resume?(): Promise<void>;
  suspend?(): Promise<void>;
}

export interface AudioControllerOptions {
  contextFactory?: () => AudioContextLike | null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function defaultContextFactory(): AudioContextLike | null {
  const Ctor = (globalThis as { AudioContext?: { new (): AudioContextLike } }).AudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

export function createAudioController(options: AudioControllerOptions = {}): AudioController {
  const contextFactory = options.contextFactory ?? defaultContextFactory;

  let context: AudioContextLike | null = null;
  let masterGain: GainNodeLike | null = null;
  let muted = false;
  let masterVolume = 1;

  function ensureContext(): AudioContextLike | null {
    if (context) return context;
    context = contextFactory();
    if (!context) return null;

    masterGain = context.createGain();
    masterGain.gain.value = muted ? 0 : masterVolume;
    masterGain.connect(context.destination);
    return context;
  }

  function syncMasterGain(): void {
    if (!masterGain) return;
    masterGain.gain.value = muted ? 0 : masterVolume;
  }

  return {
    isSupported(): boolean {
      return ensureContext() !== null;
    },

    isMuted(): boolean {
      return muted;
    },

    setMuted(value: boolean): void {
      muted = value;
      syncMasterGain();
    },

    getMasterVolume(): number {
      return masterVolume;
    },

    setMasterVolume(volume: number): void {
      masterVolume = clamp01(volume);
      syncMasterGain();
    },

    async resume(): Promise<void> {
      const ctx = ensureContext();
      if (!ctx?.resume) return;
      await ctx.resume();
    },

    async suspend(): Promise<void> {
      const ctx = ensureContext();
      if (!ctx?.suspend) return;
      await ctx.suspend();
    },

    async playTone(
      frequency: number,
      durationMs: number,
      toneOptions: PlayToneOptions = {},
    ): Promise<void> {
      if (muted) return;
      const ctx = ensureContext();
      if (!ctx || !masterGain) return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = toneOptions.type ?? "sine";
      oscillator.frequency.value = frequency;
      gainNode.gain.value = clamp01(toneOptions.gain ?? 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(masterGain);

      const now = ctx.currentTime;
      const durationSeconds = Math.max(0, durationMs) / 1000;
      oscillator.start(now);
      oscillator.stop(now + durationSeconds);
    },
  };
}

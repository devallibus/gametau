import { describe, expect, test } from "bun:test";
import { createAudioController } from "./audio";

type FakeOscillator = {
  type: OscillatorType;
  frequency: { value: number };
  connect(destination: unknown): void;
  start(when?: number): void;
  stop(when?: number): void;
  starts: number[];
  stops: number[];
};

describe("webtau/audio", () => {
  test("is safe in unsupported environments", async () => {
    const audio = createAudioController({ contextFactory: () => null });

    expect(audio.isSupported()).toBe(false);
    await audio.resume();
    await audio.suspend();
    await audio.playTone(440, 100);
  });

  test("plays tones through provided audio context", async () => {
    const oscillators: FakeOscillator[] = [];
    let resumeCalls = 0;
    let suspendCalls = 0;

    const fakeContext = {
      currentTime: 12,
      destination: {},
      createGain: () => ({
        gain: { value: 1 },
        connect: () => {},
      }),
      createOscillator: () => {
        const osc: FakeOscillator = {
          type: "sine",
          frequency: { value: 0 },
          connect: () => {},
          start: (when?: number) => osc.starts.push(when ?? -1),
          stop: (when?: number) => osc.stops.push(when ?? -1),
          starts: [],
          stops: [],
        };
        oscillators.push(osc);
        return osc;
      },
      resume: async () => {
        resumeCalls++;
      },
      suspend: async () => {
        suspendCalls++;
      },
    };

    const audio = createAudioController({
      contextFactory: () => fakeContext,
    });

    expect(audio.isSupported()).toBe(true);
    audio.setMasterVolume(0.5);
    await audio.resume();
    await audio.playTone(880, 150, { type: "square", gain: 0.2 });
    await audio.suspend();

    expect(resumeCalls).toBe(1);
    expect(suspendCalls).toBe(1);
    expect(oscillators).toHaveLength(1);
    expect(oscillators[0].type).toBe("square");
    expect(oscillators[0].frequency.value).toBe(880);
    expect(oscillators[0].starts[0]).toBe(12);
    expect(oscillators[0].stops[0]).toBeCloseTo(12.15);
  });

  test("mute prevents tone playback", async () => {
    let oscillatorCount = 0;
    const fakeContext = {
      currentTime: 0,
      destination: {},
      createGain: () => ({
        gain: { value: 1 },
        connect: () => {},
      }),
      createOscillator: () => {
        oscillatorCount++;
        return {
          type: "sine" as OscillatorType,
          frequency: { value: 0 },
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
      },
    };

    const audio = createAudioController({
      contextFactory: () => fakeContext,
    });
    audio.setMuted(true);
    await audio.playTone(440, 100);

    expect(oscillatorCount).toBe(0);
  });
});

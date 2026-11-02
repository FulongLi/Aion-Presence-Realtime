import { AudioAnalyzer, DIGITAL_SOURCE } from "../../presence-core/audio/analyzer";
import type { AudioFeatures } from "../../presence-core/audio/features";

/** Where the analysed features go: the Presence Core's AudioVisualizer (its "codex" source is the assistant's voice). */
export interface FeatureSink {
  publish(source: "codex", features: AudioFeatures): void;
  bus: { setConnected(source: "codex", connected: boolean, now: number): void };
}

/**
 * The assistant's real voice for the Presence Core: the remote WebRTC track, reduced by the core's own analyser
 * (src/presence-core/audio/analyzer.ts: loudness, 32 log bands, onsets, voice) and published as the core's host audio.
 * The core then drives "speaking" — amplitude, spectrum, speech accents — and its echo guard from real audio, exactly as
 * the Plugin does with Codex's voice through its native bridge. Nothing is played, recorded or sent: the analysis graph
 * never reaches the speakers (AssistantAudio's <audio> element plays the voice).
 */
export class AssistantVoiceFeatures {
  private context?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private analyser?: AnalyserNode;
  private window?: Float32Array<ArrayBuffer>;
  private analyzer?: AudioAnalyzer;

  constructor(private readonly sink: FeatureSink, private readonly clock: () => number = () => performance.now() / 1000) {}

  attach(stream: MediaStream) {
    this.detach();
    const context = this.context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    this.source = context.createMediaStreamSource(stream);
    this.source.connect(analyser); // Analysed only; never played.
    this.analyser = analyser;
    this.window = new Float32Array(analyser.fftSize);
    this.analyzer = new AudioAnalyzer(context.sampleRate, DIGITAL_SOURCE);
    this.sink.bus.setConnected("codex", true, this.clock());
  }

  /** From a user gesture: the analysis context may start (autoplay policy). */
  resume() { if (this.context?.state === "suspended") void this.context.resume().catch(() => {}); }

  /** One frame: the newest samples into the analyser, the features to the core. */
  frame(dt: number) {
    const { analyser, window, analyzer, context } = this;
    if (!analyser || !window || !analyzer || !context || context.state !== "running") return;
    analyser.getFloatTimeDomainData(window);
    analyzer.pushWindow(window, dt * context.sampleRate);
    this.sink.publish("codex", analyzer.analyze(dt));
  }

  detach() {
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.source = this.analyser = this.window = undefined;
    this.analyzer?.reset();
    this.analyzer = undefined;
    this.sink.bus.setConnected("codex", false, this.clock());
  }

  dispose() {
    this.detach();
    void this.context?.close().catch(() => {});
    this.context = undefined;
  }
}

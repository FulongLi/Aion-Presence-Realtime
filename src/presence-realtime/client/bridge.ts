import { createRenderer } from "../../presence-core/render";
import type { ViewElements } from "../../presence-core/surface/view";
import { PresenceView } from "../../presence-core/surface/view";
import type { PresenceController, PresenceHooks } from "../../presence/controller";
import { AssistantVoiceFeatures } from "./assistantVoice";
import { ServerToolRunner } from "./toolRunner";
import { RealtimePresenceTransport } from "./transport";
import { voiceActivity } from "./voiceActivity";
import { RealtimeWelcomeSpeech } from "./welcomeSpeech";

export interface BodyStatus { ready: boolean; backend: "webgpu" | "canvas" | null; fallbackReason?: string }

/**
 * Joins the two halves of the page: Realtime's voice loop (PresenceController: microphone, WebRTC session, assistant
 * audio, turn events) and the Presence Core's view (the Plugin's PresenceView: body, renderer, cards, scenes, writing,
 * music, markers, welcome), which the server's hub feeds over the event stream.
 *
 *   voice function calls ─► ServerToolRunner ─► /api/presence/tool ─► Presence Core ─► snapshot ─► transport ─► view
 *   OpenAI turn events + real audio ─► PresenceEngine mode ─► voiceActivity ─► transport (laid over each snapshot)
 *   remote assistant track ─► AssistantVoiceFeatures ─► view.audio ("codex" source) ─► speaking, echo guard
 *   microphone stream (one) ─► WebRTC  and  ─► view.listen(stream): local listening
 *   greeting, first-run welcome ─► the same Realtime voice
 */
export class PresenceBridge {
  readonly runner = new ServerToolRunner();
  readonly transport: RealtimePresenceTransport | null;
  view: PresenceView | null = null;
  controller: PresenceController | null = null;
  body: BodyStatus = { ready: false, backend: null };
  private voice: AssistantVoiceFeatures | null = null;
  private microphone: MediaStream | null = null;
  private root: HTMLElement | null = null;
  private pendingDispose?: ReturnType<typeof setTimeout>;
  private lifetime: AbortController | null = null;
  private frame = 0;

  constructor() {
    this.transport = typeof window === "undefined" ? null : new RealtimePresenceTransport();
  }

  /** The controller's hooks (pass to its constructor). */
  readonly hooks: PresenceHooks = {
    runner: this.runner,
    assistantStream: stream => { if (stream) this.voice?.attach(stream); else this.voice?.detach(); this.assistantStream = stream; },
    microphoneStream: stream => { this.microphone = stream; void this.view?.listen(stream); },
    greeting: () => this.view?.greeting.request(Date.now()),
    // The first-run welcome introduces Aion with the same voice; the short greeting is not said as well.
    greetingAllowed: () => !this.transport?.snapshot?.hub.welcome,
    userTurn: () => this.transport?.turn(),
  };
  private assistantStream: MediaStream | null = null;

  /**
   * Mounts the Presence Core's view on the page's elements. Idempotent for the same root: React's development
   * StrictMode unmounts and remounts effects, and the view (which has no dispose) must exist once.
   */
  mount(elements: ViewElements & { stage: HTMLElement }, options: { debug: boolean; renderer?: "canvas"; onBody(status: BodyStatus): void }): () => void {
    clearTimeout(this.pendingDispose);
    if (this.root === elements.root && this.view) return () => this.scheduleDispose();
    const controller = this.controller, transport = this.transport;
    if (!controller || !transport) throw new Error("PresenceBridge: controller and browser required");
    this.root = elements.root;
    const view = new PresenceView(elements, transport, {
      debug: options.debug,
      speech: new RealtimeWelcomeSpeech({
        connected: () => controller.client.connection === "connected",
        speak: line => controller.client.speak(line),
        audible: () => controller.engine.signal.mode === "speaking",
      }),
    });
    this.view = view;
    this.voice = new AssistantVoiceFeatures(view.audio);
    if (this.assistantStream) this.voice.attach(this.assistantStream);
    const lifetime = this.lifetime = new AbortController();
    void createRenderer(elements.stage, view.inputs(), lifetime.signal, (code, replacement) => {
      if (replacement) { view.runtime = replacement; this.body = { ready: true, backend: replacement.backend, fallbackReason: code }; options.onBody(this.body); }
    }, { prefer: options.renderer }).then(({ handle, fallbackReason }) => {
      if (lifetime.signal.aborted) return;
      view.runtime = handle ?? null;
      view.attachOrbit(elements.stage);
      this.body = { ready: Boolean(handle), backend: handle?.backend ?? null, ...(fallbackReason ? { fallbackReason } : {}) };
      options.onBody(this.body);
    }, () => { this.body = { ready: false, backend: null, fallbackReason: "renderer-failed" }; options.onBody(this.body); });
    transport.start(view.apply, view.connectionChanged);
    if (this.microphone) void view.listen(this.microphone);
    else view.listenAllowed = true;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
      last = now;
      // Realtime's engine reduces the session's events and real audio to one mode (it used to be sampled by the legacy renderer).
      controller.engine.sample(dt, now / 1000);
      this.voice?.frame(dt);
      transport.setVoiceActivity(voiceActivity({ connected: controller.client.connection === "connected", mode: controller.engine.signal.mode, tool: this.runner.active }));
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
    return () => this.scheduleDispose();
  }

  /** A pointer or key press: audio analysis may start (autoplay policy). */
  gesture() { this.voice?.resume(); }

  private scheduleDispose() {
    clearTimeout(this.pendingDispose);
    this.pendingDispose = setTimeout(() => this.dispose(), 0);
  }

  private dispose() {
    cancelAnimationFrame(this.frame);
    this.lifetime?.abort();
    this.transport?.close();
    this.voice?.dispose();
    this.view?.stopListening();
    this.view = null; this.voice = null; this.root = null; this.lifetime = null;
  }
}

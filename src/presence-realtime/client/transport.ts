import type { MapTile } from "../../presence-core/cards/protocol";
import type { CardReport } from "../../presence-core/cards/state";
import type { ActivityState } from "../../presence-core/core/state";
import type { NarrationOutcome } from "../../presence-core/core/welcomeNarration";
import type { HubSnapshot, SurfaceAudio } from "../../presence-core/host/hub/protocol";
import type { ConnectionState, PresenceTransport } from "../../presence-core/surface/transports/types";

/** The activity the voice session reports (see voiceActivity.ts), laid over the hub's own. */
export interface VoiceActivity { state: ActivityState; label?: string }

const post = (path: string, body: unknown) => fetch(path, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true, credentials: "same-origin",
});

/**
 * How the Presence Core's view (src/presence-core/surface/view.ts) receives Aion's state in Realtime: the Plugin's
 * companion transport, pointed at this app's /api/presence routes. One difference: Realtime has no Codex hooks, so the
 * activity comes from the voice session in this page (listening, thinking, responding), laid over each snapshot here
 * without a round trip. Everything else (presentations, cards, scenes, colours, the welcome) is the server's.
 */
export class RealtimePresenceTransport implements PresenceTransport {
  readonly kind = "companion";
  onDisplayChange?: () => void;
  onSuperseded?: () => void;
  onAudio?: (message: unknown) => void;
  private source: EventSource | null = null;
  private latest: HubSnapshot | null = null;
  private voice: VoiceActivity | null = null;
  private deliver: ((snapshot: HubSnapshot) => void) | null = null;
  private audio: SurfaceAudio | null = null;
  private readonly window = Array.from(crypto.getRandomValues(new Uint8Array(10)), byte => (byte % 36).toString(36)).join("");
  get windowId() { return this.window; }
  /** The latest snapshot from the server (diagnostics, the debug panel). */
  get snapshot() { return this.latest; }

  constructor() {
    document.addEventListener("fullscreenchange", () => { this.onDisplayChange?.(); this.report(); });
    for (const type of ["focus", "blur"]) addEventListener(type, () => this.report());
    document.addEventListener("visibilitychange", () => this.report());
  }

  start(onSnapshot: (snapshot: HubSnapshot) => void, onConnection: (state: ConnectionState) => void) {
    this.deliver = onSnapshot;
    onConnection("connecting");
    this.source = new EventSource(`/api/presence/events?window=${this.window}`, { withCredentials: true });
    this.source.addEventListener("superseded", () => this.onSuperseded?.());
    this.source.addEventListener("audio", event => { try { this.onAudio?.(JSON.parse((event as MessageEvent<string>).data)); } catch { /* malformed */ } });
    this.source.addEventListener("snapshot", event => {
      onConnection("live");
      const first = !this.latest;
      try { this.latest = JSON.parse((event as MessageEvent<string>).data) as HubSnapshot; } catch { return; }
      this.emit();
      // The stream's response set the viewer cookie: the page may report about itself from now on.
      if (first) this.report();
    });
    // EventSource reconnects by itself (the route sends retry: 2000).
    this.source.onerror = () => onConnection("resting");
  }

  /**
   * The voice session's activity changed. While it says something (listening, thinking, responding), that is Aion's
   * activity; null hands back to the hub's (idle, or what a tool set).
   */
  setVoiceActivity(activity: VoiceActivity | null) {
    if (activity?.state === this.voice?.state && activity?.label === this.voice?.label) return;
    this.voice = activity;
    this.emit();
  }

  private emit() {
    const snapshot = this.latest;
    if (!snapshot || !this.deliver) return;
    const voice = this.voice;
    this.deliver(voice ? { ...snapshot, activity: { ...snapshot.activity, state: voice.state, ...(voice.label ? { label: voice.label } : { label: undefined }), source: "model" } } : snapshot);
  }

  audioStatus(status: SurfaceAudio) {
    if (JSON.stringify(status) === JSON.stringify(this.audio)) return;
    this.audio = status;
    this.report();
  }

  private report() {
    if (!this.source || !this.latest) return;
    const report = {
      window: this.window, focused: document.hasFocus(), fullscreen: document.fullscreenElement !== null, visible: document.visibilityState === "visible",
      ...(this.audio ? { audio: this.audio } : {}),
    };
    void post("/api/presence/surface", { type: "report", report }).catch(() => {});
  }

  async cardReport(report: Omit<CardReport, "window">) {
    await post("/api/presence/card", { window: this.window, ...report }).catch(() => {});
  }

  async media(id: string) {
    const response = await fetch(`/api/presence/media/${encodeURIComponent(id)}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error("media-unavailable");
    return response.blob();
  }

  async tile({ z, x, y }: MapTile) {
    const response = await fetch(`/api/presence/tile/${z}/${x}/${y}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error("tile-unavailable");
    return response.blob();
  }

  async dismiss() { await post("/api/presence/surface", { type: "dismiss" }); }

  /** A new user turn: a temporary presentation from the previous topic ends soon (the Plugin does this on each prompt). */
  turn() { void post("/api/presence/surface", { type: "turn" }).catch(() => {}); }

  async welcome(done: boolean, outcome?: NarrationOutcome) {
    await post("/api/presence/surface", done ? { type: "welcome", done: true, ...(outcome ? { outcome } : {}) } : { type: "welcome", show: true }).catch(() => {});
  }

  fullscreen() {
    if (!document.fullscreenEnabled) return null;
    return {
      active: document.fullscreenElement !== null,
      toggle: async () => {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      },
    };
  }

  close() { this.source?.close(); this.source = null; }
}

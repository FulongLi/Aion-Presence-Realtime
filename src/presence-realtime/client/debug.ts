import { DEMO_NAMES } from "../../presence-core/animation/scene/demos";
import { ONBOARDING_EXAMPLES } from "../../presence-core/core/guidance";
import { VOICE_BACKEND_LABELS, VOICE_BACKENDS, type VoiceBackend } from "../../voice/backend";
import type { PresenceController } from "../../presence/controller";
import type { PresenceBridge } from "./bridge";

/**
 * ?debug=1 (development builds only): the voice session and the Presence Core side by side, and every capability
 * testable without the model — each button runs the same server path a voice function call takes. The Presence
 * Core's own diagnostics line (bottom left) is the view's.
 */
const MANUAL: [string, string, Record<string, unknown>][] = [
  ...ONBOARDING_EXAMPLES.map(example => [example.say, example.tool, example.args] as [string, string, Record<string, unknown>]),
  ["sphere", "set_body_form", { body: "sphere" }],
  ["text: Hello", "show_text", { text: "Hello" }],
  ["number: 42%", "show_number", { value: "42%" }],
  ["symbol: check", "show_symbol", { symbol: "check" }],
  ["emoji: 🎉", "show_emoji", { emoji: "🎉" }],
  ["express: happy", "express", { expression: "happy" }],
  ["gesture: wave", "express", { gesture: "wave" }],
  ["colour: gold", "set_colors", { base: "gold" }],
  ["colour: reset", "set_colors", { reset: "all" }],
  ["hike: Ben Nevis", "plan_route", { from: "Glen Nevis Visitor Centre", to: "Ben Nevis", mode: "hiking" }],
  ["card: Earth–Moon", "show_interactive_card", { app: "earth-moon" }],
  ["card: CAD viewer", "show_interactive_card", { app: "cad-viewer" }],
  ["write: 永", "show_stroke_animation", { text: "永" }],
  ["write: Hello", "show_stroke_animation", { text: "Hello" }],
  [`animate: ${DEMO_NAMES[0]}`, "play_animation", { demo: DEMO_NAMES[0] }],
  ["music: treble clef", "show_music", { concept: "treble clef" }],
  ["inspect card", "inspect_interactive_card", {}],
  ["CAD status", "cad_model", { action: "status" }],
  ["simulation status", "simulate", { action: "status" }],
  ["guide: scene-ir", "aion_reference", { topic: "scene-ir" }],
  ["clear", "clear_presentation", {}],
  ["bad args", "show_number", { value: 12 }],
];

export function attachRealtimeDebug(container: HTMLElement, controller: PresenceController, bridge: PresenceBridge): () => void {
  const panel = document.createElement("aside");
  panel.className = "debug-panel";
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "", parent: HTMLElement = panel) => {
    const node = document.createElement(tag); node.textContent = text; parent.append(node); return node;
  };
  const button = (label: string, parent: HTMLElement, onClick: () => void) => { const node = el("button", label, parent); node.type = "button"; node.addEventListener("click", onClick); return node; };
  const section = (title: string, open = false) => { const group = el("details"); group.open = open; el("summary", title, group); return group; };
  el("strong", "Aion Presence Realtime · development");

  const voice = section("voice backend", true);
  const selector = el("div", "", voice);
  for (const name of VOICE_BACKENDS) {
    button(VOICE_BACKEND_LABELS[name], selector, () => {
      controller.setBackend(name as VoiceBackend);
      const url = new URL(location.href); url.searchParams.set("voice", name); history.replaceState(history.state, "", url);
    });
  }
  const connection = el("div", "", voice);
  button("greet", connection, () => controller.greet());
  button("disconnect", connection, () => controller.client.disconnect());
  button("reconnect", connection, () => { controller.client.disconnect(); controller.retry(); });
  const voiceOut = el("output", "", voice);

  const tools = section("Presence Core tools (server path)", true);
  const row = el("div", "", tools);
  for (const [label, name, args] of MANUAL) button(label, row, () => void bridge.runner.execute(name, JSON.stringify(args)));
  const toolsOut = el("output", "", tools);

  container.append(panel);
  // Diagnostics only: the bridge and controller, for checking the live chain from the console or a test.
  Object.assign(window, { aionRealtime: { bridge, controller } });
  const timer = setInterval(() => {
    const t = controller.timings, snapshot = bridge.transport?.snapshot;
    voiceOut.textContent = [
      `backend ${controller.backend} · ${controller.client.connection}`,
      `mode ${controller.engine.signal.mode} · activity ${snapshot?.activity.state ?? "—"}`,
      `body ${bridge.body.backend ?? "none"}${bridge.body.fallbackReason ? ` (${bridge.body.fallbackReason})` : ""} · ${snapshot?.body ?? "—"}`,
      `connect ${t.connectMs ?? "—"} ms · reply ${t.replyMs ?? "—"} ms · result→audio ${t.resultToAudioMs ?? "—"} ms`,
      ...controller.client.transcripts.slice(-4).map(line => `${line.role}: ${line.text.slice(0, 80)}`),
    ].join("\n");
    toolsOut.textContent = [
      `presentation ${snapshot?.presentation ? `${snapshot.presentation.kind} (${snapshot.presentation.route})` : "none"} · card ${snapshot?.card?.app ?? "none"}`,
      ...bridge.runner.trace.slice(0, 12).map(call => `${call.ok ? "✓" : "✗"} ${call.name}${call.error ? ` ${call.error}` : ""} · ${call.ms} ms`),
    ].join("\n");
  }, 300);
  return () => { clearInterval(timer); panel.remove(); };
}

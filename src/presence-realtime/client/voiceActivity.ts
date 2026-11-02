import type { ActivityState } from "../../presence-core/core/state";
import type { PresenceMode } from "../../presence/signal";
import type { VoiceActivity } from "./transport";

/**
 * The voice session's state as a Presence activity. The Plugin learns Codex's activity from lifecycle hooks; Realtime
 * learns it from the OpenAI session itself, already reduced by Realtime's PresenceEngine (src/presence/PresenceEngine.ts):
 *
 *   OpenAI events + real audio               PresenceEngine mode    Presence activity
 *   user speech (backend turn detection)     listening          →   listening
 *   turn ended, response or tool pending     thinking           →   thinking (working, with a label, for CAD and simulation)
 *   the assistant's real audio is audible    speaking           →   responding (the core's "speaking" follows the same audio)
 *   nothing                                  idle               →   none: the hub's own activity (idle, complete, error)
 *
 * A disconnected session says nothing: Aion then follows the hub alone.
 */
const WORK_LABELS: Record<string, string> = { cad_model: "Modelling", simulate: "Simulating", plan_route: "Planning the route" };

export function voiceActivity(input: { connected: boolean; mode: PresenceMode; tool: string | null }): VoiceActivity | null {
  if (!input.connected) return null;
  if (input.tool && WORK_LABELS[input.tool]) return { state: "working", label: WORK_LABELS[input.tool] };
  const map: Partial<Record<PresenceMode, ActivityState>> = { listening: "listening", thinking: "thinking", speaking: "responding" };
  const state = map[input.mode];
  return state ? { state } : null;
}

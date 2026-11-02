import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neutralize, type FunctionTool } from "./registry";
import type { ToolOutcome } from "./results";

/**
 * Progressive disclosure: the detailed guides (the Plugin skill's references and sections) stay out of every session's
 * instructions and tool list, and a model reads one when it is about to use a complex capability. The topics are a
 * fixed list mapped to files in src/presence-realtime/references (no path ever comes from the model).
 */
export const REFERENCE_TOOL_NAME = "aion_reference";

export const REFERENCE_TOPICS = {
  "visual-intent": "which visual to choose for a request (body, card or both), and when to stay quiet",
  geography: "maps, places and markers",
  routes: "plan_route: walking, cycling and hiking routes with elevation",
  scenes: "generated 3D scenes: when and how",
  "scene-ir": "the Scene IR document for generated scenes (objects, materials, animation, patches)",
  "scene-examples": "complete example scene documents",
  cards: "interactive cards (earth-moon, cad-viewer, generative-scene, route explorer, simulation)",
  writing: "handwriting (Chinese, English, music symbols) and short figure animations",
  music: "notation, playback and lessons",
  storytelling: "storyteller mode and narration style",
  cad: "cad_model actions and their arguments (FreeCAD)",
  simulation: "simulate: studies, materials, boundaries, meshing, solving and results (Gmsh, Elmer)",
} as const;
export type ReferenceTopic = keyof typeof REFERENCE_TOPICS;

const REFERENCE_LIMIT = 16_000;

export function referenceTool(engineering: boolean): FunctionTool {
  const topics = (Object.keys(REFERENCE_TOPICS) as ReferenceTopic[]).filter(topic => engineering || (topic !== "cad" && topic !== "simulation"));
  return {
    type: "function",
    name: REFERENCE_TOOL_NAME,
    description: "Read Aion's detailed guide on one topic before using a complex capability the first time in a conversation "
      + "(a generated scene, CAD, a simulation, a route, music, writing, a card). Silent: the user sees nothing. "
      + topics.map(topic => `${topic}: ${REFERENCE_TOPICS[topic]}`).join("; ") + ".",
    parameters: { type: "object", properties: { topic: { type: "string", enum: topics } }, required: ["topic"], additionalProperties: false },
  };
}

const cache = new Map<ReferenceTopic, string>();
export function referenceDirectory(cwd = process.cwd()) { return join(cwd, "src", "presence-realtime", "references"); }

export function referenceText(args: Record<string, unknown>, directory = referenceDirectory()): ToolOutcome {
  const topic = args.topic;
  if (typeof topic !== "string" || !(topic in REFERENCE_TOPICS)) {
    return { ok: false, error: "invalid-arguments", message: `topic must be one of: ${Object.keys(REFERENCE_TOPICS).join(", ")}.` };
  }
  const key = topic as ReferenceTopic;
  let text = cache.get(key);
  if (text === undefined) {
    try {
      text = neutralize(readFileSync(join(directory, `${key}.md`), "utf8").replace(/^<!--[\s\S]*?-->\s*/, ""));
      cache.set(key, text);
    } catch {
      return { ok: false, error: "reference-unavailable", message: `The ${key} guide is not installed with this build.` };
    }
  }
  return { ok: true, message: `Guide: ${key}. Follow it; do not read it aloud.`, guide: text.slice(0, REFERENCE_LIMIT) };
}

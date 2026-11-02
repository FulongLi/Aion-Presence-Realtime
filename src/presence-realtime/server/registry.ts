/**
 * The canonical capability registry of Aion Presence Realtime: which of the Presence Core's tools the voice
 * backends may call, how each is described to them, and how a Presence Core tool becomes a native OpenAI function
 * tool. The tool schemas and handlers themselves are the Plugin's (src/presence-core/host/mcp/server.ts): this file
 * never redefines an argument, it only selects, removes unsafe inputs and shortens descriptions.
 *
 *   Presence Core tool (zod schema, handler)  ─►  registry (select · omit · describe)  ─►  function tool
 *                                                                                         ├─ Realtime session.tools
 *                                                                                         └─ GPT-Live delegation.responses.tools
 */

/** What a tool is for (documentation, the debug panel and the metadata budget). */
export type CapabilityFamily = "body" | "visual" | "geo" | "scene" | "cards" | "writing" | "music" | "engineering" | "reference";

export interface Capability {
  /** The Presence Core tool name (the function name the model calls). */
  tool: string;
  family: CapabilityFamily;
  /** Input properties never offered in Realtime (and refused if sent anyway). */
  omit?: readonly string[];
  /** Offered only when engineering is enabled and its programs were found: FreeCAD for cad, plus Gmsh and Elmer for simulation. */
  engineering?: "cad" | "simulation";
}

/** Every Presence Core tool a voice backend may call, in the order the model sees them. */
export const CAPABILITIES: readonly Capability[] = [
  { tool: "set_body_form", family: "body" },
  { tool: "express", family: "body" },
  { tool: "set_colors", family: "body" },
  { tool: "clear_presentation", family: "body" },
  // A local file path or data URL would let the model read pictures from the server's disk: lookups only.
  { tool: "show_image", family: "visual", omit: ["source", "alt"] },
  { tool: "show_portrait", family: "visual", omit: ["source", "alt"] },
  { tool: "show_form", family: "visual" },
  { tool: "show_clock", family: "visual" },
  { tool: "show_number", family: "visual" },
  { tool: "show_text", family: "visual" },
  { tool: "show_symbol", family: "visual" },
  { tool: "show_emoji", family: "visual" },
  { tool: "show_result", family: "visual" },
  { tool: "show_terrain", family: "geo" },
  { tool: "show_map", family: "geo" },
  { tool: "mark_map", family: "geo" },
  { tool: "plan_route", family: "geo" },
  { tool: "show_scene", family: "scene" },
  { tool: "set_scene_view", family: "scene" },
  { tool: "show_interactive_card", family: "cards" },
  { tool: "control_interactive_card", family: "cards" },
  { tool: "inspect_interactive_card", family: "cards" },
  { tool: "show_stroke_animation", family: "writing" },
  { tool: "play_animation", family: "writing" },
  { tool: "control_animation", family: "writing" },
  { tool: "show_music", family: "music" },
  { tool: "play_music", family: "music" },
  { tool: "music_lesson", family: "music" },
  { tool: "cad_model", family: "engineering", engineering: "cad" },
  { tool: "simulate", family: "engineering", engineering: "simulation" },
];

/** Presence Core tools deliberately not offered to the voice backends, and why (docs/PARITY.md lists them too). */
export const EXCLUDED_TOOLS: Readonly<Record<string, string>> = {
  open_presence: "Opens Codex's companion window; in Realtime the page itself is Aion's surface and is always open.",
  set_presence_state: "Codex reports its own activity; Realtime derives activity from the voice session's events and real audio.",
  set_audio_visualizer: "Configures the macOS audio bridge and Codex Voice Sync, which belong to the Plugin's host.",
  show_artifact: "Shows a file from the agent's machine; a voice model in Realtime has no file system to point at.",
  show_visual_form: "A legacy alias of show_form.",
  presence_card: "An app-only tool of MCP Apps hosts; Realtime cards report over the page's own route.",
};

export const capabilityFor = (name: string) => CAPABILITIES.find(capability => capability.tool === name);

/** The JSON Schema object a Presence Core tool lists (zod → JSON Schema, compacted by the Plugin's budget). */
export interface JsonSchemaObject {
  type: "object";
  properties?: Record<string, Record<string, unknown>>;
  required?: string[];
  [key: string]: unknown;
}

/** A tool as the Presence Core's tool server lists it. */
export interface ListedTool { name: string; description?: string; inputSchema: JsonSchemaObject }

/** The shape both GA Realtime (`session.tools[]`) and the Responses API (`tools[]`) accept for a function. */
export interface FunctionTool {
  type: "function";
  name: string;
  description: string;
  parameters: JsonSchemaObject;
}

/**
 * How much tool metadata each voice backend receives. The Realtime model listens, reasons and speaks in one context, so its
 * tool text is shortened; GPT-Live's Responses backend reasons over full descriptions (it is a text model with a large context).
 */
export type ToolProfile = "realtime" | "live";
export const PROFILE_LIMITS: Record<ToolProfile, { description: number; property: number; nested: number; constraints: boolean }> = {
  /**
   * `nested`: descriptions inside a property's items, unions or sub-objects (0: removed; the guides carry the detail).
   * `constraints`: string patterns and length or count bounds are listed (false: left to the Presence Core, which validates
   * every call with the full schema anyway and says exactly what was wrong).
   */
  realtime: { description: 330, property: 100, nested: 0, constraints: false },
  live: { description: 2_400, property: 600, nested: 600, constraints: true },
};

/** Schema keywords that only bound a value; the server-side schema still enforces them. */
const CONSTRAINTS = new Set(["pattern", "minLength", "maxLength", "minItems", "maxItems", "additionalProperties", "propertyNames", "format"]);

/** Words in the Plugin's descriptions that name its host; the Realtime model is the intelligence here. */
const HOST_WORDS: [RegExp, string][] = [
  [/\bCodex's\b/g, "your"],
  [/\bCodex\b/g, "you"],
  [/\bthe aion-presence skill\b/gi, "your instructions"],
  [/\bopen_presence\b/g, "the page"],
];
export const neutralize = (text: string) => HOST_WORDS.reduce((out, [pattern, word]) => out.replace(pattern, word), text);

/** Cuts text to at most `max` characters, at the end of a sentence when one ends late enough, never mid-word. */
export function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf("? "));
  if (sentence >= max * 0.5) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max * 0.5 ? space : max - 1).replace(/[,;:(]$/, "")}…`;
}

/**
 * Shortens every `description` inside a JSON Schema, returning a copy: a tool's own properties to `property` characters,
 * anything nested deeper (items, unions, sub-objects) to `nested` (0 removes them).
 */
function shortenSchema(schema: unknown, limits: { property: number; nested: number; constraints: boolean }, depth = 0): unknown {
  if (Array.isArray(schema)) return schema.map(item => shortenSchema(item, limits, depth));
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "$schema" || (!limits.constraints && CONSTRAINTS.has(key))) continue;
    if (key === "description" && typeof value === "string") {
      const max = depth <= 1 ? limits.property : limits.nested;
      if (max > 0) out[key] = shorten(neutralize(value), max);
    } else if (key === "properties" && value && typeof value === "object") {
      out[key] = Object.fromEntries(Object.entries(value).map(([name, inner]) => [name, shortenSchema(inner, limits, depth + 1)]));
    } else out[key] = shortenSchema(value, limits, key === "items" || key === "anyOf" || key === "oneOf" || key === "allOf" ? depth + 1 : depth);
  }
  return out;
}

/** One listed Presence Core tool → the function tool a voice backend receives (or null when it is not offered). */
export function toFunctionTool(tool: ListedTool, profile: ToolProfile): FunctionTool | null {
  const capability = capabilityFor(tool.name);
  if (!capability) return null;
  const limits = PROFILE_LIMITS[profile];
  const schema = shortenSchema(tool.inputSchema, limits) as JsonSchemaObject;
  const properties = { ...(schema.properties ?? {}) };
  for (const name of capability.omit ?? []) delete properties[name];
  const required = (schema.required ?? []).filter(name => name in properties);
  return {
    type: "function",
    name: tool.name,
    description: shorten(neutralize(tool.description ?? ""), limits.description),
    parameters: { ...schema, type: "object", properties, required },
  };
}

/** Which engineering capabilities are on (see capabilities.ts). */
export interface EngineeringSelection { cad: boolean; simulation: boolean }
export const NO_ENGINEERING: EngineeringSelection = Object.freeze({ cad: false, simulation: false });

export interface ToolSelection { profile: ToolProfile; engineering: EngineeringSelection }

/** The function tools for one voice session, in registry order, plus the adapter's own reference tool. */
export function functionTools(listed: readonly ListedTool[], selection: ToolSelection, extra: readonly FunctionTool[] = []): FunctionTool[] {
  const byName = new Map(listed.map(tool => [tool.name, tool]));
  const tools: FunctionTool[] = [];
  for (const capability of CAPABILITIES) {
    if (capability.engineering && !selection.engineering[capability.engineering]) continue;
    const tool = byName.get(capability.tool);
    const converted = tool && toFunctionTool(tool, selection.profile);
    if (converted) tools.push(converted);
  }
  return [...tools, ...extra];
}

/** Bytes of tool metadata a session carries (the budget the tests hold each profile to). */
export const metadataBytes = (tools: readonly FunctionTool[]) => tools.reduce((sum, tool) => sum + JSON.stringify(tool).length, 0);

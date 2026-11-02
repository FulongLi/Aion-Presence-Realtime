import { neutralize } from "./registry";

/**
 * What a voice backend receives as a function call's output: a few fields that say what actually happened, bounded in
 * size. The Presence Core's full structured result (surface, hooks, hub state) stays on the server; only the parts a
 * model may want to say or act on are kept. `ok` is false for every failure, and true only once the core confirmed the
 * operation (a solve that is still running says "running", never "done").
 */
export interface ToolOutcome {
  ok: boolean;
  /** A stable code for failures (invalid-arguments, image-not-found, engineering-unavailable, timeout, …). */
  error?: string;
  message: string;
  [key: string]: unknown;
}

export const OUTPUT_LIMIT = 6_000;
const MESSAGE_LIMIT = 1_200;

/** Fields of the Presence Core's structured result worth returning to a voice model. */
const KEPT = ["shown", "source", "markers", "colors", "music", "writing", "animation", "card", "route", "journey", "cad", "simulation", "greeting"] as const;

export const toolFailure = (error: string, message: string): ToolOutcome => ({ ok: false, error, message: neutralize(message).slice(0, MESSAGE_LIMIT) });

/** The leading code of a Presence Core failure message ("form-not-found: …" → form-not-found). */
const failureCode = (text: string) => /^([a-z][a-z0-9-]{2,40}):/.exec(text)?.[1] ?? "failed";

/** Phrases written for Codex's host that would mislead a voice model in Realtime (the page is always the surface). */
const HOST_CLAUSES = [
  / ?\(Aion is not open: call open_presence if the user wants to see it\.\)/g,
  / ?Aion is not open, so nothing is on screen \(open_presence shows it\)\./g,
];

function text(result: { content?: unknown }): string {
  const parts = Array.isArray(result.content) ? result.content : [];
  return parts.map(part => (part && typeof part === "object" && (part as { type?: unknown }).type === "text" ? String((part as { text?: unknown }).text ?? "") : "")).join("\n").trim();
}

function clean(message: string) {
  let out = message;
  for (const clause of HOST_CLAUSES) out = out.replace(clause, "");
  return neutralize(out).trim();
}

/** A Presence Core tool result (MCP CallToolResult) → the bounded outcome a voice model receives. */
export function compactResult(name: string, result: { content?: unknown; structuredContent?: unknown; isError?: unknown }): ToolOutcome {
  const body = text(result);
  if (result.isError) {
    // CAD and simulation append their data as a JSON line after the message.
    const [first, ...rest] = body.split("\n");
    const outcome = toolFailure(failureCode(first), clean(first));
    const data = parseJson(rest.join("\n"));
    return bound(data ? { ...outcome, detail: data } : outcome);
  }
  const structured = (result.structuredContent ?? null) as Record<string, unknown> | null;
  const message = clean(String(structured?.message ?? body.split("\n")[0] ?? "")).slice(0, MESSAGE_LIMIT);
  const outcome: ToolOutcome = { ok: structured?.ok !== false, message };
  const presentation = structured?.presentation as Record<string, unknown> | null | undefined;
  if (presentation) outcome.presentation = { kind: presentation.kind, route: presentation.route, description: presentation.description };
  if (structured?.body && (name === "set_body_form" || name === "express")) outcome.body = structured.body;
  for (const key of KEPT) if (structured?.[key] !== undefined) outcome[key] = structured[key];
  if (!structured) {
    const data = parseJson(body.split("\n").slice(1).join("\n"));
    if (data) outcome.data = data;
  }
  return bound(outcome);
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try { return JSON.parse(trimmed); } catch { return null; }
}

/** Shortens long strings and arrays, then drops nested detail, until the outcome fits the output limit. */
export function bound(outcome: ToolOutcome, limit = OUTPUT_LIMIT): ToolOutcome {
  if (JSON.stringify(outcome).length <= limit) return outcome;
  for (const [strings, items, depth] of [[400, 12, 6], [200, 6, 4], [120, 3, 3]] as const) {
    const trimmed = trim(outcome, strings, items, depth) as ToolOutcome;
    if (JSON.stringify(trimmed).length <= limit) return { ...trimmed, truncated: true };
  }
  return { ok: outcome.ok, ...(outcome.error ? { error: outcome.error } : {}), message: outcome.message.slice(0, MESSAGE_LIMIT), truncated: true };
}

function trim(value: unknown, strings: number, items: number, depth: number): unknown {
  if (typeof value === "string") return value.length > strings ? `${value.slice(0, strings)}…` : value;
  if (Array.isArray(value)) {
    if (depth <= 0) return `[${value.length} items]`;
    const kept = value.slice(0, items).map(item => trim(item, strings, items, depth - 1));
    return value.length > items ? [...kept, `… ${value.length - items} more`] : kept;
  }
  if (value && typeof value === "object") {
    if (depth <= 0) return "{…}";
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, key === "message" ? inner : trim(inner, strings, items, depth - 1)]));
  }
  return value;
}

import { z } from "zod";
import { CARD_REPORT_BYTES } from "../../presence-core/cards/state";
import { surfaceReportSchema } from "../../presence-core/host/hub/protocol";
import { WELCOME_OUTCOMES } from "../../presence-core/core/welcomeNarration";
import { NEW_TOPIC_SECONDS } from "../../presence-core/host/hub/hub";
import { newViewerId, problem, readJson, sameSite, viewerCookie, viewerFrom, writeAllowed } from "./http";
import { toolFailure } from "./results";
import type { PresenceSessions } from "./sessions";

/**
 * The /api/presence route implementations (the files under src/app/api/presence only bind them), testable without Next.js.
 *
 *   GET  /api/presence/events              the page's event stream: every snapshot of this viewer's Aion (creates it)
 *   POST /api/presence/tool                one voice function call → its bounded outcome
 *   GET  /api/presence/media/:id           a presented image, model or field (bytes checked by type)
 *   POST /api/presence/card                the interactive card's report (validated and rate-limited by the hub)
 *   GET  /api/presence/tile/:z/:x/:y       a map tile around the open route
 *   POST /api/presence/surface             the page: welcome seen or asked, dismiss, a new user turn, its window state
 */
const WINDOW = /^[a-z0-9]{8,32}$/;
export const TOOL_BODY_LIMIT = 256 * 1024;
const noStore = { "Cache-Control": "no-store" };

export async function eventsRoute(request: Request, sessions: PresenceSessions): Promise<Response> {
  if (!sameSite(request)) return problem(403, "forbidden-site");
  const known = viewerFrom(request);
  const viewer = known ?? newViewerId();
  const requested = new URL(request.url).searchParams.get("window") ?? "";
  const window = WINDOW.test(requested) ? requested : newViewerId().slice(0, 12);
  let host;
  try { host = await sessions.host(viewer); } catch { return problem(503, "presence-unavailable"); }
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const sink = {
        write(frame: string) { if (open) { try { controller.enqueue(encoder.encode(frame)); } catch { open = false; } } return open; },
        end() { if (open) { open = false; try { controller.close(); } catch { /* already closed */ } } },
      };
      const detach = host.attach(sink, window);
      sessions.watching(viewer, 1);
      const heartbeat = setInterval(() => sink.write(": ping\n\n"), 20_000);
      let done = false;
      cleanup = () => {
        if (done) return;
        done = true;
        clearInterval(heartbeat);
        detach();
        sessions.watching(viewer, -1);
        sink.end();
      };
      request.signal.addEventListener("abort", () => cleanup(), { once: true });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no",
      ...(known ? {} : { "Set-Cookie": viewerCookie(viewer, request) }),
    },
  });
}

const toolRequest = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
  /** The model's arguments: the JSON string a function call carries, or an object. */
  arguments: z.union([z.string().max(TOOL_BODY_LIMIT), z.record(z.string(), z.unknown())]),
}).strict();

export async function toolRoute(request: Request, sessions: PresenceSessions): Promise<Response> {
  if (!writeAllowed(request)) return problem(403, "forbidden-origin");
  const viewer = viewerFrom(request);
  if (!viewer) return problem(409, "no-presence");
  const body = await readJson(request, TOOL_BODY_LIMIT);
  if (!body.ok) return problem(body.status, body.error);
  const parsed = toolRequest.safeParse(body.value);
  if (!parsed.success) return problem(400, "invalid-request");
  let args: unknown = parsed.data.arguments;
  if (typeof args === "string") {
    try { args = args.trim() ? JSON.parse(args) : {}; } catch { return Response.json(toolFailure("invalid-arguments", "The arguments are not valid JSON."), { headers: noStore }); }
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) return Response.json(toolFailure("invalid-arguments", "The arguments must be an object."), { headers: noStore });
  const host = await sessions.host(viewer).catch(() => null);
  if (!host) return problem(503, "presence-unavailable");
  const outcome = await host.call(parsed.data.name, args as Record<string, unknown>);
  return Response.json(outcome, { headers: noStore });
}

export async function mediaRoute(request: Request, sessions: PresenceSessions, id: string): Promise<Response> {
  if (!sameSite(request)) return problem(403, "forbidden-site");
  const viewer = viewerFrom(request);
  const host = viewer ? await sessions.existing(viewer)?.catch(() => null) : null;
  if (!host || !/^m[a-f0-9]{18}$/.test(id)) return problem(404, "not-found");
  const item = host.media(id);
  if (!item) return problem(404, "not-found");
  return new Response(new Uint8Array(item.data), {
    headers: { "Content-Type": item.mime, "Content-Length": String(item.bytes), "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox", ...noStore },
  });
}

export async function cardRoute(request: Request, sessions: PresenceSessions): Promise<Response> {
  if (!writeAllowed(request)) return problem(403, "forbidden-origin");
  const viewer = viewerFrom(request);
  const host = viewer ? await sessions.existing(viewer)?.catch(() => null) : null;
  if (!host) return problem(409, "no-presence");
  const body = await readJson(request, CARD_REPORT_BYTES);
  if (!body.ok) return problem(body.status, body.error);
  const window = (body.value as { window?: unknown } | null)?.window;
  const outcome = host.cardReport(body.value, typeof window === "string" && WINDOW.test(window) ? window : "realtime");
  return outcome.ok ? new Response(null, { status: 204 }) : problem(outcome.status, outcome.problem);
}

export async function tileRoute(request: Request, sessions: PresenceSessions, params: { z: string; x: string; y: string }): Promise<Response> {
  if (!sameSite(request)) return problem(403, "forbidden-site");
  const viewer = viewerFrom(request);
  const host = viewer ? await sessions.existing(viewer)?.catch(() => null) : null;
  if (!host) return problem(404, "no-route");
  const [z, x, y] = [params.z, params.x, params.y].map(value => /^\d{1,6}$/.test(value) ? Number(value) : NaN);
  if (![z, x, y].every(Number.isFinite) || z > 19) return problem(400, "invalid-tile");
  const tile = await host.tile(z, x, y);
  if (!tile.ok) return problem(tile.status, tile.code);
  return new Response(new Uint8Array(tile.bytes), {
    headers: { "Content-Type": "image/png", "Content-Length": String(tile.bytes.length), "Cache-Control": "private, max-age=3600", "Content-Security-Policy": "default-src 'none'; sandbox" },
  });
}

const surfaceRequest = z.discriminatedUnion("type", [
  z.object({ type: z.literal("welcome"), done: z.boolean().optional(), show: z.boolean().optional(), outcome: z.enum(WELCOME_OUTCOMES).optional() }).strict(),
  z.object({ type: z.literal("dismiss") }).strict(),
  /** The user started a new turn: a temporary presentation from the last topic ends soon (the Plugin does this on a new prompt). */
  z.object({ type: z.literal("turn") }).strict(),
  z.object({ type: z.literal("report"), report: surfaceReportSchema }).strict(),
]);

export async function surfaceRoute(request: Request, sessions: PresenceSessions): Promise<Response> {
  if (!writeAllowed(request)) return problem(403, "forbidden-origin");
  const viewer = viewerFrom(request);
  const host = viewer ? await sessions.existing(viewer)?.catch(() => null) : null;
  if (!host) return problem(409, "no-presence");
  const body = await readJson(request);
  if (!body.ok) return problem(body.status, body.error);
  const parsed = surfaceRequest.safeParse(body.value);
  if (!parsed.success) return problem(400, "invalid-request");
  const command = parsed.data;
  if (command.type === "welcome") host.welcome(command.done === true, command.outcome);
  else if (command.type === "dismiss") host.dismiss();
  else if (command.type === "turn") host.hub.store.shorten(NEW_TOPIC_SECONDS);
  else host.surfaceReport(command.report);
  return new Response(null, { status: 204 });
}

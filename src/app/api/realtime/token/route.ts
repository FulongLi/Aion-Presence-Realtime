import "server-only";
import { sessionTools } from "@/presence-realtime/server/sessions";
import { createRealtimeToken } from "@/server/realtimeToken";

// Reads OPENAI_API_KEY at request time on the Node.js runtime. POST handlers are never cached.
export const runtime = "nodejs";

export async function POST(request: Request) {
  // The Presence Core's tools from the canonical registry, in the Realtime profile (shortened metadata).
  const tools = await sessionTools("realtime").catch(error => { console.warn("[realtime/token] tools unavailable", error); return null; });
  // Without the registry the session would carry tools the server cannot run: refuse rather than mismatch.
  if (!tools) return Response.json({ error: "presence-unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const { status, body } = await createRealtimeToken(request, process.env, fetch, tools);
  if (status !== 200) console.warn(`[realtime/token] ${status} ${String(body.error)}${body.detail ? `: ${String(body.detail)}` : ""}`);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

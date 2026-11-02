import "server-only";
import { sessionTools } from "@/presence-realtime/server/sessions";
import { createLiveSession } from "@/server/liveSession";

// Reads OPENAI_API_KEY at request time on the Node.js runtime. POST handlers are never cached.
export const runtime = "nodejs";

export async function POST(request: Request) {
  // The Presence Core's tools from the canonical registry, in the GPT-Live backend profile (full descriptions).
  const tools = await sessionTools("live").catch(error => { console.warn("[live/session] tools unavailable", error); return null; });
  // Without the registry the session would carry tools the server cannot run: refuse rather than mismatch.
  if (!tools) return Response.json({ error: "presence-unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const { status, body } = await createLiveSession(request, process.env, fetch, tools);
  if (status !== 200) console.warn(`[live/session] ${status} ${String(body.error)}${body.detail ? `: ${String(body.detail)}` : ""}`);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

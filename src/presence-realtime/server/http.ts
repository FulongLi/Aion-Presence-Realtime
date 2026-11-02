import { randomBytes } from "node:crypto";
import { originAllowed } from "../../server/realtimeToken";
import { VIEWER_ID } from "./sessions";

/**
 * Request checks shared by the /api/presence routes.
 *
 * - The viewer is an HttpOnly, SameSite=Strict cookie scoped to /api/presence: another site's page cannot send it, and
 *   page scripts cannot read it. It selects this browser's Aion; it is not authentication (see README › API key handling).
 * - Every request must be same-origin by Fetch Metadata where the browser sends it; state-changing requests also need the
 *   app's own Origin (or SCF_ALLOWED_ORIGINS), as the token route does.
 * - Bodies are bounded before parsing.
 */
export const VIEWER_COOKIE = "aion_viewer";
export const JSON_LIMIT = 64 * 1024;

export function viewerFrom(request: Request): string | null {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === VIEWER_COOKIE) { const id = value.join("="); return VIEWER_ID.test(id) ? id : null; }
  }
  return null;
}

export const newViewerId = () => randomBytes(16).toString("hex");

export function viewerCookie(id: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${VIEWER_COOKIE}=${id}; Path=/api/presence; HttpOnly; SameSite=Strict; Max-Age=31536000${secure}`;
}

/** Fetch Metadata: a browser marks cross-site requests; requests without the header (non-browser callers) pass this check only. */
export function sameSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin" || site === "none";
}

export function writeAllowed(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  return sameSite(request) && originAllowed(request, env.SCF_ALLOWED_ORIGINS);
}

export const problem = (status: number, error: string) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/** Reads a JSON body of at most `limit` bytes. */
export async function readJson(request: Request, limit = JSON_LIMIT): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit) return { ok: false, status: 413, error: "too-large" };
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "invalid-json" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel().catch(() => {}); return { ok: false, status: 413, error: "too-large" }; }
    chunks.push(value);
  }
  try { return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString("utf8")) }; } catch { return { ok: false, status: 400, error: "invalid-json" }; }
}

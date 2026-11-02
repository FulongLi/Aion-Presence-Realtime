import "server-only";
import { presenceSessions } from "@/presence-realtime/server/sessions";
import { tileRoute } from "@/presence-realtime/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ z: string; x: string; y: string }> }) {
  return tileRoute(request, presenceSessions(), await context.params);
}

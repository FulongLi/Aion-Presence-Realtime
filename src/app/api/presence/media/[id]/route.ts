import "server-only";
import { presenceSessions } from "@/presence-realtime/server/sessions";
import { mediaRoute } from "@/presence-realtime/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return mediaRoute(request, presenceSessions(), (await context.params).id);
}

import "server-only";
import { presenceSessions } from "@/presence-realtime/server/sessions";
import { eventsRoute } from "@/presence-realtime/server/routes";

// The page's event stream (Node.js runtime: the Presence host lives in this server process).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) { return eventsRoute(request, presenceSessions()); }

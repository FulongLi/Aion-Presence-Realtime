import "server-only";
import { presenceSessions } from "@/presence-realtime/server/sessions";
import { surfaceRoute } from "@/presence-realtime/server/routes";

export const runtime = "nodejs";

export function POST(request: Request) { return surfaceRoute(request, presenceSessions()); }

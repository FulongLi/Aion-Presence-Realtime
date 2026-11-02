import "server-only";
import { presenceSessions } from "@/presence-realtime/server/sessions";
import { cardRoute } from "@/presence-realtime/server/routes";

export const runtime = "nodejs";

export function POST(request: Request) { return cardRoute(request, presenceSessions()); }

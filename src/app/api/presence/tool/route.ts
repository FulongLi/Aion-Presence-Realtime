import "server-only";
import { presenceSessions } from "@/presence-realtime/server/sessions";
import { toolRoute } from "@/presence-realtime/server/routes";

// One voice function call, executed by the Presence Core (the browser never runs a tool itself).
export const runtime = "nodejs";
export const maxDuration = 300;

export function POST(request: Request) { return toolRoute(request, presenceSessions()); }

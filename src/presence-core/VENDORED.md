# Aion Presence Core (vendored)

This directory is the Presence Core of [Aion Presence Plugin](https://github.com/FulongLi/Aion-Presence-Plugin),
copied so that Aion Presence Realtime renders, routes and computes exactly what the Plugin does. It is laid out
exactly like the Plugin's `src/`, so that both repositories can later consume one shared package by moving this
directory (no import inside it reaches outside it, except the documented deltas below).

| | |
| --- | --- |
| Source repository | `FulongLi/Aion-Presence-Plugin` |
| Source commit | `fb9b210d5d34a867d58931f284c30a3f84feecad` (`main`, v0.8.0, merge of PR #17) |
| Copied | `src/` in full, minus the Plugin-host entry points listed below |
| Licence | the Plugin's licence ([LICENSE](LICENSE), identical to the Plugin's root `LICENSE`); third-party notices in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) |

**Do not edit files here casually.** Behavioural changes belong upstream in the Plugin first. Realtime-specific
behaviour lives in [`src/presence-realtime/`](../presence-realtime), which adapts this core to the OpenAI voice
backends. Every local change to a file in this directory is listed below, so a later sync can re-apply it.

## Not copied (Plugin-host entry points)

| Plugin file | Why |
| --- | --- |
| `host/mcp/main.ts` | The stdio MCP entry Codex starts. Realtime runs the same tool server in-process instead (`src/presence-realtime/server/`). |
| `host/hooks/main.ts`, `host/hooks/forward.ts`, `host/hooks/speech.ts` | Codex lifecycle hooks. Realtime maps OpenAI session events to Presence states instead. `host/hooks/mapping.ts` stays (the hub imports it). |
| `host/firstRun.ts` | Opens Codex's companion window on first install. Realtime's page is the surface. |
| `host/sim/main.ts` | The detached simulation runner built by the Plugin's esbuild step. Realtime runs jobs in the long-lived server process. |
| `surface/main.ts`, `surface/index.html` | The Plugin's single-file page. Realtime mounts `PresenceView` in its Next.js page. |
| `surface/transports/mcpApps.ts`, `surface/transports/companion.ts` | Plugin transports. Realtime adds its own transport (`src/presence-realtime/client/transport.ts`). |

## Local deltas

| File | Change | Why |
| --- | --- | --- |

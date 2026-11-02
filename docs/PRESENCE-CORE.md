# Presence Core in Realtime: architecture, security, licences

## Layout

```text
src/presence-core/        the Plugin's Presence Core, vendored (VENDORED.md: source commit, omissions, deltas)
  core/ render/ visual/ scene/ cards/ animation/ writing/ music/ audio/ sim/   pure core, renderer, card runtime
  surface/                PresenceView: the page's body, cards, markers, scenes, welcome
  host/                   hub (state), mcp/server.ts (the tool server), resolver, geo, route, cad, sim, writing
src/presence-realtime/    the Realtime adapter (the only code that knows about OpenAI voice sessions)
  server/                 registry, host, sessions, routes, results, references, capabilities, http
  client/                 transport, bridge, voiceActivity, assistantVoice, toolRunner, welcomeSpeech, debug
  references/             the Plugin skill's guides, served by aion_reference
presence-assets/          the Plugin package's logo, FreeCAD worker, Chinese Writing Pack (large data fetched)
tests/presence-core/      the Plugin's tests for the core (ported)
```

The boundary is the Presence Core's **tool contract**: every capability is a tool with a zod schema and a structured
result, defined once in `host/mcp/server.ts`. The Plugin serves it to Codex over MCP stdio; Realtime connects to the
same server over an in-memory transport and exposes it as native OpenAI functions. A future shared package is
`src/presence-core` moved out of both repositories; nothing in it imports Realtime code.

## Request flow

```text
Browser                                                    Next.js server (Node.js)
───────                                                    ────────────────────────
Realtime / GPT-Live session (WebRTC, unchanged)
  function call (name, JSON args)
    └─ ServerToolRunner ── POST /api/presence/tool ──────►  PresenceSessions → PresenceHost (this browser's)
                                                              registry: offered? input removed? engineering on?
                                                              cad paths confined to the workspace
                                                              MCP client ─in-memory─► Presence Core tool server
                                                                 zod validation → handler → hub.apply / resolver /
                                                                 router / FreeCAD worker / Gmsh+Elmer job
    ◄── bounded outcome {ok, error?, message, …} ──────────  compactResult
  function_call_output → the model continues speaking
PresenceView ◄── GET /api/presence/events (SSE) ─────────── hub snapshot (presentations, cards, scenes, colours)
  media, tiles ◄── GET /api/presence/media|tile ──────────── hub media store, OSM tile cache (route-bounded)
  card reports ──── POST /api/presence/card ──────────────►  hub.cardReport (validated, rate-limited)
OpenAI events + real audio → PresenceEngine → activity (laid over each snapshot in the page, no round trip)
Remote assistant track → core analyser → "speaking", echo guard
```

## Mapping OpenAI session events to Presence states

Codex hooks are not copied. Realtime's `PresenceEngine` already reduces each backend's events (Realtime:
`input_audio_buffer.speech_started/stopped`, `response.created/done`, function calls, `output_audio_buffer.cleared`;
GPT-Live: transcripts, delegations, full-duplex audio) and the real audio to a mode; `client/voiceActivity.ts` maps it:
listening → `listening`, thinking → `thinking` (`working` with a label during CAD, simulation and route planning),
speaking → `responding`, idle → the hub's own state. The core's engine then shows `speaking` from the real audio.
A new user turn shortens the previous topic's temporary presentation, as the Plugin does on a new prompt.

## Security review of the new routes

| Route | Checks |
| --- | --- |
| all `/api/presence/*` | Node.js runtime; Fetch Metadata (`Sec-Fetch-Site` must be same-origin when present); viewer cookie `HttpOnly; SameSite=Strict; Path=/api/presence` selects the browser's own host. |
| `POST tool`, `card`, `surface` | plus the app's own `Origin` (or `AION_ALLOWED_ORIGINS`), as the token route; bodies bounded (256 KB / 96 KB / 64 KB) before parsing; strict schemas. |
| `GET events` | creates the viewer's host (at most 8 in memory; idle ones closed after 30 min, their FreeCAD worker stopped). |
| `GET media/:id` | id pattern, the viewer's own media only, bytes served with the type sniffed from content, `CSP: sandbox`. |
| `GET tile/z/x/y` | only tiles around the open route; cached under OSM's policy. |

Tool-level: unknown tools refused; `source` (local file / data URL) removed from `show_image` and `show_portrait`;
`cad_model` paths confined to `<home>/viewers/<id>/cad` with symbolic links resolved; no window, browser or desktop
application is ever launched on the server; FreeCAD runs only the worker's validated commands (no model-written Python
or shell); simulation programs run with a fixed, minimal environment; per-tool timeouts. The OpenAI key handling is
unchanged (server-only; Realtime gets an ephemeral secret, GPT-Live gets nothing).

Not authentication: like the token route, these routes stop other websites, not other people who can reach the server.
A public deployment must put authentication in front, and should leave `AION_ENGINEERING` off.

## Licences and third-party notices

- `src/presence-core` and `presence-assets` are covered by the Plugin's licence (draft "Aion Presence Personal Use
  License", [src/presence-core/LICENSE](../src/presence-core/LICENSE)); the copyright holder is the same as this
  repository's. **This repository itself has no LICENSE file** — a decision for the owner.
- Third-party code bundled in the page (three.js, VexFlow, Hanzi Writer, Bravura) and server (MCP SDK, zod): MIT /
  OFL, listed in [src/presence-core/THIRD-PARTY-NOTICES.md](../src/presence-core/THIRD-PARTY-NOTICES.md).
- The Chinese Writing Pack is separately licensed data (Arphic Public License; Make Me a Hanzi LGPL/GPL notices; OpenCC
  Apache-2.0): [presence-assets/packs/chinese-writing/NOTICE.md](../presence-assets/packs/chinese-writing/NOTICE.md).
  Its binary data is fetched, not committed.
- Public data services keep their terms: Wikimedia, Openverse, OpenStreetMap (Nominatim, tiles), FOSSGIS Valhalla,
  AWS Terrain Tiles. The User-Agent identifies Aion Presence Realtime.

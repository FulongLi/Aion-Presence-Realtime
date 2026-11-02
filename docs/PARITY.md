# Feature parity: Aion Presence Plugin v0.8.0 → Aion Presence Realtime

Audited on 2026-11-02 against **Plugin `fb9b210d5d34a867d58931f284c30a3f84feecad`** (`main`, v0.8.0) and **Realtime
`44fe4e6b526c28ffaa7bfb5de0d0ba1d30dafc23`** (`main` before this work). The Plugin's own tracking document
(`docs/PARITY.md` there) ported Realtime into the Plugin; this one goes the other way.

```text
Plugin:    Codex → MCP / hooks → Presence Core → renderer
Realtime:  OpenAI Realtime or GPT-Live → native function calling → Presence Core → renderer
```

## How Realtime reaches parity

Realtime does not re-implement the Plugin's features. It **vendors the Plugin's Presence Core** (`src/presence-core`,
the Plugin's `src/` verbatim plus four documented deltas, [VENDORED.md](../src/presence-core/VENDORED.md)) and adds a
thin adapter (`src/presence-realtime`): the core's hub and its tool server run in the Next.js server process, one per
browser; both voice backends call the core's tools as native functions; the page mounts the core's own view. The
Plugin's test suite runs here too (`tests/presence-core`, 26 files). See [PRESENCE-CORE.md](PRESENCE-CORE.md).

## Status before this work (Realtime `44fe4e6`)

| Area | Realtime state | Notes |
| --- | --- | --- |
| Sphere, Particle Figure | outdated | Realtime had the v0.1 figure; the Plugin has Figure 3.0 (limb curves, IK, Expressive Motion). |
| Aion Eyes, expressions, colours | missing | Plugin v0.4–v0.4.1. |
| Renderer | outdated | WebGPU only; no Canvas fallback, no 3D objects, ring, writing reveal, palette. |
| Portrait, image, terrain | outdated | browser-side resolver; no heritage portrait, no global geography, no markers, no cards. |
| Maps, routes, elevation | missing | Plugin v0.4.1 / v0.6. |
| Cards 2.0, Earth–Moon, CAD viewer, generative scenes | missing | Plugin v0.4.5 / v0.5. |
| Handwriting, music, storytelling, animation | missing | Plugin v0.4.2–v0.4.4. |
| FreeCAD, simulation | missing | Plugin v0.7 / v0.8. |
| First-run welcome | missing | Plugin v0.6 / v0.7 (spoken). |
| Voice backends, WebRTC, audio, barge-in, key handling | backend-specific (Realtime only) | Kept unchanged. |

## Matrix after this work

Status: **tested (real)** — verified end to end against the real service or program on this machine;
**tested (browser)** — run in the real page and renderer through the server path, without a voice model;
**tested (unit)** — automated tests with stand-ins (not evidence of real-world behaviour on their own);
**implemented, unverified** — wired, but not exercised end to end here; **backend-specific**; **excluded**.

### Body, presence and rendering

| Capability | Status | Evidence |
| --- | --- | --- |
| Sphere | tested (browser) | WebGPU and Canvas, 20,000 / 4,000 particles (`?debug=1`). |
| Particle Figure (3.0) | tested (browser) | `set_body_form {body: "figure"}` in the page; core.test, v44.test. |
| Aion Eyes | tested (browser) | `set_body_form {body: "eyes"}` (Canvas renderer); v4.test. |
| Body transitions | tested (unit + browser) | sphere ↔ figure ↔ eyes in the page; core.test. |
| Expressions and gestures (`express`) | tested (browser) | `express happy`, `wave` returned ok; v4.test. |
| Colours, remembered per browser | tested (unit + browser) | `set_colors gold` / reset; appearance.json reloaded by a new host (presenceAdapter.test). |
| WebGPU renderer | tested (browser) | Chrome (Claude browser pane), macOS. |
| Automatic Canvas fallback | tested (browser) | `?renderer=canvas` forced; the device-lost path is the core's (render.test). Not tested on a machine without WebGPU. |
| Particle physics, adaptive quality | tested (unit) | render.test (ported). |
| Activity from the voice session (listening, thinking, responding, working) | tested (unit) | presenceClient.test (mapping); not observed with a live voice session. |
| Speaking driven by real assistant audio | implemented, unverified | The remote WebRTC track goes through the core's analyser into its host-audio source. Needs a live session (no API key here). |
| Local listening on the shared microphone | implemented, unverified | `view.listen(stream)`; the preview browser blocked the microphone. |
| Greeting wave + spoken greeting | implemented, unverified | Greeting gate unchanged (controller.test); wave is the core's. |
| First-run welcome (spoken by the Realtime voice) | tested (unit + browser) | Card shown on first visit; RealtimeWelcomeSpeech tested with a stand-in voice. Speech itself needs a session. |

### Visual capabilities

| Capability | Status | Evidence |
| --- | --- | --- |
| Portrait (heritage oval + photo card) | tested (real, browser) | Nikola Tesla from Wikipedia, hybrid route. |
| Image lookup (Wikipedia → Commons → Openverse) | tested (unit) | resolver.test; live lookups follow the same chain as the portrait. |
| Terrain (real elevation) | tested (real, browser) | Route terrain around Ben Nevis (formed and inspected); `show_terrain Scotland` returned ok but was not inspected visually. |
| Global maps and markers | tested (unit), browser call ok | `show_map United States` + Los Angeles marker returned ok (not inspected visually); v41.test, v06.test. |
| Route planning (walking, cycling, hiking) | tested (real, browser) | Hiking: Glen Nevis Visitor Centre → Ben Nevis, 8.85 km, ↑1310 m (Valhalla/FOSSGIS); cycling Glasgow → Edinburgh returned ok. |
| Elevation profile, terrain ↔ route card | tested (real, browser) | Route Explorer card with OSM tiles (proxied, route-bounded) and profile 16–1330 m. |
| Visual forms (Tao, constellations, zodiac) | tested (browser) | yin-yang, Orion. |
| Clock, number, text, symbol, emoji, result | tested (browser) | all returned ok and formed. |
| Interactive Card 2.0 | tested (browser) | lifecycle, controls, reports over `/api/presence/card`. |
| Earth–Moon card | tested (browser) | rendered in its sandboxed frame. |
| CAD viewer card | tested (browser) | demonstration transformer model. |
| Generative Scene IR, validation, edit, undo/redo | tested (browser) | solar system: create (rev 1) → patch (rev 2) → undo (rev 3), each confirmed rendered by the card; v05/v051/v052.test. |
| 3D objects (`show_scene`, `set_scene_view`) | tested (unit), browser partial | Saturn preset returned ok; v4.test. |
| Handwriting (Chinese, English) | tested (browser) | 永 stroke order with the Chinese Writing Pack; "Hello". |
| Music (notation, playback, lessons) | tested (browser), playback unverified | treble-clef concept card; v42.test. Audio playback not listened to. |
| Short figure animations | tested (browser) | `play_animation walk-and-stop` returned ok. |
| Storytelling / narration style | backend-specific | Prompt guidance (aion_reference "storytelling"); quality depends on the voice model. |
| Sound visualizer (tab, bridge, Codex Voice Sync) | excluded | macOS bridge and Codex Voice Sync belong to the Plugin's host; the assistant's voice reaches the body directly. |

### Intelligence and tools

| Capability | Status | Evidence |
| --- | --- | --- |
| One canonical capability registry | tested (unit) | 30 core tools offered, 6 excluded with reasons (presenceAdapter.test). |
| Strict validation, structured errors | tested (unit) | the core's zod schemas via its tool server; stable error codes. |
| Bounded metadata | tested (unit) | Realtime profile ≤ 35.5 KB, GPT-Live ≤ the core's own listing (~46 KB vs ~54 KB). |
| Progressive disclosure (`aion_reference`) | tested (unit + browser) | 12 guides from the Plugin skill. |
| Realtime backend receives the tools | tested (unit) | token request carries the registry's tools; not run against OpenAI here. |
| GPT-Live backend receives the tools | tested (unit) | session request carries them; not run against OpenAI here. |
| Function-call execution and result continuation | tested (unit) | toolLoop / liveClient tests (existing) with the new result type; not run against OpenAI here. |
| Asynchronous operations | tested (real) | `simulate run` waits ≤ 50 s and otherwise reports "running"; never "done" early. |
| Scene and document state across turns | tested (unit + browser) | hub per browser; scene revisions; CAD documents per viewer home. |
| Selected objects and later edits | tested (unit) | `inspect_interactive_card`, `$selected` faces (v08-sim.test, v45.test). |
| Illustration vs computed result | tested (unit) | prompts + result fields; simulation results carry their numbers and units. |

### Engineering

| Capability | Status | Evidence |
| --- | --- | --- |
| FreeCAD: create, modify, parameters, undo, save `.FCStd` | tested (real) | presenceEngineering.test through the adapter; v07-cad real scenarios (ported). |
| Workspace confinement of CAD paths | tested (unit + real) | `/tmp/escape.FCStd` refused; symlink escape refused. |
| CAD preview (GLB) and selection | tested (unit) | v07-cad.test (ported); not viewed in the page with a real document. |
| Gmsh meshing, Elmer FEM | tested (real) | busbar R = 3.4483e-5 Ω vs L/(σA); ported real tests A–E (conduction, heat, electro-thermal, mesh convergence, CAD change re-run). |
| DC conduction, steady heat, electro-thermal | tested (real) | ported v08-sim-real A–C. |
| Materials, boundary conditions, units | tested (unit + real) | v08-sim.test, real tests. |
| Simulation Card, fields, probes | tested (unit) | v08-sim.test; not viewed in the page. |
| Unsupported physics refused | tested (real) | magnetostatic study refused. |
| Detached simulation runner | excluded | Realtime runs jobs in its long-lived server process. |
| Capability detection and fallback | tested (unit) | tools not offered without programs; `engineering-unavailable` if called. |

### Excluded (Plugin host only)

| Plugin | Why |
| --- | --- |
| `open_presence`, first-run window launcher, companion/MCP Apps transports | Realtime's page is Aion's surface. |
| `set_presence_state`, Codex hooks, answer-tail estimate | Activity comes from the OpenAI session and real audio. |
| `set_audio_visualizer`, macOS audio bridge, Codex Voice Sync | Host-specific capture. |
| `show_artifact` and local `source` paths for images | A voice model has no file system; reading the server's disk would be unsafe. |
| Plugin packaging, marketplace, release scripts | Not applicable. |

## Differences from the Plugin

- **Welcome speech**: spoken by the Realtime voice (one voice), not the browser synthesizer; caption timing is
  estimated within the real audible time.
- **Speaking**: always from real assistant audio (the Plugin is semantic unless its macOS bridge runs).
- **CAD paths**: confined to each browser's workspace (the Plugin allows any path on the user's machine).
- **Engineering**: off in production builds unless `AION_ENGINEERING=on`.
- **Per-browser state**: one Aion per browser (cookie), at most 8 in memory; the Plugin has one hub per user.
- **Tool descriptions**: shortened for the Realtime model; "Codex" wording neutralised.
- **Legacy body**: `src/aion`, `src/particle`, `src/visual-*` stay for the promo film; the live page no longer uses them.

# Testing

Four levels, kept apart. Only the first two are automated; nothing is called verified on the strength of a mock alone.

| Level | What | Where |
| --- | --- | --- |
| Unit (stand-ins) | logic with mocked OpenAI, WebRTC, network and programs | `tests/*.test.ts`, `tests/presence-core/*.test.ts` |
| Real toolchain | the installed FreeCAD, Gmsh and Elmer, checked against analytic solutions | `tests/presenceEngineering.test.ts`, `tests/presence-core/v07-cad.test.ts`, `v08-sim-real.test.ts` (skip without the programs) |
| Real page | the dev server in a real browser, every capability run through the server tool path (`?debug=1`), no voice model | manual, recorded below |
| Live voice | a real OpenAI Realtime or GPT-Live session with a microphone | [smoke-test.md](smoke-test.md) (needs `OPENAI_API_KEY`) |

## Results for v0.2.0 (2026-11-02, macOS, Node 22.23, Chrome in the Claude browser pane)

| Check | Result |
| --- | --- |
| `npm run lint` | pass (0 problems) |
| `npm run typecheck` (app, and core with the Plugin's settings) | pass |
| `npm test` | 641 tests: 640 pass, 1 skipped (the Plugin's detached simulation runner, not used here) |
| `npm run build` (webpack) | pass |
| Real FreeCAD via the Realtime adapter | pass: create → set parameter → undo → save `.FCStd` (confined) |
| Real Gmsh + Elmer via the Realtime adapter | pass: busbar R = 3.448275857e-5 Ω vs L/(σA) = 3.4483e-5 Ω; magnetostatic refused |
| Real FreeCAD / FEM, ported Plugin scenarios | pass: conduction, heat source, heat flux, electro-thermal, two materials, mesh convergence, CAD change re-run |
| Real page (Turbopack dev) | WebGPU sphere, figure, Canvas fallback (eyes, yin-yang); text; Tesla heritage portrait + card; hiking route with OSM tiles and elevation profile; Earth–Moon card; CAD viewer card; solar-system scene create → patch → undo; 永 and "Hello" handwriting; treble-clef music card; 16 further tool calls returned ok (terrain, map + marker, forms, emoji, clock, number, symbol, express, colours, animation, cycling route) |
| Live Realtime / GPT-Live session | **not run** (no API key in this environment): voice turns, function-call continuation against OpenAI, audio-driven speaking, the spoken welcome and the spoken greeting are implemented and unit-tested but unverified live |
| Microphone in the page | **not run** (the preview browser blocked it) |
| A machine without WebGPU | **not run** (Canvas forced with `?renderer=canvas` instead) |

## Running the live voice check

Set `OPENAI_API_KEY` in `.env.local`, `npm run dev`, open <http://localhost:3000/?debug=1>, allow the microphone, and
follow [smoke-test.md](smoke-test.md) once with `?voice=realtime` and once with `?voice=live`. The debug panel shows
each function call, its outcome and timing, the voice mode and the Presence activity.

# Aion Presence Realtime

Aion Presence Realtime is a realtime voice AI with a living visual body. You talk to Aion in your own voice; it
answers in its own voice over WebRTC, and its particle body listens, thinks and speaks with you — and becomes what is
worth seeing: a portrait, a map or the terrain of a real place, a hiking route with its elevation, a 3D scene you can
edit, a Chinese character written stroke by stroke, music, a CAD model, a simulation result.

There is no chat window or dashboard: the body is the interface, and cards appear beside it only when Aion presents one.

## Relationship to Aion Presence Plugin

[Aion Presence Plugin](https://github.com/FulongLi/Aion-Presence-Plugin) gives Codex the same body. The two share one
**Presence Core** and differ only in the intelligence behind it:

```text
Plugin:    Codex → MCP / hooks                          → Presence Core → renderer
Realtime:  OpenAI Realtime or GPT-Live → native functions → Presence Core → renderer
```

Realtime vendors the Plugin's Presence Core (v0.8.0, commit `fb9b210`) in [`src/presence-core`](src/presence-core/VENDORED.md)
and adapts it in [`src/presence-realtime`](src/presence-realtime): the core's hub and tool server run inside this app's
server, both voice backends call its tools as native function calls, and the page shows the core's own view.
Details: [docs/PRESENCE-CORE.md](docs/PRESENCE-CORE.md) · parity matrix: [docs/PARITY.md](docs/PARITY.md).

## Shared capabilities

- **Body**: sphere, Aion Eyes and the particle figure; expressions, gestures, remembered colours; WebGPU with an
  automatic Canvas fallback.
- **Seeing**: heritage portraits, images, global maps with markers, real terrain, the visual language (Tao,
  constellations, zodiac), clock, numbers, text, symbols, emoji.
- **Routes**: walking, cycling and hiking on OpenStreetMap paths, drawn on the terrain beside a card with distance,
  time and elevation profile.
- **Cards and scenes**: Earth–Moon, CAD viewer, generative scenes (Scene IR, validated, edited, undo/redo), 3D objects.
- **Teaching**: handwriting (Chinese, English, symbols), music notation, playback and lessons, short animations.
- **Engineering (local)**: FreeCAD models (`.FCStd`) and Gmsh + Elmer simulation (DC conduction, steady heat,
  electro-thermal) with computed, unit-checked results — see [docs/ENGINEERING.md](docs/ENGINEERING.md).
- **First-run welcome**, spoken by Aion's own voice.

## Two voice backends

| Backend | How it works |
| --- | --- |
| **OpenAI Realtime** (`realtime`, default) | One speech-to-speech model listens, speaks and calls Aion's tools. The browser gets a 60-second ephemeral secret. |
| **GPT-Live** (`live`) | `gpt-live-1` listens and speaks full duplex and delegates to a Responses model (`gpt-5.6-terra`) that reasons and calls the same tools. The browser gets no credential at all. |

Both receive the same canonical tool registry (the Realtime model a shortened profile, the GPT-Live backend full
descriptions). Choose with `SCF_VOICE_BACKEND`, or `?voice=realtime|live` per page load. Details of the sessions,
audio, barge-in and key handling: [docs/realtime-voice.md](docs/realtime-voice.md).

## Install and run

Requirements: Node 22+, a desktop browser (WebGPU preferred: current Chrome, Edge or Safari; others use the Canvas
fallback), a microphone, and an OpenAI API key.

```bash
cp .env.example .env.local      # set OPENAI_API_KEY=sk-...
npm install
npm run presence:assets         # Chinese Writing Pack data and the demo CAD model (checksum-verified)
npm run dev
```

Open <http://localhost:3000>, allow the microphone and talk. `?debug=1` (development) shows diagnostics and runs every
capability without the model.

`OPENAI_API_KEY` is read only by server routes and never reaches the browser. All settings, including routing,
engineering and the data directory, are documented in [.env.example](.env.example).

### Optional: FreeCAD, Gmsh, Elmer

Install FreeCAD 1.0+ (it bundles Gmsh) and Elmer FEM. Under `npm run dev` they are detected and offered
automatically; a production build needs `AION_ENGINEERING=on`. They are never assumed in a cloud deployment: without
them the CAD and simulation tools are simply not offered. See [docs/ENGINEERING.md](docs/ENGINEERING.md).

## Supported and unsupported

Supported: everything above, with one Aion per browser. Not supported: Plugin-host features (Codex hooks, the
companion-window launcher, the macOS audio bridge and Codex Voice Sync, showing files from the agent's disk);
simulation physics beyond DC conduction, steady heat and their sequential coupling (refused, never approximated).
These routes are not authentication: put real authentication in front of any public deployment.

## Testing

```bash
npm run lint
npm run typecheck   # app + the vendored core with the Plugin's stricter settings
npm test            # Realtime tests, the Plugin's core tests, and real FreeCAD/Gmsh/Elmer runs where installed
npm run build
```

Unit tests mock OpenAI and WebRTC; real-toolchain tests skip (and say so) without the programs. What was verified
end to end and what was not is listed in [docs/TESTING.md](docs/TESTING.md).

## Status

v0.2.0 — Presence Core synchronised with Plugin v0.8.0. Verified in the real page: bodies, renderers, portraits,
routes with elevation, cards, generative scenes with undo, handwriting, music; verified with the real programs:
FreeCAD modelling and Gmsh/Elmer simulation through the voice tool path. Not yet verified with live OpenAI sessions
in this release (no key in the development environment): voice turns driving the body, audio-driven speaking, the
spoken welcome. See [docs/PARITY.md](docs/PARITY.md).

## Documentation

| | |
| --- | --- |
| [docs/PRESENCE-CORE.md](docs/PRESENCE-CORE.md) | Architecture of the adapter, request flow, security review, licences |
| [docs/PARITY.md](docs/PARITY.md) | Feature parity with Plugin v0.8.0 and its evidence |
| [docs/ENGINEERING.md](docs/ENGINEERING.md) | FreeCAD, Gmsh, Elmer setup and limits |
| [docs/TESTING.md](docs/TESTING.md) | Test levels and results |
| [docs/realtime-voice.md](docs/realtime-voice.md) | Voice backends, sessions, audio, configuration (detailed) |
| [docs/architecture.md](docs/architecture.md) | The legacy body (still used by the promo film) |
| [docs/promo.md](docs/promo.md), [docs/smoke-test.md](docs/smoke-test.md) | Promo film; manual voice smoke test |
| [src/presence-core/VENDORED.md](src/presence-core/VENDORED.md) | Source commit, omissions and local deltas of the vendored core |

Created by Spirit Connect. Licence: the vendored Presence Core is under the Plugin's licence
([src/presence-core/LICENSE](src/presence-core/LICENSE)); see docs/PRESENCE-CORE.md.

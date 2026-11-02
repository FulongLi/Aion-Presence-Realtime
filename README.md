# Aion Presence Realtime

A voice AI with a living particle body. Talk to Aion and it answers in its own voice, while its body listens, thinks,
speaks — and shows what is worth seeing: a portrait, a map, a hiking route, a 3D scene, handwriting, music, a CAD model
or a simulation result. There is no chat window; the body is the interface.

It shares one **Presence Core** with [Aion Presence Plugin](https://github.com/FulongLi/Aion-Presence-Plugin) (the same
body for Codex). Only the intelligence differs:

```text
Plugin:    Codex                       → Presence Core → body
Realtime:  OpenAI Realtime or GPT-Live → Presence Core → body
```

## What Aion can do

- **Body**: sphere, eyes or figure; expressions, gestures and colours.
- **Show**: portraits, images, maps and terrain anywhere, symbols, clock, numbers, emoji.
- **Routes**: walking, cycling and hiking, with distance, time and an elevation profile.
- **Cards and scenes**: Earth–Moon, a CAD viewer, and 3D scenes you can edit and undo.
- **Teach**: handwriting (Chinese and English), music, short animations.
- **Engineer** (local, optional): FreeCAD models and Gmsh + Elmer simulations with real computed results.

## Quick start

You need Node 22+, a desktop browser, a microphone and an OpenAI API key.

```bash
cp .env.example .env.local      # set OPENAI_API_KEY=sk-...
npm install
npm run presence:assets         # handwriting data and the demo CAD model
npm run dev
```

Open <http://localhost:3000>, allow the microphone and talk. Add `?debug=1` to try every capability without speaking.

The API key stays on the server. All other settings are in [.env.example](.env.example).

## Voice backends

- **OpenAI Realtime** (default): one model listens, speaks and uses Aion's tools.
- **GPT-Live**: a full-duplex voice that hands reasoning and tools to a backend model.

Pick one with `AION_VOICE_BACKEND=realtime|live`, or `?voice=live` in the URL.

## Engineering (optional)

Install [FreeCAD](https://www.freecad.org/downloads.php) 1.0+ (includes Gmsh) and Elmer FEM. In `npm run dev` they are
found automatically; production needs `AION_ENGINEERING=on`. Without them, CAD and simulation are simply not offered.
See [docs/ENGINEERING.md](docs/ENGINEERING.md).

## Testing

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Results, including what has not been verified with a live voice session: [docs/TESTING.md](docs/TESTING.md).

## Deploying

The server routes block other websites but do not authenticate users. Put real authentication in front of any public
deployment, and leave engineering off.

## Learn more

- [How Realtime uses the Presence Core](docs/PRESENCE-CORE.md) — architecture, security, licences
- [Feature parity with the Plugin](docs/PARITY.md)
- [Voice backends in detail](docs/realtime-voice.md)
- [Engineering setup](docs/ENGINEERING.md) · [Testing](docs/TESTING.md) · [Promo film](docs/promo.md)

Created by Spirit Connect. The Presence Core is under the Plugin's licence ([src/presence-core/LICENSE](src/presence-core/LICENSE)).

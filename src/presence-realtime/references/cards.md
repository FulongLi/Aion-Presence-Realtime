<!-- From Aion Presence Plugin fb9b210, skills/aion-presence/SKILL.md (Interactive cards, Body, card or both). -->

## Interactive cards

An interactive card is a small application that runs beside Aion's body in an isolated frame, stays until it is
closed or replaced, and is manipulated directly by the user (drag to turn, scroll or pinch to zoom, click to select).
Three applications are registered (the third, `generative-scene`, builds the scenes you write: see Generated scenes
below); nothing else can be launched, and you never pass code, HTML or URLs:

- **`earth-moon`** — Earth turning under its tilted axis, the Moon on its inclined orbit turning once per orbit, light
  from the Sun. Use it for "Show me the Earth and Moon", "Why does the same side of the Moon face Earth?", lunar phases
  or orbits. Distances are compressed so both bodies are visible; the card says so ("Not to scale") and `set-scale`
  `true-distance` shows the real distance. Its numbers are approximate and documented (circular orbit, mean distance):
  never present them as an ephemeris.
- **`cad-viewer`** — a glTF/GLB engineering model: orbit, zoom, pan, standard views, fit, select a component (it
  highlights and shows its metadata), hide, isolate, show all. `model: "transformer"` is the bundled demonstration (a
  small EI transformer); a `.glb`/`.gltf` path the user names loads their model. The viewer itself never edits geometry:
  to *design* or *change* a part, use `cad_model` (FreeCAD, below), which shows each revision in this same viewer.

`show_interactive_card` opens one (`layout` compact, expanded — the default — or fullscreen; `settings` such as
`{ "focus": "moon", "teaching": true }`). Showing the same app again keeps the card (a new model loads into the open
viewer). `control_interactive_card` changes it — universal actions `pause`, `resume`, `reset`, `expand`, `collapse`,
`fullscreen`, `close`, or the app's commands: "Pause the simulation" → `pause`; "Focus on the Moon" → `focus` `moon`;
"Speed it up" → `set-time-speed` `10`; "Show me the orbital plane" → `show-orbital-plane` `true`; "Reset the view" →
`reset-camera`; "Hide the winding" → `hide` `assembly/windings` (component ids come from inspecting the card). The
result says whether the card confirmed the command; if no window shows the card, say so instead of claiming it changed.

`inspect_interactive_card` reads what the user sees: the selection and its metadata, the components, the state.
**Inspect before answering** "What is this component?" or "What did I select?", and explain only from what it reports
(the model's own metadata and measured sizes) plus general knowledge you label as such — never invent a part number,
rating or dimension the model does not carry. A click in the card does not start a new turn by itself: when the user
then asks, inspect. Teaching the Moon: open with `teaching` on (or `show-teaching`), let the orbit run, pause when the
user wants to look, explain that one rotation takes as long as one orbit, and offer `compare-no-rotation` to show what
would happen otherwise. Fullscreen fills Aion's space; true browser fullscreen needs the user's click on the card's own
fullscreen button. Close the card (`close`, or `clear_presentation`) when the topic ends.

## Body, card or both

Every visual reaches the user through the Presentation Router. Leave `presentation` out (`auto`) unless you have
a clear reason: Aion decides, and the result's `presentation.route` says what happened.

- **body**: the particle body itself becomes it — forms, constellations, zodiac and Tao symbols, terrain relief,
  3D objects, a clock, one key number, a short word, a symbol, an emoji. No card.
- **card**: a quiet, high-fidelity card beside the living body — longer text, code, file changes, results,
  screenshots, documentation, a photograph whose detail matters (`detail: true`), music notation.
- **hybrid**: both, when it materially helps — a recognizable portrait forms in particles while the original
  photograph stands beside it (the default for `show_portrait`, looked up or local); a high-resolution photo; terrain
  with a map card when exact geography matters (`presentation: "hybrid"` on `show_terrain`); notation with the
  symbol being explained (`symbol` on `show_music`, e.g. `music.treble-clef`) formed by the body; a symbol being
  written beside its numbered stroke order (the default for `show_stroke_animation`).
- An animation (`play_animation`) is the body alone: the figure performs, with its few objects. One animation at a
  time: a new visual or animation replaces the one on show.

Never double-present by habit: the yin-yang, Orion or 42% are the body alone; a code diff is a card alone. Long
text never becomes particles, whatever is asked. Do not repeat in words what a card already shows exactly.

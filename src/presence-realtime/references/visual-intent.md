<!-- From Aion Presence Plugin fb9b210, skills/aion-presence/SKILL.md (Visual Intent Policy). -->

## Visual Intent Policy

While Aion is open, the user does not need to say "show me" or name a tool. Whenever they ask to see something,
or ask what someone or something looks like, where it is, or what a place's terrain is like, **show it with the
matching tool and answer in words as well** — do not only describe it. Strongly consider a visual for: show,
display, draw, visualize, "what does X look like", "what did X look like", "where is X", "what is the
terrain/topography of X", "show me a portrait / map / reference", "show me this symbol or form".

**Computation is not visualization.** While Aion is open, when the user asks for a computed physical result — an
accurate field (magnetic, electric, flow, thermal), a circuit or physics simulation, stresses — begin your answer by
saying, in one sentence, that Aion can visualize but has no numerical solver, so it cannot compute that field itself.
Then offer what is real: you can work out a simple analytic case yourself (say the numbers are your calculation, not
Aion's), or Aion can show an illustrative picture labelled as not computed. Never present an animation as the result.

| The user says (any language) | Call |
| --- | --- |
| "What did Nikola Tesla look like?" | `show_portrait` `{ "person": "Nikola Tesla" }` |
| "Show me Nikola Tesla." | `show_portrait` `{ "person": "Nikola Tesla" }` |
| "展示一下牛顿的肖像。" | `show_portrait` `{ "person": "Isaac Newton" }` |
| "Show me the classic portrait instead." | `show_portrait` `{ "person": "Isaac Newton", "style": "classic" }` |
| "Show this local photograph as a portrait." | `show_portrait` `{ "source": "/Users/me/Pictures/grandmother.jpg" }` |
| "Show this image without the oval frame." | `show_image` `{ "source": "/Users/me/Pictures/grandmother.jpg", "intent": "portrait", "style": "classic" }` |
| "Tell me the story of Nikola Tesla." | `show_portrait` `{ "person": "Nikola Tesla" }` |
| "What is the terrain of the UK like?" | `show_terrain` `{ "region": "United Kingdom" }` |
| "Show me Scotland's topography." | `show_terrain` `{ "region": "Scotland", "style": "topography" }` |
| "展示一下中国的地形。" | `show_terrain` `{ "region": "China" }` |
| "Show me Scotland's terrain and mark Glasgow in red." | `show_terrain` `{ "region": "Scotland", "markers": [{ "place": "Glasgow", "color": "red" }] }` |
| "Show me the United States." | `show_map` `{ "region": "United States" }` |
| "Show me Africa." | `show_map` `{ "region": "Africa" }` |
| "Show me where Los Angeles is in the USA." | `show_map` `{ "region": "United States", "markers": [{ "place": "Los Angeles", "highlight": true }] }` |
| "Show me Scotland and mark Glasgow in red." | `show_map` `{ "region": "Scotland", "markers": [{ "place": "Glasgow", "color": "red" }] }` |
| "Mark Los Angeles in red." | `mark_map` `{ "add": [{ "place": "Los Angeles", "color": "red" }] }` |
| "Add New York in yellow." | `mark_map` `{ "add": [{ "place": "New York", "color": "yellow" }] }` |
| "Change the Los Angeles marker to blue." | `mark_map` `{ "change": [{ "place": "Los Angeles", "color": "blue" }] }` |
| "Remove the New York marker." | `mark_map` `{ "remove": ["New York"] }` |
| "Plan a cycling route from Glasgow to Edinburgh." | `plan_route` `{ "from": "Glasgow", "to": "Edinburgh", "mode": "cycling" }` |
| "Plan a walking route from Edinburgh Castle to Arthur's Seat." | `plan_route` `{ "from": "Edinburgh Castle", "to": "Arthur's Seat", "mode": "walking" }` |
| "Show me a hiking route from Ambleside to Grasmere." | `plan_route` `{ "from": "Ambleside", "to": "Grasmere", "mode": "hiking" }` |
| "Reverse the route." | `plan_route` `{ "reverse": true }` |
| "Change to cycling." | `plan_route` `{ "mode": "cycling" }` |
| "Show me the highest point." | `control_interactive_card` `{ "action": "show", "value": "highest" }` |
| "Show me the full route again." | `control_interactive_card` `{ "action": "show", "value": "route" }` |
| "Remove the route." | `plan_route` `{ "clear": true }` |
| "Change your colour to blue." | `set_colors` `{ "base": "blue" }` |
| "把粒子颜色改成紫色。" | `set_colors` `{ "base": "紫色" }` |
| "Use #00BFFF." | `set_colors` `{ "base": "#00BFFF" }` |
| "Restore your original colour." | `set_colors` `{ "reset": "base" }` |
| "What does Orion look like?" | `show_form` `{ "form": "Orion" }` |
| "Show me the yin-yang." | `show_form` `{ "form": "yin yang" }` |
| "What time is it?" | `show_clock` `{}` |
| "Show me 42%." | `show_number` `{ "value": "42%" }` |
| "Take a human form." | `set_body_form` `{ "body": "figure" }` |
| "Show your eyes." | `set_body_form` `{ "body": "eyes" }` |
| "Go back to your original form." | `set_body_form` `{ "body": "sphere" }` |
| "Look happy." | `express` `{ "expression": "happy" }` |
| "Make a surprised face." | `express` `{ "expression": "surprised" }` |
| "Wave at me." | `express` `{ "gesture": "wave" }` |
| "Show me an Egyptian pyramid in 3D." | `show_scene` `{ "preset": "pyramid" }` |
| "Can you visualize Saturn?" | `show_scene` `{ "preset": "saturn" }` |
| "Show a DNA double helix." | `show_scene` `{ "preset": "dna" }` |
| "Show me a water molecule in 3D." | `show_scene` `{ "scene": { "title": "Water molecule", "objects": [{ "type": "sphere", "radius": 0.6 }, { "type": "sphere", "radius": 0.36, "position": [-0.78, -0.58, 0] }, { "type": "sphere", "radius": 0.36, "position": [0.78, -0.58, 0] }] } }` |
| "Rotate it." | `set_scene_view` `{ "rotate": "right" }` |
| "Show it from above." | `set_scene_view` `{ "rotate": "up" }` |
| "I want to learn how to read music." | `music_lesson` `{ "lesson": 1 }` |
| "我想学看五线谱。" | `music_lesson` `{ "lesson": 1, "language": "zh" }` |
| "Next." | `music_lesson` `{ "step": "next" }` |
| "Can you explain that in Chinese?" | `music_lesson` `{ "language": "zh" }` |
| "It's an E." | `music_lesson` `{ "answer": "E" }` |
| "What does middle C look like?" | `show_music` `{ "title": "Middle C", "notes": [{ "pitch": "C4", "duration": "whole", "label": "middle C" }], "highlight": [{ "note": 0 }] }` |
| "Show me the C major scale." | `show_music` `{ "scale": { "tonic": "C4" } }` |
| "Can you play it?" | `play_music` `{}` |
| "Play the C major scale." | `play_music` `{ "scale": { "tonic": "C4" } }` |
| "Play it slower." | `play_music` `{ "tempo": 60 }` |
| "React to your own voice." | `set_audio_visualizer` `{ "source": "codex" }` |
| "Visualize the music." | `set_audio_visualizer` `{ "source": "system", "app": "Music", "mode": "spectrum" }` |
| "Show me your audio spectrum." | `set_audio_visualizer` `{ "mode": "spectrum" }` |
| "Make the particles more responsive." | `set_audio_visualizer` `{ "intensity": "expressive" }` |
| "Go back to your normal appearance." | `set_audio_visualizer` `{ "mode": "sphere" }` |
| "Stop listening to system audio." | `set_audio_visualizer` `{ "stop": ["system"] }` |
| "Always move with your own voice." | `set_audio_visualizer` `{ "voice_sync": true }` |
| "Stop reacting to your voice." | `set_audio_visualizer` `{ "voice_sync": false }` |
| "Teach me how to write the character for eternity." | `show_stroke_animation` `{ "symbol": "永" }` |
| "Show me the stroke order of 水." | `show_stroke_animation` `{ "symbol": "水" }` |
| "How do I write a lowercase g?" | `show_stroke_animation` `{ "symbol": "g" }` |
| "Show me how to write a treble clef." | `show_stroke_animation` `{ "symbol": "treble clef" }` |
| "How do you write pi?" | `show_stroke_animation` `{ "symbol": "π" }` |
| "Write it more slowly." | `control_animation` `{ "action": "replay", "speed": "slow" }` |
| "Repeat the third stroke." | `control_animation` `{ "action": "repeat", "stroke": 3 }` |
| "Next stroke." | `control_animation` `{ "action": "next" }` |
| "Show the whole character again." | `control_animation` `{ "action": "complete" }` |
| "Show a stick figure jumping over a box." | `play_animation` `{ "demo": "jump-over-obstacle" }` |
| "Animate a figure picking up a ball." | `play_animation` `{ "demo": "pick-up-object" }` |
| "Make the figure walk toward the box." | `play_animation` `{ "sequence": { "title": "Walk to the box", "start": { "x": -1 }, "objects": [{ "id": "box", "type": "box", "x": 0.6 }], "actions": [{ "do": "walk", "to": "box" }, { "do": "face", "toward": "viewer" }] } }` |
| "Replay the animation." | `control_animation` `{ "action": "replay" }` |
| "Pause." | `control_animation` `{ "action": "pause" }` |
| "What does a Tesla Model Y look like?" | `show_image` `{ "query": "Tesla Model Y", "intent": "vehicle" }` |
| "Let me see the details of that painting." | `show_image` `{ "query": "The Starry Night", "intent": "reference", "detail": true }` |
| "Show me our company logo." | `show_image` `{ "query": "Spirit Connect logo" }` |

Choosing the tool (Aion's own visual language comes first):

- `show_portrait`: a real person's face. Not just because a name appears in conversation. Every portrait is a
  **heritage portrait** by default — an antique oval of particles with a silver outline, beside the original
  photograph — so leave `style` out. Only when the user asks for the classic head-and-shoulders portrait ("the
  classic portrait instead", "without the oval") pass `style: "classic"`. A portrait photograph **on this machine**
  (one the user gives you, one you generated) takes `source` (an absolute path) instead of a lookup, with `person` as
  its name if known: it is composed exactly like a looked-up one, and the card keeps the original file untouched.
  Treat a local picture as a portrait only when the user says it is one or the request makes it clear ("show this
  photo of my grandmother as a portrait"); a local landscape, screenshot or car stays `show_image` with `source`.
- `show_terrain`: the terrain, topography or relief of a real place — a continent, country, part of one, mountain
  range, island. Styles: terrain, topography, relief, heightmap. `markers` pins places on the relief.
- `show_map`: a map — where a place is, a country or continent as an outline with its neighbours, places marked in
  colour. "Where is X?", "Show me the United States", "Show me Africa", "mark Glasgow". Relief and mountains are
  `show_terrain`; a map is never `show_image`.
- `mark_map`: change the places marked on the map or terrain on show — add, recolour, relabel, highlight, remove,
  clear — without forming the map again. Use it for follow-ups ("Add New York", "Make it blue", "Remove Paris", "Add
  it to the map"). If the user asks "Where is San Francisco?" while a map that contains it is on show, mark it there
  (`highlight: true`) rather than starting a new map.
- `plan_route`: a real route between places — walking (the default), cycling or hiking — planned by a routing service
  on OpenStreetMap's paths, drawn on the particle terrain beside the Route Explorer card. See Routes below.
- `set_colors`: Aion's colours, only when the user asks. `base` is every particle (sphere, eyes, figure, visuals);
  `accent` is markers and highlights. Words in any language, presets or #RRGGBB; `reset` restores Aion Silver (base),
  Aion Coral (accent) or both. Remembered across sessions. Photographs and cards are never tinted.
- `show_form`: Aion's own visual language, drawn directly with no image search. Use it, never `show_image`, for
  Taoist and Eastern symbols (the yin-yang/taiji 太极, the yin and yang lines, the eight trigrams 乾 兑 离 震 巽 坎
  艮 坤, the bagua 八卦), constellations and star clusters (Orion, Ursa Major/the Big Dipper, Cassiopeia,
  Scorpius, Leo, Cygnus, the Pleiades), the twelve zodiac signs and the planetary symbols. A zodiac sign ("I'm a
  Leo") is astrology.leo; the star pattern ("the Leo constellation") is astronomy.leo; Scorpio is the sign,
  Scorpius the constellation. If the result is `form-not-found`, use another tool or just speak.
- `show_image` with `query` (and an `intent`: portrait, celebrity, object, vehicle, product, reference, map,
  general): what something looks like — a vehicle, product, building, animal, artwork, map. With `source`: an
  image on this machine that you generated or found (a screenshot, a rendered diagram), by absolute path — shown
  as it is (a card), unless `intent: "portrait"` says it is a portrait.
- `show_clock`: when asked what time it is, call it without a time; its result tells you the local time — say it.
- `show_number`: only the single key number of an answer. `show_text` and `show_symbol`: sparingly;
  `show_symbol` is for simple universal marks (check, cross, arrows, plus, minus, heart, star, question, exclamation).
- `show_emoji`: one emoji as a brief expressive reaction, like a gesture, or when the user asks to see one.
  Only when it genuinely improves the moment (celebration, amusement, surprise, an idea, a launch); never on
  every reply, as filler, or instead of a factual visual that fits better.
- `set_body_form`: only when the user asks Aion to take a form ("show your eyes", "take a human form", "become a
  sphere", "go back to your original form" — the sphere, "变成人形", "回到球体"). The figure and the eyes are not
  something to search for. Do not switch bodies by yourself; the user chooses.
- `express`: an expression (neutral, attentive, thinking, curious, happy, surprised, confused, sleepy, concerned)
  or a gesture (wave, nod, point, shrug, surprise, jump, step, turn, look-around, think) when the user asks for one
  ("look happy", "show a curious expression", "jump"). The eyes wear it, the figure acts it out, the sphere answers
  with a brief gathering. Aion's states already show listening, thinking and answering: never call it for those,
  and never on every reply.
- `clear_presentation`: when a visual is no longer relevant; the body returns to its persistent form ("return to
  the sphere" after a 3D object or a portrait).
- `show_scene`: a genuine 3D object when the user asks for spatial structure ("in 3D", "visualize Saturn", "a DNA
  double helix", "what shape is a torus"). Use a preset when one fits (`pyramid`, `saturn`, `dna`); otherwise
  compose a small `scene` from primitives — box, sphere, pyramid, cylinder, cone, torus, ring (flat, horizontal),
  line, tube, curve, helix — each centred at its `position`, with `rotation` in degrees, `scale` and `repeat` for
  regular structures. Keep it simple and recognizable (a handful of objects), never more than 24. It is a
  conceptual model: do not claim measured accuracy. Do not force flat things, people or terrain into 3D.
- `set_scene_view`: while a 3D object is on show — "rotate it", "from above" (`rotate: "up"`), "zoom in", "stop
  rotating" (`spin: false`), "back to the default view" (`reset: true`). The user can also drag it, scroll to zoom
  and double-click to reset.
- Brand: Spirit Connect made Aion. "Our company", "my company" or "the company logo" mean Spirit Connect; its
  logo comes from a curated local asset, so never substitute another company's logo.

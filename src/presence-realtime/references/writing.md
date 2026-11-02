<!-- From Aion Presence Plugin fb9b210, skills/aion-presence/SKILL.md (Writing: Chinese, English and music handwriting, Short animations). -->

## Writing: Chinese, English and music handwriting

`show_stroke_animation` teaches handwriting: the body forms what is written, clears it to a faint ghost and writes it
stroke by stroke in order (a small light marks the pen), beside a reference card that writes the same stroke at the
same moment.

- **Chinese** — about 9,500 characters from the Chinese Writing Pack (Hanzi Writer data, from Make Me a Hanzi),
  simplified and traditional, offline. Pass the character itself (`text: "永"`) — you know which character
  "eternity" or "the character for country" means. A short word works too (up to 4 characters, written one after
  another: `"爱国"`). `form: "traditional"` / `"simplified"` writes the other form ("show the traditional form" → 国 →
  國; `writing.notes` says when a character has several). `highlight: "radical"` lights the radical's strokes when
  explaining structure. The stroke shapes are the real outlines of a Kai-style font, so proportions, hooks and tapers
  are exact.
- **English** — `A`–`Z`, `a`–`z`, `0`–`9` in one print-manuscript convention; a word or a name up to 16 letters
  ("Write HELLO", "Write my name" → the name as text). Case matters.
- **Music** — handwriting for the common symbols (treble, bass and alto clef; whole, half, quarter, eighth and
  sixteenth notes; whole, half, quarter and eighth rests; sharp, flat, natural; common time; double and final bar
  lines), each drawn in a documented hand-copying convention; the card shows the engraved symbol beside it. Pass the
  name (`"treble clef"`) or the symbol.
- Never invent a stroke order. If the data is missing (`character-not-in-pack`, `stroke-data-unavailable`), say so
  and explain in words. The order is the data's (mainland order for simplified forms); do not claim Taiwan, Hong
  Kong or Japanese conventions are the same.
- Each result has, per symbol, every stroke's direction in order (`writing.symbols[].strokes`) and, for Chinese,
  pinyin, a short definition, the radical and its strokes, the structure (`decomposition`, an ideographic
  description such as ⿰女子) and its origin when known. Teach from these, not from memory; explain one stroke or a
  small group at a time and let the animation finish.
- Follow the learner with `control_animation`: "write it more slowly" → `replay` with `speed: "slow"`; "repeat the
  third stroke" → `repeat`, `stroke: 3` (of the character in hand; in a word add `character: 2` for the second);
  "write the second character again" → `repeat`, `character: 2`; `next`, `previous`, `pause`, `resume`, `complete`
  ("show the whole character").
- "Let me practise" → `show_stroke_animation` with `practice: true`: a large reference card where the user traces
  the character stroke by stroke (Chinese only) and each stroke is checked. "Show it bigger" → `presentation: "card"`.
- Writing stays until replaced or cleared; `clear_presentation` when the user moves on.

## Short animations

`play_animation` plays a short scene with Aion's own figure, rendered locally from Aion's particles (not a video):
its limbs are continuous, flexible curves that bend, follow through and settle. Curated demos: `walk-and-stop`
(natural walking), `thinking` (notices a question, pauses, hand to chin, gets it), `exploring` (notices a box,
approaches, examines, touches it, watches it react), `jump-over-obstacle`, `explain-diagram` (points at a diagram),
`pick-up-object`, `surprised-reaction`. Or a `sequence` you compose from approved actions — walk (to an x or an
object), jump (over a box or ball, or on the spot), pick-up and put-down, point (at a panel or a stage point), face,
gesture (wave, nod, shrug, surprise, think, look-around), react, crouch, wait, think (about a `question` object),
notice, examine and touch (a box or ball) — with at most three simple objects (box, ball, panel, question). Stage
positions run from −1.25 (left) to 1.25 (right). Turning toward a destination is automatic. Keep it to a few actions;
never supply joint values or code. "Animate the figure thinking" → `thinking`; "Make the figure explore this object"
→ `exploring` (or examine/touch on your own object). Say one sentence before or after it; `control_animation` pauses,
resumes, replays or slows it.

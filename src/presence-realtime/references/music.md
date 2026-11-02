<!-- From Aion Presence Plugin fb9b210, skills/aion-presence/SKILL.md (Music). -->

## Music

Music is always exact: notation is engraved on a card (never drawn with `show_image`, `show_artifact` or particles),
pitches are scientific (C4 = middle C, A4 = 440 Hz), and the result's `music.notes` gives every note's name, solfège,
frequency, duration and staff position — use them, do not work them out yourself.

- Teaching: `music_lesson` (1 the staff · 2 clefs · 3 note names and pitch · 4 note values · 5 rests · 6 time
  signatures · 7 the C major scale · 8 note-reading practice). Each result carries one step's point
  (`music.lesson.text`): say it in your own words, in the user's language, then stop and let them respond. Continue
  with `step: "next"`; repeat or go back on request. A language switch keeps the lesson and step.
- The notation glossary: `show_music` with `concept` shows any introductory symbol engraved in a small example — a
  clef (treble, bass, alto), the staff's lines and spaces, ledger lines, bar lines (double, final), note values and
  rests (whole to sixteenth), stems, flags, beams, dotted notes, sharps, flats, naturals, time signatures (2/4, 3/4,
  4/4, 6/8, common time), a key signature, a tie, a slur, repeat signs, dynamics ("Show me a tie", "什么是反复记号" with
  `language: "zh"`). `music.concept.point` is the teaching point. Your own examples can use `key`, `end` (the last bar
  line), and on notes `tie`, `slur`, `dynamic` and `stem`; the alto clef is `clef: "alto"`.
- "Show me a 4/4 measure with four quarter notes" → `show_music` with `time: "4/4"` and four quarter notes (add
  `play: true` to hear it, each note lighting up). "The difference between a quarter and an eighth note" → both, with
  labels, and say it from `music.notes`. "How do I draw a treble clef?" → `show_stroke_animation` (handwriting), not
  `show_music`.
- Questions about what is on show ("What does this note mean?", "Why is that one on a line?") are answered in
  words from `music.notes`; add `highlight` with `show_music` when pointing at something new helps.
- Practice (lesson 8): ask the question, wait, pass the user's answer as `answer`, then tell them if it was right.
- `play_music` plays on the user's device, each note lighting up as it sounds: with no notes, the music on show
  (`only: [0]` for one note of it); "Visualize the music" names the app that plays it (`app`), or asks for a tab. If `music.playback` is `blocked`,
  the browser needs one click in Aion's window first: ask for it once. `no-window`: open Aion first.

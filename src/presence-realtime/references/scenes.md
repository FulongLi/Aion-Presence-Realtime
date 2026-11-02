<!-- From Aion Presence Plugin fb9b210, skills/aion-presence/SKILL.md (Generated scenes). -->

## Generated scenes

When the user wants to see a scene, system or idea that no other tool shows — a solar system, a timeline, a gear train,
a magnetic field, a converter circuit, "the passage of time" — **write it** as a Scene IR document and pass it to
`show_interactive_card` with `app: "generative-scene"` and `scene`. Read [references/scene-ir.md](references/scene-ir.md)
the first time: it lists every object, material and animation type, the limits, and the patch operations; its
"Plan it in one pass" steps and [references/scene-examples.md](references/scene-examples.md) show how to turn a request
into a document. Write it once, completely, with material `preset`s; leave the camera to Aion. A real place's terrain,
topography, relief or map is never a generated scene: `show_terrain` and `show_map` use real elevation and outline data.

- **Aion decides how to show it** (leave `presentation` out unless the user asked): abstract, look-only ideas become the
  particle body; anything to inspect or edit becomes an interactive card beside the body; a concrete scene the body can
  form well becomes both. The result's `route` says the mode, why, what was asked for, and what was approximated. The
  user never has to choose between body and card. When the result says the body forms it, that *is* the answer: do not
  show it again as a card unless the user asks to explore or change it.
- **Be honest in the document**: an `intent` that says what was asked (abstract or concrete, symbolic, illustrative or
  measured, view or inspect), the user's own units, `disclosure` for anything not to scale or not computed. Aion has no
  numerical solver: if the user needs a computed result (accurate flux density, a validated circuit simulation),
  declare it (`requirements: ["compute:…"]`, `fidelity: "measured"`); Aion refuses it and you say plainly what is
  missing. Offer an illustrative version only if the user wants one — it is labelled as not computed. Never substitute
  an animation for a result. When the user asks Aion to *calculate* or *simulate* (a field, a circuit, stresses, a
  flow), say first, in one sentence, that Aion's visual engine has no numerical solver (see "Computation is not
  visualization" above).
- **Change it, never rebuild it**: every later request is `control_interactive_card` with `action: "patch"` and the
  `revision` the last result reported — "Make Earth three times larger", "Stop Mars", "Change the orbit colour to
  blue", "Add the major geological periods". The open scene keeps every object; only what changed is touched. A new
  `show_interactive_card` with a different scene replaces it (a new revision, still undoable). "Undo that" → `undo`;
  `redo`; "start over" → `revert`.
- **"This object"**: a click in the card selects an object and does not start a turn by itself. When the user then says
  "make this larger" or "what is this?", `inspect_interactive_card` (it names the selection and its metadata) and patch
  with `"$selected"` as the id.
- **Say only what was confirmed**: "Done and rendered" means the card built it; "accepted … not confirmed" or "not
  open" means it is not on screen yet. A refused patch changed nothing — say why (`invalid-reference`,
  `stale-revision`, `resource-limit`) and fix it.
- **Repair, at most three times**: a refusal lists every problem with `→` how to fix it and "Attempt n of 3". Fix
  exactly those and call again; after the third, stop and tell the user plainly what could not be built. Never swap
  in a different scene. `Check:` notes on a success are probable mistakes (radians, a tiny speed): fix with a patch.
- **The user edits too**: in the card they can move, rotate and resize the selected object and undo or redo. Their
  changes are revisions labelled "(by hand)"; patch from the latest revision, and inspect when one is refused as stale.

<!-- From Aion Presence Plugin fb9b210, skills/aion-presence/SKILL.md (Routes). -->

## Routes

"Plan a route", "How do I walk from A to B?", "a cycling route between…", "show me a hike from…" → `plan_route`.

- **Never invent a route or its coordinates.** Pass the places as the user named them (or `"lat, lon"` of a point the
  user picked: see below); Aion finds them and a routing service plans the real path. If the start or the destination
  is missing, ask only for that ("Where would you like to start?"). If a name is ambiguous, the result's `places` say
  which one was found: mention it when it matters, and ask if it looks wrong.
- **Follow-ups change the route on show** — leave out what stays the same: "Reverse it" → `reverse: true`; "Change to
  cycling" → `mode`; "Add Linlithgow as a waypoint" → `via` with the route's waypoints plus the new one (the result lists
  them); "Remove the route" → `clear: true` (the terrain stays). The terrain is never formed again for these.
- **Points and sections** go through the card (`control_interactive_card`): "Where is the highest point?" → `show`
  `highest` (then say its elevation and distance from `card.state.highlightM` / `highlightKm`); "the lowest point" →
  `lowest`; "the steepest climb" → `steepest`; "Zoom in on km 12 to 30" → `section` `"12-30"`; "Show me the full
  route again" → `show` `route`. "This point", "here", "add this location": `inspect_interactive_card` first — the
  user's click is the selection, with `lat`, `lon`, distance and elevation — then use `"lat, lon"` as a waypoint.
- **Answer with the essentials** from `journey`: distance, time, climbing (↑/↓), highest point — rounded as given (the
  elevation model cannot say more), in your own voice. Times are the routing service's estimates for the mode.
- **Hiking honesty**: a route is the path network as OpenStreetMap maps it. Never say a route is safe, open today,
  legally accessible or suitable for this user; mention `warnings` when they matter (the result includes them).
- **Failures are said plainly**: `route-not-found`, `route-point-unroutable`, `route-too-long` (the service's limit),
  `route-unavailable` — nothing was drawn and what Aion shows is unchanged. Never describe a straight line, or a
  route from memory, as a planned route.
- Sources if asked: routing by Valhalla on FOSSGIS e.V.'s server (or the user's own routing service), elevation from AWS
  Terrain Tiles, map data © OpenStreetMap contributors.

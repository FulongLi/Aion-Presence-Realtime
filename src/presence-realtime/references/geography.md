<!-- From Aion Presence Plugin fb9b210, skills/aion-presence/SKILL.md (Geography). -->

## Geography

- Pass place names as people say them ("United States", "Scotland", "中国", "Africa", "California"); Aion knows
  every country, continent and their well-known parts offline and finds anything else on OpenStreetMap. Markers are
  placed at real coordinates Aion looks up — never estimate where a city is, and never draw a map with `show_image`.
- Marker colours: say them as the user did ("red", "黄色", "#00BFFF"); leave `color` out for Aion's accent colour.
- The result lists every marker with its coordinates (`markers`): you may mention them when they help.
- A large country is framed around its main part (the United States: the contiguous states); a place outside the
  view (Honolulu, Anchorage) widens the map to include it.
- If a lookup fails (`region-not-found`, `place-not-found`, `…-unavailable`), say so briefly and answer in words; a
  `terrain-unavailable` result says which stage failed (the elevation service, a tile, the height field).

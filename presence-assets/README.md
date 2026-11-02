# Presence assets (from Aion Presence Plugin)

The Plugin package's non-code files that the vendored Presence Core ([`src/presence-core`](../src/presence-core/VENDORED.md))
needs at run time, copied from `plugins/aion-presence/` of
[Aion-Presence-Plugin](https://github.com/FulongLi/Aion-Presence-Plugin) at `fb9b210` (v0.8.0).

| Path | What | In Git |
| --- | --- | --- |
| `assets/brand/`, `assets/*.svg` | Spirit Connect logo (curated local asset), icons | yes |
| `assets/cards/transformer.glb` | the CAD viewer's demonstration model (487 KB) | no — `npm run presence:assets` |
| `cad/aion_freecad_worker.py` | the FreeCAD worker: validated commands only, run by `freecadcmd` on the server | yes |
| `packs/chinese-writing/*.txt`, `NOTICE.md`, `*.json` | the Chinese Writing Pack's licences, manifest, coverage and variant tables | yes |
| `packs/chinese-writing/strokes.ahpk`, `dictionary.ahpk` | the pack's stroke and dictionary data (7.3 MB) | no — `npm run presence:assets` |

`npm run presence:assets` copies the uncommitted files from a local Plugin checkout (`AION_PLUGIN_DIR`, or
`../Aion-Presence-Plugin`) or downloads them from GitHub at the pinned commit, and writes each only if its SHA-256
matches. Without them Aion still runs: Chinese handwriting and the demonstration CAD model say they are unavailable.

The Chinese Writing Pack is separately licensed data (Arphic Public License, LGPL / GPL notices from Make Me a Hanzi,
Apache-2.0 OpenCC tables): see [`packs/chinese-writing/NOTICE.md`](packs/chinese-writing/NOTICE.md). Everything else
here is covered by the Plugin's licence ([`src/presence-core/LICENSE`](../src/presence-core/LICENSE)).

# Local engineering: FreeCAD, Gmsh, Elmer

Aion can build parametric CAD models in **FreeCAD** and run **finite-element simulations** (Gmsh meshing, Elmer FEM:
DC current conduction, steady-state heat, sequential electro-thermal) on the machine that runs the Realtime server.
The implementation is the Plugin's (v0.7 / v0.8, `src/presence-core/host/cad`, `host/sim`, `sim/`); its reference
guides are [src/presence-realtime/references/cad.md](../src/presence-realtime/references/cad.md) and
[simulation.md](../src/presence-realtime/references/simulation.md).

## Install (macOS shown; Linux and Windows paths are searched too)

1. **FreeCAD 1.0+** — <https://www.freecad.org/downloads.php>, drag `FreeCAD.app` into Applications. FreeCAD 1.x
   bundles **Gmsh** (4.15 tested).
2. **Elmer FEM 9.0+** (26.2 tested) — Homebrew, your package manager, or a local build in `~/.aion-sim/elmer`.
3. Optional overrides: `AION_FREECAD` (freecadcmd or FreeCAD.app), `AION_GMSH`, `AION_ELMER` (its `bin/`).

## Enable

`AION_ENGINEERING=auto` (default) enables engineering only under `npm run dev` and only when the programs are found.
A production build needs `AION_ENGINEERING=on`. `off` disables it everywhere. Detection runs once per server process;
the tools are offered to the voice models only when available (CAD needs FreeCAD; simulation also needs Gmsh and
Elmer). Called anyway, a tool answers `engineering-unavailable`, and Aion says so.

## Where things are kept

Each browser's Aion has a home, `~/.aion-presence-realtime/viewers/<id>/` (`AION_REALTIME_HOME`):
`cad/` (native `.FCStd` documents; `cad_model` can open and save only here) and `sim/` (studies, meshes, Elmer runs,
VTU results). Nothing else on the disk is reachable through the tools.

## What is computed and what is not

Simulation results (resistance, power, temperatures, fields, probes) are Elmer's numbers on a Gmsh mesh, checked by
the core (current conservation, Joule cross-checks, mesh quality) and reported with units. Physics outside DC
conduction, steady heat and their sequential coupling (e.g. magnetostatics, transients, structural) is refused as
unsupported — never approximated. Scenes and illustrations Aion draws are never presented as computed results.

## Verify

```bash
npx tsx --test tests/presenceEngineering.test.ts tests/presence-core/v07-cad.test.ts tests/presence-core/v08-sim-real.test.ts
```

These run the real programs and compare with analytic solutions; they skip (and say so) where the programs are absent.

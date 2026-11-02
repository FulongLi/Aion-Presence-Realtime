import { existsSync } from "node:fs";
import { join } from "node:path";
import { findFreecad, type FreecadInstall } from "../../presence-core/host/cad/freecad";
import { findSimTools, toolsReport } from "../../presence-core/host/sim/tools";

/**
 * Engineering (FreeCAD, Gmsh, Elmer) is a local capability: it runs programs on the machine that runs this server.
 * It is offered only when the programs are found and it is allowed:
 *
 *   AION_ENGINEERING=on     allowed (a deployment that really has the programs and trusts its users)
 *   AION_ENGINEERING=off    never
 *   unset / auto            allowed only under `next dev` (a developer's own machine), never in a production build
 *
 * Nothing here is assumed of a cloud deployment: without the programs the tools are simply not offered, the model is
 * told so, and every other capability works.
 */
export type EngineeringSetting = "on" | "off" | "auto";

export interface EngineeringStatus {
  setting: EngineeringSetting;
  allowed: boolean;
  freecad: FreecadInstall | null;
  /** Gmsh and Elmer were found and proven by their versions. */
  solvers: boolean;
  /** cad_model is offered. */
  cad: boolean;
  /** simulate is offered (needs CAD geometry too). */
  simulation: boolean;
  /** Human-readable lines (the debug panel, the README's capability check). */
  lines: string[];
}

export function engineeringSetting(env: NodeJS.ProcessEnv): EngineeringSetting {
  const value = env.AION_ENGINEERING?.trim().toLowerCase();
  return value === "on" || value === "1" || value === "true" ? "on" : value === "off" || value === "0" || value === "false" ? "off" : "auto";
}

export function engineeringAllowed(env: NodeJS.ProcessEnv): boolean {
  const setting = engineeringSetting(env);
  return setting === "on" || (setting === "auto" && env.NODE_ENV === "development");
}

/** The FreeCAD worker script vendored from the Plugin (presence-assets/cad). */
export function cadWorkerScript(cwd = process.cwd()): string | undefined {
  const script = join(cwd, "presence-assets", "cad", "aion_freecad_worker.py");
  return existsSync(script) ? script : undefined;
}

let cached: { key: string; status: Promise<EngineeringStatus> } | null = null;

/** Detects the programs once per process (and per relevant environment); `fresh` looks again. */
export function engineeringStatus(env: NodeJS.ProcessEnv = process.env, fresh = false): Promise<EngineeringStatus> {
  const key = [env.AION_ENGINEERING, env.NODE_ENV, env.AION_FREECAD, env.AION_GMSH, env.AION_ELMER, env.PATH].join("|");
  if (!fresh && cached?.key === key) return cached.status;
  const status = (async (): Promise<EngineeringStatus> => {
    const setting = engineeringSetting(env);
    const allowed = engineeringAllowed(env);
    const script = cadWorkerScript();
    if (!allowed) return { setting, allowed, freecad: null, solvers: false, cad: false, simulation: false, lines: [`Engineering is off (AION_ENGINEERING=${setting}${setting === "auto" ? ", production build" : ""}).`] };
    const freecad = findFreecad(env);
    const tools = await findSimTools(env).catch(() => null);
    const report = tools ? toolsReport(tools) : { ready: false, missing: ["gmsh", "ElmerSolver", "ElmerGrid"], lines: [] };
    const cad = Boolean(freecad && script);
    const lines = [
      freecad ? `FreeCAD: ${freecad.command}` : "FreeCAD: not found (install FreeCAD 1.0+, or set AION_FREECAD).",
      script ? "FreeCAD worker: presence-assets/cad/aion_freecad_worker.py" : "FreeCAD worker: missing (presence-assets/cad).",
      ...(report.lines.length ? report.lines : []),
      ...(report.missing.length ? [`Simulation programs missing: ${report.missing.join(", ")}.`] : []),
    ];
    return { setting, allowed, freecad, solvers: report.ready, cad, simulation: cad && report.ready, lines };
  })();
  cached = { key, status };
  return status;
}

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findFreecad } from "../src/presence-core/host/cad/freecad";
import { findSimTools, toolsReport } from "../src/presence-core/host/sim/tools";
import { VisualResolver } from "../src/presence-core/host/resolver";
import { cadWorkerScript, engineeringAllowed, engineeringSetting } from "../src/presence-realtime/server/capabilities";
import { PresenceHost } from "../src/presence-realtime/server/host";

/**
 * Real engineering through the Realtime adapter: the same function calls a voice model makes (cad_model, simulate) go
 * through PresenceHost into the installed FreeCAD, Gmsh and Elmer. Skipped, and said so, where they are not installed
 * (CI): a skip is not evidence either way. The numbers are checked against the analytic solution.
 */
const ENV = { NODE_ENV: "test", PATH: process.env.PATH, HOME: process.env.HOME } as NodeJS.ProcessEnv;
const freecad = findFreecad(ENV);
const solvers = toolsReport(await findSimTools(ENV)).ready;
const script = cadWorkerScript();
const skip = !freecad || !script ? "FreeCAD not installed: real CAD through the adapter is skipped (not evidence either way)"
  : !solvers ? "Gmsh/Elmer not installed: the real simulation through the adapter is skipped" : false;
if (skip) console.log(`# ${skip}`);

test("engineering setting: on, off, and auto (only under next dev)", () => {
  assert.equal(engineeringSetting({ NODE_ENV: "test", AION_ENGINEERING: "on" } as NodeJS.ProcessEnv), "on");
  assert.equal(engineeringSetting({ NODE_ENV: "test", AION_ENGINEERING: "0" } as NodeJS.ProcessEnv), "off");
  assert.equal(engineeringAllowed({ NODE_ENV: "production" } as NodeJS.ProcessEnv), false, "a production build never runs engineering unasked");
  assert.equal(engineeringAllowed({ NODE_ENV: "development" } as NodeJS.ProcessEnv), true);
  assert.equal(engineeringAllowed({ NODE_ENV: "development", AION_ENGINEERING: "off" } as NodeJS.ProcessEnv), false);
  assert.equal(engineeringAllowed({ NODE_ENV: "production", AION_ENGINEERING: "on" } as NodeJS.ProcessEnv), true);
});

test("real: a copper busbar modelled and solved through Realtime's function calls — R = L/(σA), confined workspace, undo", { skip, timeout: 240_000 }, async () => {
  const home = mkdtempSync(join(tmpdir(), "aion-realtime-eng-"));
  const host = await PresenceHost.create({
    home, env: ENV, version: "0.0.0-test", engineering: { cad: true, simulation: true }, cadScript: script,
    overrides: { resolver: new VisualResolver({ env: ENV, imageProviders: [], terrainProviders: [] }) },
  });
  const must = async (name: string, args: Record<string, unknown>) => {
    const outcome = await host.call(name, args);
    assert.equal(outcome.ok, true, `${name} ${JSON.stringify(args)}: ${outcome.message}`);
    return outcome;
  };
  try {
    await must("cad_model", { action: "create_document", args: { name: "Busbar" } });
    await must("cad_model", { action: "add_primitive", args: { kind: "box", length: 100, width: 10, height: 5, name: "Busbar" } });
    // Parameter update and undo/redo through the same path.
    await must("cad_model", { action: "set_parameter", args: { component: "Busbar", parameter: "Length", value: 120 } });
    await must("cad_model", { action: "undo", args: {} });
    const outside = await host.call("cad_model", { action: "save", args: { path: "/tmp/escape.FCStd" } });
    assert.deepEqual([outside.ok, outside.error], [false, "path-outside-workspace"]);
    await must("cad_model", { action: "save", args: { path: "busbar.FCStd" } });
    assert.ok(existsSync(join(home, "cad", "busbar.FCStd")), "a native .FCStd document in the viewer's CAD workspace");

    await must("simulate", { action: "create", args: { analysis: "electric", name: "Busbar DC" } });
    await must("simulate", { action: "set_material", args: { bodies: "Busbar", material: "copper" } });
    await must("simulate", { action: "set_boundary", args: { faces: "left", type: "voltage", voltage: "1 mV" } });
    await must("simulate", { action: "set_boundary", args: { faces: "right", type: "ground" } });
    const run = await must("simulate", { action: "run", args: { wait_s: 50 } });
    const electric = (run.simulation as { electric?: { resistance_ohm?: number } } | undefined)?.electric;
    const R = 0.1 / (5.8e7 * 5e-5);
    assert.ok(electric?.resistance_ohm, `the result carries a resistance: ${JSON.stringify(run).slice(0, 400)}`);
    assert.ok(Math.abs(electric.resistance_ohm - R) / R < 0.002, `R ${electric.resistance_ohm} Ω vs analytic ${R} Ω (the undo restored 100 mm)`);
    console.log(`# Realtime adapter: R = ${electric.resistance_ohm} Ω (analytic ${R.toExponential(4)} Ω)`);
    const unsupported = await host.call("simulate", { action: "create", args: { analysis: "magnetostatic" } });
    assert.equal(unsupported.ok, false, "unsupported physics is refused, never approximated");
  } finally { await host.close(); }
});

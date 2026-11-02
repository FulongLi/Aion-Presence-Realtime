import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { PresenceHub } from "../../presence-core/host/hub/hub";
import { PresenceLink, type PresenceBackend } from "../../presence-core/host/hub/link";
import type { HubCommand, HubSnapshot, SurfaceReport } from "../../presence-core/host/hub/protocol";
import { createAionServer, type AionServerOptions } from "../../presence-core/host/mcp/server";
import { FreecadBackend } from "../../presence-core/host/cad/freecad";
import { freecadBridge } from "../../presence-core/host/sim/freecadBridge";
import { SimulationService } from "../../presence-core/host/sim/service";
import { tileAllowed } from "../../presence-core/host/route/tiles";
import { routeBox } from "../../presence-core/visual/geo/route";
import { errorCode } from "../../presence-core/visual/errors";
import { capabilityFor, type EngineeringSelection, type ListedTool } from "./registry";
import { compactResult, type ToolOutcome, toolFailure } from "./results";
import { REFERENCE_TOOL_NAME, referenceText } from "./references";

/** The Presence Core's hub, reached in this process (the Plugin's LocalBackend, without the loopback HTTP server). */
class HubBackend implements PresenceBackend {
  readonly kind = "local";
  constructor(readonly hub: PresenceHub) {}
  /** The surface is the Realtime page itself. */
  get surfaceUrl() { return "/"; }
  async apply(command: HubCommand) { return this.hub.apply(command); }
  async addMedia(data: Buffer, mime: string) { return this.hub.addMedia(data, mime); }
  state(after = -1, hub?: string, waitMs = 0) { return this.hub.waitFor(after, hub ?? this.hub.id, waitMs); }
  async media(id: string) { const item = this.hub.media.get(id); return item ? { mime: item.mime, data: item.data } : null; }
  async cardReport(report: unknown) { return this.hub.cardReport(report); }
  close() { return this.hub.stop(); }
}

/** A PresenceLink that never discovers or starts a loopback hub: it always is this host's hub. */
class InProcessLink extends PresenceLink {
  private readonly local: HubBackend;
  constructor(hub: PresenceHub) {
    super({ home: hub.home, page: () => "" });
    this.local = new HubBackend(hub);
  }
  override get current() { return this.local; }
  override connect() { return Promise.resolve<PresenceBackend>(this.local); }
  override run<T>(action: (backend: PresenceBackend) => Promise<T>) { return action(this.local); }
  override async close() { await this.local.close(); }
}

export interface PresenceHostOptions {
  /** This viewer's data directory: colours, the welcome, CAD documents, studies, map tiles. */
  home: string;
  env: NodeJS.ProcessEnv;
  version: string;
  /** Which engineering tools may run (programs found, and allowed); see capabilities.ts. */
  engineering: EngineeringSelection;
  /** The Plugin's assets (the Spirit Connect logo, the CAD viewer's demonstration model). */
  assetsDir?: string;
  /** The FreeCAD worker script; absent, cad_model reports that the backend is unavailable. */
  cadScript?: string;
  /** Tests: stand-ins for the network and engineering services. */
  overrides?: Pick<AionServerOptions, "resolver" | "routing" | "cad" | "sim" | "now">;
}

/** Seconds a call may take before it is reported as timed out (a solve keeps running and reports itself later). */
const CALL_TIMEOUT_MS: Record<string, number> = { cad_model: 240_000, simulate: 300_000, plan_route: 60_000, show_terrain: 60_000, show_map: 45_000 };
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * One Aion for one viewer: the Presence Core's hub (state, presentations, cards, scenes, media) and its tool server,
 * connected in this process. Voice function calls run here; the page sees every change as a snapshot over its event
 * stream. Nothing here knows which voice backend made a call.
 */
export class PresenceHost {
  readonly hub: PresenceHub;
  lastUsed = Date.now();
  private constructor(private readonly options: PresenceHostOptions, private readonly link: InProcessLink, private readonly client: Client,
    /** The FreeCAD worker this host started (if any): stopped with the host, so an evicted viewer leaves no process behind. */
    private readonly cad: FreecadBackend | null) {
    this.hub = link.current.hub;
  }

  static async create(options: PresenceHostOptions): Promise<PresenceHost> {
    mkdirSync(options.home, { recursive: true, mode: 0o700 });
    // Never the macOS capture bridge: Realtime hears the assistant's real voice in the page.
    const hub = new PresenceHub({ home: options.home, port: 0, page: () => "", bridge: { locate: () => null } });
    const link = new InProcessLink(hub);
    const cadWorkspace = join(options.home, "cad");
    // The Chinese Writing Pack is found by path here: the core's own lookup is relative to its module, which bundling moves.
    const pack = join(process.cwd(), "presence-assets", "packs", "chinese-writing");
    const env: NodeJS.ProcessEnv = {
      ...(existsSync(pack) ? { AION_CHINESE_PACK: pack } : {}),
      ...options.env, AION_CAD_WORKSPACE: cadWorkspace, AION_SIM_WORKSPACE: join(options.home, "sim"),
    };
    // The host owns the CAD backend and the simulation service (the Plugin's server would make its own and rely on process exit).
    const cad = options.overrides?.cad ?? (options.engineering.cad && options.cadScript ? new FreecadBackend({ script: options.cadScript, env }) : null);
    const sim = options.overrides?.sim ?? new SimulationService({ root: env.AION_SIM_WORKSPACE!, env, cad: cad && options.engineering.simulation ? freecadBridge(cad) : null });
    const server = createAionServer({
      link, page: () => "", version: options.version, env, assetsDir: options.assetsDir,
      ...(cad ? { cad } : {}), sim,
      // Realtime never launches windows or desktop applications on the server's machine.
      openWindow: async () => false,
      openFreecad: async () => false,
      ...options.overrides,
    });
    const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    const client = new Client({ name: "aion-presence-realtime", version: options.version }, { capabilities: {} });
    await client.connect(clientSide);
    return new PresenceHost(options, link, client, options.overrides?.cad ? null : cad);
  }

  /** The Presence Core's tools as its tool server lists them (schemas from the Plugin's zod definitions). */
  async listTools(): Promise<ListedTool[]> {
    const { tools } = await this.client.listTools();
    return tools as ListedTool[];
  }

  snapshot(): HubSnapshot { return this.hub.snapshot(); }

  /**
   * Runs one function call from a voice backend. Unknown or unoffered tools, removed inputs and file paths outside this
   * viewer's CAD workspace are refused before the Presence Core sees them; the core validates everything else. The
   * outcome reports only what actually happened (an accepted, running solve says so; a failure is never "ok").
   */
  async call(name: string, args: Record<string, unknown>): Promise<ToolOutcome> {
    this.lastUsed = Date.now();
    if (name === REFERENCE_TOOL_NAME) return referenceText(args);
    const capability = capabilityFor(name);
    if (!capability) return toolFailure("unknown-tool", `${name} is not one of Aion's tools.`);
    if (capability.engineering && !this.options.engineering[capability.engineering]) {
      return toolFailure("engineering-unavailable", "CAD and simulation need FreeCAD, Gmsh and Elmer on the machine running Aion, enabled with AION_ENGINEERING. They are not available here.");
    }
    const removed = (capability.omit ?? []).filter(key => key in args);
    if (removed.length) return toolFailure("invalid-arguments", `${removed.join(", ")} is not available in Realtime: name what to look up instead.`);
    let checked = args;
    if (name === "cad_model") {
      const confined = confineCadPaths(args, join(this.options.home, "cad"));
      if (!confined.ok) return toolFailure("path-outside-workspace", confined.problem);
      checked = confined.args;
    }
    try {
      const result = await this.client.callTool({ name, arguments: checked }, { timeout: CALL_TIMEOUT_MS[name] ?? DEFAULT_TIMEOUT_MS });
      return compactResult(name, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return /timed? ?out/i.test(message)
        ? toolFailure("timeout", `${name} did not finish in time. Nothing is confirmed: say so, and ask again later for its state.`)
        : toolFailure("tool-error", `${name} failed: ${message.slice(0, 300)}`);
    }
  }

  /** A page's event stream joins as a companion window (it receives every snapshot). */
  attach(viewer: { write(frame: string): unknown; end(): void }, window: string) { this.lastUsed = Date.now(); return this.hub.attach(viewer, window); }

  media(id: string) { return this.hub.media.get(id) ?? null; }
  cardReport(report: unknown, window: string) { this.lastUsed = Date.now(); return this.hub.cardReport(report, window); }
  surfaceReport(report: SurfaceReport) { this.hub.report(report); }
  /** The welcome was seen (remembered in this viewer's home), or asked for again. */
  welcome(done: boolean, outcome?: string) { this.hub.apply(done ? { type: "welcome", done: true, ...(outcome ? { outcome } : {}) } as HubCommand : { type: "welcome", show: true }); }
  /** The user dismissed what is shown: every surface returns to the body (closing a route's card keeps its terrain, as in the Plugin). */
  dismiss() { this.hub.apply({ type: "clear", keep: "terrain" }); }
  /** A voice-derived activity (Realtime has no hooks): shown on every surface of this viewer. */
  activity(command: Extract<HubCommand, { type: "activity" }>) { this.hub.apply(command); }

  /** The Route Explorer's map tile: only around the open route, from the hub's cache (OpenStreetMap's tile policy). */
  async tile(z: number, x: number, y: number): Promise<{ ok: true; bytes: Buffer } | { ok: false; status: number; code: string }> {
    const card = this.hub.store.snapshot().card;
    if (!card?.route) return { ok: false, status: 404, code: "no-route" };
    if (!tileAllowed(z, x, y, routeBox(card.route.document.coordinates))) return { ok: false, status: 403, code: "outside-route" };
    try {
      const bytes = await this.hub.tiles.get(z, x, y, AbortSignal.timeout(15_000));
      return { ok: true, bytes: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength) };
    } catch (error) {
      const code = errorCode(error);
      return { ok: false, status: code === "tiles-busy" ? 429 : code === "tiles-off" ? 404 : 503, code };
    }
  }

  async close() {
    this.cad?.stop();
    await this.client.close().catch(() => {});
    await this.link.close().catch(() => {});
  }
}

const PATH_KEYS = ["path"] as const;

/**
 * cad_model's document paths stay inside this viewer's CAD workspace: a bare file name ("bracket.FCStd") is placed there;
 * an absolute path must already be inside it (after resolving symbolic links); anything else is refused. The Plugin lets
 * Codex use any path on the user's machine, because Codex already has the user's file system; a voice model does not.
 */
export function confineCadPaths(args: Record<string, unknown>, workspace: string): { ok: true; args: Record<string, unknown> } | { ok: false; problem: string } {
  const inner = args.args;
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return { ok: true, args };
  const next: Record<string, unknown> = { ...(inner as Record<string, unknown>) };
  mkdirSync(workspace, { recursive: true, mode: 0o700 });
  const root = realpathSync(workspace);
  for (const key of PATH_KEYS) {
    const value = next[key];
    if (value === undefined) continue;
    if (typeof value !== "string" || !value.trim() || value.includes("\0")) return { ok: false, problem: `${key} must be a file name.` };
    const given = value.trim();
    const candidate = isAbsolute(given) ? resolve(given) : given.includes("/") || given.includes("\\") ? null : join(root, basename(given));
    if (!candidate) return { ok: false, problem: `${key}: give a plain file name (it is saved in Aion's CAD workspace).` };
    // The deepest existing ancestor decides (a file that does not exist yet has none of its own).
    let probe = candidate;
    while (!existsSync(probe) && probe !== resolve(probe, "..")) probe = resolve(probe, "..");
    const real = join(realpathSync(probe), relative(probe, candidate));
    const inside = real === root || real.startsWith(root + sep);
    if (!inside) return { ok: false, problem: `${key}: only files in Aion's CAD workspace can be opened or saved.` };
    next[key] = real;
  }
  return { ok: true, args: { ...args, args: next } };
}

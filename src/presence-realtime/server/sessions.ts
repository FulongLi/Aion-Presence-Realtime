import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import hostManifest from "../../presence-core/host/hostManifest.json" with { type: "json" };
import { cadWorkerScript, engineeringStatus } from "./capabilities";
import { PresenceHost, type PresenceHostOptions } from "./host";
import { functionTools, type FunctionTool, type ListedTool, type ToolProfile } from "./registry";
import { referenceTool } from "./references";

/**
 * The Presence hosts of this server process, one per viewer (a browser, identified by its HttpOnly viewer cookie).
 * Each has its own state, presentations, cards, scenes, CAD documents and studies, so one visitor never drives another's
 * Aion. Bounded: at most MAX_HOSTS in memory (the least recently used is closed), and an idle host is closed after
 * IDLE_MS; its small files (colours, the welcome, CAD documents, studies) stay in its home for next time.
 */
export const MAX_HOSTS = 8;
export const IDLE_MS = 30 * 60_000;
export const VIEWER_ID = /^[a-f0-9]{32}$/;

export function realtimeHome(env: NodeJS.ProcessEnv = process.env) {
  return env.AION_REALTIME_HOME || join(homedir(), ".aion-presence-realtime");
}

/** The Plugin's assets (presence-assets/assets): the logo, and the CAD viewer's model once fetched. */
export function assetsDirectory(cwd = process.cwd()) {
  const dir = join(cwd, "presence-assets", "assets");
  return existsSync(dir) ? dir : undefined;
}

interface Entry { host: Promise<PresenceHost>; viewers: number; lastUsed: number }

export class PresenceSessions {
  private readonly hosts = new Map<string, Entry>();
  private sweeper?: ReturnType<typeof setInterval>;

  constructor(private readonly options: { env?: NodeJS.ProcessEnv; create?: (id: string, options: PresenceHostOptions) => Promise<PresenceHost> } = {}) {}

  private get env() { return this.options.env ?? process.env; }

  /** This viewer's host, created on first use. */
  host(viewer: string): Promise<PresenceHost> {
    if (!VIEWER_ID.test(viewer)) return Promise.reject(new Error("invalid-viewer"));
    const existing = this.hosts.get(viewer);
    if (existing) { existing.lastUsed = Date.now(); this.hosts.delete(viewer); this.hosts.set(viewer, existing); return existing.host; }
    const host = this.create(viewer);
    this.hosts.set(viewer, { host, viewers: 0, lastUsed: Date.now() });
    host.catch(() => this.hosts.delete(viewer));
    this.evict();
    this.sweeper ??= setInterval(() => this.sweep(), 60_000);
    this.sweeper.unref?.();
    return host;
  }

  /** The viewer's host if it is already running (routes other than the event stream never create one). */
  existing(viewer: string): Promise<PresenceHost> | null {
    const entry = VIEWER_ID.test(viewer) ? this.hosts.get(viewer) : undefined;
    if (!entry) return null;
    entry.lastUsed = Date.now();
    return entry.host;
  }

  /** An event stream opened (+1) or closed (−1): a host with an open page is never evicted for idleness. */
  watching(viewer: string, delta: 1 | -1) {
    const entry = this.hosts.get(viewer);
    if (entry) { entry.viewers = Math.max(0, entry.viewers + delta); entry.lastUsed = Date.now(); }
  }

  get size() { return this.hosts.size; }

  async closeAll() {
    clearInterval(this.sweeper); this.sweeper = undefined;
    const hosts = [...this.hosts.values()];
    this.hosts.clear();
    await Promise.all(hosts.map(entry => entry.host.then(host => host.close(), () => {})));
  }

  private async create(viewer: string): Promise<PresenceHost> {
    const env = this.env;
    const status = await engineeringStatus(env);
    const options: PresenceHostOptions = {
      home: join(realtimeHome(env), "viewers", viewer), env, version: hostManifest.version,
      engineering: { cad: status.cad, simulation: status.simulation }, assetsDir: assetsDirectory(), cadScript: cadWorkerScript(),
    };
    return this.options.create ? this.options.create(viewer, options) : PresenceHost.create(options);
  }

  private evict() {
    while (this.hosts.size > MAX_HOSTS) {
      const [oldest, entry] = this.hosts.entries().next().value!;
      this.hosts.delete(oldest);
      void entry.host.then(host => host.close(), () => {});
    }
  }

  private sweep() {
    const now = Date.now();
    for (const [viewer, entry] of this.hosts) {
      if (entry.viewers === 0 && now - entry.lastUsed > IDLE_MS) {
        this.hosts.delete(viewer);
        void entry.host.then(host => host.close(), () => {});
      }
    }
  }
}

/** The process's sessions (kept on globalThis so a development reload does not orphan running hosts and workers). */
export function presenceSessions(): PresenceSessions {
  const store = globalThis as typeof globalThis & { __aionPresenceSessions?: PresenceSessions };
  return (store.__aionPresenceSessions ??= new PresenceSessions());
}

let catalogue: Promise<ListedTool[]> | null = null;

/**
 * The Presence Core's listed tools, read once per process from a throwaway host (schemas do not depend on a viewer).
 * Session configuration (token and GPT-Live routes) builds each backend's function tools from it.
 */
export function presenceCatalogue(env: NodeJS.ProcessEnv = process.env): Promise<ListedTool[]> {
  catalogue ??= (async () => {
    const host = await PresenceHost.create({
      home: join(realtimeHome(env), "catalogue"), env, version: hostManifest.version, engineering: { cad: true, simulation: true },
      cadScript: cadWorkerScript(), assetsDir: assetsDirectory(),
    });
    try { return await host.listTools(); } finally { await host.close(); }
  })();
  catalogue.catch(() => { catalogue = null; });
  return catalogue;
}

/** The function tools one voice session receives: the selected Presence Core tools and the reference tool. */
export async function sessionTools(profile: ToolProfile, env: NodeJS.ProcessEnv = process.env): Promise<FunctionTool[]> {
  const [listed, status] = await Promise.all([presenceCatalogue(env), engineeringStatus(env)]);
  const engineering = { cad: status.cad, simulation: status.simulation };
  return functionTools(listed, { profile, engineering }, [referenceTool(engineering.cad || engineering.simulation)]);
}

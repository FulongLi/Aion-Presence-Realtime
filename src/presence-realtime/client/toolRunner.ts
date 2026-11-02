import type { ToolExecution, ToolRunner } from "../../voice/tools/executor";
import type { ModelResult } from "../../voice/tools/results";

export interface ToolCallTrace { name: string; ok: boolean; error?: string; ms: number; at: number }

/**
 * Both voice backends' function calls, executed by the Presence Core on the server (POST /api/presence/tool). The
 * browser never interprets a tool: it forwards the model's arguments as they are and returns the server's outcome to
 * the model unchanged — which is false for every failure and true only once the operation was confirmed. A network
 * failure is reported to the model as one too, never as success.
 */
export class ServerToolRunner implements ToolRunner {
  /** The tool running now (the body shows CAD and simulation as work). */
  active: string | null = null;
  /** The latest calls (?debug=1). */
  readonly trace: ToolCallTrace[] = [];

  constructor(private readonly endpoint = "/api/presence/tool", private readonly request: typeof fetch = (...args) => fetch(...args)) {}

  async execute(name: string, rawArguments: string): Promise<ToolExecution> {
    const started = performance.now();
    this.active = name;
    let result: ModelResult;
    try {
      const response = await this.request(this.endpoint, {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ name, arguments: rawArguments }),
      });
      result = response.ok
        ? await response.json() as ModelResult
        : { ok: false, error: response.status === 409 ? "presence-not-ready" : "presence-error", message: `Aion's body could not run ${name} (HTTP ${response.status}). Nothing was shown.` };
    } catch {
      result = { ok: false, error: "presence-unreachable", message: `Aion's body could not be reached for ${name}. Nothing was shown.` };
    } finally {
      if (this.active === name) this.active = null;
    }
    const ms = Math.round(performance.now() - started);
    const error = (result as { error?: unknown }).error;
    this.trace.unshift({ name, ok: result.ok, ...(typeof error === "string" ? { error } : {}), ms, at: Date.now() });
    this.trace.length = Math.min(this.trace.length, 20);
    return { name, action: null, result, ms };
  }
}

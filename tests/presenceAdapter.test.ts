import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VisualResolver } from "../src/presence-core/host/resolver";
import { confineCadPaths, PresenceHost, type PresenceHostOptions } from "../src/presence-realtime/server/host";
import {
  CAPABILITIES, EXCLUDED_TOOLS, functionTools, metadataBytes, NO_ENGINEERING, shorten, toFunctionTool, type ListedTool,
} from "../src/presence-realtime/server/registry";
import { bound, compactResult, OUTPUT_LIMIT } from "../src/presence-realtime/server/results";
import { REFERENCE_TOPICS, referenceText, referenceTool } from "../src/presence-realtime/server/references";
import { PresenceSessions, MAX_HOSTS } from "../src/presence-realtime/server/sessions";
import { cardRoute, eventsRoute, surfaceRoute, toolRoute } from "../src/presence-realtime/server/routes";
import { VIEWER_COOKIE } from "../src/presence-realtime/server/http";

const tempHome = () => mkdtempSync(join(tmpdir(), "aion-realtime-"));
/** No network, no inherited configuration (Next.js's types require NODE_ENV in every ProcessEnv). */
const ENV = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
const offline = () => new VisualResolver({ env: ENV, imageProviders: [], terrainProviders: [] });
const options = (home = tempHome(), extra: Partial<PresenceHostOptions> = {}): PresenceHostOptions => ({
  home, env: ENV, version: "0.0.0-test", engineering: NO_ENGINEERING, overrides: { resolver: offline() }, ...extra,
});

let listed: ListedTool[] = [];
test.before(async () => {
  const host = await PresenceHost.create(options());
  listed = await host.listTools();
  await host.close();
});

test("registry: every offered capability is a real Presence Core tool, and every core tool is offered or excluded with a reason", () => {
  const names = new Set(listed.map(tool => tool.name));
  for (const capability of CAPABILITIES) assert.ok(names.has(capability.tool), `${capability.tool} exists in the Presence Core`);
  for (const name of names) assert.ok(CAPABILITIES.some(c => c.tool === name) || name in EXCLUDED_TOOLS, `${name} is either offered or excluded with a reason`);
  assert.equal(new Set(CAPABILITIES.map(c => c.tool)).size, CAPABILITIES.length, "no tool is listed twice");
});

test("registry: function tools keep the core's schemas, drop removed inputs, and never mention the Plugin's host", () => {
  for (const profile of ["realtime", "live"] as const) {
    const tools = functionTools(listed, { profile, engineering: { cad: true, simulation: true } });
    assert.equal(tools.length, CAPABILITIES.length);
    for (const tool of tools) {
      assert.equal(tool.type, "function");
      assert.equal(tool.parameters.type, "object");
      assert.doesNotMatch(JSON.stringify(tool), /Codex|open_presence|MCP\b/, `${tool.name} (${profile}) never names the Plugin's host`);
      for (const name of tool.parameters.required ?? []) assert.ok(name in (tool.parameters.properties ?? {}), `${tool.name}.${name} is required and present`);
    }
    const image = tools.find(tool => tool.name === "show_image")!;
    assert.ok(!("source" in (image.parameters.properties ?? {})), "show_image offers no local file source");
    assert.ok("query" in (image.parameters.properties ?? {}));
  }
});

test("registry: engineering tools are offered only when their programs are on, and the metadata stays inside each profile's budget", () => {
  const none = functionTools(listed, { profile: "realtime", engineering: NO_ENGINEERING }).map(tool => tool.name);
  assert.ok(!none.includes("cad_model") && !none.includes("simulate"));
  const cadOnly = functionTools(listed, { profile: "realtime", engineering: { cad: true, simulation: false } }).map(tool => tool.name);
  assert.ok(cadOnly.includes("cad_model") && !cadOnly.includes("simulate"));
  const realtime = metadataBytes(functionTools(listed, { profile: "realtime", engineering: { cad: true, simulation: true } }, [referenceTool(true)]));
  const live = metadataBytes(functionTools(listed, { profile: "live", engineering: { cad: true, simulation: true } }, [referenceTool(true)]));
  const core = listed.reduce((sum, tool) => sum + JSON.stringify(tool).length, 0);
  assert.ok(realtime <= 35_500, `Realtime tool metadata ${realtime} B fits its 35.5 KB budget`);
  assert.ok(live <= core, `GPT-Live's ${live} B is no more than the Presence Core lists (${core} B)`);
  assert.ok(realtime < live * 0.8, "Realtime receives clearly shorter descriptions than the GPT-Live backend");
});

test("registry: shortening cuts at a sentence when it can and never mid-word", () => {
  assert.equal(shorten("Alpha beta. Gamma delta epsilon.", 20), "Alpha beta.");
  assert.equal(shorten("Alpha beta gamma delta epsilon", 17), "Alpha beta gamma…");
  assert.equal(shorten("short", 50), "short");
  const tool = toFunctionTool({ name: "show_text", description: "x".repeat(5_000), inputSchema: { type: "object", properties: {} } }, "realtime")!;
  assert.ok(tool.description.length <= 330);
});

test("host: a function call runs the Presence Core and returns only what happened", async () => {
  const host = await PresenceHost.create(options());
  try {
    const shown = await host.call("show_text", { text: "Hello" });
    assert.equal(shown.ok, true, shown.message);
    assert.equal((shown.presentation as { kind: string }).kind, "text");
    assert.equal(host.snapshot().presentation?.kind, "text", "the hub holds the presentation the page will receive");
    assert.doesNotMatch(shown.message, /open_presence|not open/);
    const missing = await host.call("show_form", { form: "no-such-form-at-all" });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "form-not-found");
    const invalid = await host.call("show_number", { value: 12 });
    assert.equal(invalid.ok, false, "the core's schema refuses a wrong type");
    const unknown = await host.call("rm_rf", {});
    assert.deepEqual([unknown.ok, unknown.error], [false, "unknown-tool"]);
    const local = await host.call("show_image", { query: "x", source: "/etc/passwd" });
    assert.deepEqual([local.ok, local.error], [false, "invalid-arguments"], "a removed input is refused, not ignored");
    const cad = await host.call("cad_model", { action: "status" });
    assert.deepEqual([cad.ok, cad.error], [false, "engineering-unavailable"]);
    const cleared = await host.call("clear_presentation", {});
    assert.equal(cleared.ok, true);
    assert.equal(host.snapshot().presentation, null);
  } finally { await host.close(); }
});

test("host: body, expression and colours change the shared state; colours are remembered for this viewer", async () => {
  const home = tempHome();
  const host = await PresenceHost.create(options(home));
  try {
    assert.equal((await host.call("set_body_form", { body: "figure" })).ok, true);
    assert.equal(host.snapshot().body, "figure");
    const expressed = await host.call("express", { expression: "happy" });
    assert.equal(expressed.ok, true, expressed.message);
    const colors = await host.call("set_colors", { base: "gold" });
    assert.equal(colors.ok, true, colors.message);
  } finally { await host.close(); }
  assert.ok(existsSync(join(home, "appearance.json")));
  const again = await PresenceHost.create(options(home));
  try { assert.notEqual(again.snapshot().appearance.base.hex.toLowerCase(), "#a8bed1", "a new host for the same viewer starts in the remembered colour"); } finally { await again.close(); }
});

test("host: an attached page receives every snapshot as server-sent events", async () => {
  const host = await PresenceHost.create(options());
  const frames: string[] = [];
  const detach = host.attach({ write: frame => frames.push(frame), end: () => {} }, "window0001");
  try {
    await host.call("show_emoji", { emoji: "🎉" });
    const snapshots = frames.filter(frame => frame.startsWith("event: snapshot")).map(frame => JSON.parse(frame.split("data: ")[1]));
    assert.ok(snapshots.length >= 2);
    assert.equal(snapshots.at(-1).presentation.kind, "emoji");
    assert.equal(snapshots.at(-1).hub.viewers, 1, "the page counts as an open surface");
  } finally { detach(); await host.close(); }
  assert.equal(host.snapshot().hub.viewers, 0);
});

test("CAD paths: bare names go to the workspace; anything outside it is refused, symbolic links included", () => {
  const home = tempHome();
  const workspace = join(home, "cad");
  const bare = confineCadPaths({ action: "save", args: { path: "bracket.FCStd" } }, workspace);
  assert.ok(bare.ok && String((bare.args.args as { path: string }).path).endsWith(join("cad", "bracket.FCStd")));
  assert.equal(confineCadPaths({ action: "save", args: { path: "/etc/x.FCStd" } }, workspace).ok, false);
  assert.equal(confineCadPaths({ action: "open_document", args: { path: "../x.FCStd" } }, workspace).ok, false);
  assert.equal(confineCadPaths({ action: "export", args: { path: "sub/x.step" } }, workspace).ok, false);
  mkdirSync(join(home, "outside"));
  symlinkSync(join(home, "outside"), join(workspace, "link"));
  assert.equal(confineCadPaths({ action: "save", args: { path: join(workspace, "link", "x.FCStd") } }, workspace).ok, false, "a link out of the workspace is refused");
  const inside = confineCadPaths({ action: "save", args: { path: join(workspace, "y.FCStd") } }, workspace);
  assert.ok(inside.ok);
  assert.deepEqual(confineCadPaths({ action: "status" }, workspace), { ok: true, args: { action: "status" } });
});

test("results: failures keep their code; outputs are bounded; Plugin-host advice is removed", () => {
  const failure = compactResult("show_form", { isError: true, content: [{ type: "text", text: "form-not-found: \"x\" is not one of Aion's visual forms." }] });
  assert.deepEqual([failure.ok, failure.error], [false, "form-not-found"]);
  const huge = compactResult("simulate", { content: [{ type: "text", text: "ok" }], structuredContent: { ok: true, message: "Done (Aion is not open: call open_presence if the user wants to see it.)", simulation: { rows: Array.from({ length: 500 }, (_, i) => ({ i, text: "y".repeat(200) })) } } });
  assert.ok(JSON.stringify(huge).length <= OUTPUT_LIMIT);
  assert.equal(huge.ok, true);
  assert.doesNotMatch(huge.message, /open_presence/);
  assert.deepEqual(bound({ ok: true, message: "small" }), { ok: true, message: "small" });
});

test("references: a fixed list of guides, read on demand; engineering guides only with engineering", () => {
  for (const topic of Object.keys(REFERENCE_TOPICS)) {
    const guide = referenceText({ topic });
    assert.equal(guide.ok, true, topic);
    assert.ok(String(guide.guide).length > 400, `${topic} has content`);
    assert.doesNotMatch(String(guide.guide), /\bCodex\b/);
  }
  assert.equal(referenceText({ topic: "../../package" }).ok, false);
  const enumOf = (engineering: boolean) => (referenceTool(engineering).parameters.properties!.topic as { enum: string[] }).enum;
  assert.ok(!enumOf(false).includes("cad") && enumOf(true).includes("simulation"));
});

const request = (path: string, init: RequestInit & { cookie?: string; origin?: string | null } = {}) => {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", `${VIEWER_COOKIE}=${init.cookie}`);
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000");
  return new Request(`http://localhost:3000${path}`, { ...init, headers });
};

test("routes: the event stream creates this viewer's Aion and its cookie; tool calls need it and the app's own origin", async () => {
  const created: string[] = [];
  const sessions = new PresenceSessions({ create: (id, o) => { created.push(id); return PresenceHost.create({ ...o, ...options(tempHome()) }); } });
  try {
    const abort = new AbortController();
    const events = await eventsRoute(new Request("http://localhost:3000/api/presence/events?window=abcdefgh12", { signal: abort.signal }), sessions);
    assert.equal(events.headers.get("content-type"), "text/event-stream; charset=utf-8");
    const cookie = /aion_viewer=([a-f0-9]{32})/.exec(events.headers.get("set-cookie") ?? "")![1];
    assert.match(events.headers.get("set-cookie")!, /HttpOnly; SameSite=Strict/);
    const reader = events.body!.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.match(first, /retry: 2000/);

    assert.equal((await toolRoute(request("/api/presence/tool", { method: "POST", body: JSON.stringify({ name: "show_clock", arguments: "{}" }) }), sessions)).status, 409, "no viewer, no call");
    assert.equal((await toolRoute(request("/api/presence/tool", { method: "POST", cookie, origin: "https://evil.example", body: "{}" }), sessions)).status, 403);
    assert.equal((await toolRoute(request("/api/presence/tool", { method: "POST", cookie, headers: { "sec-fetch-site": "cross-site" }, body: "{}" }), sessions)).status, 403);
    const call = await toolRoute(request("/api/presence/tool", { method: "POST", cookie, body: JSON.stringify({ name: "show_number", arguments: JSON.stringify({ value: "42%" }) }) }), sessions);
    const outcome = await call.json() as { ok: boolean; presentation: { kind: string } };
    assert.equal(outcome.ok, true);
    assert.equal(outcome.presentation.kind, "number");
    const bad = await (await toolRoute(request("/api/presence/tool", { method: "POST", cookie, body: JSON.stringify({ name: "show_number", arguments: "{not json" }) }), sessions)).json() as { ok: boolean; error: string };
    assert.deepEqual([bad.ok, bad.error], [false, "invalid-arguments"]);
    assert.equal((await surfaceRoute(request("/api/presence/surface", { method: "POST", cookie, body: JSON.stringify({ type: "dismiss" }) }), sessions)).status, 204);
    assert.equal(await sessions.existing(cookie)!.then(host => host.snapshot().presentation), null, "dismiss returned Aion to its body");
    assert.equal((await surfaceRoute(request("/api/presence/surface", { method: "POST", cookie, body: JSON.stringify({ type: "exec", cmd: "x" }) }), sessions)).status, 400);
    assert.equal((await cardRoute(request("/api/presence/card", { method: "POST", cookie, body: JSON.stringify({ instance: "nope" }) }), sessions)).status >= 400, true, "a report about no card is refused");
    abort.abort();
    assert.equal(created.length, 1);
  } finally { await sessions.closeAll(); }
});

test("sessions: at most MAX_HOSTS viewers stay in memory; the oldest is closed first", async () => {
  const closed: string[] = [];
  const sessions = new PresenceSessions({
    create: async id => ({ close: async () => { closed.push(id); }, lastUsed: Date.now() } as unknown as PresenceHost),
  });
  const ids = Array.from({ length: MAX_HOSTS + 2 }, (_, i) => i.toString(16).padStart(32, "0"));
  for (const id of ids) await sessions.host(id);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(sessions.size, MAX_HOSTS);
  assert.deepEqual(closed, ids.slice(0, 2));
  await assert.rejects(sessions.host("not-an-id"));
  await sessions.closeAll();
});

test("the Realtime home never holds credentials: only small state files", () => {
  const source = readFileSync(join(process.cwd(), "src/presence-realtime/server/sessions.ts"), "utf8");
  assert.doesNotMatch(source, /OPENAI_API_KEY/);
});

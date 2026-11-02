import test from "node:test";
import assert from "node:assert/strict";
import { voiceActivity } from "../src/presence-realtime/client/voiceActivity";
import { ServerToolRunner } from "../src/presence-realtime/client/toolRunner";
import { RealtimeWelcomeSpeech } from "../src/presence-realtime/client/welcomeSpeech";
import { clientSecretRequest } from "../src/server/realtimeToken";
import { liveSessionRequest } from "../src/server/liveSession";
import { visualTools } from "../src/voice/tools/definitions";

test("voice activity: the session's mode becomes the Presence activity; CAD and simulation show as work; disconnected says nothing", () => {
  assert.equal(voiceActivity({ connected: false, mode: "speaking", tool: null }), null);
  assert.deepEqual(voiceActivity({ connected: true, mode: "listening", tool: null }), { state: "listening" });
  assert.deepEqual(voiceActivity({ connected: true, mode: "thinking", tool: "show_image" }), { state: "thinking" });
  assert.deepEqual(voiceActivity({ connected: true, mode: "speaking", tool: null }), { state: "responding" });
  assert.equal(voiceActivity({ connected: true, mode: "idle", tool: null }), null, "idle hands back to the hub's own activity");
  assert.deepEqual(voiceActivity({ connected: true, mode: "thinking", tool: "simulate" }), { state: "working", label: "Simulating" });
  assert.deepEqual(voiceActivity({ connected: true, mode: "speaking", tool: "cad_model" }), { state: "working", label: "Modelling" });
});

test("server tool runner: forwards the model's arguments unchanged and returns the server's outcome; failures stay failures", async () => {
  const sent: unknown[] = [];
  const ok = new ServerToolRunner("/api/presence/tool", async (_url, init) => {
    sent.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ ok: true, message: "Shown: clock" }), { status: 200 });
  });
  const run = await ok.execute("show_clock", "{\"time\":\"10:00\"}");
  assert.deepEqual(sent[0], { name: "show_clock", arguments: "{\"time\":\"10:00\"}" }, "the raw argument string is forwarded, never reinterpreted");
  assert.deepEqual(run.result, { ok: true, message: "Shown: clock" });
  assert.equal(ok.active, null, "nothing is running afterwards");
  const conflict = new ServerToolRunner("/x", async () => new Response("{}", { status: 409 }));
  assert.deepEqual([(await conflict.execute("show_text", "{}")).result.ok, ((await conflict.execute("show_text", "{}")).result as { error: string }).error], [false, "presence-not-ready"]);
  const down = new ServerToolRunner("/x", async () => { throw new TypeError("network"); });
  const failed = await down.execute("show_text", "{}");
  assert.equal(failed.result.ok, false, "a network failure is never success");
  assert.equal(down.trace[0].error, "presence-unreachable");
});

test("welcome speech: spoken by the Realtime voice, following real audio; refused or silent, it says so", async () => {
  let audible = false, spoken = "";
  const voice = { connected: () => true, speak: (line: string) => { spoken = line; return true; }, audible: () => audible };
  const speech = new RealtimeWelcomeSpeech(voice, { readyWaitMs: 100, startWaitMs: 400, quietMs: 150 });
  assert.equal(await speech.ready(), true);
  const events: string[] = [];
  const done = new Promise<void>(resolve => speech.speak(["Hello, I am Aion.", "Ask me anything."], {
    started: () => events.push("started"), sentence: index => events.push(`sentence ${index}`), word: () => {},
    ended: () => { events.push("ended"); resolve(); }, failed: (_n, detail) => { events.push(`failed ${detail}`); resolve(); },
  }));
  assert.equal(spoken, "Hello, I am Aion. Ask me anything.");
  setTimeout(() => { audible = true; }, 120);
  setTimeout(() => { audible = false; }, 420);
  await done;
  assert.deepEqual(events.filter(e => !e.startsWith("sentence 1")), ["started", "sentence 0", "ended"]);
  assert.ok(events.includes("sentence 1"), "every sentence is reached by the end");

  const silent = new RealtimeWelcomeSpeech({ ...voice, audible: () => false }, { readyWaitMs: 100, startWaitMs: 200, quietMs: 150 });
  const outcome = await new Promise<string>(resolve => silent.speak(["Hi."], { started() {}, sentence() {}, word() {}, ended: () => resolve("ended"), failed: (_n, d) => resolve(d) }));
  assert.equal(outcome, "no-audio");
  const refused = new RealtimeWelcomeSpeech({ ...voice, speak: () => false }, { readyWaitMs: 100, startWaitMs: 200, quietMs: 150 });
  const refusal = await new Promise<string>(resolve => refused.speak(["Hi."], { started() {}, sentence() {}, word() {}, ended: () => resolve("ended"), failed: (_n, d) => resolve(d) }));
  assert.equal(refusal, "voice-busy-or-disconnected");
  const offline = new RealtimeWelcomeSpeech({ ...voice, connected: () => false }, { readyWaitMs: 50, startWaitMs: 200, quietMs: 150 });
  assert.equal(await offline.ready(), false, "without a session the welcome offers its text instead");
});

test("both session builders carry the tools the server passes, and keep the legacy list only by default", () => {
  const tools = [{ type: "function" as const, name: "show_clock", description: "x", parameters: { type: "object", properties: {} } }];
  assert.equal(clientSecretRequest({}, tools).session.tools, tools);
  assert.equal(liveSessionRequest({}, "v=0\r\n", tools).session.delegation.responses.tools, tools);
  assert.equal(clientSecretRequest({}).session.tools, visualTools);
});

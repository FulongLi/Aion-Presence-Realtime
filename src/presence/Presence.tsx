"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import "@/presence-core/surface/styles.css";
import { PresenceBridge, type BodyStatus } from "@/presence-realtime/client/bridge";
import { DEFAULT_VOICE_BACKEND, resolveVoiceBackend, type VoiceBackend } from "@/voice/backend";
import { PresenceController } from "./controller";
import { StageNotice } from "./StageNotice";
import { stringsFor } from "./strings";

const DEBUG_BUILD = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_SCF_DEBUG === "1";
const subscribeLanguage = (callback: () => void) => {
  window.addEventListener("languagechange", callback);
  return () => window.removeEventListener("languagechange", callback);
};

/**
 * The Presence: Aion's body — the Presence Core's view (the same one Aion Presence Plugin shows) — and its own voice.
 * There is no chat panel or dashboard; the body is the interface, and cards appear beside it only when Aion presents
 * one. Only first-run microphone setup and connection problems ever put words of this page's own on the stage.
 */
export default function Presence({ configuredBackend = null }: {
  /** SCF_VOICE_BACKEND from the server; `?voice=realtime|live` overrides it for A/B testing. */
  configuredBackend?: VoiceBackend | null;
}) {
  const language = useSyncExternalStore(subscribeLanguage, () => navigator.language, () => "en");
  const t = stringsFor(language);
  const [{ bridge, controller }] = useState(() => {
    const bridge = new PresenceBridge();
    const controller = new PresenceController(undefined, configuredBackend ?? DEFAULT_VOICE_BACKEND, undefined, bridge.hooks);
    bridge.controller = controller;
    return { bridge, controller };
  });
  const ui = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const [graphicsError, setGraphicsError] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const byId = <T extends HTMLElement>(id: string) => root.current!.querySelector<T>(`#${id}`)!;

  const onBody = useCallback((status: BodyStatus) => {
    setGraphicsError(status.ready ? null : "webgpu-failed");
    controller.bodyReady(status.ready);
  }, [controller]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dispose = bridge.mount({
      root: root.current!, stage: byId("stage"), card: byId("card"), status: byId("status"), fullscreen: byId<HTMLButtonElement>("fullscreen"),
      debug: byId("debug"), entry: byId("entry"), enter: byId<HTMLButtonElement>("enter"), markers: byId<HTMLCanvasElement>("markers"),
      scene: byId<HTMLCanvasElement>("scene"), workspace: byId("workspace"), welcome: byId("welcome"), elsewhere: byId("elsewhere"),
      sound: { root: byId("sound"), label: byId("sound-label"), action: byId<HTMLButtonElement>("sound-action") },
    }, { debug: DEBUG_BUILD && params.get("debug") === "1", renderer: params.get("renderer") === "canvas" ? "canvas" : undefined, onBody });
    return dispose;
  }, [bridge, onBody]);

  useEffect(() => {
    controller.setBackend(resolveVoiceBackend(location.search, configuredBackend));
    controller.start();
    const gesture = () => { controller.gesture(); bridge.gesture(); };
    document.addEventListener("pointerdown", gesture);
    document.addEventListener("keydown", gesture);
    return () => {
      document.removeEventListener("pointerdown", gesture);
      document.removeEventListener("keydown", gesture);
      controller.stop();
    };
  }, [controller, bridge, configuredBackend]);

  // Development diagnostics (?debug=1): the voice session and every Presence Core capability, without the model.
  useEffect(() => {
    const container = root.current;
    if (!DEBUG_BUILD || new URLSearchParams(location.search).get("debug") !== "1" || !container) return;
    let detach: (() => void) | undefined, cancelled = false;
    void import("@/presence-realtime/client/debug").then(({ attachRealtimeDebug }) => {
      if (!cancelled) detach = attachRealtimeDebug(container, controller, bridge);
    });
    return () => { cancelled = true; detach?.(); };
  }, [controller, bridge]);

  return (
    <main className="presence" id="presence" ref={root}>
      <h1 className="sr-only">Aion Presence Realtime</h1>
      <div className="stage" id="stage" role="img" aria-label={t.stage}></div>
      <canvas className="scene" id="scene" aria-hidden="true"></canvas>
      <canvas className="markers" id="markers" aria-hidden="true"></canvas>
      <section className="card" id="card" aria-live="polite" hidden></section>
      <section className="workspace" id="workspace" hidden></section>
      <div className="entry" id="entry" hidden>
        <p className="wordmark" aria-hidden="true">AION</p>
        <button className="enter" id="enter" type="button">Enter Presence</button>
      </div>
      <section className="welcome" id="welcome" hidden></section>
      <p className="elsewhere" id="elsewhere" hidden></p>
      <p className="status" id="status" role="status" aria-live="polite"></p>
      <div className="sound" id="sound" hidden>
        <span className="sound-dot" aria-hidden="true"></span><span className="sound-label" id="sound-label"></span>
        <button className="sound-action" id="sound-action" type="button" hidden></button>
      </div>
      <button className="corner" id="fullscreen" type="button" hidden aria-label="Fullscreen" title="Fullscreen (F)">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
      </button>
      <pre className="debug" id="debug" hidden></pre>
      <StageNotice t={t} ui={ui} graphicsError={graphicsError}
        onAllow={() => controller.allowMicrophone()} onRetry={() => controller.retry()} />
    </main>
  );
}

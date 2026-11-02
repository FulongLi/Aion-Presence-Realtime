import type { WelcomeSpeech, WelcomeSpeechEvents } from "../../presence-core/surface/welcomeSpeech";

/** What the welcome needs from the voice session. */
export interface WelcomeVoice {
  /** The session is connected (the welcome may be spoken). */
  connected(): boolean;
  /** Asks the voice to say a line (VoiceClient.speak: false when it cannot now). */
  speak(line: string): boolean;
  /** The assistant's real audio is audible now. */
  audible(): boolean;
}

/** Speaking rate used only to move the captions along within what is really audible (the voice gives no sentence timing). */
const WORDS_PER_SECOND = 2.6;

/**
 * The first-run welcome, spoken by Aion's own Realtime voice. The Plugin speaks it with the browser's on-device
 * synthesizer because Codex's voice cannot be asked to; in Realtime that would be a second voice, so the welcome goes
 * through the same session (VoiceClient.speak) and follows the real audio: it starts when the voice is audible and ends
 * after the voice falls quiet. Caption sentences advance by an estimated speaking rate within that audible time (stated
 * here, not measured). Without a connected session it says so, and the welcome offers its text instead.
 */
export class RealtimeWelcomeSpeech implements WelcomeSpeech {
  voice: string | null = null;
  inventory = "Aion's Realtime voice";
  private run = 0;
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly voiceSession: WelcomeVoice, private readonly options = { readyWaitMs: 12_000, startWaitMs: 12_000, quietMs: 1_200 }) {}

  /** Any language: the session speaks the language the welcome is written in. */
  async ready(): Promise<boolean> {
    const until = Date.now() + this.options.readyWaitMs;
    while (Date.now() < until) {
      if (this.voiceSession.connected()) { this.voice = "realtime-session"; return true; }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return false;
  }

  speak(sentences: readonly string[], events: WelcomeSpeechEvents) {
    this.stop();
    const run = ++this.run;
    if (!this.voiceSession.speak(sentences.join(" "))) { events.failed(false, "voice-busy-or-disconnected"); return; }
    const words = sentences.map(sentence => sentence.split(/\s+/).filter(Boolean).length || Math.ceil(sentence.length / 4));
    const ends = words.map((_, i) => words.slice(0, i + 1).reduce((sum, n) => sum + n, 0) / WORDS_PER_SECOND);
    const asked = Date.now();
    let audibleSince: number | null = null, lastAudible = 0, lastWord = 0, sentence = -1;
    this.timer = setInterval(() => {
      if (run !== this.run) return;
      const now = Date.now();
      if (this.voiceSession.audible()) {
        lastAudible = now;
        if (audibleSince === null) { audibleSince = now; events.started(); }
        const elapsed = (now - audibleSince) / 1000;
        const index = Math.min(sentences.length - 1, ends.findIndex(end => elapsed < end) === -1 ? sentences.length - 1 : ends.findIndex(end => elapsed < end));
        if (index > sentence) { sentence = index; events.sentence(index); }
        if (now - lastWord > 320) { lastWord = now; events.word(); }
      } else if (audibleSince !== null && now - lastAudible > this.options.quietMs) {
        for (let i = sentence + 1; i < sentences.length; i++) events.sentence(i);
        this.stop();
        events.ended();
      } else if (audibleSince === null && now - asked > this.options.startWaitMs) {
        this.stop();
        events.failed(false, "no-audio");
      }
    }, 100);
  }

  stop() { this.run++; clearInterval(this.timer); this.timer = undefined; }
  dispose() { this.stop(); }
}

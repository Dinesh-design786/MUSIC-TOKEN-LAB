export type EventType = "note" | "rest";

export type MusicEvent = {
  id: string;
  track_id: string;
  instrument: string;
  pitch: string | null;
  duration_beats: number;
  velocity: number;
  event_type: EventType;
  onset_beats: number;
};

export type ValidationIssue = {
  id: string;
  severity: "error" | "warning";
  field: string;
  message: string;
};

export type TokenMap = { token: string; id: number; frequency: number; type: "note" | "rest" };

const notes = ["C4", "D4", "E4", "G4", "A4", "C5", "B4", "G4", "E4", "D4", "C4", "A3"];
const durations = [1, 0.5, 0.5, 1, 1, 2, 0.5, 0.5, 1, 1, 2, 1];

export function makeSyntheticDataset(): MusicEvent[] {
  const events: MusicEvent[] = [];
  let onset = 0;
  for (let bar = 0; bar < 8; bar += 1) {
    for (let beat = 0; beat < notes.length; beat += 1) {
      const duration = durations[beat];
      const isRest = (bar === 3 && beat === 5) || (bar === 6 && beat === 2);
      events.push({
        id: `melody-${bar + 1}-${beat + 1}`,
        track_id: "melody-01",
        instrument: "Piano",
        pitch: isRest ? null : notes[(beat + bar) % notes.length],
        duration_beats: duration,
        velocity: isRest ? 0 : 72 + ((beat * 7 + bar * 3) % 24),
        event_type: isRest ? "rest" : "note",
        onset_beats: Number(onset.toFixed(2)),
      });
      onset += duration;
    }
  }
  return events;
}

export function validateEvents(events: MusicEvent[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    if (!event.track_id) issues.push({ id: event.id, severity: "error", field: "track_id", message: "Track ID is required." });
    if (event.event_type === "note" && !event.pitch) issues.push({ id: event.id, severity: "error", field: "pitch", message: "Notes must have a pitch." });
    if (event.event_type === "rest" && event.pitch) issues.push({ id: event.id, severity: "warning", field: "pitch", message: "Rests ignore pitch values." });
    if (event.duration_beats <= 0) issues.push({ id: event.id, severity: "error", field: "duration_beats", message: "Duration must be greater than zero." });
    if (event.velocity < 0 || event.velocity > 127) issues.push({ id: event.id, severity: "error", field: "velocity", message: "Velocity must be between 0 and 127." });
    const duplicateKey = [event.track_id, event.onset_beats, event.pitch, event.duration_beats].join("|");
    if (seen.has(duplicateKey)) issues.push({ id: event.id, severity: "warning", field: "duplicate", message: "Duplicate event signature detected." });
    seen.add(duplicateKey);
  }
  return issues;
}

export function tokenForEvent(event: MusicEvent): string {
  return event.event_type === "rest" ? `REST_D${event.duration_beats}` : `NOTE_${event.pitch}_D${event.duration_beats}`;
}

export function buildVocabulary(events: MusicEvent[]): TokenMap[] {
  const frequencies = new Map<string, number>();
  for (const event of events) frequencies.set(tokenForEvent(event), (frequencies.get(tokenForEvent(event)) ?? 0) + 1);
  return [...frequencies.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([token, frequency], index) => ({ token, frequency, id: index + 1, type: token.startsWith("REST") ? "rest" : "note" }));
}

export function encodeEvents(events: MusicEvent[], vocabulary: TokenMap[]): number[] {
  const ids = new Map(vocabulary.map((entry) => [entry.token, entry.id]));
  return events.map((event) => ids.get(tokenForEvent(event)) ?? 0);
}

export function makeWindows(ids: number[], sequenceLength: number, stride: number): { input: number[]; target: number[] }[] {
  const windows: { input: number[]; target: number[] }[] = [];
  for (let start = 0; start + sequenceLength < ids.length; start += Math.max(1, stride)) {
    windows.push({ input: ids.slice(start, start + sequenceLength), target: ids.slice(start + 1, start + sequenceLength + 1) });
  }
  return windows;
}

export function csvFromEvents(events: MusicEvent[]): string {
  const headers = ["track_id", "instrument", "pitch", "duration_beats", "velocity", "event_type", "onset_beats"];
  const rows = events.map((event) => headers.map((header) => String(event[header as keyof MusicEvent] ?? "")).join(","));
  return [headers.join(","), ...rows].join("\n");
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

const PITCH_FREQUENCIES: Record<string, number> = {
  "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94,
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99,
  "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.00,
};

export function playPitch(pitch: string | null, durationSeconds = 0.32, velocity = 85): void {
  if (!pitch) return;
  const freq = PITCH_FREQUENCIES[pitch];
  if (!freq) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1400, ctx.currentTime);

  const gainLevel = Math.min(0.25, (velocity / 127) * 0.22);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(gainLevel, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSeconds);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationSeconds);
}


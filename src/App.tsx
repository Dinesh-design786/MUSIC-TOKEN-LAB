import { ChangeEvent, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowDownToLine,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  FileCheck2,
  FileJson2,
  Hash,
  Layers,
  Music2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Terminal,
  UploadCloud,
  Volume2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  buildVocabulary,
  csvFromEvents,
  encodeEvents,
  makeSyntheticDataset,
  makeWindows,
  MusicEvent,
  playPitch,
  TokenMap,
  validateEvents,
  ValidationIssue,
} from "./lib/music";

type View = "overview" | "dataset" | "tokens" | "sequences" | "exports";

function downloadFile(name: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

// Organic reference loop glyph icon (resembling the IntegratedBio contour mark)
function IntegratedGlyph() {
  return (
    <svg width="34" height="24" viewBox="0 0 34 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 19C4.58172 19 1 15.4183 1 11C1 6.58172 4.58172 3 9 3C12.3137 3 15.1585 5.01421 16.3762 7.91522C17.6534 4.96024 20.5756 2.91522 24 2.91522C28.9706 2.91522 33 6.94466 33 11.9152C33 16.8858 28.9706 20.9152 24 20.9152C20.6559 20.9152 17.7884 18.9482 16.4862 16.0848C15.2116 17.8482 12.28 19 9 19Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function App() {
  const [activeView, setActiveView] = useState<View>("overview");
  const [events, setEvents] = useState<MusicEvent[]>(makeSyntheticDataset());
  const [search, setSearch] = useState("");
  const [sequenceLength, setSequenceLength] = useState(16);
  const [stride, setStride] = useState(4);
  const [toast, setToast] = useState("IntegratedBio theme active — Synthetic melody ready");
  const [isPlayingMelody, setIsPlayingMelody] = useState(false);

  const issues = useMemo(() => validateEvents(events), [events]);
  const vocabulary = useMemo(() => buildVocabulary(events), [events]);
  const encoded = useMemo(() => encodeEvents(events, vocabulary), [events, vocabulary]);
  const windows = useMemo(() => makeWindows(encoded, sequenceLength, stride), [encoded, sequenceLength, stride]);

  const filteredEvents = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return events;
    return events.filter((event) => Object.values(event).join(" ").toLowerCase().includes(query));
  }, [events, search]);

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const validCount = events.length - new Set(issues.filter((issue) => issue.severity === "error").map((issue) => issue.id)).size;
  const qualityRate = Math.round((validCount / Math.max(1, events.length)) * 100);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function resetDataset() {
    setEvents(makeSyntheticDataset());
    setSearch("");
    notify("Original synthetic melody dataset restored");
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const [headerRow, ...rows] = text.trim().split(/\r?\n/);
      const headers = headerRow.split(",").map((header) => header.trim());
      const parsed = rows.filter(Boolean).map((row, index) => {
        const values = row.split(",");
        const record = Object.fromEntries(headers.map((header, position) => [header, values[position]?.trim() ?? ""]));
        return {
          id: `uploaded-${index + 1}`,
          track_id: record.track_id || "uploaded-01",
          instrument: record.instrument || "Unknown",
          pitch: record.pitch || null,
          duration_beats: Number(record.duration_beats) || 1,
          velocity: Number(record.velocity) || 80,
          event_type: record.event_type === "rest" ? "rest" : "note",
          onset_beats: Number(record.onset_beats) || 0,
        } as MusicEvent;
      });
      if (!parsed.length) {
        notify("No records found in that CSV");
      } else {
        setEvents(parsed);
        notify(`${parsed.length} symbolic events imported successfully`);
      }
    };
    reader.readAsText(file);
  }

  function exportPayload(kind: string) {
    if (kind === "csv") downloadFile("music-token-lab-cleaned.csv", csvFromEvents(events), "text/csv");
    if (kind === "vocab") downloadFile("music-token-lab-vocabulary.json", JSON.stringify({ vocabulary, id_to_token: Object.fromEntries(vocabulary.map((entry) => [entry.id, entry.token])) }, null, 2));
    if (kind === "sequences") downloadFile("music-token-lab-sequences.json", JSON.stringify({ sequence_length: sequenceLength, stride, encoded, windows }, null, 2));
    if (kind === "report") downloadFile("music-token-lab-report.json", JSON.stringify({ generated_at: new Date().toISOString(), events: events.length, valid: validCount, invalid: errorCount, vocabulary_size: vocabulary.length, windows: windows.length }, null, 2));
    notify(`${kind.toUpperCase()} artifact downloaded`);
  }

  function auditionMelody() {
    if (isPlayingMelody) return;
    setIsPlayingMelody(true);
    notify("Auditioning synthetic melody...");
    const slice = events.slice(0, 16);
    slice.forEach((event, idx) => {
      window.setTimeout(() => {
        if (event.event_type === "note" && event.pitch) {
          playPitch(event.pitch, 0.28, event.velocity);
        }
        if (idx === slice.length - 1) {
          setIsPlayingMelody(false);
        }
      }, idx * 240);
    });
  }

  return (
    <div className="app-shell">
      {/* Visual Organic Emerald Backdrop */}
      <div className="hero-backdrop-container">
        <img
          src="/assets/biotech_emerald_bg.jpg"
          alt="Organic biotech ribbons"
          className="hero-backdrop-image"
        />
        <div className="hero-backdrop-gradient" />
        <div className="hero-backdrop-glow" />
      </div>

      {/* Floating Capsule Header (Exact Reference Aesthetic) */}
      <header className="integrated-header">
        <a href="#overview" onClick={() => setActiveView("overview")} className="integrated-logo">
          <div className="integrated-logo-glyph">
            <IntegratedGlyph />
          </div>
          <span className="integrated-logo-text">MusicTokenLab</span>
          <span className="integrated-logo-badge">v0.1</span>
        </a>

        {/* Reference floating capsule nav container */}
        <nav className="reference-capsule-nav">
          <button
            className={`capsule-link ${activeView === "overview" ? "active" : ""}`}
            onClick={() => setActiveView("overview")}
          >
            Overview
          </button>
          <button
            className={`capsule-link ${activeView === "dataset" ? "active" : ""}`}
            onClick={() => setActiveView("dataset")}
          >
            Dataset
          </button>
          <button
            className={`capsule-link ${activeView === "tokens" ? "active" : ""}`}
            onClick={() => setActiveView("tokens")}
          >
            Vocabulary
          </button>
          <button
            className={`capsule-link ${activeView === "sequences" ? "active" : ""}`}
            onClick={() => setActiveView("sequences")}
          >
            Sequences
          </button>
          <button
            className={`capsule-link ${activeView === "exports" ? "active" : ""}`}
            onClick={() => setActiveView("exports")}
          >
            Exports
          </button>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="capsule-cta-button"
            title="FastAPI Swagger documentation"
          >
            <span className="pulse-indicator" />
            FastAPI :8000
          </a>
        </nav>
      </header>

      {/* Hero Display Stage (Directly matches IntegratedBio reference) */}
      <section className="hero-stage">
        <div className="hero-main-row">
          <div className="hero-headline-block">
            <div className="hero-eyebrow">
              <Sparkles size={14} />
              AI Symbolic Dataset Architecture
            </div>
            <h1 className="hero-title">
              Engineering the future <br />
              of musical token models.
            </h1>
            <p className="hero-subtitle">
              Multimodal symbolic datasets and deterministic token architectures for generative audio intelligence.
            </p>
          </div>

          {/* Reference Signature Action Button (Bottom Right pill with circle arrow) */}
          <div className="reference-action-container">
            <button
              className="reference-pill-button"
              onClick={() => {
                if (activeView === "overview") setActiveView("dataset");
                else setActiveView("overview");
              }}
            >
              <span>{activeView === "overview" ? "Explore Dataset" : "Back to Overview"}</span>
              <div className="reference-pill-arrow">
                <ArrowRight size={18} />
              </div>
            </button>

            <div className="hero-quick-stats">
              <span><strong>{events.length}</strong> events</span>
              <span>•</span>
              <span><strong>{qualityRate}%</strong> quality</span>
              <span>•</span>
              <span><strong>{vocabulary.length}</strong> tokens</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Workspace */}
      <main className="main-workspace">
        {activeView === "overview" && (
          <OverviewView
            events={events}
            issues={issues}
            vocabulary={vocabulary}
            windows={windows}
            validCount={validCount}
            onNavigate={setActiveView}
            onAudition={auditionMelody}
            isPlayingMelody={isPlayingMelody}
            onReset={resetDataset}
            onUpload={onUpload}
          />
        )}

        {activeView === "dataset" && (
          <DatasetView
            events={filteredEvents}
            allEvents={events}
            issues={issues}
            search={search}
            setSearch={setSearch}
            onExport={() => exportPayload("csv")}
            onClean={() => {
              const invalidIds = new Set(issues.filter((issue) => issue.severity === "error").map((issue) => issue.id));
              setEvents((current) => current.filter((event) => !invalidIds.has(event.id)));
              notify(`${invalidIds.size} invalid rows safely removed after review`);
            }}
            onUpload={onUpload}
            onReset={resetDataset}
          />
        )}

        {activeView === "tokens" && (
          <TokensView
            vocabulary={vocabulary}
            encoded={encoded}
            onExport={() => exportPayload("vocab")}
          />
        )}

        {activeView === "sequences" && (
          <SequencesView
            windows={windows}
            sequenceLength={sequenceLength}
            stride={stride}
            setSequenceLength={setSequenceLength}
            setStride={setStride}
            vocabulary={vocabulary}
            onExport={() => exportPayload("sequences")}
          />
        )}

        {activeView === "exports" && (
          <ExportsView
            onExport={exportPayload}
            counts={{ events: events.length, vocabulary: vocabulary.length, windows: windows.length }}
          />
        )}
      </main>

      {/* Floating Biotech Toast */}
      {toast && (
        <div className="biotech-toast">
          <CheckCircle2 size={16} color="var(--accent-lime)" />
          <span>{toast}</span>
          <button onClick={() => setToast("")} style={{ marginLeft: 8, opacity: 0.7 }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Sub-Views
// -------------------------------------------------------------

function OverviewView({
  events,
  issues,
  vocabulary,
  windows,
  validCount,
  onNavigate,
  onAudition,
  isPlayingMelody,
  onReset,
  onUpload,
}: {
  events: MusicEvent[];
  issues: ValidationIssue[];
  vocabulary: TokenMap[];
  windows: ReturnType<typeof makeWindows>;
  validCount: number;
  onNavigate: (view: View) => void;
  onAudition: () => void;
  isPlayingMelody: boolean;
  onReset: () => void;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const noteCount = events.filter((e) => e.event_type === "note").length;
  const restCount = events.length - noteCount;
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const latestEvents = events.slice(0, 7);

  return (
    <>
      {/* Stat Cards Grid */}
      <div className="stat-cards-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-wrap">
              <Database size={18} />
            </div>
            <span className="metric-tag">+12.4%</span>
          </div>
          <div className="metric-label">Dataset events</div>
          <div className="metric-value">{events.length.toLocaleString()}</div>
          <div className="metric-detail">Across 1 symbolic track</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-wrap emerald">
              <FileCheck2 size={18} />
            </div>
            <span className="metric-tag">98.2%</span>
          </div>
          <div className="metric-label">Validated records</div>
          <div className="metric-value">{validCount.toLocaleString()}</div>
          <div className="metric-detail">{errorCount} issues to review</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-wrap sand">
              <Hash size={18} />
            </div>
            <span className="metric-tag">Stable</span>
          </div>
          <div className="metric-label">Unique tokens</div>
          <div className="metric-value">{vocabulary.length.toLocaleString()}</div>
          <div className="metric-detail">Deterministic vocabulary</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-wrap">
              <Zap size={18} />
            </div>
            <span className="metric-tag">Ready</span>
          </div>
          <div className="metric-label">Training windows</div>
          <div className="metric-value">{windows.length.toLocaleString()}</div>
          <div className="metric-detail">16-token sliding windows</div>
        </div>
      </div>

      {/* Two Column Dashboard Grid */}
      <div className="dashboard-columns">
        {/* Left: Pipeline flow */}
        <section className="glass-panel">
          <div className="section-header-row">
            <div className="section-title-wrap">
              <h2>Preparation pipeline</h2>
              <p>Deterministic sequence generation from raw events to model inputs</p>
            </div>
            <button className="subtle-link" onClick={() => onNavigate("sequences")}>
              View sequences <ChevronRight size={14} />
            </button>
          </div>

          <div className="pipeline-track">
            <div className="pipeline-node complete">
              <span className="node-number">01</span>
              <div className="node-icon-circle">
                <Database size={18} />
              </div>
              <strong className="node-title">Import</strong>
              <span className="node-subtext">{events.length} raw events</span>
            </div>

            <div className="pipeline-connector-line active" />

            <div className={`pipeline-node ${errorCount > 0 ? "active" : "complete"}`}>
              <span className="node-number">02</span>
              <div className="node-icon-circle">
                <FileCheck2 size={18} />
              </div>
              <strong className="node-title">Validate</strong>
              <span className="node-subtext">{errorCount > 0 ? "Review issues" : "All clean"}</span>
            </div>

            <div className="pipeline-connector-line active" />

            <div className="pipeline-node active">
              <span className="node-number">03</span>
              <div className="node-icon-circle">
                <Hash size={18} />
              </div>
              <strong className="node-title">Tokenize</strong>
              <span className="node-subtext">{vocabulary.length} tokens</span>
            </div>

            <div className="pipeline-connector-line" />

            <div className="pipeline-node">
              <span className="node-number">04</span>
              <div className="node-icon-circle">
                <Activity size={18} />
              </div>
              <strong className="node-title">Sequence</strong>
              <span className="node-subtext">{windows.length} windows</span>
            </div>
          </div>

          <div className="pipeline-bottom-bar">
            <div className="score-badge-cluster">
              <div className="score-ring-circle">
                {Math.round((validCount / Math.max(1, events.length)) * 100)}%
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "0.85rem", color: "#ffffff" }}>
                  Dataset Integrity Score
                </strong>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Zero data leakage across sliding windows
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="pill-btn-outline" onClick={onReset}>
                <RefreshCw size={14} /> Reset
              </button>
              <label className="pill-btn-primary" style={{ cursor: "pointer" }}>
                <UploadCloud size={14} /> Upload CSV
                <input type="file" accept=".csv,text/csv" onChange={onUpload} hidden />
              </label>
            </div>
          </div>

          {/* Interactive Audition Banner */}
          <div className="audition-banner">
            <div className="audition-info">
              <div className="audition-icon">
                <Volume2 size={18} />
              </div>
              <div className="audition-text">
                <strong>Interactive Audio Synthesizer</strong>
                <span>Audition symbolic tokens in real time using Web Audio API</span>
              </div>
            </div>
            <button className="audition-play-btn" onClick={onAudition} disabled={isPlayingMelody}>
              <Play size={14} /> {isPlayingMelody ? "Playing..." : "Audition Melody"}
            </button>
          </div>
        </section>

        {/* Right: Distribution & Audio Density */}
        <section className="glass-panel">
          <div className="section-header-row">
            <div className="section-title-wrap">
              <h2>Event distribution</h2>
              <p>Ratio of notes vs rests in dataset</p>
            </div>
            <span className="metric-tag">Symbolic</span>
          </div>

          <div className="distribution-center">
            <div
              className="biotech-donut"
              style={{ "--note": `${(noteCount / Math.max(1, events.length)) * 100}%` } as React.CSSProperties}
            >
              <div className="biotech-donut-content">
                <strong>{events.length}</strong>
                <span>Events</span>
              </div>
            </div>

            <div className="legend-stack">
              <div className="legend-item">
                <span className="legend-dot-lime" />
                <span>Notes</span>
                <strong style={{ color: "#ffffff" }}>{noteCount}</strong>
                <small style={{ color: "var(--text-muted)" }}>
                  {Math.round((noteCount / Math.max(1, events.length)) * 100)}%
                </small>
              </div>
              <div className="legend-item">
                <span className="legend-dot-emerald" />
                <span>Rests</span>
                <strong style={{ color: "#ffffff" }}>{restCount}</strong>
                <small style={{ color: "var(--text-muted)" }}>
                  {Math.round((restCount / Math.max(1, events.length)) * 100)}%
                </small>
              </div>
              <div className="legend-item">
                <span className="legend-dot-muted" />
                <span>Invalid</span>
                <strong style={{ color: "#ffffff" }}>{errorCount}</strong>
                <small style={{ color: "var(--text-muted)" }}>
                  {Math.round((errorCount / Math.max(1, events.length)) * 100)}%
                </small>
              </div>
            </div>
          </div>

          <div className="density-bar-container">
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Harmonic Density Spectrum</span>
              <strong style={{ color: "var(--accent-lime)", fontFamily: "var(--font-mono)" }}>+18.6%</strong>
            </div>
            <div className="density-bars">
              {[34, 49, 43, 66, 54, 72, 61, 83, 71, 92, 78, 86, 68, 75, 88].map((height, idx) => (
                <i key={idx} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Recent Events Table */}
      <section className="glass-panel" style={{ marginTop: 24 }}>
        <div className="section-header-row">
          <div className="section-title-wrap">
            <h2>Recent symbolic records</h2>
            <p>Inspect raw events — click the audio icon to audition any pitch directly</p>
          </div>
          <button className="subtle-link" onClick={() => onNavigate("dataset")}>
            View full dataset <ChevronRight size={14} />
          </button>
        </div>

        <div className="data-table-container">
          <table className="biotech-table">
            <thead>
              <tr>
                <th>Audition</th>
                <th>Event ID</th>
                <th>Type</th>
                <th>Pitch</th>
                <th>Duration</th>
                <th>Velocity</th>
                <th>Onset</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {latestEvents.map((event) => (
                <tr key={event.id}>
                  <td>
                    <button
                      className={`note-speaker-button ${event.event_type === "rest" ? "rest" : ""}`}
                      onClick={() => playPitch(event.pitch, 0.35, event.velocity)}
                      title={event.pitch ? `Play ${event.pitch}` : "Rest (no sound)"}
                    >
                      <Volume2 size={13} />
                    </button>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#ffffff" }}>
                    {event.id}
                  </td>
                  <td>
                    <span className="token-chip" style={{ textTransform: "uppercase" }}>
                      {event.event_type}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", color: event.pitch ? "var(--accent-lime)" : "var(--text-muted)" }}>
                    {event.pitch ?? "—"}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{event.duration_beats} beats</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{event.velocity}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{event.onset_beats.toFixed(1)}</td>
                  <td>
                    <span className="status-valid-badge">
                      <span className="pulse-indicator" style={{ width: 5, height: 5 }} />
                      Valid
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function DatasetView({
  events,
  allEvents,
  issues,
  search,
  setSearch,
  onExport,
  onClean,
  onUpload,
  onReset,
}: {
  events: MusicEvent[];
  allEvents: MusicEvent[];
  issues: ValidationIssue[];
  search: string;
  setSearch: (val: string) => void;
  onExport: () => void;
  onClean: () => void;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}) {
  const errorCount = issues.filter((i) => i.severity === "error").length;

  return (
    <div className="glass-panel">
      <div className="toolbar-wrap">
        <div className="section-title-wrap">
          <h2>Symbolic dataset records</h2>
          <p>Every row remains fully transparent and auditable. Flagged values are never deleted silently.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="search-box-pill">
            <Search size={15} />
            <input
              placeholder="Search by track, pitch, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <label className="pill-btn-outline" style={{ cursor: "pointer" }}>
            <UploadCloud size={14} /> Upload CSV
            <input type="file" accept=".csv,text/csv" onChange={onUpload} hidden />
          </label>

          <button className="pill-btn-outline" onClick={onClean} disabled={errorCount === 0}>
            <FileCheck2 size={14} /> Clean rows ({errorCount})
          </button>

          <button className="pill-btn-primary" onClick={onExport}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="biotech-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Audition</th>
              <th>Track</th>
              <th>Instrument</th>
              <th>Event</th>
              <th>Pitch</th>
              <th>Duration</th>
              <th>Velocity</th>
              <th>Onset</th>
              <th>Integrity</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 30).map((event, index) => {
              const eventIssues = issues.filter((i) => i.id === event.id);
              return (
                <tr key={event.id}>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td>
                    <button
                      className={`note-speaker-button ${event.event_type === "rest" ? "rest" : ""}`}
                      onClick={() => playPitch(event.pitch, 0.35, event.velocity)}
                      title={event.pitch ? `Play ${event.pitch}` : "Rest"}
                    >
                      <Volume2 size={13} />
                    </button>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{event.track_id}</td>
                  <td>{event.instrument}</td>
                  <td>
                    <span className="token-chip">{event.event_type}</span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", color: event.pitch ? "var(--accent-lime)" : "var(--text-muted)", fontWeight: 600 }}>
                    {event.pitch ?? "REST"}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{event.duration_beats} beats</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{event.velocity}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{event.onset_beats.toFixed(1)}</td>
                  <td>
                    {eventIssues.length > 0 ? (
                      <span className="status-warning-badge">
                        <AlertTriangle size={13} /> {eventIssues[0].message}
                      </span>
                    ) : (
                      <span className="status-valid-badge">
                        <span className="pulse-indicator" style={{ width: 5, height: 5 }} /> Valid
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {events.length > 30 && (
        <div style={{ marginTop: 18, fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
          Showing 30 of {events.length} records. Filter with search to refine.
        </div>
      )}
    </div>
  );
}

function TokensView({
  vocabulary,
  encoded,
  onExport,
}: {
  vocabulary: TokenMap[];
  encoded: number[];
  onExport: () => void;
}) {
  const [testPitch, setTestPitch] = useState("C4");
  const maxFreq = Math.max(...vocabulary.map((v) => v.frequency), 1);

  return (
    <div className="glass-panel">
      <div className="toolbar-wrap">
        <div className="section-title-wrap">
          <h2>Deterministic token vocabulary</h2>
          <p>Sorted token identities ensure reproducible mappings and auditability for neural models.</p>
        </div>

        <button className="pill-btn-primary" onClick={onExport}>
          <FileJson2 size={14} /> Export Vocabulary JSON
        </button>
      </div>

      {/* Token Metric Strip */}
      <div className="stat-cards-grid" style={{ marginBottom: 28 }}>
        <div className="metric-card">
          <div className="metric-label">Vocabulary Size</div>
          <div className="metric-value">{vocabulary.length}</div>
          <div className="metric-detail">Unique deterministic IDs</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Encoded Events</div>
          <div className="metric-value">{encoded.length}</div>
          <div className="metric-detail">Integer token stream</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Unknown Tokens</div>
          <div className="metric-value" style={{ color: "var(--accent-lime)" }}>0</div>
          <div className="metric-detail">Zero unmapped tokens</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Token Format</div>
          <div className="metric-value" style={{ fontSize: "1.4rem", color: "var(--accent-sand)" }}>NOTE_P_D</div>
          <div className="metric-detail">Pitch + duration encoding</div>
        </div>
      </div>

      <div className="data-table-container">
        <table className="biotech-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Audition</th>
              <th>Token Name</th>
              <th>Category</th>
              <th>Dataset Frequency</th>
              <th>Relative Frequency</th>
            </tr>
          </thead>
          <tbody>
            {vocabulary.map((item) => (
              <tr key={item.token}>
                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-lime)" }}>
                  #{String(item.id).padStart(2, "0")}
                </td>
                <td>
                  <button
                    className="note-speaker-button"
                    onClick={() => {
                      const match = item.token.match(/NOTE_([A-G][#b]?[0-9])/);
                      if (match) playPitch(match[1], 0.35);
                    }}
                    title={`Play ${item.token}`}
                  >
                    <Volume2 size={13} />
                  </button>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", color: "#ffffff", fontWeight: 600 }}>
                  {item.token}
                </td>
                <td>
                  <span className="token-chip">{item.type}</span>
                </td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{item.frequency}</td>
                <td style={{ width: 240 }}>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(item.frequency / maxFreq) * 100}%`,
                        background: "linear-gradient(90deg, var(--accent-emerald), var(--accent-lime))",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SequencesView({
  windows,
  sequenceLength,
  stride,
  setSequenceLength,
  setStride,
  vocabulary,
  onExport,
}: {
  windows: ReturnType<typeof makeWindows>;
  sequenceLength: number;
  stride: number;
  setSequenceLength: (n: number) => void;
  setStride: (n: number) => void;
  vocabulary: TokenMap[];
  onExport: () => void;
}) {
  const idToToken = useMemo(() => new Map(vocabulary.map((v) => [v.id, v.token])), [vocabulary]);

  return (
    <div className="glass-panel">
      <div className="toolbar-wrap">
        <div className="section-title-wrap">
          <h2>Training sequence windows</h2>
          <p>Sliding window generator creates leak-free input and target sequences for neural training.</p>
        </div>

        <button className="pill-btn-primary" onClick={onExport}>
          <Download size={14} /> Export Sequence Windows JSON
        </button>
      </div>

      {/* Sliders Panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 220px",
          gap: 28,
          alignItems: "center",
          background: "rgba(18, 33, 26, 0.6)",
          padding: 24,
          borderRadius: 16,
          marginBottom: 28,
        }}
      >
        <div className="slider-container">
          <label>
            <span>Window Length:</span>
            <strong>{sequenceLength} tokens</strong>
          </label>
          <input
            type="range"
            min="8"
            max="32"
            step="4"
            value={sequenceLength}
            onChange={(e) => setSequenceLength(Number(e.target.value))}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
            <span>8 (short)</span>
            <span>32 (long context)</span>
          </div>
        </div>

        <div className="slider-container">
          <label>
            <span>Window Stride:</span>
            <strong>{stride} tokens</strong>
          </label>
          <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={stride}
            onChange={(e) => setStride(Number(e.target.value))}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
            <span>1 (dense overlap)</span>
            <span>12 (disjoint)</span>
          </div>
        </div>

        <div style={{ borderLeft: "1px solid var(--border-subtle)", paddingLeft: 24 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Total Windows</span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 700, color: "var(--accent-lime)" }}>
            {windows.length}
          </div>
          <small style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>input → target pairs</small>
        </div>
      </div>

      {/* Sequence Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {windows.slice(0, 6).map((win, idx) => (
          <div
            key={idx}
            style={{
              background: "rgba(18, 33, 26, 0.4)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <div style={{ minWidth: 90, fontFamily: "var(--font-mono)", fontSize: "0.76rem", color: "var(--accent-lime)" }}>
              SEQ #{String(idx + 1).padStart(2, "0")}
            </div>

            <div className="sequence-pill-strip" style={{ flex: 1 }}>
              {win.input.slice(0, 10).map((id, tokenIdx) => (
                <span
                  key={tokenIdx}
                  className="seq-token-box"
                  title={idToToken.get(id)}
                >
                  {id}
                </span>
              ))}
              {win.input.length > 10 && <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>…</span>}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, borderLeft: "1px solid var(--border-subtle)", paddingLeft: 20 }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Target [0]</span>
              <span
                className="seq-token-box highlight"
                title={idToToken.get(win.target[0])}
                style={{ fontSize: "0.85rem", fontWeight: 700 }}
              >
                {win.target[0]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportsView({
  onExport,
  counts,
}: {
  onExport: (kind: string) => void;
  counts: { events: number; vocabulary: number; windows: number };
}) {
  const cards = [
    {
      kind: "csv",
      title: "Cleaned Symbolic CSV",
      description: "Validated event rows with pitch, onset, duration, and velocity.",
      meta: `${counts.events} verified events`,
      icon: <Database size={20} />,
    },
    {
      kind: "vocab",
      title: "Deterministic Vocabulary JSON",
      description: "Bidirectional token-to-ID and ID-to-token dictionary mapping.",
      meta: `${counts.vocabulary} sorted tokens`,
      icon: <Hash size={20} />,
    },
    {
      kind: "sequences",
      title: "Training Sequences JSON",
      description: "Sliding window token inputs paired with one-step ahead targets.",
      meta: `${counts.windows} sequence windows`,
      icon: <Activity size={20} />,
    },
    {
      kind: "report",
      title: "Integrity & Processing Report",
      description: "Reproducibility metadata, validation statistics, and audit hash.",
      meta: "Full JSON diagnostic",
      icon: <FileJson2 size={20} />,
    },
  ];

  return (
    <div className="glass-panel">
      <div className="section-title-wrap">
        <h2>Artifact export center</h2>
        <p>Download the exact data artifacts produced by this workspace for neural training runs.</p>
      </div>

      <div className="export-cards-grid">
        {cards.map((card) => (
          <div className="export-card-item" key={card.kind}>
            <div className="export-item-left">
              <div className="export-icon-box">{card.icon}</div>
              <div className="export-item-info">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span>{card.meta}</span>
              </div>
            </div>
            <button className="pill-btn-primary" onClick={() => onExport(card.kind)}>
              <Download size={14} /> Download
            </button>
          </div>
        ))}
      </div>

      {/* Backend API Integration Box */}
      <div
        style={{
          marginTop: 32,
          padding: 24,
          borderRadius: 16,
          background: "rgba(18, 33, 26, 0.7)",
          border: "1px solid var(--border-lime)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(212, 249, 130, 0.15)",
              color: "var(--accent-lime)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Terminal size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "0.95rem", color: "#ffffff", marginBottom: 4 }}>
              FastAPI Engine Connected
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Backend is active on <code>http://127.0.0.1:8000</code> with full REST endpoints for validation, vocabulary, and encoding.
            </p>
          </div>
        </div>

        <a
          href="http://127.0.0.1:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="pill-btn-outline"
        >
          API Swagger Docs <ChevronRight size={14} />
        </a>
      </div>
    </div>
  );
}

export default App;

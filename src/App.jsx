import React, { useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useInCEngine } from "./hooks/useInCEngine";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { TOTAL_PHRASES } from "./data/phrases";
import TimelineView from "./components/TimelineView";
import "./App.css";
import "./components/TimelineView.css";

const MusicianCard = ({ musician, index, setVolume }) => {
  const isFinished = musician.phraseIndex >= TOTAL_PHRASES - 1; // at end
  const isDroppedOut = musician.isFinished;

  let phraselabel = `Phrase ${musician.phraseIndex + 1}`;
  if (isFinished) phraselabel = "Phr. 53 (End)";
  if (isDroppedOut) phraselabel = "Done";

  return (
    <div
      className={`musician-card ${!isDroppedOut ? "active" : "finished"}`}
      style={{
        animationDelay: `${index * 0.05}s`,
        opacity: isDroppedOut ? 0.4 : 1,
        padding: "1rem",
      }}
    >
      <div className="musician-header" style={{ marginBottom: "0.25rem" }}>
        <span>Musician {musician.id + 1}</span>
        {musician.phraseIndex < TOTAL_PHRASES - 1 && musician.isWaiting && (
          <span className="wait-indicator" title="Waiting (3-phrase rule)">
            WAIT
          </span>
        )}
      </div>

      <span
        className="phrase-indicator"
        style={{
          color: isDroppedOut ? "#444" : musician.color,
          fontSize: "1.1rem",
        }}
      >
        {phraselabel}
      </span>

      {!isDroppedOut && (
        <div
          className="volume-control"
          style={{
            marginTop: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.65rem", color: "#666" }}>VOL</span>
          <input
            type="range"
            min="-60"
            max="0"
            defaultValue={-12}
            onChange={(e) => setVolume(musician.id, parseFloat(e.target.value))}
            style={{
              width: "100%",
              accentColor: musician.color,
              height: "4px",
              cursor: "grab",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [musicianCount, setMusicianCount] = useState(12);
  const {
    musicians,
    isPlaying,
    setIsPlaying,
    reset,
    stateRef,
    advanceMusician,
    setMusicianVolume,
    hasFinished,
    pulseVolume,
    setPulseVolume,
    bpm,
    setBpm,
  } = useInCEngine(musicianCount);

  // audio hook
  useAudioEngine(stateRef, advanceMusician, isPlaying, pulseVolume, bpm);

  const handleStartStop = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    reset();
  };

  return (
    <div className="in-c-container">
      <header>
        <h1>In C</h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>Terry Riley, 1964</p>

        <div className="controls">
          <button
            className={`primary ${isPlaying ? "active" : ""}`}
            onClick={handleStartStop}
          >
            {isPlaying ? (
              <span
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Pause size={16} /> Pause Performance
              </span>
            ) : (
              <span
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Play size={16} /> Begin Performance
              </span>
            )}
          </button>

          <button onClick={handleReset} title="Reset">
            <RotateCcw size={16} />
          </button>

          <div className="slider-group">
            <label
              htmlFor="musician-count"
              style={{ fontSize: "0.9rem", color: "#888" }}
            >
              Ensemble Size:{" "}
              <span style={{ color: "#fff" }}>{musicianCount}</span>
            </label>
            <input
              id="musician-count"
              type="range"
              min="4"
              max="32"
              value={musicianCount}
              onChange={(e) => {
                if (isPlaying) setIsPlaying(false);
                setMusicianCount(parseInt(e.target.value));
              }}
              style={{ accentColor: "#fff" }}
            />
          </div>

          <div
            className="slider-group"
            style={{
              marginLeft: "1rem",
              borderLeft: "1px solid #444",
              paddingLeft: "1rem",
            }}
          >
            <label
              htmlFor="pulse-vol"
              style={{ fontSize: "0.9rem", color: "#888" }}
            >
              Pulse Vol
            </label>
            <input
              id="pulse-vol"
              type="range"
              min="-60"
              max="0"
              value={pulseVolume}
              onChange={(e) => setPulseVolume(parseFloat(e.target.value))}
              style={{ accentColor: "#aaa", width: "80px" }}
            />
          </div>

          <div className="slider-group" style={{ marginLeft: "1rem" }}>
            <label
              htmlFor="bpm"
              style={{ fontSize: "0.9rem", color: "#888" }}
            >
              BPM: <span style={{ color: "#fff" }}>{bpm}</span>
            </label>
            <input
              id="bpm"
              type="range"
              min="40"
              max="160"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value, 10))}
              style={{ accentColor: "#aaa", width: "80px" }}
            />
          </div>
        </div>
      </header>

      {/* timeline visualization */}
      <TimelineView musicians={musicians} />

      {hasFinished && (
        <div
          style={{ textAlign: "center", margin: "2rem 0", color: "#ffaa55" }}
        >
          <h2>Ensemble Reached Ending</h2>
          <p>
            Performing collective crescendo/diminuendo. Musicians dropping out.
          </p>
        </div>
      )}

      <div className="musician-grid">
        {musicians.map((m, i) => (
          <MusicianCard
            key={m.id}
            musician={m}
            index={i}
            setVolume={setMusicianVolume}
          />
        ))}
      </div>

      <div className="info-section">
        <h3>About this Performance</h3>
        <p>
          "In C" consists of 53 short musical phrases. Each musician plays
          through the phrases in order, repeating each one an arbitrary number
          of times before moving on. The ensemble stays loosely together - no
          musician can be more than 3 phrases ahead of the slowest player (The
          "3-Phrase Rule"). This creates a shifting, polyphonic web of sound
          against the steady pulse of the high C.
        </p>
        <p style={{ marginTop: "1rem" }}>
          What makes this performance unique is that it can never be repeated.
          Each musician’s decisions are independently and stochastically guided,
          allowing patterns to emerge, overlap, and dissolve in a way that is
          always new, yet faithful to Riley’s score.
        </p>
      </div>
    </div>
  );
}

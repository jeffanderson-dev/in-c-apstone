import { useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useInCEngine } from "./hooks/useInCEngine";
import { useAudioEngine } from "./hooks/useAudioEngine";
import MusicianCard from "./components/MusicianCard";
import TimelineView from "./components/TimelineView";
import "./components/TimelineView.css";
import "./App.css";

function App() {
  const [musicianCount] = useState(8);
  const {
    musicians,
    isPlaying,
    setIsPlaying,
    reset,
    stateRef,
    advanceMusician,
  } = useInCEngine(musicianCount);

  useAudioEngine(stateRef, advanceMusician, isPlaying);

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
        <p className="subtitle">Terry Riley, 1964</p>

        <div className="controls">
          <button className="primary" onClick={handleStartStop}>
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

          <button onClick={handleReset}>
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      <TimelineView musicians={musicians} />

      <div className="musician-grid">
        {musicians.map((m) => (
          <MusicianCard key={m.id} musician={m} />
        ))}
      </div>

      <div className="info-section">
        <h3>About this Performance</h3>
        <p>
          "In C" consists of 53 short musical phrases. Each musician plays
          through the phrases in order, repeating each one an arbitrary number
          of times before moving on. The ensemble stays loosely together—no
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

export default App;

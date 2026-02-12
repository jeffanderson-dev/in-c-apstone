import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { phrases, TOTAL_PHRASES } from './data/phrases';
import MusicianCard from './components/MusicianCard';
import './App.css';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicians, setMusicians] = useState([]);
  const pulseSynthRef = useRef(null);
  const pulseLoopRef = useRef(null);

  // Initialize musicians
  useEffect(() => {
    const musicianCount = 4;
    const newMusicians = Array.from({ length: musicianCount }).map((_, i) => ({
      id: i,
      phraseIndex: 0,
      repeatsDone: 0,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
    }));
    setMusicians(newMusicians);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const initAudio = async () => {
        await Tone.start();
        console.log('Audio context started!');

        // Pulse synth
        pulseSynthRef.current = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
        }).toDestination();
        pulseSynthRef.current.volume.value = -10;

        pulseLoopRef.current = new Tone.Loop((time) => {
          pulseSynthRef.current.triggerAttackRelease("C5", "16n", time);
        }, "8n");

        Tone.Transport.start();
        pulseLoopRef.current.start(0);
      };

      initAudio();
    } else {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current.dispose();
        pulseLoopRef.current = null;
      }
      Tone.Transport.stop();
    }

    return () => {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current.dispose();
      }
      if (pulseSynthRef.current) {
        pulseSynthRef.current.dispose();
      }
      Tone.Transport.stop();
    };
  }, [isPlaying]);

  const handleStartStop = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setMusicians(prev => prev.map(m => ({ ...m, phraseIndex: 0, repeatsDone: 0 })));
  };

  return (
    <div className="in-c-container">
      <header>
        <h1>In C</h1>
        <p className="subtitle">Terry Riley, 1964</p>

        <div className="controls">
          <button
            className="primary"
            onClick={handleStartStop}
          >
            {isPlaying ? 'Pause Performance' : 'Begin Performance'}
          </button>

          <button onClick={handleReset}>
            Reset
          </button>
        </div>
      </header>

      <div className="musician-grid">
        {musicians.map((m) => (
          <MusicianCard key={m.id} musician={m} />
        ))}
      </div>

      <div className="info-section">
        <h3>About this Performance</h3>
        <p>
          "In C" consists of 53 short musical phrases. Each musician plays through the phrases in order,
          repeating each one an arbitrary number of times before moving on.
        </p>
        <p>
          <strong>This week:</strong> We've added multiple musicians! Each card represents a musician
          in the ensemble. Right now they're all on Phrase 1, but next week we'll make them play
          independently with their own timing.
        </p>
      </div>
    </div>
  );
}

export default App;

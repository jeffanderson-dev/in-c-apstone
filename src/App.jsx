import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import './App.css';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const pulseSynthRef = useRef(null);
  const pulseLoopRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      // Initialize audio when user starts
      const initAudio = async () => {
        await Tone.start();
        console.log('Audio context started!');

        // Create a simple synth for the pulse
        pulseSynthRef.current = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
        }).toDestination();

        // Set volume
        pulseSynthRef.current.volume.value = -10;

        // Create a loop that plays every 8th note
        pulseLoopRef.current = new Tone.Loop((time) => {
          pulseSynthRef.current.triggerAttackRelease("C5", "16n", time);
        }, "8n");

        // Start the transport and loop
        Tone.Transport.start();
        pulseLoopRef.current.start(0);
      };

      initAudio();
    } else {
      // Stop and cleanup
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current.dispose();
        pulseLoopRef.current = null;
      }
      Tone.Transport.stop();
    }

    // Cleanup on unmount
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

      <div className="info-section">
        <h3>About this Performance</h3>
        <p>
          "In C" consists of 53 short musical phrases. Each musician plays through the phrases in order,
          repeating each one an arbitrary number of times before moving on.
        </p>
      </div>
    </div>
  );
}

export default App;

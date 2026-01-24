import { useState } from 'react';
import './App.css';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleStartStop = () => {
    setIsPlaying(!isPlaying);
    console.log(isPlaying ? 'Pausing...' : 'Starting...');
  };

  const handleReset = () => {
    setIsPlaying(false);
    console.log('Resetting...');
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

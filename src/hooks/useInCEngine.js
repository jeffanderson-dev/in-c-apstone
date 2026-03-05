import { useState, useEffect, useRef, useCallback } from "react";
import { TOTAL_PHRASES } from "../data/phrases";

const DEFAULT_PULSE_VOLUME = -20;
const DEFAULT_BPM = 72;

// how many times must a musician repeat a phrase before considering advancing
const MIN_REPEATS = 3;
// probability of advancing after minimum repeats met
const ADVANCE_PROBABILITY = 0.2; // 20% chance per cycle
// maximum distance ahead (the "3-phrase rule")
const MAX_DISTANCE = 3;

export function useInCEngine(musicianCount) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [uiState, setUiState] = useState([]);
  const [pulseVolume, setPulseVolume] = useState(DEFAULT_PULSE_VOLUME);
  const [bpm, setBpm] = useState(DEFAULT_BPM);

  const stateRef = useRef({
    musicians: [],
    minPhraseIndex: 0,
  });

  const reset = useCallback(() => {
    const newMusicians = Array.from({ length: musicianCount }).map((_, i) => ({
      id: i,
      phraseIndex: 0,
      repeatsDone: 0,
      nextNoteTime: 0,
      noteIndex: 0,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
      isWaiting: false,
      volume: -12,
    }));

    stateRef.current = {
      musicians: newMusicians,
      minPhraseIndex: 0,
    };
    setUiState(newMusicians);
  }, [musicianCount]);

  useEffect(() => {
    reset();
  }, [reset]);

  const advanceMusician = useCallback((musicianId) => {
    const state = stateRef.current;
    const musician = state.musicians[musicianId];

    // calculate minimum phrase index across all musicians
    const minIndex = Math.min(...state.musicians.map((m) => m.phraseIndex));
    state.minPhraseIndex = minIndex;

    // check if musician can advance (stay within 3-phrase rule)
    const canAdvance = musician.phraseIndex + 1 <= minIndex + MAX_DISTANCE;

    // check if musician wants to advance
    const metMinRepeats = musician.repeatsDone >= MIN_REPEATS;
    const wantsToMove = Math.random() < ADVANCE_PROBABILITY;

    if (
      canAdvance &&
      metMinRepeats &&
      wantsToMove &&
      musician.phraseIndex < TOTAL_PHRASES - 1
    ) {
      // advance to next phrase
      musician.phraseIndex++;
      musician.repeatsDone = 0;
      musician.isWaiting = false;
    } else {
      // stay on current phrase
      musician.repeatsDone++;
      // mark as waiting if blocked by constraint
      musician.isWaiting =
        !canAdvance && musician.phraseIndex < TOTAL_PHRASES - 1;
    }

    // update ref
    state.musicians[musicianId] = musician;

    // sync UI
    setUiState([...state.musicians]);
  }, []);

  const setMusicianVolume = useCallback((id, volume) => {
    const musician = stateRef.current.musicians[id];
    if (musician) {
      musician.volume = volume;
    }
  }, [stateRef]);

  return {
    musicians: uiState,
    isPlaying,
    setIsPlaying,
    reset,
    stateRef,
    advanceMusician,
    setMusicianVolume,
    pulseVolume,
    setPulseVolume,
    bpm,
    setBpm,
  };
}

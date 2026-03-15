import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { phrases, TOTAL_PHRASES } from "../data/phrases";

const DEFAULT_BPM = 72;

// refined constraints
const MIN_REPEATS_INITIAL = 5;
const MAX_REPEATS_INITIAL = 25;
// probability to advance after min repeats met:
const ADVANCE_PROBABILITY = 0.2; // 20% chance per cycle

const ALLOWED_LEAD = 2; // strict 2-3 patterns - max diff is 3.

export function useInCEngine(musicianCount) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFinished, setHasFinished] = useState(false); // global finish state
  const [bpm, setBpm] = useState(DEFAULT_BPM);

  const stateRef = useRef({
    musicians: [],
    minPhraseIndex: 0,
    startTime: 0,
    ensembleFinished: false,
  });

  const [uiState, setUiState] = useState([]);
  const [pulseVolume, setPulseVolume] = useState(-20);

  const reset = useCallback(() => {
    const newMusicians = Array.from({ length: musicianCount }).map((_, i) => ({
      id: i,
      phraseIndex: 0,
      repeatsDone: 0,
      minRepeatsForCurrentPhrase: Math.floor(Math.random() * 10) + 5,
      nextNoteTime: 0,
      noteIndex: 0,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
      phraseStartTime: 0,
      volume: -12, // default volume (dB)
      isFinished: false, // individual finish
      isWaiting: false,
    }));

    stateRef.current = {
      musicians: newMusicians,
      minPhraseIndex: 0,
      startTime: 0,
      ensembleFinished: false,
    };
    setHasFinished(false);
    setUiState(newMusicians);
  }, [musicianCount]);

  useEffect(() => {
    reset();
  }, [reset]);

  // update volume
  const setMusicianVolume = useCallback((id, val) => {
    if (stateRef.current.musicians[id]) {
      stateRef.current.musicians[id].volume = val;
    }
  }, []);

  const advanceMusician = useCallback(
    (musicianId) => {
      const state = stateRef.current;
      const musician = state.musicians[musicianId];

      // ENDING LOGIC:
      // if musician is at the last phrase check if they can finish
      const lastPhraseIndex = TOTAL_PHRASES - 1;

      if (musician.phraseIndex >= lastPhraseIndex) {
        // they are at the end. check if everyone is here.
        const allAtEnd = state.musicians.every(
          (m) => m.phraseIndex >= lastPhraseIndex,
        );

        if (allAtEnd) {
          state.ensembleFinished = true;
          // simulate dropout by probabilistic stopping
          if (Math.random() < 0.05) {
            // 5% chance to drop out each repeat cycle once finished
            musician.isFinished = true;
          }
        }

        // if finished, do nothing (audio engine checks isFinished)
        // if not finished, just repeat phrase 53 forever until dropout
        musician.repeatsDone++;
        setUiState([...state.musicians]);
        return;
      }

      // NORMAL PROGRESSION LOGIC
      // check constraints
      const activeMusicians = state.musicians.filter((m) => !m.isFinished);
      const minIndex =
        activeMusicians.length > 0
          ? Math.min(...activeMusicians.map((m) => m.phraseIndex))
          : TOTAL_PHRASES;

      // enforce max ahead = 3
      const canAdvance = musician.phraseIndex + 1 <= minIndex + 3;

      // check if musician wants to advance
      const metMinRepeats =
        musician.repeatsDone >= musician.minRepeatsForCurrentPhrase;
      const wantsToMove = Math.random() < ADVANCE_PROBABILITY;

      if (canAdvance && metMinRepeats && wantsToMove) {
        // advance to next phrase
        musician.phraseIndex++;
        musician.repeatsDone = 0;
        musician.minRepeatsForCurrentPhrase =
          Math.floor(Math.random() * 20) + 5; // new random duration
        musician.isWaiting = false;
      } else {
        // stay on current phrase
        musician.repeatsDone++;
        // mark as waiting if blocked by constraint
        musician.isWaiting = !canAdvance;
      }

      // update ref
      state.musicians[musicianId] = musician;
      state.minPhraseIndex =
        state.musicians.length > 0
          ? Math.min(...state.musicians.map((m) => m.phraseIndex))
          : 0;

      // sync UI
      setUiState([...state.musicians]);
      if (state.ensembleFinished && !hasFinished) setHasFinished(true);
    },
    [hasFinished],
  );

  return {
    musicians: uiState,
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
  };
}

import { useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { phrases } from "../data/phrases";
import { createInstrument, InstrumentType } from "../utils/instrumentFactories";

const LOOK_AHEAD = 1.0;
const CHECK_INTERVAL = 0.5;

export function useAudioEngine(
  stateRef,
  advanceMusician,
  isPlaying,
  pulseVolume,
) {
  const synthsRef = useRef([]);
  const pulseSynthRef = useRef(null);
  const pulseLoopRef = useRef(null);
  const schedulerIdRef = useRef(null);

  // update pulse volume
  useEffect(() => {
    if (pulseSynthRef.current) {
      pulseSynthRef.current.volume.value = pulseVolume;
    }
  }, [pulseVolume]);

  const ensureSynths = useCallback(() => {
    if (!stateRef.current.musicians.length) return;

    const needed = stateRef.current.musicians.length;
    const current = synthsRef.current.length;

    if (current < needed) {
      for (let i = current; i < needed; i++) {
        // cycle through instrument types
        const typeIdx = i % 4;
        let instrumentType;
        switch (typeIdx) {
          case 0:
            instrumentType = InstrumentType.PIANO;
            break;
          case 1:
            instrumentType = InstrumentType.STRINGS;
            break;
          case 2:
            instrumentType = InstrumentType.FLUTE;
            break;
          case 3:
            instrumentType = InstrumentType.HARMONIUM;
            break;
          default:
            instrumentType = InstrumentType.PIANO;
        }

        const synth = createInstrument(instrumentType);

        // octave variations
        const group = Math.floor(i / 4) % 3;
        if (group === 1) synth.detune.value = -1200;
        else if (group === 2) synth.detune.value = 1200;

        synth.volume.value = -12;
        synthsRef.current.push(synth);
      }
    }
  }, [stateRef]);

  useEffect(() => {
    if (!isPlaying) {
      // cleanup
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current.dispose();
        pulseLoopRef.current = null;
      }
      Tone.getTransport().stop();

      if (schedulerIdRef.current !== null) {
        Tone.getTransport().clear(schedulerIdRef.current);
        schedulerIdRef.current = null;
      }

      synthsRef.current.forEach((s) => s.dispose());
      synthsRef.current = [];

      if (pulseSynthRef.current) {
        pulseSynthRef.current.dispose();
        pulseSynthRef.current = null;
      }

      return;
    }

    const initAudio = async () => {
      await Tone.start();

      pulseSynthRef.current = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 },
      }).toDestination();
      pulseSynthRef.current.volume.value = pulseVolume;

      pulseLoopRef.current = new Tone.Loop((time) => {
        if (pulseSynthRef.current) {
          pulseSynthRef.current.triggerAttackRelease("C5", "16n", time);
        }
      }, "8n");

      ensureSynths();

      const now = Tone.getTransport().seconds;
      stateRef.current.musicians.forEach((m) => {
        if (m.nextNoteTime <= now) {
          m.nextNoteTime = now + 0.1;
        }
      });

      Tone.getTransport().start();
      pulseLoopRef.current.start(0);

      const schedule = () => {
        const now = Tone.getTransport().seconds;
        const limit = now + LOOK_AHEAD;

        stateRef.current.musicians.forEach((musician, index) => {
          const synth = synthsRef.current[index];
          if (!synth) return;

          // apply volume safely
          synth.volume.value = Number.isFinite(musician.volume)
            ? musician.volume
            : -12;

          let loops = 0;
          while (musician.nextNoteTime < limit && loops < 50) {
            loops++;

            const phrase = phrases[musician.phraseIndex];
            if (!phrase) break;

            const note = phrase.notes[musician.noteIndex];
            const duration = phrase.durations[musician.noteIndex];
            const time = musician.nextNoteTime;

            if (note) {
              synth.triggerAttackRelease(note, duration, time);
            }

            const durSec = Tone.Time(duration).toSeconds();
            musician.nextNoteTime += Math.max(0.01, durSec);
            musician.noteIndex++;

            if (musician.noteIndex >= phrase.notes.length) {
              musician.noteIndex = 0;
              advanceMusician(index);
            }
          }
        });

        schedulerIdRef.current = Tone.getTransport().schedule(
          schedule,
          "+" + CHECK_INTERVAL,
        );
      };

      schedulerIdRef.current = Tone.getTransport().schedule(
        schedule,
        Tone.getTransport().seconds + 0.1,
      );
    };

    initAudio();

    return () => {};
  }, [isPlaying, stateRef, advanceMusician, ensureSynths, pulseVolume]);
}

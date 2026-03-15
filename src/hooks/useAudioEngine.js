import { useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { phrases, TOTAL_PHRASES } from "../data/phrases";
import { createInstrument, InstrumentType } from "../utils/instrumentFactories";

const LOOK_AHEAD = 1.0; // seconds to look ahead
const CHECK_INTERVAL = 0.5; // how often to check for scheduling

export function useAudioEngine(
  stateRef,
  advanceMusician,
  isPlaying,
  pulseVolume,
  bpm,
) {
  const synthsRef = useRef([]);
  const pulseSynthRef = useRef(null);
  const pulseLoopRef = useRef(null);
  const reverbRef = useRef(null);
  const schedulerIdRef = useRef(null);
  const isSetupRef = useRef(false);
  const prevBpmRef = useRef(bpm);

  // update pulse volume
  useEffect(() => {
    if (pulseSynthRef.current) {
      const vol = Number.isFinite(pulseVolume) ? pulseVolume : -10;
      pulseSynthRef.current.volume.value = vol;
    }
  }, [pulseVolume]);

  // update bpm live
  useEffect(() => {
    const oldBpm = prevBpmRef.current;
    prevBpmRef.current = bpm;
    Tone.getTransport().bpm.value = bpm;

    if (isSetupRef.current && oldBpm !== bpm) {
      const now = Tone.now();
      const ratio = oldBpm / bpm;
      stateRef.current.musicians.forEach((m) => {
        if (m.nextNoteTime > now) {
          m.nextNoteTime = now + (m.nextNoteTime - now) * ratio;
        }
      });
    }
  }, [bpm, stateRef]);

  // helper to ensure synths exist
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

        // determine variation (octave)
        const group = Math.floor(i / 4) % 3;
        if (group === 1) synth.detune.value = -1200;
        else if (group === 2) synth.detune.value = 1200;
        else synth.detune.value = 0;

        synth.volume.value = -12;
        synthsRef.current.push(synth);
      }
    }
  }, [stateRef]);

  // update synths when musician count changes or we start playing
  useEffect(() => {
    if (isSetupRef.current) {
      ensureSynths();
    }
  }, [isPlaying, ensureSynths]);

  // initialize audio
  const setupAudio = useCallback(async () => {
    if (isSetupRef.current) return;
    await Tone.start();

    // global reverb for atmosphere
    const reverb = new Tone.Reverb(2.5).toDestination();
    reverb.wet.value = 0.3;
    reverbRef.current = reverb;

    // pulse synth (the steady high C)
    pulseSynthRef.current = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 },
    }).connect(reverb);
    pulseSynthRef.current.volume.value = Number.isFinite(pulseVolume)
      ? pulseVolume
      : -10;

    // initialize pulse loop (the high C - C5)
    // runs independently on 8th notes
    pulseLoopRef.current = new Tone.Loop((time) => {
      if (pulseSynthRef.current) {
        pulseSynthRef.current.triggerAttackRelease("C5", "16n", time);
      }
    }, "8n");

    isSetupRef.current = true;
    ensureSynths(); // ensure synths are created immediately after setup
  }, [ensureSynths]); // removed pulseVolume from dep to avoid re-setup, handled by effect

  // scheduler loop
  useEffect(() => {
    if (!isPlaying) {
      // FULL CLEANUP
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

      // cleanup synths
      synthsRef.current.forEach((s) => s.dispose());
      synthsRef.current = [];

      // cleanup pulse synth & reverb
      if (pulseSynthRef.current) {
        pulseSynthRef.current.dispose();
        pulseSynthRef.current = null;
      }
      if (reverbRef.current) {
        reverbRef.current.dispose();
        reverbRef.current = null;
      }

      isSetupRef.current = false;
      return;
    }

    setupAudio().then(() => {
      Tone.getTransport().bpm.value = bpm;
      Tone.getTransport().start();
      if (pulseLoopRef.current) pulseLoopRef.current.start(0);

      const now = Tone.now();

      stateRef.current.musicians.forEach((m, i) => {
        // sync if behind OR if exactly 0 (fresh reset)
        if (m.nextNoteTime <= now) {
          m.nextNoteTime = now + 0.1;
        }
      });

      // the scheduling function
      const schedule = () => {
        const now = Tone.now();
        const limit = now + LOOK_AHEAD;

        // iterate all musicians
        stateRef.current.musicians.forEach((musician, index) => {
          try {
            // safety check
            if (index >= synthsRef.current.length) return;
            const synth = synthsRef.current[index];

            // apply volume safely
            const vol = Number.isFinite(musician.volume)
              ? musician.volume
              : -12;
            synth.volume.value = vol;

            // check if individually finished (dropped out)
            if (musician.isFinished) return;

            // while the musician's next note is within our lookahead window
            let loops = 0;
            while (musician.nextNoteTime < limit) {
              loops++;
              if (loops > 100) {
                // infinite loop protection
                musician.nextNoteTime += 1.0;
                break;
              }

              const phrase = phrases[musician.phraseIndex];

              if (!phrase) {
                musician.nextNoteTime += 1.0;
                continue;
              }

              if (musician.noteIndex === undefined) musician.noteIndex = 0;

              const note = phrase.notes[musician.noteIndex];
              const duration = phrase.durations[musician.noteIndex];
              const time = musician.nextNoteTime;

              // schedule sound
              if (note) {
                synth.triggerAttackRelease(note, duration, time);
              }

              // advance time
              const durSec = Tone.Time(duration).toSeconds();
              // guard against zero duration
              musician.nextNoteTime += Math.max(0.01, durSec);

              // advance note index
              musician.noteIndex++;

              // check if phrase complete
              if (musician.noteIndex >= phrase.notes.length) {
                musician.noteIndex = 0;
                // call the engine logic to decide repeats/phrase advance
                advanceMusician(index);
              }
            }
          } catch (err) {
            console.error("Scheduler error for musician " + index, err);
            return;
          }
        });

        // keep scheduling on a fixed interval without creating nested events
        schedulerIdRef.current = Tone.getTransport().schedule(
          schedule,
          "+" + CHECK_INTERVAL,
        );
      };

      // prime the scheduler once shortly after start
      schedulerIdRef.current = Tone.getTransport().schedule(
        schedule,
        "+0.1",
      );
    });

    return () => {
      // cleanup if isPlaying becomes false (handled by top if)
    };
  }, [isPlaying, setupAudio, advanceMusician, stateRef]);

  return {};
}

import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { phrases } from '../data/phrases';

const LOOK_AHEAD = 1.0;
const CHECK_INTERVAL = 0.5;

export function useAudioEngine(stateRef, advanceMusician, isPlaying) {
  const synthsRef = useRef([]);
  const pulseSynthRef = useRef(null);
  const pulseLoopRef = useRef(null);
  const schedulerIdRef = useRef(null);

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

      synthsRef.current.forEach(s => s.dispose());
      synthsRef.current = [];

      if (pulseSynthRef.current) {
        pulseSynthRef.current.dispose();
        pulseSynthRef.current = null;
      }

      return;
    }

    const initAudio = async () => {
      await Tone.start();

      // pulse synth
      pulseSynthRef.current = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
      }).toDestination();
      pulseSynthRef.current.volume.value = -10;

      pulseLoopRef.current = new Tone.Loop((time) => {
        pulseSynthRef.current.triggerAttackRelease("C5", "16n", time);
      }, "8n");

      // create synths for each musician
      for (let i = 0; i < stateRef.current.musicians.length; i++) {
        const synth = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 }
        }).toDestination();
        synth.volume.value = -12;
        synthsRef.current.push(synth);
      }

      Tone.getTransport().start();
      pulseLoopRef.current.start(0);

      // initialize timing using audio context time (Tone.now()), not transport seconds
      const now = Tone.now();
      stateRef.current.musicians.forEach(m => {
        if (m.nextNoteTime <= now) {
          m.nextNoteTime = now + 0.1;
        }
      });

      // scheduling function
      const schedule = () => {
        const now = Tone.now();
        const limit = now + LOOK_AHEAD;

        stateRef.current.musicians.forEach((musician, index) => {
          const synth = synthsRef.current[index];
          if (!synth) return;

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

            // check if phrase is complete
            if (musician.noteIndex >= phrase.notes.length) {
              musician.noteIndex = 0;
              // call the advanceMusician logic
              advanceMusician(index);
            }
          }
        });

        schedulerIdRef.current = Tone.getTransport().schedule(schedule, "+" + CHECK_INTERVAL);
      };

      schedulerIdRef.current = Tone.getTransport().schedule(schedule, "+" + 0.1);
    };

    initAudio();

    return () => {
      // cleanup handled above
    };
  }, [isPlaying, stateRef, advanceMusician]);
}

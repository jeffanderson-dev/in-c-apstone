import * as Tone from "tone";

// 1. digital piano
export function createPiano() {
  return new Tone.Synth({
    oscillator: {
      type: "fmsine",
      modulationType: "sine",
      modulationIndex: 3,
      harmonicity: 3.4,
    },
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.1,
      release: 1.2,
    },
  }).toDestination();
}

// 2. plucked string (violin/cello or guitar)
export function createStrings() {
  return new Tone.Synth({
    oscillator: {
      type: "amtriangle",
      harmonicity: 0.5,
      modulationType: "sine",
    },
    envelope: {
      attack: 0.02,
      decay: 0.15,
      sustain: 0.1,
      release: 1.2,
    },
  }).toDestination();
}

// 3. flute
export function createFlute() {
  return new Tone.Synth({
    oscillator: {
      type: "sine",
    },
    envelope: {
      attack: 0.05,
      decay: 0.1,
      sustain: 0.7,
      release: 0.8,
    },
  }).toDestination();
}

// 4. harmonium / reed organ
export function createHarmonium() {
  return new Tone.Synth({
    oscillator: {
      type: "square",
    },
    envelope: {
      attack: 0.05,
      decay: 0.2,
      sustain: 0.6,
      release: 1.0,
    },
  }).toDestination();
}

export const InstrumentType = {
  PIANO: "PIANO",
  STRINGS: "STRINGS",
  FLUTE: "FLUTE",
  HARMONIUM: "HARMONIUM",
};

export function createInstrument(type) {
  switch (type) {
    case InstrumentType.PIANO:
      return createPiano();
    case InstrumentType.STRINGS:
      return createStrings();
    case InstrumentType.FLUTE:
      return createFlute();
    case InstrumentType.HARMONIUM:
      return createHarmonium();
    default:
      return createPiano();
  }
}

## Goals
- Add 4 different instrument types (Piano, Strings, Flute, Harmonium)
- Implement octave variations for timbral richness
- Add individual volume sliders for each musician
- Add global pulse volume control
- `instrumentFactories.js` with factory functions for each instrument type
- Modified audio engine to assign instruments based on musician index
- Volume sliders in musician cards

## Key Concepts
- Factory pattern for object creation
- Sound synthesis parameters
- Detune for pitch shifting/octaves
- Range input elements
- Real-time parameter control without re-renders

## Running This Project
```bash
npm install
npm run dev
```
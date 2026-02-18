# Musician Coordination & the 3-Phrase Rule

## Goals
- Implement the "3-phrase rule" - no musician can be more than 3 phrases ahead
- Add probabilistic phrase advancement
- Musicians now move through phrases independently
- See real-time updates of each musician's progress
- `useInCEngine` custom hook for managing musician state and advancement logic
- Callback function `advanceMusician` that decides when to move to next phrase
- Constraint checking so musicians stay within 3 phrases of the slowest
- UI updates to show which musicians are waiting

## Key Concepts
- Game loop / state machine concepts
- Probabilistic logic (Math.random())
- Constraint satisfaction (can't advance if too far ahead)
- useCallback and useRef for performance

## Running This Project
```bash
npm install
npm run dev
```

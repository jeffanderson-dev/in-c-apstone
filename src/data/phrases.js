// Simplified version of Terry Riley's "In C" - first 10 phrases

export const phrases = [
  { id: 1, notes: ['C4', 'E4', 'C4', 'E4', 'C4'], durations: ['8n', '8n', '8n', '8n', '8n'] },
  { id: 2, notes: ['C4', 'E4', 'F4', 'E4'], durations: ['8n', '8n', '8n', '8n'] },
  { id: 3, notes: [null, 'E4', 'F4', 'E4'], durations: ['8n', '8n', '8n', '8n'] },
  { id: 4, notes: [null, 'E4', 'F4', 'G4'], durations: ['8n', '8n', '8n', '8n'] },
  { id: 5, notes: ['E4', 'F4', 'G4', null], durations: ['8n', '8n', '8n', '8n'] },
  { id: 6, notes: ['C5', 'C5'], durations: ['2n', '2n'] },
  { id: 7, notes: [null, null, null, 'C4', 'C4', 'C4'], durations: ['4n', '4n', '4n', '8n', '8n', '8n'] },
  { id: 8, notes: ['G4', 'F4'], durations: ['1n', '2n'] },
  { id: 9, notes: ['B4', 'G4', null], durations: ['16n', '16n', '8n'] },
  { id: 10, notes: ['B4', 'G4', 'B4', 'G4'], durations: ['16n', '16n', '16n', '16n'] },
];

export const TOTAL_PHRASES = phrases.length;

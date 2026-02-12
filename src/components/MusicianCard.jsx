export default function MusicianCard({ musician }) {
  return (
    <div className="musician-card">
      <div className="musician-header">
        <span>Musician {musician.id + 1}</span>
      </div>

      <span
        className="phrase-indicator"
        style={{ color: musician.color }}
      >
        Phrase {musician.phraseIndex + 1}
      </span>
    </div>
  );
}

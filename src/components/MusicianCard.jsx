export default function MusicianCard({ musician, setVolume }) {
  return (
    <div className="musician-card">
      <div className="musician-header">
        <span>Musician {musician.id + 1}</span>
        {musician.isWaiting && (
          <span className="wait-indicator" title="Waiting (3-phrase rule)">WAIT</span>
        )}
      </div>

      <span className="phrase-indicator" style={{ color: musician.color }}>
        Phrase {musician.phraseIndex + 1}
      </span>

      <div className="volume-control" style={{ marginTop: '0.75rem' }}>
        <span style={{ fontSize: '0.65rem', color: '#666' }}>VOLUME</span>
        <input
          type="range"
          min="-60"
          max="0"
          defaultValue={-12}
          onChange={(e) => setVolume(musician.id, parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: musician.color, height: '4px' }}
        />
      </div>
    </div>
  );
}

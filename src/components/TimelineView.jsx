import React from "react";
import { TOTAL_PHRASES } from "../data/phrases";
import { motion } from "framer-motion";

const TimelineView = ({ musicians }) => {
  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <span className="timeline-label">Ensemble Progress</span>
        <span className="timeline-status">Phase Cohesion Monitor</span>
      </div>

      <div className="timeline-track-bg">
        {/* markers for key sections */}
        <div
          className="timeline-marker"
          style={{ left: "0%" }}
          title="Start"
        ></div>
        <div
          className="timeline-marker"
          style={{ left: "25%" }}
          title="Phrase 13"
        ></div>
        <div
          className="timeline-marker"
          style={{ left: "50%" }}
          title="Phrase 26"
        ></div>
        <div
          className="timeline-marker"
          style={{ left: "75%" }}
          title="Phrase 39"
        ></div>
        <div
          className="timeline-marker"
          style={{ left: "100%" }}
          title="Finish"
        ></div>

        {/* the track line */}
        <div className="timeline-line"></div>

        {/* musician dots */}
        {musicians.map((m) => {
          const progress =
            TOTAL_PHRASES > 1 ? (m.phraseIndex / (TOTAL_PHRASES - 1)) * 100 : 0;
          // add a little random jitter to 'top' so they don't perfectly overlap if on same phrase
          const topOffset = (m.id % 5) * 6 - 10;

          return (
            <motion.div
              key={m.id}
              className="timeline-dot"
              initial={{ left: 0 }}
              animate={{ left: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
              style={{
                backgroundColor: m.color,
                marginTop: `${topOffset}px`,
                zIndex: Math.floor(progress),
                opacity: m.isFinished ? 0.3 : 1,
              }}
              title={`Musician ${m.id + 1}: Phrase ${m.phraseIndex + 1}`}
            >
              <span className="dot-tooltip">M{m.id + 1}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineView;

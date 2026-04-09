import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';

export default function TotalTimeWidget({ entries }) {
  // Compute the total elapsed seconds across all study entries
  const totalSeconds = useMemo(() => {
    return Object.values(entries).reduce(
      (sum, entry) => sum + (entry.total_time_seconds || 0),
      0
    );
  }, [entries]);

  if (!entries || Object.keys(entries).length === 0) {
    return null; // or a loading/empty state if preferred
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return (
    <div className="total-time-widget card-pane">
      <div className="total-time-header">
        <Clock size={16} className="header-icon" />
        <h3>TOTAL STUDY TIME</h3>
      </div>
      <div className="total-time-body">
        <div className="time-display">
          <div className="time-group">
            <span className="time-val">{days}</span>
            <span className="time-label">DAYS</span>
          </div>
          <div className="time-group">
            <span className="time-val">{hours}</span>
            <span className="time-label">HR</span>
          </div>
          <div className="time-group">
            <span className="time-val">{minutes}</span>
            <span className="time-label">MIN</span>
          </div>
        </div>
      </div>
    </div>
  );
}

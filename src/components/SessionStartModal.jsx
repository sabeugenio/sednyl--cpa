import React from 'react';
import { BookOpen, Play, X } from 'lucide-react';

export default function SessionStartModal({ date, onStart, onClose }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="session-start-modal" onClick={(e) => e.stopPropagation()}>
        <div className="session-start-icon"><BookOpen size={42} strokeWidth={1.5} /></div>
        <h2 className="session-start-title">Start your review session for today?</h2>
        <p className="session-start-date">{formatDate(date)}</p>
        <p className="session-start-subtitle">Track your study time and build consistency</p>
        <div className="session-start-actions">
          <button className="btn-session-start" onClick={onStart}>
            <Play size={16} /> Start Session
          </button>
          <button className="btn-session-cancel" onClick={onClose}>
            <X size={16} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

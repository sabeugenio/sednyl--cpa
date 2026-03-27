import React, { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: 'strong', emoji: '⚡', label: 'Strong' },
  { value: 'showed_up', emoji: '✅', label: 'Showed Up' },
  { value: 'bare_minimum', emoji: '💤', label: 'Bare Minimum' },
  { value: 'missed', emoji: '❌', label: 'Missed' },
];

const FEEDBACK_MESSAGES = {
  strong: "Amazing deep work session! 🌟",
  showed_up: "You showed up today ✨",
  bare_minimum: "That counts. Every bit matters 💙",
  missed: "Tomorrow is a fresh start 🌱",
};

export default function DailyEntryModal({ date, existingEntry, onSave, onClose }) {
  const [status, setStatus] = useState('');
  const [whatIDid, setWhatIDid] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [feeling, setFeeling] = useState('');
  const [thought, setThought] = useState('');
  const [freeWrite, setFreeWrite] = useState('');
  const [showJournal, setShowJournal] = useState(false);

  useEffect(() => {
    if (existingEntry) {
      setStatus(existingEntry.status || '');
      setWhatIDid(existingEntry.what_i_did || '');
      setNextStep(existingEntry.next_step || '');
      setFeeling(existingEntry.feeling || '');
      setThought(existingEntry.thought || '');
      setFreeWrite(existingEntry.free_write || '');
      if (existingEntry.feeling || existingEntry.thought || existingEntry.free_write) {
        setShowJournal(true);
      }
    }
  }, [existingEntry]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleSave = () => {
    if (!status) return;
    onSave({
      date,
      status,
      what_i_did: whatIDid,
      next_step: nextStep,
      feeling,
      thought,
      free_write: freeWrite,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{formatDate(date)}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Status Selector */}
          <div className="status-selector">
            {STATUS_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className={`status-option ${status === opt.value ? `selected ${opt.value}` : ''}`}
                onClick={() => setStatus(opt.value)}
              >
                <span className="status-emoji">{opt.emoji}</span>
                <span className="status-label">{opt.label}</span>
              </div>
            ))}
          </div>

          {status && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-accent)', marginBottom: '1rem', fontStyle: 'italic' }}>
              {FEEDBACK_MESSAGES[status]}
            </p>
          )}

          {/* Core inputs */}
          <div className="form-group">
            <label className="form-label">What I did</label>
            <input
              className="form-input"
              type="text"
              value={whatIDid}
              onChange={(e) => setWhatIDid(e.target.value)}
              placeholder="e.g., Reviewed FAR Chapter 3"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Next step</label>
            <input
              className="form-input"
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="e.g., Start practice MCQs"
            />
          </div>

          {/* Journal toggle */}
          <button
            className="journal-toggle"
            onClick={() => setShowJournal(!showJournal)}
          >
            {showJournal ? '▾' : '▸'} Journal (optional)
          </button>

          {showJournal && (
            <div className="journal-section">
              <div className="form-group">
                <label className="form-label">Today felt</label>
                <input
                  className="form-input"
                  type="text"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  placeholder="1–3 words"
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label className="form-label">One thought</label>
                <input
                  className="form-input"
                  type="text"
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder="One short sentence"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Free write</label>
                <textarea
                  className="form-input form-textarea"
                  value={freeWrite}
                  onChange={(e) => setFreeWrite(e.target.value)}
                  placeholder="Write anything you'd like…"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={!status}
              style={{ opacity: status ? 1 : 0.5 }}
            >
              {existingEntry ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

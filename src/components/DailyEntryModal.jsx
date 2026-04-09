import React, { useState, useEffect } from 'react';
import { normalizeStatus } from '../utils/statusUtils';
import { CheckCircle2, Circle } from 'lucide-react';

const STATUS_CONFIG = {
  peak_focus:      { emoji: '🔥', label: 'Peak Focus',      message: 'You showed serious discipline today. This is CPA-level consistency.' },
  great_progress:  { emoji: '💪', label: 'Great Progress',  message: "You showed up and pushed forward. That's how passers are made." },
  getting_started: { emoji: '🌱', label: 'Getting Started', message: 'You started—and that matters. Small steps still move you forward.' },
  reset_day:       { emoji: '🌼', label: 'Reset Day',       message: 'Rest is part of the process. Tomorrow is another chance to show up.' },
};

function formatStudyTime(totalSeconds) {
  if (!totalSeconds || totalSeconds === 0) return null;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 && hrs === 0) parts.push(`${secs}s`);
  return parts.join(' ') || '0s';
}

export default function DailyEntryModal({ date, existingEntry, onSave, onClose, computedStatus, computedTime, isPostSession, readOnly }) {
  const [whatIDid, setWhatIDid] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [feeling, setFeeling] = useState('');
  const [thought, setThought] = useState('');
  const [freeWrite, setFreeWrite] = useState('');
  const [showJournal, setShowJournal] = useState(false);

  // The status is either computed from session or loaded from existing entry
  const rawStatus = computedStatus || existingEntry?.status || 'reset_day';
  const status = normalizeStatus(rawStatus) || 'reset_day';
  const totalTime = computedTime || existingEntry?.total_time_seconds || 0;
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG['reset_day'];

  const completedTasksCount = existingEntry?.completed_tasks || 0;
  const incompleteTasksCount = existingEntry?.incomplete_tasks || 0;

  // Task history list from snapshot
  let taskHistory = [];
  try {
    if (existingEntry?.tasks_json) {
      taskHistory = JSON.parse(existingEntry.tasks_json);
    }
  } catch (err) {
    console.error('Failed to parse task history:', err);
  }

  useEffect(() => {
    if (existingEntry) {
      setWhatIDid(existingEntry.what_i_did || '');
      setNextStep(existingEntry.next_step || '');
      setFeeling(existingEntry.feeling || '');
      setThought(existingEntry.thought || '');
      setFreeWrite(existingEntry.free_write || '');
      // Auto-expand journal only if it has data
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
    onSave({
      date,
      status,
      what_i_did: whatIDid,
      next_step: nextStep,
      feeling,
      thought,
      free_write: freeWrite,
      total_time_seconds: totalTime,
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
          {/* Motivational Status & Time Banner */}
          <div className={`session-result-banner status-banner-${status}`}>
            <div className="result-status">
              <span className="result-emoji">{statusInfo.emoji}</span>
              <span className="result-label">{statusInfo.label}</span>
            </div>
            
            <div className="result-stats-row">
              {totalTime > 0 && (
                <div className="result-stat-item">
                  <span className="stat-value">{formatStudyTime(totalTime)}</span>
                  <span className="stat-label">Studied</span>
                </div>
              )}
              {(completedTasksCount > 0 || incompleteTasksCount > 0) && (
                <>
                  <div className="result-stat-item">
                    <span className="stat-value">{completedTasksCount}</span>
                    <span className="stat-label">Tasks Done</span>
                  </div>
                  <div className="result-stat-item">
                    <span className="stat-value">{incompleteTasksCount}</span>
                    <span className="stat-label">Pending</span>
                  </div>
                </>
              )}
            </div>
            
            <p className="result-message">{statusInfo.message}</p>
          </div>


            <div className="form-group">
                <label className="form-label">What I did</label>
                <input
                  className="form-input"
                  type="text"
                  value={whatIDid}
                  onChange={(e) => setWhatIDid(e.target.value)}
                  placeholder="e.g., Reviewed FAR Chapter 3"
                  readOnly={readOnly}
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
                  readOnly={readOnly}
                />
              </div>

          {/* Task History Snapshot - Moved here */}
          {taskHistory.length > 0 && (
            <div className="task-history-section">
              <div className="task-history-groups">
                {taskHistory.some(t => t.completed) && (
                  <div className="task-history-group">
                    <label className="form-label text-success">List of finished task</label>
                    <div className="task-history-list">
                      {taskHistory.filter(t => t.completed).map((task, i) => (
                        <div key={i} className="task-history-item finished">
                          <CheckCircle2 size={14} className="task-done-icon" />
                          <span className="task-history-content completed">
                            {task.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {taskHistory.some(t => !t.completed) && (
                  <div className="task-history-group">
                    <label className="form-label text-pending">List of not finished task</label>
                    <div className="task-history-list">
                      {taskHistory.filter(t => !t.completed).map((task, i) => (
                        <div key={i} className="task-history-item">
                          <Circle size={14} className="task-todo-icon" />
                          <span className="task-history-content">
                            {task.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Journal toggle — collapsed by default */}
          <button
            className="journal-toggle"
            onClick={() => setShowJournal(!showJournal)}
          >
            {showJournal ? '▾' : '▸'} Journal (Optional)
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
                  readOnly={readOnly}
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
                  readOnly={readOnly}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Free write</label>
                <textarea
                  className="form-input form-textarea"
                  value={freeWrite}
                  onChange={(e) => setFreeWrite(e.target.value)}
                  placeholder="Write anything you'd like…"
                  readOnly={readOnly}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                className="btn-save"
                onClick={handleSave}
              >
                {existingEntry ? 'Update' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

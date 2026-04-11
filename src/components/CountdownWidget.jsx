import React, { useState, useEffect } from 'react';
import { Timer, Plus, X, Trash2, Edit2, Check } from 'lucide-react';
import { fetchCountdowns, addCountdown, updateCountdown, deleteCountdown } from '../utils/api';
import { BlossomColorPicker } from '@dayflow/blossom-color-picker-react';
import '@dayflow/blossom-color-picker/styles.css';

const EXTENDED_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', 
  '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#059669', '#0d9488',
  '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48',
  '#fca5a5', '#fdba74', '#fcd34d', '#fef08a', '#bef264', '#86efac', '#6ee7b7', '#5eead4'
];

function CountdownWidget({ onChanged }) {
  const [countdowns, setCountdowns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDateMode, setNewDateMode] = useState('single'); // 'single' | 'range'
  const [newDate, setNewDate] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newColor, setNewColor] = useState('#EC4899'); // default pink hex

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDateMode, setEditDateMode] = useState('single'); // 'single' | 'range'
  const [editDate, setEditDate] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editColor, setEditColor] = useState('#EC4899');

  const toDateTimeLocalValue = (value) => {
    // `datetime-local` accepts: YYYY-MM-DDTHH:MM (no timezone).
    if (typeof value !== 'string' || !value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) return value.slice(0, 16);
    return '';
  };

  useEffect(() => {
    loadCountdowns();
  }, []);

  const loadCountdowns = async () => {
    setLoading(true);
    try {
      const data = await fetchCountdowns();
      setCountdowns(data);
    } catch (error) {
      console.error('Failed to load countdowns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const isRange = newDateMode === 'range';
    if (isRange && (!newStartDate || !newEndDate)) return;
    if (!isRange && !newDate) return;

    try {
      const payload = {
        title: newTitle,
        color: newColor,
      };

      if (isRange) {
        payload.startDate = newStartDate;
        payload.endDate = newEndDate;
      } else {
        payload.targetDate = newDate;
      }

      await addCountdown(payload);
      setIsAdding(false);
      setNewTitle('');
      setNewDateMode('single');
      setNewDate('');
      setNewStartDate('');
      setNewEndDate('');
      setNewColor('#EC4899');
      loadCountdowns();
      onChanged?.();
    } catch (error) {
      console.error('Failed to add countdown:', error);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditColor(c.color || '#EC4899');
    if (c.start_date && c.end_date) {
      setEditDateMode('range');
      setEditStartDate(toDateTimeLocalValue(c.start_date));
      setEditEndDate(toDateTimeLocalValue(c.end_date));
      setEditDate('');
    } else {
      setEditDateMode('single');
      setEditDate(toDateTimeLocalValue(c.target_date));
      setEditStartDate('');
      setEditEndDate('');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    const isRange = editDateMode === 'range';
    if (isRange && (!editStartDate || !editEndDate)) return;
    if (!isRange && !editDate) return;

    try {
      const payload = {
        title: editTitle,
        color: editColor,
      };

      if (isRange) {
        payload.startDate = editStartDate;
        payload.endDate = editEndDate;
      } else {
        payload.targetDate = editDate;
      }

      await updateCountdown(editingId, payload);
      setEditingId(null);
      loadCountdowns();
      onChanged?.();
    } catch (error) {
      console.error('Failed to update countdown:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCountdown(id);
      loadCountdowns();
      onChanged?.();
    } catch (error) {
      console.error('Failed to delete countdown:', error);
    }
  };

  const calculateDays = (targetDateStr) => {
    // Calendar-day diff (ignores time-of-day) so labels like Today/Tomorrow behave intuitively.
    const target = new Date(targetDateStr);
    const now = new Date();
    const targetDay = new Date(target);
    const nowDay = new Date(now);
    targetDay.setHours(0, 0, 0, 0);
    nowDay.setHours(0, 0, 0, 0);

    const diffTime = targetDay - nowDay;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getCountdownDisplay = (c) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const hasRange = Boolean(c.start_date && c.end_date);
    if (!hasRange) {
      const diffDays = calculateDays(c.target_date);
      const isPast = diffDays < 0;
      const statusClass =
        isPast
          ? 'is-past'
          : diffDays === 0
            ? 'is-today'
            : diffDays === 1
              ? 'is-tomorrow'
              : diffDays <= 7
                ? 'is-soon'
                : '';

      let countdownEl;
      if (isPast) {
        countdownEl = (
          <>
            <span className="days-val">{Math.abs(diffDays)}</span>
            <span className="days-label">DAYS AGO</span>
          </>
        );
      } else if (diffDays === 0) {
        countdownEl = <span className="status-highlight today">Today</span>;
      } else if (diffDays === 1) {
        countdownEl = <span className="status-highlight tomorrow">Tomorrow</span>;
      } else {
        countdownEl = (
          <>
            <span className="days-val">{diffDays}</span>
            <span className="days-label">DAYS</span>
          </>
        );
      }

      return {
        statusClass,
        countdownEl,
        dateLabel: formatDate(c.target_date),
      };
    }

    const start = new Date(c.start_date);
    const end = new Date(c.end_date);

    const startDay = new Date(start);
    const endDay = new Date(end);
    const nowDay = new Date(now);
    startDay.setHours(0, 0, 0, 0);
    endDay.setHours(0, 0, 0, 0);
    nowDay.setHours(0, 0, 0, 0);

    const daysUntilStart = Math.round((startDay - nowDay) / (1000 * 60 * 60 * 24));
    const daysUntilEnd = Math.round((endDay - nowDay) / (1000 * 60 * 60 * 24));

    const isBefore = now < start;
    const isDuring = now >= start && now <= end;
    const isAfter = now > end;

    const statusClass = isDuring ? 'is-today' : isBefore && daysUntilStart <= 7 ? 'is-soon' : isAfter ? 'is-past' : '';

    let countdownEl;
    if (isBefore) {
      if (daysUntilStart === 0) {
        countdownEl = <span className="status-highlight today">Starts today</span>;
      } else if (daysUntilStart === 1) {
        countdownEl = <span className="status-highlight tomorrow">Starts tomorrow</span>;
      } else {
        countdownEl = (
          <>
            <span className="days-val">{daysUntilStart}</span>
            <span className="days-label">DAYS TO START</span>
          </>
        );
      }
    } else if (isDuring) {
      if (daysUntilEnd === 0) {
        countdownEl = <span className="status-highlight today">Ends today</span>;
      } else {
        countdownEl = (
          <>
            <span className="days-val">{daysUntilEnd}</span>
            <span className="days-label">DAYS LEFT</span>
          </>
        );
      }
    } else if (isAfter) {
      const daysSinceEnd = Math.abs(daysUntilEnd);
      countdownEl = (
        <>
          <span className="days-val">{daysSinceEnd}</span>
          <span className="days-label">DAYS SINCE END</span>
        </>
      );
    }

    return {
      statusClass,
      countdownEl,
      dateLabel: `${formatDate(c.start_date)} – ${formatDate(c.end_date)}`,
    };
  };

  return (
    <div className="countdown-widget">
      <div className="countdown-header">
        <div className="header-title-group">
          <Timer size={18} className="header-icon" />
          <h3>IMPORTANT DATES</h3>
        </div>
        {!isAdding && (
          <button 
            className="add-trigger-btn" 
            onClick={() => setIsAdding(true)}
            title="Add New Date"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="widget-body">
        {isAdding && (
          <div className="form-container">
            <h4 className="form-legend">New Milestone</h4>
            <form className="countdown-editor-form" onSubmit={handleAdd}>
              <div className="input-group">
                <label htmlFor="newTitle">EVENT NAME</label>
                <input
                  id="newTitle"
                  type="text"
                  placeholder="e.g. FAR Exam"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="editor-input"
                  autoFocus
                />
              </div>
              <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 50 }}>
                <label style={{ marginBottom: 0 }}>COLOR LABEL</label>
                <div className="countdown-color-picker" aria-label="Countdown color" style={{ position: 'relative', zIndex: 51 }}>
                  <BlossomColorPicker 
                    colors={EXTENDED_COLORS}
                    sliderPosition="left"
                    onChange={(c) => setNewColor(c.hex)}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>DATE</label>
                <div className="countdown-date-mode">
                  <label className="countdown-date-mode-option">
                    <input
                      type="radio"
                      name="newDateMode"
                      value="single"
                      checked={newDateMode === 'single'}
                      onChange={() => setNewDateMode('single')}
                    />
                    <span>Single</span>
                  </label>
                  <label className="countdown-date-mode-option">
                    <input
                      type="radio"
                      name="newDateMode"
                      value="range"
                      checked={newDateMode === 'range'}
                      onChange={() => setNewDateMode('range')}
                    />
                    <span>Range</span>
                  </label>
                </div>
                {newDateMode === 'single' ? (
                  <input
                    id="newDate"
                    type="datetime-local"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="editor-input"
                  />
                ) : (
                  <div className="countdown-date-range">
                    <div className="countdown-date-range-field">
                      <span className="countdown-date-range-label">Start</span>
                      <input
                        id="newStartDate"
                        type="datetime-local"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="editor-input"
                      />
                    </div>
                    <div className="countdown-date-range-field">
                      <span className="countdown-date-range-label">End</span>
                      <input
                        id="newEndDate"
                        type="datetime-local"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="editor-input"
                        min={newStartDate || undefined}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="form-footer">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-save" 
                  disabled={
                    !newTitle.trim() ||
                    (newDateMode === 'single' ? !newDate : !newStartDate || !newEndDate)
                  }
                >
                  Save Date
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Syncing milestones...</p>
          </div>
        ) : countdowns.length === 0 && !isAdding ? (
          <div className="empty-state">
            <p>No milestones tracked yet.</p>
          </div>
        ) : (
          <div className="items-scroll" aria-label="Important dates list">
            <div className="items-grid">
              {countdowns.map((c) => {
                if (editingId === c.id) {
                  return (
                    <div key={c.id} className="form-container editing">
                      <h4 className="form-legend">Update Milestone</h4>
                      <form className="countdown-editor-form" onSubmit={handleUpdate}>
                        <div className="input-group">
                          <label>EVENT NAME</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="editor-input"
                          />
                        </div>
                      <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 50 }}>
                        <label style={{ marginBottom: 0 }}>COLOR LABEL</label>
                        <div className="countdown-color-picker" aria-label="Countdown color" style={{ position: 'relative', zIndex: 51 }}>
                          <BlossomColorPicker 
                            colors={EXTENDED_COLORS}
                            sliderPosition="left"
                            onChange={(c) => setEditColor(c.hex)}
                          />
                        </div>
                      </div>
                        <div className="input-group">
                          <label>DATE</label>
                          <div className="countdown-date-mode">
                            <label className="countdown-date-mode-option">
                              <input
                                type="radio"
                                name={`editDateMode-${c.id}`}
                                value="single"
                                checked={editDateMode === 'single'}
                                onChange={() => setEditDateMode('single')}
                              />
                              <span>Single</span>
                            </label>
                            <label className="countdown-date-mode-option">
                              <input
                                type="radio"
                                name={`editDateMode-${c.id}`}
                                value="range"
                                checked={editDateMode === 'range'}
                                onChange={() => setEditDateMode('range')}
                              />
                              <span>Range</span>
                            </label>
                          </div>
                          {editDateMode === 'single' ? (
                            <input
                            type="datetime-local"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="editor-input"
                            />
                          ) : (
                            <div className="countdown-date-range">
                              <div className="countdown-date-range-field">
                                <span className="countdown-date-range-label">Start</span>
                                <input
                                type="datetime-local"
                                  value={editStartDate}
                                  onChange={(e) => setEditStartDate(e.target.value)}
                                  className="editor-input"
                                />
                              </div>
                              <div className="countdown-date-range-field">
                                <span className="countdown-date-range-label">End</span>
                                <input
                                type="datetime-local"
                                  value={editEndDate}
                                  onChange={(e) => setEditEndDate(e.target.value)}
                                  className="editor-input"
                                  min={editStartDate || undefined}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="form-footer">
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn-save"
                            disabled={
                              !editTitle.trim() ||
                              (editDateMode === 'single' ? !editDate : !editStartDate || !editEndDate)
                            }
                          >
                            Update
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                }

                const { statusClass, countdownEl, dateLabel } = getCountdownDisplay(c);

                return (
                  <div key={c.id} className={`item-card ${statusClass}`}>
                    <div className="item-card-inner">
                      <div className="item-card-header">
                        <span className="item-title">
                          <span 
                            className={`countdown-legend-dot ${(!c.color || c.color.startsWith('#')) ? '' : `color-${c.color}`}`} 
                            style={c.color && c.color.startsWith('#') ? { backgroundColor: c.color } : { backgroundColor: !c.color ? '#EC4899' : undefined }}
                            aria-hidden="true" 
                          />
                          {c.title}
                        </span>
                        <div className="item-header-actions">
                          <button className="action-btn-mini edit" onClick={() => handleEdit(c)} title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button className="action-btn-mini delete" onClick={() => handleDelete(c.id)} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="item-countdown-row">{countdownEl}</div>

                      <span className="item-date">{dateLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CountdownWidget;

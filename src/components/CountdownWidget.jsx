import React, { useState, useEffect } from 'react';
import { Timer, Plus, X, Trash2, Edit2, Check } from 'lucide-react';
import { fetchCountdowns, addCountdown, updateCountdown, deleteCountdown } from '../utils/api';

function CountdownWidget() {
  const [countdowns, setCountdowns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDateMode, setNewDateMode] = useState('single'); // 'single' | 'range'
  const [newDate, setNewDate] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDateMode, setEditDateMode] = useState('single'); // 'single' | 'range'
  const [editDate, setEditDate] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

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
      await addCountdown({
        title: newTitle,
        targetDate: isRange ? undefined : newDate,
        startDate: isRange ? newStartDate : undefined,
        endDate: isRange ? newEndDate : undefined,
      });
      setIsAdding(false);
      setNewTitle('');
      setNewDateMode('single');
      setNewDate('');
      setNewStartDate('');
      setNewEndDate('');
      loadCountdowns();
    } catch (error) {
      console.error('Failed to add countdown:', error);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    if (c.start_date && c.end_date) {
      setEditDateMode('range');
      setEditStartDate(c.start_date);
      setEditEndDate(c.end_date);
      setEditDate('');
    } else {
      setEditDateMode('single');
      setEditDate(c.target_date);
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
      await updateCountdown(editingId, {
        title: editTitle,
        targetDate: isRange ? undefined : editDate,
        startDate: isRange ? editStartDate : undefined,
        endDate: isRange ? editEndDate : undefined,
      });
      setEditingId(null);
      loadCountdowns();
    } catch (error) {
      console.error('Failed to update countdown:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCountdown(id);
      loadCountdowns();
    } catch (error) {
      console.error('Failed to delete countdown:', error);
    }
  };

  const calculateDays = (targetDateStr) => {
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffTime = target - now;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const daysUntilStart = Math.round((start - now) / (1000 * 60 * 60 * 24));
    const daysUntilEnd = Math.round((end - now) / (1000 * 60 * 60 * 24));

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
                    type="date"
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
                        type="date"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="editor-input"
                      />
                    </div>
                    <div className="countdown-date-range-field">
                      <span className="countdown-date-range-label">End</span>
                      <input
                        id="newEndDate"
                        type="date"
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
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="editor-input"
                          />
                        ) : (
                          <div className="countdown-date-range">
                            <div className="countdown-date-range-field">
                              <span className="countdown-date-range-label">Start</span>
                              <input
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                className="editor-input"
                              />
                            </div>
                            <div className="countdown-date-range-field">
                              <span className="countdown-date-range-label">End</span>
                              <input
                                type="date"
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
                      <span className="item-title">{c.title}</span>
                      <div className="item-header-actions">
                        <button className="action-btn-mini edit" onClick={() => handleEdit(c)} title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button className="action-btn-mini delete" onClick={() => handleDelete(c.id)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="item-countdown-row">
                      {countdownEl}
                    </div>

                    <span className="item-date">
                      {dateLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CountdownWidget;

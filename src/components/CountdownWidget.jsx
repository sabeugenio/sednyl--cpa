import React, { useState, useEffect } from 'react';
import { Timer, Plus, X, Trash2, Edit2, Check } from 'lucide-react';
import { fetchCountdowns, addCountdown, updateCountdown, deleteCountdown } from '../utils/api';

function CountdownWidget() {
  const [countdowns, setCountdowns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

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
    if (!newTitle.trim() || !newDate) return;

    try {
      await addCountdown(newTitle, newDate);
      setIsAdding(false);
      setNewTitle('');
      setNewDate('');
      loadCountdowns();
    } catch (error) {
      console.error('Failed to add countdown:', error);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditDate(c.target_date);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDate) return;

    try {
      await updateCountdown(editingId, { title: editTitle, targetDate: editDate });
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
                <label htmlFor="newDate">TARGET DATE</label>
                <input
                  id="newDate"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="editor-input"
                />
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
                  disabled={!newTitle.trim() || !newDate}
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
                        <label>TARGET DATE</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="editor-input"
                        />
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
                          disabled={!editTitle.trim() || !editDate}
                        >
                          Update
                        </button>
                      </div>
                    </form>
                  </div>
                );
              }

              const diffDays = calculateDays(c.target_date);
              const isPast = diffDays < 0;
              const statusClass = isPast ? 'is-past' : diffDays === 0 ? 'is-today' : diffDays === 1 ? 'is-tomorrow' : diffDays <= 7 ? 'is-soon' : '';

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
                      {isPast ? (
                        <>
                          <span className="days-val">{Math.abs(diffDays)}</span>
                          <span className="days-label">DAYS AGO</span>
                        </>
                      ) : diffDays === 0 ? (
                        <span className="status-highlight today">Today</span>
                      ) : diffDays === 1 ? (
                        <span className="status-highlight tomorrow">Tomorrow</span>
                      ) : (
                        <>
                          <span className="days-val">{diffDays}</span>
                          <span className="days-label">DAYS</span>
                        </>
                      )}
                    </div>

                    <span className="item-date">
                      {new Date(c.target_date).toLocaleDateString([], { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
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

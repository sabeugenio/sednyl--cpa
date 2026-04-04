import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchTopics, addTopic, updateTopic, deleteTopic } from '../utils/api';
import { fetchSettings, saveSetting } from '../utils/api';
import { ChevronDown, ChevronUp, Plus, X, BookOpen, CheckCircle, Trash2 } from 'lucide-react';

export default function TopicsPanel() {
  const [topics, setTopics] = useState([]);
  const [doneTopics, setDoneTopics] = useState([]);
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [newTopicText, setNewTopicText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const inputRef = useRef(null);
  const titleInputRef = useRef(null);

  // Load active topics (not done)
  const loadTopics = useCallback(async () => {
    try {
      const data = await fetchTopics(0);
      setTopics(data);
    } catch (err) {
      console.error('Failed to load topics:', err);
    }
  }, []);

  // Load done topics
  const loadDoneTopics = useCallback(async () => {
    try {
      const data = await fetchTopics(1);
      setDoneTopics(data);
    } catch (err) {
      console.error('Failed to load done topics:', err);
    }
  }, []);

  const loadTitle = useCallback(async () => {
    try {
      const settings = await fetchSettings();
      if (settings.topics_title) {
        setTitle(settings.topics_title);
      }
    } catch (err) {
      console.error('Failed to load topics title:', err);
    }
  }, []);

  useEffect(() => {
    loadTopics();
    loadDoneTopics();
    loadTitle();
  }, [loadTopics, loadDoneTopics, loadTitle]);

  // Focus on new topic input when adding
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Save title to settings (debounced via onBlur)
  const handleTitleBlur = async () => {
    try {
      await saveSetting('topics_title', title);
    } catch (err) {
      console.error('Failed to save title:', err);
    }
  };

  // Toggle completed — marks as done and moves to done list
  const handleToggle = async (topic) => {
    try {
      await updateTopic(topic.id, { completed: 1, is_done: 1 });
      // Move from active to done list visually
      setTopics((prev) => prev.filter((t) => t.id !== topic.id));
      setDoneTopics((prev) => [...prev, { ...topic, completed: 1, is_done: 1 }]);
    } catch (err) {
      console.error('Failed to mark topic as done:', err);
    }
  };

  // Add new topic
  const handleAdd = async () => {
    if (!newTopicText.trim()) return;
    try {
      const created = await addTopic(newTopicText.trim());
      setTopics((prev) => [...prev, created]);
      setNewTopicText('');
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      console.error('Failed to add topic:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTopicText('');
    }
  };

  // Delete topic (from done modal)
  const handleDeleteDone = async (id) => {
    try {
      await deleteTopic(id);
      setDoneTopics((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  };

  // Delete topic (from active list)
  const handleDeleteActive = async (id) => {
    try {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  };

  const totalActive = topics.length;
  const totalDone = doneTopics.length;
  const totalAll = totalActive + totalDone;

  return (
    <>
      <div className="topics-panel">
        <div className="topics-header">
          <div className="topics-icon-wrapper">
            <BookOpen size={14} />
          </div>
          <h3>Study Topics</h3>
        </div>

        {/* Editable subtitle */}
        <div className="topics-subtitle">
          <span className="topics-subtitle-label">Summary of topics to be studied for</span>
          <input
            ref={titleInputRef}
            className="topics-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="e.g. CPALE, FAR, Auditing..."
          />
        </div>

        {/* Progress indicator */}
        {totalAll > 0 && (
          <div className="topics-progress">
            <div className="topics-progress-bar">
              <div
                className="topics-progress-fill"
                style={{ width: `${totalAll > 0 ? (totalDone / totalAll) * 100 : 0}%` }}
              />
            </div>
            <span className="topics-progress-text">
              {totalDone}/{totalAll} done
            </span>
          </div>
        )}

        {/* Show/Hide toggle */}
        <button
          className="topics-toggle-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <span>Hide topics</span>
              <ChevronUp size={14} />
            </>
          ) : (
            <>
              <span>Show all topics</span>
              <ChevronDown size={14} />
            </>
          )}
          {!expanded && totalActive > 0 && (
            <span className="topics-count-badge">{totalActive}</span>
          )}
        </button>

        {/* Topic list (collapsible) */}
        <div className={`topics-list-wrapper ${expanded ? 'expanded' : ''}`}>
          <div className="topics-list">
            {topics.map((topic) => (
              <div key={topic.id} className="topic-item">
                <input
                  className="topic-checkbox"
                  type="checkbox"
                  checked={false}
                  onChange={() => handleToggle(topic)}
                />
                <span className="topic-text">
                  {topic.content}
                </span>
                <button
                  className="topic-delete-btn"
                  onClick={() => handleDeleteActive(topic.id)}
                  title="Remove topic"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {topics.length === 0 && (
              <div className="topics-empty">No topics yet — add one below</div>
            )}

            {/* Add new topic */}
            {isAdding ? (
              <div className="topic-add-row">
                <input
                  ref={inputRef}
                  className="topic-add-input"
                  type="text"
                  value={newTopicText}
                  onChange={(e) => setNewTopicText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter topic..."
                />
                <button className="topic-add-confirm" onClick={handleAdd}>
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <button className="topic-add-btn" onClick={() => setIsAdding(true)}>
                <Plus size={13} />
                <span>Add topic</span>
              </button>
            )}
          </div>

          {/* View done topics button */}
          {totalDone > 0 && (
            <button
              className="topics-done-btn"
              onClick={() => { setShowDoneModal(true); loadDoneTopics(); }}
            >
              <CheckCircle size={13} />
              <span>View completed topics</span>
              <span className="topics-done-badge">{totalDone}</span>
            </button>
          )}
        </div>
      </div>

      {/* Done Topics Modal */}
      {showDoneModal && (
        <div className="modal-overlay" onClick={() => setShowDoneModal(false)}>
          <div className="done-topics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="done-topics-modal-header">
              <div className="done-topics-modal-title">
                <CheckCircle size={18} />
                <h3>Completed Topics</h3>
              </div>
              <button
                className="done-topics-modal-close"
                onClick={() => setShowDoneModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="done-topics-modal-body">
              {doneTopics.length === 0 ? (
                <div className="done-topics-empty">
                  No completed topics yet
                </div>
              ) : (
                <div className="done-topics-list">
                  {doneTopics.map((topic) => (
                    <div key={topic.id} className="done-topic-item">
                      <CheckCircle size={14} className="done-topic-check" />
                      <span className="done-topic-text">{topic.content}</span>
                      <button
                        className="done-topic-delete-btn"
                        onClick={() => handleDeleteDone(topic.id)}
                        title="Delete topic"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="done-topics-modal-footer">
              <span className="done-topics-count">{totalDone} topic{totalDone !== 1 ? 's' : ''} completed</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

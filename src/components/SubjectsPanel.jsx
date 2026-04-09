import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchSubjects,
  addSubject,
  updateSubject,
  deleteSubject,
  fetchSubjectTopics,
  addSubjectTopic,
  updateSubjectTopic,
  deleteSubjectTopic,
  fetchChecklistItems,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  fetchSettings,
} from '../utils/api';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  BookOpen,
  CheckCircle,
  Trash2,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

export default function SubjectsPanel() {
  // Subjects and Topics state
  const [subjects, setSubjects] = useState([]);
  const [topicsBySubject, setTopicsBySubject] = useState({}); // { subjectId: [topics] }
  const [checklistsByTopic, setChecklistsByTopic] = useState({}); // { topicId: [items] }
  const [completedTopicsBySubject, setCompletedTopicsBySubject] = useState({});

  // UI state
  const [expanded, setExpanded] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [topicToDelete, setTopicToDelete] = useState(null);

  // Input state
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newTopicBySubject, setNewTopicBySubject] = useState({});
  const [isAddingTopicBySubject, setIsAddingTopicBySubject] = useState({});
  const [newChecklistByTopic, setNewChecklistByTopic] = useState({});
  const [isAddingChecklistByTopic, setIsAddingChecklistByTopic] = useState({});

  const [focusMainIds, setFocusMainIds] = useState([]);
  const [focusLightIds, setFocusLightIds] = useState([]);

  const subjectInputRef = useRef(null);

  // Load all subjects and their topics
  const loadAllData = useCallback(async () => {
    try {
      const [fetchedSubjects, settings] = await Promise.all([fetchSubjects(), fetchSettings()]);
      setSubjects(fetchedSubjects);
      const parseIds = (raw) => {
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.map((x) => String(x));
        } catch {}
        return [];
      };
      const mainIds = parseIds(settings.focus_main_subject_ids);
      const lightIds = parseIds(settings.focus_light_subject_ids);
      const legacyMain = settings.focus_main_subject_id ? [String(settings.focus_main_subject_id)] : [];
      const legacyLight = settings.focus_light_subject_id ? [String(settings.focus_light_subject_id)] : [];
      setFocusMainIds(Array.from(new Set([...(mainIds.length ? mainIds : legacyMain)])));
      setFocusLightIds(Array.from(new Set([...(lightIds.length ? lightIds : legacyLight)])));

      // Load topics and checklists for each subject
      const topicsMap = {};
      const completedMap = {};
      const checklistsMap = {};

      for (const subject of fetchedSubjects) {
        const activeTopics = await fetchSubjectTopics(subject.id, 0);
        const doneTopics = await fetchSubjectTopics(subject.id, 1);

        topicsMap[subject.id] = activeTopics;
        completedMap[subject.id] = doneTopics;

        // Load checklists for all topics
        for (const topic of activeTopics) {
          const checklists = await fetchChecklistItems(topic.id);
          checklistsMap[topic.id] = checklists;
        }
        for (const topic of doneTopics) {
          const checklists = await fetchChecklistItems(topic.id);
          checklistsMap[topic.id] = checklists;
        }
      }

      setTopicsBySubject(topicsMap);
      setCompletedTopicsBySubject(completedMap);
      setChecklistsByTopic(checklistsMap);
    } catch (err) {
      console.error('Failed to load subjects and topics:', err);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const onFocusUpdated = (e) => {
      const detail = e?.detail || {};
      const nextMain = Array.isArray(detail.mainIds) ? detail.mainIds.map((x) => String(x)) : [];
      const nextLight = Array.isArray(detail.lightIds) ? detail.lightIds.map((x) => String(x)) : [];
      setFocusMainIds(nextMain);
      setFocusLightIds(nextLight);
    };
    window.addEventListener('focusSubjectsUpdated', onFocusUpdated);
    return () => window.removeEventListener('focusSubjectsUpdated', onFocusUpdated);
  }, []);

  // Add new subject
  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const created = await addSubject(newSubjectName.trim());
      setSubjects((prev) => [...prev, created]);
      setTopicsBySubject((prev) => ({ ...prev, [created.id]: [] }));
      setCompletedTopicsBySubject((prev) => ({ ...prev, [created.id]: [] }));
      setNewSubjectName('');
      setIsAddingSubject(false);
      if (subjectInputRef.current) subjectInputRef.current.focus();
    } catch (err) {
      console.error('Failed to add subject:', err);
    }
  };

  // Add topic to subject
  const handleAddTopic = async (subjectId) => {
    const title = newTopicBySubject[subjectId] || '';
    if (!title.trim()) return;
    try {
      const created = await addSubjectTopic(subjectId, title.trim());
      setTopicsBySubject((prev) => ({
        ...prev,
        [subjectId]: [...(prev[subjectId] || []), created],
      }));
      setChecklistsByTopic((prev) => ({ ...prev, [created.id]: [] }));
      setNewTopicBySubject((prev) => ({ ...prev, [subjectId]: '' }));
      setIsAddingTopicBySubject((prev) => ({ ...prev, [subjectId]: false }));
    } catch (err) {
      console.error('Failed to add topic:', err);
    }
  };

  // Add checklist item
  const handleAddChecklistItem = async (topicId) => {
    const content = newChecklistByTopic[topicId] || '';
    if (!content.trim()) return;
    try {
      const created = await addChecklistItem(topicId, content.trim());
      setChecklistsByTopic((prev) => ({
        ...prev,
        [topicId]: [...(prev[topicId] || []), created],
      }));
      setNewChecklistByTopic((prev) => ({ ...prev, [topicId]: '' }));
      setIsAddingChecklistByTopic((prev) => ({ ...prev, [topicId]: false }));
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  };

  // Toggle topic completed status
  const handleToggleTopic = async (subjectId, topic) => {
    try {
      await updateSubjectTopic(topic.id, { completed: 1 });
      setTopicsBySubject((prev) => ({
        ...prev,
        [subjectId]: prev[subjectId].filter((t) => t.id !== topic.id),
      }));
      setCompletedTopicsBySubject((prev) => ({
        ...prev,
        [subjectId]: [...(prev[subjectId] || []), { ...topic, completed: 1 }],
      }));
    } catch (err) {
      console.error('Failed to mark topic as complete:', err);
    }
  };

  // Untoggle topic completed status
  const handleUntoggleTopic = async (subjectId, topic) => {
    try {
      await updateSubjectTopic(topic.id, { completed: 0 });
      setCompletedTopicsBySubject((prev) => ({
        ...prev,
        [subjectId]: prev[subjectId].filter((t) => t.id !== topic.id),
      }));
      setTopicsBySubject((prev) => ({
        ...prev,
        [subjectId]: [...(prev[subjectId] || []), { ...topic, completed: 0 }],
      }));
    } catch (err) {
      console.error('Failed to mark topic as incomplete:', err);
    }
  };

  // Toggle checklist item
  const handleToggleChecklistItem = async (item) => {
    try {
      await updateChecklistItem(item.id, { completed: !item.completed });
      setChecklistsByTopic((prev) => ({
        ...prev,
        [item.topic_id]: prev[item.topic_id].map((i) =>
          i.id === item.id ? { ...i, completed: !i.completed } : i
        ),
      }));
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
    }
  };

  // Request delete subject (checks for topics)
  const requestDeleteSubject = (subject) => {
    const activeTopicsCount = topicsBySubject[subject.id]?.length || 0;
    const completedTopicsCount = completedTopicsBySubject[subject.id]?.length || 0;
    
    if (activeTopicsCount + completedTopicsCount > 0) {
      setSubjectToDelete(subject);
    } else {
      handleDeleteSubject(subject.id);
    }
  };

  // Delete subject
  const handleDeleteSubject = async (id) => {
    try {
      await deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      const newTopics = { ...topicsBySubject };
      delete newTopics[id];
      setTopicsBySubject(newTopics);
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  };

  // Request delete topic (checks for checklist items)
  const requestDeleteTopic = (subjectId, topic) => {
    const itemsCount = checklistsByTopic[topic.id]?.length || 0;
    
    if (itemsCount > 0) {
      setTopicToDelete({ subjectId, topic });
    } else {
      handleDeleteTopic(subjectId, topic.id);
    }
  };

  // Delete topic
  const handleDeleteTopic = async (subjectId, topicId) => {
    try {
      await deleteSubjectTopic(topicId);
      setTopicsBySubject((prev) => ({
        ...prev,
        [subjectId]: prev[subjectId].filter((t) => t.id !== topicId),
      }));
      setCompletedTopicsBySubject((prev) => ({
        ...prev,
        [subjectId]: prev[subjectId].filter((t) => t.id !== topicId),
      }));
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  };

  // Delete checklist item
  const handleDeleteChecklistItem = async (topicId, itemId) => {
    try {
      await deleteChecklistItem(itemId);
      setChecklistsByTopic((prev) => ({
        ...prev,
        [topicId]: prev[topicId].filter((i) => i.id !== itemId),
      }));
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    }
  };

  // Calculate totals
  const totalActiveTopics = Object.values(topicsBySubject).reduce((sum, topics) => sum + topics.length, 0);
  const totalCompletedTopics = Object.values(completedTopicsBySubject).reduce((sum, topics) => sum + topics.length, 0);
  const totalTopics = totalActiveTopics + totalCompletedTopics;

  return (
    <>
      <div className="topics-panel subjects-panel">
        <div className="topics-header">
          <div className="topics-icon-wrapper">
            <BookOpen size={14} />
          </div>
          <h3>Subjects</h3>
        </div>

        {/* Progress indicator */}
        {totalTopics > 0 && (
          <div className="topics-progress">
            <div className="topics-progress-bar">
              <div
                className="topics-progress-fill"
                style={{
                  width: `${totalTopics > 0 ? (totalCompletedTopics / totalTopics) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="topics-progress-text">
              {totalCompletedTopics}/{totalTopics} done
            </span>
          </div>
        )}

        {/* Show/Hide toggle */}
        <button className="topics-toggle-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <>
              <span>Hide subjects</span>
              <ChevronUp size={14} />
            </>
          ) : (
            <>
              <span>Show subjects</span>
              <ChevronDown size={14} />
            </>
          )}
          {!expanded && totalActiveTopics > 0 && (
            <span className="topics-count-badge">{totalActiveTopics}</span>
          )}
        </button>

        {/* Subjects list (collapsible) */}
        <div className={`topics-list-wrapper ${expanded ? 'expanded' : ''}`}>
          <div className="subjects-list">
            {subjects.map((subject) => {
              const isSubjectExpanded = expandedSubjects.has(subject.id);
              const subjectTopics = topicsBySubject[subject.id] || [];

              return (
                <div
                  key={subject.id}
                  className={`subject-item subject-${subject.name.trim().toLowerCase()} ${focusMainIds.includes(String(subject.id)) ? 'is-focus-main' : ''} ${focusLightIds.includes(String(subject.id)) ? 'is-focus-light' : ''}`}
                >
                  <button
                    className="subject-toggle-btn"
                    onClick={() => {
                      const newSet = new Set(expandedSubjects);
                      if (newSet.has(subject.id)) {
                        newSet.delete(subject.id);
                      } else {
                        newSet.add(subject.id);
                      }
                      setExpandedSubjects(newSet);
                    }}
                  >
                    <ChevronRight
                      size={14}
                      style={{
                        transform: isSubjectExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>

                  <span className="subject-name">{subject.name}</span>
                  <span className="subject-topic-count">{subjectTopics.length}</span>

                  <button
                    className="subject-delete-btn"
                    onClick={() => requestDeleteSubject(subject)}
                    title="Delete subject"
                  >
                    <X size={12} />
                  </button>

                  {/* Topics list for this subject */}
                  {isSubjectExpanded && (
                    <div className="topics-nested-list">
                      {subjectTopics.length === 0 ? (
                        <div className="topics-empty">No topics yet</div>
                      ) : (
                        subjectTopics.map((topic) => {
                          const isTopicExpanded = expandedTopics.has(topic.id);
                          const checklists = checklistsByTopic[topic.id] || [];
                          const completedChecklists = checklists.filter((i) => i.completed).length;

                          return (
                            <div key={topic.id} className="topic-item nested">
                              <button
                                className="topic-toggle-btn"
                                onClick={() => {
                                  const newSet = new Set(expandedTopics);
                                  if (newSet.has(topic.id)) {
                                    newSet.delete(topic.id);
                                  } else {
                                    newSet.add(topic.id);
                                  }
                                  setExpandedTopics(newSet);
                                }}
                              >
                                <ChevronRight
                                  size={12}
                                  style={{
                                    transform: isTopicExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                  }}
                                />
                              </button>

                              <input
                                className="topic-checkbox"
                                type="checkbox"
                                checked={false}
                                onChange={() => handleToggleTopic(subject.id, topic)}
                              />

                              <span className="topic-text">{topic.title}</span>
                              {checklists.length > 0 && (
                                <span className="checklist-progress">
                                  {completedChecklists}/{checklists.length}
                                </span>
                              )}

                              <button
                                className="topic-delete-btn"
                                onClick={() => requestDeleteTopic(subject.id, topic)}
                                title="Delete topic"
                              >
                                <X size={12} />
                              </button>

                              {/* Checklist items */}
                              {isTopicExpanded && (
                                <div className="checklist-items">
                                  {checklists.map((item) => (
                                    <div key={item.id} className="checklist-item">
                                      <input
                                        className="checklist-checkbox"
                                        type="checkbox"
                                        checked={item.completed}
                                        onChange={() => handleToggleChecklistItem(item)}
                                      />
                                      <span
                                        className={`checklist-text ${item.completed ? 'completed' : ''}`}
                                      >
                                        {item.content}
                                      </span>
                                      <button
                                        className="checklist-delete-btn"
                                        onClick={() =>
                                          handleDeleteChecklistItem(topic.id, item.id)
                                        }
                                        title="Delete item"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ))}

                                  {/* Add checklist item */}
                                  {isAddingChecklistByTopic[topic.id] ? (
                                    <div className="checklist-add-row">
                                      <input
                                        className="checklist-add-input"
                                        type="text"
                                        value={newChecklistByTopic[topic.id] || ''}
                                        onChange={(e) =>
                                          setNewChecklistByTopic((prev) => ({
                                            ...prev,
                                            [topic.id]: e.target.value,
                                          }))
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleAddChecklistItem(topic.id);
                                          } else if (e.key === 'Escape') {
                                            setIsAddingChecklistByTopic((prev) => ({
                                              ...prev,
                                              [topic.id]: false,
                                            }));
                                          }
                                        }}
                                        placeholder="Add checklist item..."
                                      />
                                      <button
                                        className="checklist-add-btn"
                                        onClick={() => handleAddChecklistItem(topic.id)}
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      className="checklist-add-btn-link"
                                      onClick={() =>
                                        setIsAddingChecklistByTopic((prev) => ({
                                          ...prev,
                                          [topic.id]: true,
                                        }))
                                      }
                                    >
                                      <Plus size={12} />
                                      <span>Add item</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      {/* Add topic button */}
                      {isAddingTopicBySubject[subject.id] ? (
                        <div className="topic-add-row">
                          <input
                            className="topic-add-input"
                            type="text"
                            value={newTopicBySubject[subject.id] || ''}
                            onChange={(e) =>
                              setNewTopicBySubject((prev) => ({
                                ...prev,
                                [subject.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddTopic(subject.id);
                              } else if (e.key === 'Escape') {
                                setIsAddingTopicBySubject((prev) => ({
                                  ...prev,
                                  [subject.id]: false,
                                }));
                              }
                            }}
                            placeholder="Enter topic..."
                          />
                          <button
                            className="topic-add-confirm"
                            onClick={() => handleAddTopic(subject.id)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="topic-add-btn"
                          onClick={() =>
                            setIsAddingTopicBySubject((prev) => ({
                              ...prev,
                              [subject.id]: true,
                            }))
                          }
                        >
                          <Plus size={13} />
                          <span>Add topic</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {subjects.length === 0 && (
              <div className="topics-empty">No subjects yet — add one below</div>
            )}

            {/* Add subject button */}
            {isAddingSubject ? (
              <div className="subject-add-row">
                <input
                  ref={subjectInputRef}
                  className="subject-add-input"
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSubject();
                    } else if (e.key === 'Escape') {
                      setIsAddingSubject(false);
                      setNewSubjectName('');
                    }
                  }}
                  placeholder="Enter subject name..."
                />
                <button className="subject-add-confirm" onClick={handleAddSubject}>
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <button
                className="topic-add-btn"
                onClick={() => setIsAddingSubject(true)}
              >
                <Plus size={13} />
                <span>Add subject</span>
              </button>
            )}
          </div>

          {/* View completed topics button */}
          {totalCompletedTopics > 0 && (
            <button
              className="topics-done-btn"
              onClick={() => setShowCompletedModal(true)}
            >
              <CheckCircle size={13} />
              <span>View completed topics</span>
              <span className="topics-done-badge">{totalCompletedTopics}</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Deleting Subject */}
      {subjectToDelete && (
        <div className="modal-overlay" onClick={() => setSubjectToDelete(null)}>
          <div className="done-topics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="done-topics-modal-header">
              <div className="done-topics-modal-title">
                <Trash2 size={18} />
                <h3 style={{ color: '#ef4444' }}>Delete Subject</h3>
              </div>
              <button
                className="done-topics-modal-close"
                onClick={() => setSubjectToDelete(null)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="done-topics-modal-body" style={{ padding: '24px 20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '15px' }}>
                Are you sure you want to delete <strong>{subjectToDelete.name}</strong>?
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #666)' }}>
                This subject contains topics. Deleting it will also remove all its topics and checklists. This action cannot be undone.
              </p>
            </div>
            
            <div className="done-topics-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px' }}>
              <button 
                onClick={() => setSubjectToDelete(null)}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border-color, #e5e7eb)', 
                  background: 'transparent',
                  color: 'var(--text-color, #374151)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleDeleteSubject(subjectToDelete.id);
                  setSubjectToDelete(null);
                }}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  background: '#ef4444', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Topic */}
      {topicToDelete && (
        <div className="modal-overlay" onClick={() => setTopicToDelete(null)} style={{ zIndex: 1100 }}>
          <div className="done-topics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="done-topics-modal-header">
              <div className="done-topics-modal-title">
                <Trash2 size={18} />
                <h3 style={{ color: '#ef4444' }}>Delete Topic</h3>
              </div>
              <button
                className="done-topics-modal-close"
                onClick={() => setTopicToDelete(null)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="done-topics-modal-body" style={{ padding: '24px 20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '15px' }}>
                Are you sure you want to delete <strong>{topicToDelete.topic.title}</strong>?
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #666)' }}>
                This topic contains checklist items. Deleting it will also remove all its items. This action cannot be undone.
              </p>
            </div>
            
            <div className="done-topics-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px' }}>
              <button 
                onClick={() => setTopicToDelete(null)}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border-color, #e5e7eb)', 
                  background: 'transparent',
                  color: 'var(--text-color, #374151)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleDeleteTopic(topicToDelete.subjectId, topicToDelete.topic.id);
                  setTopicToDelete(null);
                }}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  background: '#ef4444', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Topics Modal */}
      {showCompletedModal && (
        <div className="modal-overlay" onClick={() => setShowCompletedModal(false)}>
          <div className="done-topics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="done-topics-modal-header">
              <div className="done-topics-modal-title">
                <CheckCircle size={18} />
                <h3>Completed Topics</h3>
              </div>
              <button
                className="done-topics-modal-close"
                onClick={() => setShowCompletedModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="done-topics-modal-body">
              {totalCompletedTopics === 0 ? (
                <div className="done-topics-empty">No completed topics yet</div>
              ) : (
                <div className="completed-subjects-list">
                  {subjects.map((subject) => {
                    const completedTopics = completedTopicsBySubject[subject.id] || [];
                    if (completedTopics.length === 0) return null;

                    return (
                      <div key={subject.id} className="completed-subject-group">
                        <h4 className="completed-subject-name">{subject.name}</h4>
                        <div className="completed-topics-list">
                          {completedTopics.map((topic) => (
                            <div key={topic.id} className="done-topic-item">
                              <CheckCircle
                                size={14}
                                className="done-topic-check"
                              />
                              <span className="done-topic-text">{topic.title}</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  className="done-topic-undo-btn"
                                  onClick={() => handleUntoggleTopic(subject.id, topic)}
                                  title="Uncheck topic"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted, #666)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '4px'
                                  }}
                                >
                                  <RotateCcw size={14} />
                                </button>
                                <button
                                  className="done-topic-delete-btn"
                                  onClick={() => requestDeleteTopic(subject.id, topic)}
                                  title="Delete topic"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="done-topics-modal-footer">
              <span className="done-topics-count">
                {totalCompletedTopics} topic{totalCompletedTopics !== 1 ? 's' : ''}
                {' '}completed
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

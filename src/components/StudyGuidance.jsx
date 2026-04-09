import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { fetchSubjects, fetchSettings, saveSetting } from '../utils/api';

const LOW_ENERGY_MESSAGES = [
  "Low energy? Do your light subject or just 5 minutes.",
  "Showing up is enough.",
  "Even a small step forward counts.",
];

export default function StudyGuidance({ currentPhase, onPhaseChange }) {
  const [showTip, setShowTip] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [focusMainIds, setFocusMainIds] = useState([]); // string[]
  const [focusLightIds, setFocusLightIds] = useState([]); // string[]
  const [dragOver, setDragOver] = useState(null); // 'main' | 'light' | 'pool' | null

  const randomTip = useMemo(() => {
    return LOW_ENERGY_MESSAGES[Math.floor(Math.random() * LOW_ENERGY_MESSAGES.length)];
  }, []);

  const load = useCallback(async () => {
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
    } catch (err) {
      console.error('Failed to load focus subjects:', err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onSubjectsUpdated = () => {
      load();
    };
    window.addEventListener('subjectsUpdated', onSubjectsUpdated);
    return () => window.removeEventListener('subjectsUpdated', onSubjectsUpdated);
  }, [load]);

  const focusMain = subjects.filter((s) => focusMainIds.includes(String(s.id)));
  const focusLight = subjects.filter((s) => focusLightIds.includes(String(s.id)));

  const poolSubjects = subjects.filter((s) => {
    const idStr = String(s.id);
    return !focusMainIds.includes(idStr) && !focusLightIds.includes(idStr);
  });

  const saveFocusLists = async (nextMainIds, nextLightIds) => {
    await Promise.all([
      saveSetting('focus_main_subject_ids', JSON.stringify(nextMainIds)),
      saveSetting('focus_light_subject_ids', JSON.stringify(nextLightIds)),
    ]);
  };

  const handleDragStart = (e, subject) => {
    e.dataTransfer.setData('text/plain', String(subject.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, type) => {
    e.preventDefault();
    const subjectId = e.dataTransfer.getData('text/plain');
    if (!subjectId) return;

    try {
      const idStr = String(subjectId);
      let nextMain = focusMainIds.filter((x) => x !== idStr);
      let nextLight = focusLightIds.filter((x) => x !== idStr);

      if (type === 'main') nextMain = [...nextMain, idStr];
      if (type === 'light') nextLight = [...nextLight, idStr];
      // type === 'pool' => unassign (already removed)

      setFocusMainIds(nextMain);
      setFocusLightIds(nextLight);
      await saveFocusLists(nextMain, nextLight);
      window.dispatchEvent(new CustomEvent('focusSubjectsUpdated', { detail: { mainIds: nextMain, lightIds: nextLight } }));
    } catch (err) {
      console.error('Failed to set focus subject:', err);
    } finally {
      setDragOver(null);
    }
  };

  return (
    <div className="study-guidance">
      <h3>Focus Topic</h3>

      <div
        className={`subject-row main-subject focus-drop-zone ${dragOver === 'main' ? 'is-drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver('main');
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, 'main')}
      >
        <span className="subject-type">Main</span>
        <div className="focus-drop-zone-content">
          {focusMain.length === 0 ? (
            <span className="subject-name">Drop subject(s) here</span>
          ) : (
            <div className="focus-picked-list">
              {focusMain.map((s) => (
                <div
                  key={s.id}
                  className="focus-picked-pill is-main"
                  draggable
                  onDragStart={(e) => handleDragStart(e, s)}
                  title="Drag to move"
                >
                  <GripVertical size={14} className="focus-subject-pill-grip" />
                  <span className="focus-subject-pill-name">{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="subject-desc">Your primary focus (aim 70–80% of time).</div>

      <div
        className={`subject-row light-subject focus-drop-zone ${dragOver === 'light' ? 'is-drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver('light');
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, 'light')}
      >
        <span className="subject-type">Light</span>
        <div className="focus-drop-zone-content">
          {focusLight.length === 0 ? (
            <span className="subject-name">Drop subject(s) here</span>
          ) : (
            <div className="focus-picked-list">
              {focusLight.map((s) => (
                <div
                  key={s.id}
                  className="focus-picked-pill is-light"
                  draggable
                  onDragStart={(e) => handleDragStart(e, s)}
                  title="Drag to move"
                >
                  <GripVertical size={14} className="focus-subject-pill-grip" />
                  <span className="focus-subject-pill-name">{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="subject-desc">Low-energy option (still counts).</div>

      <div className="guidance-tips">
        <p className="guidance-tip">Focus more time on Main subject (70–80%)</p>
        <p className="guidance-tip">Use Light subject for low-energy days</p>
      </div>

      <div className="focus-subjects-pool">
        <div className="focus-subjects-pool-header">All subjects</div>
        <div
          className={`focus-subjects-pool-list ${dragOver === 'pool' ? 'is-drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver('pool');
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleDrop(e, 'pool')}
        >
          {poolSubjects.length === 0 ? (
            <div className="focus-subjects-empty">Add subjects to enable focus dragging.</div>
          ) : (
            poolSubjects.map((s) => (
              <div
                key={s.id}
                className="focus-subject-pill"
                draggable
                onDragStart={(e) => handleDragStart(e, s)}
                title="Drag to Main or Light"
              >
                <GripVertical size={14} className="focus-subject-pill-grip" />
                <span className="focus-subject-pill-name">{s.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        className="low-energy-toggle"
        onClick={() => setShowTip(!showTip)}
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        {showTip ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Low energy?
      </button>

      {showTip && <p className="low-energy-message">{randomTip}</p>}
    </div>
  );
}

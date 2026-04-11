import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './utils/supabase';
import AuthPage from './components/AuthPage';
import Header from './components/Header';
import Footer from './components/Footer';
import Calendar from './components/Calendar';
import DailyEntryModal from './components/DailyEntryModal';
import SessionStartModal from './components/SessionStartModal';
import StudySession from './components/StudySession';
import MiniTimer from './components/MiniTimer';
import TaskPanel from './components/TaskPanel';
import SubjectsPanel from './components/SubjectsPanel';
import WeeklySuccess from './components/WeeklySuccess';
import StudyGuidance from './components/StudyGuidance';
import YouTubeWidget from './components/YouTubeWidget';
import BibleVerse from './components/BibleVerse';
import Chatbot from './components/Chatbot';
import CountdownWidget from './components/CountdownWidget';
import TotalTimeWidget from './components/TotalTimeWidget';
import { fetchEntries, fetchEntryByDate, saveEntry, fetchTasks, saveTasks, exportData, importData, fetchSettings, saveSetting, carryoverTasks, fetchCountdowns } from './utils/api';
import { loadTimerState, clearTimerState } from './utils/timerStorage';

import { Flame, Trophy, Sprout, Sun } from 'lucide-react';
import { sileo, Toaster } from 'sileo';

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const TOAST_MESSAGES = {
  peak_focus: { text: "Amazing discipline!", icon: <Flame size={16} /> },
  great_progress: { text: "Great progress today", icon: <Trophy size={16} /> },
  getting_started: { text: "You started — that matters", icon: <Sprout size={16} /> },
  reset_day: { text: "Tomorrow is another chance", icon: <Sun size={16} /> },
};

function App() {
  // ── Auth state ──
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // ── Show auth page or loading ──
  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  // ── Authenticated app below ──
  return <Dashboard session={session} onLogout={handleLogout} />;
}

function Dashboard({ session, onLogout }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState({});
  const [tasks, setTasks] = useState([]);
  const [countdowns, setCountdowns] = useState([]);
  const [justSavedDate, setJustSavedDate] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('1');
  const importInputRef = useRef(null);
  const taskSaveTimerRef = useRef(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Flow state
  const [showSessionStart, setShowSessionStart] = useState(null);   // date string or null
  const [activeSession, setActiveSession] = useState(null);          // { date, entry } or null
  const [showFullTimer, setShowFullTimer] = useState(false);         // full-screen timer overlay
  const [postSession, setPostSession] = useState(null);              // { date, entry, status, totalTime } or null
  const [viewEntry, setViewEntry] = useState(null);                  // { date, entry } for past dates (read-only)

  // Load all entries
  const loadEntries = useCallback(async () => {
    try {
      const data = await fetchEntries();
      const map = {};
      data.forEach((e) => { map[e.date] = e; });
      setEntries(map);
    } catch (err) {
      console.error('Failed to load entries:', err);
    }
  }, []);

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, []);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchSettings();
      if (data.current_phase) setCurrentPhase(data.current_phase);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  const loadCountdowns = useCallback(async () => {
    try {
      const data = await fetchCountdowns();
      setCountdowns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load countdowns:', err);
    }
  }, []);

  // Run carryover on load, then load tasks
  const runAndLoadTasks = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadEntries();
    runAndLoadTasks();
    loadSettings();
    loadCountdowns();
  }, [loadEntries, runAndLoadTasks, loadSettings, loadCountdowns]);

  // Check for active session on load (persistence across reloads)
  useEffect(() => {
    const checkActiveSession = async () => {
      const todayStr = getTodayStr();

      // 1) Check sessionStorage first (instant, no network needed)
      const stored = loadTimerState();
      if (stored && stored.date === todayStr) {
        // Timer exists in sessionStorage — show mini timer immediately
        let entry = null;
        try {
          entry = await fetchEntryByDate(todayStr);
        } catch {
          // Server might be slow, that's OK — timer state is in sessionStorage
        }
        setActiveSession({ date: todayStr, entry });
        setShowFullTimer(false);
        return;
      }

      // 2) Fall back to server check
      try {
        const entry = await fetchEntryByDate(todayStr);
        if (entry && (entry.is_running || (entry.total_time_seconds > 0 && entry.status === 'reset_day'))) {
          setActiveSession({ date: todayStr, entry });
          setShowFullTimer(false);
        }
      } catch {
        // No entry for today yet, that's fine
      }
    };
    checkActiveSession();
  }, []);

  // Phase change
  const handlePhaseChange = async (newPhase) => {
    setCurrentPhase(String(newPhase));
    try {
      await saveSetting('current_phase', String(newPhase));
    } catch (err) {
      console.error('Failed to save phase:', err);
    }
  };

  // Navigate months
  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Day click — different behavior for today vs past dates
  const handleDayClick = async (date) => {
    const todayStr = getTodayStr();

    if (date === todayStr) {
      // Calculate current task counts
      const todayTasks = tasks.filter(t => t.type === 'today' && t.content);
      const completedCount = todayTasks.filter(t => t.completed).length;
      const incompleteCount = todayTasks.filter(t => !t.completed).length;

      // If there's already an active mini timer, go to full-screen
      if (activeSession) {
        const entry = await fetchEntryByDate(date).catch(() => activeSession.entry);
        setActiveSession({ 
          date, 
          entry: entry ? { ...entry, completed_tasks: completedCount, incomplete_tasks: incompleteCount } : null 
        });
        setShowFullTimer(true);
        return;
      }
      // Check if there's an active session in DB
      try {
        const entry = await fetchEntryByDate(date);
        if (entry && (entry.is_running || (entry.total_time_seconds > 0 && entry.status === 'reset_day'))) {
          // Resume — show full-screen timer
          setActiveSession({ date, entry });
          setShowFullTimer(true);
          return;
        }
        if (entry && entry.total_time_seconds > 0 && entry.status !== 'reset_day') {
          // Session completed and journal saved, show in view mode
          setViewEntry({ date, entry });
          return;
        }
      } catch {
        // No entry yet
      }
      // Show session start modal
      setShowSessionStart(date);
    } else {
      // Past/future date: show entry in read-only view mode
      try {
        const entry = await fetchEntryByDate(date);
        setViewEntry({ date, entry });
      } catch {
        setViewEntry({ date, entry: null });
      }
    }
  };

  // Start session
  const handleStartSession = async () => {
    const date = showSessionStart;
    setShowSessionStart(null);
    try {
      const entry = await fetchEntryByDate(date);
      setActiveSession({ date, entry });
    } catch {
      setActiveSession({ date, entry: null });
    }
    setShowFullTimer(true); // New sessions open full-screen
  };

  // End session — show journal (from either full-screen or mini timer)
  const handleEndSession = async (totalTime, status) => {
    // 1) CAPTURE SNAPSHOT IMMEDIATELY (Move this to the top to avoid race conditions)
    const currentTasksSnapshot = tasksRef.current
      .filter(t => t.type === 'today' && t.content)
      .map(t => ({ content: t.content, completed: t.completed }));
    
    const completedCount = currentTasksSnapshot.filter(t => t.completed).length;
    const incompleteCount = currentTasksSnapshot.filter(t => !t.completed).length;
    const tasksJson = JSON.stringify(currentTasksSnapshot);

    const date = activeSession.date;
    setActiveSession(null);
    setShowFullTimer(false);
    clearTimerState(); // Clear sessionStorage

    sileo.success({
      title: "Session Completed",
      description: <span style={{ color: '#d4d4d8' }}>"Thank God for sustaining your focus. I pray He multiplies the knowledge you've gained today. 'Whatever you do, work heartily, as for the Lord.' — Colossians 3:23"</span>,
      position: "top-right"
    });

    // Fetch the latest entry to carry over any existing journal data
    let entry = null;
    try {
      entry = await fetchEntryByDate(date);
    } catch {
      // No entry
    }

    setPostSession({ 
      date, 
      entry: entry ? { ...entry, completed_tasks: completedCount, incomplete_tasks: incompleteCount, tasks_json: tasksJson } : { completed_tasks: completedCount, incomplete_tasks: incompleteCount, tasks_json: tasksJson }, 
      status, 
      totalTime 
    });
  };

  // Minimize: go from full-screen timer back to home page with mini timer
  const handleMinimize = async () => {
    // Re-fetch entry to get latest persisted time
    try {
      const entry = await fetchEntryByDate(activeSession.date);
      setActiveSession({ date: activeSession.date, entry });
    } catch {
      // Keep current entry
    }
    setShowFullTimer(false);
  };

  // Expand: go from mini timer to full-screen timer
  const handleExpand = () => {
    // Show full-screen timer immediately — StudySession reads from sessionStorage
    setShowFullTimer(true);
  };

  // Save entry (post-session journal save)
  const handleSaveEntry = async (entryData) => {
    try {
      const tasksJson =
        typeof entryData?.tasks_json === 'string'
          ? entryData.tasks_json
          : JSON.stringify(
              tasksRef.current
                .filter((t) => t.type === 'today' && t.content)
                .map((t) => ({ content: t.content, completed: t.completed }))
            );

      let parsedTasksForCounts = [];
      try {
        parsedTasksForCounts = JSON.parse(tasksJson);
      } catch {
        parsedTasksForCounts = [];
      }
      const completedTasks = Array.isArray(parsedTasksForCounts)
        ? parsedTasksForCounts.filter((t) => t?.completed).length
        : 0;
      const incompleteTasks = Array.isArray(parsedTasksForCounts)
        ? parsedTasksForCounts.filter((t) => t && !t.completed).length
        : 0;

      await saveEntry({
        ...entryData,
        tasks_json: tasksJson,
        completed_tasks: entryData?.completed_tasks ?? completedTasks,
        incomplete_tasks: entryData?.incomplete_tasks ?? incompleteTasks,
      });
      
      // Clear today's tasks after successful save
      const remainingTasks = tasksRef.current.filter((t) => t.type !== 'today');
      setTasks(remainingTasks);
      
      // Persist the cleared state to backend
      const tasksToSave = remainingTasks
        .filter((t) => t.content || t.completed)
        .map((t) => ({ type: t.type, content: t.content, completed: t.completed ? 1 : 0 }));
      await saveTasks(tasksToSave);

      setPostSession(null);
      setViewEntry(null);
      setJustSavedDate(entryData.date);
      setTimeout(() => setJustSavedDate(null), 600);
      await loadEntries();
      await loadTasks();
      showToastMessage(getToastMessage(entryData.status));
    } catch (err) {
      console.error('Failed to save entry:', err);
    }
  };

  // Task updates with auto-save debounce
  const handleUpdateTask = (updatedTask) => {
    setTasks((prev) => {
      let found = false;
      const updated = prev.map((t) => {
        if (t.id === updatedTask.id) { 
          found = true; 
          return updatedTask; 
        }
        return t;
      });
      if (!found) {
        if (!updatedTask.content && !updatedTask.isNew) return prev;
        updated.push({ ...updatedTask, id: updatedTask.id || `temp-${Date.now()}` });
      }
      return updated;
    });

    if (taskSaveTimerRef.current) clearTimeout(taskSaveTimerRef.current);
    taskSaveTimerRef.current = setTimeout(async () => {
      try {
        const latestTasks = tasksRef.current;
        const tasksToSave = latestTasks
          .filter((t) => t.content || t.completed)
          .map((t) => ({ type: t.type, content: t.content, completed: t.completed ? 1 : 0 }));
        await saveTasks(tasksToSave);
        await loadTasks();
      } catch (err) {
        console.error('Failed to save tasks:', err);
      }
    }, 5000);
  };

  const handleDeleteTask = (taskId) => {
    setTasks((prev) => prev.filter(t => t.id !== taskId));
    
    if (taskSaveTimerRef.current) clearTimeout(taskSaveTimerRef.current);
    taskSaveTimerRef.current = setTimeout(async () => {
      try {
        const latestTasks = tasksRef.current;
        const tasksToSave = latestTasks
          .filter((t) => t.content || t.completed)
          .map((t) => ({ type: t.type, content: t.content, completed: t.completed ? 1 : 0 }));
        await saveTasks(tasksToSave);
        await loadTasks();
      } catch (err) {
        console.error('Failed to save tasks after deletion:', err);
      }
    }, 1000);
  };

  const handleDeleteTaskList = (type) => {
    setTasks((prev) => prev.filter((t) => t.type !== type));

    if (taskSaveTimerRef.current) clearTimeout(taskSaveTimerRef.current);
    taskSaveTimerRef.current = setTimeout(async () => {
      try {
        const latestTasks = tasksRef.current;
        const tasksToSave = latestTasks
          .filter((t) => t.content || t.completed)
          .map((t) => ({ type: t.type, content: t.content, completed: t.completed ? 1 : 0 }));
        await saveTasks(tasksToSave);
        await loadTasks();
      } catch (err) {
        console.error('Failed to save tasks after list deletion:', err);
      }
    }, 1000);
  };

  // Toast
  const showToastMessage = (message) => {
    const text = typeof message === 'object' && message.text ? message.text : message;
    sileo.success({
      title: "Success",
      description: <span style={{ color: '#d4d4d8' }}>{text}</span>
    });
  };

  const getToastMessage = (status) => {
    return TOAST_MESSAGES[status] || { text: "Saved ✓", icon: null };
  };

  // Export
  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cpa-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToastMessage("Data exported ✓");
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Import
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      await loadEntries();
      await loadTasks();
      showToastMessage("Data imported ✓");
    } catch (err) {
      console.error('Import failed:', err);
    }
    if (importInputRef.current) importInputRef.current.value = '';
  };

  // Determine if there's an active session for calendar pulsing
  const activeSessionDate = activeSession ? activeSession.date : null;

  return (
    <>
      <Toaster position="top-center" theme="dark" options={{ fill: '#0e0e0e' }} />
      <Header user={session.user} onLogout={onLogout} />
      <div className="app-layout">
        {/* Mini Timer on home page when session is active but not in full-screen */}
        {activeSession && !showFullTimer && !postSession && (
          <MiniTimer
            key={activeSession.date + '-mini'}
            date={activeSession.date}
            entry={activeSession.entry}
            onEnd={handleEndSession}
            onExpand={handleExpand}
          />
        )}

        <BibleVerse />

        <div className="main-content">
          <div className="countdown-column">
            <CountdownWidget onChanged={loadCountdowns} />
          </div>

          <div className="center-column">
            <Calendar
              year={year}
              month={month}
              entries={entries}
              countdowns={countdowns}
              onDayClick={handleDayClick}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
              justSavedDate={justSavedDate}
              activeSessionDate={activeSessionDate}
            />
            <SubjectsPanel />
            <YouTubeWidget />
          </div>

          <div className="sidebar">
            <TotalTimeWidget entries={entries} />
            <StudyGuidance currentPhase={currentPhase} onPhaseChange={handlePhaseChange} />
            <WeeklySuccess entries={entries} />
            <TaskPanel 
              tasks={tasks} 
              onUpdateTask={handleUpdateTask} 
              onDeleteTask={handleDeleteTask}
              onDeleteTaskList={handleDeleteTaskList}
            />
          </div>
        </div>

        <Footer />
        
      </div>

      {/* Session Start Confirmation Modal */}
      {showSessionStart && (
        <SessionStartModal
          date={showSessionStart}
          onStart={handleStartSession}
          onClose={() => setShowSessionStart(null)}
        />
      )}

      {/* Active Study Session — Full-screen overlay */}
      {activeSession && showFullTimer && (
        <StudySession
          key={activeSession.date + '-full'}
          date={activeSession.date}
          existingEntry={activeSession.entry}
          onEndSession={handleEndSession}
          onMinimize={handleMinimize}
          tasks={tasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
            onDeleteTaskList={handleDeleteTaskList}
        />
      )}

      {/* Post-Session Journal (after ending session) */}
      {postSession && (
        <DailyEntryModal
          date={postSession.date}
          existingEntry={postSession.entry}
          computedStatus={postSession.status}
          computedTime={postSession.totalTime}
          isPostSession={true}
          onSave={handleSaveEntry}
          onClose={() => setPostSession(null)}
        />
      )}

      {/* View/edit past entry */}
      {viewEntry && (
        <DailyEntryModal
          date={viewEntry.date}
          existingEntry={viewEntry.entry}
          readOnly={!viewEntry.entry}
          onSave={handleSaveEntry}
          onClose={() => setViewEntry(null)}
        />
      )}

      {/* CPALE Study Chatbot */}
      <Chatbot />
    </>
  );
}

export default App;

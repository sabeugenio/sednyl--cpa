import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Calendar from './components/Calendar';
import DailyEntryModal from './components/DailyEntryModal';
import TaskPanel from './components/TaskPanel';
import WeeklySuccess from './components/WeeklySuccess';
import StudyGuidance from './components/StudyGuidance';
import { fetchEntries, fetchEntryByDate, saveEntry, fetchTasks, saveTasks, exportData, importData, fetchSettings, saveSetting } from './utils/api';

function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState({});
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [toast, setToast] = useState(null);
  const [justSavedDate, setJustSavedDate] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('1');
  const importInputRef = useRef(null);
  const taskSaveTimerRef = useRef(null);

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

  useEffect(() => {
    loadEntries();
    loadTasks();
    loadSettings();
  }, [loadEntries, loadTasks, loadSettings]);

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

  // Day click
  const handleDayClick = async (date) => {
    setSelectedDate(date);
    try {
      const entry = await fetchEntryByDate(date);
      setSelectedEntry(entry);
    } catch {
      setSelectedEntry(null);
    }
  };

  // Save entry
  const handleSaveEntry = async (entryData) => {
    try {
      await saveEntry(entryData);
      setSelectedDate(null);
      setSelectedEntry(null);
      setJustSavedDate(entryData.date);
      setTimeout(() => setJustSavedDate(null), 600);
      await loadEntries();
      showToast(getToastMessage(entryData.status));
    } catch (err) {
      console.error('Failed to save entry:', err);
    }
  };

  // Task updates with auto-save debounce
  const handleUpdateTask = (updatedTask) => {
    setTasks((prev) => {
      let found = false;
      const updated = prev.map((t) => {
        if (t.id === updatedTask.id) { found = true; return updatedTask; }
        return t;
      });
      if (!found) {
        updated.push({ ...updatedTask, id: undefined });
      }
      return updated;
    });

    // Debounce save
    if (taskSaveTimerRef.current) clearTimeout(taskSaveTimerRef.current);
    taskSaveTimerRef.current = setTimeout(async () => {
      try {
        const currentTasks = tasks.map((t) =>
          t.id === updatedTask.id ? updatedTask : t
        );
        // Filter out completely empty tasks
        const tasksToSave = currentTasks
          .filter((t) => t.content || t.completed)
          .map((t) => ({ type: t.type, content: t.content, completed: t.completed ? 1 : 0 }));
        // Include the updated task if it's new
        if (!currentTasks.find((t) => t.id === updatedTask.id)) {
          if (updatedTask.content || updatedTask.completed) {
            tasksToSave.push({ type: updatedTask.type, content: updatedTask.content, completed: updatedTask.completed ? 1 : 0 });
          }
        }
        await saveTasks(tasksToSave);
        await loadTasks();
      } catch (err) {
        console.error('Failed to save tasks:', err);
      }
    }, 800);
  };

  // Toast
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const getToastMessage = (status) => {
    const messages = {
      strong: "Amazing deep work! 🌟",
      showed_up: "You showed up today ✨",
      bare_minimum: "That counts 💙",
      missed: "Tomorrow is fresh 🌱",
    };
    return messages[status] || "Saved ✓";
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
      showToast("Data exported ✓");
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
      showToast("Data imported ✓");
    } catch (err) {
      console.error('Import failed:', err);
    }
    if (importInputRef.current) importInputRef.current.value = '';
  };

  return (
    <>
      <Header />
      <div className="app-layout">
        <div className="main-content">
          <Calendar
            year={year}
            month={month}
            entries={entries}
            onDayClick={handleDayClick}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
            justSavedDate={justSavedDate}
          />

          <div className="sidebar">
            <StudyGuidance currentPhase={currentPhase} onPhaseChange={handlePhaseChange} />
            <WeeklySuccess entries={entries} />
            <TaskPanel tasks={tasks} onUpdateTask={handleUpdateTask} />

            <div className="data-actions">
              <button className="data-btn" onClick={handleExport}>
                📥 Export Data
              </button>
              <button className="data-btn" onClick={() => importInputRef.current?.click()}>
                📤 Import Data
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <DailyEntryModal
          date={selectedDate}
          existingEntry={selectedEntry}
          onSave={handleSaveEntry}
          onClose={() => { setSelectedDate(null); setSelectedEntry(null); }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

export default App;

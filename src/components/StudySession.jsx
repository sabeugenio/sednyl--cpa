import React, { useState, useEffect, useRef, useCallback } from 'react';
import { updateSession } from '../utils/api';
import { saveTimerState, loadTimerState, clearTimerState } from '../utils/timerStorage';

const STATUS_CONFIG = {
  peak_focus:      { emoji: '🔥', label: 'Peak Focus',      message: 'You showed serious discipline today. This is CPA-level consistency.' },
  great_progress:  { emoji: '💪', label: 'Great Progress',  message: "You showed up and pushed forward. That's how passers are made." },
  getting_started: { emoji: '🌱', label: 'Getting Started', message: 'You started—and that matters. Small steps still move you forward.' },
  reset_day:       { emoji: '🌼', label: 'Reset Day',       message: 'Rest is part of the process. Tomorrow is another chance to show up.' },
};

function computeStatus(totalSeconds) {
  if (totalSeconds > 21600) return 'peak_focus';
  if (totalSeconds >= 7200) return 'great_progress';
  if (totalSeconds > 0) return 'getting_started';
  return 'reset_day';
}

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function StudySession({ date, existingEntry, onEndSession, onMinimize }) {
  const [totalTime, setTotalTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const lastStartTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const savedTimeRef = useRef(0);
  const initDoneRef = useRef(false);

  // Initialize: sessionStorage first, then existingEntry
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    // 1) Check sessionStorage (survives reload, most recent)
    const stored = loadTimerState();
    if (stored && stored.date === date) {
      savedTimeRef.current = stored.baseSeconds;

      if (stored.running && stored.startTs) {
        const now = Date.now();
        const elapsed = Math.floor((now - stored.startTs) / 1000);
        const total = stored.baseSeconds + elapsed;
        savedTimeRef.current = total;
        setTotalTime(total);
        setIsRunning(true);
        setHasStarted(true);
        lastStartTimeRef.current = now;
        // Re-checkpoint with updated base
        saveTimerState(date, total, now, true);
        // Sync to server
        updateSession(date, {
          total_time_seconds: total,
          is_running: true,
          last_start_time: new Date(now).toISOString(),
        }).catch(() => {});
      } else {
        setTotalTime(stored.baseSeconds);
        if (stored.baseSeconds > 0) setHasStarted(true);
      }
      return;
    }

    // 2) Fall back to server entry
    if (existingEntry) {
      const baseTime = existingEntry.total_time_seconds || 0;
      savedTimeRef.current = baseTime;

      if (existingEntry.is_running && existingEntry.last_start_time) {
        const lastStart = new Date(existingEntry.last_start_time).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - lastStart) / 1000);
        const newTotal = baseTime + elapsed;
        savedTimeRef.current = newTotal;
        setTotalTime(newTotal);
        setIsRunning(true);
        setHasStarted(true);
        lastStartTimeRef.current = now;
        saveTimerState(date, newTotal, now, true);
        updateSession(date, {
          total_time_seconds: newTotal,
          is_running: true,
          last_start_time: new Date(now).toISOString(),
        }).catch(() => {});
      } else {
        setTotalTime(baseTime);
        if (baseTime > 0) {
          setHasStarted(true);
          saveTimerState(date, baseTime, null, false);
        }
      }
    }
  }, [existingEntry, date]);

  // Tick the timer
  useEffect(() => {
    if (isRunning) {
      if (!lastStartTimeRef.current) {
        lastStartTimeRef.current = Date.now();
      }
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastStartTimeRef.current) / 1000);
        setTotalTime(savedTimeRef.current + elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Auto-save every 30 seconds (checkpoint sessionStorage + server)
  useEffect(() => {
    if (!isRunning) return;
    const autoSaveInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastStartTimeRef.current) / 1000);
      const currentTotal = savedTimeRef.current + elapsed;
      savedTimeRef.current = currentTotal;
      lastStartTimeRef.current = now;
      // Checkpoint to sessionStorage
      saveTimerState(date, currentTotal, now, true);
      // Checkpoint to server
      updateSession(date, {
        total_time_seconds: currentTotal,
        is_running: true,
        last_start_time: new Date(now).toISOString(),
      }).catch(() => {});
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [isRunning, date]);

  // Save to sessionStorage on page unload (synchronous, reliable)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isRunning || !lastStartTimeRef.current) return;
      const now = Date.now();
      const elapsed = Math.floor((now - lastStartTimeRef.current) / 1000);
      const currentTotal = savedTimeRef.current + elapsed;
      // SessionStorage save is synchronous — guaranteed before unload
      saveTimerState(date, currentTotal, now, true);
      // Also try server save via sendBeacon
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const url = `${API_URL}/entries/${date}/session`;
      const body = JSON.stringify({
        total_time_seconds: currentTotal,
        is_running: true,
        last_start_time: new Date(now).toISOString(),
      });
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, date]);

  const persistSession = useCallback(async (time, running) => {
    try {
      await updateSession(date, {
        total_time_seconds: time,
        is_running: running,
        last_start_time: running ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error('Failed to persist session:', err);
    }
  }, [date]);

  const handleStart = () => {
    const now = Date.now();
    lastStartTimeRef.current = now;
    setIsRunning(true);
    setHasStarted(true);
    saveTimerState(date, savedTimeRef.current, now, true);
    persistSession(savedTimeRef.current, true);
  };

  const handlePause = () => {
    const now = Date.now();
    const elapsed = Math.floor((now - lastStartTimeRef.current) / 1000);
    const newTotal = savedTimeRef.current + elapsed;
    savedTimeRef.current = newTotal;
    setTotalTime(newTotal);
    setIsRunning(false);
    lastStartTimeRef.current = null;
    saveTimerState(date, newTotal, null, false);
    persistSession(newTotal, false);
  };

  const handleResume = () => {
    const now = Date.now();
    lastStartTimeRef.current = now;
    setIsRunning(true);
    saveTimerState(date, savedTimeRef.current, now, true);
    persistSession(savedTimeRef.current, true);
  };

  const handleEndSession = () => {
    let finalTime = savedTimeRef.current;
    if (isRunning && lastStartTimeRef.current) {
      const elapsed = Math.floor((Date.now() - lastStartTimeRef.current) / 1000);
      finalTime = savedTimeRef.current + elapsed;
    }

    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    clearTimerState();

    const status = computeStatus(finalTime);
    onEndSession(finalTime, status);
  };

  const handleMinimize = async () => {
    let currentTime = savedTimeRef.current;
    if (isRunning && lastStartTimeRef.current) {
      const elapsed = Math.floor((Date.now() - lastStartTimeRef.current) / 1000);
      currentTime = savedTimeRef.current + elapsed;
    }
    saveTimerState(date, currentTime, isRunning ? Date.now() : null, isRunning);
    await persistSession(currentTime, isRunning);
    onMinimize();
  };

  const currentStatus = computeStatus(totalTime);
  const statusInfo = STATUS_CONFIG[currentStatus];

  return (
    <div className="study-session-overlay">
      <div className="study-session-container">
        <div className="session-header-info">
          <span className="session-date-label">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <div className={`session-status-badge status-${currentStatus}`}>
            {statusInfo.emoji} {statusInfo.label}
          </div>
        </div>

        <div className="timer-display">
          <div className={`timer-digits ${isRunning ? 'running' : ''}`}>
            {formatTime(totalTime)}
          </div>
          {isRunning && <div className="timer-pulse" />}
        </div>

        <div className="session-controls">
          {!hasStarted && (
            <button className="session-btn btn-start" onClick={handleStart}>
              <span className="btn-icon">▶</span> Start
            </button>
          )}

          {hasStarted && isRunning && (
            <button className="session-btn btn-pause" onClick={handlePause}>
              <span className="btn-icon">⏸</span> Pause
            </button>
          )}

          {hasStarted && !isRunning && (
            <button className="session-btn btn-resume" onClick={handleResume}>
              <span className="btn-icon">🔁</span> Resume
            </button>
          )}

          {hasStarted && (
            <button
              className="session-btn btn-end"
              onClick={() => setShowEndConfirm(true)}
            >
              <span className="btn-icon">⏹</span> End Session
            </button>
          )}

          {hasStarted && onMinimize && (
            <button className="session-btn btn-minimize" onClick={handleMinimize}>
              <span className="btn-icon">↩</span> Back to Home
            </button>
          )}
        </div>

        {/* End Session Confirmation */}
        {showEndConfirm && (
          <div className="end-confirm-card">
            <p>End your study session?</p>
            <p className="end-confirm-time">Total: {formatTime(totalTime)}</p>
            <div className="end-confirm-actions">
              <button className="btn-confirm-end" onClick={handleEndSession}>
                Yes, End Session
              </button>
              <button className="btn-cancel-end" onClick={() => setShowEndConfirm(false)}>
                Keep Going
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

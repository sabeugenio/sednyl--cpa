import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Maximize2, Flame, Trophy, Sprout, Sun } from 'lucide-react';
import { updateSession } from '../utils/api';
import { saveTimerState, loadTimerState, clearTimerState } from '../utils/timerStorage';

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function computeStatus(totalSeconds) {
  if (totalSeconds > 21600) return 'peak_focus';
  if (totalSeconds >= 7200) return 'great_progress';
  if (totalSeconds > 0) return 'getting_started';
  return 'reset_day';
}

const STATUS_LABELS = {
  peak_focus:      { icon: <Flame size={16} />, label: 'Peak Focus' },
  great_progress:  { icon: <Trophy size={16} />, label: 'Great Progress' },
  getting_started: { icon: <Sprout size={16} />, label: 'Getting Started' },
  reset_day:       { icon: <Sun size={16} />, label: 'Reset Day' },
};

export default function MiniTimer({ date, entry, onEnd, onExpand }) {
  const [totalTime, setTotalTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const savedTimeRef = useRef(0);
  const lastStartRef = useRef(null);
  const intervalRef = useRef(null);
  const initDoneRef = useRef(false);

  // Initialize: sessionStorage first, then entry prop
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    // 1) Check sessionStorage (most recent, survives reload)
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
        lastStartRef.current = now;
        saveTimerState(date, total, now, true);
      } else {
        setTotalTime(stored.baseSeconds);
      }
      return;
    }

    // 2) Fall back to server entry
    if (!entry) return;
    const base = entry.total_time_seconds || 0;
    savedTimeRef.current = base;

    if (entry.is_running && entry.last_start_time) {
      const lastStart = new Date(entry.last_start_time).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - lastStart) / 1000);
      const newTotal = base + elapsed;
      savedTimeRef.current = newTotal;
      setTotalTime(newTotal);
      setIsRunning(true);
      lastStartRef.current = now;
      saveTimerState(date, newTotal, now, true);
    } else {
      setTotalTime(base);
      if (base > 0) saveTimerState(date, base, null, false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick the timer
  useEffect(() => {
    if (isRunning) {
      if (!lastStartRef.current) lastStartRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - lastStartRef.current) / 1000);
        setTotalTime(savedTimeRef.current + elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!isRunning) return;
    const autoSave = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastStartRef.current) / 1000);
      const current = savedTimeRef.current + elapsed;
      savedTimeRef.current = current;
      lastStartRef.current = now;
      saveTimerState(date, current, now, true);
      updateSession(date, {
        total_time_seconds: current,
        is_running: true,
        last_start_time: new Date(now).toISOString(),
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(autoSave);
  }, [isRunning, date]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isRunning || !lastStartRef.current) return;
      const now = Date.now();
      const elapsed = Math.floor((now - lastStartRef.current) / 1000);
      const currentTotal = savedTimeRef.current + elapsed;
      saveTimerState(date, currentTotal, now, true);
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

  const handlePause = async () => {
    const now = Date.now();
    const elapsed = Math.floor((now - lastStartRef.current) / 1000);
    const newTotal = savedTimeRef.current + elapsed;
    savedTimeRef.current = newTotal;
    setTotalTime(newTotal);
    setIsRunning(false);
    lastStartRef.current = null;
    saveTimerState(date, newTotal, null, false);
    await updateSession(date, { total_time_seconds: newTotal, is_running: false, last_start_time: null });
  };

  const handleResume = async () => {
    const now = Date.now();
    lastStartRef.current = now;
    setIsRunning(true);
    saveTimerState(date, savedTimeRef.current, now, true);
    await updateSession(date, {
      total_time_seconds: savedTimeRef.current,
      is_running: true,
      last_start_time: new Date(now).toISOString(),
    });
  };

  const handleEnd = () => {
    let finalTime = savedTimeRef.current;
    if (isRunning && lastStartRef.current) {
      const elapsed = Math.floor((Date.now() - lastStartRef.current) / 1000);
      finalTime = savedTimeRef.current + elapsed;
    }
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    clearTimerState();
    const status = computeStatus(finalTime);
    onEnd(finalTime, status);
  };

  const handleExpand = () => {
    // Save current state to sessionStorage (synchronous, instant)
    let currentTime = savedTimeRef.current;
    if (isRunning && lastStartRef.current) {
      const elapsed = Math.floor((Date.now() - lastStartRef.current) / 1000);
      currentTime = savedTimeRef.current + elapsed;
    }
    saveTimerState(date, currentTime, isRunning ? Date.now() : null, isRunning);
    // Server save in background (non-blocking)
    updateSession(date, {
      total_time_seconds: currentTime,
      is_running: isRunning,
      last_start_time: isRunning ? new Date().toISOString() : null,
    }).catch(() => {});
    // Switch to full view immediately
    onExpand();
  };

  const currentStatus = computeStatus(totalTime);
  const statusInfo = STATUS_LABELS[currentStatus];
  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div className={`mini-timer ${isRunning ? 'is-running' : 'is-paused'}`}>
      <div className="mini-timer-left">
        <div className="mini-timer-label">
          {isRunning && <span className="mini-timer-pulse" />}
          <span className="mini-timer-state">{isRunning ? 'Session Active' : 'Session Paused'}</span>
          <span className="mini-timer-date">— {dateLabel}</span>
        </div>
        <div className="mini-timer-time">{formatTime(totalTime)}</div>
        <div className={`mini-timer-status-badge status-${currentStatus}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {statusInfo.icon} {statusInfo.label}
        </div>
      </div>

      <div className="mini-timer-right">
        {!showEndConfirm ? (
          <div className="mini-timer-actions">
            {isRunning ? (
              <button className="mini-timer-btn btn-mini-pause" onClick={handlePause} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Pause size={14} /> Pause
              </button>
            ) : (
              <button className="mini-timer-btn btn-mini-resume" onClick={handleResume} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Play size={14} /> Resume
              </button>
            )}
            <button className="mini-timer-btn btn-mini-end" onClick={() => setShowEndConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Square size={14} /> End
            </button>
            <button className="mini-timer-btn btn-mini-expand" onClick={handleExpand} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Maximize2 size={14} /> Full View
            </button>
          </div>
        ) : (
          <div className="mini-timer-confirm">
            <span className="mini-timer-confirm-text">End session?</span>
            <button className="mini-timer-btn btn-mini-confirm-yes" onClick={handleEnd}>
              Yes, End
            </button>
            <button className="mini-timer-btn btn-mini-confirm-no" onClick={() => setShowEndConfirm(false)}>
              Keep Going
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

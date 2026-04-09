import React, { useMemo } from 'react';
import { normalizeStatus } from '../utils/statusUtils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_EMOJIS = {
  peak_focus: '🔥',
  great_progress: '💪',
  getting_started: '🌱',
  reset_day: '🌼'
};

function getDateOnly(value) {
  if (typeof value !== 'string') return null;
  const d = value.split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function compareDateOnly(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export default function Calendar({ year, month, entries, countdowns = [], onDayClick, onPrev, onNext, justSavedDate, activeSessionDate }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const countdownMarksByDate = useMemo(() => {
    const map = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const colors = new Set();

      for (const c of countdowns || []) {
        const color = (c?.color || 'pink').toLowerCase();
        const start = getDateOnly(c?.start_date || c?.target_date);
        const end = getDateOnly(c?.end_date || c?.target_date);
        if (!start || !end) continue;

        if (compareDateOnly(start, dateStr) <= 0 && compareDateOnly(dateStr, end) <= 0) {
          colors.add(color);
        }
      }

      if (colors.size) map[dateStr] = Array.from(colors);
    }

    return map;
  }, [countdowns, year, month]);

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = [];

    // Empty cells before the first day
    for (let i = 0; i < firstDay; i++) {
      result.push({ type: 'empty', key: `empty-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const entry = entries[dateStr];
      const rawStatus = entry?.status || null;
      let status = normalizeStatus(rawStatus);
      // Don't show "reset day" badge for today by default.
      if (dateStr === todayStr && status === 'reset_day') {
        status = null;
      }
      const countdownColors = countdownMarksByDate[dateStr] || [];

      result.push({
        type: 'day',
        key: dateStr,
        date: dateStr,
        day: d,
        isWeekend,
        isToday: dateStr === todayStr,
        status,
        hasActiveSession: dateStr === activeSessionDate,
        countdownColors,
      });
    }

    return result;
  }, [year, month, entries, todayStr, activeSessionDate, countdownMarksByDate]);

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={onPrev}>← Prev</button>
        <h2>{monthName}</h2>
        <button className="calendar-nav-btn" onClick={onNext}>Next →</button>
      </div>

      <div className="calendar-grid">
        {DAY_NAMES.map((name) => (
          <div key={name} className="calendar-day-name">{name}</div>
        ))}

        {days.map((item) => {
          if (item.type === 'empty') {
            return <div key={item.key} className="calendar-day empty" />;
          }

          const classes = ['calendar-day'];
          if (item.isWeekend) classes.push('weekend');
          if (item.isToday) classes.push('today');
          if (item.status) classes.push(`status-${item.status}`);
          if (item.date === justSavedDate) classes.push('just-saved');
          if (item.hasActiveSession) classes.push('active-session');

          return (
            <div
              key={item.key}
              className={classes.join(' ')}
              onClick={() => onDayClick(item.date)}
              title={item.status || 'Click to log'}
            >
              <span className="day-number">{item.day}</span>
              {item.status && STATUS_EMOJIS[item.status] && (
                <span className="day-status-emoji" aria-hidden="true">
                  {STATUS_EMOJIS[item.status]}
                </span>
              )}
              {item.hasActiveSession && (
                <span className="session-pulse-dot" />
              )}
              {item.countdownColors?.length > 0 && (
                <div className="countdown-mark-stack" aria-hidden="true">
                  {item.countdownColors.slice(0, 4).map((c) => (
                    <span key={c} className={`countdown-mark color-${c}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-emoji" aria-hidden="true">🔥</span>
          <span>Peak Focus</span>
        </div>
        <div className="legend-item">
          <span className="legend-emoji" aria-hidden="true">💪</span>
          <span>Great Progress</span>
        </div>
        <div className="legend-item">
          <span className="legend-emoji" aria-hidden="true">🌱</span>
          <span>Getting Started</span>
        </div>
        <div className="legend-item">
          <span className="legend-emoji" aria-hidden="true">🌼</span>
          <span>Rest Day</span>
        </div>
      </div>
    </div>
  );
}

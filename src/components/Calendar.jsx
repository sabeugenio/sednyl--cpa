import React, { useMemo } from 'react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar({ year, month, entries, onDayClick, onPrev, onNext, justSavedDate }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

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

      result.push({
        type: 'day',
        key: dateStr,
        date: dateStr,
        day: d,
        isWeekend,
        isToday: dateStr === todayStr,
        status: entry?.status || null,
      });
    }

    return result;
  }, [year, month, entries, todayStr]);

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

          return (
            <div
              key={item.key}
              className={classes.join(' ')}
              onClick={() => !item.isWeekend && onDayClick(item.date)}
              title={item.isWeekend ? 'Rest Day' : item.status || 'Click to log'}
            >
              <span className="day-number">{item.day}</span>
              {item.isWeekend && <span className="rest-label">Rest</span>}
              {!item.isWeekend && item.status && (
                <span className={`status-dot ${item.status}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--color-strong)' }} />
          <span>⚡ Strong</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--color-showed-up)' }} />
          <span>✅ Showed Up</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--color-bare-minimum)' }} />
          <span>💤 Bare Minimum</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--color-missed)' }} />
          <span>❌ Missed</span>
        </div>
      </div>
    </div>
  );
}

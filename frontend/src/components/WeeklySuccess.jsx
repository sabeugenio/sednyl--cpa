import React, { useMemo } from 'react';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F'];

const ENCOURAGING_MESSAGES = [
  "You're on track 🌿",
  "Nice consistency ✨",
  "Keep showing up 💙",
  "One more day to hit your goal 🌱",
  "Strong week so far 🌟",
  "You've been showing up 🎯",
];

export default function WeeklySuccess({ entries }) {
  const { weekDays, message, streak } = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    // Find Monday of this week
    const monday = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + diff);

    const weekDays = [];
    let showedUpCount = 0;
    let hasStrong = false;

    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = entries[dateStr];
      const status = entry?.status || null;

      if (status === 'strong') { showedUpCount++; hasStrong = true; }
      else if (status === 'showed_up') { showedUpCount++; }
      else if (status === 'bare_minimum') { showedUpCount++; }

      weekDays.push({ label: DAY_LABELS[i], status, dateStr });
    }

    const isSuccess = showedUpCount >= 3 || hasStrong;
    const remaining = 3 - showedUpCount;

    let message;
    if (isSuccess) {
      message = showedUpCount >= 4 ? "Strong week so far 🌟" : "You're on track 🌿";
    } else if (showedUpCount > 0) {
      message = remaining === 1 ? "One more day to hit your goal 🌱" : `${remaining} more days — you've got this 💙`;
    } else {
      message = "A new week starts fresh 🌱";
    }

    // Calculate streak (consecutive days showed up, not including missed)
    const allDates = Object.keys(entries).sort().reverse();
    let streak = 0;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (const dateStr of allDates) {
      const e = entries[dateStr];
      const d = new Date(dateStr + 'T00:00:00');
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      if (e.status === 'missed') break;
      if (e.status) streak++;
    }

    return { weekDays, message, streak };
  }, [entries]);

  return (
    <div className="weekly-success">
      <h3>This Week</h3>

      <div className="week-dots">
        {weekDays.map((day, i) => {
          let classes = 'week-dot';
          if (day.status === 'strong') classes += ' strong-fill';
          else if (day.status === 'showed_up' || day.status === 'bare_minimum') classes += ' filled';

          return (
            <div key={i} className={classes} title={`${day.label}: ${day.status || 'pending'}`}>
              {day.label}
            </div>
          );
        })}
      </div>

      <p className="weekly-message">{message}</p>

      {streak > 1 && (
        <div className="streak-badge">
          🔥 {streak} day streak
        </div>
      )}
    </div>
  );
}

import React, { useMemo } from 'react';
import { Star, Leaf, Sprout, Heart, Flame } from 'lucide-react';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Normalize legacy status to new status for counting
function isPositiveStatus(status) {
  if (!status) return false;
  // New statuses (anything except reset_day counts as showing up)
  if (['peak_focus', 'great_progress', 'getting_started'].includes(status)) return true;
  // Legacy statuses
  if (['strong', 'showed_up', 'bare_minimum'].includes(status)) return true;
  return false;
}

function isStrongStatus(status) {
  return status === 'peak_focus' || status === 'strong';
}

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

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = entries[dateStr];
      const status = entry?.status || null;

      if (isStrongStatus(status)) { showedUpCount++; hasStrong = true; }
      else if (isPositiveStatus(status)) { showedUpCount++; }

      weekDays.push({ label: DAY_LABELS[i], status, dateStr });
    }

    const isSuccess = showedUpCount >= 5 || hasStrong;
    const remaining = 5 - showedUpCount;

    let message;
    if (isSuccess) {
      message = showedUpCount >= 6 ? (
        <>Strong week so far <Star size={16} fill="var(--primary)" style={{ marginLeft: 4 }} /></>
      ) : (
        <>You're on track <Leaf size={16} color="var(--primary)" style={{ marginLeft: 4 }} /></>
      );
    } else if (showedUpCount > 0) {
      message = remaining === 1 ? (
        <>One more day to hit your goal <Sprout size={16} color="var(--primary)" style={{ marginLeft: 4 }} /></>
      ) : (
        <>{remaining} more days — you've got this <Heart size={16} fill="var(--primary)" style={{ marginLeft: 4 }} /></>
      );
    } else {
      message = <>A new week starts fresh <Sprout size={16} color="var(--primary)" style={{ marginLeft: 4 }} /></>;
    }

    // Calculate streak (consecutive days showed up, not including missed/reset)
    const allDates = Object.keys(entries).sort().reverse();
    let streak = 0;

    for (const dateStr of allDates) {
      const e = entries[dateStr];
      if (!isPositiveStatus(e.status)) break;
      streak++;
    }

    return { weekDays, message, streak };
  }, [entries]);

  return (
    <div className="weekly-success">
      <h3>This Week</h3>

      <div className="week-dots">
        {weekDays.map((day, i) => {
          let classes = 'week-dot';
          if (isStrongStatus(day.status)) classes += ' strong-fill';
          else if (isPositiveStatus(day.status)) classes += ' filled';

          return (
            <div key={i} className={classes} title={`${day.label}: ${day.status || 'pending'}`}>
              {day.label}
            </div>
          );
        })}
      </div>

      <div className="weekly-message" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {message}
      </div>

      {streak > 1 && (
        <div className="streak-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Flame size={16} fill="white" /> {streak} day streak
        </div>
      )}
    </div>
  );
}

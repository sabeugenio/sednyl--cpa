import React from 'react';

export default function TaskPanel({ tasks, onUpdateTask }) {
  const todayTasks = tasks.filter((t) => t.type === 'today');
  const tomorrowTasks = tasks.filter((t) => t.type === 'tomorrow');

  // Ensure we always have 3 today slots and 1 tomorrow slot
  while (todayTasks.length < 3) {
    todayTasks.push({ id: `new-today-${todayTasks.length}`, type: 'today', content: '', completed: false, isNew: true });
  }
  while (tomorrowTasks.length < 1) {
    tomorrowTasks.push({ id: `new-tomorrow-${tomorrowTasks.length}`, type: 'tomorrow', content: '', completed: false, isNew: true });
  }

  const handleChange = (task, field, value) => {
    onUpdateTask({ ...task, [field]: value });
  };

  return (
    <div className="task-panel">
      <h3>Tasks</h3>

      <div className="task-section">
        <div className="task-section-title">Today</div>
        {todayTasks.slice(0, 3).map((task, i) => (
          <div key={task.id || `today-${i}`} className="task-item">
            <input
              className="task-checkbox"
              type="checkbox"
              checked={!!task.completed}
              onChange={(e) => handleChange(task, 'completed', e.target.checked)}
            />
            <input
              className={`task-input ${task.completed ? 'completed' : ''}`}
              type="text"
              value={task.content || ''}
              onChange={(e) => handleChange(task, 'content', e.target.value)}
              placeholder={i < 2 ? `CPA task ${i + 1}` : 'Optional'}
            />
          </div>
        ))}
      </div>

      <div className="task-section">
        <div className="task-section-title">Tomorrow — Start with</div>
        {tomorrowTasks.slice(0, 1).map((task, i) => (
          <div key={task.id || 'tomorrow-0'} className="task-item">
            <input
              className="task-checkbox"
              type="checkbox"
              checked={!!task.completed}
              onChange={(e) => handleChange(task, 'completed', e.target.checked)}
            />
            <input
              className={`task-input ${task.completed ? 'completed' : ''}`}
              type="text"
              value={task.content || ''}
              onChange={(e) => handleChange(task, 'content', e.target.value)}
              placeholder="Start with: ___"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

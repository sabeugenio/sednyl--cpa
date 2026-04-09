import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function TaskPanel({ tasks, onUpdateTask, onDeleteTask, compact }) {
  const todayTasks = tasks.filter((t) => t.type === 'today');
  const tomorrowTasks = tasks.filter((t) => t.type === 'tomorrow');

  // If lists are empty, show 1 empty slot for user to start typing
  const displayToday = todayTasks.length > 0 ? todayTasks : [{ id: 'empty-today', type: 'today', content: '', completed: false, isNew: true }];
  const displayTomorrow = tomorrowTasks.length > 0 ? tomorrowTasks : [{ id: 'empty-tomorrow', type: 'tomorrow', content: '', completed: false, isNew: true }];

  const handleChange = (task, field, value) => {
    onUpdateTask({ ...task, [field]: value });
  };

  const handleAddTask = (type) => {
    const list = type === 'today' ? todayTasks : tomorrowTasks;
    if (list.length >= 5) return;
    onUpdateTask({ id: `new-${type}-${Date.now()}`, type, content: '', completed: false, isNew: true });
  };

  return (
    <div className={`task-panel ${compact ? 'task-panel-compact' : ''}`}>
      <div className="task-header-row">
        <h3>Tasks</h3>
      </div>

      <div className="task-section">
        <div className="task-section-title">Today</div>
        {displayToday.map((task, i) => (
          <div key={task.id || `today-${i}`} className="task-item">
            <div className="task-item-main">
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
                placeholder={i === 0 ? "What's the main focus?" : "Add task..."}
                autoFocus={task.isNew && i > 0}
              />
            </div>
            {task.id && !task.id.startsWith('empty-') && (
              <button 
                className="task-delete-btn" 
                onClick={() => onDeleteTask(task.id)}
                title="Delete task"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
        
        {todayTasks.length < 5 && todayTasks.length > 0 && (
          <button className="task-add-btn" onClick={() => handleAddTask('today')}>
            <Plus size={14} /> Add Task
          </button>
        )}
      </div>

      {!compact && (
        <div className="task-section">
          <div className="task-section-title">Tomorrow — Start with</div>
          {displayTomorrow.map((task, i) => (
            <div key={task.id || `tomorrow-${i}`} className="task-item">
              <div className="task-item-main">
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
                  autoFocus={task.isNew}
                />
              </div>
              {task.id && !task.id.startsWith('empty-') && (
                <button 
                  className="task-delete-btn" 
                  onClick={() => onDeleteTask(task.id)}
                  title="Delete task"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          
          {tomorrowTasks.length < 5 && tomorrowTasks.length > 0 && (
            <button className="task-add-btn" onClick={() => handleAddTask('tomorrow')}>
              <Plus size={14} /> Add Task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Timer state persistence using sessionStorage
// Survives page reloads, cleared when tab is closed

const KEYS = {
  date: 'cpa_timer_date',
  baseSeconds: 'cpa_timer_base_seconds',
  startTs: 'cpa_timer_start_ts',
  running: 'cpa_timer_running',
};

/**
 * Save the current timer checkpoint to sessionStorage.
 * @param {string} date - Session date (YYYY-MM-DD)
 * @param {number} baseSeconds - Accumulated seconds before current run segment
 * @param {number|null} startTs - Timestamp (ms) when current run segment started, null if paused
 * @param {boolean} running - Whether the timer is currently running
 */
export function saveTimerState(date, baseSeconds, startTs, running) {
  try {
    sessionStorage.setItem(KEYS.date, date);
    sessionStorage.setItem(KEYS.baseSeconds, String(Math.floor(baseSeconds)));
    sessionStorage.setItem(KEYS.startTs, startTs ? String(Math.floor(startTs)) : '');
    sessionStorage.setItem(KEYS.running, running ? '1' : '0');
  } catch {
    // sessionStorage might be unavailable in some contexts
  }
}

/**
 * Load timer state from sessionStorage.
 * Returns null if no timer state exists.
 */
export function loadTimerState() {
  try {
    const date = sessionStorage.getItem(KEYS.date);
    if (!date) return null;

    const baseSeconds = parseInt(sessionStorage.getItem(KEYS.baseSeconds) || '0', 10);
    const startTsStr = sessionStorage.getItem(KEYS.startTs);
    const startTs = startTsStr ? parseInt(startTsStr, 10) : null;
    const running = sessionStorage.getItem(KEYS.running) === '1';

    return { date, baseSeconds, startTs, running };
  } catch {
    return null;
  }
}

/**
 * Compute the current total seconds from stored state.
 * Accounts for elapsed time since startTs if running.
 */
export function computeStoredTotal(stored) {
  if (!stored) return 0;
  let total = stored.baseSeconds;
  if (stored.running && stored.startTs) {
    const elapsed = Math.floor((Date.now() - stored.startTs) / 1000);
    total += elapsed;
  }
  return total;
}

/**
 * Clear all timer state from sessionStorage.
 */
export function clearTimerState() {
  try {
    Object.values(KEYS).forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore
  }
}

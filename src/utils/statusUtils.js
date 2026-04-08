/**
 * Normalizes legacy status values to the new display categories.
 * Maps 'strong', 'showed_up', 'bare_minimum', and 'missed' to their 
 * modern equivalents and ensures standard statuses are preserved.
 */
export function normalizeStatus(status) {
  if (!status) return null;
  
  // Current modern statuses
  if (['peak_focus', 'great_progress', 'getting_started', 'reset_day'].includes(status)) {
    return status;
  }
  
  // Legacy status mapping
  if (status === 'strong') return 'peak_focus';
  if (status === 'showed_up') return 'great_progress';
  if (status === 'bare_minimum') return 'getting_started';
  if (status === 'missed') return 'reset_day';
  
  return null;
}

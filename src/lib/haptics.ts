/**
 * Haptics utility for mobile vibration feedback
 */

// Check if vibration API is available
export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Simple tap feedback
 */
export function hapticTap(): void {
  if (canVibrate()) {
    navigator.vibrate(10);
  }
}

/**
 * Medium feedback for selections
 */
export function hapticSelection(): void {
  if (canVibrate()) {
    navigator.vibrate(15);
  }
}

/**
 * Success feedback
 */
export function hapticSuccess(): void {
  if (canVibrate()) {
    navigator.vibrate([10, 50, 20]);
  }
}

/**
 * Error/warning feedback
 */
export function hapticError(): void {
  if (canVibrate()) {
    navigator.vibrate([50, 30, 50]);
  }
}

/**
 * Heartbeat pattern for timer urgency
 * Pattern: short-pause-long (like a heartbeat)
 */
export function hapticHeartbeat(): void {
  if (canVibrate()) {
    navigator.vibrate([30, 100, 60]);
  }
}

/**
 * Continuous heartbeat that runs on an interval
 * Returns a cleanup function to stop the heartbeat
 */
export function startHeartbeat(intervalMs: number = 800): () => void {
  if (!canVibrate()) {
    return () => {};
  }
  
  // Immediate first beat
  hapticHeartbeat();
  
  const interval = setInterval(() => {
    hapticHeartbeat();
  }, intervalMs);
  
  return () => clearInterval(interval);
}

import type { ChipLayoutItem, Session } from '../types/schedule';

export const SLOT_MINUTES = 15;
export const SLOT_WIDTH_PX = 36;

/** Convert "HH:MM" to minutes since midnight */
export function timeToMin(t: string): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
  return parts[0] * 60 + parts[1];
}

/** Convert minutes since midnight to "HH:MM" */
export function minToTime(m: number): string {
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Round minutes to nearest slot */
export function roundToSlot(m: number, mode: 'floor' | 'ceil' | 'round' = 'round'): number {
  if (mode === 'floor') return Math.floor(m / SLOT_MINUTES) * SLOT_MINUTES;
  if (mode === 'ceil') return Math.ceil(m / SLOT_MINUTES) * SLOT_MINUTES;
  return Math.round(m / SLOT_MINUTES) * SLOT_MINUTES;
}

/**
 * Expand a session { day, start, end } into an array of 15-min slot keys.
 * Each key format is: "Day-HH:MM" (e.g., "Mon-08:00")
 */
export function sessionToSlotKeys(session: Session): string[] {
  const keys: string[] = [];
  const startMin = timeToMin(session.start);
  const endMin = timeToMin(session.end);
  for (let m = startMin; m < endMin; m += SLOT_MINUTES) {
    keys.push(`${session.day}-${minToTime(m)}`);
  }
  return keys;
}

/** Check if new slots collide with already occupied slots */
export function hasOverlap(newSlots: string[], occupiedSet: Set<string>): boolean {
  for (const s of newSlots) {
    if (occupiedSet.has(s)) return true;
  }
  return false;
}

/** Check if any slot is in the blocked set */
export function hasBlocked(slots: string[], blockedSet: Set<string>): boolean {
  for (const s of slots) {
    if (blockedSet.has(s)) return true;
  }
  return false;
}

/**
 * Assign vertical tracks to chips so overlapping sessions display on separate horizontal rows.
 */
export function assignTracks(chips: ChipLayoutItem[]): void {
  chips.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const trackEnds: number[] = [];

  for (const chip of chips) {
    let placed = false;
    for (let t = 0; t < trackEnds.length; t++) {
      if (chip.startMin >= trackEnds[t]) {
        chip.track = t;
        trackEnds[t] = chip.endMin;
        placed = true;
        break;
      }
    }
    if (!placed) {
      chip.track = trackEnds.length;
      trackEnds.push(chip.endMin);
    }
  }
}

import type { ScheduleData, ValidationResult } from '../types/schedule';
import { minToTime, timeToMin, SLOT_MINUTES } from './time';

export function validateScheduleJSON(raw: any): ValidationResult & { data?: ScheduleData } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('Input is not a valid JSON object.');
    return { valid: false, errors, warnings };
  }

  // Clone to avoid mutating original source unexpectedly, while allowing auto-alignment
  let data: ScheduleData;
  try {
    data = JSON.parse(JSON.stringify(raw));
  } catch {
    errors.push('Failed to clone JSON data.');
    return { valid: false, errors, warnings };
  }

  if (!data.meta) errors.push('Missing "meta" field.');
  if (!Array.isArray(data.groups)) errors.push('Missing or invalid "groups" array.');
  if (!Array.isArray(data.classes)) errors.push('Missing or invalid "classes" array.');
  if (errors.length > 0) return { valid: false, errors, warnings };

  // Meta validation
  const meta = data.meta;
  if (!meta.termName) {
    warnings.push('meta.termName is missing; defaulting to "Schedule".');
    meta.termName = 'Schedule';
  }

  if (!Array.isArray(meta.dayOrder) || meta.dayOrder.length === 0) {
    errors.push('meta.dayOrder must be a non-empty array of day names.');
  }

  if (!meta.dayStart || !meta.dayEnd) {
    errors.push('meta.dayStart and meta.dayEnd are required (HH:MM format).');
  } else {
    const ds = timeToMin(meta.dayStart);
    const de = timeToMin(meta.dayEnd);
    if (isNaN(ds) || isNaN(de)) {
      errors.push('Invalid time format in meta.dayStart/dayEnd.');
    } else if (ds >= de) {
      errors.push('meta.dayStart must be before meta.dayEnd.');
    } else {
      if (ds % SLOT_MINUTES !== 0) {
        warnings.push(`meta.dayStart "${meta.dayStart}" is not ${SLOT_MINUTES}-min aligned. Auto-rounding.`);
        meta.dayStart = minToTime(Math.floor(ds / SLOT_MINUTES) * SLOT_MINUTES);
      }
      if (de % SLOT_MINUTES !== 0) {
        warnings.push(`meta.dayEnd "${meta.dayEnd}" is not ${SLOT_MINUTES}-min aligned. Auto-rounding.`);
        meta.dayEnd = minToTime(Math.ceil(de / SLOT_MINUTES) * SLOT_MINUTES);
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors, warnings };

  // Build group & subgroup maps
  const groupIds = new Set<string>();
  const subgroupIds = new Set<string>();
  const groupSubgroupMap = new Map<string, Set<string>>();

  for (const g of data.groups) {
    if (!g.id) {
      errors.push('A group is missing an "id".');
      continue;
    }
    if (groupIds.has(g.id)) {
      errors.push(`Duplicate group ID: "${g.id}".`);
    }
    groupIds.add(g.id);
    groupSubgroupMap.set(g.id, new Set());

    if (g.subgroups && Array.isArray(g.subgroups)) {
      for (const sg of g.subgroups) {
        if (!sg.id) {
          errors.push(`Subgroup in group "${g.id}" is missing an "id".`);
          continue;
        }
        if (subgroupIds.has(sg.id)) {
          errors.push(`Duplicate subgroup ID: "${sg.id}".`);
        }
        subgroupIds.add(sg.id);
        groupSubgroupMap.get(g.id)?.add(sg.id);
      }
    }
  }

  // Validate group conflictsWith references & ensure symmetry
  for (const g of data.groups) {
    if (g.conflictsWith && Array.isArray(g.conflictsWith)) {
      for (const ref of g.conflictsWith) {
        if (!groupIds.has(ref)) {
          errors.push(`Group "${g.id}" conflictsWith unknown group "${ref}".`);
        } else {
          const other = data.groups.find((og) => og.id === ref);
          if (other && !(other.conflictsWith || []).includes(g.id)) {
            warnings.push(`conflictsWith not symmetric: "${g.id}" → "${ref}". Auto-fixing.`);
            if (!other.conflictsWith) other.conflictsWith = [];
            other.conflictsWith.push(g.id);
          }
        }
      }
    }

    if (g.subgroups && Array.isArray(g.subgroups)) {
      for (const sg of g.subgroups) {
        if (sg.conflictsWith && Array.isArray(sg.conflictsWith)) {
          for (const ref of sg.conflictsWith) {
            if (!subgroupIds.has(ref)) {
              errors.push(`Subgroup "${sg.id}" conflictsWith unknown subgroup "${ref}".`);
            }
          }
        }
      }
    }
  }

  // Validate classes
  const dayStartMin = timeToMin(meta.dayStart);
  const dayEndMin = timeToMin(meta.dayEnd);
  const classIds = new Set<string>();

  for (const c of data.classes) {
    if (!c.id) {
      errors.push('A class is missing an "id".');
      continue;
    }
    if (classIds.has(c.id)) {
      errors.push(`Duplicate class ID: "${c.id}".`);
    }
    classIds.add(c.id);

    // Group references
    if (c.groupId !== null && c.groupId !== undefined) {
      if (!groupIds.has(c.groupId)) {
        errors.push(`Class "${c.id}" references unknown groupId "${c.groupId}".`);
      }
      if (c.subgroupId !== null && c.subgroupId !== undefined) {
        if (!subgroupIds.has(c.subgroupId)) {
          errors.push(`Class "${c.id}" references unknown subgroupId "${c.subgroupId}".`);
        } else if (c.groupId && groupSubgroupMap.has(c.groupId) && !groupSubgroupMap.get(c.groupId)!.has(c.subgroupId)) {
          errors.push(`Class "${c.id}": subgroup "${c.subgroupId}" does not belong to group "${c.groupId}".`);
        }
      }
    }

    // Sessions
    if (!c.sessions || !Array.isArray(c.sessions) || c.sessions.length === 0) {
      errors.push(`Class "${c.id}" has zero sessions.`);
      continue;
    }

    for (let i = 0; i < c.sessions.length; i++) {
      const s = c.sessions[i];
      if (!s.day || !s.start || !s.end) {
        errors.push(`Class "${c.id}" session ${i + 1} is missing day/start/end.`);
        continue;
      }
      if (!meta.dayOrder.includes(s.day)) {
        warnings.push(`Class "${c.id}" session ${i + 1} day "${s.day}" is not in meta.dayOrder.`);
      }

      const startMin = timeToMin(s.start);
      const endMin = timeToMin(s.end);

      if (isNaN(startMin) || isNaN(endMin)) {
        errors.push(`Class "${c.id}" session ${i + 1} has invalid time format.`);
      } else {
        if (startMin >= endMin) {
          errors.push(`Class "${c.id}" session ${i + 1}: start time must be strictly before end time.`);
        }
        if (startMin < dayStartMin || endMin > dayEndMin) {
          warnings.push(`Class "${c.id}" session ${i + 1} (${s.start}–${s.end}) falls outside dayStart–dayEnd bounds.`);
        }
        if (startMin % SLOT_MINUTES !== 0) {
          warnings.push(`Class "${c.id}" session ${i + 1} start "${s.start}" is not ${SLOT_MINUTES}-min aligned. Auto-rounding.`);
          s.start = minToTime(Math.round(startMin / SLOT_MINUTES) * SLOT_MINUTES);
        }
        if (endMin % SLOT_MINUTES !== 0) {
          warnings.push(`Class "${c.id}" session ${i + 1} end "${s.end}" is not ${SLOT_MINUTES}-min aligned. Auto-rounding.`);
          s.end = minToTime(Math.round(endMin / SLOT_MINUTES) * SLOT_MINUTES);
        }
      }
    }

    if (c.attendAllSessions === undefined) {
      c.attendAllSessions = false;
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    data: valid ? data : undefined,
    stats: {
      classes: data.classes.length,
      groups: data.groups.length,
      requiredGroups: data.groups.filter((g) => g.required).length,
      totalSessions: data.classes.reduce((sum, c) => sum + (c.sessions ? c.sessions.length : 0), 0),
    },
  };
}

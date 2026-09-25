export type DayCode = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | string;

export interface Session {
  day: DayCode;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export type ClassType = 'lecture' | 'lab' | 'tutorial' | 'other';

export interface ClassItem {
  id: string;
  name: string;
  type?: ClassType;
  groupId?: string | null;
  subgroupId?: string | null;
  instructor?: string;
  location?: string;
  credits?: number;
  attendAllSessions?: boolean;
  sessions: Session[];
}

export interface Subgroup {
  id: string;
  name: string;
  conflictMode?: 'conflicting' | 'non-conflicting';
  conflictsWith?: string[];
}

export interface Group {
  id: string;
  name: string;
  required: boolean;
  conflictsWith?: string[];
  subgroups?: Subgroup[];
}

export interface ScheduleMeta {
  termName?: string;
  dayOrder: DayCode[];
  dayStart: string; // "HH:MM"
  dayEnd: string;   // "HH:MM"
}

export interface ScheduleData {
  meta: ScheduleMeta;
  groups: Group[];
  classes: ClassItem[];
}

export interface ValidationStats {
  classes: number;
  groups: number;
  requiredGroups: number;
  totalSessions: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats?: ValidationStats;
}

export type PriorityCriterion = 'timeFit' | 'days' | 'gaps';

export interface Preferences {
  timeWindow: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  priorityOrder: PriorityCriterion[];
}

export interface ScheduleSelection {
  classId: string;
  sessionIndices: number[];
}

export interface ScheduleScores {
  timeFit: number;
  days: number;
  gaps: number;
}

export interface GeneratedSchedule {
  selections: ScheduleSelection[];
  scores: ScheduleScores;
}

export interface SolverConfig {
  classes: ClassItem[];
  groups: Group[];
  blockedSlots: string[];
  pinnedClasses: Record<string, number | null>;
  crossedOff?: string[];
  groupMode: 'auto' | 'manual';
  manualGroupChoices?: Record<string, { subgroupIds: string[] }>;
  preferences: Preferences;
  maxResults?: number;
}

export interface SolverResult {
  schedules: GeneratedSchedule[];
  totalFound: number;
  capped: boolean;
  error?: string;
}

export interface ChipLayoutItem {
  classObj: ClassItem;
  sessionIndex: number;
  session: Session;
  left: number;
  width: number;
  track: number;
  startMin: number;
  endMin: number;
}

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
}

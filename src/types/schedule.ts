export interface Person {
  id: string;
  name: string;
  groupId: string;
}

export interface Group {
  id: string;
  name: string;
  color: string; // HSL string for group accent
  order: number;
}

export type ShiftType = 'work' | 'dayoff' | 'vacation' | 'sick' | string;

export interface ShiftStatus {
  id: string;
  label: string;
  type: ShiftType;
  color: string; // HSL color
}

export interface Shift {
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD
  statusId: string;
  startHour?: number; // 0-23 for work shifts
  endHour?: number; // 1-24 for work shifts
  note?: string;
}

export interface ScheduleData {
  people: Person[];
  groups: Group[];
  shifts: Shift[];
  statuses: ShiftStatus[];
}

export const DEFAULT_STATUSES: ShiftStatus[] = [
  { id: 'work', label: 'Work', type: 'work', color: '217 91% 50%' },
  { id: 'dayoff', label: 'Day Off', type: 'dayoff', color: '142 71% 45%' },
  { id: 'vacation', label: 'Vacation', type: 'vacation', color: '38 92% 50%' },
  { id: 'sick', label: 'Sick Leave', type: 'sick', color: '0 84% 60%' },
];

export const DEFAULT_GROUPS: Group[] = Array.from({ length: 17 }, (_, i) => ({
  id: `group-${i + 1}`,
  name: `Group ${i + 1}`,
  color: `${(i * 21) % 360} 60% 50%`,
  order: i,
}));

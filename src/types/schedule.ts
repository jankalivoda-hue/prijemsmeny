export interface Person {
  id: string;
  name: string;
  email: string;
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

export const DEFAULT_GROUPS: Group[] = [
  { id: 'grp-inbound-ref', name: 'Inbound Refrigerated', color: '200 70% 50%', order: 0 },
  { id: 'grp-outbound-ref', name: 'Outbound Refrigerated', color: '190 65% 45%', order: 1 },
  { id: 'grp-sector-check', name: 'Sector Check', color: '160 55% 45%', order: 2 },
  { id: 'grp-freezer', name: 'Freezer', color: '210 80% 55%', order: 3 },
  { id: 'grp-day-retraction', name: 'Day Retraction', color: '30 75% 50%', order: 4 },
  { id: 'grp-night-retraction', name: 'Night Retraction', color: '260 55% 50%', order: 5 },
  { id: 'grp-bottle-machine', name: 'Bottle Machine', color: '340 60% 50%', order: 6 },
  { id: 'grp-inbound-dry', name: 'Inbound Dry', color: '45 70% 50%', order: 7 },
  { id: 'grp-outbound-dry', name: 'Outbound Dry', color: '55 65% 45%', order: 8 },
  { id: 'grp-produce', name: 'Produce', color: '120 60% 42%', order: 9 },
  { id: 'grp-night', name: 'Night', color: '240 50% 40%', order: 10 },
  { id: 'grp-dry-inventory', name: 'Dry Inventory', color: '80 50% 45%', order: 11 },
  { id: 'grp-ref-inventory', name: 'Refrigerated Inventory', color: '180 55% 45%', order: 12 },
  { id: 'grp-night-inventory', name: 'Night Inventory', color: '270 45% 45%', order: 13 },
  { id: 'grp-last-minute', name: 'Last Minute', color: '0 70% 55%', order: 14 },
  { id: 'grp-sorting', name: 'Sorting', color: '310 50% 50%', order: 15 },
  { id: 'grp-coordinators', name: 'Coordinators', color: '220 65% 55%', order: 16 },
];

import { useState, useCallback, useEffect } from 'react';
import { Person, Group, Shift, ShiftStatus, DEFAULT_STATUSES, DEFAULT_GROUPS, ScheduleData } from '@/types/schedule';

const STORAGE_KEY = 'shift-schedule-data';

function loadData(): ScheduleData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    people: [],
    groups: DEFAULT_GROUPS,
    shifts: [],
    statuses: DEFAULT_STATUSES,
  };
}

function saveData(data: ScheduleData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useScheduleStore() {
  const [data, setData] = useState<ScheduleData>(loadData);

  useEffect(() => { saveData(data); }, [data]);

  const addPerson = useCallback((person: Person) => {
    setData(d => ({ ...d, people: [...d.people, person] }));
  }, []);

  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    setData(d => ({
      ...d,
      people: d.people.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);

  const removePerson = useCallback((id: string) => {
    setData(d => ({
      ...d,
      people: d.people.filter(p => p.id !== id),
      shifts: d.shifts.filter(s => s.personId !== id),
    }));
  }, []);

  const addGroup = useCallback((group: Group) => {
    setData(d => ({ ...d, groups: [...d.groups, group] }));
  }, []);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    setData(d => ({
      ...d,
      groups: d.groups.map(g => g.id === id ? { ...g, ...updates } : g),
    }));
  }, []);

  const removeGroup = useCallback((id: string) => {
    setData(d => ({
      ...d,
      groups: d.groups.filter(g => g.id !== id),
      people: d.people.filter(p => p.groupId !== id),
      shifts: d.shifts.filter(s => {
        const person = d.people.find(p => p.id === s.personId);
        return person?.groupId !== id;
      }),
    }));
  }, []);

  const setShift = useCallback((shift: Shift) => {
    setData(d => {
      const existing = d.shifts.findIndex(
        s => s.personId === shift.personId && s.date === shift.date
      );
      const newShifts = [...d.shifts];
      if (existing >= 0) {
        newShifts[existing] = shift;
      } else {
        newShifts.push(shift);
      }
      return { ...d, shifts: newShifts };
    });
  }, []);

  const removeShift = useCallback((personId: string, date: string) => {
    setData(d => ({
      ...d,
      shifts: d.shifts.filter(s => !(s.personId === personId && s.date === date)),
    }));
  }, []);

  const addStatus = useCallback((status: ShiftStatus) => {
    setData(d => ({ ...d, statuses: [...d.statuses, status] }));
  }, []);

  const updateStatus = useCallback((id: string, updates: Partial<ShiftStatus>) => {
    setData(d => ({
      ...d,
      statuses: d.statuses.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }, []);

  const removeStatus = useCallback((id: string) => {
    setData(d => ({
      ...d,
      statuses: d.statuses.filter(s => s.id !== id),
      shifts: d.shifts.filter(s => s.statusId !== id),
    }));
  }, []);

  const getShift = useCallback((personId: string, date: string) => {
    return data.shifts.find(s => s.personId === personId && s.date === date);
  }, [data.shifts]);

  const getPeopleInGroup = useCallback((groupId: string) => {
    return data.people.filter(p => p.groupId === groupId);
  }, [data.people]);

  return {
    ...data,
    addPerson, updatePerson, removePerson,
    addGroup, updateGroup, removeGroup,
    setShift, removeShift, getShift,
    addStatus, updateStatus, removeStatus,
    getPeopleInGroup,
  };
}

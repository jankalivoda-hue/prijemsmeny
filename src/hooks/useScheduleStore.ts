import { useState, useCallback } from 'react';
import { Person, Group, Shift, ShiftStatus, DEFAULT_STATUSES, DEFAULT_GROUPS, ScheduleData } from '@/types/schedule';

// 1. SMAZALI JSME STORAGE_KEY A FUNKCE loadData/saveData
// Nechceme už, aby si prohlížeč cokoli pamatoval lokálně.

export function useScheduleStore() {
  // 2. STAV ZAČÍNÁ VŽDY PRÁZDNÝ (nebo s výchozími skupinami/statusy)
  const [data, setData] = useState<ScheduleData>({
    people: [],
    groups: DEFAULT_GROUPS,
    shifts: [],
    statuses: DEFAULT_STATUSES,
  });

  // 3. SMAZALI JSME useEffect, který dělal saveData do localStorage

  const addPerson = useCallback((person: Person) => {
    setData(d => {
      // Ochrana proti duplicitám při načítání ze Supabase
      if (d.people.some(p => p.id === person.id)) return d;
      return { ...d, people: [...d.people, person] };
    });
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
    setData(d => {
      // Ochrana proti duplicitám
      if (d.groups.some(g => g.id === group.id)) return d;
      return { ...d, groups: [...d.groups, group] };
    });
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

  const getMostFrequentShift = useCallback((personId: string): Omit<Shift, 'id' | 'personId' | 'date'> | null => {
    const personShifts = data.shifts.filter(s => s.personId === personId && !s.isPrediction);
    if (personShifts.length === 0) return null;

    const counts: Record<string, { count: number; shift: Shift }> = {};
    personShifts.forEach(s => {
      const key = `${s.statusId}-${s.startMinute ?? ''}-${s.endMinute ?? ''}`;
      if (!counts[key]) counts[key] = { count: 0, shift: s };
      counts[key].count++;
    });

    const best = Object.values(counts).sort((a, b) => b.count - a.count)[0];
    if (!best) return null;

    return {
      statusId: best.shift.statusId,
      startMinute: best.shift.startMinute,
      endMinute: best.shift.endMinute,
      startHour: best.shift.startHour,
      endHour: best.shift.endHour,
      isPrediction: true,
    };
  }, [data.shifts]);

  return {
    ...data,
    addPerson, updatePerson, removePerson,
    addGroup, updateGroup, removeGroup,
    setShift, removeShift, getShift,
    addStatus, updateStatus, removeStatus,
    getPeopleInGroup, getMostFrequentShift,
  };
}

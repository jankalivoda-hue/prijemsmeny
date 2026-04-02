import { useMemo, useState } from 'react';
import { Person, Group, Shift, ShiftStatus } from '@/types/schedule';
import { ShiftCell } from './ShiftCell';
import { format, getDaysInMonth, isToday, isWeekend, isFuture } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ScheduleGridProps {
  year: number;
  month: number;
  people: Person[];
  groups: Group[];
  shifts: Shift[];
  statuses: ShiftStatus[];
  getShift: (personId: string, date: string) => Shift | undefined;
  onSetShift: (shift: Shift) => void;
  onRemoveShift: (personId: string, date: string) => void;
  filterGroup: string;
  searchName: string;
  isAdmin: boolean;
  onCellClick: (person: Person, dateStr: string) => void;
  getMostFrequentShift: (personId: string) => Omit<Shift, 'id' | 'personId' | 'date'> | null;
}

// --- POMOCNÉ VÝPOČETNÍ FUNKCE ---

function getShiftHours(s: Shift): number {
  const startMins = s.startMinute ?? (s.startHour != null ? s.startHour * 60 : undefined);
  const endMins = s.endMinute ?? (s.endHour != null ? s.endHour * 60 : undefined);
  
  if (startMins != null && endMins != null) {
    const totalMinutes = endMins - startMins;
    const netMinutes = Math.max(0, totalMinutes - 30); 
    return netMinutes / 60;
  }
  return 0;
}

function getPersonMonthlyHours(personId: string, shifts: Shift[], year: number, month: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return shifts
    .filter(s => s.personId === personId && s.date.startsWith(prefix) && !s.isPrediction && !s.is_request)
    .reduce((sum, s) => sum + getShiftHours(s), 0);
}

function getDailyTotalHours(peopleIds: Set<string>, shifts: Shift[], dateStr: string): number {
  return shifts
    .filter(s => peopleIds.has(s.personId) && s.date === dateStr && !s.isPrediction && !s.is_request)
    .reduce((sum, s) => sum + getShiftHours(s), 0);
}

// --- HLAVNÍ KOMPONENTA ---

export function ScheduleGrid({ 
  year, month, people, groups, shifts, statuses, getShift, 
  filterGroup, searchName, isAdmin, onCellClick, getMostFrequentShift 
}: ScheduleGridProps) {

  const days = useMemo(() => {
    const count = getDaysInMonth(new Date(year, month));
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return {
        day: i + 1,
        dateStr: format(d, 'yyyy-MM-dd'),
        dayName: format(d, 'EEE', { locale: cs }).slice(0, 2),
        isToday: isToday(d),
        isWeekend: isWeekend(d),
      };
    });
  }, [year, month]);

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.order - b.order), [groups]);
  const filteredGroups = filterGroup === 'all' ? sortedGroups : sortedGroups.filter(g => g.id === filterGroup);

  const filteredPeople = useMemo(() => {
    let result = people;
    if (searchName) result = result.filter(p => p.name.toLowerCase().includes(searchName.toLowerCase()));
    return result;
  }, [people, searchName]);

  const allVisiblePeopleIds = useMemo(() => new Set(filteredPeople.map(p => p.id)), [filteredPeople]);

  return (
    <div className="relative flex-1 overflow-auto border border-grid-line rounded-lg bg-card no-scrollbar shadow-sm" style={{ maxHeight: 'calc(100vh - 130px)' }}>
      <table className="border-separate border-spacing-0 table-fixed min-w-max text-xs">
        <colgroup>
          <col className="w-[140px] md:w-[150px]" />
          <col className="hidden md:table-column md:w-[140px]" />
          <col className="hidden md:table-column md:w-[50px]" />
          {days.map(d => (
            <col key={d.dateStr} className="w-[42px] md:w-[56px]" />
          ))}
        </colgroup>
        <thead>
          {isAdmin && (
            <tr className="sticky top-0 z-50 bg-slate-50 h-8">
              <th className="sticky left-0 z-[60] bg-slate-100 border border-grid-line px-2 text-[10px] font-bold text-slate-500 uppercase">
                Daily Net Hrs
              </th>
              <th className="hidden md:table-cell sticky left-[150px] z-[60] bg-slate-100 border border-grid-line"></th>
              <th className="hidden md:table-cell sticky left-[290px] z-[60] bg-slate-100 border border-grid-line text-[10px] font-bold text-center"></th>
              {days.map(d => {
                const total = getDailyTotalHours(allVisiblePeopleIds, shifts, d.dateStr);
                const rounded = Math.round(total * 100) / 100;
                return (
                  <th key={d.dateStr} className={`border border-grid-line text-center text-[10px] font-bold ${d.isToday ? 'bg-blue-100/50' : ''}`}>
                    {rounded > 0 ? rounded : ''}
                  </th>
                );
              })}
            </tr>
          )}
          <tr className={`sticky z-50 bg-white shadow-md h-10 text-slate-700 font-bold ${isAdmin ? 'top-[32px]' : 'top-0'}`}>
            <th className="sticky left-0 z-[60] bg-white border border-grid-line px-2 text-left text-[11px] md:text-sm">
              <span className="md:hidden">Jméno/Net</span>
              <span className="hidden md:inline">Jméno zaměstnance</span>
            </th>
            <th className="hidden md:table-cell sticky left-[150px] z-[60] bg-white border border-grid-line px-2 text-left">Email</th>
            <th className="hidden md:table-cell sticky left-[290px] z-[60] bg-white border border-grid-line text-center text-[10px]">Čisté hod.</th>
            {days.map(d => (
              <th key={d.day} className={`border border-grid-line px-0.5 text-center ${d.isToday ? 'bg-blue-50 text-blue-600' : ''} ${d.isWeekend ? 'text-red-500 bg-red-50/30' : 'text-slate-600'}`}>
                <div className="text-[8px] uppercase leading-none">{d.dayName}</div>
                <div className="text-xs md:text-sm">{d.day}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredGroups.map(group => {
            const groupPeople = filteredPeople.filter(p => p.groupId === group.id);
            if (groupPeople.length === 0) return null;
            return (
              <GroupRows
                key={group.id}
                group={group}
                people={groupPeople}
                days={days}
                shifts={shifts}
                statuses={statuses}
                getShift={getShift}
                onCellClick={onCellClick}
                isAdmin={isAdmin}
                year={year}
                month={month}
                getMostFrequentShift={getMostFrequentShift}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({ group, people, days, shifts, statuses, getShift, onCellClick, isAdmin, year, month, getMostFrequentShift }: any) {
  const peopleIds = useMemo(() => new Set<string>(people.map((p: any) => p.id)), [people]);

  return (
    <>
      <tr>
        <td colSpan={days.length + 4} className="sticky left-0 border border-grid-line px-2 py-1.5 font-bold text-[9px] uppercase tracking-wider bg-white shadow-sm z-10" style={{ color: `hsl(${group.color})`, borderLeft: `3px solid hsl(${group.color})` }}>
          {group.name} ({people.length})
        </td>
      </tr>

      {isAdmin && (
        <tr className="bg-slate-50/50 h-7 border-b border-grid-line">
          <td className="sticky left-0 z-[20] bg-slate-50 border border-grid-line px-2 text-[9px] font-bold text-slate-400 uppercase italic">
            Group Net Total
          </td>
          <td className="hidden md:table-cell sticky left-[150px] z-[20] bg-slate-50 border border-grid-line"></td>
          <td className="hidden md:table-cell sticky left-[290px] z-[20] bg-slate-50 border border-grid-line"></td>
          {days.map((d: any) => {
            const groupTotal = getDailyTotalHours(peopleIds, shifts, d.dateStr);
            const rounded = Math.round(groupTotal * 100) / 100;
            return (
              <td key={d.dateStr} className="border border-grid-line text-center text-[10px] font-bold text-slate-500">
                {rounded > 0 ? rounded : ''}
              </td>
            );
          })}
        </tr>
      )}

      {people.map((person: any) => {
        const monthlyHours = getPersonMonthlyHours(person.id, shifts, year, month);
        const rounded = Math.round(monthlyHours * 100) / 100;
        const prediction = getMostFrequentShift(person.id);

        return (
          <tr key={person.id} className="h-10 hover:bg-muted/30 transition-colors">
            <td className="sticky left-0 z-[20] bg-white border border-grid-line px-2 py-1 shadow-[2px_0_2px_rgba(0,0,0,0.05)]">
              <div className="font-bold text-[11px] md:text-xs truncate leading-tight">{person.name}</div>
              <div className="text-[10px] text-blue-600 font-bold md:hidden mt-0.5">{rounded > 0 ? `${rounded}h` : '0h'}</div>
            </td>
            
            <td className="hidden md:table-cell sticky left-[150px] z-[20] bg-white border border-grid-line px-2 py-0 text-xs text-muted-foreground truncate">{person.email || '—'}</td>
            
            <td className="hidden md:table-cell sticky left-[290px] z-[20] bg-slate-50 border border-grid-line px-1 py-0 text-xs text-center font-bold">
              {rounded > 0 ? rounded : '—'}
            </td>

            {days.map((d: any) => {
              const realShift = getShift(person.id, d.dateStr);
              
              // LOGIKA PREDIKCE: Pokud není skutečná směna a jsme Admin, zobrazíme "ducha"
              const displayShift = realShift || (isAdmin && prediction ? { ...prediction, isPrediction: true } : undefined);

              // LOGIKA ZÁMKU: Pokud není admin a existuje směna, která už NENÍ požadavkem
              const isLockedForUser = !isAdmin && realShift && realShift.is_request === false;

              return (
                <ShiftCell
                  key={d.dateStr}
                  shift={displayShift}
                  statuses={statuses}
                  isToday={d.isToday}
                  isWeekend={d.isWeekend}
                  // Pokud je den zamčený, onClick se nespustí
                  onClick={isLockedForUser ? () => {} : () => onCellClick(person, d.dateStr)}
                  // Předáme informaci o zámku do vizuálu
                  isReadOnly={isLockedForUser}
                  isPrediction={!realShift && !!displayShift}
                />
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

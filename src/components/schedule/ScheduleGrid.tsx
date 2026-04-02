import { useMemo, useState } from 'react';
import { Person, Group, Shift, ShiftStatus } from '@/types/schedule';
import { ShiftCell } from './ShiftCell';
import { ShiftModal } from './ShiftModal';
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
  searchEmail: string;
  isAdmin: boolean;
  getMostFrequentShift: (personId: string) => Omit<Shift, 'id' | 'personId' | 'date'> | null;
}

function getShiftHours(s: Shift): number {
  const startMins = s.startMinute ?? (s.startHour != null ? s.startHour * 60 : undefined);
  const endMins = s.endMinute ?? (s.endHour != null ? s.endHour * 60 : undefined);
  if (startMins != null && endMins != null) return (endMins - startMins) / 60;
  return 0;
}

function getPersonMonthlyHours(personId: string, shifts: Shift[], year: number, month: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return shifts
    .filter(s => s.personId === personId && s.date.startsWith(prefix) && !s.isPrediction)
    .reduce((sum, s) => sum + getShiftHours(s), 0);
}

function getDailyTotalHours(peopleIds: Set<string>, shifts: Shift[], dateStr: string): number {
  return shifts
    .filter(s => peopleIds.has(s.personId) && s.date === dateStr && !s.isPrediction)
    .reduce((sum, s) => sum + getShiftHours(s), 0);
}

export function ScheduleGrid({ year, month, people, groups, shifts, statuses, getShift, onSetShift, onRemoveShift, filterGroup, searchName, searchEmail, isAdmin, getMostFrequentShift }: ScheduleGridProps) {
  const [modalData, setModalData] = useState<{ person: Person; date: string } | null>(null);

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
        isFuture: isFuture(d),
      };
    });
  }, [year, month]);

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.order - b.order), [groups]);
  const filteredGroups = filterGroup === 'all' ? sortedGroups : sortedGroups.filter(g => g.id === filterGroup);

  const filteredPeople = useMemo(() => {
    let result = people;
    if (searchName) {
      const q = searchName.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [people, searchName]);

  const allVisiblePeopleIds = useMemo(() => new Set(filteredPeople.map(p => p.id)), [filteredPeople]);
  const existingShift = modalData ? getShift(modalData.person.id, modalData.date) : undefined;

  const tempTransferMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    shifts.forEach(s => {
      if (s.tempGroupId) {
        if (!map[s.personId]) map[s.personId] = {};
        map[s.personId][s.date] = s.tempGroupId;
      }
    });
    return map;
  }, [shifts]);

  return (
    <>
      <div className="relative flex-1 overflow-auto border border-grid-line rounded-lg bg-card no-scrollbar" style={{ maxHeight: 'calc(100vh - 130px)' }}>
        <table className="w-full border-separate border-spacing-0">
          <thead className="relative z-30">
            {/* 1. ŘÁDEK: Daily Hours */}
            <tr className="sticky top-0 z-50 bg-slate-50 shadow-sm h-6">
              <th className="sticky left-0 z-[60] bg-slate-100 border border-grid-line px-2 text-left text-[9px] font-bold text-slate-500 uppercase w-[110px] md:w-[150px]">
                Daily Hrs
              </th>
              {/* Email schován pro mobily */}
              <th className="hidden md:table-cell sticky left-[150px] z-[60] bg-slate-100 border border-grid-line w-[140px]"></th>
              
              {/* Fixní pozice pro Sum: na mobilu 110px, na PC 290px */}
              <th className="sticky left-[110px] md:left-[290px] z-[60] bg-slate-100 border border-grid-line text-[9px] font-bold text-center w-[40px] md:w-[50px] shadow-[1px_0_3px_rgba(0,0,0,0.1)]">
                Sum
              </th>
              
              {days.map(d => {
                const total = getDailyTotalHours(allVisiblePeopleIds, shifts, d.dateStr);
                const rounded = Math.round(total * 100) / 100;
                return (
                  <th key={d.dateStr} className={`border border-grid-line text-center text-[10px] font-bold min-w-[40px] md:min-w-[56px] ${d.isToday ? 'bg-blue-100/50' : ''}`}>
                    {rounded > 0 ? rounded : ''}
                  </th>
                );
              })}
            </tr>
            
            {/* 2. ŘÁDEK: Name + Hrs + Dny */}
            <tr className="sticky top-[24px] z-50 bg-white shadow-md h-10">
              <th className="sticky left-0 z-[60] bg-white border border-grid-line px-2 text-left font-bold text-slate-700 w-[110px] md:w-[150px] text-[11px] md:text-sm">
                Name
              </th>
              <th className="hidden md:table-cell sticky left-[150px] z-[60] bg-white border border-grid-line px-2 text-left w-[140px] font-bold text-slate-700">
                Email
              </th>
              <th className="sticky left-[110px] md:left-[290px] z-[60] bg-white border border-grid-line text-center font-bold text-slate-700 w-[40px] md:w-[50px] shadow-[1px_0_3px_rgba(0,0,0,0.1)] text-[10px]">
                Hrs
              </th>
              {days.map(d => (
                <th
                  key={d.day}
                  className={`border border-grid-line px-0.5 text-center font-bold min-w-[40px] md:min-w-[56px] ${d.isToday ? 'bg-blue-50 text-blue-600' : ''} ${d.isWeekend ? 'text-red-500 bg-red-50/30' : 'text-slate-600'}`}
                >
                  <div className="text-[8px] uppercase tracking-tighter leading-none">{d.dayName}</div>
                  <div className="text-xs md:text-sm">{d.day}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map(group => {
              const groupPeople = filteredPeople.filter(p => p.groupId === group.id);
              const tempPeopleIds = new Set<string>();
              filteredPeople.forEach(p => {
                if (p.groupId !== group.id && tempTransferMap[p.id]) {
                  const dates = Object.entries(tempTransferMap[p.id]);
                  if (dates.some(([, gid]) => gid === group.id)) tempPeopleIds.add(p.id);
                }
              });
              const allGroupPeople = [...groupPeople, ...filteredPeople.filter(p => tempPeopleIds.has(p.id))];
              if (allGroupPeople.length === 0) return null;
              return (
                <GroupRows
                  key={group.id}
                  group={group}
                  people={allGroupPeople}
                  tempPeopleIds={tempPeopleIds}
                  days={days}
                  shifts={shifts}
                  statuses={statuses}
                  getShift={getShift}
                  onCellClick={isAdmin ? (person: Person, dateStr: string) => {
                    const existing = getShift(person.id, dateStr);
                    if (!existing) {
                      const predicted = getMostFrequentShift(person.id);
                      if (predicted) {
                        onSetShift({
                          id: `shift-${Date.now()}-${person.id}`,
                          personId: person.id,
                          date: dateStr,
                          ...predicted,
                          isPrediction: false,
                        });
                        return;
                      }
                    }
                    setModalData({ person, date: dateStr });
                  } : undefined}
                  totalCols={days.length}
                  year={year}
                  month={month}
                  isAdmin={isAdmin}
                  getMostFrequentShift={getMostFrequentShift}
                  tempTransferMap={tempTransferMap}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {modalData && isAdmin && (
        <ShiftModal
          open={!!modalData}
          onClose={() => setModalData(null)}
          personName={modalData.person.name}
          date={modalData.date}
          existingShift={existingShift}
          statuses={statuses}
          groups={groups}
          currentGroupId={modalData.person.groupId}
          onSave={(data) => {
            onSetShift({
              id: existingShift?.id || `shift-${Date.now()}`,
              personId: modalData.person.id,
              date: modalData.date,
              ...data,
              isPrediction: false,
            });
            setModalData(null);
          }}
          onDelete={() => {
            onRemoveShift(modalData.person.id, modalData.date);
            setModalData(null);
          }}
        />
      )}
    </>
  );
}

function GroupRows({ group, people, tempPeopleIds, days, shifts, statuses, getShift, onCellClick, totalCols, year, month, isAdmin, getMostFrequentShift, tempTransferMap }: any) {
  return (
    <>
      <tr>
        <td colSpan={totalCols + 4} className="sticky left-0 border border-grid-line px-2 py-1 font-bold text-[9px] uppercase tracking-wider bg-white shadow-sm z-10" style={{ color: `hsl(${group.color})`, borderLeft: `3px solid hsl(${group.color})` }}>
          {group.name} ({people.length})
        </td>
      </tr>
      {people.map((person: any) => {
        const isTemp = tempPeopleIds.has(person.id);
        const monthlyHours = getPersonMonthlyHours(person.id, shifts, year, month);
        const rounded = Math.round(monthlyHours * 100) / 100;
        return (
          <tr key={person.id} className={`hover:bg-muted/30 ${isTemp ? 'opacity-50' : ''} h-10`}>
            {/* Jméno: fixně vlevo */}
            <td className="sticky left-0 z-[20] bg-white border border-grid-line px-2 py-0 font-bold whitespace-nowrap text-[11px] md:text-xs w-[110px] md:w-[150px] truncate">
              {person.name}
            </td>
            {/* Email: na mobilu se nenačte */}
            <td className="hidden md:table-cell sticky left-[150px] z-[20] bg-white border border-grid-line px-2 py-0 text-xs text-muted-foreground whitespace-nowrap truncate w-[140px]">
              {person.email || '—'}
            </td>
            {/* Hrs: na mobilu hned za jménem (110px), na PC za emailem (290px) */}
            <td className="sticky left-[110px] md:left-[290px] z-[20] bg-slate-50 border border-grid-line px-1 py-0 text-[10px] md:text-xs text-center font-bold w-[40px] md:w-[50px] shadow-[1px_0_3px_rgba(0,0,0,0.1)]">
              {rounded > 0 ? rounded : '—'}
            </td>
            {days.map((d: any) => {
              const realShift = getShift(person.id, d.dateStr);
              const isTempThisDay = tempTransferMap[person.id]?.[d.dateStr] === group.id;
              const isOriginalGroup = person.groupId === group.id;
              
              if (!isOriginalGroup && !isTempThisDay) return <td key={d.dateStr} className="border border-grid-line h-10 min-w-[40px] md:min-w-[56px]" />;
              if (isOriginalGroup && tempTransferMap[person.id]?.[d.dateStr] && tempTransferMap[person.id][d.dateStr] !== group.id) {
                return <td key={d.dateStr} className="border border-grid-line h-10 min-w-[40px] md:min-w-[56px] bg-muted/20 text-[8px] text-center text-muted-foreground">↗</td>;
              }

              let displayShift = realShift;
              let isPrediction = false;
              if (!realShift && d.isFuture && isAdmin) {
                const predicted = getMostFrequentShift(person.id);
                if (predicted) {
                  displayShift = { id: 'pred', personId: person.id, date: d.dateStr, ...predicted } as Shift;
                  isPrediction = true;
                }
              }

              return (
                <ShiftCell
                  key={d.dateStr}
                  shift={displayShift}
                  statuses={statuses}
                  isToday={d.isToday}
                  isWeekend={d.isWeekend}
                  onClick={() => onCellClick?.(person, d.dateStr)}
                  isTempTransfer={isTempThisDay}
                  isPrediction={isPrediction}
                  isReadOnly={!onCellClick}
                />
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

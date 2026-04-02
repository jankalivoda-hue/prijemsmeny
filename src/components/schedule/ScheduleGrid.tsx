import { useMemo, useState } from 'react';
import { Person, Group, Shift, ShiftStatus } from '@/types/schedule';
import { ShiftCell } from './ShiftCell';
import { ShiftModal } from './ShiftModal';
import { format, getDaysInMonth, isToday, isWeekend, isFuture } from 'date-fns';

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
        dayName: format(d, 'EEE').slice(0, 2),
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
    if (searchEmail) {
      const q = searchEmail.toLowerCase();
      result = result.filter(p => (p.email || '').toLowerCase().includes(q));
    }
    return result;
  }, [people, searchName, searchEmail]);

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
      <div className="overflow-auto flex-1 border border-grid-line rounded-lg bg-card">
        <table className="border-collapse text-xs">
        <thead className="relative z-30">
  {/* První řádek: Daily Hours - přilepený úplně nahoře */}
  <tr className="sticky top-0 z-40 bg-muted/95 backdrop-blur-sm shadow-sm">
    <th colSpan={3} className="sticky left-0 z-50 bg-muted border border-grid-line px-3 py-1 text-left text-[10px] font-medium text-muted-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
      Daily Hours
    </th>
    {days.map(d => {
      const total = getDailyTotalHours(allVisiblePeopleIds, shifts, d.dateStr);
      const rounded = Math.round(total * 100) / 100;
      return (
        <th key={d.dateStr} className={`border border-grid-line px-0.5 py-1 text-center text-[10px] font-semibold min-w-[56px] ${d.isToday ? 'bg-grid-today' : ''}`}>
          {rounded > 0 ? rounded : ''}
        </th>
      );
    })}
  </tr>
  
  {/* Druhý řádek: Dny a jména - přilepený hned pod Daily Hours */}
  <tr className="sticky top-[26px] z-40 bg-grid-header/95 backdrop-blur-sm shadow-sm">
    <th className="sticky left-0 z-50 bg-grid-header border border-grid-line px-3 py-2 text-left min-w-[150px] font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
      Employee
    </th>
    <th className="sticky left-[150px] z-50 bg-grid-header border border-grid-line px-2 py-2 text-left min-w-[140px] font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
      Email
    </th>
    <th className="sticky left-[290px] z-50 bg-grid-header border border-grid-line px-2 py-2 text-center min-w-[50px] font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
      Hours
    </th>
    {days.map(d => (
      <th
        key={d.day}
        className={`border border-grid-line px-0.5 py-1 text-center font-medium min-w-[56px] ${d.isToday ? 'bg-grid-today' : ''} ${d.isWeekend ? 'text-destructive' : ''}`}
      >
        <div className="text-[10px] opacity-70">{d.dayName}</div>
        <div className="font-semibold">{d.day}</div>
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
        <td colSpan={totalCols + 3} className="sticky left-0 border border-grid-line px-3 py-1.5 font-semibold text-xs uppercase tracking-wider" style={{ backgroundColor: `hsl(${group.color} / 0.15)`, color: `hsl(${group.color})`, borderLeft: `4px solid hsl(${group.color})` }}>
          {group.name} ({people.length})
        </td>
      </tr>
      {people.map((person: any) => {
        const isTemp = tempPeopleIds.has(person.id);
        const monthlyHours = getPersonMonthlyHours(person.id, shifts, year, month);
        const rounded = Math.round(monthlyHours * 100) / 100;
        return (
          <tr key={person.id} className={`hover:bg-muted/30 ${isTemp ? 'opacity-50' : ''}`}>
            <td className="sticky left-0 z-[5] bg-card border border-grid-line px-3 py-1 font-medium whitespace-nowrap text-xs min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              {person.name}
            </td>
            <td className="sticky left-[150px] z-[5] bg-card border border-grid-line px-2 py-1 text-xs text-muted-foreground whitespace-nowrap truncate min-w-[140px] max-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              {person.email || '—'}
            </td>
            <td className="sticky left-[290px] z-[5] bg-card border border-grid-line px-2 py-1 text-xs text-center font-semibold min-w-[50px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              {rounded > 0 ? rounded : '—'}
            </td>
            {days.map((d: any) => {
              const realShift = getShift(person.id, d.dateStr);
              const isTempThisDay = tempTransferMap[person.id]?.[d.dateStr] === group.id;
              const isOriginalGroup = person.groupId === group.id;
              
              if (!isOriginalGroup && !isTempThisDay) return <td key={d.dateStr} className="border border-grid-line h-9 min-w-[56px]" />;
              if (isOriginalGroup && tempTransferMap[person.id]?.[d.dateStr] && tempTransferMap[person.id][d.dateStr] !== group.id) {
                return <td key={d.dateStr} className="border border-grid-line h-9 min-w-[56px] bg-muted/30 text-[9px] text-center text-muted-foreground" title="Transferred">↗</td>;
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

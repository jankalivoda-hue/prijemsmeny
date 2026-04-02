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

  const sortedGroups = useMemo(() =>
    [...groups].sort((a, b) => a.order - b.order), [groups]
  );

  const filteredGroups = filterGroup === 'all'
    ? sortedGroups
    : sortedGroups.filter(g => g.id === filterGroup);

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

  // Build temp transfer map: shifts with tempGroupId show person in that group
  const tempTransferMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {}; // personId -> date -> tempGroupId
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
          <thead className="sticky top-0 z-20">
            {/* Daily totals row */}
            <tr className="bg-muted/80">
              <th colSpan={3} className="sticky left-0 z-30 bg-muted/80 border border-grid-line px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">
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
            {/* Header row */}
            <tr className="bg-grid-header">
              <th className="sticky left-0 z-30 bg-grid-header border border-grid-line px-3 py-2 text-left min-w-[150px] font-semibold">
                Employee
              </th>
              <th className="sticky left-[150px] z-30 bg-grid-header border border-grid-line px-2 py-2 text-left min-w-[140px] font-semibold">
                Email
              </th>
              <th className="sticky left-[290px] z-30 bg-grid-header border border-grid-line px-2 py-2 text-center min-w-[50px] font-semibold">
                Hours
              </th>
              {days.map(d => (
                <th
                  key={d.day}
                  className={`border border-grid-line px-0.5 py-1 text-center font-medium min-w-[56px] ${d.isToday ? 'bg-grid-today' : ''} ${d.isWeekend ? 'text-destructive' : ''}`}
                >
                  <div>{d.dayName}</div>
                  <div className="font-semibold">{d.day}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map(group => {
              const groupPeople = filteredPeople.filter(p => p.groupId === group.id);
              // Also include people temporarily transferred to this group for any visible day
              const tempPeopleIds = new Set<string>();
              filteredPeople.forEach(p => {
                if (p.groupId !== group.id && tempTransferMap[p.id]) {
                  const dates = Object.entries(tempTransferMap[p.id]);
                  if (dates.some(([, gid]) => gid === group.id)) {
                    tempPeopleIds.add(p.id);
                  }
                }
              });
              const tempPeople = filteredPeople.filter(p => tempPeopleIds.has(p.id));
              const allGroupPeople = [...groupPeople, ...tempPeople];
              
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
  onCellClick={isAdmin ? (person, dateStr) => {
    const existing = getShift(person.id, dateStr);
    
    // 1. Pokud buňka neobsahuje reálnou směnu, zkusíme najít návrh (predikci)
    if (!existing) {
      const predicted = getMostFrequentShift(person.id);
      if (predicted) {
        // 2. Pokud návrh existuje, rovnou ho uložíme jako potvrzenou směnu
        onSetShift({
          id: `shift-${Date.now()}-${person.id}`,
          personId: person.id,
          date: dateStr,
          ...predicted,
          isPrediction: false,
        });
        // 3. Po automatickém uložení vyskočíme z funkce, aby se neotevřel modal
        return;
      }
    }
    
    // 4. Pokud návrh neexistuje nebo už tam směna je, otevře se modal pro úpravu
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

function GroupRows({ group, people, tempPeopleIds, days, shifts, statuses, getShift, onCellClick, totalCols, year, month, isAdmin, getMostFrequentShift, tempTransferMap }: {
  group: Group;
  people: Person[];
  tempPeopleIds: Set<string>;
  days: { day: number; dateStr: string; dayName: string; isToday: boolean; isWeekend: boolean; isFuture: boolean }[];
  shifts: Shift[];
  statuses: ShiftStatus[];
  getShift: (personId: string, date: string) => Shift | undefined;
  onCellClick?: (person: Person, date: string) => void;
  totalCols: number;
  year: number;
  month: number;
  isAdmin: boolean;
  getMostFrequentShift: (personId: string) => Omit<Shift, 'id' | 'personId' | 'date'> | null;
  tempTransferMap: Record<string, Record<string, string>>;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={totalCols + 3}
          className="sticky left-0 border border-grid-line px-3 py-1.5 font-semibold text-xs uppercase tracking-wider"
          style={{
            backgroundColor: `hsl(${group.color} / 0.15)`,
            color: `hsl(${group.color})`,
            borderLeft: `4px solid hsl(${group.color})`,
          }}
        >
          {group.name} ({people.length})
        </td>
      </tr>
      {people.map(person => {
        const isTemp = tempPeopleIds.has(person.id);
        const monthlyHours = getPersonMonthlyHours(person.id, shifts, year, month);
        const rounded = Math.round(monthlyHours * 100) / 100;
        return (
          <tr key={person.id} className={`hover:bg-muted/30 ${isTemp ? 'opacity-50' : ''}`}>
            <td className="sticky left-0 z-[5] bg-card border border-grid-line px-3 py-1 font-medium whitespace-nowrap text-xs min-w-[150px]">
              {person.name}
              {isTemp && <span className="ml-1 text-[9px] text-muted-foreground">(temp)</span>}
            </td>
            <td className="sticky left-[150px] z-[5] bg-card border border-grid-line px-2 py-1 text-xs text-muted-foreground whitespace-nowrap truncate min-w-[140px] max-w-[140px]">
              {person.email || '—'}
            </td>
            <td className="sticky left-[290px] z-[5] bg-card border border-grid-line px-2 py-1 text-xs text-center font-semibold min-w-[50px]">
              {rounded > 0 ? rounded : '—'}
            </td>
            {days.map(d => {
              const realShift = getShift(person.id, d.dateStr);
              // For temp transfers: only show shift in correct group context
              const isTempThisDay = tempTransferMap[person.id]?.[d.dateStr] === group.id;
              const isOriginalGroup = person.groupId === group.id;
              
              // If person is temp in this group, only show if this day's transfer matches
              if (!isOriginalGroup && !isTempThisDay) {
                return <td key={d.dateStr} className="border border-grid-line h-9 min-w-[56px]" />;
              }
              // If person is original but transferred out this day
              if (isOriginalGroup && tempTransferMap[person.id]?.[d.dateStr] && tempTransferMap[person.id][d.dateStr] !== group.id) {
                return <td key={d.dateStr} className="border border-grid-line h-9 min-w-[56px] bg-muted/30 text-[9px] text-center text-muted-foreground" title="Transferred">↗</td>;
              }

              // Prediction logic for admin
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

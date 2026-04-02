import { useMemo, useState } from 'react';
import { Person, Group, Shift, ShiftStatus } from '@/types/schedule';
import { ShiftCell } from './ShiftCell';
import { ShiftModal } from './ShiftModal';
import { Input } from '@/components/ui/input';
import { format, getDaysInMonth, isToday, isWeekend } from 'date-fns';
import { Search } from 'lucide-react';

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
}

function getPersonMonthlyHoursCalc(personId: string, shifts: Shift[], year: number, month: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return shifts
    .filter(s => s.personId === personId && s.date.startsWith(prefix))
    .reduce((sum, s) => {
      if (s.startHour !== undefined && s.endHour !== undefined) {
        return sum + (s.endHour - s.startHour);
      }
      return sum;
    }, 0);
}

  return shifts
    .filter(s => peopleIds.has(s.personId) && s.date === dateStr)
    .reduce((sum, s) => {
      if (s.startHour !== undefined && s.endHour !== undefined) {
        return sum + (s.endHour - s.startHour);
      }
      return sum;
    }, 0);
}

export function ScheduleGrid({ year, month, people, groups, shifts, statuses, getShift, onSetShift, onRemoveShift, filterGroup, searchName, searchEmail }: ScheduleGridProps) {
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
      };
    });
  }, [year, month]);

  const sortedGroups = useMemo(() =>
    [...groups].sort((a, b) => a.order - b.order), [groups]
  );

  const filteredGroups = filterGroup === 'all'
    ? sortedGroups
    : sortedGroups.filter(g => g.id === filterGroup);

  // Apply name/email search filters
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

  // Fixed columns count: Employee, Email, Hours = 3
  const fixedCols = 3;

  return (
    <>
      <div className="overflow-auto flex-1 border border-grid-line rounded-lg bg-card">
        <table className="border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            {/* Daily totals row */}
            <tr className="bg-muted/50">
              <th colSpan={fixedCols} className="sticky left-0 z-20 bg-muted/50 border border-grid-line px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">
                Daily Hours
              </th>
              {days.map(d => {
                const total = getDailyTotalHours(allVisiblePeopleIds, shifts, d.dateStr);
                return (
                  <th key={d.dateStr} className={`border border-grid-line px-0.5 py-1 text-center text-[10px] font-semibold min-w-[48px] ${d.isToday ? 'bg-grid-today' : ''}`}>
                    {total > 0 ? total : ''}
                  </th>
                );
              })}
            </tr>
            {/* Header row */}
            <tr className="bg-grid-header">
              <th className="sticky left-0 z-20 bg-grid-header border border-grid-line px-3 py-2 text-left min-w-[150px] font-semibold">
                Employee
              </th>
              <th className="sticky left-[150px] z-20 bg-grid-header border border-grid-line px-2 py-2 text-left min-w-[140px] font-semibold">
                Email
              </th>
              <th className="sticky left-[290px] z-20 bg-grid-header border border-grid-line px-2 py-2 text-center min-w-[50px] font-semibold">
                Hours
              </th>
              {days.map(d => (
                <th
                  key={d.day}
                  className={`border border-grid-line px-0.5 py-1 text-center font-medium min-w-[48px] ${d.isToday ? 'bg-grid-today' : ''} ${d.isWeekend ? 'text-destructive' : ''}`}
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
              if (groupPeople.length === 0 && filterGroup === 'all' && !searchName && !searchEmail) return null;
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
                  onCellClick={(person, date) => setModalData({ person, date })}
                  totalCols={days.length}
                  year={year}
                  month={month}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {modalData && (
        <ShiftModal
          open={!!modalData}
          onClose={() => setModalData(null)}
          personName={modalData.person.name}
          date={modalData.date}
          existingShift={existingShift}
          statuses={statuses}
          onSave={(data) => {
            onSetShift({
              id: existingShift?.id || `shift-${Date.now()}`,
              personId: modalData.person.id,
              date: modalData.date,
              ...data,
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

function GroupRows({ group, people, days, shifts, statuses, getShift, onCellClick, totalCols, year, month }: {
  group: Group;
  people: Person[];
  days: { day: number; dateStr: string; dayName: string; isToday: boolean; isWeekend: boolean }[];
  shifts: Shift[];
  statuses: ShiftStatus[];
  getShift: (personId: string, date: string) => Shift | undefined;
  onCellClick: (person: Person, date: string) => void;
  totalCols: number;
  year: number;
  month: number;
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
        const monthlyHours = getPersonMonthlyHours(person.id, shifts, statuses, year, month);
        return (
          <tr key={person.id} className="hover:bg-muted/30">
            <td className="sticky left-0 z-[5] bg-card border border-grid-line px-3 py-1 font-medium whitespace-nowrap text-xs min-w-[150px]">
              {person.name}
            </td>
            <td className="sticky left-[150px] z-[5] bg-card border border-grid-line px-2 py-1 text-xs text-muted-foreground whitespace-nowrap truncate min-w-[140px] max-w-[140px]">
              {person.email || '—'}
            </td>
            <td className="sticky left-[290px] z-[5] bg-card border border-grid-line px-2 py-1 text-xs text-center font-semibold min-w-[50px]">
              {monthlyHours > 0 ? monthlyHours : '—'}
            </td>
            {days.map(d => (
              <ShiftCell
                key={d.dateStr}
                shift={getShift(person.id, d.dateStr)}
                statuses={statuses}
                isToday={d.isToday}
                isWeekend={d.isWeekend}
                onClick={() => onCellClick(person, d.dateStr)}
              />
            ))}
          </tr>
        );
      })}
    </>
  );
}

function getPersonMonthlyHours(personId: string, shifts: Shift[], statuses: ShiftStatus[], year: number, month: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return shifts
    .filter(s => s.personId === personId && s.date.startsWith(prefix))
    .reduce((sum, s) => {
      if (s.startHour !== undefined && s.endHour !== undefined) {
        return sum + (s.endHour - s.startHour);
      }
      return sum;
    }, 0);
}

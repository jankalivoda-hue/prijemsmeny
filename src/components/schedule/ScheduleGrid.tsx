import { useMemo, useState } from 'react';
import { Person, Group, Shift, ShiftStatus } from '@/types/schedule';
import { ShiftCell } from './ShiftCell';
import { ShiftModal } from './ShiftModal';
import { format, getDaysInMonth, isToday, isWeekend } from 'date-fns';

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
}

export function ScheduleGrid({ year, month, people, groups, shifts, statuses, getShift, onSetShift, onRemoveShift, filterGroup }: ScheduleGridProps) {
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

  const existingShift = modalData ? getShift(modalData.person.id, modalData.date) : undefined;

  return (
    <>
      <div className="overflow-auto flex-1 border border-grid-line rounded-lg bg-card">
        <table className="border-collapse text-xs w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-grid-header">
              <th className="sticky left-0 z-20 bg-grid-header border border-grid-line px-3 py-2 text-left min-w-[160px] font-semibold">
                Name
              </th>
              {days.map(d => (
                <th
                  key={d.day}
                  className={`border border-grid-line px-0.5 py-1 text-center font-medium min-w-[42px] ${d.isToday ? 'bg-grid-today' : ''} ${d.isWeekend ? 'text-destructive' : ''}`}
                >
                  <div>{d.dayName}</div>
                  <div className="font-semibold">{d.day}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map(group => {
              const groupPeople = people.filter(p => p.groupId === group.id);
              if (groupPeople.length === 0 && filterGroup === 'all') return null;
              return (
                <GroupRows
                  key={group.id}
                  group={group}
                  people={groupPeople}
                  days={days}
                  statuses={statuses}
                  getShift={getShift}
                  onCellClick={(person, date) => setModalData({ person, date })}
                  totalCols={days.length}
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

function GroupRows({ group, people, days, statuses, getShift, onCellClick, totalCols }: {
  group: Group;
  people: Person[];
  days: { day: number; dateStr: string; dayName: string; isToday: boolean; isWeekend: boolean }[];
  statuses: ShiftStatus[];
  getShift: (personId: string, date: string) => Shift | undefined;
  onCellClick: (person: Person, date: string) => void;
  totalCols: number;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={totalCols + 1}
          className="sticky left-0 bg-group-header border border-grid-line px-3 py-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider"
        >
          {group.name} ({people.length})
        </td>
      </tr>
      {people.map(person => (
        <tr key={person.id} className="hover:bg-muted/30">
          <td className="sticky left-0 z-[5] bg-card border border-grid-line px-3 py-1 font-medium whitespace-nowrap text-xs">
            {person.name}
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
      ))}
    </>
  );
}

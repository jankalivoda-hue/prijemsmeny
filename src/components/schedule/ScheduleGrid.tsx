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

export function ScheduleGrid({ year, month, people, groups, shifts, statuses, getShift, onSetShift, onRemoveShift, filterGroup, searchName, isAdmin, getMostFrequentShift }: ScheduleGridProps) {
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
    if (searchName) result = result.filter(p => p.name.toLowerCase().includes(searchName.toLowerCase()));
    return result;
  }, [people, searchName]);

  const allVisiblePeopleIds = useMemo(() => new Set(filteredPeople.map(p => p.id)), [filteredPeople]);
  const existingShift = modalData ? getShift(modalData.person.id, modalData.date) : undefined;

  return (
    <>
      <div className="relative flex-1 overflow-auto border border-grid-line rounded-lg bg-card no-scrollbar shadow-sm" style={{ maxHeight: 'calc(100vh - 130px)' }}>
        {/* table-fixed je zásadní pro odstranění mezer */}
        <table className="border-separate border-spacing-0 table-fixed min-w-max">
          <colgroup>
            {/* Definice šířek sloupců pro celou tabulku */}
            <col className="w-[140px] md:w-[150px]" />
            <col className="hidden md:table-column md:w-[140px]" />
            <col className="hidden md:table-column md:w-[50px]" />
            {days.map(d => (
              <col key={d.dateStr} className="w-[42px] md:w-[56px]" />
            ))}
          </colgroup>
          <thead>
            {/* 1. ŘÁDEK: Daily Hours */}
            <tr className="sticky top-0 z-50 bg-slate-50 h-8">
              <th className="sticky left-0 z-[60] bg-slate-100 border border-grid-line px-2 text-[10px] font-bold text-slate-500 uppercase">
                Daily Hrs
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
            
            {/* 2. ŘÁDEK: Headers */}
            <tr className="sticky top-[32px] z-50 bg-white shadow-md h-10">
              <th className="sticky left-0 z-[60] bg-white border border-grid-line px-2 text-left font-bold text-slate-700 text-[11px] md:text-sm shadow-[2px_0_2px_rgba(0,0,0,0.05)]">
                <span className="md:hidden">Name / Hrs</span>
                <span className="hidden md:inline">Employee Name</span>
              </th>
              <th className="hidden md:table-cell sticky left-[150px] z-[60] bg-white border border-grid-line px-2 text-left font-bold text-slate-700">
                Email
              </th>
              <th className="hidden md:table-cell sticky left-[290px] z-[60] bg-white border border-grid-line text-center font-bold text-slate-700 text-[10px] shadow-[2px_0_2px_rgba(0,0,0,0.05)]">
                Monthly
              </th>
              {days.map(d => (
                <th key={d.day} className={`border border-grid-line px-0.5 text-center font-bold ${d.isToday ? 'bg-blue-50 text-blue-600' : ''} ${d.isWeekend ? 'text-red-500 bg-red-50/30' : 'text-slate-600'}`}>
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
                  onCellClick={isAdmin ? (person: Person, dateStr: string) => setModalData({ person, date: dateStr }) : undefined}
                  totalCols={days.length}
                  year={year}
                  month={month}
                  isAdmin={isAdmin}
                  getMostFrequentShift={getMostFrequentShift}
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

function GroupRows({ group, people, days, shifts, statuses, getShift, onCellClick, totalCols, year, month, isAdmin, getMostFrequentShift }: any) {
  return (
    <>
      <tr>
        <td colSpan={totalCols + 4} className="sticky left-0 border border-grid-line px-2 py-1.5 font-bold text-[9px] uppercase tracking-wider bg-white shadow-sm z-10" style={{ color: `hsl(${group.color})`, borderLeft: `3px solid hsl(${group.color})` }}>
          {group.name} ({people.length})
        </td>
      </tr>
      {people.map((person: any) => {
        const monthlyHours = getPersonMonthlyHours(person.id, shifts, year, month);
        const rounded = Math.round(monthlyHours * 100) / 100;
        return (
          <tr key={person.id} className="h-12 hover:bg-muted/30 transition-colors">
            {/* Jméno */}
            <td className="sticky left-0 z-[20] bg-white border border-grid-line px-2 py-1 shadow-[2px_0_2px_rgba(0,0,0,0.05)]">
              <div className="font-bold text-[11px] md:text-xs truncate leading-tight">
                {person.name}
              </div>
              <div className="text-[10px] text-blue-600 font-bold md:hidden mt-0.5">
                {rounded > 0 ? `${rounded}h` : '0h'}
              </div>
            </td>

            {/* Email - pouze PC */}
            <td className="hidden md:table-cell sticky left-[150px] z-[20] bg-white border border-grid-line px-2 py-0 text-xs text-muted-foreground truncate">
              {person.email || '—'}
            </td>

            {/* Hodiny samostatně - pouze PC */}
            <td className="hidden md:table-cell sticky left-[290px] z-[20] bg-slate-50 border border-grid-line px-1 py-0 text-xs text-center font-bold shadow-[2px_0_2px_rgba(0,0,0,0.05)]">
              {rounded > 0 ? rounded : '—'}
            </td>

            {days.map((d: any) => {
              const realShift = getShift(person.id, d.dateStr);
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

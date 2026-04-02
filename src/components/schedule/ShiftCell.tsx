import { Shift, ShiftStatus } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface ShiftCellProps {
  shift?: Shift;
  statuses: ShiftStatus[];
  isToday: boolean;
  isWeekend: boolean;
  onClick: () => void;
}

export function ShiftCell({ shift, statuses, isToday, isWeekend, onClick }: ShiftCellProps) {
  const status = shift ? statuses.find(s => s.id === shift.statusId) : null;

  const getLabel = () => {
    if (!shift || !status) return '';
    if (shift.startHour !== undefined && shift.endHour !== undefined) {
      const sh = String(shift.startHour).padStart(2, '0');
      const eh = String(shift.endHour).padStart(2, '0');
      return `${sh}-${eh}`;
    }
    return status.label.slice(0, 3).toUpperCase();
  };

  const getTooltip = () => {
    if (!shift || !status) return 'Click to add shift';
    let tip = status.label;
    if (shift.startHour !== undefined && shift.endHour !== undefined) {
      tip += ` (${String(shift.startHour).padStart(2, '0')}:00 - ${String(shift.endHour).padStart(2, '0')}:00)`;
    }
    if (shift.note) tip += ` — ${shift.note}`;
    return tip;
  };

  return (
    <td
      className={cn(
        'border border-grid-line h-9 min-w-[48px] max-w-[56px] text-center text-[10px] cursor-pointer transition-colors hover:opacity-80 select-none font-medium',
        isToday && 'ring-2 ring-primary ring-inset',
        isWeekend && !shift && 'bg-muted/60',
      )}
      style={status ? {
        backgroundColor: `hsl(${status.color})`,
        color: `hsl(0 0% 100%)`,
      } : undefined}
      onClick={onClick}
      title={getTooltip()}
    >
      {getLabel()}
    </td>
  );
}

import { Shift, ShiftStatus } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface ShiftCellProps {
  shift?: Shift;
  statuses: ShiftStatus[];
  isToday: boolean;
  isWeekend: boolean;
  onClick: () => void;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function ShiftCell({ shift, statuses, isToday, isWeekend, onClick }: ShiftCellProps) {
  const status = shift ? statuses.find(s => s.id === shift.statusId) : null;

  const getLabel = () => {
    if (!shift || !status) return '';
    const startMins = shift.startMinute ?? (shift.startHour != null ? shift.startHour * 60 : undefined);
    const endMins = shift.endMinute ?? (shift.endHour != null ? shift.endHour * 60 : undefined);
    if (startMins != null && endMins != null) {
      return `${formatMinutes(startMins)}-${formatMinutes(endMins)}`;
    }
    return status.label.slice(0, 3).toUpperCase();
  };

  const getTooltip = () => {
    if (!shift || !status) return 'Click to add shift';
    let tip = status.label;
    const startMins = shift.startMinute ?? (shift.startHour != null ? shift.startHour * 60 : undefined);
    const endMins = shift.endMinute ?? (shift.endHour != null ? shift.endHour * 60 : undefined);
    if (startMins != null && endMins != null) {
      tip += ` (${formatMinutes(startMins)} - ${formatMinutes(endMins)})`;
    }
    if (shift.note) tip += ` — ${shift.note}`;
    return tip;
  };

  return (
    <td
      className={cn(
        'border border-grid-line h-9 min-w-[56px] max-w-[64px] text-center text-[9px] cursor-pointer transition-colors hover:opacity-80 select-none font-medium',
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

import { Shift, ShiftStatus } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface ShiftCellProps {
  shift?: Shift;
  statuses: ShiftStatus[];
  isToday: boolean;
  isWeekend: boolean;
  onClick: () => void;
  isTempTransfer?: boolean;
  isPrediction?: boolean;
  isReadOnly?: boolean;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function ShiftCell({ shift, statuses, isToday, isWeekend, onClick, isTempTransfer, isPrediction, isReadOnly }: ShiftCellProps) {
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
    if (isPrediction) return 'Predicted shift (click to confirm)';
    if (!shift || !status) return isReadOnly ? '' : 'Click to add shift';
    let tip = status.label;
    if (isTempTransfer) tip += ' (temp transfer)';
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
        'border border-grid-line h-9 min-w-[56px] max-w-[64px] text-center text-[9px] transition-colors select-none font-medium',
        !isReadOnly && 'cursor-pointer hover:opacity-80',
        isReadOnly && 'cursor-default',
        isToday && 'ring-2 ring-primary ring-inset',
        isWeekend && !shift && 'bg-muted/60',
        isTempTransfer && 'opacity-50',
        isPrediction && 'opacity-40',
      )}
      style={status ? {
        backgroundColor: isPrediction ? `hsl(0 0% 75%)` : `hsl(${status.color})`,
        color: `hsl(0 0% 100%)`,
      } : undefined}
      onClick={isReadOnly ? undefined : onClick}
      title={getTooltip()}
    >
      {getLabel()}
    </td>
  );
}

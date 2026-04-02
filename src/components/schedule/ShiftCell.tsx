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
      return `${shift.startHour}:00-${shift.endHour}:00`;
    }
    return status.label.slice(0, 3).toUpperCase();
  };

  return (
    <td
      className={cn(
        'border border-grid-line h-9 min-w-[42px] max-w-[52px] text-center text-[10px] cursor-pointer transition-colors hover:opacity-80 select-none',
        isToday && 'ring-2 ring-primary ring-inset',
        isWeekend && !shift && 'bg-muted/60',
      )}
      style={status ? {
        backgroundColor: `hsl(${status.color})`,
        color: `hsl(0 0% 100%)`,
      } : undefined}
      onClick={onClick}
      title={shift?.note || status?.label || 'Click to add shift'}
    >
      {getLabel()}
    </td>
  );
}

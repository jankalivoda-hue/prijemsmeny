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
  
  // Zjistíme, zda jde o požadavek od uživatele (is_request)
  const isRequest = shift?.is_request === true;

  const getLabel = () => {
    if (!shift || !status) return '';
    
    const startMins = shift.startMinute ?? (shift.startHour != null ? shift.startHour * 60 : undefined);
    const endMins = shift.endMinute ?? (shift.endHour != null ? shift.endHour * 60 : undefined);
    
    let label = '';
    if (startMins != null && endMins != null) {
      label = `${formatMinutes(startMins)}-${formatMinutes(endMins)}`;
    } else {
      label = status.label.slice(0, 3).toUpperCase();
    }

    // Pokud je to požadavek, přidáme malou značku
    return isRequest ? `REQ: ${label}` : label;
  };

  const getTooltip = () => {
    if (isPrediction) return 'Predicted shift (click to confirm)';
    if (isRequest) return `POŽADAVEK ZAMĚSTNANCE: ${status?.label}`;
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

  // Definice stylu pro šrafování (použijeme pro požadavky)
  const requestStyle = isRequest ? {
    backgroundImage: `linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)`,
    backgroundSize: '10px 10px',
  } : {};

  return (
    <td
      className={cn(
        'border border-grid-line h-9 min-w-[56px] max-w-[64px] text-center text-[9px] transition-colors select-none font-medium relative',
        !isReadOnly && 'cursor-pointer hover:opacity-80',
        isReadOnly && 'cursor-default',
        isToday && 'ring-2 ring-primary ring-inset',
        isWeekend && !shift && 'bg-muted/60',
        isTempTransfer && 'opacity-50',
        isPrediction && 'opacity-40',
        isRequest && 'opacity-70 italic' // Požadavky jsou lehce vybledlé a kurzívou
      )}
      style={status ? {
        backgroundColor: isPrediction ? `hsl(0 0% 75%)` : `hsl(${status.color})`,
        color: `hsl(0 0% 100%)`,
        ...requestStyle
      } : undefined}
      onClick={isReadOnly ? undefined : onClick}
      title={getTooltip()}
    >
      <div className="flex flex-col items-center justify-center leading-[1.1]">
        {getLabel()}
      </div>
    </td>
  );
}

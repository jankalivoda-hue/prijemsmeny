import { Shift, ShiftStatus } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface ShiftCellProps {
  shift?: Shift;
  statuses: ShiftStatus[];
  isToday: boolean;
  isWeekend: boolean;
  onClick: () => void;
  isTempTransfer?: boolean;
  isPrediction?: boolean; // Signalizuje šedou "předpověď" nejčastější směny
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

    // Pokud je to požadavek, přidáme malou značku REQ
    if (isRequest) return `REQ: ${label}`;
    return label;
  };

  const getTooltip = () => {
    if (isPrediction) return 'Nejčastější směna (kliknutím potvrdíte)';
    if (isRequest) return `POŽADAVEK ZAMĚSTNANCE: ${status?.label}`;
    if (!shift || !status) return isReadOnly ? '' : 'Kliknutím přidáte směnu';
    
    let tip = status.label;
    if (isTempTransfer) tip += ' (dočasný přesun)';
    
    const startMins = shift.startMinute ?? (shift.startHour != null ? shift.startHour * 60 : undefined);
    const endMins = shift.endMinute ?? (shift.endHour != null ? shift.endHour * 60 : undefined);
    
    if (startMins != null && endMins != null) {
      tip += ` (${formatMinutes(startMins)} - ${formatMinutes(endMins)})`;
    }
    if (shift.note) tip += ` — ${shift.note}`;
    return tip;
  };

  // Dynamický styl buňky
  const cellStyle: React.CSSProperties = {};

  if (status) {
    if (isPrediction) {
      // Styl pro předpověď: světle šedá, šedý text, přerušovaný okraj
      cellStyle.backgroundColor = 'hsl(0 0% 95%)';
      cellStyle.color = 'hsl(0 0% 40%)';
      cellStyle.border = '1px dashed hsl(0 0% 70%)';
    } else {
      // Standardní barva statusu
      cellStyle.backgroundColor = `hsl(${status.color})`;
      cellStyle.color = 'white';
    }

    // Pokud jde o požadavek, přidáme šrafování (diagonal lines)
    if (isRequest) {
      cellStyle.backgroundImage = `linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)`;
      cellStyle.backgroundSize = '10px 10px';
    }
  }

  return (
    <td
      className={cn(
        'border border-grid-line h-9 min-w-[56px] max-w-[64px] text-center text-[9px] transition-all select-none font-medium relative',
        !isReadOnly && 'cursor-pointer hover:brightness-95',
        isReadOnly && 'cursor-default',
        isToday && 'ring-2 ring-primary ring-inset z-10',
        isWeekend && !shift && 'bg-muted/60',
        isTempTransfer && 'opacity-50',
        isPrediction && 'opacity-60 grayscale', // Předpověď je utlumená
        isRequest && 'opacity-80 italic' // Požadavek je lehce průhledný a kurzívou
      )}
      style={cellStyle}
      onClick={isReadOnly ? undefined : onClick}
      title={getTooltip()}
    >
      <div className="flex flex-col items-center justify-center leading-[1.1]">
        {getLabel()}
      </div>
    </td>
  );
}

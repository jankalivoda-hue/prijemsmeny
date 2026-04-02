import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shift, ShiftStatus, Group } from '@/types/schedule';
import { Trash2, AlertCircle, Clock } from 'lucide-react';

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  date: string;
  existingShift?: Shift;
  statuses: ShiftStatus[];
  groups: Group[];
  currentGroupId: string;
  isAdmin: boolean;
  onSave: (shift: Omit<Shift, 'id' | 'personId' | 'date'>) => void;
  onDelete: () => void;
}

// Generování 15minutových intervalů: "00:00" až "24:00"
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}
TIME_OPTIONS.push('24:00');

function minutesToTimeStr(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeStrToMinutes(str: string): number {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

export function ShiftModal({ 
  open, 
  onClose, 
  personName, 
  date, 
  existingShift, 
  statuses, 
  groups, 
  currentGroupId, 
  isAdmin, 
  onSave, 
  onDelete 
}: ShiftModalProps) {
  
  const [statusId, setStatusId] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState(existingShift?.note || '');
  const [tempGroupId, setTempGroupId] = useState<string>('none');

  // FILTRACE STATUSŮ PRO UŽIVATELE (Volno, Dovolená, Nemocný, Směna)
  const availableStatuses = useMemo(() => {
    if (isAdmin) return statuses;
    return statuses.filter(s => {
      const label = s.label.toLowerCase();
      return (
        label.includes('volno') || 
        label.includes('dovolená') || 
        label.includes('nemoc') || 
        s.type === 'work'
      );
    });
  }, [statuses, isAdmin]);

  useEffect(() => {
    if (open) {
      // Pokud existuje směna, použijeme její status, jinak první dostupný z filtrovaného seznamu
      setStatusId(existingShift?.statusId || (availableStatuses[0]?.id || ''));
      
      const startMins = existingShift?.startMinute ?? (existingShift?.startHour != null ? existingShift.startHour * 60 : 480);
      const endMins = existingShift?.endMinute ?? (existingShift?.endHour != null ? existingShift.endHour * 60 : 1020);
      
      setStartTime(minutesToTimeStr(startMins));
      setEndTime(minutesToTimeStr(endMins));
      setNote(existingShift?.note || '');
      setTempGroupId(existingShift?.tempGroupId || 'none');
    }
  }, [open, existingShift, availableStatuses]);

  const selectedStatus = statuses.find(s => s.id === statusId);
  const isWorkShift = selectedStatus?.type === 'work';

  const startMins = timeStrToMinutes(startTime);
  const filteredEndOptions = TIME_OPTIONS.filter(t => timeStrToMinutes(t) > startMins);

  const handleInternalSave = () => {
    const sMins = timeStrToMinutes(startTime);
    const eMins = timeStrToMinutes(endTime);
    
    onSave({
      statusId,
      startMinute: isWorkShift ? sMins : undefined,
      endMinute: isWorkShift ? eMins : undefined,
      startHour: isWorkShift ? Math.floor(sMins / 60) : undefined,
      endHour: isWorkShift ? Math.ceil(eMins / 60) : undefined,
      note: note || undefined,
      tempGroupId: isAdmin && tempGroupId !== 'none' ? tempGroupId : undefined,
      is_request: !isAdmin, // Uživatel vždy ukládá jako požadavek (šrafovaně)
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center justify-between">
            <span>{personName} — {date}</span>
            {!isAdmin && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">
                Požadavek
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-2 items-start">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-tight">
              Vytváříte požadavek, který musí admin potvrdit. Admin může váš požadavek změnit na ostrou směnu.
            </p>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* VÝBĚR STATUSU */}
          <div>
            <Label className="text-xs font-bold uppercase text-muted-foreground">Typ požadavku</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="mt-1 h-11">
                <SelectValue placeholder="Vyberte typ..." />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${s.color})` }} />
                      <span className="font-medium">{s.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* VÝBĚR ČASU - Pouze pokud jde o směnu */}
          {isWorkShift && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Čas směny (15 min intervaly)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Od</Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.filter(t => t !== '24:00').map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Do</Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {filteredEndOptions.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* TRANSFER - Pouze Admin */}
          {isAdmin && (
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground">Dočasný přesun mezi sklady</Label>
              <Select value={tempGroupId} onValueChange={setTempGroupId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ponechat v původním skladu</SelectItem>
                  {groups.filter(g => g.id !== currentGroupId).map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs font-bold uppercase text-muted-foreground">Poznámka</Label>
            <Input 
              className="mt-1 h-11" 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              placeholder="Doplňující informace..." 
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {existingShift && (isAdmin || existingShift.is_request) && (
            <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" /> Odstranit
            </Button>
          )}
          <div className="flex gap-2 ml-auto w-full sm:w-auto">
            <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">Zrušit</Button>
            <Button onClick={handleInternalSave} className="flex-1 sm:flex-none font-bold">
              {isAdmin ? 'Uložit' : 'Odeslat požadavek'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

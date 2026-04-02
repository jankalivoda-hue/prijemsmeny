import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shift, ShiftStatus, Group } from '@/types/schedule';
import { Trash2, AlertCircle } from 'lucide-react';

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  date: string;
  existingShift?: Shift;
  statuses: ShiftStatus[];
  groups: Group[];
  currentGroupId: string;
  isAdmin: boolean; // PŘIDÁNO: Rozlišení role
  onSave: (shift: Omit<Shift, 'id' | 'personId' | 'date'>) => void;
  onDelete: () => void;
}

// Generate 15-min interval options: "00:00" to "24:00"
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

export function ShiftModal({ open, onClose, personName, date, existingShift, statuses, groups, currentGroupId, isAdmin, onSave, onDelete }: ShiftModalProps) {
  const [statusId, setStatusId] = useState(existingShift?.statusId || 'work');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState(existingShift?.note || '');
  const [tempGroupId, setTempGroupId] = useState<string>('none');

  useEffect(() => {
    if (open) {
      setStatusId(existingShift?.statusId || 'work');
      const startMins = existingShift?.startMinute ?? (existingShift?.startHour != null ? existingShift.startHour * 60 : 480);
      const endMins = existingShift?.endMinute ?? (existingShift?.endHour != null ? existingShift.endHour * 60 : 1020);
      setStartTime(minutesToTimeStr(startMins));
      setEndTime(minutesToTimeStr(endMins));
      setNote(existingShift?.note || '');
      setTempGroupId(existingShift?.tempGroupId || 'none');
    }
  }, [open, existingShift]);

  const selectedStatus = statuses.find(s => s.id === statusId);
  const isWorkShift = selectedStatus?.type === 'work';

  const startMins = timeStrToMinutes(startTime);
  const filteredEndOptions = TIME_OPTIONS.filter(t => timeStrToMinutes(t) > startMins);

  // Filtrování statusů pro běžného uživatele (pokud chceš, aby si mohl žádat jen o určité věci)
  const availableStatuses = isAdmin 
    ? statuses 
    : statuses.filter(s => ['work', 'vacation', 'sick', 'off'].includes(s.id) || s.type !== 'work');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center justify-between">
            <span>{personName} — {date}</span>
            {!isAdmin && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase font-bold">
                Požadavek
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-2 items-start">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Vytváříte požadavek na směnu nebo volno. Admin jej musí schválit, aby se stal závazným.
            </p>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div>
            <Label>Status</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: `hsl(${s.color})` }} />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isWorkShift && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.filter(t => t !== '24:00').map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {filteredEndOptions.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isAdmin && (
            <div>
              <Label>Temporary Group Transfer</Label>
              <Select value={tempGroupId} onValueChange={setTempGroupId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No transfer (stay in original group)</SelectItem>
                  {groups.filter(g => g.id !== currentGroupId).map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Note (optional)</Label>
            <Input className="mt-1" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {existingShift && (isAdmin || existingShift.is_request) && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => {
              const sMins = timeStrToMinutes(startTime);
              const eMins = timeStrToMinutes(endTime);
              onSave({
                statusId,
                startMinute: isWorkShift ? sMins : undefined,
                endMinute: isWorkShift ? eMins : undefined,
                startHour: isWorkShift ? Math.floor(sMins / 60) : undefined,
                endHour: isWorkShift ? Math.ceil(eMins / 60) : undefined,
                note: note || undefined,
                tempGroupId: tempGroupId !== 'none' ? tempGroupId : undefined,
                is_request: !isAdmin, // LOGIKA: Pokud není admin, je to vždy jen požadavek
              });
              onClose();
            }}>
              {isAdmin ? 'Save' : 'Send Request'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shift, ShiftStatus } from '@/types/schedule';
import { Trash2 } from 'lucide-react';

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  date: string;
  existingShift?: Shift;
  statuses: ShiftStatus[];
  onSave: (shift: Omit<Shift, 'id' | 'personId' | 'date'>) => void;
  onDelete: () => void;
}

const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0-24

export function ShiftModal({ open, onClose, personName, date, existingShift, statuses, onSave, onDelete }: ShiftModalProps) {
  const [statusId, setStatusId] = useState(existingShift?.statusId || 'work');
  const [startHour, setStartHour] = useState(existingShift?.startHour ?? 8);
  const [endHour, setEndHour] = useState(existingShift?.endHour ?? 17);
  const [note, setNote] = useState(existingShift?.note || '');

  useEffect(() => {
    if (open) {
      setStatusId(existingShift?.statusId || 'work');
      setStartHour(existingShift?.startHour ?? 8);
      setEndHour(existingShift?.endHour ?? 17);
      setNote(existingShift?.note || '');
    }
  }, [open, existingShift]);

  const selectedStatus = statuses.find(s => s.id === statusId);
  const isWorkShift = selectedStatus?.type === 'work';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {personName} — {date}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Status</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(s => (
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
                <Label>Start Hour</Label>
                <Select value={String(startHour)} onValueChange={v => setStartHour(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.filter(h => h < 24).map(h => (
                      <SelectItem key={h} value={String(h)}>{`${h}:00`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Hour</Label>
                <Select value={String(endHour)} onValueChange={v => setEndHour(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.filter(h => h > startHour).map(h => (
                      <SelectItem key={h} value={String(h)}>{`${h}:00`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div>
            <Label>Note (optional)</Label>
            <Input className="mt-1" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          {existingShift && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => {
              onSave({
                statusId,
                startHour: isWorkShift ? startHour : undefined,
                endHour: isWorkShift ? endHour : undefined,
                note: note || undefined,
              });
              onClose();
            }}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

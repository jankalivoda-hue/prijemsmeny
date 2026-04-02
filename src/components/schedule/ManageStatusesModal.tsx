import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShiftStatus } from '@/types/schedule';
import { Plus, Trash2 } from 'lucide-react';

interface ManageStatusesModalProps {
  open: boolean;
  onClose: () => void;
  statuses: ShiftStatus[];
  onAddStatus: (status: ShiftStatus) => void;
  onRemoveStatus: (id: string) => void;
}

const PRESET_COLORS = [
  '217 91% 50%', '142 71% 45%', '38 92% 50%', '0 84% 60%',
  '270 60% 55%', '180 60% 45%', '330 65% 55%', '50 85% 50%',
];

export function ManageStatusesModal({ open, onClose, statuses, onAddStatus, onRemoveStatus }: ManageStatusesModalProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[4]);
  const [newType, setNewType] = useState('custom');

  const add = () => {
    if (!newLabel.trim()) return;
    onAddStatus({
      id: `status-${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      color: newColor,
    });
    setNewLabel('');
  };

  const builtIn = ['work', 'dayoff', 'vacation', 'sick'];

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Shift Types</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {statuses.map(s => (
            <div key={s.id} className="flex items-center gap-3 text-sm">
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: `hsl(${s.color})` }} />
              <span className="flex-1">{s.label}</span>
              {!builtIn.includes(s.id) && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveStatus(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="border-t pt-4 mt-4 space-y-3">
          <Label className="text-xs font-medium">Add Custom Status</Label>
          <div className="flex gap-2">
            <Input placeholder="Label" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="flex-1"
              onKeyDown={e => e.key === 'Enter' && add()} />
            <Button size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button key={c} className={`w-6 h-6 rounded-full border-2 transition-all ${c === newColor ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: `hsl(${c})` }}
                onClick={() => setNewColor(c)} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShiftStatus } from '@/types/schedule';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface ManageStatusesModalProps {
  open: boolean;
  onClose: () => void;
  statuses: ShiftStatus[];
  onAddStatus: (status: ShiftStatus) => void;
  onUpdateStatus: (id: string, updates: Partial<ShiftStatus>) => void;
  onRemoveStatus: (id: string) => void;
}

const PRESET_COLORS = [
  '217 91% 50%', '142 71% 45%', '38 92% 50%', '0 84% 60%',
  '270 60% 55%', '180 60% 45%', '330 65% 55%', '50 85% 50%',
  '200 70% 50%', '160 55% 45%', '30 75% 50%', '340 60% 50%',
  '120 60% 42%', '240 50% 40%', '310 50% 50%', '80 50% 45%',
];

export function ManageStatusesModal({ open, onClose, statuses, onAddStatus, onUpdateStatus, onRemoveStatus }: ManageStatusesModalProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[4]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');

  const add = () => {
    if (!newLabel.trim()) return;
    onAddStatus({
      id: `status-${Date.now()}`,
      label: newLabel.trim(),
      type: 'custom',
      color: newColor,
    });
    setNewLabel('');
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Shift Types</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {statuses.map(s => (
            <div key={s.id} className="flex items-center gap-3 text-sm">
              {editingId === s.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2 items-center">
                    <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="h-7 text-sm flex-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      onUpdateStatus(s.id, { label: editLabel, color: editColor });
                      setEditingId(null);
                    }}><Check className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button key={c}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${c === editColor ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: `hsl(${c})` }}
                        onClick={() => setEditColor(c)} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Custom HSL:</Label>
                    <Input value={editColor} onChange={e => setEditColor(e.target.value)} className="h-7 text-xs flex-1" placeholder="e.g. 217 91% 50%" />
                    <span className="w-5 h-5 rounded-full shrink-0 border" style={{ backgroundColor: `hsl(${editColor})` }} />
                  </div>
                </div>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: `hsl(${s.color})` }} />
                  <span className="flex-1">{s.label}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    setEditingId(s.id);
                    setEditLabel(s.label);
                    setEditColor(s.color);
                  }}><Edit2 className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveStatus(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
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
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button key={c} className={`w-5 h-5 rounded-full border-2 transition-all ${c === newColor ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: `hsl(${c})` }}
                onClick={() => setNewColor(c)} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

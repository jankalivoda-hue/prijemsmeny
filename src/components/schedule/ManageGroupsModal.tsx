import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Group } from '@/types/schedule';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManageGroupsModalProps {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  onAddGroup: (group: Group) => void;
  onUpdateGroup: (id: string, updates: Partial<Group>) => void;
  onRemoveGroup: (id: string) => void;
  peopleCountByGroup: Record<string, number>;
}

const PRESET_COLORS = [
  '200 70% 50%', '190 65% 45%', '160 55% 45%', '210 80% 55%',
  '30 75% 50%', '260 55% 50%', '340 60% 50%', '45 70% 50%',
  '55 65% 45%', '120 60% 42%', '240 50% 40%', '80 50% 45%',
  '180 55% 45%', '270 45% 45%', '0 70% 55%', '310 50% 50%',
];

export function ManageGroupsModal({ open, onClose, groups, onAddGroup, onUpdateGroup, onRemoveGroup, peopleCountByGroup }: ManageGroupsModalProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const add = () => {
    if (!newName.trim()) return;
    onAddGroup({
      id: `group-${Date.now()}`,
      name: newName.trim(),
      color: `${Math.floor(Math.random() * 360)} 60% 50%`,
      order: groups.length,
    });
    setNewName('');
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Groups</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input placeholder="New group name" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()} className="flex-1" />
          <Button size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
        <ScrollArea className="max-h-[450px]">
          <div className="space-y-1 mt-2">
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm">
                {editingId === g.id ? (
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 items-center">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm flex-1" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        onUpdateGroup(g.id, { name: editName, color: editColor });
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
                  </div>
                ) : (
                  <>
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: `hsl(${g.color})` }} />
                    <span className="flex-1 font-medium">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{peopleCountByGroup[g.id] || 0} people</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      setEditingId(g.id);
                      setEditName(g.name);
                      setEditColor(g.color);
                    }}><Edit2 className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveGroup(g.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

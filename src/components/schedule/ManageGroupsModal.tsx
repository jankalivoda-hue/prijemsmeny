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

export function ManageGroupsModal({ open, onClose, groups, onAddGroup, onUpdateGroup, onRemoveGroup, peopleCountByGroup }: ManageGroupsModalProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Groups</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input placeholder="New group name" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()} className="flex-1" />
          <Button size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1 mt-2">
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm">
                {editingId === g.id ? (
                  <>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm flex-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      onUpdateGroup(g.id, { name: editName });
                      setEditingId(null);
                    }}><Check className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{peopleCountByGroup[g.id] || 0} people</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      setEditingId(g.id);
                      setEditName(g.name);
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

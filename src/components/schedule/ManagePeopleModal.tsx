import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Person, Group } from '@/types/schedule';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManagePeopleModalProps {
  open: boolean;
  onClose: () => void;
  people: Person[];
  groups: Group[];
  onAddPerson: (person: Person) => void;
  onUpdatePerson: (id: string, updates: Partial<Person>) => void;
  onRemovePerson: (id: string) => void;
}

export function ManagePeopleModal({ open, onClose, people, groups, onAddPerson, onUpdatePerson, onRemovePerson }: ManagePeopleModalProps) {
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState(groups[0]?.id || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  const addPerson = () => {
    if (!newName.trim() || !newGroup) return;
    onAddPerson({
      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      groupId: newGroup,
    });
    setNewName('');
  };

  const filtered = filterGroup === 'all' ? people : people.filter(p => p.groupId === filterGroup);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage People</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 items-end">
          <Input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1"
            onKeyDown={e => e.key === 'Enter' && addPerson()} />
          <Select value={newGroup} onValueChange={setNewGroup}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Group" /></SelectTrigger>
            <SelectContent>
              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addPerson}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2 items-center mt-2">
          <span className="text-xs text-muted-foreground">Filter:</span>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} people</span>
        </div>
        <ScrollArea className="flex-1 max-h-[400px] mt-2">
          <div className="space-y-1">
            {filtered.map(p => {
              const group = groups.find(g => g.id === p.groupId);
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted text-sm">
                  {isEditing ? (
                    <>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm flex-1" />
                      <Select value={editGroup} onValueChange={setEditGroup}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        onUpdatePerson(p.id, { name: editName, groupId: editGroup });
                        setEditingId(null);
                      }}><Check className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{group?.name}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setEditingId(p.id);
                        setEditName(p.name);
                        setEditGroup(p.groupId);
                      }}><Edit2 className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemovePerson(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

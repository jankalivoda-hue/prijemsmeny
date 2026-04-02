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
  const [newEmail, setNewEmail] = useState('');
  const [newGroup, setNewGroup] = useState(groups[0]?.id || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  const addPerson = () => {
    if (!newName.trim() || !newGroup) return;
    onAddPerson({
      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      email: newEmail.trim(),
      groupId: newGroup,
    });
    setNewName('');
    setNewEmail('');
  };

  const filtered = filterGroup === 'all' ? people : people.filter(p => p.groupId === filterGroup);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      {/* ZVÝŠENÁ MAX-HEIGHT A PEVNÉ ROZVRŽENÍ */}
      <DialogContent className="sm:max-w-2xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden p-6">
        <DialogHeader>
          <DialogTitle>Manage People</DialogTitle>
        </DialogHeader>

        {/* SEKCE PRO PŘIDÁVÁNÍ (Zůstává nahoře) */}
        <div className="flex gap-2 items-end flex-wrap pb-4 border-b border-border">
          <Input 
            placeholder="Name" 
            value={newName} 
            onChange={e => setNewName(e.target.value)} 
            className="flex-1 min-w-[120px]"
            onKeyDown={e => e.key === 'Enter' && addPerson()} 
          />
          <Input 
            placeholder="Email" 
            value={newEmail} 
            onChange={e => setNewEmail(e.target.value)} 
            className="flex-1 min-w-[140px]"
            onKeyDown={e => e.key === 'Enter' && addPerson()} 
          />
          <Select value={newGroup} onValueChange={setNewGroup}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Group" /></SelectTrigger>
            <SelectContent>
              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addPerson}><Plus className="h-4 w-4" /></Button>
        </div>

        {/* FILTR (Zůstává nahoře) */}
        <div className="flex gap-2 items-center py-3">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Filter:</span>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-44 h-8 text-xs bg-muted/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto font-semibold">{filtered.length} people</span>
        </div>

        {/* SCROLLOVACÍ OBLAST - zabere zbytek místa */}
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-1 pr-4">
            {filtered.map(p => {
              const group = groups.find(g => g.id === p.groupId);
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} className="group flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-muted/50 border border-transparent hover:border-border">
                  {isEditing ? (
                    <>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm flex-1 bg-background" placeholder="Name" />
                      <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-8 text-sm flex-1 bg-background" placeholder="Email" />
                      <Select value={editGroup} onValueChange={setEditGroup}>
                        <SelectTrigger className="w-32 h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => {
                        onUpdatePerson(p.id, { name: editName, email: editEmail, groupId: editGroup });
                        setEditingId(null);
                      }}><Check className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{p.email || 'No email provided'}</div>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground whitespace-nowrap">
                        {group?.name}
                      </div>
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingId(p.id);
                          setEditName(p.name);
                          setEditEmail(p.email || '');
                          setEditGroup(p.groupId);
                        }}><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onRemovePerson(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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

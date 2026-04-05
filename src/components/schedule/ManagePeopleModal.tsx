import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Person, Group } from '@/types/schedule';
import { Plus, Trash2, Edit2, Check, X, Key, ShieldCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, UserRole } from '@/hooks/useAuth';

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
  const { isSuperAdmin } = useAuth(); // Zjistíme, zda má aktuální uživatel právo měnit role
  
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('1234');
  const [newGroup, setNewGroup] = useState(groups[0]?.id || '');
  const [newRole, setNewRole] = useState<UserRole>('user');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');
  
  const [filterGroup, setFilterGroup] = useState<string>('all');

  const addPerson = () => {
    if (!newName.trim() || !newGroup || !newPassword.trim()) return;
    onAddPerson({
      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      email: newEmail.trim(),
      password: newPassword.trim(),
      groupId: newGroup,
      role: newRole, 
    } as any);
    setNewName('');
    setNewEmail('');
    setNewPassword('1234');
    setNewRole('user');
  };

  const filtered = filterGroup === 'all' ? people : people.filter(p => p.groupId === filterGroup);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Správa uživatelů a přístupových práv
          </DialogTitle>
        </DialogHeader>

        {/* SEKCE PRO PŘIDÁVÁNÍ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2 items-end pb-4 border-b border-border">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Jméno (Login)</label>
            <Input placeholder="Jméno" value={newName} onChange={e => setNewName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email</label>
            <Input placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 text-primary flex items-center gap-1">
              <Key className="h-2.5 w-2.5" /> Heslo
            </label>
            <Input placeholder="Heslo" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-9 font-mono" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Skupina</label>
            <Select value={newGroup} onValueChange={setNewGroup}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Skupina" /></SelectTrigger>
              <SelectContent>
                {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Role</label>
            <Select value={newRole} onValueChange={(v: any) => setNewRole(v)} disabled={!isSuperAdmin}>
              <SelectTrigger className="h-9 text-xs font-semibold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="superadmin" className="text-red-600 font-bold">SuperAdmin</SelectItem>
                <SelectItem value="admin" className="text-blue-600 font-bold">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="user">User (Zaměstnanec)</SelectItem>
                <SelectItem value="viewer">Viewer (Divák)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="h-9 w-full font-bold" onClick={addPerson}><Plus className="h-4 w-4 mr-2" /> Přidat</Button>
        </div>

        {/* FILTR */}
        <div className="flex gap-2 items-center py-3">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Filtr skupiny:</span>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-44 h-8 text-xs bg-muted/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny skupiny</SelectItem>
              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto font-semibold">{filtered.length} osob</span>
        </div>

        {/* SEZNAM UŽIVATELŮ */}
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-1 pr-4">
            {filtered.map(p => {
              const group = groups.find(g => g.id === p.groupId);
              const isEditing = editingId === p.id;
              const roleLabel = (p as any).role || 'user';

              return (
                <div key={p.id} className="group flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-muted/50 border border-transparent hover:border-border">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 flex-1 items-center">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm md:col-span-1" />
                      <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-8 text-sm md:col-span-1" />
                      <Input value={editPassword} onChange={e => setEditPassword(e.target.value)} className="h-8 text-sm font-mono md:col-span-1" />
                      <Select value={editGroup} onValueChange={setEditGroup}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={editRole} onValueChange={(v: any) => setEditRole(v)} disabled={!isSuperAdmin}>
                        <SelectTrigger className="h-8 text-xs font-bold border-primary/50 text-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="superadmin" className="text-red-600 font-bold">SuperAdmin</SelectItem>
                          <SelectItem value="admin" className="text-blue-600 font-bold">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="user">User (Zaměstnanec)</SelectItem>
                          <SelectItem value="viewer">Viewer (Divák)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => {
                          onUpdatePerson(p.id, { name: editName, email: editEmail, password: editPassword, groupId: editGroup, role: editRole } as any);
                          setEditingId(null);
                        }}><Check className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm truncate">{p.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-sm ${
                            roleLabel === 'superadmin' ? 'bg-red-600 text-white' :
                            roleLabel === 'admin' ? 'bg-blue-500 text-white' :
                            roleLabel === 'editor' ? 'bg-amber-500 text-white' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {roleLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground truncate">{p.email || 'Bez emailu'}</span>
                          <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                            <Key className="h-2 w-2" /> {p.password}
                          </span>
                        </div>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground whitespace-nowrap">
                        {group?.name}
                      </div>
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingId(p.id);
                          setEditName(p.name);
                          setEditEmail(p.email || '');
                          setEditPassword(p.password || '');
                          setEditGroup(p.groupId);
                          setEditRole((p as any).role || 'user');
                        }}><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onRemovePerson(p.id)}>
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

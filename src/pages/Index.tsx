import { useState, useMemo, useEffect } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { useAuth } from '@/hooks/useAuth';
import { MonthSelector } from '@/components/schedule/MonthSelector';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { TrainingMatrix } from '@/components/schedule/TrainingMatrix';
import { ManagePeopleModal } from '@/components/schedule/ManagePeopleModal';
import { ManageGroupsModal } from '@/components/schedule/ManageGroupsModal';
import { ManageStatusesModal } from '@/components/schedule/ManageStatusesModal';
import { ExportPdfModal } from '@/components/schedule/ExportPdfModal';
import { ShiftModal } from '@/components/schedule/ShiftModal'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FolderOpen, Palette, CalendarDays, Search, FileDown, Lock, LogOut, LayoutList, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Person, Shift, Group } from '@/types/schedule';
import { ExportExcelButton } from '@/components/schedule/ExportExcelButton';
import { format } from 'date-fns';

const now = new Date();

// --- POMOCNÁ KOMPONENTA PRO ZMĚNU HESLA ---
function ChangePasswordModal({ open, userId }: { open: boolean; userId: string }) {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');

  const handleUpdatePassword = async () => {
    if (newPass.length < 4) {
      setError('Heslo musí mít alespoň 4 znaky.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Hesla se neshodují.');
      return;
    }

    const { error: dbError } = await supabase
      .from('people')
      .update({ password: newPass, must_change_password: false })
      .eq('id', userId);

    if (dbError) {
      setError('Chyba při ukládání hesla.');
    } else {
      const savedSession = localStorage.getItem('auth_session');
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        sessionData.must_change_password = false;
        localStorage.setItem('auth_session', JSON.stringify(sessionData));
      }
      window.location.reload(); 
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600">Změna hesla vyžadována</DialogTitle>
          <p className="text-sm text-muted-foreground">Při prvním přihlášení si prosím zvolte vlastní bezpečné heslo.</p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nové heslo</Label>
            <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Minimálně 4 znaky" />
          </div>
          <div className="space-y-2">
            <Label>Potvrzení hesla</Label>
            <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Zopakujte heslo" />
          </div>
          {error && <p className="text-xs text-red-500 font-bold italic">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleUpdatePassword} className="w-full h-12 font-bold">Uložit a pokračovat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Index = () => {
  const store = useScheduleStore();
  const { user, isAdmin, isSuperAdmin, isOnlyUser, login, logout } = useAuth(); // Přidáno login z useAuth
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'training'>('calendar');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filterGroup, setFilterGroup] = useState('all');
  const [searchName, setSearchName] = useState('');

  const [searchTrainingName, setSearchTrainingName] = useState('');
  const [filterTrainingStatus, setFilterTrainingStatus] = useState<string>('all');
  
  const [trainingRecords, setTrainingRecords] = useState<Record<string, string[]>>({});

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [showPeople, setShowPeople] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showStatuses, setShowStatuses] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [modalData, setModalData] = useState<{ person: Person; date: string } | null>(null);

  // --- OPRAVA BODU Č. 1: FUNKCE PRO PŘIHLÁŠENÍ BEZ REFRESHE ---
  const handleLogin = async () => {
    if (!loginUsername || !loginPass) return;
    const success = await login(loginUsername, loginPass);
    if (success) {
      // Vyčistíme pole po úspěšném loginu
      setLoginUsername('');
      setLoginPass('');
      // React automaticky zareaguje na změnu 'user' z useAuth a vykreslí dashboard
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const { data: groups } = await supabase.from('groups').select('*').order('order');
      if (groups) {
        groups.forEach(g => {
          if (!store.groups.find(eg => eg.id === g.id)) store.addGroup(g);
        });
      }

      const { data: people } = await supabase.from('people').select('*');
      if (people) {
        people.forEach(p => {
          if (!store.people.find(ep => ep.id === p.id)) {
            store.addPerson({ ...p, groupId: p.group_id });
          }
        });
      }

      const { data: shifts } = await supabase.from('shifts').select('*');
      if (shifts) {
        shifts.forEach(s => {
          store.setShift({
            id: s.id,
            personId: s.person_id,
            date: s.date,
            startHour: s.start_hour,
            startMinute: s.start_minute,
            endHour: s.end_hour,
            endMinute: s.end_minute,
            statusId: s.status_id,
            isPrediction: s.is_prediction,
            tempGroupId: s.temp_group_id,
            is_request: s.is_request
          });
        });
      }

      const { data: trainData } = await supabase.from('training_records').select('person_id, training_name, completed');
      if (trainData) {
        const mapping: Record<string, string[]> = {};
        trainData.forEach(r => {
          if (r.completed) {
            if (!mapping[r.person_id]) mapping[r.person_id] = [];
            mapping[r.person_id].push(r.training_name);
          }
        });
        setTrainingRecords(mapping);
      }
    };
    loadData();
  }, [user]); // Přidáno 'user' jako závislost, aby se data načetla hned po loginu

  const visiblePeople = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return store.people;
    if (isOnlyUser) return store.people.filter(p => p.id === user.id);
    return [];
  }, [store.people, isAdmin, isOnlyUser, user]);

  const handleSetShift = async (shift: Shift) => {
    const finalShift = {
      ...shift,
      is_request: isOnlyUser ? true : (shift.is_request ?? false)
    };

    store.setShift(finalShift);
    await supabase.from('shifts').upsert({
      id: finalShift.id,
      person_id: finalShift.personId,
      date: finalShift.date,
      start_hour: finalShift.startHour,
      start_minute: finalShift.startMinute,
      end_hour: finalShift.endHour,
      end_minute: finalShift.endMinute,
      status_id: finalShift.statusId,
      is_prediction: finalShift.isPrediction,
      temp_group_id: finalShift.tempGroupId,
      is_request: finalShift.is_request
    });
  };

  const handleRemoveShift = async (personId: string, date: string) => {
    store.removeShift(personId, date);
    await supabase.from('shifts').delete().match({ person_id: personId, date: date });
  };

  const handleAddPerson = async (person: Person) => {
    store.addPerson(person);
    await supabase.from('people').insert({
      id: person.id, name: person.name, email: person.email, group_id: person.groupId, password: person.password || '1234', must_change_password: true
    });
  };

  const handleUpdatePerson = async (id: string, updates: Partial<Person>) => {
    store.updatePerson(id, updates);
    const dbUpdates: any = { ...updates };
    if (updates.groupId) { dbUpdates.group_id = updates.groupId; delete dbUpdates.groupId; }
    await supabase.from('people').update(dbUpdates).eq('id', id);
  };

  const handleRemovePerson = async (id: string) => {
    store.removePerson(id);
    await supabase.from('people').delete().eq('id', id);
  };

  const handleAddGroup = async (group: Group) => {
    store.addGroup(group);
    await supabase.from('groups').insert({ id: group.id, name: group.name, color: group.color, order: group.order });
  };

  const handleRemoveGroup = async (id: string) => {
    store.removeGroup(id);
    await supabase.from('groups').delete().eq('id', id);
  };

  const peopleCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    store.people.forEach(p => { counts[p.groupId] = (counts[p.groupId] || 0) + 1; });
    return counts;
  }, [store.people]);

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 border border-slate-200">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary p-3 rounded-full mb-3 shadow-lg">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Shift Scheduler</h1>
          </div>
          <div className="space-y-5">
            <input 
              className="w-full h-12 px-4 rounded-lg border bg-slate-50" 
              placeholder="Jméno" 
              value={loginUsername} 
              onChange={e => setLoginUsername(e.target.value)} 
            />
            <input 
              type="password" 
              className="w-full h-12 px-4 rounded-lg border bg-slate-50" 
              placeholder="Heslo" 
              value={loginPass} 
              onChange={e => setLoginPass(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleLogin()} 
            />
            <Button 
              className="w-full h-12 text-base font-bold shadow-md" 
              onClick={handleLogin}
            >
              Vstoupit do systému
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-sm">
      {user && user.must_change_password === true && (
        <ChangePasswordModal open={true} userId={user.id} />
      )}

      <header className="border-b border-border px-4 py-3 flex items-center gap-4 flex-wrap bg-card shrink-0">
        <div className="flex items-center gap-2 mr-4">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold text-foreground truncate uppercase tracking-tight">Scheduler</h1>
        </div>
        <div className="flex bg-muted p-1 rounded-lg border">
          <button onClick={() => setActiveTab('calendar')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'calendar' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}><LayoutList className="h-4 w-4" /> Kalendář</button>
          <button onClick={() => setActiveTab('training')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'training' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}><GraduationCap className="h-4 w-4" /> Školení</button>
        </div>
        {activeTab === 'calendar' && <MonthSelector year={year} month={month} onChangeMonth={(y, m) => { setYear(y); setMonth(m); }} />}
        <div className="ml-auto flex items-center gap-4 text-right">
          <div className="flex flex-col mr-2">
            <span className="text-xs font-bold text-slate-800 leading-none">{user.name}</span>
            <span className="text-[9px] text-primary uppercase font-black tracking-tighter">
              {isSuperAdmin ? 'SUPERADMIN' : isAdmin ? 'ADMIN' : 'USER'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 hover:text-red-700">LogOut</Button>
        </div>
      </header>

      <div className="border-b border-border px-4 py-2 flex items-center gap-3 flex-wrap bg-card shrink-0">
        {activeTab === 'calendar' ? (
          <>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowPeople(true)}><Users className="h-4 w-4 mr-1" /> Zaměstnanci</Button>
            )}
            
            {isSuperAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowGroups(true)}><FolderOpen className="h-4 w-4 mr-1" /> Skupiny</Button>
                <Button variant="outline" size="sm" onClick={() => setShowStatuses(true)}><Palette className="h-4 w-4 mr-1" /> Typy směn</Button>
              </>
            )}

            <Button variant="outline" size="sm" onClick={() => setShowExport(true)}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
            <ExportExcelButton year={year} month={month} people={visiblePeople} shifts={store.shifts} statuses={store.statuses} />
            
            {isAdmin && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-bold">Skupina:</span>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny skupiny</SelectItem>
                    {store.groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-4 w-full">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat zaměstnance..."
                className="pl-9 h-9 text-xs"
                value={searchTrainingName}
                onChange={(e) => setSearchTrainingName(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Stav školení:</span>
              <Select value={filterTrainingStatus} onValueChange={setFilterTrainingStatus}>
                <SelectTrigger className="w-56 h-9 text-xs">
                  <SelectValue placeholder="Vyberte filtr..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všichni zaměstnanci</SelectItem>
                  <SelectItem value="completed">Kompletně vše hotovo</SelectItem>
                  <SelectItem value="missing">Něco chybí (jakékoliv)</SelectItem>
                  <div className="h-px bg-slate-200 my-1" />
                  <SelectItem value="has_RETRAK">Má hotový RETRAK</SelectItem>
                  <SelectItem value="no_RETRAK">Chybí mu RETRAK</SelectItem>
                  <SelectItem value="has_VZV">Má hotové VZV</SelectItem>
                  <SelectItem value="no_VZV">Chybí mu VZV</SelectItem>
                  <SelectItem value="has_NZV">Má hotové NZV</SelectItem>
                  <SelectItem value="no_NZV">Chybí mu NZV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-2">
        {activeTab === 'calendar' ? (
          <ScheduleGrid
            year={year} month={month}
            people={visiblePeople} groups={store.groups} shifts={store.shifts} statuses={store.statuses}
            getShift={store.getShift} onSetShift={handleSetShift} onRemoveShift={handleRemoveShift}
            filterGroup={filterGroup} searchName={searchName} isAdmin={isAdmin}
            onCellClick={(person, dateStr) => {
              const existing = store.getShift(person.id, dateStr);
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              const isPastOrToday = dateStr <= todayStr;
              
              const canEdit = isAdmin || (
                person.id === user?.id && 
                !isPastOrToday && 
                (!existing || existing.is_request === true)
              );

              if (canEdit) setModalData({ person, date: dateStr });
            }}
            getMostFrequentShift={store.getMostFrequentShift}
          />
        ) : (
          <div className="h-full overflow-hidden flex flex-col">
            <TrainingMatrix 
              people={visiblePeople} 
              isAdmin={isSuperAdmin} 
              searchQuery={searchTrainingName}
              statusFilter={filterTrainingStatus}
            />
          </div>
        )}
      </div>

      {modalData && (
        <ShiftModal
          open={!!modalData}
          onClose={() => setModalData(null)}
          personName={modalData.person.name}
          date={modalData.date}
          existingShift={store.getShift(modalData.person.id, modalData.date)}
          statuses={store.statuses}
          groups={store.groups}
          currentGroupId={modalData.person.groupId}
          isAdmin={isAdmin}
          userTrainings={trainingRecords[modalData.person.id] || []}
          onSave={(data: any) => {
            const targetDate = data.date || modalData.date;
            handleSetShift({
              id: store.getShift(modalData.person.id, targetDate)?.id || `shift-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              personId: modalData.person.id,
              date: targetDate,
              ...data,
            } as Shift);
          }}
          onDelete={() => { handleRemoveShift(modalData.person.id, modalData.date); setModalData(null); }}
        />
      )}

      {isAdmin && (
        <>
          <ManagePeopleModal open={showPeople} onClose={() => setShowPeople(false)} people={store.people} groups={store.groups} onAddPerson={handleAddPerson} onUpdatePerson={handleUpdatePerson} onRemovePerson={handleRemovePerson} />
          {isSuperAdmin && (
            <>
              <ManageGroupsModal open={showGroups} onClose={() => setShowGroups(false)} groups={store.groups} onAddGroup={handleAddGroup} onUpdateGroup={store.updateGroup} onRemoveGroup={handleRemoveGroup} peopleCountByGroup={peopleCountByGroup} />
              <ManageStatusesModal open={showStatuses} onClose={() => setShowStatuses(false)} statuses={store.statuses} onAddStatus={store.addStatus} onUpdateStatus={store.updateStatus} onRemoveStatus={store.removeStatus} />
            </>
          )}
        </>
      )}
      <ExportPdfModal open={showExport} onClose={() => setShowExport(false)} year={year} month={month} people={visiblePeople} groups={store.groups} shifts={store.shifts} statuses={store.statuses} />
    </div>
  );
};

export default Index;

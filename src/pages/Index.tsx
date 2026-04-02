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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FolderOpen, Palette, CalendarDays, Search, FileDown, Lock, LogOut, LayoutList, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Person, Shift, Group } from '@/types/schedule';
import { ExportExcelButton } from '@/components/schedule/ExportExcelButton';

const now = new Date();

const Index = () => {
  const store = useScheduleStore();
  const { user, isAdmin, login, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'training'>('calendar');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filterGroup, setFilterGroup] = useState('all');
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  
  // Stavy pro login formulář
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [showPeople, setShowPeople] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showStatuses, setShowStatuses] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // --- 1. NAČÍTÁNÍ DAT ZE SUPABASE ---
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
            tempGroupId: s.temp_group_id
          });
        });
      }
    };

    loadData();
  }, []);

  // FILTROVÁNÍ DAT PODLE PŘIHLÁŠENÉHO UŽIVATELE
  const visiblePeople = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return store.people; // Admin vidí vše
    return store.people.filter(p => p.id === user.id); // Uživatel jen sebe
  }, [store.people, isAdmin, user]);

  // --- 2. OBSLUHA ZÁPISŮ (HANDLERS) ---
  const handleSetShift = async (shift: Shift) => {
    store.setShift(shift);
    await supabase.from('shifts').upsert({
      id: shift.id,
      person_id: shift.personId,
      date: shift.date,
      start_hour: shift.startHour,
      start_minute: shift.startMinute,
      end_hour: shift.endHour,
      end_minute: shift.endMinute,
      status_id: shift.statusId,
      is_prediction: shift.isPrediction,
      temp_group_id: shift.tempGroupId
    });
  };

  const handleRemoveShift = async (personId: string, date: string) => {
    store.removeShift(personId, date);
    await supabase.from('shifts').delete().match({ person_id: personId, date: date });
  };

  const handleAddPerson = async (person: Person) => {
    store.addPerson(person);
    await supabase.from('people').insert({
      id: person.id,
      name: person.name,
      email: person.email,
      group_id: person.groupId,
      password: person.password || '1234' // Výchozí heslo pokud není zadáno
    });
  };

  const handleUpdatePerson = async (id: string, updates: Partial<Person>) => {
    store.updatePerson(id, updates);
    const dbUpdates: any = { ...updates };
    if (updates.groupId) {
      dbUpdates.group_id = updates.groupId;
      delete dbUpdates.groupId;
    }
    await supabase.from('people').update(dbUpdates).eq('id', id);
  };

  const handleRemovePerson = async (id: string) => {
    store.removePerson(id);
    await supabase.from('people').delete().eq('id', id);
  };

  const handleAddGroup = async (group: Group) => {
    store.addGroup(group);
    await supabase.from('groups').insert({
      id: group.id,
      name: group.name,
      color: group.color,
      order: group.order
    });
  };

  const handleRemoveGroup = async (id: string) => {
    store.removeGroup(id);
    await supabase.from('groups').delete().eq('id', id);
  };

  const peopleCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    store.people.forEach(p => {
      counts[p.groupId] = (counts[p.groupId] || 0) + 1;
    });
    return counts;
  }, [store.people]);

  // --- 3. LOGIN STRÁNKA (Pokud není uživatel přihlášen) ---
  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 border border-slate-200">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary p-3 rounded-full mb-3">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Shift Scheduler</h1>
            <p className="text-muted-foreground text-sm">Zadejte své údaje pro přístup</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 ml-1">Jméno</label>
              <input 
                className="w-full h-11 px-4 rounded-lg border border-slate-300 mt-1 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Vaše jméno"
                value={loginUsername} onChange={e => setLoginUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 ml-1">Heslo</label>
              <input 
                type="password"
                className="w-full h-11 px-4 rounded-lg border border-slate-300 mt-1 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="••••••••"
                value={loginPass} onChange={e => setLoginPass(e.target.value)}
              />
            </div>
            <Button className="w-full h-12 text-base mt-2 font-bold" onClick={() => login(loginUsername, loginPass)}>
              Přihlásit se
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- 4. HLAVNÍ APLIKACE (Po přihlášení) ---
  return (
    <div className="flex flex-col h-screen bg-background text-sm">
      <header className="border-b border-border px-4 py-3 flex items-center gap-4 flex-wrap bg-card shrink-0">
        <div className="flex items-center gap-2 mr-4">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold text-foreground truncate">Scheduler</h1>
        </div>

        <div className="flex bg-muted p-1 rounded-lg border">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'calendar' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <LayoutList className="h-4 w-4" /> Kalendář
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'training' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <GraduationCap className="h-4 w-4" /> Školení
          </button>
        </div>

        {activeTab === 'calendar' && (
          <MonthSelector year={year} month={month} onChangeMonth={(y, m) => { setYear(y); setMonth(m); }} />
        )}
        
        <div className="ml-auto flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-xs font-bold text-slate-700">{user.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">{isAdmin ? 'Administrátor' : 'Zaměstnanec'}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      {activeTab === 'calendar' && (
        <div className="border-b border-border px-4 py-2 flex items-center gap-3 flex-wrap bg-card shrink-0">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowPeople(true)}>
                <Users className="h-4 w-4 mr-1" /> People ({store.people.length})
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowGroups(true)}>
                <FolderOpen className="h-4 w-4 mr-1" /> Groups ({store.groups.length})
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowStatuses(true)}>
                <Palette className="h-4 w-4 mr-1" /> Shift Types
              </Button>
            </>
          )}
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
            <ExportExcelButton 
              year={year} 
              month={month} 
              people={visiblePeople} 
              shifts={store.shifts} 
              statuses={store.statuses} 
            />
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 ml-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input 
                  placeholder="Search name..." 
                  value={searchName} 
                  onChange={e => setSearchName(e.target.value)} 
                  className="h-8 text-xs pl-7 w-36 bg-background border border-input rounded-md px-3" 
                />
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Group:</span>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All groups</SelectItem>
                  {store.groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden p-2">
        {activeTab === 'calendar' ? (
          visiblePeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Users className="h-12 w-12" />
              <p>Žádná data k zobrazení.</p>
            </div>
          ) : (
            <ScheduleGrid
              year={year} month={month}
              people={visiblePeople} groups={store.groups} shifts={store.shifts} statuses={store.statuses}
              getShift={store.getShift} onSetShift={handleSetShift} onRemoveShift={handleRemoveShift}
              filterGroup={filterGroup} searchName={searchName} searchEmail={searchEmail}
              isAdmin={isAdmin}
              getMostFrequentShift={store.getMostFrequentShift}
            />
          )
        ) : (
          <div className="h-full overflow-y-auto px-2 pb-8">
            <div className="flex items-center justify-between mb-4 mt-2">
              <h2 className="text-xl font-bold">Matice školení</h2>
            </div>
            <TrainingMatrix people={visiblePeople} isAdmin={isAdmin} />
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <ManagePeopleModal 
            open={showPeople} 
            onClose={() => setShowPeople(false)}
            people={store.people} 
            groups={store.groups}
            onAddPerson={handleAddPerson}
            onUpdatePerson={handleUpdatePerson}
            onRemovePerson={handleRemovePerson}
          />
          
          <ManageGroupsModal 
            open={showGroups} 
            onClose={() => setShowGroups(false)}
            groups={store.groups} 
            onAddGroup={handleAddGroup}
            onUpdateGroup={store.updateGroup}
            onRemoveGroup={handleRemoveGroup}
            peopleCountByGroup={peopleCountByGroup} 
          />
          
          <ManageStatusesModal 
            open={showStatuses} 
            onClose={() => setShowStatuses(false)}
            statuses={store.statuses} 
            onAddStatus={store.addStatus} 
            onUpdateStatus={store.updateStatus} 
            onRemoveStatus={store.removeStatus} 
          />
        </>
      )}

      <ExportPdfModal 
        open={showExport} 
        onClose={() => setShowExport(false)}
        year={year} month={month} 
        people={visiblePeople} groups={store.groups} 
        shifts={store.shifts} statuses={store.statuses} 
      />
    </div>
  );
};

export default Index;

import { useState, useMemo, useEffect } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { useAuth } from '@/hooks/useAuth';
import { MonthSelector } from '@/components/schedule/MonthSelector';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { ManagePeopleModal } from '@/components/schedule/ManagePeopleModal';
import { ManageGroupsModal } from '@/components/schedule/ManageGroupsModal';
import { ManageStatusesModal } from '@/components/schedule/ManageStatusesModal';
import { ExportPdfModal } from '@/components/schedule/ExportPdfModal';
import { LoginModal } from '@/components/schedule/LoginModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FolderOpen, Palette, CalendarDays, Search, FileDown, Lock, LogOut, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Person, Shift, Group, ShiftStatus } from '@/types/schedule';

const now = new Date();

const Index = () => {
  const store = useScheduleStore();
  const { isAdmin, login, logout } = useAuth();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filterGroup, setFilterGroup] = useState('all');
  const [showPeople, setShowPeople] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showStatuses, setShowStatuses] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  // --- SUPABASE NAČÍTÁNÍ ---
  useEffect(() => {
    const loadData = async () => {
      // 1. Načtení skupin
      const { data: groups } = await supabase.from('groups').select('*').order('order');
      if (groups) {
        groups.forEach(g => store.addGroup(g));
      }

      // 2. Načtení lidí
      const { data: people } = await supabase.from('people').select('*');
      if (people) {
        // Vymažeme stará lokální data a nahradíme databází
        people.forEach(p => {
            const exists = store.people.find(ep => ep.id === p.id);
            if (!exists) store.addPerson({ ...p, groupId: p.group_id });
        });
      }

      // 3. Načtení směn
      const { data: shifts } = await supabase.from('shifts').select('*');
      if (shifts) {
        shifts.forEach(s => {
            const formattedShift: Shift = {
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
            };
            store.setShift(formattedShift);
        });
      }
    };

    loadData();
  }, []);

  // --- SUPABASE ZÁPISY (Obalujeme funkce ze storu) ---
  const handleSetShift = async (shift: Shift) => {
    store.setShift(shift); // Okamžitý update v UI
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
      group_id: person.groupId
    });
  };

  const handleRemovePerson = async (id: string) => {
    store.removePerson(id);
    await supabase.from('people').delete().eq('id', id);
  };

  const peopleCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    store.people.forEach(p => {
      counts[p.groupId] = (counts[p.groupId] || 0) + 1;
    });
    return counts;
  }, [store.people]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-4 flex-wrap bg-card shrink-0">
        <div className="flex items-center gap-2 mr-4">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold text-foreground">Shift Scheduler</h1>
        </div>
        <MonthSelector year={year} month={month} onChangeMonth={(y, m) => { setYear(y); setMonth(m); }} />
        <div className="ml-auto flex items-center gap-2">
          {isAdmin ? (
            <>
              <span className="text-xs text-primary font-medium flex items-center gap-1"><Lock className="h-3 w-3" /> Admin</span>
              <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-1" /> Logout</Button>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Guest (Read-only)</span>
              <Button variant="outline" size="sm" onClick={() => setShowLogin(true)}><Lock className="h-4 w-4 mr-1" /> Admin Login</Button>
            </>
          )}
        </div>
      </header>

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
        <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
          <FileDown className="h-4 w-4 mr-1" /> Export
        </Button>

        <div className="flex items-center gap-2 ml-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input placeholder="Search name..." value={searchName} onChange={e => setSearchName(e.target.value)} className="h-8 text-xs pl-7 w-36 bg-background border border-input rounded-md px-3 py-2" />
          </div>
        </div>

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
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {store.people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Users className="h-12 w-12" />
            <p className="text-sm">
              {isAdmin ? 'No people added yet. Click "People" to get started.' : 'No people added yet. Ask an admin to set up the schedule.'}
            </p>
          </div>
        ) : (
          <ScheduleGrid
            year={year} month={month}
            people={store.people} groups={store.groups} shifts={store.shifts} statuses={store.statuses}
            getShift={store.getShift} onSetShift={handleSetShift} onRemoveShift={handleRemoveShift}
            filterGroup={filterGroup} searchName={searchName} searchEmail={searchEmail}
            isAdmin={isAdmin}
            getMostFrequentShift={store.getMostFrequentShift}
          />
        )}
      </div>

      {isAdmin && (
        <>
          <ManagePeopleModal 
            open={showPeople} 
            onClose={() => setShowPeople(false)}
            people={store.people} 
            groups={store.groups}
            onAddPerson={handleAddPerson}      // ZMĚNĚNO ze store.addPerson
            onUpdatePerson={store.updatePerson} 
            onRemovePerson={handleRemovePerson}   // ZMĚNĚNO ze store.removePerson
          />
          
          <ManageGroupsModal 
            open={showGroups} 
            onClose={() => setShowGroups(false)}
            groups={store.groups} 
            onAddGroup={async (group) => {     // PŘIDÁNO UKLÁDÁNÍ SKUPIN
              store.addGroup(group);
              await supabase.from('groups').insert({
                id: group.id,
                name: group.name,
                color: group.color,
                order: group.order
              });
            }} 
            onUpdateGroup={store.updateGroup} 
            onRemoveGroup={async (id) => {    // PŘIDÁNO MAZÁNÍ SKUPIN
              store.removeGroup(id);
              await supabase.from('groups').delete().eq('id', id);
            }}
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

export default Index;

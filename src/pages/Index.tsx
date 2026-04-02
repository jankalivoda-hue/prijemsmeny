import { useState, useMemo } from 'react';
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
            <Input placeholder="Search name..." value={searchName} onChange={e => setSearchName(e.target.value)} className="h-8 text-xs pl-7 w-36" />
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input placeholder="Search email..." value={searchEmail} onChange={e => setSearchEmail(e.target.value)} className="h-8 text-xs pl-7 w-36" />
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
        <div className="flex gap-3 items-center ml-4">
          {store.statuses.map(s => (
            <div key={s.id} className="flex items-center gap-1 text-[10px]">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: `hsl(${s.color})` }} />
              {s.label}
            </div>
          ))}
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
            getShift={store.getShift} onSetShift={store.setShift} onRemoveShift={store.removeShift}
            filterGroup={filterGroup} searchName={searchName} searchEmail={searchEmail}
            isAdmin={isAdmin}
            getMostFrequentShift={store.getMostFrequentShift}
          />
        )}
      </div>

      {isAdmin && (
        <>
          <ManagePeopleModal open={showPeople} onClose={() => setShowPeople(false)}
            people={store.people} groups={store.groups}
            onAddPerson={store.addPerson} onUpdatePerson={store.updatePerson} onRemovePerson={store.removePerson} />
          <ManageGroupsModal open={showGroups} onClose={() => setShowGroups(false)}
            groups={store.groups} onAddGroup={store.addGroup} onUpdateGroup={store.updateGroup} onRemoveGroup={store.removeGroup}
            peopleCountByGroup={peopleCountByGroup} />
          <ManageStatusesModal open={showStatuses} onClose={() => setShowStatuses(false)}
            statuses={store.statuses} onAddStatus={store.addStatus} onUpdateStatus={store.updateStatus} onRemoveStatus={store.removeStatus} />
        </>
      )}
      <ExportPdfModal open={showExport} onClose={() => setShowExport(false)}
        year={year} month={month} people={store.people} groups={store.groups} shifts={store.shifts} statuses={store.statuses} />
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={login} />
    </div>
  );
};

export default Index;

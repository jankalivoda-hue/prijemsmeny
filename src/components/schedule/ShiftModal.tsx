import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shift, ShiftStatus, Group } from '@/types/schedule';
import { Trash2, AlertCircle, Clock, CalendarDays, ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { addDays, format as formatDateFns } from 'date-fns';

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  date: string;
  existingShift?: Shift;
  statuses: ShiftStatus[];
  groups: Group[];
  currentGroupId: string;
  isAdmin: boolean;
  userTrainings: string[];
  onSave: (shift: Omit<Shift, 'id' | 'personId' | 'date'> & { date?: string }) => void;
  onDelete: () => void;
}

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}
TIME_OPTIONS.push('24:00');

const DAY_COUNT_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1);

function minutesToTimeStr(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeStrToMinutes(str: string): number {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

export function ShiftModal({ 
  open, onClose, personName, date, existingShift, statuses, groups, currentGroupId, isAdmin, userTrainings, onSave, onDelete 
}: ShiftModalProps) {
  
  const [statusId, setStatusId] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState(existingShift?.note || '');
  const [tempGroupId, setTempGroupId] = useState<string>('none');
  const [daysCount, setDaysCount] = useState("1");
  const [error, setError] = useState<string | null>(null);

  // 1. OMEZENÍ TYPŮ POŽADAVKŮ (Pouze Práce, Volno, Dovolená, Nemoc)
  const filteredStatuses = useMemo(() => {
    return statuses.filter(s => {
      const label = s.label.toLowerCase();
      return (
        label.includes('práce') || label.includes('work') ||
        label.includes('volno') || label.includes('off') ||
        label.includes('dovolená') || label.includes('vacation') ||
        label.includes('nemoc') || label.includes('sick')
      );
    });
  }, [statuses]);

  useEffect(() => {
    if (open) {
      setStatusId(existingShift?.statusId || (filteredStatuses[0]?.id || ''));
      const startMins = existingShift?.startMinute ?? (existingShift?.startHour != null ? existingShift.startHour * 60 : 480);
      const endMins = existingShift?.endMinute ?? (existingShift?.endHour != null ? existingShift.endHour * 60 : 1020);
      setStartTime(minutesToTimeStr(startMins));
      setEndTime(minutesToTimeStr(endMins));
      setNote(existingShift?.note || '');
      setTempGroupId(existingShift?.tempGroupId || 'none');
      setDaysCount("1");
      setError(null);
    }
  }, [open, existingShift, filteredStatuses]);

  const selectedStatus = statuses.find(s => s.id === statusId);
  const showTimePicker = selectedStatus?.type === 'work';

  const startMins = timeStrToMinutes(startTime);
  const filteredEndOptions = TIME_OPTIONS.filter(t => timeStrToMinutes(t) > startMins);

  // LOGIKA KONTROLY RETRAKU
  const isRetrakRestricted = useMemo(() => {
    if (!showTimePicker) return false; // Pokud to není práce, neřešíme
    
    // Zjistíme cílovou skupinu (buď dočasnou od admina, nebo kmenovou)
    const targetId = tempGroupId !== 'none' ? tempGroupId : currentGroupId;
    const targetGroup = groups.find(g => g.id === targetId);
    
    // Pokud název skupiny obsahuje "Retrak"
    const isRetrakGroup = targetGroup?.name.toLowerCase().includes('retrak');
    const hasRetrakTraining = userTrainings.includes('RETRAK');

    return isRetrakGroup && !hasRetrakTraining;
  }, [showTimePicker, tempGroupId, currentGroupId, groups, userTrainings]);

  const handleInternalSave = () => {
    if (isRetrakRestricted) {
      setError(`Zaměstnanec nemá platné školení na RETRAK pro vybranou skupinu.`);
      return;
    }

    const sMins = timeStrToMinutes(startTime);
    const eMins = timeStrToMinutes(endTime);
    const count = parseInt(daysCount, 10);
    
    const baseData = {
      statusId,
      startMinute: showTimePicker ? sMins : undefined,
      endMinute: showTimePicker ? eMins : undefined,
      startHour: showTimePicker ? Math.floor(sMins / 60) : undefined,
      endHour: showTimePicker ? Math.ceil(eMins / 60) : undefined,
      note: note || undefined,
      tempGroupId: isAdmin && tempGroupId !== 'none' ? tempGroupId : undefined,
      is_request: !isAdmin,
    };

    if (!showTimePicker && count > 1 && !existingShift) {
      const startDate = new Date(date);
      for (let i = 0; i < count; i++) {
        const currentDate = addDays(startDate, i);
        const dateStr = formatDateFns(currentDate, 'yyyy-MM-dd');
        onSave({ ...baseData, date: dateStr });
      }
    } else {
      onSave(baseData);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md border-t-4 border-t-primary">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center justify-between text-left">
            <div className="flex flex-col">
              <span className="font-bold text-slate-900">{personName}</span>
              <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-wider">{date}</span>
            </div>
            {!isAdmin && (
              <span className="text-[9px] bg-blue-600 text-white px-2 py-1 rounded-md uppercase font-black">
                Žádost
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* CHYBA ŠKOLENÍ */}
          {(error || isRetrakRestricted) && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex gap-3 items-start animate-in fade-in zoom-in duration-200">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-800 font-bold leading-tight">
                CHYBA: Zaměstnanec nemá školení na RETRAK. Nemůže být naplánován do této skupiny.
              </p>
            </div>
          )}

          {/* VÝBĚR TYPU POŽADAVKU */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase text-slate-500">Typ požadavku</Label>
            <Select value={statusId} onValueChange={(val) => { setStatusId(val); setError(null); }}>
              <SelectTrigger className="h-12 border-slate-300">
                <SelectValue placeholder="Vyberte typ..." />
              </SelectTrigger>
              <SelectContent>
                {filteredStatuses.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: `hsl(${s.color})` }} />
                      <span className="font-semibold text-slate-700">{s.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DOČASNÝ PŘESUN - POUZE ADMIN */}
          {isAdmin && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <Label className="text-[10px] font-bold uppercase">Dočasný přesun skladu</Label>
              </div>
              <Select value={tempGroupId} onValueChange={(val) => { setTempGroupId(val); setError(null); }}>
                <SelectTrigger className="h-10 bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Původní: {groups.find(g => g.id === currentGroupId)?.name}</SelectItem>
                  {groups.filter(g => g.id !== currentGroupId).map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ČAS / ROZSAH DNÍ */}
          {showTimePicker ? (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Clock className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-tight">Pracovní doba</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Příchod</Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger className="bg-white border-slate-300 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.filter(t => t !== '24:00').map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Odchod</Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger className="bg-white border-slate-300 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {filteredEndOptions.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium text-blue-700 italic">Celodenní záznam.</span>
              </div>
              {!existingShift && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <Label className="text-[11px] font-bold uppercase text-slate-500">Na kolik dní?</Label>
                  <Select value={daysCount} onValueChange={setDaysCount}>
                    <SelectTrigger className="bg-white border-slate-300 h-11 text-lg font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {DAY_COUNT_OPTIONS.map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'den' : num < 5 ? 'dny' : 'dní'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase text-slate-500">Poznámka</Label>
            <Input 
              className="h-11 border-slate-300" 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              placeholder="Poznámka..." 
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t mt-2">
          {existingShift && (isAdmin || existingShift.is_request) && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 font-bold text-[10px] uppercase">
              <Trash2 className="h-4 w-4 mr-1.5" /> Smazat
            </Button>
          )}
          <div className="flex gap-2 ml-auto w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none h-11">Zrušit</Button>
            <Button 
              onClick={handleInternalSave} 
              disabled={!!isRetrakRestricted}
              className="flex-1 sm:flex-none h-11 font-bold px-8 shadow-lg active:scale-95 transition-transform"
            >
              {isAdmin ? 'Potvrdit' : 'Odeslat žádost'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

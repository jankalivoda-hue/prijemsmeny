import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Person } from '@/types/schedule';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { addMonths, isAfter, parseISO, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth'; // Přidán import useAuth

interface TrainingMatrixProps {
  people: Person[];
  isAdmin: boolean;
  searchQuery: string;
  statusFilter: string;
}

const TRAININGS = ["RETRAK", "VZV", "NZV"];

interface TrainingData {
  completed: boolean;
  completion_date: string;
  validity_months: number;
}

export function TrainingMatrix({ people, searchQuery, statusFilter }: TrainingMatrixProps) {
  const { isSuperAdmin } = useAuth(); // Získání role SuperAdmina
  const [records, setRecords] = useState<Record<string, Record<string, TrainingData>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from('training_records').select('*');
    if (data) {
      const mapping: Record<string, Record<string, TrainingData>> = {};
      data.forEach(reg => {
        if (!mapping[reg.person_id]) mapping[reg.person_id] = {};
        mapping[reg.person_id][reg.training_name] = {
          completed: reg.completed,
          completion_date: reg.completion_date,
          validity_months: reg.validity_months
        };
      });
      setRecords(mapping);
    }
    setLoading(false);
  };

  const handleToggle = async (personId: string, trainingName: string) => {
    // --- ÚPRAVA PRO BOD 4: POUZE SUPERADMIN SMÍ EDITOVAT ---
    if (!isSuperAdmin) return;

    const existing = records[personId]?.[trainingName];
    
    if (existing) {
      if (confirm(`Opravdu chcete smazat záznam školení ${trainingName}?`)) {
        await supabase.from('training_records').delete().match({ person_id: personId, training_name: trainingName });
        fetchRecords();
      }
    } else {
      const date = prompt("Datum školení (RRRR-MM-DD):", format(new Date(), 'yyyy-MM-dd'));
      if (!date) return;
      const validity = prompt("Platnost v měsících (např. 24 pro 2 roky):", "24");
      if (!validity) return;

      await supabase.from('training_records').upsert({
        person_id: personId,
        training_name: trainingName,
        completed: true,
        completion_date: date,
        validity_months: parseInt(validity)
      });
      fetchRecords();
    }
  };

  const getStatusInfo = (personId: string, trainingName: string) => {
    const rec = records[personId]?.[trainingName];
    if (!rec) return { type: 'missing', label: 'Chybí', color: 'bg-red-50 border-red-200 text-red-600', icon: <AlertCircle className="h-3 w-3" /> };

    const expiryDate = addMonths(parseISO(rec.completion_date), rec.validity_months);
    const isExpired = isAfter(new Date(), expiryDate);

    if (isExpired) {
      return { type: 'expired', label: 'Propadlé', color: 'bg-orange-50 border-orange-200 text-orange-600', icon: <Clock className="h-3 w-3" /> };
    }

    return { type: 'completed', label: 'Hotovo', color: 'bg-green-50 border-green-200 text-green-600', icon: <CheckCircle2 className="h-3 w-3" /> };
  };

  const filteredPeople = useMemo(() => {
    return people.filter(person => {
      const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const isTrainingValid = (tName: string) => {
        const info = getStatusInfo(person.id, tName);
        return info.type === 'completed';
      };

      switch (statusFilter) {
        case 'completed': return TRAININGS.every(t => isTrainingValid(t));
        case 'missing': return TRAININGS.some(t => !isTrainingValid(t));
        case 'has_RETRAK': return isTrainingValid('RETRAK');
        case 'no_RETRAK':  return !isTrainingValid('RETRAK');
        case 'has_VZV':    return isTrainingValid('VZV');
        case 'no_VZV':     return !isTrainingValid('VZV');
        case 'has_NZV':    return isTrainingValid('NZV');
        case 'no_NZV':     return !isTrainingValid('NZV');
        default:           return true;
      }
    });
  }, [people, records, searchQuery, statusFilter]);

  if (loading) return <div className="p-10 text-center text-sm italic">Načítání matice školení...</div>;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full border-collapse table-fixed text-[11px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-2 border-b border-r border-border font-bold w-48 text-left text-slate-600 sticky left-0 bg-muted/50 z-20 shadow-[2px_0_2px_rgba(0,0,0,0.02)] uppercase tracking-wider">Zaměstnanec</th>
              {TRAININGS.map(t => (
                <th key={t} className="p-2 border-b border-border text-center font-bold text-slate-500 uppercase tracking-tighter w-32 bg-muted/50">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPeople.map(person => (
              <tr key={person.id} className="hover:bg-muted/10 border-b border-border h-8 transition-colors">
                <td className="p-2 border-r border-border font-bold truncate bg-white sticky left-0 z-10 shadow-[2px_0_2px_rgba(0,0,0,0.02)]">
                  {person.name}
                </td>
                {TRAININGS.map(t => {
                  const status = getStatusInfo(person.id, t);
                  const detail = records[person.id]?.[t];
                  return (
                    <td key={t} className="p-1 text-center">
                      <button
                        onClick={() => handleToggle(person.id, t)}
                        // --- OMEZENÍ: POUZE SUPERADMIN MŮŽE KLIKAT ---
                        disabled={!isSuperAdmin}
                        className={`w-full h-7 rounded border flex items-center justify-center gap-1.5 transition-all 
                          ${status.color} 
                          ${isSuperAdmin ? 'hover:brightness-95 active:scale-95 cursor-pointer' : 'cursor-default opacity-90'}
                        `}
                      >
                        {status.icon}
                        <span className="text-[9px] font-black uppercase tracking-tight">{status.label}</span>
                        {detail && (
                          <span className="text-[8px] opacity-60 font-normal hidden md:inline ml-1 border-l border-current pl-1">
                            {format(parseISO(detail.completion_date), 'MM/yy')}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredPeople.length === 0 && (
              <tr>
                <td colSpan={TRAININGS.length + 1} className="p-12 text-center text-muted-foreground italic bg-slate-50/50">
                  Nenalezeni žádní zaměstnanci odpovídající výběru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

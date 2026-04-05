import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Person } from '@/types/schedule';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { addMonths, isAfter, parseISO, format } from 'date-fns';

interface TrainingMatrixProps {
  people: Person[];
  isAdmin: boolean;
  searchQuery: string; // Přidáno pro vyhledávání
  statusFilter: 'all' | 'completed' | 'missing'; // Přidáno pro filtrování
}

const TRAININGS = ["RETRAK", "VZV", "NZV"];

interface TrainingData {
  completed: boolean;
  completion_date: string;
  validity_months: number;
}

export function TrainingMatrix({ people, isAdmin, searchQuery, statusFilter }: TrainingMatrixProps) {
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
    if (!isAdmin) return;
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

  // --- LOGIKA FILTROVÁNÍ A HLEDÁNÍ ---
  const filteredPeople = useMemo(() => {
    return people.filter(person => {
      // 1. Vyhledávání jména
      const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Filtrování stavu
      let matchesStatus = true;
      const personStatuses = TRAININGS.map(t => getStatusInfo(person.id, t).type);
      const isFullyCompleted = personStatuses.every(s => s === 'completed');

      if (statusFilter === 'completed') {
        matchesStatus = isFullyCompleted;
      } else if (statusFilter === 'missing') {
        matchesStatus = !isFullyCompleted;
      }

      return matchesSearch && matchesStatus;
    });
  }, [people, records, searchQuery, statusFilter]);

  if (loading) return <div className="p-10 text-center text-sm">Načítání matice školení...</div>;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full border-collapse table-fixed text-[11px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-2 border-b border-r border-border font-bold w-48 text-left text-slate-600">Zaměstnanec</th>
              {TRAININGS.map(t => (
                <th key={t} className="p-2 border-b border-border text-center font-bold text-slate-500 uppercase tracking-tighter w-32">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPeople.map(person => (
              <tr key={person.id} className="hover:bg-muted/10 border-b border-border h-8">
                <td className="p-2 border-r border-border font-medium truncate bg-white sticky left-0 z-10">
                  {person.name}
                </td>
                {TRAININGS.map(t => {
                  const status = getStatusInfo(person.id, t);
                  const detail = records[person.id]?.[t];
                  return (
                    <td key={t} className="p-1 text-center">
                      <button
                        onClick={() => handleToggle(person.id, t)}
                        disabled={!isAdmin}
                        className={`w-full h-7 rounded border flex items-center justify-center gap-1.5 transition-all ${status.color} ${isAdmin ? 'hover:brightness-95 active:scale-95' : 'cursor-default'}`}
                      >
                        {status.icon}
                        <span className="text-[9px] font-bold uppercase">{status.label}</span>
                        {detail && (
                          <span className="text-[9px] opacity-60 font-normal hidden md:inline">
                            ({format(parseISO(detail.completion_date), 'MM/yy')})
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
                <td colSpan={TRAININGS.length + 1} className="p-8 text-center text-muted-foreground italic">
                  Žádné výsledky nenalezeny.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

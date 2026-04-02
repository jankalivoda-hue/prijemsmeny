import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Person } from '@/types/schedule';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { addMonths, isAfter, parseISO, format } from 'date-fns';

interface TrainingMatrixProps {
  people: Person[];
  isAdmin: boolean;
}

const TRAININGS = ["RETRAK", "VZV", "NZV"];

interface TrainingData {
  completed: boolean;
  completion_date: string;
  validity_months: number;
}

export function TrainingMatrix({ people, isAdmin }: TrainingMatrixProps) {
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
      // Pokud existuje, kliknutím ho smažeme (resetujeme)
      if (confirm(`Opravdu chcete smazat záznam školení ${trainingName}?`)) {
        await supabase.from('training_records').delete().match({ person_id: personId, training_name: trainingName });
        fetchRecords();
      }
    } else {
      // Pokud neexistuje, zeptáme se na detaily
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

  const getStatus = (personId: string, trainingName: string) => {
    const rec = records[personId]?.[trainingName];
    if (!rec) return { label: 'Chybí', color: 'bg-red-100 border-red-500 text-red-700', icon: <AlertCircle className="h-4 w-4" /> };

    const expiryDate = addMonths(parseISO(rec.completion_date), rec.validity_months);
    const isExpired = isAfter(new Date(), expiryDate);

    if (isExpired) {
      return { label: 'Expirováno', color: 'bg-orange-100 border-orange-500 text-orange-700', icon: <Clock className="h-4 w-4" /> };
    }

    return { label: 'Hotovo', color: 'bg-green-100 border-green-500 text-green-700', icon: <CheckCircle2 className="h-4 w-4" /> };
  };

  if (loading) return <div className="p-10 text-center">Načítání matice školení...</div>;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-4 border-b border-border font-bold w-64 text-left">Zaměstnanec</th>
              {TRAININGS.map(t => (
                <th key={t} className="p-4 border-b border-border text-center text-xs font-semibold text-muted-foreground w-40">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map(person => (
              <tr key={person.id} className="hover:bg-muted/20 border-b border-border">
                <td className="p-4 font-medium truncate">{person.name}</td>
                {TRAININGS.map(t => {
                  const status = getStatus(person.id, t);
                  const detail = records[person.id]?.[t];
                  return (
                    <td key={t} className="p-3 text-center">
                      <button
                        onClick={() => handleToggle(person.id, t)}
                        disabled={!isAdmin}
                        className={`w-full h-16 rounded-md border flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm ${status.color} ${isAdmin ? 'hover:scale-105 active:scale-95' : 'cursor-default'}`}
                      >
                        {status.icon}
                        <span className="text-[10px] font-bold uppercase">{status.label}</span>
                        {detail && (
                          <span className="text-[8px] opacity-70">
                            {format(parseISO(detail.completion_date), 'dd.MM.yyyy')}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

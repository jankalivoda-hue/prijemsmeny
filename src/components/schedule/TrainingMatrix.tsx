import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Person } from '@/types/schedule';
import { CheckCircle2, Circle } from 'lucide-react';

interface TrainingMatrixProps {
  people: Person[];
  isAdmin: boolean;
}

// AKTUALIZOVANÝ SEZNAM ŠKOLENÍ
const TRAININGS = [
  "RETRAK",
  "VZV",
  "NZV"
];

export function TrainingMatrix({ people, isAdmin }: TrainingMatrixProps) {
  const [completedTrainings, setCompletedTrainings] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  // Načtení dat ze Supabase
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_records')
        .select('*')
        .eq('completed', true);
        
      if (error) {
        console.error('Chyba při načítání školení:', error);
      } else if (data) {
        const mapping: Record<string, Set<string>> = {};
        data.forEach(reg => {
          if (!mapping[reg.person_id]) mapping[reg.person_id] = new Set();
          mapping[reg.person_id].add(reg.training_name);
        });
        setCompletedTrainings(mapping);
      }
      setLoading(false);
    };
    fetchRecords();
  }, []);

  const toggleTraining = async (personId: string, trainingName: string) => {
    if (!isAdmin) return;

    const isDone = completedTrainings[personId]?.has(trainingName);
    
    if (isDone) {
      // Odznačit (Smazat ze Supabase)
      const { error } = await supabase
        .from('training_records')
        .delete()
        .match({ person_id: personId, training_name: trainingName });

      if (!error) {
        setCompletedTrainings(prev => {
          const next = { ...prev };
          const personSet = new Set(next[personId]);
          personSet.delete(trainingName);
          next[personId] = personSet;
          return next;
        });
      }
    } else {
      // Označit (Vložit do Supabase)
      const { error } = await supabase
        .from('training_records')
        .upsert({ 
          person_id: personId, 
          training_name: trainingName, 
          completed: true 
        });

      if (!error) {
        setCompletedTrainings(prev => {
          const next = { ...prev };
          if (!next[personId]) next[personId] = new Set();
          const personSet = new Set(next[personId]);
          personSet.add(trainingName);
          next[personId] = personSet;
          return next;
        });
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground italic">
        Tato sekce je přístupná pouze pro administrátory.
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Načítání dat školení...</div>;
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="p-4 border-b border-border font-bold w-64 text-foreground">Zaměstnanec</th>
              {TRAININGS.map(t => (
                <th key={t} className="p-4 border-b border-border text-center text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.length === 0 ? (
              <tr>
                <td colSpan={TRAININGS.length + 1} className="p-8 text-center text-muted-foreground italic">
                  Nebyli nalezeni žádní zaměstnanci.
                </td>
              </tr>
            ) : (
              people.map(person => (
                <tr key={person.id} className="hover:bg-muted/30 border-b border-border transition-colors">
                  <td className="p-4 font-medium text-foreground">{person.name}</td>
                  {TRAININGS.map(t => {
                    const isDone = completedTrainings[person.id]?.has(t);
                    return (
                      <td key={t} className="p-2 text-center">
                        <button
                          onClick={() => toggleTraining(person.id, t)}
                          className={`
                            w-full max-w-[140px] mx-auto py-3 rounded-md border flex flex-col items-center justify-center gap-1 transition-all
                            ${isDone 
                              ? 'bg-green-100 border-green-500 text-green-700 shadow-inner' 
                              : 'bg-slate-100 border-slate-300 text-slate-400 grayscale opacity-60 hover:opacity-100'
                            }
                          `}
                        >
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          <span className="text-[10px] font-bold uppercase">{isDone ? 'Hotovo' : 'Chybí'}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

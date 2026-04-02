import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface MonthSelectorProps {
  year: number;
  month: number; // 0-11
  onChangeMonth: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onChangeMonth }: MonthSelectorProps) {
  const prev = () => {
    if (month === 0) onChangeMonth(year - 1, 11);
    else onChangeMonth(year, month - 1);
  };
  const next = () => {
    if (month === 11) onChangeMonth(year + 1, 0);
    else onChangeMonth(year, month + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={prev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex gap-1">
        {MONTHS.map((m, i) => (
          <Button
            key={m}
            variant={i === month ? 'default' : 'ghost'}
            size="sm"
            className="text-xs px-2 h-8"
            onClick={() => onChangeMonth(year, i)}
          >
            {m}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="icon" onClick={next}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="text-sm font-semibold ml-2">{year}</span>
    </div>
  );
}

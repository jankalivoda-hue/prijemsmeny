import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addMonths, subMonths } from 'date-fns';
import { cs } from 'date-fns/locale';

interface MonthSelectorProps {
  year: number;
  month: number;
  onChangeMonth: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onChangeMonth }: MonthSelectorProps) {
  const currentDate = new Date(year, month);

  // Vygenerujeme seznam měsíců pro aktuální rok (nebo i kousek kolem)
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handlePrev = () => {
    const prev = subMonths(currentDate, 1);
    onChangeMonth(prev.getFullYear(), prev.getMonth());
  };

  const handleNext = () => {
    const next = addMonths(currentDate, 1);
    onChangeMonth(next.getFullYear(), next.getMonth());
  };

  const handleMonthChange = (value: string) => {
    const m = parseInt(value, 10);
    onChangeMonth(year, m);
  };

  const handleYearChange = (value: string) => {
    const y = parseInt(value, 10);
    onChangeMonth(y, month);
  };

  // Seznam let (letošek +- 2 roky)
  const years = [year - 2, year - 1, year, year + 1, year + 2];

  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* Šipka zpět */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1">
        {/* Výběr měsíce - Rozbalovací nabídka */}
        <Select value={month.toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="h-8 min-w-[100px] md:min-w-[130px] text-xs md:text-sm font-bold border-none bg-muted/50 focus:ring-0">
            <SelectValue>
              {format(currentDate, 'MMMM', { locale: cs })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m.toString()}>
                {format(new Date(year, m), 'MMMM', { locale: cs })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Výběr roku - Rozbalovací nabídka */}
        <Select value={year.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="h-8 w-[70px] md:w-[90px] text-xs md:text-sm font-medium border-none bg-muted/50 focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Šipka vpřed */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

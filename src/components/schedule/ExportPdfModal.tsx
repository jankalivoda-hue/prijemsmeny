import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Person, Group, Shift, ShiftStatus } from '@/types/schedule';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { FileDown } from 'lucide-react';

interface ExportPdfModalProps {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  people: Person[];
  groups: Group[];
  shifts: Shift[];
  statuses: ShiftStatus[];
}

function formatMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getShiftHours(s: Shift): number {
  const startMins = s.startMinute ?? (s.startHour != null ? s.startHour * 60 : undefined);
  const endMins = s.endMinute ?? (s.endHour != null ? s.endHour * 60 : undefined);
  if (startMins != null && endMins != null) return (endMins - startMins) / 60;
  return 0;
}

export function ExportPdfModal({ open, onClose, year, month, people, groups, shifts, statuses }: ExportPdfModalProps) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(lastDay);

  const handleExport = () => {
    const startDate = new Date(year, month, startDay);
    const endDate = new Date(year, month, Math.min(endDay, lastDay));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Build HTML for print/PDF
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Schedule Export</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
      h1 { font-size: 16px; margin-bottom: 4px; }
      h2 { font-size: 12px; color: #666; margin-bottom: 12px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
      th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; }
      .group-header { background: #e8e8e8; font-weight: bold; text-transform: uppercase; font-size: 11px; }
      .hours { text-align: center; }
      .shift-cell { text-align: center; font-size: 9px; }
      @media print { body { margin: 10px; } }
    </style></head><body>`;

    html += `<h1>Shift Schedule</h1>`;
    html += `<h2>${format(startDate, 'MMM d, yyyy')} — ${format(endDate, 'MMM d, yyyy')}</h2>`;

    html += `<table><thead><tr><th>Employee</th><th>Email</th><th class="hours">Hours</th>`;
    days.forEach(d => {
      html += `<th class="shift-cell">${format(d, 'EEE')}<br/>${format(d, 'd')}</th>`;
    });
    html += `</tr></thead><tbody>`;

    const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

    sortedGroups.forEach(group => {
      const groupPeople = people.filter(p => p.groupId === group.id);
      if (groupPeople.length === 0) return;

      html += `<tr><td class="group-header" colspan="${3 + days.length}">${group.name} (${groupPeople.length})</td></tr>`;

      groupPeople.forEach(person => {
        let totalHours = 0;
        const cells: string[] = [];

        days.forEach(d => {
          const dateStr = format(d, 'yyyy-MM-dd');
          const shift = shifts.find(s => s.personId === person.id && s.date === dateStr);
          if (shift) {
            const status = statuses.find(st => st.id === shift.statusId);
            const hrs = getShiftHours(shift);
            totalHours += hrs;
            const startMins = shift.startMinute ?? (shift.startHour != null ? shift.startHour * 60 : undefined);
            const endMins = shift.endMinute ?? (shift.endHour != null ? shift.endHour * 60 : undefined);
            let label = status?.label.slice(0, 3).toUpperCase() || '';
            if (startMins != null && endMins != null) {
              label = `${formatMins(startMins)}-${formatMins(endMins)}`;
            }
            cells.push(`<td class="shift-cell" style="background:hsl(${status?.color || '0 0% 90%'});color:#fff">${label}</td>`);
          } else {
            cells.push(`<td class="shift-cell"></td>`);
          }
        });

        const rounded = Math.round(totalHours * 100) / 100;
        html += `<tr><td>${person.name}</td><td>${person.email || '—'}</td><td class="hours">${rounded || '—'}</td>${cells.join('')}</tr>`;
      });
    });

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.onload = () => {
        setTimeout(() => w.print(), 500);
      };
    }
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Select the date range for {format(new Date(year, month), 'MMMM yyyy')}:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From day</Label>
              <Input type="number" min={1} max={lastDay} value={startDay} onChange={e => setStartDay(Number(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label>To day</Label>
              <Input type="number" min={startDay} max={lastDay} value={endDay} onChange={e => setEndDay(Number(e.target.value))} className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-1" /> Export & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

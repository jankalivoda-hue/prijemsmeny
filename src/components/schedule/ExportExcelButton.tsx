import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, getDaysInMonth } from 'date-fns';
import { Person, Shift, ShiftStatus } from '@/types/schedule';

interface ExportExcelProps {
  year: number;
  month: number;
  people: Person[];
  shifts: Shift[];
  statuses: ShiftStatus[];
}

export function ExportExcelButton({ year, month, people, shifts, statuses }: ExportExcelProps) {
  
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Směny ${month + 1}-${year}`);

    const daysCount = getDaysInMonth(new Date(year, month));
    const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

    // 1. Definice sloupců
    const columns = [
      { header: 'Jméno', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Hodiny celkem', key: 'totalHours', width: 15 },
      ...daysArray.map(d => ({
        header: `${d}.`,
        key: `day_${d}`,
        width: 8
      }))
    ];

    worksheet.columns = columns;

    // Stylování hlavičky
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 2. Naplnění daty
    people.forEach(person => {
      const rowData: any = {
        name: person.name,
        email: person.email || '-',
      };

      let personTotalMinutes = 0;

      // Projdeme každý den v měsíci
      daysArray.forEach(day => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const shift = shifts.find(s => s.personId === person.id && s.date === dateStr && !s.isPrediction);

        if (shift) {
          const status = statuses.find(st => st.id === shift.statusId);
          const startMins = shift.startMinute ?? (shift.startHour ? shift.startHour * 60 : 0);
          const endMins = shift.endMinute ?? (shift.endHour ? shift.endHour * 60 : 0);
          
          const diff = endMins - startMins;
          if (diff > 0) personTotalMinutes += diff;

          // Text do buňky dne (např. "08:00-16:00 (R)")
          rowData[`day_${day}`] = status ? status.label : 'Směna';
        } else {
          rowData[`day_${day}`] = '';
        }
      });

      rowData.totalHours = Math.round((personTotalMinutes / 60) * 100) / 100;
      worksheet.addRow(rowData);
    });

    // 3. Formátování mřížky
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    });

    // Zarovnání jména a emailu doleva
    worksheet.getColumn('name').alignment = { horizontal: 'left' };
    worksheet.getColumn('email').alignment = { horizontal: 'left' };

    // 4. Generování a stažení souboru
    const buffer = await workbook.xlsx.writeBuffer();
    const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `Smeny_${year}_${month + 1}.xlsx`);
  };

  return (
    <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
      <FileSpreadsheet className="h-4 w-4 text-green-600" />
      Exportovat do Excelu (.xlsx)
    </Button>
  );
}
